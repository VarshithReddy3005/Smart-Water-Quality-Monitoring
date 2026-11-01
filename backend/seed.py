import math
import random
from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session
from app.core.database import SessionLocal, Base, engine
from app.core.security import get_password_hash
from app.models.user import User, UserRole
from app.models.station import Station, WaterSourceType, StationStatus
from app.models.device import Device, DeviceStatus
from app.models.threshold import ParameterThreshold
from app.models.reading import SensorReading
from app.models.alert import Alert, AlertSeverity, AlertStatus
from app.services.wqi_service import WQICalculator

def seed_database():
    print("Creating all tables...")
    Base.metadata.create_all(bind=engine)
    db: Session = SessionLocal()

    try:
        # 1. Seed Users
        if db.query(User).count() == 0:
            print("Seeding initial users...")
            users = [
                User(
                    email="admin@aquaguard.io",
                    hashed_password=get_password_hash("admin123"),
                    full_name="Chief Water Administrator",
                    role=UserRole.ADMINISTRATOR,
                    is_active=True
                ),
                User(
                    email="operator@aquaguard.io",
                    hashed_password=get_password_hash("operator123"),
                    full_name="Lead Monitoring Operator",
                    role=UserRole.OPERATOR,
                    is_active=True
                ),
                User(
                    email="viewer@aquaguard.io",
                    hashed_password=get_password_hash("viewer123"),
                    full_name="Public Health Auditor",
                    role=UserRole.VIEWER,
                    is_active=True
                )
            ]
            db.add_all(users)
            db.commit()

        # 2. Seed Stations (Water Sources)
        if db.query(Station).count() == 0:
            print("Seeding monitoring stations...")
            stations_data = [
                {
                    "name": "Clearwater Municipal Treatment Facility",
                    "code": "STN-DW-01",
                    "water_source_type": WaterSourceType.DRINKING_WATER,
                    "latitude": 40.7128,
                    "longitude": -74.0060,
                    "elevation_m": 12.0,
                    "address": "Terminal Reservoir Basin 3, Metropolitan District",
                    "description": "Primary treated municipal distribution reservoir supplying potable tap water.",
                    "status": StationStatus.ACTIVE
                },
                {
                    "name": "Hudson River South Basin",
                    "code": "STN-RV-02",
                    "water_source_type": WaterSourceType.RIVER,
                    "latitude": 40.7589,
                    "longitude": -73.9851,
                    "elevation_m": 5.0,
                    "address": "Pier 64 Observation Buoy, Hudson Estuary",
                    "description": "Continuous freshwater surface monitoring and tidal sediment tracking station.",
                    "status": StationStatus.ACTIVE
                },
                {
                    "name": "Blue Ridge Mountain Reservoir",
                    "code": "STN-RS-03",
                    "water_source_type": WaterSourceType.RESERVOIR,
                    "latitude": 40.8448,
                    "longitude": -73.8648,
                    "elevation_m": 185.0,
                    "address": "North Gate Dam Intake, Blue Ridge Valley",
                    "description": "Protected mountain watershed providing catchment reserves for metropolitan storage.",
                    "status": StationStatus.ACTIVE
                },
                {
                    "name": "Highland Deep Aquifer Borewell #4",
                    "code": "STN-GW-04",
                    "water_source_type": WaterSourceType.GROUNDWATER,
                    "latitude": 40.6782,
                    "longitude": -73.9442,
                    "elevation_m": 45.0,
                    "address": "Deep Extraction Facility 4, South Plain",
                    "description": "Subterranean groundwater table probe monitoring baseline dissolved minerals and infiltration.",
                    "status": StationStatus.ACTIVE
                },
                {
                    "name": "Cascade Alpine Glacial Lake",
                    "code": "STN-LK-05",
                    "water_source_type": WaterSourceType.LAKE,
                    "latitude": 40.9100,
                    "longitude": -73.7800,
                    "elevation_m": 310.0,
                    "address": "Northern Eco-preserve Shoreline",
                    "description": "High-altitude pristine lake station establishing regional ecological baseline data.",
                    "status": StationStatus.ACTIVE
                },
                {
                    "name": "Apex Chemical Industrial Outfall",
                    "code": "STN-IND-06",
                    "water_source_type": WaterSourceType.INDUSTRIAL,
                    "latitude": 40.6500,
                    "longitude": -74.1200,
                    "elevation_m": 8.0,
                    "address": "Industrial Park Drainage Canal Gate B",
                    "description": "Continuous compliance checkpoint for industrial effluent discharge neutralization.",
                    "status": StationStatus.ACTIVE
                }
            ]

            for s_data in stations_data:
                station = Station(**s_data)
                db.add(station)
            db.commit()

        # 3. Seed Standard Thresholds
        if db.query(ParameterThreshold).count() == 0:
            print("Seeding regulatory threshold limits...")
            all_source_types = list(WaterSourceType)
            for wtype in all_source_types:
                # Custom adjustments by source type
                is_drinking = (wtype == WaterSourceType.DRINKING_WATER)
                
                thresholds = [
                    ParameterThreshold(
                        water_source_type=wtype,
                        parameter_name="ph",
                        display_name="pH",
                        unit="pH",
                        min_normal=6.5,
                        max_normal=8.5,
                        min_warning=6.0,
                        max_warning=9.0,
                        min_critical=5.5,
                        max_critical=9.5,
                        standard_limit=8.5,
                        ideal_value=7.0,
                        unit_weight=0.22
                    ),
                    ParameterThreshold(
                        water_source_type=wtype,
                        parameter_name="turbidity_ntu",
                        display_name="Turbidity",
                        unit="NTU",
                        min_normal=0.0,
                        max_normal=1.0 if is_drinking else 5.0,
                        min_warning=0.0,
                        max_warning=5.0 if is_drinking else 10.0,
                        min_critical=0.0,
                        max_critical=10.0 if is_drinking else 25.0,
                        standard_limit=5.0,
                        ideal_value=0.0,
                        unit_weight=0.25
                    ),
                    ParameterThreshold(
                        water_source_type=wtype,
                        parameter_name="dissolved_oxygen_mg_l",
                        display_name="Dissolved Oxygen",
                        unit="mg/L",
                        min_normal=6.5,
                        max_normal=14.0,
                        min_warning=4.5,
                        max_warning=14.0,
                        min_critical=3.0,
                        max_critical=14.0,
                        standard_limit=5.0,
                        ideal_value=14.6,
                        unit_weight=0.28
                    ),
                    ParameterThreshold(
                        water_source_type=wtype,
                        parameter_name="tds_ppm",
                        display_name="Total Dissolved Solids",
                        unit="ppm",
                        min_normal=0.0,
                        max_normal=300.0 if is_drinking else 500.0,
                        min_warning=0.0,
                        max_warning=500.0 if is_drinking else 1000.0,
                        min_critical=0.0,
                        max_critical=1000.0 if is_drinking else 2000.0,
                        standard_limit=500.0,
                        ideal_value=0.0,
                        unit_weight=0.15
                    ),
                    ParameterThreshold(
                        water_source_type=wtype,
                        parameter_name="electrical_conductivity_us_cm",
                        display_name="Electrical Conductivity",
                        unit="µS/cm",
                        min_normal=0.0,
                        max_normal=500.0 if is_drinking else 800.0,
                        min_warning=0.0,
                        max_warning=800.0 if is_drinking else 1500.0,
                        min_critical=0.0,
                        max_critical=1500.0 if is_drinking else 2500.0,
                        standard_limit=300.0,
                        ideal_value=0.0,
                        unit_weight=0.10
                    ),
                    ParameterThreshold(
                        water_source_type=wtype,
                        parameter_name="temperature_c",
                        display_name="Temperature",
                        unit="°C",
                        min_normal=10.0,
                        max_normal=25.0,
                        min_warning=5.0,
                        max_warning=28.0,
                        min_critical=0.0,
                        max_critical=32.0,
                        standard_limit=25.0,
                        ideal_value=20.0,
                        unit_weight=0.05
                    )
                ]
                db.add_all(thresholds)
            db.commit()

        # 4. Seed Devices & Historical Readings
        stations = db.query(Station).all()
        now = datetime.now(timezone.utc)

        for s in stations:
            device = db.query(Device).filter(Device.station_id == s.id).first()
            if not device:
                device = Device(
                    device_uid=f"DEV-{s.code}",
                    name=f"IoT Telemetry Hub {s.name[:18]}",
                    station_id=s.id,
                    api_key_hash=get_password_hash(f"secret_key_{s.code}"),
                    device_type="ESP32-AquaGuard-v2",
                    firmware_version="v2.4.1",
                    status=DeviceStatus.ONLINE,
                    battery_level=random.uniform(88.0, 98.0),
                    signal_strength_dbm=random.uniform(-72.0, -55.0),
                    is_simulated=True,
                    last_heartbeat=now
                )
                db.add(device)
                db.commit()
                db.refresh(device)

            # Generate 48 hours of historical readings (1 sample per hour)
            existing_count = db.query(SensorReading).filter(SensorReading.station_id == s.id).count()
            if existing_count < 24:
                print(f"Generating 48-hour baseline telemetry for station {s.name}...")
                for h in range(48, 0, -1):
                    ts = now - timedelta(hours=h)
                    t_osc = math.sin((48 - h) * 0.26)  # Diurnal rhythm
                    
                    ph = 7.4 + 0.15 * t_osc + random.gauss(0, 0.03)
                    turb = max(0.3, 1.2 + 0.4 * t_osc + random.gauss(0, 0.08))
                    temp = 20.0 + 3.0 * t_osc + random.gauss(0, 0.1)
                    do = max(5.2, 8.4 - 0.5 * t_osc + random.gauss(0, 0.1))
                    tds = 240.0 + 20.0 * t_osc + random.gauss(0, 4.0)
                    ec = tds * 1.55 + random.gauss(0, 6.0)

                    # Calculate WQI
                    p_dict = {
                        "ph": ph,
                        "turbidity_ntu": turb,
                        "dissolved_oxygen_mg_l": do,
                        "tds_ppm": tds,
                        "electrical_conductivity_us_cm": ec
                    }
                    wqi_res = WQICalculator.calculate_wqi(p_dict)

                    r = SensorReading(
                        station_id=s.id,
                        device_id=device.id,
                        timestamp=ts,
                        is_simulated=True,
                        ph=round(ph, 2),
                        turbidity_ntu=round(turb, 2),
                        temperature_c=round(temp, 1),
                        dissolved_oxygen_mg_l=round(do, 2),
                        tds_ppm=round(tds, 1),
                        electrical_conductivity_us_cm=round(ec, 1),
                        orp_mv=round(350.0 + 10.0 * t_osc, 1),
                        salinity_ppt=round(tds / 1000.0, 3),
                        water_level_m=round(4.0 + 0.2 * t_osc, 2),
                        flow_rate_l_min=135.0,
                        ammonia_mg_l=0.04,
                        nitrate_mg_l=2.8,
                        chlorine_mg_l=0.85,
                        wqi_score=wqi_res.score,
                        wqi_category=wqi_res.category,
                        quality_status="NORMAL"
                    )
                    db.add(r)
                db.commit()

        # Seed 1-2 representative alerts for demonstration
        if db.query(Alert).count() == 0:
            first_station = stations[0]
            alert1 = Alert(
                station_id=first_station.id,
                parameter_name="turbidity_ntu",
                observed_value=6.4,
                threshold_value=5.0,
                unit="NTU",
                severity=AlertSeverity.WARNING,
                status=AlertStatus.ACTIVE,
                message=f"[WARNING ALERT - Station '{first_station.name}'] Turbidity elevated at 6.40 NTU (Warning threshold: 5.00 NTU)",
                created_at=now - timedelta(minutes=45)
            )
            db.add(alert1)
            db.commit()

        print("Database seeded successfully with users, stations, thresholds, and historical readings!")
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()
