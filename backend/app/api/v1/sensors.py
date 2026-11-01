from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status, Header
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.device import Device, DeviceStatus
from app.models.station import Station
from app.models.reading import SensorReading
from app.schemas.reading import SensorReadingCreate, SensorReadingOut
from app.services.assessment_service import AssessmentService
from app.services.wqi_service import WQICalculator
from app.services.websocket_manager import ws_manager
from app.api.deps import verify_device_token

router = APIRouter(prefix="/sensors", tags=["Sensor Telemetry Ingestion"])

@router.post("/ingest", response_model=SensorReadingOut)
async def ingest_sensor_data(
    payload: SensorReadingCreate,
    x_device_token: str = Header(None, alias="X-Device-Token"),
    db: Session = Depends(get_db)
):
    """
    HTTP Ingestion endpoint for ESP32, Arduino, Raspberry Pi, or external gateways.
    Authenticates physical devices via X-Device-Token or device_uid lookup.
    """
    device = None
    if x_device_token:
        device = verify_device_token(x_device_token, db)
    elif payload.device_uid:
        device = db.query(Device).filter(Device.device_uid == payload.device_uid).first()
    elif payload.device_id:
        device = db.query(Device).filter(Device.id == payload.device_id).first()

    if not device:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Unrecognized device or missing authentication")

    station = db.query(Station).filter(Station.id == payload.station_id).first()
    if not station:
        station = db.query(Station).filter(Station.id == device.station_id).first()
    if not station:
        raise HTTPException(status_code=404, detail="Monitoring station not found")

    device.last_heartbeat = datetime.now(timezone.utc)
    device.status = DeviceStatus.ONLINE

    # Compute WQI
    readings_dict = payload.model_dump()
    wqi_res = WQICalculator.calculate_wqi(readings_dict)
    wqi_score = wqi_res.score if wqi_res.is_available else None
    wqi_category = wqi_res.category if wqi_res.is_available else "Insufficient Data"

    # Persist
    reading = SensorReading(
        station_id=station.id,
        device_id=device.id,
        timestamp=payload.timestamp or datetime.now(timezone.utc),
        is_simulated=payload.is_simulated or device.is_simulated,
        ph=payload.ph,
        turbidity_ntu=payload.turbidity_ntu,
        temperature_c=payload.temperature_c,
        dissolved_oxygen_mg_l=payload.dissolved_oxygen_mg_l,
        tds_ppm=payload.tds_ppm,
        electrical_conductivity_us_cm=payload.electrical_conductivity_us_cm,
        orp_mv=payload.orp_mv,
        salinity_ppt=payload.salinity_ppt,
        water_level_m=payload.water_level_m,
        flow_rate_l_min=payload.flow_rate_l_min,
        ammonia_mg_l=payload.ammonia_mg_l,
        nitrate_mg_l=payload.nitrate_mg_l,
        phosphate_mg_l=payload.phosphate_mg_l,
        chlorine_mg_l=payload.chlorine_mg_l,
        wqi_score=wqi_score,
        wqi_category=wqi_category,
        quality_status="NORMAL"
    )
    db.add(reading)
    db.commit()
    db.refresh(reading)

    # Evaluate rules
    overall_status, alerts = AssessmentService.evaluate_reading(db, station, readings_dict, reading.id)
    reading.quality_status = overall_status
    db.commit()

    # Broadcast to live UI
    broadcast_data = {
        "id": reading.id,
        "station_id": station.id,
        "station_name": station.name,
        "timestamp": reading.timestamp.isoformat(),
        "is_simulated": reading.is_simulated,
        "quality_status": overall_status,
        "wqi_score": wqi_score,
        "wqi_category": wqi_category,
        "ph": reading.ph,
        "turbidity_ntu": reading.turbidity_ntu,
        "temperature_c": reading.temperature_c,
        "dissolved_oxygen_mg_l": reading.dissolved_oxygen_mg_l,
        "tds_ppm": reading.tds_ppm,
        "electrical_conductivity_us_cm": reading.electrical_conductivity_us_cm,
        "watermark": "SIMULATED DATA – NOT REAL SENSOR MEASUREMENTS" if reading.is_simulated else "PHYSICAL HARDWARE TELEMETRY"
    }
    await ws_manager.broadcast_reading(broadcast_data)

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
            "is_simulated": reading.is_simulated
        })

    return reading
