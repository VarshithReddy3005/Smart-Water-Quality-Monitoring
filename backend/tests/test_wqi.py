from app.services.wqi_service import WQICalculator

def test_wqi_calculation_pristine_water():
    # Pristine neutral values: pH=7.0, DO=14.6, Turbidity=0.5, TDS=50, EC=75
    readings = {
        "ph": 7.0,
        "dissolved_oxygen_mg_l": 14.6,
        "turbidity_ntu": 0.5,
        "tds_ppm": 50.0,
        "electrical_conductivity_us_cm": 75.0
    }
    result = WQICalculator.calculate_wqi(readings)
    assert result.is_available is True
    assert result.score is not None
    assert result.score < 25.0  # Should be classified as "Excellent"
    assert result.category == "Excellent"
    assert len(result.contributing_parameters) == 5

def test_wqi_calculation_polluted_water():
    # Polluted values: pH=4.5 (acidic), DO=2.0 (hypoxic), Turbidity=25, TDS=1200
    readings = {
        "ph": 4.5,
        "dissolved_oxygen_mg_l": 2.0,
        "turbidity_ntu": 25.0,
        "tds_ppm": 1200.0,
        "electrical_conductivity_us_cm": 1800.0
    }
    result = WQICalculator.calculate_wqi(readings)
    assert result.is_available is True
    assert result.score > 75.0  # Should be Very Poor or Unsuitable
    assert result.category in ["Very Poor", "Unsuitable for Drinking"]

def test_wqi_insufficient_data():
    # Only 1 parameter provided -> should return unavailable
    readings = {
        "ph": 7.2
    }
    result = WQICalculator.calculate_wqi(readings)
    assert result.is_available is False
    assert result.score is None
    assert "insufficient measurements" in result.description.lower()
    assert len(result.missing_parameters) > 0
