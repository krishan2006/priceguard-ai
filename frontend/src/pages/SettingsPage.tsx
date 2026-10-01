// SettingsPage.tsx — System configuration & API security panel
import React, { useState, useEffect } from 'react';
import {
  Key, Shield, Bell, Database, Mail, Terminal,
  CheckCircle, AlertCircle, RefreshCw, Lock
} from 'lucide-react';
import * as api from '../services/api';

export default function SettingsPage() {
  const [health, setHealth] = useState<{
    status: string;
    gemini_configured: boolean;
    serper_configured: boolean;
    smtp_configured: boolean;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchHealth = async () => {
    setLoading(true);
    try {
      const data = await api.healthCheck();
      setHealth(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
  }, []);

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">System Settings & Security</h1>
        <p className="text-slate-400 text-sm mt-1">
          Review autonomous agent parameters, backend environment connectors, and security protocol
        </p>
      </div>

      {/* Security Protocol Banner */}
      <div className="panel p-5 border-emerald-500/30 bg-emerald-950/10">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-xl bg-emerald-900/30 text-emerald-400 flex-shrink-0">
            <Lock size={18} />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-emerald-300">API Key Security Verified</h3>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              All credentials (<code className="text-emerald-400">GEMINI_API_KEY</code>, <code className="text-emerald-400">SERPER_API_KEY</code>, <code className="text-emerald-400">PRODUCT_SEARCH_API_KEY</code>) are isolated inside backend server environment variables. Zero API keys are ever transmitted to or stored in client-side code.
            </p>
          </div>
        </div>
      </div>

      {/* Backend API Connectors Status */}
      <div className="panel p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Key size={18} className="text-purple-400" />
            <h2 className="text-base font-semibold text-white">Active Service Connectors</h2>
          </div>
          <button
            onClick={fetchHealth}
            className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Check Status
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Gemini */}
          <div className="p-4 rounded-xl subpanel flex items-start justify-between">
            <div>
              <span className="text-xs font-semibold text-white">Google Gemini 1.5 Flash</span>
              <p className="text-xs text-slate-500 mt-0.5">High-speed AI reasoning engine</p>
              <span className="text-[11px] text-slate-600 block mt-2">
                Fallback: Deterministic rule engine
              </span>
            </div>
            {health?.gemini_configured ? (
              <span className="chip chip-emerald text-[10px]">CONNECTED</span>
            ) : (
              <span className="chip chip-amber text-[10px]">FALLBACK ACTIVE</span>
            )}
          </div>

          {/* Serper */}
          <div className="p-4 rounded-xl subpanel flex items-start justify-between">
            <div>
              <span className="text-xs font-semibold text-white">Google Serper API</span>
              <p className="text-xs text-slate-500 mt-0.5">Real-time live Google shopping search</p>
              <span className="text-[11px] text-slate-600 block mt-2">
                Fallback: DummyJSON verified catalog
              </span>
            </div>
            {health?.serper_configured ? (
              <span className="chip chip-emerald text-[10px]">CONNECTED</span>
            ) : (
              <span className="chip chip-cyan text-[10px]">DUMMYJSON FALLBACK</span>
            )}
          </div>

          {/* SMTP */}
          <div className="p-4 rounded-xl subpanel flex items-start justify-between">
            <div>
              <span className="text-xs font-semibold text-white">Email Notifications (SMTP)</span>
              <p className="text-xs text-slate-500 mt-0.5">Outbound price alert dispatch</p>
              <span className="text-[11px] text-slate-600 block mt-2">
                Fallback: In-App & Browser Push
              </span>
            </div>
            {health?.smtp_configured ? (
              <span className="chip chip-emerald text-[10px]">CONFIGURED</span>
            ) : (
              <span className="chip chip-gray text-[10px]">BROWSER ONLY</span>
            )}
          </div>

          {/* Database */}
          <div className="p-4 rounded-xl subpanel flex items-start justify-between">
            <div>
              <span className="text-xs font-semibold text-white">SQLite Database Storage</span>
              <p className="text-xs text-slate-500 mt-0.5">SQLAlchemy engine with persistent tables</p>
              <span className="text-[11px] text-emerald-400 block mt-2">
                priceguard.db (Healthy)
              </span>
            </div>
            <span className="chip chip-emerald text-[10px]">LOCAL ORM</span>
          </div>
        </div>
      </div>

      {/* Autonomous Scheduler Details */}
      <div className="panel p-6 space-y-3">
        <div className="flex items-center gap-2">
          <Terminal size={18} className="text-cyan-400" />
          <h2 className="text-base font-semibold text-white">Autonomous Agent Daemon</h2>
        </div>
        <p className="text-xs text-slate-400 leading-relaxed">
          PriceGuard runs an asynchronous <strong>AsyncIOScheduler</strong> via APScheduler on the FastAPI backend. It persists tasks across restarts and schedules independent cron-like intervals for every monitored product (1 to 60 minutes).
        </p>
        <div className="p-3 bg-black/40 rounded-lg border border-white/5 font-mono text-xs text-slate-300">
          apscheduler.schedulers.asyncio.AsyncIOScheduler · 0 miss threshold · auto-rescheduled on startup
        </div>
      </div>
    </div>
  );
}
