import React, { useState, useEffect } from 'react';
import { 
  Play, 
  Pause, 
  Square, 
  RotateCcw, 
  Sliders, 
  Cpu, 
  Zap, 
  AlertTriangle, 
  CheckCircle2, 
  ShieldAlert 
} from 'lucide-react';
import { api } from '../api/client';
import { SimulationConfig, Scenario } from '../types';
import { SimulationBadge } from '../components/common/SimulationBadge';

export const SimulationControlPage: React.FC = () => {
  const [config, setConfig] = useState<SimulationConfig | null>(null);
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [interval, setIntervalVal] = useState<number>(3);
  const [loading, setLoading] = useState(false);

  const fetchStatus = async () => {
    try {
      const [st, sc] = await Promise.all([
        api.getSimulationStatus(),
        api.getScenarios()
      ]);
      setConfig(st);
      setIntervalVal(st.interval_seconds);
      setScenarios(sc);
    } catch (err) {
      console.error("Failed to load simulation status:", err);
    }
  };

  useEffect(() => {
    fetchStatus();
    const timer = setInterval(fetchStatus, 4000);
    return () => clearInterval(timer);
  }, []);

  const handleAction = async (action: string, scenario?: string) => {
    setLoading(true);
    try {
      const updated = await api.controlSimulation({
        action,
        interval_seconds: interval,
        scenario
      });
      setConfig(updated);
    } catch (err: any) {
      alert(`Simulation action failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3">
        <Cpu className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
        <div className="text-xs text-amber-200 leading-relaxed">
          <strong className="font-semibold text-amber-300 block mb-0.5">SIMULATION WORKER STATUS:</strong>
          AquaGuard provides an integrated synthetic telemetry engine capable of simulating diurnal environmental oscillations, sensor noise, and emergency environmental pollution events for hardware-free demonstration.
          All simulated telemetry is permanently watermarked with <strong>"SIMULATED DATA – NOT REAL SENSOR MEASUREMENTS"</strong>.
        </div>
      </div>

      {/* Main Control Panel */}
      <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Zap className="w-5 h-5 text-cyan-400" />
              Interactive Simulation Engine
            </h2>
            <p className="text-xs text-slate-400">Control frequency and inject environmental anomalies in real-time</p>
          </div>

          <div className="flex items-center gap-2">
            {config?.is_running ? (
              <button
                onClick={() => handleAction('pause')}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs transition shadow-md shadow-amber-900/30"
              >
                <Pause className="w-4 h-4" />
                Pause Simulation
              </button>
            ) : (
              <button
                onClick={() => handleAction('resume')}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition shadow-md shadow-emerald-900/30"
              >
                <Play className="w-4 h-4" />
                Resume Simulation
              </button>
            )}

            <button
              onClick={() => handleAction('stop')}
              className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-rose-400 font-semibold text-xs border border-slate-700 transition"
            >
              <Square className="w-4 h-4" />
              Stop
            </button>
          </div>
        </div>

        {/* Telemetry Interval Slider */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
          <div className="md:col-span-2 space-y-2">
            <div className="flex justify-between text-xs">
              <span className="font-semibold text-slate-300">Broadcast Frequency Interval:</span>
              <strong className="text-cyan-400 font-mono text-sm">{interval} seconds</strong>
            </div>
            <input
              type="range"
              min="1"
              max="20"
              value={interval}
              onChange={(e) => setIntervalVal(Number(e.target.value))}
              onMouseUp={() => handleAction('set_interval')}
              onTouchEnd={() => handleAction('set_interval')}
              className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
            />
            <div className="flex justify-between text-[10px] text-slate-500">
              <span>Rapid (1s)</span>
              <span>Nominal (5s)</span>
              <span>Periodic (20s)</span>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800">
            <span className="text-xs text-slate-400 block">Total Generated Telemetry Samples:</span>
            <span className="text-2xl font-bold font-mono text-white mt-1 block">
              {config?.readings_generated_total || 0}
            </span>
            <span className="text-[10px] text-slate-500">Distributed across all active stations</span>
          </div>
        </div>
      </div>

      {/* Scenario Injection Cards */}
      <div className="space-y-4">
        <div>
          <h3 className="text-base font-bold text-white">Environmental Scenario & Anomaly Injections</h3>
          <p className="text-xs text-slate-400">Trigger simulated real-world contamination events to observe threshold alerts and WQI calculations</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {scenarios.map((sc) => {
            const isActive = config?.active_scenario === sc.id;
            return (
              <div 
                key={sc.id}
                className={`p-5 rounded-2xl border transition-all flex flex-col justify-between ${
                  isActive
                    ? 'border-cyan-500 bg-cyan-950/20 shadow-lg shadow-cyan-950/40 ring-1 ring-cyan-500'
                    : 'border-slate-800 bg-slate-900/60 hover:border-slate-700'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold text-white text-sm">{sc.name}</h4>
                    {isActive && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-500 text-slate-950 animate-pulse">
                        ACTIVE
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed mb-3">{sc.description}</p>
                  <div className="text-[11px] text-amber-300 bg-amber-500/10 border border-amber-500/20 p-2.5 rounded-xl mb-4">
                    <strong>Impact:</strong> {sc.impact}
                  </div>
                </div>

                <button
                  onClick={() => handleAction('set_scenario', sc.id)}
                  disabled={isActive}
                  className={`w-full py-2 rounded-xl font-semibold text-xs transition ${
                    isActive
                      ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                      : 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-md shadow-cyan-900/30'
                  }`}
                >
                  {isActive ? 'Currently Active' : 'Inject Scenario'}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
