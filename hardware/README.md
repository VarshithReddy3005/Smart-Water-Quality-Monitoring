# AquaGuard Hardware Integration Guide (ESP32 / Arduino)

This guide documents the physical hardware setup, pin connections, calibration procedures, and communication protocols for deploying real water quality monitoring nodes with the AquaGuard platform.

---

## 1. Bill of Materials (BOM)

| Component | Model / Spec | Purpose | Operating Voltage |
| :--- | :--- | :--- | :--- |
| **Microcontroller** | ESP32-WROOM-32 (NodeMCU / DevKit v1) | Processing & WiFi/MQTT Telemetry | 3.3V / 5V USB |
| **Water Temperature** | Dallas DS18B20 (Waterproof Stainless Probe) | Accurate temperature compensation | 3.3V – 5.0V |
| **pH Sensor** | DFRobot Gravity Analog pH Sensor (SEN0161) | Acidity / Alkalinity measurement | 5.0V (Signal divided to 3.3V) |
| **Turbidity Sensor** | DFRobot Gravity Turbidity Sensor (SEN0189) | Water cloudiness & suspended particles | 5.0V |
| **TDS Sensor** | DFRobot Gravity Analog TDS Sensor (SEN0244) | Total Dissolved Solids | 3.3V – 5.5V |
| **Resistor** | 4.7kΩ Resistor | Pull-up resistor for DS18B20 1-Wire bus | - |
| **Power Supply** | 5V 2A USB Adapter or 18650 Solar Battery Pack | Autonomous field deployment | 5V DC |

---

## 2. Wiring Schematic & Pinout Table

```
   +--------------------------------------------------------+
   |                     ESP32 DevKit                       |
   |                                                        |
   |   [GND] ----------------- Ground Rail (Common GND)     |
   |   [VIN / 5V] ------------ 5V Power Rail                |
   |   [3V3] ----------------- 3.3V Power Rail              |
   |                                                        |
   |   [GPIO 4]  <----------- DS18B20 Data (with 4.7kΩ PU)   |
   |   [GPIO 34] <----------- Analog pH Sensor Signal (AOUT)|
   |   [GPIO 35] <----------- Turbidity Sensor Signal (AOUT)|
   |   [GPIO 32] <----------- TDS Sensor Signal (AOUT)      |
   +--------------------------------------------------------+
```

### Complete Pin Connections

1. **DS18B20 Temperature Sensor**:
   - Red (VCC) $\rightarrow$ 3.3V or 5V
   - Black (GND) $\rightarrow$ GND
   - Yellow/White (Data) $\rightarrow$ ESP32 GPIO 4
   - *Place a 4.7kΩ resistor between VCC and Data line.*

2. **Analog pH Sensor (SEN0161)**:
   - VCC $\rightarrow$ 5V
   - GND $\rightarrow$ GND
   - Signal (AOUT) $\rightarrow$ ESP32 GPIO 34 (ADC1_CH6)

3. **Turbidity Sensor (SEN0189)**:
   - VCC $\rightarrow$ 5V
   - GND $\rightarrow$ GND
   - Signal (AOUT) $\rightarrow$ ESP32 GPIO 35 (ADC1_CH7)
   - *Set the adapter switch to 'A' (Analog output).*

4. **TDS Sensor (SEN0244)**:
   - VCC $\rightarrow$ 3.3V
   - GND $\rightarrow$ GND
   - Signal (AOUT) $\rightarrow$ ESP32 GPIO 32 (ADC1_CH4)

---

## 3. Sensor Calibration Procedure

### 3.1 pH Electrode Calibration
1. Clean the pH probe with distilled water.
2. Immerse the probe in **pH 7.0 buffer solution**. Stir gently and wait 60 seconds until readings stabilize.
3. Record the analog voltage in millivolts and set `pH_NeutralVoltage` in the sketch.
4. Rinse the probe, then immerse in **pH 4.0 buffer solution**. Record voltage and update `pH_AcidVoltage`.

### 3.2 Temperature Compensation for TDS
Water conductivity increases by approximately 2% per °C increase in temperature. The firmware automatically executes standard 25°C normalization:
$$V_{25^\circ C} = \frac{V_{measured}}{1.0 + 0.02 \times (T_{water} - 25.0)}$$

---

## 4. Telemetry Communication Protocols

### 4.1 MQTT Protocol (Default Primary)
- **Broker Host:** AquaGuard Server IP (e.g. `192.168.1.100` or cloud hostname)
- **Port:** `1883`
- **Telemetry Topic:** `aquaguard/devices/{DEVICE_UID}/readings`
- **Heartbeat Topic:** `aquaguard/devices/{DEVICE_UID}/heartbeat`

**Example JSON Payload:**
```json
{
  "station_id": 1,
  "device_uid": "ESP32-AQUA-01",
  "ph": 7.35,
  "turbidity_ntu": 1.2,
  "temperature_c": 21.4,
  "dissolved_oxygen_mg_l": 8.2,
  "tds_ppm": 215.0,
  "electrical_conductivity_us_cm": 335.4,
  "is_simulated": false
}
```

### 4.2 HTTP Ingestion API (Fallback)
If the device is on a cellular or firewalled network where port 1883 is closed, the firmware automatically sends an HTTP POST:
- **Endpoint:** `http://<SERVER_HOST>:8000/api/v1/sensors/ingest`
- **Method:** `POST`
- **Headers:**
  - `Content-Type: application/json`
  - `X-Device-Token: <GENERATED_API_KEY>`
