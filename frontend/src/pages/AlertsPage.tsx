import React, { useState, useEffect } from 'react';
import { 
  AlertTriangle, 
  CheckCircle, 
  Filter, 
  Clock, 
  MessageSquare, 
  ShieldCheck, 
  CheckCircle2, 
  X 
} from 'lucide-react';
import { api } from '../api/client';
import { Alert, AlertStatus, AlertSeverity } from '../types';
import { StatusBadge } from '../components/common/StatusBadge';
import { Modal } from '../components/common/Modal';
import { useAuth } from '../context/AuthContext';
import { useWebSocket } from '../context/WebSocketContext';

export const AlertsPage: React.FC = () => {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [severityFilter, setSeverityFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [selectedAlertForResolve, setSelectedAlertForResolve] = useState<Alert | null>(null);
  const [resolveNotes, setResolveNotes] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const { user } = useAuth();
  const { recentAlerts } = useWebSocket();

  const fetchAlerts = async () => {
    setLoading(true);
    try {
      let q = [];
      if (severityFilter) q.push(`severity=${severityFilter}`);
      if (statusFilter) q.push(`status_filter=${statusFilter}`);
      q.push('limit=100');
      const data = await api.getAlerts(q.join('&'));
      setAlerts(data);
    } catch (err) {
      console.error("Failed to load alerts:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, [severityFilter, statusFilter]);

  // Prepend live alert updates from WebSocket
  useEffect(() => {
    if (recentAlerts.length > 0) {
      fetchAlerts();
    }
  }, [recentAlerts]);

  const handleAcknowledge = async (id: number) => {
    try {
      await api.acknowledgeAlert(id, user?.full_name || 'Operator');
      fetchAlerts();
    } catch (err: any) {
      alert(`Error acknowledging alert: ${err.message}`);
    }
  };

  const handleResolve = async () => {
    if (!selectedAlertForResolve) return;
    try {
      await api.resolveAlert(selectedAlertForResolve.id, user?.full_name || 'Operator', resolveNotes);
      setSelectedAlertForResolve(null);
      setResolveNotes('');
      fetchAlerts();
    } catch (err: any) {
      alert(`Error resolving alert: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Filter Controls */}
      <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-400" />
            Alert Incident Audit Trail & Management
          </h2>
          <p className="text-xs text-slate-400">Track and acknowledge automated threshold violations across all monitored water bodies</p>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Severity filter */}
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs font-medium focus:outline-none focus:border-cyan-500"
          >
            <option value="">All Severities</option>
            <option value="CRITICAL">Critical</option>
            <option value="WARNING">Warning</option>
            <option value="INFO">Info</option>
          </select>

          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs font-medium focus:outline-none focus:border-cyan-500"
          >
            <option value="">All States</option>
            <option value="ACTIVE">Active Incidents</option>
            <option value="ACKNOWLEDGED">Acknowledged</option>
            <option value="RESOLVED">Resolved</option>
          </select>

          <button
            onClick={fetchAlerts}
            className="px-3 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold transition shadow-md shadow-cyan-900/30"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Alerts List Table */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-800 text-slate-400 uppercase tracking-wider font-semibold">
              <tr>
                <th className="py-3 px-3">Severity</th>
                <th className="py-3 px-3">Station</th>
                <th className="py-3 px-3">Parameter & Values</th>
                <th className="py-3 px-3">Description & Trigger Reason</th>
                <th className="py-3 px-3">Timestamp</th>
                <th className="py-3 px-3">State</th>
                <th className="py-3 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {alerts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    No matching alert incidents found.
                  </td>
                </tr>
              ) : (
                alerts.map((alt) => (
                  <tr key={alt.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-3 px-3">
                      <StatusBadge status={alt.severity} size="sm" />
                    </td>
                    <td className="py-3 px-3 font-semibold text-white whitespace-nowrap">
                      {alt.station_name || `Station #${alt.station_id}`}
                    </td>
                    <td className="py-3 px-3">
                      <div className="font-medium text-white">{alt.parameter_name}</div>
                      <div className="text-[11px] text-slate-400">
                        Observed: <strong className="text-rose-400">{alt.observed_value.toFixed(2)} {alt.unit}</strong> (Limit: {alt.threshold_value.toFixed(2)} {alt.unit})
                      </div>
                    </td>
                    <td className="py-3 px-3 max-w-xs text-slate-300">
                      {alt.message}
                      {alt.resolution_notes && (
                        <div className="text-[10px] text-emerald-400 mt-1 italic">
                          Resolution: {alt.resolution_notes}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-3 font-mono text-[11px] text-slate-400 whitespace-nowrap">
                      {new Date(alt.created_at).toLocaleString()}
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        alt.status === 'ACTIVE'
                          ? 'bg-rose-950 text-rose-300 border border-rose-800'
                          : alt.status === 'ACKNOWLEDGED'
                          ? 'bg-amber-950 text-amber-300 border border-amber-800'
                          : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                      }`}>
                        {alt.status}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right whitespace-nowrap">
                      {alt.status === 'ACTIVE' && (
                        <button
                          onClick={() => handleAcknowledge(alt.id)}
                          className="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-medium text-xs mr-2 transition"
                        >
                          Acknowledge
                        </button>
                      )}
                      {alt.status !== 'RESOLVED' && (
                        <button
                          onClick={() => {
                            setSelectedAlertForResolve(alt);
                            setResolveNotes('');
                          }}
                          className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs transition"
                        >
                          Resolve
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Resolution Modal */}
      <Modal
        isOpen={!!selectedAlertForResolve}
        onClose={() => setSelectedAlertForResolve(null)}
        title="Resolve Water Quality Incident"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-300">
            Please log corrective actions taken (e.g. chemical dosing adjustments, filter backwash, valve closing) to resolve this alert on <strong>{selectedAlertForResolve?.station_name}</strong>.
          </p>

          <div>
            <label className="text-xs font-semibold text-slate-400 block mb-1.5">Corrective Action Notes:</label>
            <textarea
              value={resolveNotes}
              onChange={(e) => setResolveNotes(e.target.value)}
              placeholder="e.g., Initiated flocculant dosing cycle and cleaned sensor glass probe. Turbidity returned to normal levels."
              rows={4}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              onClick={() => setSelectedAlertForResolve(null)}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-medium transition"
            >
              Cancel
            </button>
            <button
              onClick={handleResolve}
              disabled={!resolveNotes.trim()}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition disabled:opacity-50"
            >
              Mark Incident Resolved
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
