from typing import Optional, List, Dict
from pydantic import BaseModel

class ParameterContribution(BaseModel):
    parameter: str
    observed_value: float
    ideal_value: float
    standard_limit: float
    unit_weight: float
    quality_rating: float
    sub_index: float
    unit: str

class WQIResult(BaseModel):
    is_available: bool
    methodology: str = "Brown's Weighted Arithmetic Water Quality Index"
    score: Optional[float] = None
    category: Optional[str] = None
    color: Optional[str] = None
    description: Optional[str] = None
    contributing_parameters: List[ParameterContribution] = []
    missing_parameters: List[str] = []
    disclaimer: str = (
        "SCIENTIFIC NOTICE: Water Quality Index provides a screening metric of physical-chemical "
        "characteristics based on available sensor parameters. Drinking water potability and safety "
        "strictly requires certified laboratory testing for microbiological pathogens (such as E. coli), "
        "heavy metals, and regulated synthetic chemicals."
    )
