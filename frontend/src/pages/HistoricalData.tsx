import React, { useState, useEffect } from 'react';
import { 
  History, 
  Download, 
  Calendar, 
  Filter, 
  TrendingUp, 
  Layers 
} from 'lucide-react';
import { api } from '../api/client';
import { Station, SensorReading } from '../types';
import { ParameterHistoryChart } from '../components/charts/ParameterHistoryChart';
import { SimulationBadge } from '../components/common/SimulationBadge';

export const HistoricalData: React.FC = () => {
  const [stations, setStations] = useState<Station[]>([]);
  const [selectedStationId, setSelectedStationId] = useState<number | null>(null);
  const [timeRange, setTimeRange] = useState<string>('24h');
  const [activeParam, setActiveParam] = useState<string>('ph');
  const [readings, setReadings] = useState<SensorReading[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function loadStations() {
      try {
        const list = await api.getStations();
        setStations(list);
        if (list.length > 0) setSelectedStationId(list[0].id);
      } catch (err) {
        console.error("Failed to load stations:", err);
      }
    }
    loadStations();
  }, []);

  useEffect(() => {
    if (!selectedStationId) return;
    async function fetchData() {
      setLoading(true);
      try {
        const [rds, st] = await Promise.all([
          api.getReadings(`station_id=${selectedStationId}&time_range=${timeRange}&limit=200`),
          api.getReadingStats(selectedStationId, timeRange)
        ]);
        setReadings(rds);
        setStats(st);
      } catch (err) {
        console.error("Failed to load historical data:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [selectedStationId, timeRange]);

  const activeStation = stations.find(s => s.id === selectedStationId);

  const handleExportCSV = () => {
    if (readings.length === 0) return;
    const headers = ["Timestamp", "Station Code", "Station Name", "Source", "Is Simulated", "pH", "Turbidity (NTU)", "DO (mg/L)", "TDS (ppm)", "EC (uS/cm)", "Temp (C)", "Status"];
    const rows = readings.map(r => [
      r.timestamp,
      activeStation?.code || '',
      activeStation?.name || '',
      activeStation?.water_source_type || '',
      r.is_simulated ? "YES" : "NO",
      r.ph ?? '',
      r.turbidity_ntu ?? '',
      r.dissolved_oxygen_mg_l ?? '',
      r.tds_ppm ?? '',
      r.electrical_conductivity_us_cm ?? '',
      r.temperature_c ?? '',
      r.quality_status || 'NORMAL'
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `aquaguard_history_${activeStation?.code}_${timeRange}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const paramConfig: Record<string, { name: string; unit: string; color: string }> = {
    ph: { name: 'pH', unit: 'pH', color: '#0ea5e9' },
    turbidity_ntu: { name: 'Turbidity', unit: 'NTU', color: '#f59e0b' },
    dissolved_oxygen_mg_l: { name: 'Dissolved Oxygen', unit: 'mg/L', color: '#10b981' },
    tds_ppm: { name: 'Total Dissolved Solids', unit: 'ppm', color: '#8b5cf6' },
    electrical_conductivity_us_cm: { name: 'Electrical Conductivity', unit: 'µS/cm', color: '#ec4899' },
    temperature_c: { name: 'Temperature', unit: '°C', color: '#f97316' }
  };

  const currentParamInfo = paramConfig[activeParam] || paramConfig.ph;
  const currentStat = stats?.parameters?.[activeParam];

  return (
    <div className="space-y-6">
      {/* Filter Header Bar */}
      <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <History className="w-5 h-5 text-cyan-400" />
            Historical Telemetry & Analytics
          </h2>
          <p className="text-xs text-slate-400">Query time-series measurements across stations and arbitrary date windows</p>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Station dropdown */}
          <select
            value={selectedStationId || ''}
            onChange={(e) => setSelectedStationId(Number(e.target.value))}
            className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs font-medium focus:outline-none focus:border-cyan-500"
          >
            {stations.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>

          {/* Time range pills */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-950 border border-slate-800">
            {['1h', '24h', '7d', '30d'].map(range => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold uppercase transition ${
                  timeRange === range
                    ? 'bg-cyan-600 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {range}
              </button>
            ))}
          </div>

          {/* Export CSV button */}
          <button
            onClick={handleExportCSV}
            disabled={readings.length === 0}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-medium border border-slate-700 transition disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Parameter Stats Summary Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/40">
          <span className="text-xs font-medium text-slate-400">Total Samples In Window</span>
          <div className="text-2xl font-bold text-white mt-1">{readings.length}</div>
          <span className="text-[11px] text-slate-500">Interval: {timeRange}</span>
        </div>
        <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/40">
          <span className="text-xs font-medium text-slate-400">Minimum {currentParamInfo.name}</span>
          <div className="text-2xl font-bold text-cyan-400 mt-1">
            {currentStat?.min !== undefined ? currentStat.min : '--'} <span className="text-xs font-normal text-slate-400">{currentParamInfo.unit}</span>
          </div>
          <span className="text-[11px] text-slate-500">Lowest observed</span>
        </div>
        <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/40">
          <span className="text-xs font-medium text-slate-400">Maximum {currentParamInfo.name}</span>
          <div className="text-2xl font-bold text-rose-400 mt-1">
            {currentStat?.max !== undefined ? currentStat.max : '--'} <span className="text-xs font-normal text-slate-400">{currentParamInfo.unit}</span>
          </div>
          <span className="text-[11px] text-slate-500">Peak observed</span>
        </div>
        <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/40">
          <span className="text-xs font-medium text-slate-400">Average {currentParamInfo.name}</span>
          <div className="text-2xl font-bold text-emerald-400 mt-1">
            {currentStat?.avg !== undefined ? currentStat.avg : '--'} <span className="text-xs font-normal text-slate-400">{currentParamInfo.unit}</span>
          </div>
          <span className="text-[11px] text-slate-500">Arithmetic mean</span>
        </div>
      </div>

      {/* Historical Time-Series Chart */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">Select Parameter:</span>
            <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-xl bg-slate-900 border border-slate-800">
              {Object.keys(paramConfig).map(pKey => (
                <button
                  key={pKey}
                  onClick={() => setActiveParam(pKey)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                    activeParam === pKey
                      ? 'bg-cyan-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {paramConfig[pKey].name}
                </button>
              ))}
            </div>
          </div>
          <SimulationBadge isSimulated={true} />
        </div>

        <ParameterHistoryChart
          data={readings}
          parameterKey={activeParam}
          parameterName={currentParamInfo.name}
          unit={currentParamInfo.unit}
          color={currentParamInfo.color}
          height={340}
        />
      </div>

      {/* Data Table */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
        <h4 className="text-sm font-semibold text-white mb-3">Raw Observation Records</h4>
        <div className="overflow-x-auto max-h-96">
          <table className="w-full text-left text-xs">
            <thead className="sticky top-0 bg-slate-900 border-b border-slate-800 text-slate-400 uppercase tracking-wider font-semibold z-10">
              <tr>
                <th className="py-2.5 px-3">Timestamp (UTC)</th>
                <th className="py-2.5 px-3">pH</th>
                <th className="py-2.5 px-3">Turbidity (NTU)</th>
                <th className="py-2.5 px-3">DO (mg/L)</th>
                <th className="py-2.5 px-3">TDS (ppm)</th>
                <th className="py-2.5 px-3">EC (µS/cm)</th>
                <th className="py-2.5 px-3">Temp (°C)</th>
                <th className="py-2.5 px-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {readings.map(r => (
                <tr key={r.id} className="hover:bg-slate-800/40 transition">
                  <td className="py-2.5 px-3 font-mono text-[11px] text-slate-400">
                    {new Date(r.timestamp).toLocaleString()}
                  </td>
                  <td className="py-2.5 px-3 font-semibold">{r.ph?.toFixed(2) || '--'}</td>
                  <td className="py-2.5 px-3">{r.turbidity_ntu?.toFixed(2) || '--'}</td>
                  <td className="py-2.5 px-3">{r.dissolved_oxygen_mg_l?.toFixed(2) || '--'}</td>
                  <td className="py-2.5 px-3">{r.tds_ppm?.toFixed(0) || '--'}</td>
                  <td className="py-2.5 px-3">{r.electrical_conductivity_us_cm?.toFixed(0) || '--'}</td>
                  <td className="py-2.5 px-3">{r.temperature_c?.toFixed(1) || '--'}</td>
                  <td className="py-2.5 px-3 font-medium text-emerald-400">{r.quality_status || 'NORMAL'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
