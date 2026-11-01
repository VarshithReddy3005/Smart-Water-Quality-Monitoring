from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, Field
from app.models.station import WaterSourceType, StationStatus

class StationBase(BaseModel):
    name: str = Field(..., max_length=255)
    code: str = Field(..., max_length=50)
    water_source_type: WaterSourceType = WaterSourceType.DRINKING_WATER
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)
    elevation_m: Optional[float] = 0.0
    address: Optional[str] = None
    description: Optional[str] = None
    status: StationStatus = StationStatus.ACTIVE

class StationCreate(StationBase):
    pass

class StationUpdate(BaseModel):
    name: Optional[str] = None
    water_source_type: Optional[WaterSourceType] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    elevation_m: Optional[float] = None
    address: Optional[str] = None
    description: Optional[str] = None
    status: Optional[StationStatus] = None

class StationOut(StationBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    latest_reading: Optional[dict] = None
    device_count: Optional[int] = 0
    active_alerts_count: Optional[int] = 0

    class Config:
        from_attributes = True
