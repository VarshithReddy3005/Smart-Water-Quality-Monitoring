const API_BASE = '/api/v1';

export function getAuthToken(): string | null {
  return localStorage.getItem('aquaguard_token');
}

export function setAuthToken(token: string) {
  localStorage.setItem('aquaguard_token', token);
}

export function removeAuthToken() {
  localStorage.removeItem('aquaguard_token');
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    let errorDetail = 'An error occurred';
    try {
      const errJson = await res.json();
      errorDetail = errJson.detail || errorDetail;
    } catch {
      errorDetail = res.statusText || errorDetail;
    }
    throw new Error(errorDetail);
  }

  return res.json();
}

export const api = {
  // Auth
  login: (data: any) => request<any>('/auth/login', { method: 'POST', body: JSON.stringify(data) }),
  register: (data: any) => request<any>('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
  getMe: () => request<any>('/auth/me'),

  // Dashboard & Readings
  getDashboardSummary: () => request<any>('/readings/dashboard-summary'),
  getReadings: (params: string = '') => request<any[]>(`/readings${params ? `?${params}` : ''}`),
  getLatestReadings: (stationId?: number) => request<any[]>(`/readings/latest${stationId ? `?station_id=${stationId}` : ''}`),
  getReadingStats: (stationId: number, range: string = '24h') => request<any>(`/readings/stats?station_id=${stationId}&time_range=${range}`),

  // Stations
  getStations: () => request<any[]>('/stations'),
  getStation: (id: number) => request<any>(`/stations/${id}`),
  createStation: (data: any) => request<any>('/stations', { method: 'POST', body: JSON.stringify(data) }),
  updateStation: (id: number, data: any) => request<any>(`/stations/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteStation: (id: number) => request<any>(`/stations/${id}`, { method: 'DELETE' }),

  // Devices
  getDevices: (stationId?: number) => request<any[]>(`/devices${stationId ? `?station_id=${stationId}` : ''}`),
  registerDevice: (data: any) => request<any>('/devices', { method: 'POST', body: JSON.stringify(data) }),
  updateDevice: (id: number, data: any) => request<any>(`/devices/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteDevice: (id: number) => request<any>(`/devices/${id}`, { method: 'DELETE' }),

  // Alerts
  getAlerts: (params: string = '') => request<any[]>(`/alerts${params ? `?${params}` : ''}`),
  acknowledgeAlert: (id: number, by: string) => request<any>(`/alerts/${id}/acknowledge`, { method: 'POST', body: JSON.stringify({ acknowledged_by: by }) }),
  resolveAlert: (id: number, by: string, notes: string) => request<any>(`/alerts/${id}/resolve`, { method: 'POST', body: JSON.stringify({ resolved_by: by, resolution_notes: notes }) }),

  // WQI
  getStationWQI: (stationId: number) => request<any>(`/wqi/station/${stationId}`),
  calculateCustomWQI: (data: any) => request<any>('/wqi/calculate', { method: 'POST', body: JSON.stringify(data) }),

  // Simulation
  getSimulationStatus: () => request<any>('/simulation/status'),
  getScenarios: () => request<any[]>('/simulation/scenarios'),
  controlSimulation: (data: any) => request<any>('/simulation/control', { method: 'POST', body: JSON.stringify(data) }),

  // Reports
  getReports: () => request<any[]>('/reports'),
  generateReport: (data: any) => request<any>('/reports/generate', { method: 'POST', body: JSON.stringify(data) }),

  // Users & Thresholds
  getUsers: () => request<any[]>('/users'),
  createUser: (data: any) => request<any>('/users', { method: 'POST', body: JSON.stringify(data) }),
  getThresholds: () => request<any[]>('/assessments/thresholds'),
  updateThreshold: (id: number, data: any) => request<any>(`/assessments/thresholds/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
};
