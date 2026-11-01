import React from 'react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid, 
  ReferenceLine 
} from 'recharts';

interface ParameterHistoryChartProps {
  data: any[];
  parameterKey: string;
  parameterName: string;
  unit: string;
  color?: string;
  standardMin?: number;
  standardMax?: number;
  height?: number;
}

export const ParameterHistoryChart: React.FC<ParameterHistoryChartProps> = ({
  data,
  parameterKey,
  parameterName,
  unit,
  color = '#0ea5e9',
  standardMin,
  standardMax,
  height = 280
}) => {
  const formattedData = data.map(d => ({
    ...d,
    formattedTime: new Date(d.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    val: d[parameterKey]
  }));

  const gradientId = `grad-${parameterKey}`;

  return (
    <div className="w-full rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h4 className="text-sm font-semibold text-white">{parameterName} Trend</h4>
          <span className="text-xs text-slate-400">Values in {unit}</span>
        </div>
        {(standardMin !== undefined || standardMax !== undefined) && (
          <div className="flex items-center gap-3 text-[11px] text-slate-400">
            {standardMin !== undefined && <span>Min Permissible: <strong className="text-slate-200">{standardMin}</strong></span>}
            {standardMax !== undefined && <span>Max Permissible: <strong className="text-slate-200">{standardMax}</strong></span>}
          </div>
        )}
      </div>

      <div style={{ width: '100%', height }}>
        <ResponsiveContainer>
          <AreaChart data={formattedData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.4} />
                <stop offset="95%" stopColor={color} stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis dataKey="formattedTime" stroke="#64748b" fontSize={11} tickLine={false} />
            <YAxis stroke="#64748b" fontSize={11} tickLine={false} domain={['auto', 'auto']} />
            <Tooltip
              contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.75rem', fontSize: '12px' }}
              labelStyle={{ color: '#94a3b8' }}
              formatter={(value: any) => [`${Number(value).toFixed(2)} ${unit}`, parameterName]}
            />
            {standardMax !== undefined && (
              <ReferenceLine y={standardMax} stroke="#ef4444" strokeDasharray="3 3" label={{ value: 'Limit', fill: '#ef4444', fontSize: 10 }} />
            )}
            {standardMin !== undefined && (
              <ReferenceLine y={standardMin} stroke="#f59e0b" strokeDasharray="3 3" label={{ value: 'Floor', fill: '#f59e0b', fontSize: 10 }} />
            )}
            <Area
              type="monotone"
              dataKey="val"
              stroke={color}
              strokeWidth={2.5}
              fillOpacity={1}
              fill={`url(#${gradientId})`}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
