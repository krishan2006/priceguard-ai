// ActivityLog.tsx — Agent Activity Timeline & Autonomous Tools Panel
import React, { useState } from 'react';
import {
  Activity, RefreshCw, BarChart2, ShieldCheck, Bot,
  CheckCircle, ArrowDown, Cpu, Zap, Search, Bell, AlertTriangle,
  Clock, Database, Layers, Check
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine
} from 'recharts';
import { useAgentLogs, useMonitors, usePriceHistory, useAgentEvents } from '../hooks/useMonitoring';
import type { AgentLog, MonitoringTask } from '../types';

function PriceHistoryChart({ task }: { task: MonitoringTask }) {
  const { history } = usePriceHistory(task.id, 6000);

  const data = [...history].reverse().map((h) => ({
    time: format(new Date(h.timestamp), 'HH:mm'),
    price: Math.round(h.price),
    alert: h.agent_action === 'ALERT' ? h.price : undefined,
  }));

  if (!data.length) {
    return (
      <div className="h-44 flex flex-col items-center justify-center text-slate-500 text-xs">
        <span>No price records yet.</span>
        <span className="text-slate-600 mt-1">Run a scan to generate time-series telemetry.</span>
      </div>
    );
  }

  const prices = data.map((d) => d.price);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const avg = Math.round(prices.reduce((a, b) => a + b, 0) / prices.length);

  return (
    <div className="space-y-3">
      {/* 4 compact stats */}
      <div className="grid grid-cols-4 gap-2 text-center">
        <div className="p-2 rounded-lg subpanel">
          <span className="text-[10px] text-slate-500 uppercase">Current</span>
          <p className="text-xs font-mono font-bold text-white mt-0.5">
            ₹{(task.current_price || 0).toLocaleString('en-IN')}
          </p>
        </div>
        <div className="p-2 rounded-lg subpanel">
          <span className="text-[10px] text-slate-500 uppercase">Lowest</span>
          <p className="text-xs font-mono font-bold text-emerald-400 mt-0.5">
            ₹{min.toLocaleString('en-IN')}
          </p>
        </div>
        <div className="p-2 rounded-lg subpanel">
          <span className="text-[10px] text-slate-500 uppercase">Highest</span>
          <p className="text-xs font-mono font-bold text-red-400 mt-0.5">
            ₹{max.toLocaleString('en-IN')}
          </p>
        </div>
        <div className="p-2 rounded-lg subpanel">
          <span className="text-[10px] text-slate-500 uppercase">Average</span>
          <p className="text-xs font-mono font-bold text-cyan-400 mt-0.5">
            ₹{avg.toLocaleString('en-IN')}
          </p>
        </div>
      </div>

      {/* Chart */}
      <div className="h-44 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="actPriceGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#7C3AED" stopOpacity={0.35} />
                <stop offset="95%" stopColor="#7C3AED" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis
              dataKey="time"
              tick={{ fill: '#667085', fontSize: 10 }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              tick={{ fill: '#667085', fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
            />
            <Tooltip
              contentStyle={{
                background: '#0E1016',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: '8px',
                fontSize: '11px',
              }}
              formatter={(val: number) => [`₹${val.toLocaleString('en-IN')}`, 'Price']}
            />
            {task.target_price && (
              <ReferenceLine
                y={task.target_price}
                stroke="#F59E0B"
                strokeDasharray="4 4"
                label={{ value: `Target ₹${task.target_price.toLocaleString('en-IN')}`, fill: '#F59E0B', fontSize: 9, position: 'insideTopRight' }}
              />
            )}
            <Area
              type="monotone"
              dataKey="price"
              stroke="#7C3AED"
              strokeWidth={2}
              fill="url(#actPriceGrad)"
              dot={(props) => {
                const { cx, cy, payload } = props;
                if (payload.alert) {
                  return <circle key={`dot-${cx}-${cy}`} cx={cx} cy={cy} r={5} fill="#EF4444" stroke="#FFFFFF" strokeWidth={1.5} />;
                }
                return <circle key={`dot-${cx}-${cy}`} cx={cx} cy={cy} r={0} />;
              }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default function ActivityLog() {
  const { data: logData, refetch: refetchLogs } = useAgentLogs(3000);
  const { events, refetch: refetchEvents } = useAgentEvents(3000);
  const { data: monitors } = useMonitors(5000);

  const [selectedTask, setSelectedTask] = useState<MonitoringTask | null>(null);
  const [filterLevel, setFilterLevel] = useState<'all' | 'ALERT' | 'ERROR'>('all');

  const logs = logData?.logs || [];
  const filteredLogs = filterLevel === 'all'
    ? logs
    : logs.filter((l) => l.level === filterLevel);

  const activeMonitor = selectedTask || (monitors && monitors[0]) || null;

  const agentTools = [
    { name: 'Product Search', desc: 'DummyJSON / Serper live extraction', status: true },
    { name: 'Price Normalizer', desc: 'Currency & unit normalization engine', status: true },
    { name: 'Price Comparator', desc: 'Threshold & meaningful change (>0.5%)', status: true },
    { name: 'Condition Engine', desc: '5-condition algorithmic evaluator', status: true },
    { name: 'AI Reasoning Engine', desc: 'Google Gemini 1.5 Flash structured reasoning', status: true },
    { name: 'Anti-Spam State Machine', desc: '5-state duplicate alert suppressor', status: true },
    { name: 'Notification Dispatcher', desc: 'Browser push + in-app telemetry', status: true },
  ];

  return (
    <div className="p-6 md:p-8 max-w-[1500px] mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Agent Activity & Reasoning</h1>
          <p className="text-slate-400 text-sm mt-1">
            Watch the autonomous agent observe, extract, reason, and take action in real-time
          </p>
        </div>
        <button
          onClick={() => {
            refetchLogs();
            refetchEvents();
          }}
          className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5"
        >
          <RefreshCw size={13} /> Refresh Stream
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left Column: Floating AI Agent Panel & Tools Checklist */}
        <div className="xl:col-span-1 space-y-4">
          {/* ✦ PriceGuard Agent Panel */}
          <div className="panel p-5 border-purple-500/25 bg-gradient-to-b from-[#141224] to-[#0E1016] space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-purple-600/30 text-purple-300">
                  <Bot size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white tracking-tight">PriceGuard Agent</h3>
                  <span className="text-[10px] text-purple-400 font-mono">AUTONOMOUS INSTANCE</span>
                </div>
              </div>
              <span className="chip chip-emerald text-[10px] font-mono">
                <span className="live-dot" /> ACTIVE
              </span>
            </div>

            {/* Current Activity Box */}
            <div className="p-3.5 rounded-xl bg-black/40 border border-white/6 space-y-2">
              <div className="flex items-center justify-between text-[11px] text-slate-500">
                <span>Current Goal</span>
                <span className="text-cyan-400 font-mono">Loop #{(events.length || 1) * 3}</span>
              </div>
              <p className="text-xs text-slate-200 font-medium leading-snug">
                {activeMonitor ? `Monitoring "${activeMonitor.product_name}"` : 'Autonomous background cycle standby'}
              </p>
              <div className="flex items-center gap-2 pt-1 text-[11px] text-slate-400">
                <span className="inline-flex gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                </span>
                <span className="truncate">Perceiving price points & comparing condition...</span>
              </div>
            </div>

            {/* Tools Checklist */}
            <div className="space-y-1.5 pt-2 border-t border-white/6">
              <span className="text-[10px] uppercase font-semibold tracking-wider text-slate-500 block mb-2">
                Autonomous Toolset
              </span>
              {agentTools.map((tool) => (
                <div key={tool.name} className="flex items-center justify-between text-xs py-1">
                  <div className="flex items-center gap-2 min-w-0">
                    <CheckCircle size={13} className="text-emerald-400 flex-shrink-0" />
                    <span className="text-slate-300 font-medium truncate">{tool.name}</span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-500 ml-2 flex-shrink-0">ONLINE</span>
                </div>
              ))}
            </div>
          </div>

          {/* Product Price History Selector */}
          <div className="panel p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase text-slate-400 tracking-wider">
                Price Telemetry Chart
              </span>
              <BarChart2 size={15} className="text-purple-400" />
            </div>

            {monitors && monitors.length > 0 && (
              <select
                value={activeMonitor?.id || ''}
                onChange={(e) => {
                  const m = monitors.find((item) => item.id === parseInt(e.target.value));
                  if (m) setSelectedTask(m);
                }}
                className="input-box text-xs"
              >
                {monitors.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.product_name} (₹{(m.current_price || 0).toLocaleString('en-IN')})
                  </option>
                ))}
              </select>
            )}

            {activeMonitor && <PriceHistoryChart task={activeMonitor} />}
          </div>
        </div>

        {/* Right 2 Columns: Animated Autonomous Timeline Feed */}
        <div className="xl:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity size={17} className="text-purple-400" />
              <h2 className="text-base font-bold text-white tracking-tight">Execution Timeline</h2>
              <span className="chip chip-purple text-xs font-mono">
                {filteredLogs.length} entries
              </span>
            </div>

            {/* Filter buttons */}
            <div className="flex gap-1 bg-[#11141B] p-1 rounded-lg border border-white/8">
              {(['all', 'ALERT', 'ERROR'] as const).map((lvl) => (
                <button
                  key={lvl}
                  onClick={() => setFilterLevel(lvl)}
                  className={`text-xs px-2.5 py-1 rounded font-medium transition-all ${
                    filterLevel === lvl
                      ? 'bg-purple-600/30 text-purple-300 border border-purple-500/30'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {lvl === 'all' ? 'All' : lvl}
                </button>
              ))}
            </div>
          </div>

          {/* Timeline Feed Container */}
          <div className="panel p-5 space-y-4 max-h-[680px] overflow-y-auto">
            {filteredLogs.length === 0 ? (
              <div className="py-16 text-center text-slate-500 text-xs">
                No activity entries logged yet. Add a monitor or click CHECK NOW to watch the agent think.
              </div>
            ) : (
              <div className="relative border-l border-white/10 ml-3 pl-6 space-y-6">
                {filteredLogs.map((log, i) => {
                  const isLatest = i === 0;
                  const isAlert = log.level === 'ALERT';
                  const isError = log.level === 'ERROR';

                  return (
                    <div key={log.id || i} className="relative group">
                      {/* Timeline dot */}
                      <div
                        className={`absolute -left-[31px] top-1 w-6 h-6 rounded-full flex items-center justify-center text-xs transition-all ${
                          isAlert
                            ? 'bg-red-950 border border-red-500 text-red-400 shadow-[0_0_12px_rgba(239,68,68,0.5)]'
                            : isError
                            ? 'bg-amber-950 border border-amber-500 text-amber-400'
                            : isLatest
                            ? 'bg-purple-950 border border-purple-500 text-purple-300 shadow-[0_0_12px_rgba(124,58,237,0.5)]'
                            : 'bg-[#11141B] border border-white/15 text-slate-400'
                        }`}
                      >
                        {log.emoji || (isAlert ? '🚨' : '●')}
                      </div>

                      {/* Content Card */}
                      <div className={`p-4 rounded-xl subpanel transition-all ${
                        isAlert ? 'border-red-500/30 bg-red-950/10' : 'hover:border-purple-500/20'
                      }`}>
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-xs font-semibold text-white leading-snug">
                            {log.message}
                          </p>
                          <span className="text-[10px] font-mono text-slate-500 flex-shrink-0">
                            {format(new Date(log.timestamp), 'HH:mm:ss')}
                          </span>
                        </div>

                        {log.details && (
                          <p className="text-xs text-slate-400 mt-1.5 leading-relaxed bg-black/30 p-2 rounded-lg border border-white/4 font-mono text-[11px]">
                            {log.details}
                          </p>
                        )}

                        <div className="flex items-center gap-2 mt-2 text-[10px] text-slate-500">
                          <span className="uppercase font-mono tracking-wider">{log.level}</span>
                          {log.task_id && <span>• Monitor #{log.task_id}</span>}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
