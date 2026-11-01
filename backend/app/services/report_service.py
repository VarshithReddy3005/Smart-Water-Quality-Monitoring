import os
import csv
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from sqlalchemy.orm import Session
from app.models.reading import SensorReading
from app.models.station import Station
from app.models.alert import Alert

REPORTS_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "generated_reports"))
os.makedirs(REPORTS_DIR, exist_ok=True)

class ReportService:
    @staticmethod
    def generate_csv(station: Station, readings: List[SensorReading], start_date: datetime, end_date: datetime) -> str:
        filename = f"aquaguard_report_{station.code}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
        filepath = os.path.join(REPORTS_DIR, filename)

        fieldnames = [
            "timestamp", "station_code", "station_name", "water_source", "is_simulated",
            "quality_status", "wqi_score", "wqi_category",
            "ph", "turbidity_ntu", "temperature_c", "dissolved_oxygen_mg_l",
            "tds_ppm", "electrical_conductivity_us_cm", "orp_mv", "salinity_ppt",
            "water_level_m", "flow_rate_l_min", "ammonia_mg_l", "nitrate_mg_l", "chlorine_mg_l"
        ]

        with open(filepath, mode="w", newline="", encoding="utf-8") as f:
            writer = csv.writer(f)
            # Metadata header
            writer.writerow(["# AquaGuard Water Quality Telemetry Export"])
            writer.writerow(["# Station", station.name, f"Code: {station.code}"])
            writer.writerow(["# Water Source", station.water_source_type.value])
            writer.writerow(["# Period", start_date.isoformat(), "to", end_date.isoformat()])
            writer.writerow(["# Generated At", datetime.now(timezone.utc).isoformat()])
            writer.writerow(["# Notice: Simulated data is marked in 'is_simulated' column."])
            writer.writerow([])
            writer.writerow(fieldnames)

            for r in readings:
                writer.writerow([
                    r.timestamp.isoformat() if r.timestamp else "",
                    station.code,
                    station.name,
                    station.water_source_type.value,
                    "YES" if r.is_simulated else "NO",
                    r.quality_status or "NORMAL",
                    r.wqi_score if r.wqi_score is not None else "",
                    r.wqi_category or "",
                    r.ph if r.ph is not None else "",
                    r.turbidity_ntu if r.turbidity_ntu is not None else "",
                    r.temperature_c if r.temperature_c is not None else "",
                    r.dissolved_oxygen_mg_l if r.dissolved_oxygen_mg_l is not None else "",
                    r.tds_ppm if r.tds_ppm is not None else "",
                    r.electrical_conductivity_us_cm if r.electrical_conductivity_us_cm is not None else "",
                    r.orp_mv if r.orp_mv is not None else "",
                    r.salinity_ppt if r.salinity_ppt is not None else "",
                    r.water_level_m if r.water_level_m is not None else "",
                    r.flow_rate_l_min if r.flow_rate_l_min is not None else "",
                    r.ammonia_mg_l if r.ammonia_mg_l is not None else "",
                    r.nitrate_mg_l if r.nitrate_mg_l is not None else "",
                    r.chlorine_mg_l if r.chlorine_mg_l is not None else ""
                ])

        return filepath

    @staticmethod
    def generate_pdf(
        station: Station,
        readings: List[SensorReading],
        alerts: List[Alert],
        start_date: datetime,
        end_date: datetime,
        title: str = "AquaGuard Water Quality Assessment Report"
    ) -> str:
        filename = f"aquaguard_report_{station.code}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"
        filepath = os.path.join(REPORTS_DIR, filename)

        doc = SimpleDocTemplate(
            filepath,
            pagesize=letter,
            rightMargin=36,
            leftMargin=36,
            topMargin=36,
            bottomMargin=36
        )

        styles = getSampleStyleSheet()
        title_style = ParagraphStyle(
            'ReportTitle',
            parent=styles['Heading1'],
            fontSize=20,
            leading=24,
            textColor=colors.HexColor('#0284C7'),
            spaceAfter=6
        )
        subtitle_style = ParagraphStyle(
            'ReportSubtitle',
            parent=styles['Normal'],
            fontSize=10,
            textColor=colors.HexColor('#64748B'),
            spaceAfter=12
        )
        h2_style = ParagraphStyle(
            'H2Style',
            parent=styles['Heading2'],
            fontSize=13,
            leading=16,
            textColor=colors.HexColor('#0F172A'),
            spaceBefore=10,
            spaceAfter=6
        )
        normal_style = styles['Normal']
        disclaimer_style = ParagraphStyle(
            'Disclaimer',
            parent=styles['Italic'],
            fontSize=8,
            leading=11,
            textColor=colors.HexColor('#B45309')
        )

        elements = []

        # Title & Header
        elements.append(Paragraph(title, title_style))
        elements.append(Paragraph(f"Station: <b>{station.name}</b> ({station.code}) | Source: <b>{station.water_source_type.value}</b> | Location: {station.latitude:.4f}, {station.longitude:.4f}", subtitle_style))
        elements.append(Paragraph(f"Reporting Window: {start_date.strftime('%Y-%m-%d %H:%M')} to {end_date.strftime('%Y-%m-%d %H:%M')} UTC | Generated: {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S')} UTC", subtitle_style))
        elements.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor('#E2E8F0'), spaceAfter=14))

        # Executive Metrics Summary
        elements.append(Paragraph("1. Monitoring Telemetry Summary", h2_style))
        
        sample_count = len(readings)
        simulated_count = sum(1 for r in readings if r.is_simulated)
        alert_count = len(alerts)
        critical_alert_count = sum(1 for a in alerts if a.severity.value == "CRITICAL")

        summary_data = [
            ["Metric", "Value", "Metric", "Value"],
            ["Total Samples Collected", str(sample_count), "Total Alerts Triggered", str(alert_count)],
            ["Simulated Samples", f"{simulated_count} ({(simulated_count/sample_count*100) if sample_count else 0:.1f}%)", "Critical Severity Alerts", str(critical_alert_count)],
            ["Station Status", station.status.value, "Water Source Classification", station.water_source_type.value]
        ]

        t_summary = Table(summary_data, colWidths=[2.2*inch, 1.4*inch, 2.2*inch, 1.4*inch])
        t_summary.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#F1F5F9')),
            ('TEXTCOLOR', (0,0), (-1,0), colors.HexColor('#334155')),
            ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
            ('FONTSIZE', (0,0), (-1,-1), 9),
            ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#CBD5E1')),
            ('PADDING', (0,0), (-1,-1), 5),
        ]))
        elements.append(t_summary)
        elements.append(Spacer(1, 14))

        # Parameter Aggregations Table
        elements.append(Paragraph("2. Water Quality Parameter Statistics", h2_style))

        params = [
            ("pH", "ph", "pH"),
            ("Turbidity", "turbidity_ntu", "NTU"),
            ("Temperature", "temperature_c", "°C"),
            ("Dissolved Oxygen", "dissolved_oxygen_mg_l", "mg/L"),
            ("Total Dissolved Solids", "tds_ppm", "ppm"),
            ("Electrical Conductivity", "electrical_conductivity_us_cm", "µS/cm"),
            ("Ammonia", "ammonia_mg_l", "mg/L"),
            ("Nitrate", "nitrate_mg_l", "mg/L"),
            ("Residual Chlorine", "chlorine_mg_l", "mg/L")
        ]

        param_table_data = [["Parameter", "Unit", "Min", "Max", "Average", "Samples"]]
        for label, attr, unit in params:
            vals = [getattr(r, attr) for r in readings if getattr(r, attr) is not None]
            if vals:
                p_min = f"{min(vals):.2f}"
                p_max = f"{max(vals):.2f}"
                p_avg = f"{(sum(vals) / len(vals)):.2f}"
                p_cnt = str(len(vals))
            else:
                p_min = "N/A"
                p_max = "N/A"
                p_avg = "N/A"
                p_cnt = "0"
            param_table_data.append([label, unit, p_min, p_max, p_avg, p_cnt])

        t_params = Table(param_table_data, colWidths=[2.2*inch, 0.9*inch, 1.0*inch, 1.0*inch, 1.1*inch, 1.0*inch])
        t_params.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#0284C7')),
            ('TEXTCOLOR', (0,0), (-1,0), colors.white),
            ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
            ('FONTSIZE', (0,0), (-1,-1), 8.5),
            ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#E2E8F0')),
            ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor('#F8FAFC')]),
            ('PADDING', (0,0), (-1,-1), 4),
        ]))
        elements.append(t_params)
        elements.append(Spacer(1, 14))

        # Recent Alert Events
        elements.append(Paragraph("3. Alert & Incident Record", h2_style))
        if alerts:
            alert_rows = [["Time (UTC)", "Severity", "Parameter", "Observed", "Threshold", "Status"]]
            for a in alerts[:8]:  # show top 8 recent alerts
                alert_rows.append([
                    a.created_at.strftime('%m-%d %H:%M'),
                    a.severity.value,
                    a.parameter_name,
                    f"{a.observed_value:.2f} {a.unit}",
                    f"{a.threshold_value:.2f} {a.unit}",
                    a.status.value
                ])
            t_alerts = Table(alert_rows, colWidths=[1.1*inch, 0.9*inch, 1.6*inch, 1.2*inch, 1.2*inch, 1.2*inch])
            t_alerts.setStyle(TableStyle([
                ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#334155')),
                ('TEXTCOLOR', (0,0), (-1,0), colors.white),
                ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
                ('FONTSIZE', (0,0), (-1,-1), 8),
                ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#CBD5E1')),
                ('PADDING', (0,0), (-1,-1), 4),
            ]))
            elements.append(t_alerts)
        else:
            elements.append(Paragraph("No alerts recorded for this period. All readings complied with operational limits.", normal_style))
        elements.append(Spacer(1, 16))

        # Required Scientific Disclaimer
        elements.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor('#F59E0B'), spaceAfter=8))
        disclaimer_text = (
            "<b>IMPORTANT SCIENTIFIC & REGULATORY NOTICE:</b> "
            "This report is generated by AquaGuard IoT Automated Water Quality Monitoring System based on online "
            "physicochemical sensor telemetry (pH, Turbidity, DO, TDS, EC). Sensor measurements provide rapid, "
            "continuous operational screening but <b>DO NOT</b> constitute certification of microbiological potability, "
            "absence of pathogenic organisms (e.g. <i>E. coli</i>, coliforms, Giardia, Cryptosporidium), heavy metals "
            "(lead, arsenic, mercury), or hazardous organic compounds. Comprehensive drinking water certification requires "
            "standardized laboratory analytical procedures conducted by an accredited water testing laboratory."
        )
        elements.append(Paragraph(disclaimer_text, disclaimer_style))

        doc.build(elements)
        return filepath
