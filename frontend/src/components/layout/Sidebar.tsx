import React from 'react';
import { 
  LayoutDashboard, 
  Activity, 
  LineChart, 
  History, 
  AlertTriangle, 
  FileText, 
  Cpu, 
  Waves, 
  PlayCircle, 
  Settings, 
  Users
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface SidebarProps {
  activePage: string;
  onNavigate: (page: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activePage, onNavigate }) => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMINISTRATOR';

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'live', label: 'Live Monitoring', icon: Activity, badge: 'REALTIME' },
    { id: 'analysis', label: 'Quality Analysis & WQI', icon: LineChart },
    { id: 'historical', label: 'Historical Data', icon: History },
    { id: 'alerts', label: 'Alerts & Incidents', icon: AlertTriangle },
    { id: 'reports', label: 'Reports & Export', icon: FileText },
    { id: 'devices', label: 'Devices & Sensors', icon: Cpu },
    { id: 'sources', label: 'Water Sources & GIS', icon: Waves },
    { id: 'simulation', label: 'Simulation Controls', icon: PlayCircle, highlight: true },
    ...(isAdmin ? [{ id: 'settings', label: 'Settings & Admin', icon: Settings }] : []),
  ];

  return (
    <aside className="w-64 border-r border-slate-800 bg-slate-950 flex flex-col shrink-0 select-none">
      <div className="p-4 flex-1 space-y-1 overflow-y-auto">
        <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 px-3 py-2">
          Operations
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activePage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition ${
                isActive
                  ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
              } ${item.highlight ? 'text-amber-300 hover:text-amber-200' : ''}`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-4 h-4 ${isActive ? 'text-cyan-400' : item.highlight ? 'text-amber-400' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Safety Notice Footer */}
      <div className="p-4 m-3 rounded-xl bg-slate-900/60 border border-slate-800 text-[11px] text-slate-400 leading-relaxed">
        <span className="font-semibold text-slate-300 block mb-1">Notice:</span>
        Online sensors screen physical-chemical water traits. Official drinking safety requires certified lab assays.
      </div>
    </aside>
  );
};
