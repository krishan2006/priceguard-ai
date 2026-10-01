// CommandPalette.tsx — Global ⌘K / Ctrl+K search and action palette
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, Plus, Activity, Bell, RefreshCw, Zap,
  ExternalLink, ArrowRight, ShieldCheck, Database, Sliders
} from 'lucide-react';
import type { MonitoringTask } from '../types';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  monitors: MonitoringTask[];
  onTriggerCheckAll: () => Promise<void>;
  onSimulatePriceDrop: () => Promise<void>;
  demoModeActive: boolean;
}

export default function CommandPalette({
  isOpen,
  onClose,
  monitors,
  onTriggerCheckAll,
  onSimulatePriceDrop,
  demoModeActive,
}: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
        else {
          // Open handled by parent or custom event
        }
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Filter monitors & build action list
  const filteredMonitors = monitors.filter((m) =>
    m.product_name.toLowerCase().includes(query.toLowerCase()) ||
    m.locked_brand?.toLowerCase().includes(query.toLowerCase()) ||
    m.locked_model?.toLowerCase().includes(query.toLowerCase())
  );

  const quickActions = [
    {
      id: 'add-monitor',
      title: 'Add New Monitor',
      subtitle: 'Search and autonomously track a new product',
      icon: Plus,
      action: () => { navigate('/add'); onClose(); },
      badge: 'Action',
    },
    {
      id: 'check-all',
      title: 'Check All Monitors Now',
      subtitle: 'Force immediate perception & AI reasoning cycle for all products',
      icon: RefreshCw,
      action: async () => { await onTriggerCheckAll(); onClose(); },
      badge: 'Agent',
    },
    {
      id: 'simulate-drop',
      title: 'Simulate Price Drop',
      subtitle: 'Trigger realistic demo price drop for the active product',
      icon: Zap,
      action: async () => { await onSimulatePriceDrop(); onClose(); },
      badge: 'Demo',
      disabled: !demoModeActive,
    },
    {
      id: 'goto-activity',
      title: 'View Agent Activity Feed',
      subtitle: 'Observe live agent perception, reasoning and action timeline',
      icon: Activity,
      action: () => { navigate('/activity'); onClose(); },
      badge: 'Navigation',
    },
    {
      id: 'goto-alerts',
      title: 'View Alerts & Notifications',
      subtitle: 'Check triggered price drop alerts and delivery status',
      icon: Bell,
      action: () => { navigate('/alerts'); onClose(); },
      badge: 'Navigation',
    },
    {
      id: 'goto-sources',
      title: 'Source Transparency & APIs',
      subtitle: 'Verify DummyJSON, Serper and Gemini reasoning telemetry',
      icon: Database,
      action: () => { navigate('/sources'); onClose(); },
      badge: 'Navigation',
    },
  ].filter((a) =>
    query === '' ||
    a.title.toLowerCase().includes(query.toLowerCase()) ||
    a.subtitle.toLowerCase().includes(query.toLowerCase())
  );

  const allItems = [
    ...quickActions.map((a) => ({ type: 'action' as const, data: a })),
    ...filteredMonitors.map((m) => ({ type: 'monitor' as const, data: m })),
  ];

  const handleSelect = (index: number) => {
    const item = allItems[index];
    if (!item) return;
    if (item.type === 'action') {
      item.data.action();
    } else {
      navigate(`/?product=${item.data.id}`);
      onClose();
    }
  };

  const handleKeyDownInput = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, allItems.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + allItems.length) % Math.max(1, allItems.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      handleSelect(selectedIndex);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Palette Container */}
      <div className="relative w-full max-w-2xl bg-[#0E1016] border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-150">
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-white/8 bg-[#11141B]">
          <Search size={18} className="text-purple-400 flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDownInput}
            placeholder="Type a command or search tracked products..."
            className="w-full bg-transparent text-white placeholder-slate-500 text-sm focus:outline-none"
          />
          <kbd className="hidden sm:inline-flex items-center gap-1 text-[11px] font-mono text-slate-400 bg-white/5 border border-white/10 px-2 py-0.5 rounded">
            ESC
          </kbd>
        </div>

        {/* Results Body */}
        <div className="max-h-[380px] overflow-y-auto p-2 space-y-1">
          {allItems.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-sm">
              No matching commands or monitors found for &ldquo;{query}&rdquo;
            </div>
          ) : (
            <>
              {quickActions.length > 0 && (
                <div className="px-3 py-1.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  Quick Actions
                </div>
              )}
              {allItems.map((item, idx) => {
                const isSelected = idx === selectedIndex;
                if (item.type === 'action') {
                  const act = item.data;
                  const Icon = act.icon;
                  return (
                    <button
                      key={act.id}
                      onClick={() => handleSelect(idx)}
                      onMouseEnter={() => setSelectedIndex(idx)}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-left transition-colors ${
                        isSelected
                          ? 'bg-purple-600/15 border border-purple-500/30 text-white'
                          : 'text-slate-300 hover:bg-white/5 border border-transparent'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`p-2 rounded-lg ${isSelected ? 'bg-purple-600/30 text-purple-300' : 'bg-white/5 text-slate-400'}`}>
                          <Icon size={16} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium leading-none">{act.title}</p>
                          <p className="text-xs text-slate-500 mt-1 truncate">{act.subtitle}</p>
                        </div>
                      </div>
                      <span className="text-[11px] text-slate-400 font-mono px-2 py-0.5 rounded bg-white/5 border border-white/5 ml-2 flex-shrink-0">
                        {act.badge}
                      </span>
                    </button>
                  );
                }

                // Tracked monitor item
                const mon = item.data;
                return (
                  <button
                    key={`mon-${mon.id}`}
                    onClick={() => handleSelect(idx)}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-left transition-colors ${
                      isSelected
                        ? 'bg-purple-600/15 border border-purple-500/30 text-white'
                        : 'text-slate-300 hover:bg-white/5 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center flex-shrink-0 text-xs font-bold text-slate-400">
                        {mon.locked_brand ? mon.locked_brand.slice(0, 2).toUpperCase() : 'PR'}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium leading-none truncate">{mon.product_name}</p>
                          {mon.product_locked && (
                            <span className="text-[10px] text-purple-400 bg-purple-900/30 border border-purple-500/20 px-1.5 py-0.2 rounded">
                              LOCKED
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 mt-1">
                          Target: ₹{(mon.target_price || 0).toLocaleString('en-IN')} · Every {mon.check_interval_minutes}m
                        </p>
                      </div>
                    </div>
                    <div className="text-right ml-2 flex-shrink-0">
                      <span className="text-sm font-mono font-bold text-emerald-400">
                        ₹{(mon.current_price || 0).toLocaleString('en-IN')}
                      </span>
                      <p className="text-[11px] text-slate-500 capitalize">{mon.alert_state.replace(/_/g, ' ').toLowerCase()}</p>
                    </div>
                  </button>
                );
              })}
            </>
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="flex items-center justify-between px-4 py-2.5 border-t border-white/8 bg-[#0B0D12] text-xs text-slate-500">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <kbd className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 font-mono text-[10px]">↑</kbd>
              <kbd className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 font-mono text-[10px]">↓</kbd>
              Navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 font-mono text-[10px]">↵</kbd>
              Select
            </span>
          </div>
          <span className="text-[11px]">PriceGuard Autonomous Agent</span>
        </div>
      </div>
    </div>
  );
}
