/**
 * Sessions Tracking Types
 * 
 * Bu dosya sessions tracking modülü için TypeScript type tanımlarını içerir.
 * Session data, visitor session counts, distribution ve analytics types.
 */

import { SESSION_STATES, ANALYTICS_RANGES } from './constants';

/**
 * Session Data Interface
 * Supabase sessions tablosu için temel session verisi
 */
export interface SessionData {
  session_id: string;
  shop: string;
  visitor_id: string;
  started_at: Date;
  ended_at?: Date;
  first_page?: string;
  last_page?: string;
  referrer?: string;
  ua?: string;
  ip_hash?: string;
  duration_ms?: number;
  page_count?: number;
  is_ended?: boolean;
}

/**
 * Visitor Session Count Interface
 * Supabase visitor_session_counts tablosu için veri
 */
export interface VisitorSessionCount {
  shop: string;
  visitor_id: string;
  total_sessions: number;
  first_seen: Date;
  last_session_started_at: Date;
  last_session_ended_at?: Date;
  avg_session_duration_ms?: number;
  max_session_duration_ms?: number;
  min_session_duration_ms?: number;
}

/**
 * Session Distribution Interface
 * Session sayılarına göre visitor dağılımı
 */
export interface SessionDistribution {
  bucket: number;
  visitor_count: number;
  percentage: number;
  cumulative_count: number;
  cumulative_percentage: number;
}

/**
 * Session Analytics Interface
 * Session analitik verileri
 */
export interface SessionAnalytics {
  total_sessions: number;
  active_sessions: number;
  ended_sessions: number;
  avg_session_duration_ms: number;
  median_session_duration_ms: number;
  max_session_duration_ms: number;
  min_session_duration_ms: number;
  session_distribution: SessionDistribution[];
  top_pages: Array<{
    page: string;
    session_count: number;
    percentage: number;
  }>;
  top_referrers: Array<{
    referrer: string;
    session_count: number;
    percentage: number;
  }>;
}

/**
 * Session Start Payload
 * Yeni session başlatma için gerekli veri
 */
export interface SessionStartPayload {
  shop: string;
  visitor_id: string;
  page_path: string;
  referrer?: string;
  user_agent?: string;
  ip_hash?: string;
  timestamp?: number;
}

/**
 * Session End Payload
 * Session sonlandırma için gerekli veri
 */
export interface SessionEndPayload {
  shop: string;
  visitor_id: string;
  session_id: string;
  last_page?: string;
  timestamp?: number;
}

/**
 * Session Update Payload
 * Session güncelleme için gerekli veri
 */
export interface SessionUpdatePayload {
  shop: string;
  visitor_id: string;
  session_id: string;
  page_path: string;
  timestamp?: number;
}

/**
 * Session Heartbeat Payload
 * Session heartbeat için gerekli veri
 */
export interface SessionHeartbeatPayload {
  shop: string;
  visitor_id: string;
  session_id: string;
  page_path: string;
  timestamp?: number;
}

/**
 * Session Response Interface
 * API response'ları için
 */
export interface SessionResponse {
  success: boolean;
  message?: string;
  data?: any;
  error?: string;
}

/**
 * Session Start Response
 * Session başlatma response'u
 */
export interface SessionStartResponse extends SessionResponse {
  session_id?: string;
  is_new_session?: boolean;
  previous_session_id?: string;
  session_gap_ms?: number;
}

/**
 * Session End Response
 * Session sonlandırma response'u
 */
export interface SessionEndResponse extends SessionResponse {
  session_id: string;
  duration_ms?: number;
  page_count?: number;
}

/**
 * Session Analytics Response
 * Session analitik response'u
 */
export interface SessionAnalyticsResponse extends SessionResponse {
  analytics?: SessionAnalytics;
  time_range?: string;
  shop?: string;
}

/**
 * Session Distribution Response
 * Session dağılım response'u
 */
export interface SessionDistributionResponse extends SessionResponse {
  distribution?: SessionDistribution[];
  total_visitors?: number;
  total_sessions?: number;
}

/**
 * Redis Session Data
 * Redis'te saklanan session verisi
 */
export interface RedisSessionData {
  session_id: string;
  visitor_id: string;
  started_at: number;
  last_activity: number;
  page_count: number;
  first_page: string;
  last_page: string;
  referrer?: string;
  user_agent?: string;
  ip_hash?: string;
}

/**
 * Session State
 * Session durumu
 */
export type SessionState = typeof SESSION_STATES[keyof typeof SESSION_STATES];

/**
 * Analytics Time Range
 * Analitik zaman aralığı
 */
export type AnalyticsTimeRange = typeof ANALYTICS_RANGES[keyof typeof ANALYTICS_RANGES];

/**
 * Session Filter Options
 * Session filtreleme seçenekleri
 */
export interface SessionFilterOptions {
  shop?: string;
  visitor_id?: string;
  started_after?: Date;
  started_before?: Date;
  ended_after?: Date;
  ended_before?: Date;
  min_duration_ms?: number;
  max_duration_ms?: number;
  page_path?: string;
  referrer?: string;
  user_agent?: string;
  state?: SessionState;
  limit?: number;
  offset?: number;
  order_by?: 'started_at' | 'ended_at' | 'duration_ms' | 'page_count';
  order_direction?: 'asc' | 'desc';
}

/**
 * Session Metrics
 * Session metrikleri
 */
export interface SessionMetrics {
  total_sessions: number;
  active_sessions: number;
  ended_sessions: number;
  timeout_sessions: number;
  avg_duration_ms: number;
  median_duration_ms: number;
  max_duration_ms: number;
  min_duration_ms: number;
  avg_pages_per_session: number;
  max_pages_per_session: number;
  min_pages_per_session: number;
  bounce_rate: number;
  return_visitor_rate: number;
  new_visitor_rate: number;
}

/**
 * Session Cleanup Result
 * Session temizleme sonucu
 */
export interface SessionCleanupResult {
  cleaned_sessions: number;
  cleaned_visitors: number;
  cleaned_redis_keys: number;
  errors: string[];
  duration_ms: number;
}

/**
 * Session Validation Result
 * Session doğrulama sonucu
 */
export interface SessionValidationResult {
  is_valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Session Statistics
 * Session istatistikleri
 */
export interface SessionStatistics {
  period: string;
  total_sessions: number;
  unique_visitors: number;
  avg_sessions_per_visitor: number;
  session_distribution: SessionDistribution[];
  hourly_distribution: Array<{
    hour: number;
    session_count: number;
  }>;
  daily_distribution: Array<{
    date: string;
    session_count: number;
  }>;
  weekly_distribution: Array<{
    week: string;
    session_count: number;
  }>;
}
