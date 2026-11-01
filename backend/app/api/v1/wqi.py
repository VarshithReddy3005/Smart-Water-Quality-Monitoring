from typing import Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.reading import SensorReading
from app.models.station import Station
from app.schemas.wqi import WQIResult
from app.services.wqi_service import WQICalculator

router = APIRouter(prefix="/wqi", tags=["Water Quality Index (WQI)"])

@router.get("/station/{station_id}", response_model=WQIResult)
def get_station_wqi(station_id: int, db: Session = Depends(get_db)):
    station = db.query(Station).filter(Station.id == station_id).first()
    if not station:
        raise HTTPException(status_code=404, detail="Station not found")

    latest_reading = db.query(SensorReading).filter(
        SensorReading.station_id == station.id
    ).order_by(SensorReading.timestamp.desc()).first()

    if not latest_reading:
        return WQIResult(
            is_available=False,
            score=None,
            category="No Data",
            color="#94A3B8",
            description="Water Quality Index unavailable – insufficient measurements.",
            contributing_parameters=[],
            missing_parameters=["pH", "Dissolved Oxygen", "Turbidity", "TDS", "Electrical Conductivity"]
        )

    reading_dict = {
        "ph": latest_reading.ph,
        "dissolved_oxygen_mg_l": latest_reading.dissolved_oxygen_mg_l,
        "turbidity_ntu": latest_reading.turbidity_ntu,
        "tds_ppm": latest_reading.tds_ppm,
        "electrical_conductivity_us_cm": latest_reading.electrical_conductivity_us_cm
    }

    return WQICalculator.calculate_wqi(reading_dict)

@router.post("/calculate", response_model=WQIResult)
def calculate_custom_wqi(parameters: Dict[str, Optional[float]]):
    """Calculates Water Quality Index on-demand for custom parameter values."""
    return WQICalculator.calculate_wqi(parameters)
