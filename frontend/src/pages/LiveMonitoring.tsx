import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  RefreshCw, 
  Radio, 
  MapPin, 
  Clock, 
  TrendingUp, 
  Info, 
  SlidersHorizontal 
} from 'lucide-react';
import { api } from '../api/client';
import { Station, SensorReading } from '../types';
import { LiveGauge } from '../components/charts/LiveGauge';
import { ParameterHistoryChart } from '../components/charts/ParameterHistoryChart';
import { StatusBadge } from '../components/common/StatusBadge';
import { SimulationBadge } from '../components/common/SimulationBadge';
import { useWebSocket } from '../context/WebSocketContext';

export const LiveMonitoring: React.FC = () => {
  const [stations, setStations] = useState<Station[]>([]);
  const [selectedStationId, setSelectedStationId] = useState<number | null>(null);
  const [currentReading, setCurrentReading] = useState<SensorReading | null>(null);
  const [history, setHistory] = useState<SensorReading[]>([]);
  const [activeParam, setActiveParam] = useState<string>('ph');

  const { latestReading, isConnected } = useWebSocket();

  // Load initial stations
  useEffect(() => {
    async function init() {
      try {
        const stns = await api.getStations();
        setStations(stns);
        if (stns.length > 0) {
          setSelectedStationId(stns[0].id);
        }
      } catch (err) {
        console.error("Failed to load stations:", err);
      }
    }
    init();
  }, []);

  // Fetch initial telemetry when station selected
  useEffect(() => {
    if (!selectedStationId) return;
    async function loadStationData() {
      try {
        const [latestRes, historyRes] = await Promise.all([
          api.getLatestReadings(selectedStationId!),
          api.getReadings(`station_id=${selectedStationId}&limit=30`)
        ]);
        if (latestRes.length > 0) {
          setCurrentReading(latestRes[0]);
        }
        setHistory(historyRes);
      } catch (err) {
        console.error("Failed to load telemetry:", err);
      }
    }
    loadStationData();
  }, [selectedStationId]);

  // Handle incoming live WebSocket updates
  useEffect(() => {
    if (latestReading && selectedStationId && latestReading.station_id === selectedStationId) {
      setCurrentReading(latestReading);
      setHistory(prev => [...prev.slice(-29), latestReading]);
    }
  }, [latestReading, selectedStationId]);

  const activeStation = stations.find(s => s.id === selectedStationId);

  return (
    <div className="space-y-6">
      {/* Station Selector Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-2xl bg-slate-900/60 border border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
            <Radio className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              Live Station Telemetry Feed
              <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'}`} />
            </h2>
            <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
              <MapPin className="w-3.5 h-3.5 text-slate-500" />
              <span>{activeStation?.address || 'Monitoring Location'}</span>
              <span>•</span>
              <span className="font-mono">{activeStation?.code}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <label className="text-xs text-slate-400 whitespace-nowrap">Switch Station:</label>
          <select
            value={selectedStationId || ''}
            onChange={(e) => setSelectedStationId(Number(e.target.value))}
            className="w-full sm:w-64 px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs font-medium focus:outline-none focus:border-cyan-500"
          >
            {stations.map(s => (
              <option key={s.id} value={s.id}>{s.name} ({s.water_source_type})</option>
            ))}
          </select>
        </div>
      </div>

      {/* Status Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl bg-slate-900/40 border border-slate-800/80">
        <div className="flex items-center gap-3">
          <StatusBadge status={currentReading?.quality_status || 'NORMAL'} />
          <SimulationBadge isSimulated={currentReading?.is_simulated ?? true} />
        </div>
        <div className="flex items-center gap-4 text-xs text-slate-400">
          <div className="flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-slate-500" />
            <span>Latest Transmission: </span>
            <strong className="text-white font-mono">
              {currentReading?.timestamp ? new Date(currentReading.timestamp).toLocaleTimeString() : '--:--:--'}
            </strong>
          </div>
          <span>•</span>
          <div>
            <span>WQI Index: </span>
            <strong className="text-cyan-400 font-semibold">{currentReading?.wqi_score?.toFixed(1) || '--'}</strong>
            <span className="text-slate-400 ml-1">({currentReading?.wqi_category || 'Evaluating'})</span>
          </div>
        </div>
      </div>

      {/* 6 Primary Real-Time Gauges */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <LiveGauge
          title="pH Level"
          value={currentReading?.ph}
          unit="pH"
          min={0}
          max={14}
          normalMin={6.5}
          normalMax={8.5}
          status={currentReading?.ph && (currentReading.ph < 6.5 || currentReading.ph > 8.5) ? 'WARNING' : 'NORMAL'}
        />
        <LiveGauge
          title="Turbidity"
          value={currentReading?.turbidity_ntu}
          unit="NTU"
          min={0}
          max={50}
          normalMin={0}
          normalMax={5}
          status={currentReading?.turbidity_ntu && currentReading.turbidity_ntu > 5.0 ? 'WARNING' : 'NORMAL'}
        />
        <LiveGauge
          title="Dissolved O₂"
          value={currentReading?.dissolved_oxygen_mg_l}
          unit="mg/L"
          min={0}
          max={15}
          normalMin={6.5}
          normalMax={14}
          status={currentReading?.dissolved_oxygen_mg_l && currentReading.dissolved_oxygen_mg_l < 5.0 ? 'CRITICAL' : 'NORMAL'}
        />
        <LiveGauge
          title="TDS Solids"
          value={currentReading?.tds_ppm}
          unit="ppm"
          min={0}
          max={1200}
          normalMin={0}
          normalMax={500}
          status={currentReading?.tds_ppm && currentReading.tds_ppm > 500 ? 'WARNING' : 'NORMAL'}
        />
        <LiveGauge
          title="Conductivity"
          value={currentReading?.electrical_conductivity_us_cm}
          unit="µS/cm"
          min={0}
          max={2500}
          normalMin={0}
          normalMax={800}
          status={currentReading?.electrical_conductivity_us_cm && currentReading.electrical_conductivity_us_cm > 800 ? 'WARNING' : 'NORMAL'}
        />
        <LiveGauge
          title="Temperature"
          value={currentReading?.temperature_c}
          unit="°C"
          min={0}
          max={45}
          normalMin={10}
          normalMax={25}
          status={currentReading?.temperature_c && currentReading.temperature_c > 28 ? 'WARNING' : 'NORMAL'}
        />
      </div>

      {/* Dynamic Real-Time Chart with Parameter Switcher */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-cyan-400" />
            Live Rolling Trend Window (Last 30 Samples)
          </h3>
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-900 border border-slate-800">
            {[
              { id: 'ph', label: 'pH', unit: 'pH' },
              { id: 'turbidity_ntu', label: 'Turbidity', unit: 'NTU' },
              { id: 'dissolved_oxygen_mg_l', label: 'DO', unit: 'mg/L' },
              { id: 'tds_ppm', label: 'TDS', unit: 'ppm' },
              { id: 'electrical_conductivity_us_cm', label: 'Conductivity', unit: 'µS/cm' },
              { id: 'temperature_c', label: 'Temp', unit: '°C' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveParam(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  activeParam === tab.id
                    ? 'bg-cyan-600 text-white shadow-md shadow-cyan-900/30'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <ParameterHistoryChart
          data={history}
          parameterKey={activeParam}
          parameterName={activeParam === 'ph' ? 'pH' : activeParam === 'turbidity_ntu' ? 'Turbidity' : activeParam === 'dissolved_oxygen_mg_l' ? 'Dissolved Oxygen' : activeParam === 'tds_ppm' ? 'TDS' : activeParam === 'electrical_conductivity_us_cm' ? 'Conductivity' : 'Temperature'}
          unit={activeParam === 'ph' ? 'pH' : activeParam === 'turbidity_ntu' ? 'NTU' : activeParam === 'dissolved_oxygen_mg_l' ? 'mg/L' : activeParam === 'tds_ppm' ? 'ppm' : activeParam === 'electrical_conductivity_us_cm' ? 'µS/cm' : '°C'}
          standardMin={activeParam === 'ph' ? 6.5 : activeParam === 'dissolved_oxygen_mg_l' ? 6.5 : undefined}
          standardMax={activeParam === 'ph' ? 8.5 : activeParam === 'turbidity_ntu' ? 5.0 : activeParam === 'tds_ppm' ? 500 : undefined}
          height={320}
        />
      </div>

      {/* Additional Monitored Secondary Parameters */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
        <h4 className="text-sm font-semibold text-white mb-3">Auxiliary Monitored Parameters</h4>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
            <span className="text-slate-500 block">ORP (Redox)</span>
            <strong className="text-base text-white">{currentReading?.orp_mv ? `${currentReading.orp_mv} mV` : '--'}</strong>
          </div>
          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
            <span className="text-slate-500 block">Salinity</span>
            <strong className="text-base text-white">{currentReading?.salinity_ppt ? `${currentReading.salinity_ppt} ppt` : '--'}</strong>
          </div>
          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
            <span className="text-slate-500 block">Water Level</span>
            <strong className="text-base text-white">{currentReading?.water_level_m ? `${currentReading.water_level_m} m` : '--'}</strong>
          </div>
          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
            <span className="text-slate-500 block">Ammonia (NH₃)</span>
            <strong className="text-base text-white">{currentReading?.ammonia_mg_l ? `${currentReading.ammonia_mg_l} mg/L` : '--'}</strong>
          </div>
          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
            <span className="text-slate-500 block">Nitrate (NO₃)</span>
            <strong className="text-base text-white">{currentReading?.nitrate_mg_l ? `${currentReading.nitrate_mg_l} mg/L` : '--'}</strong>
          </div>
          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
            <span className="text-slate-500 block">Free Chlorine</span>
            <strong className="text-base text-white">{currentReading?.chlorine_mg_l ? `${currentReading.chlorine_mg_l} mg/L` : '--'}</strong>
          </div>
        </div>
      </div>
    </div>
  );
};
