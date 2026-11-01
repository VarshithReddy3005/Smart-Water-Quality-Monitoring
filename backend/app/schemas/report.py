from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel
from app.models.report import ReportFormat

class ReportGenerateRequest(BaseModel):
    station_id: int
    start_date: datetime
    end_date: datetime
    file_format: ReportFormat = ReportFormat.PDF
    parameters: Optional[List[str]] = None
    title: Optional[str] = "AquaGuard Water Quality Assessment Report"

class ReportOut(BaseModel):
    id: int
    title: str
    station_id: int
    start_date: datetime
    end_date: datetime
    file_format: ReportFormat
    file_path: str
    summary_metrics: Optional[Dict[str, Any]] = None
    created_by: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True
