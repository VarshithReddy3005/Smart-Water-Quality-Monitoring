import React from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import { Station } from '../../types';
import { StatusBadge } from '../common/StatusBadge';

interface StationMapProps {
  stations: Station[];
  onSelectStation?: (station: Station) => void;
  selectedStationId?: number;
  height?: string;
}

export const StationMap: React.FC<StationMapProps> = ({
  stations,
  onSelectStation,
  selectedStationId,
  height = '360px'
}) => {
  // Center map on average coords or default to New York area
  const defaultCenter: [number, number] = stations.length > 0
    ? [stations[0].latitude, stations[0].longitude]
    : [40.7128, -74.0060];

  return (
    <div style={{ height }} className="w-full rounded-2xl overflow-hidden border border-slate-800 shadow-inner">
      <MapContainer
        center={defaultCenter}
        zoom={11}
        scrollWheelZoom={false}
        className="h-full w-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        />

        {stations.map((s) => {
          const isSelected = selectedStationId === s.id;
          const status = s.latest_reading?.quality_status || 'NORMAL';
          
          let fillColor = '#10b981'; // Normal
          if (status === 'WARNING') fillColor = '#f59e0b';
          if (status === 'CRITICAL') fillColor = '#ef4444';
          if (s.status !== 'ACTIVE') fillColor = '#94a3b8';

          return (
            <CircleMarker
              key={s.id}
              center={[s.latitude, s.longitude]}
              radius={isSelected ? 14 : 10}
              pathOptions={{
                fillColor,
                fillOpacity: 0.85,
                color: isSelected ? '#ffffff' : '#0f172a',
                weight: isSelected ? 3 : 2
              }}
              eventHandlers={{
                click: () => onSelectStation && onSelectStation(s)
              }}
            >
              <Popup>
                <div className="p-1 text-slate-900 text-xs font-sans min-w-[180px]">
                  <div className="font-bold text-sm text-slate-900">{s.name}</div>
                  <div className="text-slate-500 mb-2 font-mono text-[11px]">{s.code} • {s.water_source_type}</div>
                  
                  <div className="space-y-1 mb-2 border-t border-b border-slate-200 py-1.5">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Status:</span>
                      <strong className="text-slate-800">{status}</strong>
                    </div>
                    {s.latest_reading && (
                      <>
                        <div className="flex justify-between">
                          <span className="text-slate-500">pH:</span>
                          <span className="font-semibold">{s.latest_reading.ph?.toFixed(2) || '--'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Turbidity:</span>
                          <span className="font-semibold">{s.latest_reading.turbidity_ntu?.toFixed(2) || '--'} NTU</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">DO:</span>
                          <span className="font-semibold">{s.latest_reading.dissolved_oxygen_mg_l?.toFixed(2) || '--'} mg/L</span>
                        </div>
                      </>
                    )}
                  </div>

                  {onSelectStation && (
                    <button
                      onClick={() => onSelectStation(s)}
                      className="w-full py-1 text-center bg-cyan-600 text-white font-medium rounded text-xs hover:bg-cyan-500 transition"
                    >
                      Inspect Telemetry
                    </button>
                  )}
                </div>
              </Popup>
            </CircleMarker>
          );
        })}
      </MapContainer>
    </div>
  );
};
