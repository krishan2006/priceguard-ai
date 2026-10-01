// TypeScript types for PriceGuard AI

export interface MonitoringTask {
  id: number;
  product_id: number;
  product_name: string;
  condition: string;
  target_price?: number;
  min_price?: number;
  max_price?: number;
  discount_threshold?: number;
  price_drop_percent?: number;
  check_interval_minutes: number;
  notification_pref: string;
  is_active: boolean;
  is_paused: boolean;
  demo_mode: boolean;
  alert_state: AlertState;
  current_price?: number;
  previous_price?: number;
  last_checked?: string;
  next_check?: string;
  created_at: string;
  search_query?: string;
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
  product_locked: boolean;
}

export type AlertState =
  | 'NOT_TRIGGERED'
  | 'TRIGGERED'
  | 'ALERT_SENT'
  | 'WAITING_FOR_STATE_CHANGE'
  | 'TRIGGERED_AGAIN';

export interface PriceHistory {
  id: number;
  task_id: number;
  price: number;
  previous_price?: number;
  price_change?: number;
  price_change_percent?: number;
  source?: string;
  source_url?: string;
  agent_action?: string;
  agent_reason?: string;
  alert_state?: string;
  timestamp: string;
}

export interface Alert {
  id: number;
  task_id: number;
  product_name: string;
  current_price: number;
  target_price?: number;
  price_change_percent?: number;
  condition: string;
  agent_decision: string;
  agent_reason?: string;
  confidence?: number;
  is_read: boolean;
  is_dismissed: boolean;
  timestamp: string;
}

export interface Notification {
  id: number;
  alert_id: number;
  notification_type: string;
  title: string;
  body: string;
  is_sent: boolean;
  is_read: boolean;
  timestamp: string;
}

export interface AgentLog {
  id: number;
  task_id?: number;
  level: string;
  emoji?: string;
  message: string;
  details?: string;
  timestamp: string;
}

export interface AgentEvent {
  task_id?: number;
  emoji: string;
  message: string;
  level: string;
  details?: string;
  timestamp: string;
}

export interface Stats {
  active_monitors: number;
  products_tracked: number;
  alerts_triggered: number;
  avg_price_drop: number;
  last_agent_run?: string;
}

export interface SearchResult {
  id?: string;
  name: string;
  brand?: string;
  price: number;
  discount_percentage?: number;
  rating?: number;
  image_url?: string;
  source: string;
  source_url?: string;
  category?: string;
  description?: string;
}

export interface MonitoringCondition {
  value: string;
  label: string;
  description: string;
  fields: string[];
}

export const MONITORING_CONDITIONS: MonitoringCondition[] = [
  {
    value: 'price_below_target',
    label: 'Price Falls Below Target',
    description: 'Alert when price drops at or below your target',
    fields: ['target_price'],
  },
  {
    value: 'price_reaches_target',
    label: 'Price Reaches Target',
    description: 'Alert when price reaches exactly your target (±1%)',
    fields: ['target_price'],
  },
  {
    value: 'price_in_range',
    label: 'Price Enters Range',
    description: 'Alert when price enters your acceptable range',
    fields: ['min_price', 'max_price'],
  },
  {
    value: 'discount_reaches_percent',
    label: 'Discount Reaches %',
    description: 'Alert when discount percentage reaches your threshold',
    fields: ['discount_threshold'],
  },
  {
    value: 'price_drops_by_percent',
    label: 'Price Drops by %',
    description: 'Alert when price drops by this percentage from last check',
    fields: ['price_drop_percent'],
  },
];

export const ALERT_STATE_CONFIG: Record<AlertState, { label: string; color: string; bgColor: string; borderColor: string }> = {
  NOT_TRIGGERED: {
    label: 'Monitoring',
    color: 'text-slate-400',
    bgColor: 'bg-slate-700/50',
    borderColor: 'border-slate-500/30',
  },
  TRIGGERED: {
    label: 'Triggered',
    color: 'text-blue-400',
    bgColor: 'bg-blue-900/50',
    borderColor: 'border-blue-500/30',
  },
  ALERT_SENT: {
    label: 'Alert Sent',
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-900/50',
    borderColor: 'border-emerald-500/30',
  },
  WAITING_FOR_STATE_CHANGE: {
    label: 'Waiting Reset',
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-900/50',
    borderColor: 'border-yellow-500/30',
  },
  TRIGGERED_AGAIN: {
    label: 'Re-triggered',
    color: 'text-purple-400',
    bgColor: 'bg-purple-900/50',
    borderColor: 'border-purple-500/30',
  },
};
