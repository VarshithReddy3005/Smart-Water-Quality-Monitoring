import React from 'react';
import { QualityStatus, AlertSeverity } from '../../types';

interface StatusBadgeProps {
  status: QualityStatus | AlertSeverity | string;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  const s = status.toUpperCase();
  
  let bgClass = 'bg-slate-800 text-slate-300 border-slate-700';
  let dotClass = 'bg-slate-400';

  if (s === 'NORMAL' || s === 'INFO' || s === 'ONLINE' || s === 'EXCELLENT' || s === 'GOOD') {
    bgClass = 'bg-emerald-950/60 text-emerald-300 border-emerald-800/60';
    dotClass = 'bg-emerald-400 animate-pulse';
  } else if (s === 'WARNING' || s === 'POOR' || s === 'MAINTENANCE') {
    bgClass = 'bg-amber-950/60 text-amber-300 border-amber-800/60';
    dotClass = 'bg-amber-400';
  } else if (s === 'CRITICAL' || s === 'VERY POOR' || s === 'UNSUITABLE FOR DRINKING' || s === 'OFFLINE' || s === 'ERROR') {
    bgClass = 'bg-rose-950/60 text-rose-300 border-rose-800/60';
    dotClass = 'bg-rose-500 animate-ping';
  }

  const pxClass = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs';

  return (
    <span className={`inline-flex items-center gap-1.5 font-medium rounded-full border ${bgClass} ${pxClass}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dotClass}`}></span>
      {status}
    </span>
  );
};
