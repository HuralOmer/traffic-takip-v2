/**
 * Active Users Tracking Types
 * 
 * Bu dosya Active Users modülü için kullanılan TypeScript tiplerini içerir.
 * Presence tracking, EMA algoritması ve heartbeat mekanizması için
 * gerekli interface'ler ve type'lar tanımlanmıştır.
 */

// Presence Data Types
export interface PresenceData {
  shop: string;
  visitor_id: string;
  session_id?: string | undefined;
  timestamp: number;
  page_path: string;
  user_agent?: string | undefined;
  ip_hash?: string | undefined;
}

export interface PresenceUpdate {
  shop: string;
  visitor_id: string;
  session_id?: string;
  timestamp: number;
  page_path: string;
  is_online: boolean;
}

// EMA Algorithm Types
export interface EMAResult {
  ema_fast: number;
  ema_slow: number;
  last_ts: number;
  trend: 'up' | 'down' | 'stable';
  trend_strength: number; // 0-1 arası
}

export interface EMAState {
  ema_fast: number;
  ema_slow: number;
  last_ts: number;
  last_au_raw: number;
}

// Heartbeat Types
export interface HeartbeatPayload {
  shop: string;
  visitor_id: string;
  session_id?: string;
  page_path: string;
  timestamp: number;
  user_agent?: string;
  viewport?: {
    width: number;
    height: number;
  };
  screen?: {
    width: number;
    height: number;
  };
}

export interface HeartbeatResponse {
  success: boolean;
  message?: string;
  next_heartbeat_in?: number; // milliseconds
}

// Active Users Metrics Types
export interface ActiveUsersMetrics {
  shop: string;
  timestamp: number;
  au_raw: number; // Raw active users count
  au_ema_fast: number; // Fast EMA value
  au_ema_slow: number; // Slow EMA value
  total_tabs: number; // Total active tabs
  window_seconds: number; // Time window
}

export interface DailyActiveUsersMetrics {
  shop: string;
  day: string; // YYYY-MM-DD format
  avg_au_raw: number; // Daily average
  p95_au_raw: number; // 95th percentile
  max_au_raw: number; // Peak concurrent users
  max_au_raw_at: string; // ISO timestamp
  avg_au_ema: number; // Average EMA
  minutes_observed: number; // Data points count
}

// Redis Data Types
export interface RedisPresenceData {
  visitor_id: string;
  session_id?: string;
  timestamp: number;
  page_path: string;
  user_agent?: string;
  ip_hash?: string;
}

export interface RedisEMAState {
  ema_fast: string; // Redis stores as string
  ema_slow: string;
  last_ts: string;
  last_au_raw: string;
}

// API Request/Response Types
export interface PresenceBeatRequest {
  shop: string;
  visitor_id: string;
  session_id?: string;
  page_path: string;
  user_agent?: string;
  viewport?: {
    width: number;
    height: number;
  };
  screen?: {
    width: number;
    height: number;
  };
}

export interface PresenceByeRequest {
  shop: string;
  visitor_id: string;
  session_id?: string;
  page_path: string;
}

export interface ActiveUsersStreamResponse {
  shop: string;
  timestamp: number;
  au_raw: number;
  au_ema_fast: number;
  au_ema_slow: number;
  trend: 'up' | 'down' | 'stable';
  trend_strength: number;
}

// Error Types
export interface ActiveUsersError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  timestamp: number;
}

// Configuration Types
export interface ActiveUsersConfig {
  heartbeat_interval_ms: number;
  ttl_ms: number;
  tick_interval_ms: number;
  ema_tau_fast: number;
  ema_tau_slow: number;
  enable_redis_pubsub: boolean;
  enable_database_logging: boolean;
  batch_size: number;
  max_retry_attempts: number;
}

// Event Types
export interface PresenceEvent {
  type: 'visitor_online' | 'visitor_offline' | 'session_start' | 'session_end';
  shop: string;
  visitor_id: string;
  session_id?: string;
  timestamp: number;
  data: Record<string, unknown>;
}

export interface EMACalculationEvent {
  shop: string;
  timestamp: number;
  au_raw: number;
  ema_fast: number;
  ema_slow: number;
  trend: 'up' | 'down' | 'stable';
  trend_strength: number;
}

// Utility Types
export type TrendDirection = 'up' | 'down' | 'stable';
export type PresenceStatus = 'online' | 'offline' | 'unknown';
export type EMACalculationMethod = 'exponential' | 'linear' | 'adaptive';

// Database Row Types
export interface ActiveUsersMinutelyRow {
  shop: string;
  bucket_ts: string; // ISO timestamp
  au_raw: number;
  total_tabs: number;
  au_ema_fast: number;
  au_ema_slow: number;
  window_seconds: number;
  created_at: string;
}

export interface ActiveUsersDailyRow {
  shop: string;
  day: string; // YYYY-MM-DD
  avg_au_raw: number;
  p95_au_raw: number;
  max_au_raw: number;
  max_au_raw_at: string;
  avg_au_ema: number;
  minutes_observed: number;
}

export interface ActiveUsersStateRow {
  shop: string;
  last_ts: string;
  ema_fast: number;
  ema_slow: number;
  last_au_raw: number;
}
