// API service layer for PriceGuard AI
import axios from 'axios';
import type {
  MonitoringTask,
  PriceHistory,
  Alert,
  Notification,
  AgentLog,
  Stats,
  SearchResult,
} from '../types';

const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

// Request interceptor for logging
api.interceptors.request.use((config) => {
  console.debug(`[API] ${config.method?.toUpperCase()} ${config.url}`);
  return config;
});

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const msg = error.response?.data?.detail || error.message || 'Request failed';
    console.error(`[API Error] ${msg}`);
    return Promise.reject(new Error(msg));
  }
);

// Health
export const checkHealth = () =>
  api.get('/health').then((r) => r.data);

// Stats
export const getStats = (): Promise<Stats> =>
  api.get('/stats').then((r) => r.data);

// Products
export const searchProducts = (query: string): Promise<{ results: SearchResult[]; count: number }> =>
  api.get('/products/search', { params: { q: query } }).then((r) => r.data);

// Monitoring Tasks
export const createMonitor = (data: {
  product_name: string;
  condition: string;
  target_price?: number;
  min_price?: number;
  max_price?: number;
  discount_threshold?: number;
  price_drop_percent?: number;
  check_interval_minutes: number;
  notification_pref: string;
  demo_mode: boolean;
  search_query?: string;
  // Locked product identity
  locked_product_name?: string;
  locked_brand?: string;
  locked_model?: string;
  locked_generation?: string;
  locked_storage?: string;
  locked_ram?: string;
  locked_color?: string;
  locked_source?: string;
  locked_source_url?: string;
  locked_match_score?: number;
  product_locked?: boolean;
}): Promise<MonitoringTask> =>
  api.post('/monitor', data).then((r) => r.data);

export const listMonitors = (): Promise<MonitoringTask[]> =>
  api.get('/monitor').then((r) => r.data);

export const getMonitor = (id: number): Promise<MonitoringTask> =>
  api.get(`/monitor/${id}`).then((r) => r.data);

export const deleteMonitor = (id: number) =>
  api.delete(`/monitor/${id}`).then((r) => r.data);

export const forceCheck = (id: number): Promise<{ result: Record<string, unknown>; task: MonitoringTask }> =>
  api.post(`/monitor/${id}/check`).then((r) => r.data);

export const checkMonitor = forceCheck;

export const pauseMonitor = (id: number) =>
  api.post(`/monitor/${id}/pause`).then((r) => r.data);

export const resumeMonitor = (id: number) =>
  api.post(`/monitor/${id}/resume`).then((r) => r.data);

export const getPriceHistory = (id: number, limit = 50): Promise<PriceHistory[]> =>
  api.get(`/monitor/${id}/history`, { params: { limit } }).then((r) => r.data);

// Alerts
export const getAlerts = (limit = 50): Promise<Alert[]> =>
  api.get('/alerts', { params: { limit } }).then((r) => r.data);

export const markAlertRead = (id: number) =>
  api.post(`/alerts/${id}/read`).then((r) => r.data);

export const dismissAlert = (id: number) =>
  api.post(`/alerts/${id}/dismiss`).then((r) => r.data);

// Notifications
export const getNotifications = (limit = 50): Promise<Notification[]> =>
  api.get('/notifications', { params: { limit } }).then((r) => r.data);

export const markNotificationRead = (id: number) =>
  api.post(`/notifications/${id}/read`).then((r) => r.data);

// Agent Logs
export const getAgentLogs = (limit = 100): Promise<{ logs: AgentLog[]; count: number }> =>
  api.get('/agent/logs', { params: { limit } }).then((r) => r.data);

export const getAgentEvents = (): Promise<{ events: AgentLog[] }> =>
  api.get('/agent/events').then((r) => r.data);

// Demo
export const simulatePriceDrop = (taskId: number) =>
  api.post('/demo/simulate-price-drop', { task_id: taskId }).then((r) => r.data);

// Health
export const healthCheck = () =>
  api.get('/health').then((r) => r.data);
