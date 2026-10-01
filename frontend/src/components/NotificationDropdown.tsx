// NotificationDropdown.tsx — Top navigation notification center dropdown
import React, { useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell, CheckCircle, ExternalLink, X, TrendingDown,
  AlertTriangle, Shield, Check
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import type { Alert, Notification } from '../types';
import * as api from '../services/api';

interface NotificationDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  alerts: Alert[];
  notifications: Notification[];
  onRefresh: () => void;
}

export default function NotificationDropdown({
  isOpen,
  onClose,
  alerts,
  notifications,
  onRefresh,
}: NotificationDropdownProps) {
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const unreadAlerts = alerts.filter((a) => !a.is_read && !a.is_dismissed);

  const handleMarkAllRead = async () => {
    for (const a of unreadAlerts) {
      try {
        await api.markAlertRead(a.id);
      } catch (e) {
        // ignore
      }
    }
    onRefresh();
  };

  return (
    <div
      ref={dropdownRef}
      className="absolute right-0 top-12 w-96 bg-[#0E1016] border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-150"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/8 bg-[#11141B]">
        <div className="flex items-center gap-2">
          <Bell size={15} className="text-purple-400" />
          <span className="text-xs font-semibold text-white uppercase tracking-wider">
            Notifications
          </span>
          {unreadAlerts.length > 0 && (
            <span className="bg-purple-600 text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full">
              {unreadAlerts.length} new
            </span>
          )}
        </div>
        {unreadAlerts.length > 0 && (
          <button
            onClick={handleMarkAllRead}
            className="text-[11px] text-purple-400 hover:text-purple-300 font-medium flex items-center gap-1"
          >
            <Check size={12} /> Mark all read
          </button>
        )}
      </div>

      {/* List */}
      <div className="max-h-80 overflow-y-auto divide-y divide-white/5">
        {alerts.length === 0 ? (
          <div className="py-10 text-center text-slate-500 text-xs">
            No price alerts yet. They will appear here when an agent condition triggers.
          </div>
        ) : (
          alerts.slice(0, 5).map((a) => (
            <div
              key={a.id}
              onClick={() => {
                navigate('/alerts');
                onClose();
              }}
              className={`p-3.5 hover:bg-white/5 cursor-pointer transition-colors ${
                !a.is_read ? 'bg-purple-900/10' : ''
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2.5 min-w-0">
                  <div className={`p-1.5 rounded-lg flex-shrink-0 mt-0.5 ${
                    a.agent_decision === 'ALERT'
                      ? 'bg-red-900/30 text-red-400'
                      : 'bg-slate-800 text-slate-400'
                  }`}>
                    {a.agent_decision === 'ALERT' ? <AlertTriangle size={13} /> : <Shield size={13} />}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-white leading-tight truncate">
                      {a.product_name}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">
                      {a.agent_reason || `Reached target ₹${(a.target_price || 0).toLocaleString('en-IN')}`}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="font-mono text-xs font-bold text-emerald-400">
                        ₹{a.current_price.toLocaleString('en-IN')}
                      </span>
                      {a.price_change_percent && a.price_change_percent !== 0 && (
                        <span className="text-[10px] text-emerald-400 font-mono flex items-center">
                          <TrendingDown size={10} className="mr-0.5" />
                          {Math.abs(a.price_change_percent).toFixed(1)}%
                        </span>
                      )}
                      <span className="text-[10px] text-slate-500">
                        {formatDistanceToNow(new Date(a.timestamp))} ago
                      </span>
                    </div>
                  </div>
                </div>
                {!a.is_read && (
                  <span className="w-2 h-2 rounded-full bg-purple-500 flex-shrink-0 mt-1" />
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      <div className="p-2 border-t border-white/8 bg-[#0B0D12] text-center">
        <button
          onClick={() => {
            navigate('/alerts');
            onClose();
          }}
          className="w-full py-1.5 text-xs text-slate-400 hover:text-white font-medium rounded-lg hover:bg-white/5 transition-colors"
        >
          View All Alerts ({alerts.length})
        </button>
      </div>
    </div>
  );
}
