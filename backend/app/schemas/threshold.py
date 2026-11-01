from typing import Optional
from pydantic import BaseModel
from app.models.station import WaterSourceType

class ThresholdBase(BaseModel):
    water_source_type: WaterSourceType
    parameter_name: str
    display_name: str
    unit: str
    min_normal: Optional[float] = None
    max_normal: Optional[float] = None
    min_warning: Optional[float] = None
    max_warning: Optional[float] = None
    min_critical: Optional[float] = None
    max_critical: Optional[float] = None
    standard_limit: Optional[float] = None
    ideal_value: Optional[float] = None
    unit_weight: Optional[float] = None

class ThresholdCreate(ThresholdBase):
    pass

class ThresholdUpdate(BaseModel):
    display_name: Optional[str] = None
    unit: Optional[str] = None
    min_normal: Optional[float] = None
    max_normal: Optional[float] = None
    min_warning: Optional[float] = None
    max_warning: Optional[float] = None
    min_critical: Optional[float] = None
    max_critical: Optional[float] = None
    standard_limit: Optional[float] = None
    ideal_value: Optional[float] = None
    unit_weight: Optional[float] = None

class ThresholdOut(ThresholdBase):
    id: int

    class Config:
        from_attributes = True
