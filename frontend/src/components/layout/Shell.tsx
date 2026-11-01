import React from 'react';
import { Header } from './Header';
import { Sidebar } from './Sidebar';

interface ShellProps {
  children: React.ReactNode;
  activePage: string;
  onNavigate: (page: string) => void;
}

export const Shell: React.FC<ShellProps> = ({ children, activePage, onNavigate }) => {
  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-slate-100">
      <Header activePage={activePage} onNavigate={onNavigate} />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar activePage={activePage} onNavigate={onNavigate} />
        <main className="flex-1 overflow-y-auto p-6 md:p-8">
          <div className="max-w-7xl mx-auto space-y-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};
