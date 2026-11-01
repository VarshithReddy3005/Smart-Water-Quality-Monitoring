import React, { useEffect, useState } from 'react';
import { 
  Activity, 
  Droplet, 
  Waves, 
  AlertTriangle, 
  Cpu, 
  CheckCircle2, 
  TrendingUp, 
  ShieldCheck, 
  ExternalLink 
} from 'lucide-react';
import { api } from '../api/client';
import { DashboardSummary, Station, Alert, SensorReading } from '../types';
import { MetricCard } from '../components/common/MetricCard';
import { StatusBadge } from '../components/common/StatusBadge';
import { SimulationBadge } from '../components/common/SimulationBadge';
import { StationMap } from '../components/map/StationMap';
import { useWebSocket } from '../context/WebSocketContext';

interface DashboardProps {
  onNavigate: (page: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [stations, setStations] = useState<Station[]>([]);
  const [recentAlerts, setRecentAlerts] = useState<Alert[]>([]);
  const [recentReadings, setRecentReadings] = useState<SensorReading[]>([]);
  const [loading, setLoading] = useState(true);

  const { latestReading } = useWebSocket();

  useEffect(() => {
    async function loadData() {
      try {
        const [sumRes, stnRes, altRes, rdsRes] = await Promise.all([
          api.getDashboardSummary(),
          api.getStations(),
          api.getAlerts('limit=5'),
          api.getReadings('limit=8')
        ]);
        setSummary(sumRes);
        setStations(stnRes);
        setRecentAlerts(altRes);
        setRecentReadings(rdsRes);
      } catch (err) {
        console.error("Dashboard data fetch failed:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Update readings on live WebSocket stream
  useEffect(() => {
    if (latestReading) {
      setRecentReadings(prev => [latestReading, ...prev.slice(0, 7)]);
      // Refresh summary numbers
      api.getDashboardSummary().then(setSummary).catch(() => {});
    }
  }, [latestReading]);

  return (
    <div className="space-y-6">
      {/* Simulation Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30">
        <div className="flex items-center gap-3">
          <SimulationBadge isSimulated={true} />
          <span className="text-xs text-amber-200">
            System running in dual mode. Physical IoT sensors and simulated stations are clearly distinguished.
          </span>
        </div>
        <button
          onClick={() => onNavigate('simulation')}
          className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 transition shrink-0"
        >
          Configure Scenarios
        </button>
      </div>

      {/* Primary KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Overall Water Quality"
          value={summary?.overall_water_status || 'NORMAL'}
          icon={ShieldCheck}
          color={summary?.overall_water_status === 'CRITICAL' ? 'rose' : summary?.overall_water_status === 'WARNING' ? 'amber' : 'emerald'}
          subtitle={summary?.critical_alerts ? `${summary.critical_alerts} critical alerts active` : "Parameters within standards"}
          onClick={() => onNavigate('analysis')}
        />
        <MetricCard
          title="Monitoring Stations"
          value={summary?.total_stations || 0}
          unit="Stations"
          icon={Waves}
          color="blue"
          subtitle={`${summary?.active_stations || 0} operational`}
          onClick={() => onNavigate('sources')}
        />
        <MetricCard
          title="Active IoT Sensors"
          value={summary?.active_devices || 0}
          unit={`/ ${summary?.total_devices || 0}`}
          icon={Cpu}
          color="cyan"
          subtitle={`${summary?.offline_devices || 0} offline nodes`}
          onClick={() => onNavigate('devices')}
        />
        <MetricCard
          title="Active Alerts"
          value={summary?.active_alerts || 0}
          icon={AlertTriangle}
          color={summary?.active_alerts ? 'amber' : 'emerald'}
          subtitle="Real-time threshold triggers"
          onClick={() => onNavigate('alerts')}
        />
      </div>

      {/* Secondary Physicochemical Average Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/40">
          <span className="text-xs font-medium text-slate-400">Average pH</span>
          <div className="text-2xl font-bold text-white mt-1">
            {summary?.averages.ph ? summary.averages.ph.toFixed(2) : '--'}
          </div>
          <span className="text-[11px] text-emerald-400">WHO target: 6.5 - 8.5</span>
        </div>
        <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/40">
          <span className="text-xs font-medium text-slate-400">Average Turbidity</span>
          <div className="text-2xl font-bold text-white mt-1">
            {summary?.averages.turbidity_ntu ? summary.averages.turbidity_ntu.toFixed(2) : '--'} <span className="text-xs text-slate-400 font-normal">NTU</span>
          </div>
          <span className="text-[11px] text-cyan-400">EPA limit: &lt; 5.0 NTU</span>
        </div>
        <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/40">
          <span className="text-xs font-medium text-slate-400">Dissolved Oxygen</span>
          <div className="text-2xl font-bold text-white mt-1">
            {summary?.averages.dissolved_oxygen_mg_l ? summary.averages.dissolved_oxygen_mg_l.toFixed(2) : '--'} <span className="text-xs text-slate-400 font-normal">mg/L</span>
          </div>
          <span className="text-[11px] text-blue-400">Healthy: &gt; 6.5 mg/L</span>
        </div>
        <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/40">
          <span className="text-xs font-medium text-slate-400">Avg TDS</span>
          <div className="text-2xl font-bold text-white mt-1">
            {summary?.averages.tds_ppm ? summary.averages.tds_ppm.toFixed(0) : '--'} <span className="text-xs text-slate-400 font-normal">ppm</span>
          </div>
          <span className="text-[11px] text-slate-400">Permissible: &lt; 500 ppm</span>
        </div>
      </div>

      {/* Map & Live Stream Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Geospatial Map */}
        <div className="lg:col-span-2 rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-white">Geospatial Station Health</h3>
              <p className="text-xs text-slate-400">Interactive OpenStreetMap view with real-time status pins</p>
            </div>
            <button 
              onClick={() => onNavigate('sources')}
              className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-medium"
            >
              All Sources <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>
          <StationMap stations={stations} onSelectStation={() => onNavigate('live')} />
        </div>

        {/* Active Critical Alerts Card */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                Latest Alerts
              </h3>
              <button 
                onClick={() => onNavigate('alerts')}
                className="text-xs text-cyan-400 hover:text-cyan-300 font-medium"
              >
                Manage
              </button>
            </div>

            <div className="space-y-3 overflow-y-auto max-h-[300px]">
              {recentAlerts.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-500">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500/60 mx-auto mb-2" />
                  All stations operating within normal regulatory standards.
                </div>
              ) : (
                recentAlerts.map((alt) => (
                  <div key={alt.id} className="p-3 rounded-xl border border-slate-800 bg-slate-950/60">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-semibold text-white">{alt.station_name}</span>
                      <StatusBadge status={alt.severity} size="sm" />
                    </div>
                    <p className="text-xs text-slate-300 mt-1 line-clamp-2">{alt.message}</p>
                    <div className="text-[10px] text-slate-500 mt-2">
                      {new Date(alt.created_at).toLocaleString()}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800/80 flex justify-between items-center text-xs text-slate-400">
            <span>Critical alerts require operator sign-off</span>
            <button
              onClick={() => onNavigate('alerts')}
              className="text-cyan-400 font-medium hover:underline"
            >
              View incident log &rarr;
            </button>
          </div>
        </div>
      </div>

      {/* Recent Telemetry Stream Table */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-white">Live Telemetry Ingestion Activity</h3>
            <p className="text-xs text-slate-400">Incoming measurements from physical IoT microcontrollers and simulation worker</p>
          </div>
          <button 
            onClick={() => onNavigate('historical')}
            className="text-xs text-cyan-400 hover:text-cyan-300 font-medium"
          >
            Full History &rarr;
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-800 text-slate-400 uppercase tracking-wider font-semibold">
              <tr>
                <th className="py-3 px-3">Timestamp</th>
                <th className="py-3 px-3">Station</th>
                <th className="py-3 px-3">Data Source</th>
                <th className="py-3 px-3">pH</th>
                <th className="py-3 px-3">Turbidity</th>
                <th className="py-3 px-3">DO</th>
                <th className="py-3 px-3">TDS</th>
                <th className="py-3 px-3">EC</th>
                <th className="py-3 px-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {recentReadings.map((r) => (
                <tr key={r.id} className="hover:bg-slate-800/40 transition">
                  <td className="py-2.5 px-3 font-mono text-[11px] text-slate-400">
                    {new Date(r.timestamp).toLocaleTimeString()}
                  </td>
                  <td className="py-2.5 px-3 font-medium text-white">
                    {r.station_name || `Station #${r.station_id}`}
                  </td>
                  <td className="py-2.5 px-3">
                    <SimulationBadge isSimulated={r.is_simulated} />
                  </td>
                  <td className="py-2.5 px-3 font-semibold">{r.ph?.toFixed(2) || '--'}</td>
                  <td className="py-2.5 px-3">{r.turbidity_ntu ? `${r.turbidity_ntu.toFixed(2)} NTU` : '--'}</td>
                  <td className="py-2.5 px-3">{r.dissolved_oxygen_mg_l ? `${r.dissolved_oxygen_mg_l.toFixed(2)} mg/L` : '--'}</td>
                  <td className="py-2.5 px-3">{r.tds_ppm ? `${r.tds_ppm.toFixed(0)} ppm` : '--'}</td>
                  <td className="py-2.5 px-3">{r.electrical_conductivity_us_cm ? `${r.electrical_conductivity_us_cm.toFixed(0)} µS/cm` : '--'}</td>
                  <td className="py-2.5 px-3">
                    <StatusBadge status={r.quality_status || 'NORMAL'} size="sm" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
