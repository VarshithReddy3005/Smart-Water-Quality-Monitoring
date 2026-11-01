import React, { useState, useEffect } from 'react';
import { 
  Waves, 
  Plus, 
  MapPin, 
  ExternalLink, 
  Layers, 
  Compass, 
  CheckCircle, 
  AlertTriangle 
} from 'lucide-react';
import { api } from '../api/client';
import { Station, WaterSourceType } from '../types';
import { StationMap } from '../components/map/StationMap';
import { StatusBadge } from '../components/common/StatusBadge';
import { Modal } from '../components/common/Modal';

export const WaterSourcesPage: React.FC = () => {
  const [stations, setStations] = useState<Station[]>([]);
  const [selectedStation, setSelectedStation] = useState<Station | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [sourceType, setSourceType] = useState<WaterSourceType>('RESERVOIR');
  const [lat, setLat] = useState<number>(40.7128);
  const [lng, setLng] = useState<number>(-74.0060);
  const [address, setAddress] = useState('');
  const [desc, setDesc] = useState('');

  const fetchStations = async () => {
    try {
      const data = await api.getStations();
      setStations(data);
      if (data.length > 0 && !selectedStation) setSelectedStation(data[0]);
    } catch (err) {
      console.error("Failed to load stations:", err);
    }
  };

  useEffect(() => {
    fetchStations();
  }, []);

  const handleCreate = async () => {
    if (!name || !code) return;
    try {
      await api.createStation({
        name,
        code,
        water_source_type: sourceType,
        latitude: lat,
        longitude: lng,
        address,
        description: desc,
        status: 'ACTIVE'
      });
      setIsModalOpen(false);
      setName('');
      setCode('');
      fetchStations();
    } catch (err: any) {
      alert(`Creation failed: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Waves className="w-5 h-5 text-cyan-400" />
            Water Source Topography & GIS Map
          </h2>
          <p className="text-xs text-slate-400">Classify rivers, reservoirs, deep aquifers, treatment facilities, and industrial drainage</p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold transition shadow-lg shadow-cyan-900/30"
        >
          <Plus className="w-4 h-4" />
          Register Water Source
        </button>
      </div>

      {/* Geospatial Map Container */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-white">Geospatial Distribution Overview</span>
          <span className="text-xs text-slate-400">Click any pin to inspect water source data</span>
        </div>
        <StationMap 
          stations={stations} 
          onSelectStation={(s) => setSelectedStation(s)}
          selectedStationId={selectedStation?.id}
          height="400px" 
        />
      </div>

      {/* Water Sources Table */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
        <h3 className="text-base font-bold text-white mb-4">Monitored Water Bodies Directory</h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-800 text-slate-400 uppercase tracking-wider font-semibold">
              <tr>
                <th className="py-3 px-3">Water Source Name</th>
                <th className="py-3 px-3">Type</th>
                <th className="py-3 px-3">Coordinates (Lat, Lng)</th>
                <th className="py-3 px-3">Installed Devices</th>
                <th className="py-3 px-3">Latest pH / Turbidity</th>
                <th className="py-3 px-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {stations.map((s) => (
                <tr 
                  key={s.id} 
                  onClick={() => setSelectedStation(s)}
                  className={`hover:bg-slate-800/40 transition cursor-pointer ${selectedStation?.id === s.id ? 'bg-cyan-950/20' : ''}`}
                >
                  <td className="py-3 px-3">
                    <div className="font-semibold text-white">{s.name}</div>
                    <div className="text-[11px] text-slate-400">{s.address || s.code}</div>
                  </td>
                  <td className="py-3 px-3">
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-cyan-300 border border-slate-700">
                      {s.water_source_type}
                    </span>
                  </td>
                  <td className="py-3 px-3 font-mono text-[11px] text-slate-400">
                    {s.latitude.toFixed(4)}, {s.longitude.toFixed(4)}
                  </td>
                  <td className="py-3 px-3 font-medium text-slate-300">
                    {s.device_count} nodes
                  </td>
                  <td className="py-3 px-3">
                    {s.latest_reading ? (
                      <div>
                        <span className="font-semibold text-white">{s.latest_reading.ph?.toFixed(2)} pH</span>
                        <span className="text-slate-400 ml-2">/ {s.latest_reading.turbidity_ntu?.toFixed(1)} NTU</span>
                      </div>
                    ) : (
                      <span className="text-slate-500">No data</span>
                    )}
                  </td>
                  <td className="py-3 px-3">
                    <StatusBadge status={s.status} size="sm" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Registration Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Register Water Source / Monitoring Station"
      >
        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-400 block mb-1">Source Name</label>
            <input
              type="text"
              placeholder="e.g. Upper Hudson Freshwater Basin"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-400 block mb-1">Unique Station Code</label>
              <input
                type="text"
                placeholder="e.g. STN-RV-09"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:outline-none focus:border-cyan-500 font-mono"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-400 block mb-1">Water Source Classification</label>
              <select
                value={sourceType}
                onChange={(e) => setSourceType(e.target.value as any)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:outline-none focus:border-cyan-500"
              >
                <option value="DRINKING_WATER">Drinking Water Distribution</option>
                <option value="RESERVOIR">Reservoir / Dam Basin</option>
                <option value="RIVER">River / Stream</option>
                <option value="LAKE">Lake / Pond</option>
                <option value="GROUNDWATER">Groundwater / Well</option>
                <option value="BOREWELL">Borewell</option>
                <option value="INDUSTRIAL">Industrial Effluent</option>
                <option value="WASTEWATER">Wastewater Treatment</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-400 block mb-1">Latitude</label>
              <input
                type="number"
                step="any"
                value={lat}
                onChange={(e) => setLat(parseFloat(e.target.value))}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:outline-none focus:border-cyan-500"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-400 block mb-1">Longitude</label>
              <input
                type="number"
                step="any"
                value={lng}
                onChange={(e) => setLng(parseFloat(e.target.value))}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-400 block mb-1">Address / Geo Landmark</label>
            <input
              type="text"
              placeholder="e.g. North Watershed Intake Pier"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-medium transition"
            >
              Cancel
            </button>
            <button
              onClick={handleCreate}
              disabled={!name || !code}
              className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold transition disabled:opacity-50"
            >
              Save Water Source
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
