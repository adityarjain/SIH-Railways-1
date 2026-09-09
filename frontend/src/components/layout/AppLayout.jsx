import React from 'react';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { DemoGuideBar } from './DemoGuideBar';

export const AppLayout = ({ activeTab, onTabChange, children }) => {
  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900">
      {/* Sidebar */}
      <Sidebar activeTab={activeTab} onTabChange={onTabChange} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <Header />
        <DemoGuideBar onNavigate={onTabChange} />
        <main className="flex-1 p-6 max-w-7xl w-full mx-auto space-y-6">
          {children}
        </main>
      </div>
    </div>
  );
};
