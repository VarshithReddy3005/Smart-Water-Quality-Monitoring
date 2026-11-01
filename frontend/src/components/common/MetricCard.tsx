import React from 'react';
import { LucideIcon } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string | number;
  unit?: string;
  icon: LucideIcon;
  subtitle?: string;
  trend?: string;
  trendUp?: boolean;
  color?: 'cyan' | 'blue' | 'emerald' | 'amber' | 'rose';
  onClick?: () => void;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  unit,
  icon: Icon,
  subtitle,
  trend,
  trendUp,
  color = 'cyan',
  onClick
}) => {
  const colorMap = {
    cyan: 'from-cyan-500/10 to-transparent border-cyan-500/20 text-cyan-400',
    blue: 'from-blue-500/10 to-transparent border-blue-500/20 text-blue-400',
    emerald: 'from-emerald-500/10 to-transparent border-emerald-500/20 text-emerald-400',
    amber: 'from-amber-500/10 to-transparent border-amber-500/20 text-amber-400',
    rose: 'from-rose-500/10 to-transparent border-rose-500/20 text-rose-400',
  };

  return (
    <div 
      onClick={onClick}
      className={`p-5 rounded-xl border bg-gradient-to-b bg-slate-900/60 backdrop-blur-sm transition-all duration-200 hover:border-slate-700 ${colorMap[color]} ${onClick ? 'cursor-pointer hover:scale-[1.01]' : ''}`}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-slate-400">{title}</span>
        <div className={`p-2.5 rounded-lg bg-slate-800/80 border border-slate-700/50`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-bold tracking-tight text-white">
          {value !== undefined && value !== null ? value : '--'}
        </span>
        {unit && <span className="text-sm font-medium text-slate-400">{unit}</span>}
      </div>
      {(subtitle || trend) && (
        <div className="mt-2.5 flex items-center justify-between text-xs text-slate-400">
          <span>{subtitle}</span>
          {trend && (
            <span className={trendUp ? 'text-emerald-400 font-medium' : 'text-rose-400 font-medium'}>
              {trend}
            </span>
          )}
        </div>
      )}
    </div>
  );
};
