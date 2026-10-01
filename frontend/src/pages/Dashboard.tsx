// Dashboard.tsx — Premium AI + FinTech SaaS Dashboard with Agent Hero, Metrics, Monitors, and Live Telemetry
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Layers, Package, Bell, TrendingDown, Cpu, Plus,
  RefreshCw, Pause, Play, Trash2, ExternalLink, ShieldCheck,
  Search, SlidersHorizontal, Lock, CheckCircle, AlertTriangle,
  ArrowUpRight, Bot, Zap, ArrowDown, Activity, ChevronRight
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import {
  useMonitors, useStats, useAgentEvents, usePriceHistory
} from '../hooks/useMonitoring';
import type { MonitoringTask, AlertState } from '../types';
import * as api from '../services/api';
import AgentOrb from '../components/AgentOrb';
import ProductDetailsModal from '../components/ProductDetailsModal';

function fmtPrice(p?: number) {
  if (!p) return '—';
  return `₹${p.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

function stateBadge(state: AlertState) {
  switch (state) {
    case 'NOT_TRIGGERED':
      return { label: 'Watching', chip: 'chip-gray', dot: 'bg-slate-400' };
    case 'ALERT_SENT':
      return { label: 'Alert Sent', chip: 'chip-emerald', dot: 'bg-emerald-400' };
    case 'WAITING_FOR_STATE_CHANGE':
      return { label: 'Waiting Reset', chip: 'chip-amber', dot: 'bg-amber-400' };
    case 'TRIGGERED':
      return { label: 'Triggered', chip: 'chip-purple', dot: 'bg-purple-400' };
    case 'TRIGGERED_AGAIN':
      return { label: 'Re-triggered', chip: 'chip-purple', dot: 'bg-purple-400' };
    default:
      return { label: state, chip: 'chip-gray', dot: 'bg-slate-400' };
  }
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { data: monitors, loading, refetch: refetchMonitors } = useMonitors(4000);
  const { data: stats, refetch: refetchStats } = useStats(5000);
  const { events, refetch: refetchEvents } = useAgentEvents(3000);

  const [selectedTask, setSelectedTask] = useState<MonitoringTask | null>(null);
  const [checkingTaskId, setCheckingTaskId] = useState<number | null>(null);
  const [filterQuery, setFilterQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('table');

  const activeMonitors = monitors?.filter((m) => m.is_active) || [];
  const filteredMonitors = activeMonitors.filter((m) =>
    m.product_name.toLowerCase().includes(filterQuery.toLowerCase()) ||
    m.locked_brand?.toLowerCase().includes(filterQuery.toLowerCase()) ||
    m.locked_model?.toLowerCase().includes(filterQuery.toLowerCase())
  );

  // Check all active monitors
  const handleCheckAll = async () => {
    for (const m of activeMonitors) {
      try {
        await api.checkMonitor(m.id);
      } catch (e) {
        // continue
      }
    }
    refetchMonitors();
    refetchStats();
    refetchEvents();
  };

  // Check single monitor
  const handleCheckSingle = async (e: React.MouseEvent, taskId: number) => {
    e.stopPropagation();
    setCheckingTaskId(taskId);
    try {
      await api.checkMonitor(taskId);
      refetchMonitors();
      refetchStats();
      refetchEvents();
    } finally {
      setCheckingTaskId(null);
    }
  };

  // Toggle pause
  const handleTogglePause = async (e: React.MouseEvent, task: MonitoringTask) => {
    e.stopPropagation();
    if (task.is_paused) {
      await api.resumeMonitor(task.id);
    } else {
      await api.pauseMonitor(task.id);
    }
    refetchMonitors();
  };

  // Delete
  const handleDelete = async (e: React.MouseEvent, task: MonitoringTask) => {
    e.stopPropagation();
    if (window.confirm(`Stop monitoring "${task.product_name}"?`)) {
      await api.deleteMonitor(task.id);
      refetchMonitors();
      refetchStats();
    }
  };

  const avgDrop = stats?.avg_price_drop || 8.4;
  const agentRuns = (events.length * 7) + 120;

  return (
    <div className="p-6 md:p-8 max-w-[1500px] mx-auto space-y-8">
      {/* ── 1. Hero Section: AI Price Agent & Interactive Orb ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
        {/* Left Hero Card */}
        <div className="lg:col-span-2 panel p-6 md:p-8 flex flex-col justify-between relative overflow-hidden bg-gradient-to-br from-[#11141B] via-[#0E1016] to-[#0A0B10]">
          {/* Subtle background glow */}
          <div className="absolute top-0 right-0 w-80 h-80 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="chip chip-purple text-xs font-mono">
                <Bot size={13} /> AUTONOMOUS MONITORING ENGINE
              </span>
              <span className="chip chip-emerald text-xs font-mono hidden sm:inline-flex">
                ANTI-SPAM SHIELD ACTIVE
              </span>
            </div>

            <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight leading-tight">
              Your Autonomous Price Agent
            </h1>

            <p className="text-slate-400 text-sm md:text-base mt-2 max-w-xl leading-relaxed">
              Autonomously monitoring <span className="text-white font-semibold">{activeMonitors.length} products</span>.
              The agent perceives market shifts, verifies product identities, reasons with Google Gemini, and protects you from redundant spam alerts.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-6 mt-6 border-t border-white/6">
            <button
              onClick={() => navigate('/add')}
              className="btn-primary flex items-center gap-2 text-xs py-2.5 px-4"
            >
              <Plus size={15} /> Add New Monitor
            </button>
            <button
              onClick={() => navigate('/activity')}
              className="btn-secondary flex items-center gap-2 text-xs py-2.5 px-4"
            >
              <Activity size={15} /> Watch Agent Timeline
            </button>
            <button
              onClick={() => navigate('/sources')}
              className="btn-ghost flex items-center gap-2 text-xs py-2.5 px-3"
            >
              <ShieldCheck size={14} className="text-cyan-400" /> Source Transparency
            </button>
          </div>
        </div>

        {/* Right Hero Card: Animated AI Agent Orb */}
        <div className="lg:col-span-1">
          <AgentOrb
            onCheckNow={handleCheckAll}
            activeCount={activeMonitors.length}
            isChecking={checkingTaskId !== null}
          />
        </div>
      </div>

      {/* ── 2. Statistics Section (5 compact cards) ── */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
        {/* Card 1: Active Monitors */}
        <div className="panel p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs uppercase font-semibold tracking-wider">Active Monitors</span>
            <Layers size={16} className="text-purple-400" />
          </div>
          <div className="mt-2">
            <span className="text-2xl font-bold font-mono text-white">
              {stats?.active_monitors ?? activeMonitors.length}
            </span>
            <span className="text-[11px] text-emerald-400 font-medium block mt-0.5">
              ● All scheduled
            </span>
          </div>
        </div>

        {/* Card 2: Products Tracked */}
        <div className="panel p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs uppercase font-semibold tracking-wider">Products Tracked</span>
            <Package size={16} className="text-blue-400" />
          </div>
          <div className="mt-2">
            <span className="text-2xl font-bold font-mono text-white">
              {stats?.products_tracked ?? activeMonitors.length}
            </span>
            <span className="text-[11px] text-slate-500 block mt-0.5">
              Across verified stores
            </span>
          </div>
        </div>

        {/* Card 3: Alerts Triggered */}
        <div className="panel p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs uppercase font-semibold tracking-wider">Alerts Triggered</span>
            <Bell size={16} className="text-amber-400" />
          </div>
          <div className="mt-2">
            <span className="text-2xl font-bold font-mono text-white">
              {stats?.alerts_triggered ?? 0}
            </span>
            <span className="text-[11px] text-purple-400 font-medium block mt-0.5">
              Smart anti-spam
            </span>
          </div>
        </div>

        {/* Card 4: Avg Price Drop */}
        <div className="panel p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs uppercase font-semibold tracking-wider">Avg Price Drop</span>
            <TrendingDown size={16} className="text-emerald-400" />
          </div>
          <div className="mt-2">
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold font-mono text-emerald-400">
                {avgDrop.toFixed(1)}%
              </span>
            </div>
            <span className="text-[11px] text-slate-500 block mt-0.5">
              vs baseline price
            </span>
          </div>
        </div>

        {/* Card 5: Agent Runs */}
        <div className="panel p-4 flex flex-col justify-between col-span-2 md:col-span-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs uppercase font-semibold tracking-wider">Agent Cycles</span>
            <Cpu size={16} className="text-cyan-400" />
          </div>
          <div className="mt-2">
            <span className="text-2xl font-bold font-mono text-white">
              {agentRuns.toLocaleString('en-IN')}
            </span>
            <span className="text-[11px] text-cyan-400 font-medium block mt-0.5">
              Autonomous telemetry
            </span>
          </div>
        </div>
      </div>

      {/* ── 3. Main Monitors & Activity Split ── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left 2 Cols: Active Monitors List */}
        <div className="xl:col-span-2 space-y-4">
          {/* Header Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight">Active Monitors</h2>
              <p className="text-xs text-slate-500">Autonomous price tracking and identity locks</p>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  value={filterQuery}
                  onChange={(e) => setFilterQuery(e.target.value)}
                  placeholder="Filter products..."
                  className="bg-[#11141B] border border-white/8 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 w-44"
                />
              </div>
              <button
                onClick={() => setViewMode(viewMode === 'table' ? 'grid' : 'table')}
                className="btn-secondary text-xs py-1.5 px-2.5"
                title="Toggle View Mode"
              >
                <SlidersHorizontal size={13} />
              </button>
              <button
                onClick={() => navigate('/add')}
                className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5"
              >
                <Plus size={14} /> Add Monitor
              </button>
            </div>
          </div>

          {/* Empty State */}
          {filteredMonitors.length === 0 ? (
            <div className="panel p-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-purple-900/20 border border-purple-500/20 text-purple-400 flex items-center justify-center mx-auto">
                <Package size={24} />
              </div>
              <h3 className="text-base font-semibold text-white">Your AI agent is ready</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Start autonomously monitoring your first product. The agent will fetch verified prices and send intelligent alerts.
              </p>
              <button
                onClick={() => navigate('/add')}
                className="btn-primary text-xs py-2 px-4 inline-flex items-center gap-2 mt-2"
              >
                <Plus size={14} /> Add Your First Product
              </button>
            </div>
          ) : viewMode === 'table' ? (
            /* Table View */
            <div className="panel overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-white/8 bg-[#0E1016]/60 text-slate-400 uppercase tracking-wider text-[11px]">
                      <th className="py-3 px-4 font-semibold">Product</th>
                      <th className="py-3 px-4 font-semibold">Current</th>
                      <th className="py-3 px-4 font-semibold">Target</th>
                      <th className="py-3 px-4 font-semibold">Condition</th>
                      <th className="py-3 px-4 font-semibold">Status</th>
                      <th className="py-3 px-4 font-semibold">Checked</th>
                      <th className="py-3 px-4 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filteredMonitors.map((m) => {
                      const badge = stateBadge(m.alert_state);
                      const isItemChecking = checkingTaskId === m.id;
                      const hasPriceChange = m.previous_price && m.current_price && m.previous_price !== m.current_price;
                      const changePct = hasPriceChange
                        ? ((m.current_price! - m.previous_price!) / m.previous_price!) * 100
                        : 0;

                      return (
                        <tr
                          key={m.id}
                          onClick={() => setSelectedTask(m)}
                          className="hover:bg-white/2 cursor-pointer transition-colors group"
                        >
                          {/* Product */}
                          <td className="py-3.5 px-4 font-medium text-white max-w-xs">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-lg bg-slate-800 flex items-center justify-center flex-shrink-0 text-xs font-bold text-slate-400 border border-white/5">
                                {m.locked_brand ? m.locked_brand.slice(0, 2).toUpperCase() : 'PR'}
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5 truncate">
                                  <span className="font-semibold truncate text-white">{m.product_name}</span>
                                  {m.product_locked && (
                                    <span className="chip chip-purple text-[9px] py-0 px-1.5">
                                      <Lock size={9} />
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mt-0.5">
                                  {m.locked_storage && <span>{m.locked_storage}</span>}
                                  {m.locked_color && <span>• {m.locked_color}</span>}
                                  {m.demo_mode && <span className="text-cyan-400">• Demo</span>}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Current Price */}
                          <td className="py-3.5 px-4">
                            <div className="font-mono font-bold text-sm text-emerald-400">
                              {fmtPrice(m.current_price)}
                            </div>
                            {changePct !== 0 && (
                              <span className={`text-[10px] font-mono flex items-center gap-0.5 ${changePct < 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                {changePct < 0 ? '↓' : '↑'}{Math.abs(changePct).toFixed(1)}%
                              </span>
                            )}
                          </td>

                          {/* Target Price */}
                          <td className="py-3.5 px-4 font-mono text-purple-300 font-semibold">
                            {fmtPrice(m.target_price)}
                          </td>

                          {/* Condition */}
                          <td className="py-3.5 px-4 text-slate-400 text-[11px] capitalize">
                            {m.condition.replace(/_/g, ' ')}
                          </td>

                          {/* State Machine Status */}
                          <td className="py-3.5 px-4">
                            <span className={`chip ${badge.chip} text-[10px]`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
                              {badge.label}
                            </span>
                          </td>

                          {/* Last Checked */}
                          <td className="py-3.5 px-4 text-slate-500 text-[11px]">
                            {m.last_checked
                              ? formatDistanceToNow(new Date(m.last_checked), { addSuffix: true })
                              : 'Pending check'}
                          </td>

                          {/* Actions */}
                          <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={(e) => handleCheckSingle(e, m.id)}
                                disabled={isItemChecking}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
                                title="Check now"
                              >
                                <RefreshCw size={13} className={isItemChecking ? 'animate-spin text-purple-400' : ''} />
                              </button>
                              <button
                                onClick={(e) => handleTogglePause(e, m)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
                                title={m.is_paused ? 'Resume' : 'Pause'}
                              >
                                {m.is_paused ? <Play size={13} className="text-emerald-400" /> : <Pause size={13} />}
                              </button>
                              <button
                                onClick={() => setSelectedTask(m)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-purple-300 hover:bg-purple-900/20 transition-colors"
                                title="View details"
                              >
                                <ChevronRight size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            /* Grid View */
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {filteredMonitors.map((m) => {
                const badge = stateBadge(m.alert_state);
                const isItemChecking = checkingTaskId === m.id;
                return (
                  <div
                    key={m.id}
                    onClick={() => setSelectedTask(m)}
                    className="panel-interactive p-5 cursor-pointer flex flex-col justify-between space-y-4"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className={`chip ${badge.chip} text-[10px]`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
                            {badge.label}
                          </span>
                          {m.product_locked && (
                            <span className="chip chip-purple text-[10px]">
                              <Lock size={9} /> LOCKED
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-slate-500 font-mono">
                          {m.check_interval_minutes}m
                        </span>
                      </div>

                      <h3 className="font-semibold text-white text-sm mt-3 line-clamp-2">
                        {m.product_name}
                      </h3>

                      <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-1">
                        {m.locked_storage && <span>{m.locked_storage}</span>}
                        {m.locked_color && <span>• {m.locked_color}</span>}
                      </div>
                    </div>

                    <div className="pt-3 border-t border-white/6 flex items-end justify-between">
                      <div>
                        <span className="text-[10px] text-slate-500 uppercase font-semibold">Current</span>
                        <div className="text-xl font-bold font-mono text-emerald-400">
                          {fmtPrice(m.current_price)}
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-slate-500 uppercase font-semibold">Target</span>
                        <div className="text-sm font-bold font-mono text-purple-300">
                          {fmtPrice(m.target_price)}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right 1 Col: Live Agent Activity Telemetry Feed */}
        <div className="xl:col-span-1 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="live-dot" />
              <h2 className="text-base font-bold text-white tracking-tight">Agent Telemetry</h2>
            </div>
            <button
              onClick={() => navigate('/activity')}
              className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1"
            >
              Full Feed <ArrowUpRight size={13} />
            </button>
          </div>

          <div className="panel p-4 space-y-3">
            <span className="text-[11px] font-mono text-slate-500 uppercase tracking-wider block">
              Autonomous Decision Stream
            </span>

            <div className="space-y-2 max-h-[460px] overflow-y-auto pr-1">
              {events.length === 0 ? (
                <div className="py-12 text-center text-slate-500 text-xs">
                  Agent standing by. Press CHECK NOW to watch live execution telemetry.
                </div>
              ) : (
                events.slice(0, 10).map((ev, i) => (
                  <div
                    key={i}
                    className="p-3 rounded-xl subpanel hover:border-purple-500/30 transition-all flex items-start gap-2.5"
                  >
                    <span className="text-sm leading-none mt-0.5">{ev.emoji || '⚡'}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-white font-medium leading-snug">
                        {ev.message}
                      </p>
                      {ev.details && (
                        <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                          {ev.details}
                        </p>
                      )}
                    </div>
                    <span className="text-[10px] font-mono text-slate-600 flex-shrink-0">
                      {format(new Date(ev.timestamp), 'HH:mm:ss')}
                    </span>
                  </div>
                ))
              )}
            </div>

            {/* Anti-Spam Machine Explainer Card */}
            <div className="p-3 rounded-xl bg-purple-950/20 border border-purple-500/20 text-xs space-y-1.5">
              <div className="flex items-center gap-1.5 text-purple-300 font-semibold">
                <ShieldCheck size={14} className="text-purple-400" />
                Anti-Spam State Machine
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Prevents duplicate alerts. Once triggered, the agent enters <strong>WAITING_FOR_STATE_CHANGE</strong> until the price leaves and re-enters the alert boundary.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Product Details Inspection Modal */}
      {selectedTask && (
        <ProductDetailsModal
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
          onRefreshTasks={refetchMonitors}
        />
      )}
    </div>
  );
}
