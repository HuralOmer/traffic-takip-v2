/**
 * Sessions Tracking Constants
 * 
 * Bu dosya sessions tracking modülü için gerekli sabitleri tanımlar.
 * Offline → Online geçiş mantığı, session TTL'leri ve ticker interval'ları.
 */

// Session TTL (Time To Live) - 30 saniye
export const SESSION_TTL_MS = 30_000;

// Session Gap - 15 dakika (offline'dan sonra yeni session başlatma süresi)
export const SESSION_GAP_MS = 15 * 60 * 1000;

// Ticker Interval - 10 saniye (session cleanup ve monitoring)
export const TICKER_INTERVAL_MS = 10_000;

// Redis Key Patterns
export const REDIS_KEYS = {
  // Visitor presence tracking
  PRESENCE_VISITORS: 'presence:v',
  
  // Session presence tracking
  PRESENCE_SESSIONS: 'presence:s',
  
  // Visitor session counts
  VISITOR_SESSION_COUNTS: 'vis:session-count',
  
  // Session distribution histogram
  SESSION_DISTRIBUTION: 'hist:sessions',
  
  // Current active session per visitor
  CURRENT_SESSION: 'visitor:current_session',
  
  // Session metadata
  SESSION_METADATA: 'session:meta',
} as const;

// Session States
export const SESSION_STATES = {
  ACTIVE: 'active',
  ENDED: 'ended',
  TIMEOUT: 'timeout',
} as const;

// Session Distribution Buckets
export const SESSION_DISTRIBUTION_BUCKETS = [
  1, 2, 3, 4, 5, 6, 7, 8, 9, 10,
  15, 20, 25, 30, 40, 50, 60, 70, 80, 90, 100,
  150, 200, 250, 300, 400, 500, 600, 700, 800, 900, 1000,
] as const;

// Max Session Count (for distribution)
export const MAX_SESSION_COUNT = 1000;

// Session Cleanup Thresholds
export const CLEANUP_THRESHOLDS = {
  // Session'ı timeout olarak işaretle
  SESSION_TIMEOUT_MS: SESSION_TTL_MS,
  
  // Eski session'ları temizle
  OLD_SESSION_CLEANUP_MS: 24 * 60 * 60 * 1000, // 24 saat
  
  // Redis key'leri temizle
  REDIS_CLEANUP_MS: 7 * 24 * 60 * 60 * 1000, // 7 gün
} as const;

// Database Table Names
export const DB_TABLES = {
  SESSIONS: 'sessions',
  VISITOR_SESSION_COUNTS: 'visitor_session_counts',
} as const;

// Session Analytics Time Ranges
export const ANALYTICS_RANGES = {
  TODAY: 'today',
  LAST_7_DAYS: '7d',
  LAST_30_DAYS: '30d',
  LAST_90_DAYS: '90d',
} as const;

// Default Session Values
export const DEFAULT_SESSION_VALUES = {
  FIRST_PAGE: '/',
  REFERRER: 'direct',
  USER_AGENT: 'unknown',
  IP_HASH: 'unknown',
} as const;

// Session Validation Rules
export const SESSION_VALIDATION = {
  MIN_SESSION_DURATION_MS: 1000, // 1 saniye
  MAX_SESSION_DURATION_MS: 24 * 60 * 60 * 1000, // 24 saat
  MAX_PAGE_PATH_LENGTH: 2048,
  MAX_REFERRER_LENGTH: 2048,
  MAX_USER_AGENT_LENGTH: 1024,
} as const;

// Error Messages
export const ERROR_MESSAGES = {
  INVALID_SESSION_ID: 'Invalid session ID',
  SESSION_NOT_FOUND: 'Session not found',
  SESSION_ALREADY_ENDED: 'Session already ended',
  INVALID_VISITOR_ID: 'Invalid visitor ID',
  INVALID_SHOP: 'Invalid shop domain',
  SESSION_TIMEOUT: 'Session timeout',
  REDIS_ERROR: 'Redis operation failed',
  DATABASE_ERROR: 'Database operation failed',
} as const;

// Success Messages
export const SUCCESS_MESSAGES = {
  SESSION_STARTED: 'Session started successfully',
  SESSION_ENDED: 'Session ended successfully',
  SESSION_UPDATED: 'Session updated successfully',
  SESSION_CLEANED: 'Session cleaned successfully',
} as const;
