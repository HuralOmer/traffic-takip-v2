/**
 * Sessions Tracking Module
 * 
 * Bu dosya sessions tracking modülünün ana export dosyasıdır.
 * Tüm session yönetimi, analitik ve utility fonksiyonlarını export eder.
 */

// Main Classes
export { SessionManager } from './session-manager';

// Types
export type {
  SessionData,
  VisitorSessionCount,
  SessionDistribution,
  SessionAnalytics,
  SessionStartPayload,
  SessionEndPayload,
  SessionUpdatePayload,
  SessionHeartbeatPayload,
  SessionStartResponse,
  SessionEndResponse,
  SessionAnalyticsResponse,
  SessionDistributionResponse,
  SessionMetrics,
  SessionCleanupResult,
  SessionFilterOptions,
  SessionStatistics,
  SessionState,
  AnalyticsTimeRange,
  SessionValidationResult
} from './types';

// Constants
export {
  SESSION_TTL_MS,
  SESSION_GAP_MS,
  TICKER_INTERVAL_MS,
  REDIS_KEYS,
  SESSION_STATES,
  SESSION_DISTRIBUTION_BUCKETS,
  MAX_SESSION_COUNT,
  CLEANUP_THRESHOLDS,
  DB_TABLES,
  ANALYTICS_RANGES,
  DEFAULT_SESSION_VALUES,
  SESSION_VALIDATION,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES
} from './constants';

// Lua Scripts
export {
  LUA_SCRIPTS,
  SCRIPT_KEY_MAPPINGS,
  SESSION_START_SCRIPT,
  SESSION_END_SCRIPT,
  SESSION_UPDATE_SCRIPT,
  SESSION_CLEANUP_SCRIPT,
  GET_ACTIVE_SESSIONS_SCRIPT,
  GET_SESSION_DISTRIBUTION_SCRIPT
} from './lua-scripts';

// Utility Functions
export * from './utils';

// Default export
export { SessionManager as default } from './session-manager';
