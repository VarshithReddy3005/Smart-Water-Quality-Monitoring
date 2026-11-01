from app.models.station import Station, WaterSourceType, StationStatus
from app.models.threshold import ParameterThreshold
from app.services.assessment_service import AssessmentService

def test_assessment_rule_engine(db):
    station = Station(
        name="Unit Test River Station",
        code="TEST-STN-01",
        water_source_type=WaterSourceType.RIVER,
        latitude=40.0,
        longitude=-74.0,
        status=StationStatus.ACTIVE
    )
    db.add(station)

    # Add threshold for pH
    th_ph = ParameterThreshold(
        water_source_type=WaterSourceType.RIVER,
        parameter_name="ph",
        display_name="pH",
        unit="pH",
        min_normal=6.5,
        max_normal=8.5,
        min_warning=6.0,
        max_warning=9.0,
        min_critical=5.0,
        max_critical=9.5,
        standard_limit=8.5,
        ideal_value=7.0
    )
    db.add(th_ph)
    db.commit()

    # 1. Normal reading
    status, alerts = AssessmentService.evaluate_reading(db, station, {"ph": 7.3})
    assert status == "NORMAL"
    assert len(alerts) == 0

    # 2. Warning reading (elevated pH)
    status, alerts = AssessmentService.evaluate_reading(db, station, {"ph": 8.8})
    assert status == "WARNING"
    assert len(alerts) == 1
    assert alerts[0].severity.value == "WARNING"

    # 3. Critical reading (acidic spill)
    status, alerts = AssessmentService.evaluate_reading(db, station, {"ph": 4.5})
    assert status == "CRITICAL"
    assert len(alerts) == 1
    assert alerts[0].severity.value == "CRITICAL"
