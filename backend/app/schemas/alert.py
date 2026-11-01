from typing import Optional
from datetime import datetime
from pydantic import BaseModel
from app.models.alert import AlertSeverity, AlertStatus

class AlertBase(BaseModel):
    station_id: int
    reading_id: Optional[int] = None
    parameter_name: str
    observed_value: float
    threshold_value: float
    unit: str
    severity: AlertSeverity = AlertSeverity.WARNING
    message: str

class AlertCreate(AlertBase):
    pass

class AlertAcknowledge(BaseModel):
    acknowledged_by: Optional[str] = "Operator"

class AlertResolve(BaseModel):
    resolved_by: Optional[str] = "Operator"
    resolution_notes: str

class AlertOut(AlertBase):
    id: int
    status: AlertStatus
    created_at: datetime
    acknowledged_at: Optional[datetime] = None
    acknowledged_by: Optional[str] = None
    resolved_at: Optional[datetime] = None
    resolved_by: Optional[str] = None
    resolution_notes: Optional[str] = None
    station_name: Optional[str] = None

    class Config:
        from_attributes = True
