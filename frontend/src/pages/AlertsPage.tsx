// AlertsPage.tsx — Premium Alert & Notification Center
import React, { useState } from 'react';
import {
  Bell, CheckCircle, X, ExternalLink, TrendingDown, Shield,
  AlertTriangle, Check, BellRing, Sparkles, Filter
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { useAlerts, useNotifications, useBrowserNotifications } from '../hooks/useMonitoring';
import * as api from '../services/api';
import type { Alert } from '../types';

function fmtPrice(p?: number) {
  if (!p) return '—';
  return `₹${p.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

function AlertCard({ alert, onUpdate }: { alert: Alert; onUpdate: () => void }) {
  const [dismissed, setDismissed] = useState(false);

  const handleDismiss = async () => {
    try {
      await api.dismissAlert(alert.id);
      setDismissed(true);
      onUpdate();
    } catch (err) {
      console.error(err);
    }
  };

  const handleRead = async () => {
    try {
      await api.markAlertRead(alert.id);
      onUpdate();
    } catch (err) {
      console.error(err);
    }
  };

  if (dismissed) return null;

  const change = alert.price_change_percent || 0;
  const isPositiveAlert = alert.agent_decision === 'ALERT';

  return (
    <div
      className={`panel p-5 transition-all duration-200 ${
        !alert.is_read ? 'border-purple-500/40 bg-[#12141F]' : 'opacity-80'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className={`p-2.5 rounded-xl flex-shrink-0 ${
            isPositiveAlert ? 'bg-red-950/40 text-red-400 border border-red-500/30' : 'bg-slate-800 text-slate-400'
          }`}>
            {isPositiveAlert ? <AlertTriangle size={18} /> : <Shield size={18} />}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-white text-sm truncate">{alert.product_name}</h3>
              {!alert.is_read && (
                <span className="chip chip-purple text-[10px]">NEW</span>
              )}
              <span className={`chip text-[10px] ${
                isPositiveAlert ? 'chip-red' : 'chip-gray'
              }`}>
                {alert.agent_decision}
              </span>
            </div>
            <p className="text-slate-500 text-xs mt-0.5">
              Triggered {formatDistanceToNow(new Date(alert.timestamp))} ago ·{' '}
              {format(new Date(alert.timestamp), 'MMM d, HH:mm:ss')}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {!alert.is_read && (
            <button
              onClick={handleRead}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
              title="Mark as read"
            >
              <Check size={14} />
            </button>
          )}
          <button
            onClick={handleDismiss}
            className="p-1.5 text-slate-400 hover:text-red-400 rounded-lg hover:bg-white/5 transition-colors"
            title="Dismiss"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-3 gap-3 mt-4">
        <div className="p-3 rounded-xl subpanel">
          <span className="text-[10px] text-slate-500 uppercase">Current Price</span>
          <p className="text-base font-mono font-bold text-emerald-400 mt-0.5">
            {fmtPrice(alert.current_price)}
          </p>
        </div>
        <div className="p-3 rounded-xl subpanel">
          <span className="text-[10px] text-slate-500 uppercase">Target Condition</span>
          <p className="text-base font-mono font-bold text-purple-300 mt-0.5">
            {fmtPrice(alert.target_price)}
          </p>
        </div>
        <div className="p-3 rounded-xl subpanel">
          <span className="text-[10px] text-slate-500 uppercase">Price Drop</span>
          <p className={`text-base font-mono font-bold mt-0.5 flex items-center gap-0.5 ${
            change < 0 ? 'text-emerald-400' : 'text-slate-300'
          }`}>
            {change < 0 ? <TrendingDown size={14} /> : null}
            {change !== 0 ? `${Math.abs(change).toFixed(1)}%` : 'Target Met'}
          </p>
        </div>
      </div>

      {/* AI Decision Box */}
      {alert.agent_reason && (
        <div className="mt-3.5 p-3 rounded-xl bg-black/40 border border-white/6 space-y-1">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-purple-300 font-semibold flex items-center gap-1">
              ✦ AI Reasoning
            </span>
            {alert.confidence && (
              <span className="font-mono text-emerald-400">
                Confidence: {Math.round(alert.confidence * 100)}%
              </span>
            )}
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            {alert.agent_reason}
          </p>
        </div>
      )}
    </div>
  );
}

export default function AlertsPage() {
  const { data: alerts, refetch: refetchAlerts } = useAlerts(4000);
  const { data: notifications, refetch: refetchNotifs } = useNotifications(4000);
  const { permission, requestPermission } = useBrowserNotifications();
  const [tab, setTab] = useState<'alerts' | 'notifications'>('alerts');

  const activeAlerts = alerts?.filter((a) => !a.is_dismissed) || [];
  const unreadCount = activeAlerts.filter((a) => !a.is_read).length;

  const handleMarkAllRead = async () => {
    for (const a of activeAlerts.filter((item) => !item.is_read)) {
      await api.markAlertRead(a.id).catch(() => {});
    }
    refetchAlerts();
  };

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Alerts & Notifications</h1>
          <p className="text-slate-400 text-sm mt-1">
            Verified price drop trigger events and multi-channel delivery logs
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllRead}
            className="btn-secondary text-xs py-1.5 px-3 self-start sm:self-auto flex items-center gap-1.5"
          >
            <Check size={13} /> Mark All Read
          </button>
        )}
      </div>

      {/* Browser Notification Permission Banner */}
      {permission !== 'granted' && (
        <div className="panel p-4 border-amber-500/30 bg-amber-950/15 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-900/30 text-amber-400 flex-shrink-0">
              <BellRing size={18} />
            </div>
            <div>
              <h4 className="text-xs font-semibold text-amber-300">Enable Instant Browser Notifications</h4>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Receive immediate desktop alerts whenever the AI agent detects your price condition
              </p>
            </div>
          </div>
          <button
            onClick={requestPermission}
            className="btn-primary text-xs py-1.5 px-3 flex-shrink-0"
          >
            Enable Push
          </button>
        </div>
      )}

      {/* View Tabs */}
      <div className="flex gap-2 border-b border-white/8 pb-2">
        <button
          onClick={() => setTab('alerts')}
          className={`text-xs px-3.5 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1.5 ${
            tab === 'alerts'
              ? 'bg-purple-600/20 text-purple-200 border border-purple-500/30'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <span>Price Alerts</span>
          {unreadCount > 0 && (
            <span className="bg-purple-600 text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full">
              {unreadCount}
            </span>
          )}
        </button>
        <button
          onClick={() => setTab('notifications')}
          className={`text-xs px-3.5 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1.5 ${
            tab === 'notifications'
              ? 'bg-purple-600/20 text-purple-200 border border-purple-500/30'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <span>Channel Dispatches</span>
          <span className="text-slate-500 text-[10px] font-mono">
            ({notifications?.length || 0})
          </span>
        </button>
      </div>

      {/* Alerts View */}
      {tab === 'alerts' && (
        <div className="space-y-4">
          {activeAlerts.length === 0 ? (
            <div className="panel p-16 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-purple-900/20 border border-purple-500/20 text-purple-400 flex items-center justify-center mx-auto">
                <Bell size={22} />
              </div>
              <h3 className="text-sm font-semibold text-white">No Price Alerts Yet</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                The agent is continuously watching your tracked products. When a price condition is met, alerts appear here.
              </p>
            </div>
          ) : (
            activeAlerts.map((alert) => (
              <AlertCard key={alert.id} alert={alert} onUpdate={refetchAlerts} />
            ))
          )}
        </div>
      )}

      {/* Notifications Dispatch View */}
      {tab === 'notifications' && (
        <div className="space-y-3">
          {!notifications?.length ? (
            <div className="panel p-16 text-center text-slate-500 text-xs">
              No delivery events logged yet.
            </div>
          ) : (
            notifications.map((n) => (
              <div
                key={n.id}
                className={`panel p-4 flex items-start gap-3 transition-all ${
                  !n.is_read ? 'border-purple-500/25 bg-[#12141F]' : ''
                }`}
              >
                <div className="p-2 rounded-xl bg-purple-900/20 text-purple-400 border border-purple-500/20 flex-shrink-0">
                  <Bell size={15} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold text-white truncate">{n.title}</p>
                    <span className="text-[10px] text-slate-500 font-mono flex-shrink-0">
                      {formatDistanceToNow(new Date(n.timestamp))} ago
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    {n.body}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="chip chip-gray text-[10px] uppercase font-mono">
                      {n.notification_type}
                    </span>
                    {n.is_sent && (
                      <span className="text-[11px] text-emerald-400 flex items-center gap-0.5">
                        <Check size={11} /> Dispatched successfully
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
