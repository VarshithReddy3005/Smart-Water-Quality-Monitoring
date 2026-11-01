import secrets
from typing import List, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import get_password_hash
from app.models.device import Device, DeviceStatus
from app.models.station import Station
from app.schemas.device import DeviceCreate, DeviceUpdate, DeviceOut, DeviceHeartbeat
from app.api.deps import require_admin, require_operator

router = APIRouter(prefix="/devices", tags=["IoT Devices & Sensors"])

@router.get("", response_model=List[DeviceOut])
def get_devices(
    station_id: Optional[int] = None,
    is_simulated: Optional[bool] = None,
    status_filter: Optional[DeviceStatus] = None,
    db: Session = Depends(get_db)
):
    query = db.query(Device)
    if station_id:
        query = query.filter(Device.station_id == station_id)
    if is_simulated is not None:
        query = query.filter(Device.is_simulated == is_simulated)
    if status_filter:
        query = query.filter(Device.status == status_filter)
    return query.all()

@router.post("", response_model=DeviceOut, dependencies=[Depends(require_admin)])
def register_device(device_in: DeviceCreate, db: Session = Depends(get_db)):
    existing = db.query(Device).filter(Device.device_uid == device_in.device_uid).first()
    if existing:
        raise HTTPException(status_code=400, detail="Device UID already registered")

    station = db.query(Station).filter(Station.id == device_in.station_id).first()
    if not station:
        raise HTTPException(status_code=404, detail="Assigned station not found")

    # Generate cryptographically secure API Key for physical device authentication
    raw_api_key = f"aq_{secrets.token_urlsafe(32)}"
    api_key_hash = get_password_hash(raw_api_key)

    device = Device(
        device_uid=device_in.device_uid,
        name=device_in.name,
        station_id=device_in.station_id,
        api_key_hash=api_key_hash,
        device_type=device_in.device_type,
        firmware_version=device_in.firmware_version,
        status=DeviceStatus.ONLINE,
        is_simulated=device_in.is_simulated,
        last_heartbeat=datetime.now(timezone.utc),
        created_at=datetime.now(timezone.utc)
    )
    db.add(device)
    db.commit()
    db.refresh(device)

    # Attach raw API key only once upon initial registration response
    res = DeviceOut.model_validate(device)
    res.api_key = raw_api_key
    return res

@router.post("/heartbeat")
def device_heartbeat(heartbeat: DeviceHeartbeat, db: Session = Depends(get_db)):
    device = db.query(Device).filter(Device.device_uid == heartbeat.device_uid).first()
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")

    device.last_heartbeat = datetime.now(timezone.utc)
    device.status = DeviceStatus.ONLINE
    if heartbeat.battery_level is not None:
        device.battery_level = heartbeat.battery_level
    if heartbeat.signal_strength_dbm is not None:
        device.signal_strength_dbm = heartbeat.signal_strength_dbm
    if heartbeat.firmware_version is not None:
        device.firmware_version = heartbeat.firmware_version

    db.commit()
    return {"status": "success", "device_uid": device.device_uid, "last_heartbeat": device.last_heartbeat}

@router.put("/{device_id}", response_model=DeviceOut, dependencies=[Depends(require_admin)])
def update_device(device_id: int, device_in: DeviceUpdate, db: Session = Depends(get_db)):
    device = db.query(Device).filter(Device.id == device_id).first()
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")

    for field, val in device_in.model_dump(exclude_unset=True).items():
        setattr(device, field, val)

    db.commit()
    db.refresh(device)
    return device

@router.delete("/{device_id}", dependencies=[Depends(require_admin)])
def delete_device(device_id: int, db: Session = Depends(get_db)):
    device = db.query(Device).filter(Device.id == device_id).first()
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")
    db.delete(device)
    db.commit()
    return {"message": f"Device '{device.name}' deleted successfully"}
