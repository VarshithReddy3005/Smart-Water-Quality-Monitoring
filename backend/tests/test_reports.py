import os
from datetime import datetime, timedelta, timezone
from app.models.station import Station, WaterSourceType, StationStatus
from app.models.device import Device, DeviceStatus
from app.models.reading import SensorReading
from app.models.alert import Alert, AlertSeverity, AlertStatus
from app.services.report_service import ReportService

def test_csv_and_pdf_report_generation(db):
    station = Station(
        name="Report Test Station",
        code="REP-01",
        water_source_type=WaterSourceType.DRINKING_WATER,
        latitude=41.0,
        longitude=-74.0,
        status=StationStatus.ACTIVE
    )
    db.add(station)
    db.commit()

    device = Device(
        device_uid="DEV-REP-01",
        name="Report Device",
        station_id=station.id,
        status=DeviceStatus.ONLINE,
        is_simulated=False
    )
    db.add(device)
    db.commit()

    now = datetime.now(timezone.utc)
    reading = SensorReading(
        station_id=station.id,
        device_id=device.id,
        timestamp=now,
        ph=7.2,
        turbidity_ntu=0.8,
        temperature_c=18.5,
        dissolved_oxygen_mg_l=8.5,
        tds_ppm=180.0,
        electrical_conductivity_us_cm=270.0,
        quality_status="NORMAL"
    )
    db.add(reading)

    alert = Alert(
        station_id=station.id,
        parameter_name="ph",
        observed_value=8.9,
        threshold_value=8.5,
        unit="pH",
        severity=AlertSeverity.WARNING,
        status=AlertStatus.ACTIVE,
        message="pH warning",
        created_at=now
    )
    db.add(alert)
    db.commit()

    start_date = now - timedelta(days=1)
    end_date = now + timedelta(days=1)

    # 1. Generate CSV
    csv_path = ReportService.generate_csv(station, [reading], start_date, end_date)
    assert os.path.exists(csv_path)
    assert os.path.getsize(csv_path) > 0
    with open(csv_path, "r", encoding="utf-8") as f:
        content = f.read()
        assert "AquaGuard" in content
        assert station.code in content

    # 2. Generate PDF
    pdf_path = ReportService.generate_pdf(station, [reading], [alert], start_date, end_date)
    assert os.path.exists(pdf_path)
    assert os.path.getsize(pdf_path) > 1000  # valid PDF size
