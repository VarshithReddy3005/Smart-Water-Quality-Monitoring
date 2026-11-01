import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { WebSocketProvider } from './context/WebSocketContext';
import { Shell } from './components/layout/Shell';

// Pages
import { Dashboard } from './pages/Dashboard';
import { LiveMonitoring } from './pages/LiveMonitoring';
import { WaterQualityAnalysis } from './pages/WaterQualityAnalysis';
import { HistoricalData } from './pages/HistoricalData';
import { AlertsPage } from './pages/AlertsPage';
import { ReportsPage } from './pages/ReportsPage';
import { DevicesPage } from './pages/DevicesPage';
import { WaterSourcesPage } from './pages/WaterSourcesPage';
import { SimulationControlPage } from './pages/SimulationControlPage';
import { SettingsPage } from './pages/SettingsPage';
import { Login } from './pages/Login';

const AppContent: React.FC = () => {
  const { user, isLoading } = useAuth();
  const [activePage, setActivePage] = useState<string>('dashboard');

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  const renderPage = () => {
    switch (activePage) {
      case 'dashboard':
        return <Dashboard onNavigate={setActivePage} />;
      case 'live':
        return <LiveMonitoring />;
      case 'analysis':
        return <WaterQualityAnalysis />;
      case 'historical':
        return <HistoricalData />;
      case 'alerts':
        return <AlertsPage />;
      case 'reports':
        return <ReportsPage />;
      case 'devices':
        return <DevicesPage />;
      case 'sources':
        return <WaterSourcesPage />;
      case 'simulation':
        return <SimulationControlPage />;
      case 'settings':
        return <SettingsPage />;
      default:
        return <Dashboard onNavigate={setActivePage} />;
    }
  };

  return (
    <WebSocketProvider>
      <Shell activePage={activePage} onNavigate={setActivePage}>
        {renderPage()}
      </Shell>
    </WebSocketProvider>
  );
};

export function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
