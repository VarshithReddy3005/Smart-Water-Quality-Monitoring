import React, { useState, useEffect } from 'react';
import { 
  Cpu, 
  Plus, 
  Wifi, 
  Battery, 
  Clock, 
  Key, 
  Trash2, 
  Copy, 
  Check, 
  AlertCircle, 
  ShieldCheck 
} from 'lucide-react';
import { api } from '../api/client';
import { Device, Station } from '../types';
import { StatusBadge } from '../components/common/StatusBadge';
import { SimulationBadge } from '../components/common/SimulationBadge';
import { Modal } from '../components/common/Modal';

export const DevicesPage: React.FC = () => {
  const [devices, setDevices] = useState<Device[]>([]);
  const [stations, setStations] = useState<Station[]>([]);
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [newDeviceKey, setNewDeviceKey] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);

  // Form State
  const [deviceName, setDeviceName] = useState('');
  const [deviceUid, setDeviceUid] = useState('');
  const [stationId, setStationId] = useState<number | null>(null);
  const [deviceType, setDeviceType] = useState('ESP32-AquaGuard');
  const [isSimulated, setIsSimulated] = useState(false);

  const fetchData = async () => {
    try {
      const [devs, stns] = await Promise.all([api.getDevices(), api.getStations()]);
      setDevices(devs);
      setStations(stns);
      if (stns.length > 0 && !stationId) setStationId(stns[0].id);
    } catch (err) {
      console.error("Failed to load devices/stations:", err);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleRegister = async () => {
    if (!deviceName || !deviceUid || !stationId) return;
    try {
      const result = await api.registerDevice({
        name: deviceName,
        device_uid: deviceUid,
        station_id: stationId,
        device_type: deviceType,
        is_simulated: isSimulated
      });

      setIsRegisterOpen(false);
      setNewDeviceKey(result.api_key || null);
      // Reset form
      setDeviceName('');
      setDeviceUid('');
      fetchData();
    } catch (err: any) {
      alert(`Device registration failed: ${err.message}`);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to deactivate and remove this device? Historical telemetry will be preserved.")) return;
    try {
      await api.deleteDevice(id);
      fetchData();
    } catch (err: any) {
      alert(`Deletion failed: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Cpu className="w-5 h-5 text-cyan-400" />
            IoT Fleet & Sensor Node Management
          </h2>
          <p className="text-xs text-slate-400">Provision ESP32 microcontrollers, calibrate probes, and monitor node connectivity heartbeats</p>
        </div>

        <button
          onClick={() => setIsRegisterOpen(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold transition shadow-lg shadow-cyan-900/30"
        >
          <Plus className="w-4 h-4" />
          Provision New Device
        </button>
      </div>

      {/* Fleet Table */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
        <h3 className="text-base font-bold text-white mb-4">Registered Hardware Fleet ({devices.length} Nodes)</h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-800 text-slate-400 uppercase tracking-wider font-semibold">
              <tr>
                <th className="py-3 px-3">Device Identity</th>
                <th className="py-3 px-3">Assigned Station</th>
                <th className="py-3 px-3">Type & Source</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3">Battery</th>
                <th className="py-3 px-3">Signal (RSSI)</th>
                <th className="py-3 px-3">Last Heartbeat</th>
                <th className="py-3 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {devices.map((d) => {
                const station = stations.find(s => s.id === d.station_id);
                return (
                  <tr key={d.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-3 px-3">
                      <div className="font-semibold text-white">{d.name}</div>
                      <div className="text-[11px] font-mono text-cyan-400">{d.device_uid}</div>
                    </td>
                    <td className="py-3 px-3 font-medium text-slate-300">
                      {station?.name || `Station #${d.station_id}`}
                    </td>
                    <td className="py-3 px-3">
                      <div className="text-slate-200">{d.device_type}</div>
                      <SimulationBadge isSimulated={d.is_simulated} className="mt-1" />
                    </td>
                    <td className="py-3 px-3">
                      <StatusBadge status={d.status} size="sm" />
                    </td>
                    <td className="py-3 px-3 font-medium">
                      {d.battery_level !== undefined && d.battery_level !== null ? (
                        <span className="flex items-center gap-1.5 text-emerald-400">
                          <Battery className="w-3.5 h-3.5" />
                          {d.battery_level.toFixed(0)}%
                        </span>
                      ) : '--'}
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-400">
                      {d.signal_strength_dbm !== undefined && d.signal_strength_dbm !== null ? (
                        <span className="flex items-center gap-1.5">
                          <Wifi className="w-3.5 h-3.5 text-cyan-400" />
                          {d.signal_strength_dbm.toFixed(0)} dBm
                        </span>
                      ) : '--'}
                    </td>
                    <td className="py-3 px-3 font-mono text-[11px] text-slate-400">
                      {d.last_heartbeat ? new Date(d.last_heartbeat).toLocaleTimeString() : 'Never'}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={() => handleDelete(d.id)}
                        title="Delete Device"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Provisioning Modal */}
      <Modal
        isOpen={isRegisterOpen}
        onClose={() => setIsRegisterOpen(false)}
        title="Provision IoT Monitoring Device"
      >
        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-400 block mb-1">Device Friendly Name</label>
            <input
              type="text"
              placeholder="e.g. Reservoir Intake North Node"
              value={deviceName}
              onChange={(e) => setDeviceName(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-400 block mb-1">Hardware UID (MAC or Serial)</label>
            <input
              type="text"
              placeholder="e.g. ESP32-AQ-008"
              value={deviceUid}
              onChange={(e) => setDeviceUid(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:outline-none focus:border-cyan-500 font-mono"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-400 block mb-1">Assigned Station</label>
              <select
                value={stationId || ''}
                onChange={(e) => setStationId(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:outline-none focus:border-cyan-500"
              >
                {stations.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-400 block mb-1">Microcontroller Platform</label>
              <select
                value={deviceType}
                onChange={(e) => setDeviceType(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:outline-none focus:border-cyan-500"
              >
                <option value="ESP32-AquaGuard">ESP32 DevKit v1</option>
                <option value="Arduino-MKR1010">Arduino MKR WiFi 1010</option>
                <option value="RaspberryPi-Gateway">Raspberry Pi Gateway</option>
                <option value="Simulated-Node">Simulated Telemetry Node</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2 p-3 rounded-xl bg-slate-950/80 border border-slate-800">
            <input
              type="checkbox"
              id="simCheck"
              checked={isSimulated}
              onChange={(e) => setIsSimulated(e.target.checked)}
              className="rounded bg-slate-900 border-slate-700 text-cyan-600 focus:ring-0"
            />
            <label htmlFor="simCheck" className="text-xs text-slate-300 cursor-pointer">
              Mark as synthetic / simulated node (will generate automated test telemetry)
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              onClick={() => setIsRegisterOpen(false)}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-medium transition"
            >
              Cancel
            </button>
            <button
              onClick={handleRegister}
              disabled={!deviceName || !deviceUid}
              className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold transition disabled:opacity-50"
            >
              Provision & Generate Secret Key
            </button>
          </div>
        </div>
      </Modal>

      {/* Secret API Key Display Modal */}
      <Modal
        isOpen={!!newDeviceKey}
        onClose={() => setNewDeviceKey(null)}
        title="Device Authentication Token"
      >
        <div className="space-y-4">
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-2.5">
            <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-200">
              <strong>IMPORTANT SECURITY NOTICE:</strong> This device secret key is displayed once and cannot be retrieved later. Copy it into your ESP32 / Arduino firmware sketch header (<code className="text-amber-300">DEVICE_TOKEN</code>).
            </p>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-400 block mb-1">Generated API Key</label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={newDeviceKey || ''}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-cyan-300 font-mono text-xs focus:outline-none"
              />
              <button
                onClick={() => {
                  navigator.clipboard.writeText(newDeviceKey || '');
                  setCopiedKey(true);
                  setTimeout(() => setCopiedKey(false), 2000);
                }}
                className="p-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white transition shrink-0"
              >
                {copiedKey ? <Check className="w-4 h-4 text-white" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="flex justify-end pt-3 border-t border-slate-800">
            <button
              onClick={() => setNewDeviceKey(null)}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-medium transition"
            >
              I Have Saved This Key
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
