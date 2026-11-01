from typing import Dict, Any, List, Optional
from app.schemas.wqi import WQIResult, ParameterContribution

class WQICalculator:
    """
    Implementation of Brown's Weighted Arithmetic Water Quality Index (Brown et al., 1970/1972).
    Standard permissible limits (Si) aligned with WHO & BIS drinking water guidelines.
    """
    
    STANDARD_PARAMETERS = {
        "ph": {
            "name": "pH",
            "unit": "pH",
            "standard_limit": 8.5,
            "ideal_value": 7.0,
            "min_valid": 0.0,
            "max_valid": 14.0
        },
        "dissolved_oxygen_mg_l": {
            "name": "Dissolved Oxygen",
            "unit": "mg/L",
            "standard_limit": 5.0,
            "ideal_value": 14.6,  # Saturation point at 0°C/standard conditions
            "min_valid": 0.0,
            "max_valid": 25.0
        },
        "turbidity_ntu": {
            "name": "Turbidity",
            "unit": "NTU",
            "standard_limit": 5.0,
            "ideal_value": 0.0,
            "min_valid": 0.0,
            "max_valid": 500.0
        },
        "tds_ppm": {
            "name": "Total Dissolved Solids",
            "unit": "ppm",
            "standard_limit": 500.0,
            "ideal_value": 0.0,
            "min_valid": 0.0,
            "max_valid": 5000.0
        },
        "electrical_conductivity_us_cm": {
            "name": "Electrical Conductivity",
            "unit": "µS/cm",
            "standard_limit": 300.0,
            "ideal_value": 0.0,
            "min_valid": 0.0,
            "max_valid": 5000.0
        }
    }

    @classmethod
    def calculate_wqi(cls, readings: Dict[str, Any]) -> WQIResult:
        present_params = []
        missing_params = []

        for key, spec in cls.STANDARD_PARAMETERS.items():
            val = readings.get(key)
            if val is not None and spec["min_valid"] <= val <= spec["max_valid"]:
                present_params.append((key, spec, float(val)))
            else:
                missing_params.append(spec["name"])

        # Check sufficiency: At least 3 key parameters must be present
        if len(present_params) < 3:
            return WQIResult(
                is_available=False,
                score=None,
                category="Insufficient Data",
                color="#94A3B8",
                description="Water Quality Index unavailable – insufficient measurements.",
                contributing_parameters=[],
                missing_parameters=missing_params
            )

        # 1. Compute constant K = 1 / sum(1 / Si)
        sum_inv_s = sum(1.0 / spec["standard_limit"] for _, spec, _ in present_params)
        k = 1.0 / sum_inv_s

        # 2. Compute Unit Weights Wi = K / Si and Quality Rating Qi
        contributions: List[ParameterContribution] = []
        total_wi = 0.0
        sum_wi_qi = 0.0

        for key, spec, val in present_params:
            si = spec["standard_limit"]
            vi = val
            v0 = spec["ideal_value"]

            # Unit weight
            wi = k / si
            total_wi += wi

            # Quality rating scale: Qi = |Vi - V0| / |Si - V0| * 100
            denominator = abs(si - v0)
            if denominator == 0:
                qi = 0.0
            else:
                qi = (abs(vi - v0) / denominator) * 100.0

            sub_index = wi * qi
            sum_wi_qi += sub_index

            contributions.append(ParameterContribution(
                parameter=spec["name"],
                observed_value=round(val, 2),
                ideal_value=round(v0, 2),
                standard_limit=round(si, 2),
                unit_weight=round(wi, 4),
                quality_rating=round(qi, 2),
                sub_index=round(sub_index, 2),
                unit=spec["unit"]
            ))

        # 3. Final WQI Score
        wqi_score = round(sum_wi_qi / total_wi, 2) if total_wi > 0 else 0.0

        # Categorization based on Brown et al. scale
        if wqi_score <= 25.0:
            category = "Excellent"
            color = "#10B981"  # Emerald
            description = "Water quality is pristine; suitable for domestic and ecological uses."
        elif wqi_score <= 50.0:
            category = "Good"
            color = "#3B82F6"  # Blue
            description = "Water quality is good; complies with primary physicochemical standards."
        elif wqi_score <= 75.0:
            category = "Poor"
            color = "#F59E0B"  # Amber
            description = "Water quality is degraded; conventional filtration/treatment required."
        elif wqi_score <= 100.0:
            category = "Very Poor"
            color = "#F97316"  # Orange
            description = "Water quality is heavily impaired; strictly restricted utility."
        else:
            category = "Unsuitable for Drinking"
            color = "#EF4444"  # Red
            description = "Water quality is hazardous and fails standard health thresholds."

        return WQIResult(
            is_available=True,
            score=wqi_score,
            category=category,
            color=color,
            description=description,
            contributing_parameters=contributions,
            missing_parameters=missing_params
        )
