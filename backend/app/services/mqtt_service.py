import json
import logging
import asyncio
from datetime import datetime, timezone
from typing import Optional
from sqlalchemy.orm import Session
from app.core.config import settings
from app.core.database import SessionLocal
from app.models.device import Device, DeviceStatus
from app.models.station import Station
from app.models.reading import SensorReading
from app.services.assessment_service import AssessmentService
from app.services.wqi_service import WQICalculator
from app.services.websocket_manager import ws_manager

logger = logging.getLogger("aquaguard.mqtt")

class MQTTService:
    def __init__(self):
        self.client = None
        self.is_connected = False

    def start(self):
        if not settings.MQTT_ENABLED:
            logger.info("MQTT Integration disabled via configuration.")
            return

        try:
            import paho.mqtt.client as mqtt
            self.client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2, client_id="aquaguard-backend-core")
            self.client.on_connect = self._on_connect
            self.client.on_message = self._on_message
            self.client.on_disconnect = self._on_disconnect

            self.client.connect_async(settings.MQTT_BROKER_HOST, settings.MQTT_BROKER_PORT, settings.MQTT_KEEPALIVE)
            self.client.loop_start()
            logger.info(f"MQTT Client connecting to {settings.MQTT_BROKER_HOST}:{settings.MQTT_BROKER_PORT}...")
        except Exception as e:
            logger.warning(f"Could not connect to MQTT broker ({e}). Falling back to HTTP telemetry.")

    def stop(self):
        if self.client:
            self.client.loop_stop()
            self.client.disconnect()
            self.is_connected = False

    def _on_connect(self, client, userdata, flags, rc, properties=None):
        if rc == 0:
            self.is_connected = True
            logger.info("Connected to MQTT Broker successfully.")
            # Subscribe to topics
            topic = f"{settings.MQTT_TOPIC_PREFIX}/devices/+/readings"
            client.subscribe(topic)
            client.subscribe(f"{settings.MQTT_TOPIC_PREFIX}/devices/+/heartbeat")
            logger.info(f"Subscribed to MQTT topics: {topic}")
        else:
            logger.error(f"Failed to connect to MQTT Broker with return code: {rc}")

    def _on_disconnect(self, client, userdata, flags, rc, properties=None):
        self.is_connected = False
        logger.warning(f"Disconnected from MQTT Broker. Return code: {rc}")

    def _on_message(self, client, userdata, msg):
        try:
            topic = msg.topic
            payload = json.loads(msg.payload.decode("utf-8"))
            logger.info(f"Received MQTT message on topic: {topic}")

            # Topic format: aquaguard/devices/{device_uid}/readings
            parts = topic.split("/")
            if len(parts) >= 4 and parts[3] == "readings":
                device_uid = parts[2]
                self._process_reading_payload(device_uid, payload)
            elif len(parts) >= 4 and parts[3] == "heartbeat":
                device_uid = parts[2]
                self._process_heartbeat_payload(device_uid, payload)
        except Exception as e:
            logger.error(f"Error processing MQTT message: {e}")

    def _process_reading_payload(self, device_uid: str, data: dict):
        db: Session = SessionLocal()
        try:
            device = db.query(Device).filter(Device.device_uid == device_uid).first()
            if not device:
                logger.warning(f"MQTT message from unknown device UID: {device_uid}")
                return

            station = db.query(Station).filter(Station.id == device.station_id).first()
            if not station:
                return

            device.last_heartbeat = datetime.now(timezone.utc)
            device.status = DeviceStatus.ONLINE

            # Calculate WQI
            wqi_result = WQICalculator.calculate_wqi(data)
            wqi_score = wqi_result.score if wqi_result.is_available else None
            wqi_category = wqi_result.category if wqi_result.is_available else "Insufficient Data"

            # Persist reading
            reading = SensorReading(
                station_id=station.id,
                device_id=device.id,
                timestamp=datetime.now(timezone.utc),
                is_simulated=device.is_simulated,
                ph=data.get("ph"),
                turbidity_ntu=data.get("turbidity_ntu"),
                temperature_c=data.get("temperature_c"),
                dissolved_oxygen_mg_l=data.get("dissolved_oxygen_mg_l"),
                tds_ppm=data.get("tds_ppm"),
                electrical_conductivity_us_cm=data.get("electrical_conductivity_us_cm"),
                orp_mv=data.get("orp_mv"),
                salinity_ppt=data.get("salinity_ppt"),
                water_level_m=data.get("water_level_m"),
                flow_rate_l_min=data.get("flow_rate_l_min"),
                ammonia_mg_l=data.get("ammonia_mg_l"),
                nitrate_mg_l=data.get("nitrate_mg_l"),
                chlorine_mg_l=data.get("chlorine_mg_l"),
                wqi_score=wqi_score,
                wqi_category=wqi_category,
                quality_status="NORMAL"
            )
            db.add(reading)
            db.commit()
            db.refresh(reading)

            # Evaluate thresholds
            overall_status, alerts = AssessmentService.evaluate_reading(db, station, data, reading.id)
            reading.quality_status = overall_status
            db.commit()

            # Schedule async WebSocket broadcast
            loop = asyncio.get_event_loop()
            if loop.is_running():
                asyncio.run_coroutine_threadsafe(
                    ws_manager.broadcast_reading({
                        "id": reading.id,
                        "station_id": station.id,
                        "station_name": station.name,
                        "timestamp": reading.timestamp.isoformat(),
                        "is_simulated": device.is_simulated,
                        "quality_status": overall_status,
                        "wqi_score": wqi_score,
                        "wqi_category": wqi_category,
                        "ph": reading.ph,
                        "turbidity_ntu": reading.turbidity_ntu,
                        "temperature_c": reading.temperature_c,
                        "dissolved_oxygen_mg_l": reading.dissolved_oxygen_mg_l,
                        "tds_ppm": reading.tds_ppm,
                        "electrical_conductivity_us_cm": reading.electrical_conductivity_us_cm
                    }),
                    loop
                )
        finally:
            db.close()

    def _process_heartbeat_payload(self, device_uid: str, data: dict):
        db: Session = SessionLocal()
        try:
            device = db.query(Device).filter(Device.device_uid == device_uid).first()
            if device:
                device.last_heartbeat = datetime.now(timezone.utc)
                device.status = DeviceStatus.ONLINE
                if "battery_level" in data:
                    device.battery_level = float(data["battery_level"])
                if "signal_strength_dbm" in data:
                    device.signal_strength_dbm = float(data["signal_strength_dbm"])
                db.commit()
        finally:
            db.close()

mqtt_service = MQTTService()
