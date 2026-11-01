# AquaGuard – Smart Water Quality Monitoring and Management System

[![FastAPI](https://img.shields.io/badge/FastAPI-0.110+-009688.svg?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-18+-61DAFB.svg?logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.2+-3178C6.svg?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3.4+-38B2AC.svg?logo=tailwind-css&logoColor=white)](https://tailwindcss.com)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED.svg?logo=docker&logoColor=white)](https://www.docker.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

AquaGuard is an enterprise-grade, end-to-end full-stack IoT Water Quality Monitoring and Management System. Designed for water authorities, public health regulators, researchers, and industrial treatment facilities, the platform provides continuous physical-chemical telemetry ingestion, real-time threshold assessment against World Health Organization (WHO) and EPA standards, calculation of Brown's Weighted Arithmetic Water Quality Index (WAWQI), live WebSocket alerting, GIS spatial mapping, and customizable scenario simulations.

---

## 1. System Features

### 1.1 Responsive Enterprise Web Dashboard
- **Executive Overview:** High-level operational metrics (active stations, online sensors, sample counts, overall water quality health status, average pH, turbidity, dissolved oxygen, and TDS).
- **Live Monitoring Feed:** Sub-second WebSocket stream (`/ws/live`) with real-time radial gauges, sparklines, and 30-sample rolling time-series trends.
- **Water Quality Index (WQI) Engine:** Calculates Brown's Weighted Arithmetic WQI with step-by-step parameter weight breakdown, quality rating scales ($Q_i$), and sub-indices ($SI_i$).
- **Historical Telemetry Analytics:** Filter by station, time range (1h, 24h, 7d, 30d), and individual parameters with interactive Recharts graphs, statistical calculations (min, max, mean, standard deviation), and 1-click CSV export.
- **Incident Audit Trail & Alert Management:** Multi-tier threshold violation alarms (Normal, Warning, Critical) with full operator acknowledgment and resolution sign-off workflow.
- **Compliance Reporting:** Compiles formal PDF assessment documents (built with ReportLab) and raw CSV records containing station metadata, statistical ranges, alert logs, and official health disclaimers.
- **IoT Fleet & Device Provisioning:** Provision ESP32 microcontrollers, track battery levels, RSSI dBm signal strength, firmware revisions, and generate cryptographically secure device authentication keys.
- **Water Source Topography & GIS Map:** Interactive Leaflet OpenStreetMap view classifying Rivers, Lakes, Reservoirs, Groundwater aquifers, Municipal distribution systems, and Industrial outfalls.
- **Simulation Control Studio:** Dedicated control panel to pause, resume, adjust broadcast frequency (1s to 60s), and inject real-world contamination anomalies (Rainfall Runoff, Industrial Acid Spill, Eutrophic Algal Bloom, Sensor Drift).

---

## 2. Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | React 18, TypeScript, Tailwind CSS, Lucide Icons, Recharts, Leaflet & React-Leaflet, Vite |
| **Backend** | Python 3.11, FastAPI (ASGI), WebSockets, Pydantic v2, ReportLab, Pandas, NumPy |
| **Database** | PostgreSQL 16 (production) with automatic SQLite zero-config fallback |
| **IoT / Hardware** | ESP32, Arduino C++ firmware, DS18B20 (Temp), SEN0161 (pH), SEN0189 (Turbidity), SEN0244 (TDS) |
| **Protocols** | MQTT (Eclipse Mosquitto on port 1883), HTTP Ingestion API, WebSockets (`/ws/live`) |
| **DevOps** | Docker, Docker Compose, Nginx (Alpine) |

---

## 3. Quick Start (Local Development)

### 3.1 Prerequisites
- Python 3.11+
- Node.js v18+ and npm

### 3.2 One-Click Startup (PowerShell)
```powershell
.\start.ps1
```
This automatically seeds the database, launches the FastAPI backend on `http://127.0.0.1:8000`, and opens the Vite React dashboard on `http://localhost:5173`.

### 3.3 Manual Startup
#### Backend:
```powershell
$env:PYTHONPATH = "backend"
python backend\seed.py
uvicorn app.main:app --app-dir backend --host 127.0.0.1 --port 8000 --reload
```
#### Frontend:
```powershell
cd frontend
npm install
npm run dev
```

### 3.4 Pre-Seeded Default User Accounts
| Role | Email | Password | Permissions |
| :--- | :--- | :--- | :--- |
| **Administrator** | `admin@aquaguard.io` | `admin123` | Full access: provision devices, adjust regulatory limits, manage users, configure simulations |
| **Operator** | `operator@aquaguard.io` | `operator123` | Monitoring feed, acknowledge/resolve alerts, generate PDF/CSV reports |
| **Auditor / Viewer** | `viewer@aquaguard.io` | `viewer123` | Read-only dashboards and historical records |

---

## 4. Docker Compose Deployment

To deploy the entire production stack including PostgreSQL, Mosquitto MQTT Broker, FastAPI backend, and Nginx frontend in isolated containers:

```bash
# Build and start all 4 containers in background
docker compose up -d --build

# View container logs
docker compose logs -f

# Stop containers
docker compose down
```

Container Ports:
- **Web Dashboard:** `http://localhost:80`
- **FastAPI Core API & Docs:** `http://localhost:8000/docs`
- **MQTT Broker:** `localhost:1883`
- **PostgreSQL Database:** `localhost:5432`

---

## 5. IoT Hardware & ESP32 Integration

Complete production-ready C++ firmware is provided in [`hardware/esp32_aquaguard/esp32_aquaguard.ino`](hardware/esp32_aquaguard/esp32_aquaguard.ino).

### Pin Wiring Schematic
- **DS18B20 Temp Probe:** GPIO 4 (with 4.7kΩ pull-up resistor to 3.3V)
- **Gravity Analog pH Sensor (SEN0161):** GPIO 34 (ADC1_CH6)
- **Gravity Analog Turbidity Sensor (SEN0189):** GPIO 35 (ADC1_CH7)
- **Gravity Analog TDS Sensor (SEN0244):** GPIO 32 (ADC1_CH4)

### MQTT Telemetry Topic
`aquaguard/devices/{DEVICE_UID}/readings`

```json
{
  "station_id": 1,
  "device_uid": "ESP32-AQUA-01",
  "ph": 7.35,
  "turbidity_ntu": 1.25,
  "temperature_c": 21.4,
  "dissolved_oxygen_mg_l": 8.15,
  "tds_ppm": 210.0,
  "electrical_conductivity_us_cm": 328.0,
  "is_simulated": false
}
```

### HTTP Telemetry Fallback
`POST http://<SERVER_IP>:8000/api/v1/sensors/ingest`
- Header: `X-Device-Token: <GENERATED_API_KEY>`

---

## 6. Water Quality Index (WQI) Methodology

AquaGuard calculates **Brown's Weighted Arithmetic Water Quality Index (WAWQI)** (Brown et al., 1970/1972):

$$WQI = \frac{\sum (W_i \times Q_i)}{\sum W_i}$$

Where:
- **Quality Rating Scale ($Q_i$):**
  $$Q_i = \left| \frac{V_i - V_{ideal}}{S_i - V_{ideal}} \right| \times 100$$
- **Unit Weights ($W_i$):**
  $$W_i = \frac{K}{S_i}, \quad K = \frac{1}{\sum (1/S_i)}$$
- **Ideal Baselines ($V_{ideal}$):** pH = 7.0 (neutral), DO = 14.6 mg/L (saturation), TDS/Turbidity/EC = 0.0.

### Categorization Tiers
| Score Range | Category | Color | Status & Implication |
| :--- | :--- | :--- | :--- |
| **0 – 25** | Excellent | Emerald (`#10B981`) | Pristine water; suitable for domestic and ecological use |
| **26 – 50** | Good | Blue (`#3B82F6`) | Compliant with primary physicochemical guidelines |
| **51 – 75** | Poor | Amber (`#F59E0B`) | Degraded; conventional treatment/filtration required |
| **76 – 100** | Very Poor | Orange (`#F97316`) | Heavily impaired; strictly restricted utility |
| **> 100** | Unsuitable for Drinking | Red (`#EF4444`) | Severe contamination; fails standard health limits |

---

## 7. Mandatory Scientific Notice

> [!WARNING]
> **DRINKING WATER POTABILITY NOTICE:**
> Physical and electrochemical sensor readings (pH, Turbidity, TDS, DO, Electrical Conductivity) evaluate general physicochemical characteristics and surface water clarity. They **do not prove drinking water safety**. Potable water certification strictly requires accredited laboratory microbial assays (*E. coli*, coliforms, *Cryptosporidium*), heavy metal screening (lead, arsenic), and regulated pesticide residue analysis.

---

## 8. Automated Testing
Run the automated backend test suite:
```powershell
$pyPath = "$env:LOCALAPPDATA\Programs\python311\python.exe"
$env:PYTHONPATH = "backend"
& $pyPath -m pytest backend/tests -v
```
All 9 automated unit and integration tests verify authentication, sensor ingestion, threshold rules, Brown's WQI formulas, and PDF/CSV report generation.
