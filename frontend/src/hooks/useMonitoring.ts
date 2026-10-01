// Custom hooks for PriceGuard AI data fetching and polling
import { useState, useEffect, useCallback, useRef } from 'react';
import * as api from '../services/api';
import type { MonitoringTask, Alert, Notification, AgentLog, Stats } from '../types';

// Hook for polling data at an interval
function usePolling<T>(
  fetchFn: () => Promise<T>,
  interval: number = 5000,
  immediate: boolean = true
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval>>();

  const fetch = useCallback(async () => {
    try {
      const result = await fetchFn();
      setData(result);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [fetchFn]);

  useEffect(() => {
    if (immediate) fetch();
    intervalRef.current = setInterval(fetch, interval);
    return () => clearInterval(intervalRef.current);
  }, [fetch, interval, immediate]);

  return { data, loading, error, refetch: fetch };
}

// Monitors hook
export function useMonitors(pollInterval = 5000) {
  const fetchFn = useCallback(() => api.listMonitors(), []);
  return usePolling<MonitoringTask[]>(fetchFn, pollInterval);
}

// Stats hook
export function useStats(pollInterval = 5000) {
  const fetchFn = useCallback(() => api.getStats(), []);
  return usePolling<Stats>(fetchFn, pollInterval);
}

// Alerts hook
export function useAlerts(pollInterval = 5000) {
  const fetchFn = useCallback(() => api.getAlerts(), []);
  return usePolling<Alert[]>(fetchFn, pollInterval);
}

// Notifications hook
export function useNotifications(pollInterval = 5000) {
  const fetchFn = useCallback(() => api.getNotifications(), []);
  return usePolling<Notification[]>(fetchFn, pollInterval);
}

// Agent logs hook
export function useAgentLogs(pollInterval = 3000) {
  const fetchFn = useCallback(() => api.getAgentLogs(100), []);
  return usePolling<{ logs: AgentLog[]; count: number }>(fetchFn, pollInterval);
}

// Agent live events stream hook
export function useAgentEvents(pollInterval = 3000) {
  const [events, setEvents] = useState<AgentLog[]>([]);
  const [loading, setLoading] = useState(false);

  const fetch = useCallback(async () => {
    try {
      const res = await api.getAgentEvents();
      if (res && res.events) {
        setEvents(res.events);
      }
    } catch (e) {
      // silently handle
    }
  }, []);

  useEffect(() => {
    fetch();
    const id = setInterval(fetch, pollInterval);
    return () => clearInterval(id);
  }, [fetch, pollInterval]);

  return { events, loading, refetch: fetch };
}

// Price history hook for a specific task
export function usePriceHistory(taskId: number | null, pollInterval = 5000) {
  const [history, setHistory] = useState<import('../types').PriceHistory[]>([]);
  const [loading, setLoading] = useState(false);

  const fetch = useCallback(async () => {
    if (!taskId) return;
    setLoading(true);
    try {
      const data = await api.getPriceHistory(taskId);
      setHistory(data.slice().reverse()); // Chronological order for chart
    } catch (err) {
      console.error('Failed to fetch price history:', err);
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  useEffect(() => {
    fetch();
    const id = setInterval(fetch, pollInterval);
    return () => clearInterval(id);
  }, [fetch, pollInterval]);

  return { history, loading, refetch: fetch };
}

// Browser notification permission
export function useBrowserNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const previousAlertCount = useRef(0);

  useEffect(() => {
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }
  }, []);

  const requestPermission = useCallback(async () => {
    if ('Notification' in window) {
      const perm = await Notification.requestPermission();
      setPermission(perm);
      return perm;
    }
    return 'denied';
  }, []);

  const sendBrowserNotification = useCallback((title: string, body: string) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, {
        body,
        icon: '/vite.svg',
        badge: '/vite.svg',
      });
    }
  }, []);

  // Auto-send browser notifications for new alerts
  const watchAlerts = useCallback((alerts: Alert[]) => {
    const unread = alerts.filter((a) => !a.is_read).length;
    if (unread > previousAlertCount.current) {
      const newest = alerts.find((a) => !a.is_read);
      if (newest) {
        sendBrowserNotification(
          `🚨 PriceGuard: ${newest.product_name}`,
          `Price is now ₹${newest.current_price.toLocaleString('en-IN')}. ${newest.agent_reason || ''}`
        );
      }
    }
    previousAlertCount.current = unread;
  }, [sendBrowserNotification]);

  return { permission, requestPermission, sendBrowserNotification, watchAlerts };
}
