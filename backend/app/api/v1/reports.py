import os
from typing import List, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.station import Station
from app.models.reading import SensorReading
from app.models.alert import Alert
from app.models.report import Report, ReportFormat
from app.schemas.report import ReportGenerateRequest, ReportOut
from app.services.report_service import ReportService
from app.api.deps import get_current_user

router = APIRouter(prefix="/reports", tags=["Reports & Data Export"])

@router.get("", response_model=List[ReportOut])
def list_reports(station_id: Optional[int] = None, db: Session = Depends(get_db)):
    query = db.query(Report)
    if station_id:
        query = query.filter(Report.station_id == station_id)
    return query.order_by(Report.created_at.desc()).limit(50).all()

@router.post("/generate", response_model=ReportOut)
def generate_report(
    req: ReportGenerateRequest,
    db: Session = Depends(get_db)
):
    station = db.query(Station).filter(Station.id == req.station_id).first()
    if not station:
        raise HTTPException(status_code=404, detail="Station not found")

    # Fetch readings in range
    readings = db.query(SensorReading).filter(
        SensorReading.station_id == req.station_id,
        SensorReading.timestamp >= req.start_date,
        SensorReading.timestamp <= req.end_date
    ).order_by(SensorReading.timestamp.asc()).all()

    alerts = db.query(Alert).filter(
        Alert.station_id == req.station_id,
        Alert.created_at >= req.start_date,
        Alert.created_at <= req.end_date
    ).order_by(Alert.created_at.desc()).all()

    if req.file_format == ReportFormat.CSV:
        filepath = ReportService.generate_csv(station, readings, req.start_date, req.end_date)
    else:
        filepath = ReportService.generate_pdf(station, readings, alerts, req.start_date, req.end_date, req.title or "AquaGuard Water Quality Assessment Report")

    # Save report metadata
    report = Report(
        title=req.title or f"{station.name} Quality Report",
        station_id=station.id,
        start_date=req.start_date,
        end_date=req.end_date,
        file_format=req.file_format,
        file_path=filepath,
        summary_metrics={
            "sample_count": len(readings),
            "alerts_count": len(alerts),
            "station_code": station.code
        },
        created_by="Operator",
        created_at=datetime.now(timezone.utc)
    )
    db.add(report)
    db.commit()
    db.refresh(report)
    return report

@router.get("/download/{report_id}")
def download_report(report_id: int, db: Session = Depends(get_db)):
    report = db.query(Report).filter(Report.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report record not found")
    
    if not os.path.exists(report.file_path):
        raise HTTPException(status_code=404, detail="Report file not found on disk")

    media_type = "application/pdf" if report.file_format == ReportFormat.PDF else "text/csv"
    filename = os.path.basename(report.file_path)
    return FileResponse(path=report.file_path, filename=filename, media_type=media_type)
