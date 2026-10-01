// App.tsx — Global Application Layout with Sidebar, Header, Command Palette, and Routing
import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import CommandPalette from './components/CommandPalette';
import Dashboard from './pages/Dashboard';
import AddMonitor from './pages/AddMonitor';
import AlertsPage from './pages/AlertsPage';
import ActivityLog from './pages/ActivityLog';
import SourcesPage from './pages/SourcesPage';
import SettingsPage from './pages/SettingsPage';
import { useMonitors, useAlerts, useBrowserNotifications } from './hooks/useMonitoring';
import * as api from './services/api';

function AppLayout({ children }: { children: React.ReactNode }) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [demoModeActive, setDemoModeActive] = useState(true);

  const { data: monitors, refetch: refetchMonitors } = useMonitors(4000);
  const { data: alerts } = useAlerts(5000);
  const { watchAlerts } = useBrowserNotifications();

  // Watch alerts for browser push notifications
  useEffect(() => {
    if (alerts) {
      watchAlerts(alerts);
    }
  }, [alerts, watchAlerts]);

  // Global keyboard shortcut for Command Palette (⌘K / Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Force check all monitors
  const handleCheckAll = async () => {
    const active = monitors?.filter((m) => m.is_active) || [];
    for (const m of active) {
      try {
        await api.checkMonitor(m.id);
      } catch (e) {
        // continue
      }
    }
    refetchMonitors();
  };

  // Simulate price drop on first active monitor (or all demo monitors)
  const handleSimulatePriceDrop = async () => {
    const firstActive = monitors?.find((m) => m.is_active);
    if (firstActive) {
      await api.simulatePriceDrop(firstActive.id);
    } else {
      await api.simulatePriceDrop(1);
    }
    refetchMonitors();
  };

  return (
    <div className="flex h-screen overflow-hidden bg-[#08090D] text-[#F5F7FA]">
      {/* Sidebar */}
      <Sidebar
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed((prev) => !prev)}
        lastRunTime={monitors?.[0]?.last_checked ? 'just now' : undefined}
      />

      {/* Main Column */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header */}
        <Header
          onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
          onSimulatePriceDrop={handleSimulatePriceDrop}
          demoModeActive={demoModeActive}
          onToggleDemoMode={() => setDemoModeActive((prev) => !prev)}
        />

        {/* Page Content Viewport */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>

      {/* Global ⌘K Command Palette */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        monitors={monitors || []}
        onTriggerCheckAll={handleCheckAll}
        onSimulatePriceDrop={handleSimulatePriceDrop}
        demoModeActive={demoModeActive}
      />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppLayout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/monitors" element={<Dashboard />} />
          <Route path="/products" element={<Dashboard />} />
          <Route path="/history" element={<ActivityLog />} />
          <Route path="/add" element={<AddMonitor />} />
          <Route path="/alerts" element={<AlertsPage />} />
          <Route path="/activity" element={<ActivityLog />} />
          <Route path="/sources" element={<SourcesPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AppLayout>
    </BrowserRouter>
  );
}
