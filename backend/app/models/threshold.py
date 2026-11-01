import enum
from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Float, DateTime, Enum
from app.core.database import Base
from app.models.station import WaterSourceType

class ParameterType(str, enum.Enum):
    PH = "ph"
    TURBIDITY = "turbidity_ntu"
    TEMPERATURE = "temperature_c"
    DISSOLVED_OXYGEN = "dissolved_oxygen_mg_l"
    TDS = "tds_ppm"
    ELECTRICAL_CONDUCTIVITY = "electrical_conductivity_us_cm"
    ORP = "orp_mv"
    SALINITY = "salinity_ppt"
    WATER_LEVEL = "water_level_m"
    FLOW_RATE = "flow_rate_l_min"
    AMMONIA = "ammonia_mg_l"
    NITRATE = "nitrate_mg_l"
    PHOSPHATE = "phosphate_mg_l"
    CHLORINE = "chlorine_mg_l"

class ParameterThreshold(Base):
    __tablename__ = "parameter_thresholds"

    id = Column(Integer, primary_key=True, index=True)
    water_source_type = Column(Enum(WaterSourceType), nullable=False, default=WaterSourceType.DRINKING_WATER)
    parameter_name = Column(String(100), nullable=False) # e.g. "ph", "turbidity_ntu"
    display_name = Column(String(100), nullable=False)   # e.g. "pH", "Turbidity"
    unit = Column(String(50), nullable=False)            # e.g. "pH", "NTU", "mg/L", "ppm"
    
    # Boundary thresholds
    min_normal = Column(Float, nullable=True)
    max_normal = Column(Float, nullable=True)
    min_warning = Column(Float, nullable=True)
    max_warning = Column(Float, nullable=True)
    min_critical = Column(Float, nullable=True)
    max_critical = Column(Float, nullable=True)
    
    # Standard permissible value (for WQI calculation)
    standard_limit = Column(Float, nullable=True)
    ideal_value = Column(Float, nullable=True)
    unit_weight = Column(Float, nullable=True)

    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
