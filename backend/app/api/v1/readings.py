from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.core.database import get_db
from app.models.reading import SensorReading
from app.models.station import Station, StationStatus
from app.models.device import Device, DeviceStatus
from app.models.alert import Alert, AlertStatus, AlertSeverity
from app.schemas.reading import SensorReadingOut, AggregatedStats

router = APIRouter(prefix="/readings", tags=["Sensor Readings & Time-Series Data"])

@router.get("", response_model=List[SensorReadingOut])
def get_readings(
    station_id: Optional[int] = None,
    is_simulated: Optional[bool] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    time_range: Optional[str] = Query(None, description="1h, 24h, 7d, 30d"),
    limit: int = Query(100, ge=1, le=1000),
    db: Session = Depends(get_db)
):
    query = db.query(SensorReading)
    if station_id:
        query = query.filter(SensorReading.station_id == station_id)
    if is_simulated is not None:
        query = query.filter(SensorReading.is_simulated == is_simulated)

    if time_range:
        now = datetime.now(timezone.utc)
        if time_range == "1h":
            query = query.filter(SensorReading.timestamp >= now - timedelta(hours=1))
        elif time_range == "24h":
            query = query.filter(SensorReading.timestamp >= now - timedelta(hours=24))
        elif time_range == "7d":
            query = query.filter(SensorReading.timestamp >= now - timedelta(days=7))
        elif time_range == "30d":
            query = query.filter(SensorReading.timestamp >= now - timedelta(days=30))
    else:
        if start_date:
            query = query.filter(SensorReading.timestamp >= start_date)
        if end_date:
            query = query.filter(SensorReading.timestamp <= end_date)

    readings = query.order_by(SensorReading.timestamp.desc()).limit(limit).all()
    # Return chronologically ascending for charting
    return list(reversed(readings))

@router.get("/latest", response_model=List[SensorReadingOut])
def get_latest_readings(station_id: Optional[int] = None, db: Session = Depends(get_db)):
    if station_id:
        reading = db.query(SensorReading).filter(
            SensorReading.station_id == station_id
        ).order_by(SensorReading.timestamp.desc()).first()
        return [reading] if reading else []

    # Get latest reading for each active station
    stations = db.query(Station).all()
    results = []
    for s in stations:
        r = db.query(SensorReading).filter(
            SensorReading.station_id == s.id
        ).order_by(SensorReading.timestamp.desc()).first()
        if r:
            results.append(r)
    return results

@router.get("/stats")
def get_reading_statistics(
    station_id: int,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    time_range: Optional[str] = Query("24h"),
    db: Session = Depends(get_db)
):
    query = db.query(SensorReading).filter(SensorReading.station_id == station_id)
    
    now = datetime.now(timezone.utc)
    if time_range == "1h":
        query = query.filter(SensorReading.timestamp >= now - timedelta(hours=1))
    elif time_range == "24h":
        query = query.filter(SensorReading.timestamp >= now - timedelta(hours=24))
    elif time_range == "7d":
        query = query.filter(SensorReading.timestamp >= now - timedelta(days=7))
    elif time_range == "30d":
        query = query.filter(SensorReading.timestamp >= now - timedelta(days=30))
    elif start_date and end_date:
        query = query.filter(SensorReading.timestamp >= start_date, SensorReading.timestamp <= end_date)

    readings = query.all()
    if not readings:
        return {"station_id": station_id, "sample_count": 0, "parameters": {}}

    params = [
        ("ph", "pH"),
        ("turbidity_ntu", "NTU"),
        ("temperature_c", "°C"),
        ("dissolved_oxygen_mg_l", "mg/L"),
        ("tds_ppm", "ppm"),
        ("electrical_conductivity_us_cm", "µS/cm"),
        ("ammonia_mg_l", "mg/L"),
        ("nitrate_mg_l", "mg/L")
    ]

    stats = {}
    for p_key, unit in params:
        vals = [getattr(r, p_key) for r in readings if getattr(r, p_key) is not None]
        if vals:
            stats[p_key] = {
                "unit": unit,
                "count": len(vals),
                "min": round(min(vals), 2),
                "max": round(max(vals), 2),
                "avg": round(sum(vals) / len(vals), 2)
            }

    return {
        "station_id": station_id,
        "sample_count": len(readings),
        "parameters": stats
    }

@router.get("/dashboard-summary")
def get_dashboard_summary(db: Session = Depends(get_db)):
    total_stations = db.query(Station).count()
    active_stations = db.query(Station).filter(Station.status == StationStatus.ACTIVE).count()
    
    total_devices = db.query(Device).count()
    active_devices = db.query(Device).filter(Device.status == DeviceStatus.ONLINE).count()
    offline_devices = total_devices - active_devices

    total_samples = db.query(SensorReading).count()
    active_alerts = db.query(Alert).filter(Alert.status == AlertStatus.ACTIVE).count()
    critical_alerts = db.query(Alert).filter(
        Alert.status == AlertStatus.ACTIVE,
        Alert.severity == AlertSeverity.CRITICAL
    ).count()

    # Calculate average across recent readings (last 100 samples)
    recent = db.query(SensorReading).order_by(SensorReading.timestamp.desc()).limit(100).all()
    avg_ph = None
    avg_turbidity = None
    avg_do = None
    avg_tds = None
    avg_wqi = None

    if recent:
        phs = [r.ph for r in recent if r.ph is not None]
        turbs = [r.turbidity_ntu for r in recent if r.turbidity_ntu is not None]
        dos = [r.dissolved_oxygen_mg_l for r in recent if r.dissolved_oxygen_mg_l is not None]
        tdss = [r.tds_ppm for r in recent if r.tds_ppm is not None]
        wqis = [r.wqi_score for r in recent if r.wqi_score is not None]

        if phs: avg_ph = round(sum(phs) / len(phs), 2)
        if turbs: avg_turbidity = round(sum(turbs) / len(turbs), 2)
        if dos: avg_do = round(sum(dos) / len(dos), 2)
        if tdss: avg_tds = round(sum(tdss) / len(tdss), 1)
        if wqis: avg_wqi = round(sum(wqis) / len(wqis), 1)

    # Determine general system status
    if critical_alerts > 0:
        overall_water_status = "CRITICAL"
    elif active_alerts > 0:
        overall_water_status = "WARNING"
    else:
        overall_water_status = "NORMAL"

    return {
        "total_stations": total_stations,
        "active_stations": active_stations,
        "total_devices": total_devices,
        "active_devices": active_devices,
        "offline_devices": offline_devices,
        "total_samples": total_samples,
        "active_alerts": active_alerts,
        "critical_alerts": critical_alerts,
        "overall_water_status": overall_water_status,
        "averages": {
            "ph": avg_ph,
            "turbidity_ntu": avg_turbidity,
            "dissolved_oxygen_mg_l": avg_do,
            "tds_ppm": avg_tds,
            "wqi_score": avg_wqi
        }
    }
