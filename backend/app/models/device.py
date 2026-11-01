import enum
from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, Enum, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base

class DeviceStatus(str, enum.Enum):
    ONLINE = "ONLINE"
    OFFLINE = "OFFLINE"
    MAINTENANCE = "MAINTENANCE"
    ERROR = "ERROR"

class Device(Base):
    __tablename__ = "devices"

    id = Column(Integer, primary_key=True, index=True)
    device_uid = Column(String(100), unique=True, index=True, nullable=False)
    name = Column(String(255), nullable=False)
    station_id = Column(Integer, ForeignKey("stations.id", ondelete="CASCADE"), nullable=False)
    api_key_hash = Column(String(255), nullable=True)
    device_type = Column(String(100), default="ESP32-AquaGuard", nullable=False)
    firmware_version = Column(String(50), default="v1.0.0", nullable=False)
    status = Column(Enum(DeviceStatus), default=DeviceStatus.ONLINE, nullable=False)
    battery_level = Column(Float, nullable=True)  # Percentage 0 - 100
    signal_strength_dbm = Column(Float, nullable=True)  # dBm, e.g. -65
    is_simulated = Column(Boolean, default=False, nullable=False)
    last_heartbeat = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    station = relationship("Station", back_populates="devices")
    readings = relationship("SensorReading", back_populates="device", cascade="all, delete-orphan")
