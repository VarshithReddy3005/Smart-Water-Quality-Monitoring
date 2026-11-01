export type WaterSourceType = 
  | 'RIVER' 
  | 'LAKE' 
  | 'RESERVOIR' 
  | 'GROUNDWATER' 
  | 'BOREWELL' 
  | 'DRINKING_WATER' 
  | 'INDUSTRIAL' 
  | 'WASTEWATER';

export type QualityStatus = 'NORMAL' | 'WARNING' | 'CRITICAL';
export type AlertSeverity = 'INFO' | 'WARNING' | 'CRITICAL';
export type AlertStatus = 'ACTIVE' | 'ACKNOWLEDGED' | 'RESOLVED';
export type UserRole = 'ADMINISTRATOR' | 'OPERATOR' | 'VIEWER';
export type DeviceStatus = 'ONLINE' | 'OFFLINE' | 'MAINTENANCE' | 'ERROR';

export interface User {
  id: number;
  email: string;
  full_name: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
  last_login?: string;
}

export interface SensorReading {
  id: number;
  station_id: number;
  station_name?: string;
  station_code?: string;
  device_id?: number;
  timestamp: string;
  is_simulated: boolean;
  quality_status: QualityStatus;
  wqi_score?: number;
  wqi_category?: string;
  
  // Primary parameters
  ph?: number;
  turbidity_ntu?: number;
  temperature_c?: number;
  dissolved_oxygen_mg_l?: number;
  tds_ppm?: number;
  electrical_conductivity_us_cm?: number;

  // Additional parameters
  orp_mv?: number;
  salinity_ppt?: number;
  water_level_m?: number;
  flow_rate_l_min?: number;
  ammonia_mg_l?: number;
  nitrate_mg_l?: number;
  chlorine_mg_l?: number;
}

export interface Station {
  id: number;
  name: string;
  code: string;
  water_source_type: WaterSourceType;
  latitude: number;
  longitude: number;
  elevation_m?: number;
  address?: string;
  description?: string;
  status: 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE';
  created_at: string;
  device_count: number;
  active_alerts_count: number;
  latest_reading?: SensorReading;
}

export interface Device {
  id: number;
  device_uid: string;
  name: string;
  station_id: number;
  device_type: string;
  firmware_version: string;
  status: DeviceStatus;
  battery_level?: number;
  signal_strength_dbm?: number;
  is_simulated: boolean;
  last_heartbeat?: string;
  created_at: string;
  api_key?: string;
}

export interface Alert {
  id: number;
  station_id: number;
  station_name?: string;
  reading_id?: number;
  parameter_name: string;
  observed_value: number;
  threshold_value: number;
  unit: string;
  severity: AlertSeverity;
  status: AlertStatus;
  message: string;
  created_at: string;
  acknowledged_at?: string;
  acknowledged_by?: string;
  resolved_at?: string;
  resolved_by?: string;
  resolution_notes?: string;
}

export interface ParameterContribution {
  parameter: string;
  observed_value: number;
  ideal_value: number;
  standard_limit: number;
  unit_weight: number;
  quality_rating: number;
  sub_index: number;
  unit: string;
}

export interface WQIResult {
  is_available: boolean;
  methodology: string;
  score?: number;
  category?: string;
  color?: string;
  description?: string;
  contributing_parameters: ParameterContribution[];
  missing_parameters: string[];
  disclaimer: string;
}

export interface DashboardSummary {
  total_stations: number;
  active_stations: number;
  total_devices: number;
  active_devices: number;
  offline_devices: number;
  total_samples: number;
  active_alerts: number;
  critical_alerts: number;
  overall_water_status: QualityStatus;
  averages: {
    ph?: number;
    turbidity_ntu?: number;
    dissolved_oxygen_mg_l?: number;
    tds_ppm?: number;
    wqi_score?: number;
  };
}

export interface SimulationConfig {
  is_running: boolean;
  interval_seconds: number;
  active_scenario: string;
  readings_generated_total: number;
  watermark: string;
}

export interface Scenario {
  id: string;
  name: string;
  description: string;
  impact: string;
}
