/**
 * Active Users Tracking Constants
 * 
 * Bu dosya Active Users modülü için kullanılan sabit değerleri içerir.
 * EMA algoritması, presence tracking ve heartbeat mekanizması için gerekli
 * zaman aralıkları ve eşik değerleri tanımlanmıştır.
 * "active user calisiyor. fakat temaya kodlar manuel enjekte eiliyor"
 */

// Heartbeat ve Presence Tracking Constants
export const HEARTBEAT_MS = 10_000; // 10 saniye - client heartbeat interval
export const TTL_MS = 30_000; // 30 saniye - presence TTL
export const TICK_MS = 5_000; // 5 saniye - server tick interval

// EMA Algorithm Constants
export const EMA_TAU_FAST = 10; // 10 saniye - fast EMA time constant
export const EMA_TAU_SLOW = 60; // 60 saniye - slow EMA time constant

// Redis Key Patterns
export const REDIS_KEYS = {
  PRESENCE_VISITORS: 'presence:v', // ZSET: visitor tracking
  PRESENCE_SESSIONS: 'presence:s', // ZSET: session tracking
  EMA_STATE: 'presence:ema', // HSET: EMA state
  PUBSUB_CHANNEL: 'channel:presence', // PUBSUB: dashboard updates
} as const;

// Database Table Names
export const DB_TABLES = {
  ACTIVE_USERS_MINUTELY: 'active_users_minutely',
  ACTIVE_USERS_DAILY: 'active_users_daily',
  ACTIVE_USERS_STATE: 'active_users_state',
} as const;

// EMA Calculation Constants
export const EMA_MIN_ALPHA = 0.001; // Minimum alpha value
export const EMA_MAX_ALPHA = 0.5; // Maximum alpha value

// Presence Tracking Constants
export const PRESENCE_CLEANUP_INTERVAL_MS = 60_000; // 1 dakika
export const PRESENCE_BATCH_SIZE = 100; // Batch processing size

// Error Handling Constants
export const MAX_RETRY_ATTEMPTS = 3;
export const RETRY_DELAY_MS = 1_000; // 1 saniye

// Validation Constants
export const MIN_SHOP_ID_LENGTH = 3;
export const MAX_SHOP_ID_LENGTH = 100;
export const MIN_VISITOR_ID_LENGTH = 8;
export const MAX_VISITOR_ID_LENGTH = 64;

// Performance Constants
export const CACHE_TTL_SECONDS = 300; // 5 dakika
export const BATCH_PROCESSING_DELAY_MS = 100; // 100ms delay between batches
