/**
 * Global Type Definitions
 */

// Re-export database interfaces
export * from '../database/interfaces/database.interface';

// Application specific types
export interface AppConfig {
  port: number;
  nodeEnv: string;
  databaseType: string;
  enableAnalytics: boolean;
  enableRealTimeMetrics: boolean;
  enablePrivacyCompliance: boolean;
}

export interface TrackingEvent {
  type: string;
  shop: string;
  visitor_id: string;
  session_id: string;
  page_path: string;
  page_title: string;
  referrer: string;
  timestamp: number;
  user_agent: string;
  lang: string;
  [key: string]: any;
}

export interface SessionData {
  shop: string;
  visitor_id: string;
  page_path: string;
  referrer: string;
  user_agent: string;
  ip_hash: string;
}

export interface PageViewData {
  shop: string;
  visitor_id: string;
  session_id: string;
  page_path: string;
  page_title: string;
  referrer: string;
  timestamp: number;
  user_agent: string;
  lang: string;
}

export interface HeartbeatData {
  shop: string;
  visitor_id: string;
  session_id: string;
  since_ms: number;
  timestamp: number;
}

// Event Types
export enum EventType {
  SESSION_START = 'session_start',
  SESSION_END = 'session_end',
  PAGE_VIEW = 'page_view',
  PAGE_UNLOAD = 'page_unload',
  ADD_TO_CART = 'add_to_cart',
  CHECKOUT_START = 'checkout_start',
  PURCHASE = 'purchase',
  CLICK = 'click',
  SCROLL = 'scroll',
  VIEWPORT = 'viewport',
  HEARTBEAT = 'heartbeat'
}

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface HealthCheckResponse {
  status: string;
  timestamp: string;
  uptime: number;
  databases: {
    postgresql: any;
    clickhouse: any;
    redis: any;
  };
  version: string;
}

// Multi-tenant types
export interface TenantContext {
  shop_id: string;
  domain: string;
  plan_id: string;
  features: string[];
  limits: any;
}

// Privacy types
export interface ConsentData {
  shop_id: string;
  visitor_id: string;
  consent_given: boolean;
  consent_timestamp: number;
  consent_version: string;
  ip_hash: string;
  user_agent_hash: string;
}

// Analytics types
export interface AnalyticsQuery {
  shop_id: string;
  start_date: Date;
  end_date: Date;
  granularity: 'hour' | 'day' | 'week' | 'month';
  filters?: {
    event_types?: string[];
    user_ids?: string[];
    session_ids?: string[];
    page_paths?: string[];
  };
}

export interface AnalyticsResult {
  data: any[];
  total: number;
  query: AnalyticsQuery;
  generated_at: Date;
}
