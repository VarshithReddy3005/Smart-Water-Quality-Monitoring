import enum
from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Float, DateTime, Enum, Text
from sqlalchemy.orm import relationship
from app.core.database import Base

class WaterSourceType(str, enum.Enum):
    RIVER = "RIVER"
    LAKE = "LAKE"
    RESERVOIR = "RESERVOIR"
    GROUNDWATER = "GROUNDWATER"
    BOREWELL = "BOREWELL"
    DRINKING_WATER = "DRINKING_WATER"
    INDUSTRIAL = "INDUSTRIAL"
    WASTEWATER = "WASTEWATER"

class StationStatus(str, enum.Enum):
    ACTIVE = "ACTIVE"
    INACTIVE = "INACTIVE"
    MAINTENANCE = "MAINTENANCE"

class Station(Base):
    __tablename__ = "stations"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False, unique=True)
    code = Column(String(50), nullable=False, unique=True, index=True)
    water_source_type = Column(Enum(WaterSourceType), nullable=False, default=WaterSourceType.DRINKING_WATER)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    elevation_m = Column(Float, nullable=True, default=0.0)
    address = Column(String(500), nullable=True)
    description = Column(Text, nullable=True)
    status = Column(Enum(StationStatus), nullable=False, default=StationStatus.ACTIVE)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    devices = relationship("Device", back_populates="station", cascade="all, delete-orphan")
    readings = relationship("SensorReading", back_populates="station", cascade="all, delete-orphan")
    alerts = relationship("Alert", back_populates="station", cascade="all, delete-orphan")
