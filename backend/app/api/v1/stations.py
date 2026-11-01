from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.station import Station, WaterSourceType, StationStatus
from app.models.reading import SensorReading
from app.models.alert import Alert, AlertStatus
from app.models.device import Device
from app.schemas.station import StationCreate, StationUpdate, StationOut
from app.api.deps import get_current_user, require_admin

router = APIRouter(prefix="/stations", tags=["Monitoring Stations & Water Sources"])

@router.get("", response_model=List[StationOut])
def get_stations(
    water_source_type: Optional[WaterSourceType] = None,
    status_filter: Optional[StationStatus] = None,
    db: Session = Depends(get_db)
):
    query = db.query(Station)
    if water_source_type:
        query = query.filter(Station.water_source_type == water_source_type)
    if status_filter:
        query = query.filter(Station.status == status_filter)
    
    stations = query.all()
    results = []
    for s in stations:
        # Get latest reading
        latest_reading = db.query(SensorReading).filter(
            SensorReading.station_id == s.id
        ).order_by(SensorReading.timestamp.desc()).first()

        device_count = db.query(Device).filter(Device.station_id == s.id).count()
        active_alerts = db.query(Alert).filter(
            Alert.station_id == s.id,
            Alert.status == AlertStatus.ACTIVE
        ).count()

        latest_dict = None
        if latest_reading:
            latest_dict = {
                "id": latest_reading.id,
                "timestamp": latest_reading.timestamp.isoformat(),
                "is_simulated": latest_reading.is_simulated,
                "quality_status": latest_reading.quality_status,
                "wqi_score": latest_reading.wqi_score,
                "wqi_category": latest_reading.wqi_category,
                "ph": latest_reading.ph,
                "turbidity_ntu": latest_reading.turbidity_ntu,
                "temperature_c": latest_reading.temperature_c,
                "dissolved_oxygen_mg_l": latest_reading.dissolved_oxygen_mg_l,
                "tds_ppm": latest_reading.tds_ppm,
                "electrical_conductivity_us_cm": latest_reading.electrical_conductivity_us_cm
            }

        s_dict = {
            "id": s.id,
            "name": s.name,
            "code": s.code,
            "water_source_type": s.water_source_type,
            "latitude": s.latitude,
            "longitude": s.longitude,
            "elevation_m": s.elevation_m,
            "address": s.address,
            "description": s.description,
            "status": s.status,
            "created_at": s.created_at,
            "updated_at": s.updated_at,
            "device_count": device_count,
            "active_alerts_count": active_alerts,
            "latest_reading": latest_dict
        }
        results.append(s_dict)
    return results

@router.post("", response_model=StationOut, dependencies=[Depends(require_admin)])
def create_station(station_in: StationCreate, db: Session = Depends(get_db)):
    existing = db.query(Station).filter(
        (Station.code == station_in.code) | (Station.name == station_in.name)
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Station code or name already exists")

    station = Station(**station_in.model_dump())
    db.add(station)
    db.commit()
    db.refresh(station)
    return station

@router.get("/{station_id}", response_model=StationOut)
def get_station(station_id: int, db: Session = Depends(get_db)):
    station = db.query(Station).filter(Station.id == station_id).first()
    if not station:
        raise HTTPException(status_code=404, detail="Station not found")
    
    device_count = db.query(Device).filter(Device.station_id == station.id).count()
    active_alerts = db.query(Alert).filter(
        Alert.station_id == station.id,
        Alert.status == AlertStatus.ACTIVE
    ).count()

    latest_reading = db.query(SensorReading).filter(
        SensorReading.station_id == station.id
    ).order_by(SensorReading.timestamp.desc()).first()

    latest_dict = None
    if latest_reading:
        latest_dict = {
            "id": latest_reading.id,
            "timestamp": latest_reading.timestamp.isoformat(),
            "is_simulated": latest_reading.is_simulated,
            "quality_status": latest_reading.quality_status,
            "wqi_score": latest_reading.wqi_score,
            "wqi_category": latest_reading.wqi_category,
            "ph": latest_reading.ph,
            "turbidity_ntu": latest_reading.turbidity_ntu,
            "temperature_c": latest_reading.temperature_c,
            "dissolved_oxygen_mg_l": latest_reading.dissolved_oxygen_mg_l,
            "tds_ppm": latest_reading.tds_ppm,
            "electrical_conductivity_us_cm": latest_reading.electrical_conductivity_us_cm
        }

    return {
        "id": station.id,
        "name": station.name,
        "code": station.code,
        "water_source_type": station.water_source_type,
        "latitude": station.latitude,
        "longitude": station.longitude,
        "elevation_m": station.elevation_m,
        "address": station.address,
        "description": station.description,
        "status": station.status,
        "created_at": station.created_at,
        "updated_at": station.updated_at,
        "device_count": device_count,
        "active_alerts_count": active_alerts,
        "latest_reading": latest_dict
    }

@router.put("/{station_id}", response_model=StationOut, dependencies=[Depends(require_admin)])
def update_station(station_id: int, station_in: StationUpdate, db: Session = Depends(get_db)):
    station = db.query(Station).filter(Station.id == station_id).first()
    if not station:
        raise HTTPException(status_code=404, detail="Station not found")

    for field, val in station_in.model_dump(exclude_unset=True).items():
        setattr(station, field, val)

    db.commit()
    db.refresh(station)
    return station

@router.delete("/{station_id}", dependencies=[Depends(require_admin)])
def delete_station(station_id: int, db: Session = Depends(get_db)):
    station = db.query(Station).filter(Station.id == station_id).first()
    if not station:
        raise HTTPException(status_code=404, detail="Station not found")
    db.delete(station)
    db.commit()
    return {"message": f"Station '{station.name}' successfully deleted"}
