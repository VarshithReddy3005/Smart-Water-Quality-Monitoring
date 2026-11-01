from app.models.station import Station, WaterSourceType, StationStatus
from app.models.device import Device, DeviceStatus

def test_sensor_ingestion_api(client, db):
    station = Station(
        name="Ingestion Test Station",
        code="ING-STN-99",
        water_source_type=WaterSourceType.DRINKING_WATER,
        latitude=40.5,
        longitude=-73.5,
        status=StationStatus.ACTIVE
    )
    db.add(station)
    db.commit()
    db.refresh(station)

    device = Device(
        device_uid="ESP32-ING-001",
        name="Test ESP32 Node",
        station_id=station.id,
        device_type="ESP32",
        status=DeviceStatus.ONLINE,
        is_simulated=False
    )
    db.add(device)
    db.commit()
    db.refresh(device)

    payload = {
        "station_id": station.id,
        "device_uid": "ESP32-ING-001",
        "ph": 7.42,
        "turbidity_ntu": 1.15,
        "temperature_c": 19.8,
        "dissolved_oxygen_mg_l": 8.1,
        "tds_ppm": 210.0,
        "electrical_conductivity_us_cm": 320.0
    }

    res = client.post("/api/v1/sensors/ingest", json=payload)
    assert res.status_code == 200, res.text
    data = res.json()
    assert data["station_id"] == station.id
    assert data["ph"] == 7.42
    assert data["quality_status"] == "NORMAL"
    assert data["wqi_score"] is not None
