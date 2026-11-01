import React, { useState } from 'react';
import { Bell, Wifi, WifiOff, LogOut, User as UserIcon, ShieldAlert, Cpu } from 'lucide-react';
import { useWebSocket } from '../../context/WebSocketContext';
import { useAuth } from '../../context/AuthContext';
import { SimulationBadge } from '../common/SimulationBadge';

interface HeaderProps {
  onNavigate: (page: string) => void;
  activePage: string;
}

export const Header: React.FC<HeaderProps> = ({ onNavigate, activePage }) => {
  const { isConnected, recentAlerts, unreadAlertCount, clearAlertCount } = useWebSocket();
  const { user, logout } = useAuth();
  const [showAlertMenu, setShowAlertMenu] = useState(false);

  return (
    <header className="sticky top-0 z-30 h-16 border-b border-slate-800 bg-slate-950/80 backdrop-blur-md px-6 flex items-center justify-between">
      {/* Left: Branding & Current Context */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-500 flex items-center justify-center shadow-lg shadow-cyan-900/40">
            <svg className="w-5 h-5 text-white fill-current" viewBox="0 0 24 24">
              <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
            </svg>
          </div>
          <div>
            <h1 className="text-base font-bold tracking-tight text-white flex items-center gap-2">
              AquaGuard
              <span className="text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800/80">
                IoT Core v1.0
              </span>
            </h1>
          </div>
        </div>

        <div className="hidden md:flex items-center gap-2 pl-4 border-l border-slate-800">
          <button 
            onClick={() => onNavigate('simulation')}
            className="hover:opacity-90 transition"
          >
            <SimulationBadge isSimulated={true} />
          </button>
        </div>
      </div>

      {/* Right: Status Indicators & Actions */}
      <div className="flex items-center gap-3">
        {/* WebSocket Real-time Status */}
        <div 
          className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border bg-slate-900 border-slate-800"
          title={isConnected ? "WebSocket Live Telemetry Connected" : "WebSocket Disconnected"}
        >
          {isConnected ? (
            <>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="text-slate-300 hidden sm:inline">LIVE FEED</span>
            </>
          ) : (
            <>
              <span className="w-2 h-2 rounded-full bg-rose-500"></span>
              <span className="text-rose-400 hidden sm:inline">OFFLINE</span>
            </>
          )}
        </div>

        {/* Notifications Popover */}
        <div className="relative">
          <button
            onClick={() => {
              setShowAlertMenu(!showAlertMenu);
              clearAlertCount();
            }}
            className="relative p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-900 border border-transparent hover:border-slate-800 transition"
          >
            <Bell className="w-5 h-5" />
            {unreadAlertCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center animate-bounce">
                {unreadAlertCount > 9 ? '9+' : unreadAlertCount}
              </span>
            )}
          </button>

          {showAlertMenu && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden z-50">
              <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">Live Alert Stream</span>
                <button 
                  onClick={() => {
                    setShowAlertMenu(false);
                    onNavigate('alerts');
                  }}
                  className="text-xs text-cyan-400 hover:underline"
                >
                  View All
                </button>
              </div>
              <div className="max-h-72 overflow-y-auto divide-y divide-slate-800/60">
                {recentAlerts.length === 0 ? (
                  <div className="p-4 text-center text-xs text-slate-500">
                    No active incident alerts received yet.
                  </div>
                ) : (
                  recentAlerts.map((a, idx) => (
                    <div key={idx} className="p-3 hover:bg-slate-800/40 transition">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className={`font-semibold ${a.severity === 'CRITICAL' ? 'text-rose-400' : 'text-amber-400'}`}>
                          {a.severity}
                        </span>
                        <span className="text-slate-500 text-[10px]">Just now</span>
                      </div>
                      <p className="text-xs text-slate-200 line-clamp-2">{a.message}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Profile */}
        <div className="flex items-center gap-2 pl-3 border-l border-slate-800">
          <div className="text-right hidden sm:block">
            <div className="text-xs font-medium text-white">{user?.full_name || 'AquaGuard Operator'}</div>
            <div className="text-[10px] font-semibold text-cyan-400 uppercase tracking-wider">{user?.role || 'OPERATOR'}</div>
          </div>
          <button
            onClick={logout}
            title="Log Out"
            className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-slate-900 transition"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>
    </header>
  );
};
