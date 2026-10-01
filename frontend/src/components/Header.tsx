// Header.tsx — Top application navigation bar with ⌘K search, demo simulator, and notifications
import React, { useState } from 'react';
import {
  Search, Bell, Zap, RefreshCw, Check, Sparkles,
  Sliders, User, Command, ShieldCheck, Play
} from 'lucide-react';
import { useAlerts, useNotifications } from '../hooks/useMonitoring';
import NotificationDropdown from './NotificationDropdown';

interface HeaderProps {
  onOpenCommandPalette: () => void;
  onSimulatePriceDrop: () => Promise<void>;
  demoModeActive: boolean;
  onToggleDemoMode: () => void;
  greeting?: string;
  subtitle?: string;
}

export default function Header({
  onOpenCommandPalette,
  onSimulatePriceDrop,
  demoModeActive,
  onToggleDemoMode,
  greeting = 'Good morning 👋',
  subtitle = 'Monitor your products with autonomous AI.',
}: HeaderProps) {
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const [simulatedFeedback, setSimulatedFeedback] = useState(false);

  const { data: alerts, refetch: refetchAlerts } = useAlerts(5000);
  const { data: notifications, refetch: refetchNotifs } = useNotifications(5000);

  const unreadAlerts = alerts?.filter((a) => !a.is_read && !a.is_dismissed).length || 0;

  const handleSimulate = async () => {
    if (simulating) return;
    setSimulating(true);
    try {
      await onSimulatePriceDrop();
      setSimulatedFeedback(true);
      setTimeout(() => setSimulatedFeedback(false), 3000);
    } finally {
      setSimulating(false);
    }
  };

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between h-16 px-6 bg-[#08090D]/90 backdrop-blur-md border-b border-white/8 select-none">
      {/* Left: Greeting & contextual subtext */}
      <div className="flex flex-col min-w-0 pr-4">
        <h2 className="text-sm font-semibold text-white tracking-tight leading-none truncate">
          {greeting}
        </h2>
        <p className="text-xs text-slate-500 mt-1 truncate hidden sm:block">
          {subtitle}
        </p>
      </div>

      {/* Center: Global ⌘K Search trigger */}
      <div className="flex-1 max-w-md mx-4 hidden md:block">
        <button
          onClick={onOpenCommandPalette}
          className="w-full flex items-center justify-between px-3.5 py-1.5 rounded-xl bg-[#11141B] border border-white/8 hover:border-purple-500/30 text-slate-400 hover:text-slate-200 text-xs transition-all shadow-inner group"
        >
          <div className="flex items-center gap-2">
            <Search size={14} className="text-slate-500 group-hover:text-purple-400 transition-colors" />
            <span>Search products, monitors or alerts...</span>
          </div>
          <kbd className="inline-flex items-center gap-1 font-mono text-[10px] text-slate-400 bg-white/5 border border-white/10 px-1.5 py-0.5 rounded">
            ⌘ K
          </kbd>
        </button>
      </div>

      {/* Right: Actions, Demo Mode, Notifications */}
      <div className="flex items-center gap-3">
        {/* Demo Mode Toggle & Simulator */}
        <div className="flex items-center gap-2 bg-[#11141B] border border-white/8 rounded-xl p-1">
          <button
            onClick={onToggleDemoMode}
            className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-all flex items-center gap-1.5 ${
              demoModeActive
                ? 'bg-blue-600/20 text-blue-300 border border-blue-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
            title="Toggle Demo Mode"
          >
            <Zap size={12} className={demoModeActive ? 'text-blue-400' : 'text-slate-500'} />
            <span className="hidden sm:inline">Demo</span>
          </button>

          {demoModeActive && (
            <button
              onClick={handleSimulate}
              disabled={simulating}
              className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-all flex items-center gap-1.5 ${
                simulatedFeedback
                  ? 'bg-emerald-600/20 text-emerald-300 border border-emerald-500/30'
                  : 'bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30'
              }`}
              title="Change simulated price for monitored products without skipping the agent reasoning pipeline"
            >
              {simulating ? (
                <RefreshCw size={12} className="animate-spin text-purple-300" />
              ) : simulatedFeedback ? (
                <Check size={12} className="text-emerald-400" />
              ) : (
                <Play size={10} className="fill-current text-purple-400" />
              )}
              <span className="hidden sm:inline">
                {simulating ? 'Simulating...' : simulatedFeedback ? 'Price Dropped!' : 'Simulate Drop'}
              </span>
            </button>
          )}
        </div>

        {/* Notifications Bell Dropdown */}
        <div className="relative">
          <button
            onClick={() => setIsNotifOpen((prev) => !prev)}
            className={`relative p-2 rounded-xl border transition-all ${
              isNotifOpen
                ? 'bg-purple-600/20 border-purple-500/40 text-purple-300'
                : 'bg-[#11141B] border-white/8 hover:border-white/15 text-slate-400 hover:text-white'
            }`}
            title="Notifications"
          >
            <Bell size={16} />
            {unreadAlerts > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center animate-pulse">
                {unreadAlerts > 9 ? '9+' : unreadAlerts}
              </span>
            )}
          </button>

          <NotificationDropdown
            isOpen={isNotifOpen}
            onClose={() => setIsNotifOpen(false)}
            alerts={alerts || []}
            notifications={notifications || []}
            onRefresh={() => {
              refetchAlerts();
              refetchNotifs();
            }}
          />
        </div>

        {/* Live Agent Status Indicator */}
        <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#11141B] border border-white/8">
          <span className="live-dot" />
          <span className="text-xs font-semibold text-slate-300">Agent Active</span>
        </div>

        {/* User avatar / profile button */}
        <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-purple-700 to-indigo-600 border border-purple-400/30 flex items-center justify-center text-xs font-bold text-white shadow-md shadow-purple-900/30">
          PG
        </div>
      </div>
    </header>
  );
}
