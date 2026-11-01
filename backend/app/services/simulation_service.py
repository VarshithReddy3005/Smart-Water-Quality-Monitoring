import asyncio
import random
import math
from datetime import datetime, timezone
from typing import Dict, Any, Optional
from sqlalchemy.orm import Session
from app.core.database import SessionLocal
from app.models.station import Station, StationStatus
from app.models.device import Device, DeviceStatus
from app.models.reading import SensorReading
from app.services.assessment_service import AssessmentService
from app.services.wqi_service import WQICalculator
from app.services.websocket_manager import ws_manager

class SimulationEngine:
    def __init__(self):
        self.is_running: bool = True
        self.interval_seconds: int = 3
        self.active_scenario: str = "nominal"
        self.readings_generated_total: int = 0
        self._task: Optional[asyncio.Task] = None
        self._step_counter: int = 0

    def start(self, interval: Optional[int] = None, scenario: Optional[str] = None):
        if interval:
            self.interval_seconds = max(1, min(60, interval))
        if scenario:
            self.active_scenario = scenario
        self.is_running = True
        if self._task is None or self._task.done():
            self._task = asyncio.create_task(self._simulation_loop())

    def stop(self):
        self.is_running = False
        if self._task and not self._task.done():
            self._task.cancel()
            self._task = None

    def pause(self):
        self.is_running = False

    def resume(self):
        self.is_running = True
        if self._task is None or self._task.done():
            self._task = asyncio.create_task(self._simulation_loop())

    def set_scenario(self, scenario: str):
        self.active_scenario = scenario

    def get_status(self) -> Dict[str, Any]:
        return {
            "is_running": self.is_running,
            "interval_seconds": self.interval_seconds,
            "active_scenario": self.active_scenario,
            "readings_generated_total": self.readings_generated_total,
            "watermark": "SIMULATED DATA – NOT REAL SENSOR MEASUREMENTS"
        }

    async def _simulation_loop(self):
        while self.is_running:
            try:
                await self._generate_tick()
            except asyncio.CancelledError:
                break
            except Exception as e:
                print(f"Simulation error: {e}")
            await asyncio.sleep(self.interval_seconds)

    async def _generate_tick(self):
        self._step_counter += 1
        db: Session = SessionLocal()
        try:
            stations = db.query(Station).filter(Station.status == StationStatus.ACTIVE).all()
            if not stations:
                return

            for station in stations:
                device = db.query(Device).filter(
                    Device.station_id == station.id,
                    Device.is_simulated == True
                ).first()

                if not device:
                    # Create simulated device on the fly if not yet created
                    device = Device(
                        device_uid=f"SIM-DEV-{station.code}",
                        name=f"Simulated Node {station.name}",
                        station_id=station.id,
                        device_type="ESP32-AquaGuard-Sim",
                        firmware_version="v2.1-sim",
                        status=DeviceStatus.ONLINE,
                        battery_level=random.uniform(85.0, 99.0),
                        signal_strength_dbm=random.uniform(-75.0, -50.0),
                        is_simulated=True,
                        last_heartbeat=datetime.now(timezone.utc)
                    )
                    db.add(device)
                    db.commit()
                    db.refresh(device)
                else:
                    device.last_heartbeat = datetime.now(timezone.utc)
                    device.status = DeviceStatus.ONLINE

                # Synthesize physics-based readings according to scenario
                data = self._generate_readings_for_station(station, self.active_scenario, self._step_counter)

                # WQI calculation
                wqi_result = WQICalculator.calculate_wqi(data)
                wqi_score = wqi_result.score if wqi_result.is_available else None
                wqi_category = wqi_result.category if wqi_result.is_available else "Insufficient Data"

                # Persist Reading
                db_reading = SensorReading(
                    station_id=station.id,
                    device_id=device.id,
                    timestamp=datetime.now(timezone.utc),
                    is_simulated=True,
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
                db.add(db_reading)
                db.commit()
                db.refresh(db_reading)

                # Assess threshold violations
                overall_status, alerts = AssessmentService.evaluate_reading(
                    db=db,
                    station=station,
                    reading_data=data,
                    reading_id=db_reading.id
                )

                db_reading.quality_status = overall_status
                db.commit()

                self.readings_generated_total += 1

                # Construct broadcast payload
                reading_dict = {
                    "id": db_reading.id,
                    "station_id": station.id,
                    "station_name": station.name,
                    "station_code": station.code,
                    "water_source_type": station.water_source_type.value,
                    "device_id": device.id,
                    "timestamp": db_reading.timestamp.isoformat(),
                    "is_simulated": True,
                    "watermark": "SIMULATED DATA – NOT REAL SENSOR MEASUREMENTS",
                    "quality_status": overall_status,
                    "wqi_score": wqi_score,
                    "wqi_category": wqi_category,
                    "ph": db_reading.ph,
                    "turbidity_ntu": db_reading.turbidity_ntu,
                    "temperature_c": db_reading.temperature_c,
                    "dissolved_oxygen_mg_l": db_reading.dissolved_oxygen_mg_l,
                    "tds_ppm": db_reading.tds_ppm,
                    "electrical_conductivity_us_cm": db_reading.electrical_conductivity_us_cm,
                    "orp_mv": db_reading.orp_mv,
                    "salinity_ppt": db_reading.salinity_ppt,
                    "water_level_m": db_reading.water_level_m,
                    "ammonia_mg_l": db_reading.ammonia_mg_l,
                    "nitrate_mg_l": db_reading.nitrate_mg_l,
                    "chlorine_mg_l": db_reading.chlorine_mg_l
                }

                # Push to WebSocket clients
                await ws_manager.broadcast_reading(reading_dict)

                # Broadcast newly triggered alerts
                for alert in alerts:
                    await ws_manager.broadcast_alert({
                        "id": alert.id,
                        "station_id": station.id,
                        "station_name": station.name,
                        "parameter_name": alert.parameter_name,
                        "observed_value": alert.observed_value,
                        "threshold_value": alert.threshold_value,
                        "unit": alert.unit,
                        "severity": alert.severity.value,
                        "message": alert.message,
                        "created_at": alert.created_at.isoformat(),
                        "is_simulated": True
                    })

        finally:
            db.close()

    def _generate_readings_for_station(self, station: Station, scenario: str, step: int) -> Dict[str, Any]:
        """Synthesizes realistic water quality telemetry depending on scenario."""
        # Baseline sine oscillation for diurnal cycle
        t_factor = math.sin(step * 0.1)

        # Baseline Clean
        ph = 7.35 + 0.15 * t_factor + random.gauss(0, 0.04)
        turbidity = max(0.2, 1.4 + 0.3 * t_factor + random.gauss(0, 0.1))
        temp = 21.0 + 2.5 * t_factor + random.gauss(0, 0.1)
        do = max(5.0, 8.2 - 0.4 * t_factor + random.gauss(0, 0.1))
        tds = 220.0 + 15.0 * t_factor + random.gauss(0, 3.0)
        ec = tds * 1.56 + random.gauss(0, 5.0)
        orp = 340.0 + 10.0 * t_factor + random.gauss(0, 4.0)
        ammonia = max(0.01, 0.05 + random.gauss(0, 0.01))
        nitrate = max(0.5, 3.2 + random.gauss(0, 0.2))
        chlorine = 0.8 + 0.1 * t_factor + random.gauss(0, 0.02)

        # Scenario Injections
        if scenario == "rainfall_runoff":
            # High turbidity event, surface runoff increases solids and drops dissolved oxygen
            turbidity = max(15.0, 32.0 + 8.0 * random.random())
            tds = 650.0 + 80.0 * random.random()
            ec = tds * 1.6
            do = max(3.5, 4.8 - 0.5 * random.random())
            ph = 6.8 + random.gauss(0, 0.1)
        
        elif scenario == "chemical_spill":
            # Sudden acidic chemical discharge
            ph = 4.2 + 0.3 * random.random()
            tds = 1450.0 + 120.0 * random.random()
            ec = 2300.0 + 200.0 * random.random()
            orp = 580.0 + 25.0 * random.random()
            turbidity = 14.5 + 2.0 * random.random()

        elif scenario == "algal_bloom":
            # Photosynthesis elevates pH during day, severe DO drop, elevated ammonia
            ph = 9.2 + 0.3 * random.random()
            do = max(1.8, 2.7 + random.gauss(0, 0.2))
            ammonia = 2.4 + 0.4 * random.random()
            turbidity = 18.0 + 3.0 * random.random()

        elif scenario == "sensor_drift":
            # pH sensor calibration loss
            ph = min(13.5, 8.5 + (step % 50) * 0.1)

        return {
            "ph": round(ph, 2),
            "turbidity_ntu": round(turbidity, 2),
            "temperature_c": round(temp, 1),
            "dissolved_oxygen_mg_l": round(do, 2),
            "tds_ppm": round(tds, 1),
            "electrical_conductivity_us_cm": round(ec, 1),
            "orp_mv": round(orp, 1),
            "salinity_ppt": round(tds / 1000.0, 3),
            "water_level_m": round(3.5 + 0.2 * t_factor, 2),
            "flow_rate_l_min": round(120.0 + 15.0 * t_factor, 1),
            "ammonia_mg_l": round(ammonia, 3),
            "nitrate_mg_l": round(nitrate, 2),
            "chlorine_mg_l": round(chlorine, 2)
        }

simulation_engine = SimulationEngine()
