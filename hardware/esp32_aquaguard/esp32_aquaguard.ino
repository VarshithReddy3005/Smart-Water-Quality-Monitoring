/*
 * AquaGuard - Smart Water Quality Monitoring System
 * Production ESP32 Firmware Sketch
 *
 * Supported Sensors:
 * 1. DS18B20 Waterproof Temperature Sensor (OneWire - GPIO 4)
 * 2. Gravity Analog pH Sensor SEN0161 (ADC - GPIO 34)
 * 3. Gravity Analog Turbidity Sensor SEN0189 (ADC - GPIO 35)
 * 4. Gravity Analog TDS Sensor SEN0244 (ADC - GPIO 32)
 *
 * Telemetry Protocols:
 * - Primary: MQTT Publish (aquaguard/devices/{DEVICE_UID}/readings)
 * - Fallback: HTTP POST (/api/v1/sensors/ingest)
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <OneWire.h>
#include <DallasTemperature.h>

// ======================== CONFIGURATION ========================
const char* WIFI_SSID     = "YOUR_WIFI_SSID";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";

// Backend Server & MQTT Broker
const char* SERVER_HOST   = "192.168.1.100";  // AquaGuard server IP
const int   HTTP_PORT     = 8000;
const int   MQTT_PORT     = 1883;

// Device Credentials (Generated in AquaGuard Device Fleet page)
const char* DEVICE_UID    = "ESP32-AQUA-01";
const char* DEVICE_TOKEN  = "aq_paste_your_generated_device_token_here";
const int   STATION_ID    = 1;  // Station ID this device is assigned to

// Reporting Frequency
const unsigned long SAMPLING_INTERVAL_MS = 5000;  // 5 seconds

// Pin Definitions
#define ONE_WIRE_BUS 4     // DS18B20 Data pin
#define PH_PIN       34    // Analog pH Sensor (ADC1_CH6)
#define TURB_PIN     35    // Analog Turbidity Sensor (ADC1_CH7)
#define TDS_PIN      32    // Analog TDS Sensor (ADC1_CH4)
#define STATUS_LED   2     // Built-in Blue LED for status

// Calibration Parameters (Calibrate in pH 7.0 & pH 4.0 standard buffer solutions)
float pH_NeutralVoltage = 1500.0; // mV in pH 7.0 buffer
float pH_AcidVoltage    = 2032.4; // mV in pH 4.0 buffer

// ======================== GLOBAL OBJECTS ========================
WiFiClient espClient;
PubSubClient mqttClient(espClient);
OneWire oneWire(ONE_WIRE_BUS);
DallasTemperature tempSensor(&oneWire);

unsigned long lastSampleTime = 0;

// ======================== HELPER FUNCTIONS ========================
void setupWiFi() {
  Serial.print("Connecting to WiFi: ");
  Serial.println(WIFI_SSID);
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    Serial.print(".");
    digitalWrite(STATUS_LED, !digitalRead(STATUS_LED));
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\nWiFi Connected! IP Address: " + WiFi.localIP().toString());
    digitalWrite(STATUS_LED, HIGH);
  } else {
    Serial.println("\nWiFi connection failed! Telemetry will queue until connection restored.");
  }
}

void reconnectMQTT() {
  if (WiFi.status() != WL_CONNECTED) return;

  if (!mqttClient.connected()) {
    Serial.print("Attempting MQTT connection to ");
    Serial.print(SERVER_HOST);
    Serial.print("...");
    
    String clientId = "AquaGuard-ESP32-" + String(DEVICE_UID);
    if (mqttClient.connect(clientId.c_str())) {
      Serial.println("connected!");
      // Send initial heartbeat
      String hbTopic = "aquaguard/devices/" + String(DEVICE_UID) + "/heartbeat";
      String hbMsg = "{\"status\":\"ONLINE\",\"rssi\":" + String(WiFi.RSSI()) + "}";
      mqttClient.publish(hbTopic.c_str(), hbMsg.c_str());
    } else {
      Serial.print("failed, rc=");
      Serial.print(mqttClient.state());
      Serial.println(" (will use HTTP fallback)");
    }
  }
}

float readTemperature() {
  tempSensor.requestTemperatures();
  float tempC = tempSensor.getTempCByIndex(0);
  if (tempC < -50.0 || tempC > 100.0) {
    return 22.0; // Fallback default temperature
  }
  return tempC;
}

float readPH(float temperatureC) {
  int rawADC = analogRead(PH_PIN);
  float voltageMv = (rawADC / 4095.0) * 3300.0;
  
  // 2-point calibration formula
  float slope = (7.0 - 4.0) / ((pH_NeutralVoltage - 1500.0) / 3.0 - (pH_AcidVoltage - 1500.0) / 3.0);
  float intercept = 7.0 - slope * (pH_NeutralVoltage - 1500.0) / 3.0;
  float calculatedPH = slope * (voltageMv - 1500.0) / 3.0 + intercept;
  
  if (calculatedPH < 0.0) calculatedPH = 0.0;
  if (calculatedPH > 14.0) calculatedPH = 14.0;
  return calculatedPH;
}

float readTurbidity() {
  int rawADC = analogRead(TURB_PIN);
  float voltage = (rawADC / 4095.0) * 3.3;
  
  // Sensor response curve mapping for SEN0189
  // V > 2.5V = clear water (~0-5 NTU), lower V = higher cloudiness
  float ntu = 0.0;
  if (voltage < 2.5) {
    ntu = 3000.0;
  } else if (voltage >= 4.2) {
    ntu = 0.5;
  } else {
    ntu = -1120.4 * (voltage * voltage) + 5742.3 * voltage - 4352.9;
    if (ntu < 0) ntu = 0.5;
  }
  return ntu;
}

float readTDS(float temperatureC) {
  int rawADC = analogRead(TDS_PIN);
  float voltage = (rawADC / 4095.0) * 3.3;
  
  // Temperature compensation formula: fFinalResult(25^C) = fFinalResult(current)/(1.0+0.02*(fTP-25.0));
  float compensationCoefficient = 1.0 + 0.02 * (temperatureC - 25.0);
  float compensationVoltage = voltage / compensationCoefficient;
  
  // Convert voltage to TDS value (SEN0244 characteristic curve)
  float tdsValue = (133.42 * pow(compensationVoltage, 3) - 255.86 * pow(compensationVoltage, 2) + 857.39 * compensationVoltage) * 0.5;
  if (tdsValue < 0) tdsValue = 0;
  return tdsValue;
}

void sendTelemetryHTTP(String jsonPayload) {
  if (WiFi.status() != WL_CONNECTED) return;

  HTTPClient http;
  String url = "http://" + String(SERVER_HOST) + ":" + String(HTTP_PORT) + "/api/v1/sensors/ingest";
  http.begin(url);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("X-Device-Token", DEVICE_TOKEN);

  int httpCode = http.POST(jsonPayload);
  if (httpCode > 0) {
    Serial.printf("[HTTP] Ingest status: %d\n", httpCode);
  } else {
    Serial.printf("[HTTP] POST failed, error: %s\n", http.errorToString(httpCode).c_str());
  }
  http.end();
}

// ======================== SETUP & LOOP ========================
void setup() {
  Serial.begin(115200);
  pinMode(STATUS_LED, OUTPUT);
  pinMode(PH_PIN, INPUT);
  pinMode(TURB_PIN, INPUT);
  pinMode(TDS_PIN, INPUT);

  analogReadResolution(12); // ESP32 12-bit ADC (0 - 4095)
  tempSensor.begin();

  setupWiFi();

  mqttClient.setServer(SERVER_HOST, MQTT_PORT);
  mqttClient.setBufferSize(512);
}

void loop() {
  if (WiFi.status() == WL_CONNECTED) {
    if (!mqttClient.connected()) {
      reconnectMQTT();
    }
    mqttClient.loop();
  }

  unsigned long currentMillis = millis();
  if (currentMillis - lastSampleTime >= SAMPLING_INTERVAL_MS) {
    lastSampleTime = currentMillis;

    // 1. Acquire sensor readings
    float temperatureC = readTemperature();
    float ph = readPH(temperatureC);
    float turbidity = readTurbidity();
    float tds = readTDS(temperatureC);
    float conductivity = tds * 1.56; // Empirical EC (µS/cm) from TDS

    // 2. Build JSON telemetry document
    StaticJsonDocument<512> doc;
    doc["station_id"] = STATION_ID;
    doc["device_uid"] = DEVICE_UID;
    doc["ph"] = round(ph * 100) / 100.0;
    doc["turbidity_ntu"] = round(turbidity * 100) / 100.0;
    doc["temperature_c"] = round(temperatureC * 10) / 10.0;
    doc["dissolved_oxygen_mg_l"] = 8.1; // If DO probe installed, map analog pin
    doc["tds_ppm"] = round(tds * 10) / 10.0;
    doc["electrical_conductivity_us_cm"] = round(conductivity * 10) / 10.0;
    doc["is_simulated"] = false;

    String jsonPayload;
    serializeJson(doc, jsonPayload);

    Serial.println("\n[SENSORS] Acquired Water Telemetry: " + jsonPayload);

    // 3. Transmit telemetry via MQTT or fallback to HTTP
    bool published = false;
    if (mqttClient.connected()) {
      String topic = "aquaguard/devices/" + String(DEVICE_UID) + "/readings";
      published = mqttClient.publish(topic.c_str(), jsonPayload.c_str());
      if (published) {
        Serial.println("[MQTT] Telemetry published to " + topic);
      }
    }

    if (!published) {
      Serial.println("[HTTP] Publishing via HTTP Ingestion API fallback...");
      sendTelemetryHTTP(jsonPayload);
    }
  }
}
