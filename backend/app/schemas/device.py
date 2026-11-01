from typing import Optional
from datetime import datetime
from pydantic import BaseModel, Field
from app.models.device import DeviceStatus

class DeviceBase(BaseModel):
    device_uid: str = Field(..., max_length=100)
    name: str = Field(..., max_length=255)
    station_id: int
    device_type: str = "ESP32-AquaGuard"
    firmware_version: str = "v1.0.0"
    is_simulated: bool = False

class DeviceCreate(DeviceBase):
    pass

class DeviceUpdate(BaseModel):
    name: Optional[str] = None
    station_id: Optional[int] = None
    status: Optional[DeviceStatus] = None
    firmware_version: Optional[str] = None
    is_simulated: Optional[bool] = None

class DeviceHeartbeat(BaseModel):
    device_uid: str
    battery_level: Optional[float] = None
    signal_strength_dbm: Optional[float] = None
    firmware_version: Optional[str] = None

class DeviceOut(DeviceBase):
    id: int
    status: DeviceStatus
    battery_level: Optional[float] = None
    signal_strength_dbm: Optional[float] = None
    last_heartbeat: Optional[datetime] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    api_key: Optional[str] = None  # Returned only upon initial creation

    class Config:
        from_attributes = True
