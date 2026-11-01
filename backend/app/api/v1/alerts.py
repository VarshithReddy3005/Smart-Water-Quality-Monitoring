from typing import List, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.alert import Alert, AlertSeverity, AlertStatus
from app.models.station import Station
from app.schemas.alert import AlertOut, AlertAcknowledge, AlertResolve
from app.api.deps import require_operator

router = APIRouter(prefix="/alerts", tags=["Alerts & Notifications"])

@router.get("", response_model=List[AlertOut])
def get_alerts(
    station_id: Optional[int] = None,
    severity: Optional[AlertSeverity] = None,
    status_filter: Optional[AlertStatus] = None,
    limit: int = Query(50, ge=1, le=500),
    db: Session = Depends(get_db)
):
    query = db.query(Alert)
    if station_id:
        query = query.filter(Alert.station_id == station_id)
    if severity:
        query = query.filter(Alert.severity == severity)
    if status_filter:
        query = query.filter(Alert.status == status_filter)

    alerts = query.order_by(Alert.created_at.desc()).limit(limit).all()
    
    # Enrich with station name
    results = []
    for a in alerts:
        station = db.query(Station).filter(Station.id == a.station_id).first()
        a_dict = {
            "id": a.id,
            "station_id": a.station_id,
            "station_name": station.name if station else "Unknown Station",
            "reading_id": a.reading_id,
            "parameter_name": a.parameter_name,
            "observed_value": a.observed_value,
            "threshold_value": a.threshold_value,
            "unit": a.unit,
            "severity": a.severity,
            "status": a.status,
            "message": a.message,
            "created_at": a.created_at,
            "acknowledged_at": a.acknowledged_at,
            "acknowledged_by": a.acknowledged_by,
            "resolved_at": a.resolved_at,
            "resolved_by": a.resolved_by,
            "resolution_notes": a.resolution_notes
        }
        results.append(a_dict)
    return results

@router.post("/{alert_id}/acknowledge", response_model=AlertOut, dependencies=[Depends(require_operator)])
def acknowledge_alert(alert_id: int, ack_in: AlertAcknowledge, db: Session = Depends(get_db)):
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    
    alert.status = AlertStatus.ACKNOWLEDGED
    alert.acknowledged_at = datetime.now(timezone.utc)
    alert.acknowledged_by = ack_in.acknowledged_by or "Operator"
    db.commit()
    db.refresh(alert)
    return alert

@router.post("/{alert_id}/resolve", response_model=AlertOut, dependencies=[Depends(require_operator)])
def resolve_alert(alert_id: int, res_in: AlertResolve, db: Session = Depends(get_db)):
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")

    alert.status = AlertStatus.RESOLVED
    alert.resolved_at = datetime.now(timezone.utc)
    alert.resolved_by = res_in.resolved_by or "Operator"
    alert.resolution_notes = res_in.resolution_notes
    db.commit()
    db.refresh(alert)
    return alert
