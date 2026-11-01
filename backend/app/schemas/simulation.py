from typing import Optional, List
from pydantic import BaseModel

class SimulationConfig(BaseModel):
    is_running: bool
    interval_seconds: int = 3
    active_scenario: str = "nominal"  # "nominal", "rainfall_runoff", "chemical_spill", "algal_bloom", "sensor_drift"
    stations_count: int
    readings_generated_total: int
    watermark: str = "SIMULATED DATA – NOT REAL SENSOR MEASUREMENTS"

class SimulationControlRequest(BaseModel):
    action: str  # "start", "stop", "pause", "resume"
    interval_seconds: Optional[int] = None
    scenario: Optional[str] = None
