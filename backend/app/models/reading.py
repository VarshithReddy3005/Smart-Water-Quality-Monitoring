from datetime import datetime, timezone
from sqlalchemy import Column, Integer, Float, Boolean, DateTime, String, ForeignKey, Index
from sqlalchemy.orm import relationship
from app.core.database import Base

class SensorReading(Base):
    __tablename__ = "sensor_readings"

    id = Column(Integer, primary_key=True, index=True)
    station_id = Column(Integer, ForeignKey("stations.id", ondelete="CASCADE"), nullable=False, index=True)
    device_id = Column(Integer, ForeignKey("devices.id", ondelete="SET NULL"), nullable=True, index=True)
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False, index=True)
    is_simulated = Column(Boolean, default=False, nullable=False, index=True)
    
    # Primary Water Quality Parameters
    ph = Column(Float, nullable=True)                          # 0 - 14
    turbidity_ntu = Column(Float, nullable=True)               # NTU
    temperature_c = Column(Float, nullable=True)               # °C
    dissolved_oxygen_mg_l = Column(Float, nullable=True)       # mg/L
    tds_ppm = Column(Float, nullable=True)                     # ppm / mg/L
    electrical_conductivity_us_cm = Column(Float, nullable=True) # µS/cm

    # Additional Monitored Parameters
    orp_mv = Column(Float, nullable=True)                      # mV
    salinity_ppt = Column(Float, nullable=True)                # ppt
    water_level_m = Column(Float, nullable=True)               # meters
    flow_rate_l_min = Column(Float, nullable=True)             # L/min
    ammonia_mg_l = Column(Float, nullable=True)                # mg/L
    nitrate_mg_l = Column(Float, nullable=True)                # mg/L
    phosphate_mg_l = Column(Float, nullable=True)              # mg/L
    chlorine_mg_l = Column(Float, nullable=True)               # mg/L

    # Assessment & Index Outcomes
    quality_status = Column(String(50), default="NORMAL", nullable=False) # NORMAL, WARNING, CRITICAL
    wqi_score = Column(Float, nullable=True)                              # 0 - 100+
    wqi_category = Column(String(50), nullable=True)                      # Excellent, Good, Poor, Very Poor, Unsuitable

    # Relationships
    station = relationship("Station", back_populates="readings")
    device = relationship("Device", back_populates="readings")

    __table_args__ = (
        Index("idx_station_timestamp", "station_id", "timestamp"),
        Index("idx_station_sim_time", "station_id", "is_simulated", "timestamp"),
    )
