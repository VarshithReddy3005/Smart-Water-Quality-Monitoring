import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert, 
  HelpCircle, 
  CheckCircle2, 
  AlertTriangle, 
  Info, 
  BookOpen, 
  Scale, 
  Calculator 
} from 'lucide-react';
import { api } from '../api/client';
import { Station, WQIResult } from '../types';
import { SimulationBadge } from '../components/common/SimulationBadge';

export const WaterQualityAnalysis: React.FC = () => {
  const [stations, setStations] = useState<Station[]>([]);
  const [selectedStationId, setSelectedStationId] = useState<number | null>(null);
  const [wqi, setWqi] = useState<WQIResult | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function loadStations() {
      try {
        const list = await api.getStations();
        setStations(list);
        if (list.length > 0) {
          setSelectedStationId(list[0].id);
        }
      } catch (err) {
        console.error("Failed to load stations:", err);
      }
    }
    loadStations();
  }, []);

  useEffect(() => {
    if (!selectedStationId) return;
    async function fetchWQI() {
      setLoading(true);
      try {
        const res = await api.getStationWQI(selectedStationId!);
        setWqi(res);
      } catch (err) {
        console.error("Failed to fetch WQI:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchWQI();
  }, [selectedStationId]);

  const activeStation = stations.find(s => s.id === selectedStationId);

  return (
    <div className="space-y-6">
      {/* Top Banner: Mandatory Scientific Notice */}
      <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3">
        <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
        <div className="text-xs text-amber-200 leading-relaxed">
          <strong className="font-semibold text-amber-300 block mb-0.5">SCIENTIFIC & REGULATORY DISCLAIMER:</strong>
          Sensor telemetry and the Water Quality Index (WQI) provide operational screening of physical and chemical parameters. 
          Compliance with sensor thresholds does <strong>not</strong> prove that water is safe for drinking. 
          Official potable water certification strictly requires laboratory testing for microbiological pathogens (such as <em>E. coli</em>, coliforms), toxic heavy metals (lead, arsenic), and regulated chemicals.
        </div>
      </div>

      {/* Station Selector Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-2xl bg-slate-900/60 border border-slate-800">
        <div>
          <h2 className="text-lg font-bold text-white">Water Quality Assessment & WQI Engine</h2>
          <p className="text-xs text-slate-400">Evaluating multi-parameter telemetry against WHO and BIS regulatory standards</p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <label className="text-xs text-slate-400">Station:</label>
          <select
            value={selectedStationId || ''}
            onChange={(e) => setSelectedStationId(Number(e.target.value))}
            className="w-full sm:w-64 px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs font-medium focus:outline-none focus:border-cyan-500"
          >
            {stations.map(s => (
              <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
            ))}
          </select>
        </div>
      </div>

      {/* WQI Index Score Card & Gauge */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 flex flex-col justify-between text-center">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Calculated Index Score
            </span>

            {wqi?.is_available ? (
              <div className="my-6">
                <div 
                  className="inline-flex items-center justify-center w-32 h-32 rounded-full border-4 shadow-xl mx-auto"
                  style={{ borderColor: wqi.color, backgroundColor: `${wqi.color}15` }}
                >
                  <div>
                    <span className="text-4xl font-extrabold text-white tracking-tight">
                      {wqi.score?.toFixed(1)}
                    </span>
                    <span className="text-[11px] text-slate-400 block -mt-1">/ 100</span>
                  </div>
                </div>

                <div className="mt-4">
                  <span 
                    className="inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider text-white"
                    style={{ backgroundColor: wqi.color }}
                  >
                    {wqi.category}
                  </span>
                  <p className="text-xs text-slate-300 mt-2 max-w-xs mx-auto">
                    {wqi.description}
                  </p>
                </div>
              </div>
            ) : (
              <div className="my-10 p-6 rounded-xl border border-dashed border-slate-800 bg-slate-950/40">
                <AlertTriangle className="w-8 h-8 text-amber-400 mx-auto mb-2" />
                <h4 className="text-sm font-semibold text-white">WQI Unavailable</h4>
                <p className="text-xs text-slate-400 mt-1">
                  Water Quality Index unavailable – insufficient measurements.
                </p>
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-slate-800/80 text-[11px] text-slate-400">
            Methodology: <strong className="text-slate-200">Brown et al. Weighted Arithmetic</strong>
          </div>
        </div>

        {/* Contributing Parameter Weight Table */}
        <div className="lg:col-span-2 rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-white">Parameter Contributions & Sub-Indices</h3>
              <p className="text-xs text-slate-400">Step-by-step mathematical breakdown for Brown's WAWQI formulation</p>
            </div>
            <SimulationBadge isSimulated={true} />
          </div>

          {wqi?.contributing_parameters && wqi.contributing_parameters.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-800 text-slate-400 uppercase tracking-wider font-semibold">
                  <tr>
                    <th className="py-2.5 px-3">Parameter</th>
                    <th className="py-2.5 px-3">Measured ($V_i$)</th>
                    <th className="py-2.5 px-3">Standard ($S_i$)</th>
                    <th className="py-2.5 px-3">Unit Weight ($W_i$)</th>
                    <th className="py-2.5 px-3">Rating ($Q_i$)</th>
                    <th className="py-2.5 px-3">Sub-Index ($SI_i$)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {wqi.contributing_parameters.map((p, idx) => (
                    <tr key={idx} className="hover:bg-slate-800/40 transition">
                      <td className="py-2.5 px-3 font-medium text-white">{p.parameter}</td>
                      <td className="py-2.5 px-3 font-semibold">{p.observed_value} {p.unit}</td>
                      <td className="py-2.5 px-3 text-slate-400">{p.standard_limit} {p.unit}</td>
                      <td className="py-2.5 px-3 font-mono">{p.unit_weight.toFixed(4)}</td>
                      <td className="py-2.5 px-3 font-mono">{p.quality_rating.toFixed(1)}</td>
                      <td className="py-2.5 px-3 font-mono font-semibold text-cyan-400">{p.sub_index.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-12 text-center text-xs text-slate-500">
              No contributing parameters registered.
            </div>
          )}

          {wqi?.missing_parameters && wqi.missing_parameters.length > 0 && (
            <div className="mt-4 p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-slate-400 flex items-center gap-2">
              <Info className="w-4 h-4 text-slate-500 shrink-0" />
              <span>Missing parameters from standard index: <strong>{wqi.missing_parameters.join(', ')}</strong></span>
            </div>
          )}
        </div>
      </div>

      {/* Methodology & Formulas Documentation Card */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 space-y-4">
        <div className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-cyan-400" />
          <h3 className="text-base font-bold text-white">Mathematical Methodology Reference</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs text-slate-300 leading-relaxed">
          <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
            <h4 className="font-semibold text-white text-sm">Weighted Arithmetic Water Quality Index Formula</h4>
            <p>
              Originally formulated by <strong>Brown et al. (1970/1972)</strong> and recommended by the World Health Organization (WHO):
            </p>
            <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 font-mono text-cyan-300 text-center">
              WQI = &sum;(W_i &times; Q_i) / &sum;(W_i)
            </div>
            <ul className="list-disc list-inside space-y-1 text-slate-400 pt-1">
              <li><strong>Quality Rating Scale:</strong> Q_i = |(V_i - V_ideal) / (S_i - V_ideal)| &times; 100</li>
              <li><strong>Proportionality Constant:</strong> K = 1 / &sum;(1 / S_i)</li>
              <li><strong>Unit Weights:</strong> W_i = K / S_i</li>
              <li><strong>Ideal Value (V_ideal):</strong> pH = 7.0, DO = 14.6 mg/L, others = 0.0</li>
            </ul>
          </div>

          <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
            <h4 className="font-semibold text-white text-sm">Classification Benchmark Tiers</h4>
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-800 text-slate-400">
                <tr>
                  <th className="py-1">Score Range</th>
                  <th className="py-1">Classification</th>
                  <th className="py-1">Usage Implication</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                <tr><td className="py-1 font-mono text-emerald-400">0 – 25</td><td className="font-semibold">Excellent</td><td>Domestic, ecological, and industrial baseline</td></tr>
                <tr><td className="py-1 font-mono text-blue-400">26 – 50</td><td className="font-semibold">Good</td><td>Permissible for conventional treatment</td></tr>
                <tr><td className="py-1 font-mono text-amber-400">51 – 75</td><td className="font-semibold">Poor</td><td>High suspended solids; requires extensive filtration</td></tr>
                <tr><td className="py-1 font-mono text-orange-400">76 – 100</td><td className="font-semibold">Very Poor</td><td>Impaired; severely restricted utility</td></tr>
                <tr><td className="py-1 font-mono text-rose-400">&gt; 100</td><td className="font-semibold">Unsuitable</td><td>Hazardous contamination; failed health guidelines</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
