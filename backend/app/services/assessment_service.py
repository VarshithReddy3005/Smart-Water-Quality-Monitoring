from typing import List, Tuple, Dict, Any, Optional
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from app.models.threshold import ParameterThreshold
from app.models.station import Station
from app.models.alert import Alert, AlertSeverity, AlertStatus

class AssessmentService:
    @staticmethod
    def evaluate_reading(
        db: Session,
        station: Station,
        reading_data: Dict[str, Any],
        reading_id: Optional[int] = None
    ) -> Tuple[str, List[Alert]]:
        """
        Evaluates sensor readings against configured thresholds for the station's water source type.
        Status Levels:
          - CRITICAL: value < min_critical OR value > max_critical
          - WARNING: outside [min_normal, max_normal] but within critical boundaries
          - NORMAL: within [min_normal, max_normal]
        Returns: (overall_status: str, alerts: List[Alert])
        """
        thresholds = db.query(ParameterThreshold).filter(
            ParameterThreshold.water_source_type == station.water_source_type
        ).all()
        
        # Build threshold lookup map
        threshold_map = {t.parameter_name: t for t in thresholds}
        
        overall_status = "NORMAL"
        generated_alerts: List[Alert] = []

        monitored_params = [
            ("ph", "pH"),
            ("turbidity_ntu", "Turbidity"),
            ("temperature_c", "Temperature"),
            ("dissolved_oxygen_mg_l", "Dissolved Oxygen"),
            ("tds_ppm", "Total Dissolved Solids (TDS)"),
            ("electrical_conductivity_us_cm", "Electrical Conductivity (EC)"),
            ("ammonia_mg_l", "Ammonia"),
            ("nitrate_mg_l", "Nitrate"),
            ("chlorine_mg_l", "Residual Chlorine")
        ]

        for param_key, param_label in monitored_params:
            val = reading_data.get(param_key)
            if val is None:
                continue

            threshold = threshold_map.get(param_key)
            if not threshold:
                continue

            unit = threshold.unit or ""
            is_critical = False
            is_warning = False
            trigger_msg = ""
            limit_val = 0.0

            # 1. Critical Check: exceeds hard critical bounds
            if threshold.min_critical is not None and val < threshold.min_critical:
                is_critical = True
                limit_val = threshold.min_critical
                trigger_msg = f"{param_label} critically low at {val:.2f} {unit} (Critical limit: {limit_val} {unit})"
            elif threshold.max_critical is not None and val > threshold.max_critical:
                is_critical = True
                limit_val = threshold.max_critical
                trigger_msg = f"{param_label} critically high at {val:.2f} {unit} (Critical limit: {limit_val} {unit})"
            
            # 2. Warning Check: outside normal range but not critical
            elif threshold.min_normal is not None and val < threshold.min_normal:
                is_warning = True
                limit_val = threshold.min_normal
                trigger_msg = f"{param_label} below standard range at {val:.2f} {unit} (Normal minimum: {limit_val} {unit})"
            elif threshold.max_normal is not None and val > threshold.max_normal:
                is_warning = True
                limit_val = threshold.max_normal
                trigger_msg = f"{param_label} elevated above standard range at {val:.2f} {unit} (Normal maximum: {limit_val} {unit})"

            if is_critical:
                overall_status = "CRITICAL"
                alert = Alert(
                    station_id=station.id,
                    reading_id=reading_id,
                    parameter_name=param_key,
                    observed_value=float(val),
                    threshold_value=float(limit_val),
                    unit=unit,
                    severity=AlertSeverity.CRITICAL,
                    status=AlertStatus.ACTIVE,
                    message=f"[CRITICAL ALERT - Station '{station.name}'] {trigger_msg}",
                    created_at=datetime.now(timezone.utc)
                )
                db.add(alert)
                generated_alerts.append(alert)
            elif is_warning:
                if overall_status != "CRITICAL":
                    overall_status = "WARNING"
                alert = Alert(
                    station_id=station.id,
                    reading_id=reading_id,
                    parameter_name=param_key,
                    observed_value=float(val),
                    threshold_value=float(limit_val),
                    unit=unit,
                    severity=AlertSeverity.WARNING,
                    status=AlertStatus.ACTIVE,
                    message=f"[WARNING ALERT - Station '{station.name}'] {trigger_msg}",
                    created_at=datetime.now(timezone.utc)
                )
                db.add(alert)
                generated_alerts.append(alert)

        return overall_status, generated_alerts
