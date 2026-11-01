import React from 'react';

interface LiveGaugeProps {
  title: string;
  value?: number;
  unit: string;
  min: number;
  max: number;
  normalMin?: number;
  normalMax?: number;
  warningMax?: number;
  status?: string;
}

export const LiveGauge: React.FC<LiveGaugeProps> = ({
  title,
  value,
  unit,
  min,
  max,
  normalMin,
  normalMax,
  status = 'NORMAL'
}) => {
  const displayVal = value !== undefined && value !== null ? value : 0;
  // Calculate percentage within [min, max]
  const clampedVal = Math.min(Math.max(displayVal, min), max);
  const percentage = ((clampedVal - min) / (max - min)) * 100;

  // Arc calculation for semi-circle
  const strokeDashoffset = 188.5 - (188.5 * percentage) / 100;

  let color = '#0284c7'; // Cyan/Blue
  if (status === 'NORMAL') color = '#10b981'; // Emerald
  else if (status === 'WARNING') color = '#f59e0b'; // Amber
  else if (status === 'CRITICAL') color = '#ef4444'; // Red

  return (
    <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 flex flex-col items-center text-center">
      <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">{title}</span>
      
      <div className="relative w-36 h-20 flex items-end justify-center overflow-hidden">
        <svg className="w-36 h-36 -rotate-90 transform" viewBox="0 0 100 100">
          {/* Background Track */}
          <circle
            cx="50"
            cy="50"
            r="30"
            fill="none"
            stroke="#1e293b"
            strokeWidth="8"
            strokeDasharray="188.5"
            strokeDashoffset="94.25"
          />
          {/* Active Value Arc */}
          <circle
            cx="50"
            cy="50"
            r="30"
            fill="none"
            stroke={color}
            strokeWidth="8"
            strokeDasharray="188.5"
            strokeDashoffset={94.25 + (94.25 * (100 - percentage)) / 100}
            strokeLinecap="round"
            className="transition-all duration-700 ease-out"
          />
        </svg>

        <div className="absolute bottom-1 text-center">
          <span className="text-xl font-bold text-white tracking-tight">
            {value !== undefined ? value.toFixed(1) : '--'}
          </span>
          <span className="text-[11px] text-slate-400 block -mt-0.5">{unit}</span>
        </div>
      </div>

      <div className="w-full flex justify-between text-[10px] text-slate-500 mt-2 px-2 border-t border-slate-800/60 pt-1.5">
        <span>Min: {min}</span>
        <span className="font-medium" style={{ color }}>{status}</span>
        <span>Max: {max}</span>
      </div>
    </div>
  );
};
