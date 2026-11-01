from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, Field

class SensorReadingBase(BaseModel):
    station_id: int
    device_id: Optional[int] = None
    is_simulated: bool = False
    
    # Primary parameters
    ph: Optional[float] = Field(None, ge=0.0, le=14.0)
    turbidity_ntu: Optional[float] = Field(None, ge=0.0)
    temperature_c: Optional[float] = Field(None, ge=-10.0, le=100.0)
    dissolved_oxygen_mg_l: Optional[float] = Field(None, ge=0.0, le=30.0)
    tds_ppm: Optional[float] = Field(None, ge=0.0)
    electrical_conductivity_us_cm: Optional[float] = Field(None, ge=0.0)

    # Additional parameters
    orp_mv: Optional[float] = None
    salinity_ppt: Optional[float] = None
    water_level_m: Optional[float] = None
    flow_rate_l_min: Optional[float] = None
    ammonia_mg_l: Optional[float] = None
    nitrate_mg_l: Optional[float] = None
    phosphate_mg_l: Optional[float] = None
    chlorine_mg_l: Optional[float] = None

class SensorReadingCreate(SensorReadingBase):
    device_uid: Optional[str] = None
    timestamp: Optional[datetime] = None

class SensorReadingOut(SensorReadingBase):
    id: int
    timestamp: datetime
    quality_status: str
    wqi_score: Optional[float] = None
    wqi_category: Optional[str] = None

    class Config:
        from_attributes = True

class AggregatedStats(BaseModel):
    parameter: str
    count: int
    min_value: Optional[float]
    max_value: Optional[float]
    avg_value: Optional[float]
    unit: str
