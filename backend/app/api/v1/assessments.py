from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.threshold import ParameterThreshold
from app.models.station import WaterSourceType
from app.schemas.threshold import ThresholdOut, ThresholdUpdate, ThresholdCreate
from app.api.deps import require_admin

router = APIRouter(prefix="/assessments", tags=["Assessment Thresholds & Regulatory Rules"])

@router.get("/thresholds", response_model=List[ThresholdOut])
def get_thresholds(water_source_type: Optional[WaterSourceType] = None, db: Session = Depends(get_db)):
    query = db.query(ParameterThreshold)
    if water_source_type:
        query = query.filter(ParameterThreshold.water_source_type == water_source_type)
    return query.all()

@router.post("/thresholds", response_model=ThresholdOut, dependencies=[Depends(require_admin)])
def create_threshold(threshold_in: ThresholdCreate, db: Session = Depends(get_db)):
    threshold = ParameterThreshold(**threshold_in.model_dump())
    db.add(threshold)
    db.commit()
    db.refresh(threshold)
    return threshold

@router.put("/thresholds/{threshold_id}", response_model=ThresholdOut, dependencies=[Depends(require_admin)])
def update_threshold(threshold_id: int, threshold_in: ThresholdUpdate, db: Session = Depends(get_db)):
    threshold = db.query(ParameterThreshold).filter(ParameterThreshold.id == threshold_id).first()
    if not threshold:
        raise HTTPException(status_code=404, detail="Threshold entry not found")

    for field, val in threshold_in.model_dump(exclude_unset=True).items():
        setattr(threshold, field, val)

    db.commit()
    db.refresh(threshold)
    return threshold
