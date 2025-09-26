/**
 * Tracking Sabitleri ve Konfigürasyonları
 * 
 * Bu dosya, trafik takip sistemi için kullanılan tüm sabitleri ve
 * konfigürasyon değerlerini içerir. Sistem genelinde tutarlılık sağlamak
 * ve kolay yapılandırma için merkezi bir yer sağlar.
 * 
 * İçerik:
 * - Tracking sabitleri (heartbeat, TTL, EMA parametreleri)
 * - Cihaz breakpoint'leri
 * - Web Vitals eşik değerleri
 * - Çözünürlük bucket'ları
 * - Tarayıcı ve işletim sistemi aileleri
 * - Redis anahtar kalıpları
 * - Veritabanı tablo isimleri
 * - API endpoint'leri
 * - Hata ve başarı mesajları
 */

/**
 * Temel Tracking Sabitleri
 * Sistem genelinde kullanılan zaman aşımları ve limitler
 */
export const TRACKING_CONSTANTS = {
  // Heartbeat ve presence takibi
  HEARTBEAT_MS: 10_000, // Heartbeat gönderim aralığı (10 saniye)
  TTL_MS: 30_000, // Veri yaşam süresi (30 saniye)
  TICK_MS: 5_000, // Sistem tick aralığı (5 saniye)
  
  // EMA (Exponential Moving Average) parametreleri
  EMA_TAU_FAST: 10, // Hızlı EMA zaman sabiti (10 saniye)
  EMA_TAU_SLOW: 60, // Yavaş EMA zaman sabiti (60 saniye)
  
  // Oturum yönetimi
  SESSION_TTL_MS: 30_000, // Oturum yaşam süresi (30 saniye)
  SESSION_GAP_MS: 15 * 60 * 1000, // Yeni oturum için minimum boşluk (15 dakika)
  
  // Bounce tespiti
  BOUNCE_THRESHOLD_MS: 10_000, // Bounce eşik değeri (10 saniye)
  
  // Rate limiting
  RATE_LIMIT_MAX: 1000, // Maksimum istek sayısı
  RATE_LIMIT_WINDOW: 60_000, // Rate limit zaman penceresi (1 dakika)
  
  // Batch işleme
  BATCH_SIZE: 50, // Batch boyutu
  BATCH_TIMEOUT_MS: 5_000, // Batch timeout (5 saniye)
  
  // Retry konfigürasyonu
  MAX_RETRIES: 3, // Maksimum retry sayısı
  RETRY_DELAY_MS: 1000, // Retry gecikmesi (1 saniye)
  
  // Veri saklama
  DATA_RETENTION_DAYS: 365, // Veri saklama süresi (365 gün)
  
  // Performans eşikleri
  SLOW_QUERY_MS: 1000, // Yavaş sorgu eşiği (1 saniye)
  MEMORY_WARNING_MB: 500, // Bellek uyarı eşiği (500 MB)
  MEMORY_CRITICAL_MB: 1000, // Bellek kritik eşiği (1 GB)
} as const;

/**
 * Cihaz Breakpoint'leri
 * Responsive tasarım için kullanılan ekran boyutu eşikleri
 */
export const DEVICE_BREAKPOINTS = {
  xs: 576, // Extra small (mobil)
  sm: 768, // Small (tablet)
  md: 992, // Medium (küçük desktop)
  lg: 1200, // Large (desktop)
  xl: 1400, // Extra large (büyük desktop)
} as const;

/**
 * Web Vitals Eşik Değerleri
 * Google Core Web Vitals için performans eşikleri
 */
export const WEB_VITALS_THRESHOLDS = {
  LCP: { good: 2500, needs_improvement: 4000 }, // Largest Contentful Paint (ms)
  INP: { good: 200, needs_improvement: 500 }, // Interaction to Next Paint (ms)
  CLS: { good: 0.1, needs_improvement: 0.25 }, // Cumulative Layout Shift (score)
  FCP: { good: 1800, needs_improvement: 3000 }, // First Contentful Paint (ms)
  TTFB: { good: 800, needs_improvement: 1800 }, // Time to First Byte (ms)
} as const;

// Resolution buckets
export const RESOLUTION_BUCKETS = [
  '>=2560x1440',
  '>=1920x1080',
  '1600x900',
  '1536x864',
  '1366x768',
  '<1280x720',
] as const;

// Browser families
export const BROWSER_FAMILIES = [
  'Chrome',
  'Safari',
  'Firefox',
  'Edge',
  'Opera',
  'Internet Explorer',
  'Other',
] as const;

// Operating system families
export const OS_FAMILIES = [
  'Windows',
  'macOS',
  'iOS',
  'Android',
  'Linux',
  'Other',
] as const;

// Device types
export const DEVICE_TYPES = ['desktop', 'tablet', 'mobile'] as const;

// Interaction types
export const INTERACTION_TYPES = ['hover', 'focus', 'blur', 'resize'] as const;

// Error types
export const ERROR_TYPES = ['js', 'promise', 'resource', 'http'] as const;

// Meta event types
export const META_EVENT_TYPES = [
  'ViewContent',
  'AddToCart',
  'InitiateCheckout',
  'Purchase',
  'Lead',
] as const;

// Checkout steps
export const CHECKOUT_STEPS = [
  'contact',
  'shipping',
  'payment',
  'review',
  'other',
] as const;

// Channels
export const CHANNELS = [
  'direct',
  'organic',
  'paid',
  'social',
  'email',
  'referral',
  'other',
] as const;

// Source buckets
export const SOURCE_BUCKETS = [
  'google',
  'facebook',
  'instagram',
  'tiktok',
  'youtube',
  'twitter',
  'linkedin',
  'email',
  'newsletter',
  'search',
  'direct',
  'other',
] as const;

// Heatmap configuration
export const HEATMAP_CONFIG = {
  TILE_SIZE: 50,
  GRID_WIDTH: 50,
  GRID_HEIGHT: 100,
  INTENSITY_SCALE: 1,
} as const;

// Redis key patterns
export const REDIS_KEYS = {
  PRESENCE_VISITOR: (shop: string) => `presence:v:${shop}`,
  PRESENCE_SESSION: (shop: string) => `presence:s:${shop}`,
  EMA_STATE: (shop: string) => `presence:ema:${shop}`,
  CURRENT_SESSION: (shop: string, visitorId: string) => 
    `visitor:current_session:${shop}:${visitorId}`,
  RATE_LIMIT: (identifier: string) => `rate_limit:${identifier}`,
  SLIDING_RATE_LIMIT: (identifier: string) => `sliding_rate_limit:${identifier}`,
  BURST_PROTECTION: (identifier: string) => `burst:${identifier}`,
  DISTRIBUTED_RATE_LIMIT: (identifier: string) => `distributed_rate_limit:${identifier}`,
} as const;

// Database table names
export const DB_TABLES = {
  // Active users
  ACTIVE_USERS_MINUTELY: 'active_users_minutely',
  ACTIVE_USERS_DAILY: 'active_users_daily',
  ACTIVE_USERS_STATE: 'active_users_state',
  
  // Sessions
  SESSIONS: 'sessions',
  VISITOR_SESSION_COUNTS: 'visitor_session_counts',
  
  // Page analytics
  PAGE_VIEWS: 'page_views',
  PAGE_DWELL_EVENTS: 'page_dwell_events',
  SESSION_ATTRIBUTION: 'session_attribution',
  PAGE_DAILY_ANALYTICS: 'page_daily_analytics',
  
  // E-commerce
  PRODUCT_VIEW_EVENTS: 'product_view_events',
  ADD_TO_CART_EVENTS: 'add_to_cart_events',
  CHECKOUT_STARTED_EVENTS: 'checkout_started_events',
  CHECKOUT_STEP_EVENTS: 'checkout_step_events',
  ORDER_COMPLETED_EVENTS: 'order_completed_events',
  ORDER_LINE_ITEMS: 'order_line_items',
  PRODUCT_DAILY_METRICS: 'product_daily_metrics',
  SHOP_DAILY_METRICS: 'shop_daily_metrics',
  
  // User behavior
  SCROLL_EVENTS: 'scroll_events',
  CLICK_EVENTS: 'click_events',
  PAGE_INTERACTIONS: 'page_interactions',
  HEATMAP_TILES_DAILY: 'heatmap_tiles_daily',
  
  // Device intelligence
  DEVICE_DAILY_METRICS: 'device_daily_metrics',
  RESOLUTION_DAILY_METRICS: 'resolution_daily_metrics',
  PAGE_DEVICE_DAILY_METRICS: 'page_device_daily_metrics',
  DEVICE_PROFILES: 'device_profiles',
  
  // Geographic & time
  GEO_DAILY_METRICS: 'geo_daily_metrics',
  TIMEZONE_DAILY_METRICS: 'timezone_daily_metrics',
  SHOP_HOURLY_METRICS: 'shop_hourly_metrics',
  SHOP_DOW_METRICS: 'shop_dow_metrics',
  GEO_ENRICHMENT_CACHE: 'geo_enrichment_cache',
  
  // Performance
  PAGE_LOAD_EVENTS: 'page_load_events',
  WEB_VITALS_EVENTS: 'web_vitals_events',
  ERROR_EVENTS: 'error_events',
  VITALS_HISTOGRAMS_DAILY: 'vitals_histograms_daily',
  PERF_PAGE_DAILY: 'perf_page_daily',
  PERF_SHOP_DAILY: 'perf_shop_daily',
  ERRORS_DAILY_METRICS: 'errors_daily_metrics',
  
  // Meta CAPI
  META_CAPI_CONFIG: 'meta_capi_config',
  CAPI_OUTBOX: 'capi_outbox',
  CAPI_ATTEMPTS: 'capi_attempts',
  CAPI_DEAD_LETTER: 'capi_dead_letter',
  CAPI_DAILY_METRICS: 'capi_daily_metrics',
  CAPI_USER_HASH_CACHE: 'capi_user_hash_cache',
} as const;

// API endpoints
export const API_ENDPOINTS = {
  // Presence
  PRESENCE_BEAT: '/presence/beat',
  PRESENCE_BYE: '/presence/bye',
  PRESENCE_STREAM: '/presence/stream',
  
  // Page analytics
  COLLECT_PAGE_VIEW: '/collect/page_view',
  COLLECT_PAGE_CLOSE: '/collect/page_close',
  ANALYTICS_PAGE: '/api/analytics/page/:path',
  ANALYTICS_DAILY: '/api/analytics/daily',
  
  // E-commerce
  COLLECT_PRODUCT_VIEW: '/collect/product_view',
  COLLECT_ADD_TO_CART: '/collect/add_to_cart',
  COLLECT_CHECKOUT_START: '/collect/checkout_start',
  COLLECT_CHECKOUT_STEP: '/collect/checkout_step',
  WEBHOOKS_ORDERS: '/webhooks/orders',
  ECOMMERCE_PRODUCTS: '/api/ecommerce/products/:id',
  ECOMMERCE_DAILY: '/api/ecommerce/daily',
  
  // User behavior
  EVENTS_SCROLL: '/api/events/scroll',
  EVENTS_CLICK: '/api/events/click',
  EVENTS_INTERACTION: '/api/events/interaction',
  HEATMAP: '/api/heatmap/:page',
  
  // Device intelligence
  COLLECT_DEVICE_INFO: '/collect/device_info',
  DEVICE_ANALYTICS_DAILY: '/api/device-analytics/daily',
  DEVICE_ANALYTICS_BROWSERS: '/api/device-analytics/browsers',
  DEVICE_ANALYTICS_RESOLUTIONS: '/api/device-analytics/resolutions',
  
  // Performance
  COLLECT_PERF: '/api/collect/perf',
  COLLECT_VITALS: '/api/collect/vitals',
  COLLECT_ERROR: '/api/collect/error',
  PERFORMANCE_PAGE: '/api/performance/page/:path',
  PERFORMANCE_SHOP: '/api/performance/shop',
  PERFORMANCE_ERRORS: '/api/performance/errors',
  PERFORMANCE_HISTOGRAM: '/api/performance/histogram',
  
  // Meta CAPI
  META_VIEW_CONTENT: '/collect/meta/view-content',
  META_ADD_TO_CART: '/collect/meta/add-to-cart',
  META_INITIATE_CHECKOUT: '/collect/meta/initiate-checkout',
  META_PURCHASE: '/collect/meta/purchase',
  META_LEAD: '/collect/meta/lead',
  META_CONVERSIONS: '/api/meta/conversions',
  META_EMQ: '/api/meta/emq',
  META_WEBHOOK: '/webhooks/meta',
  META_TEST_EVENTS: '/api/meta/test-events',
  
  // Health and metrics
  HEALTH: '/health',
  METRICS: '/metrics',
} as const;

// Error messages
export const ERROR_MESSAGES = {
  VALIDATION_ERROR: 'Validation error',
  RATE_LIMIT_EXCEEDED: 'Rate limit exceeded',
  INVALID_SHOP: 'Invalid shop',
  INVALID_SESSION: 'Invalid session',
  DATABASE_ERROR: 'Database error',
  REDIS_ERROR: 'Redis error',
  UNAUTHORIZED: 'Unauthorized',
  FORBIDDEN: 'Forbidden',
  NOT_FOUND: 'Not found',
  INTERNAL_ERROR: 'Internal server error',
  // Scope error messages
  INSUFFICIENT_SCOPE: 'Insufficient scope',
  SCOPE_REQUIRED: 'Scope required',
  SCOPE_ERROR: 'Scope error',
  PERMISSION_DENIED: 'Permission denied',
  ACCESS_DENIED: 'Access denied',
} as const;

// Success messages
export const SUCCESS_MESSAGES = {
  EVENT_RECORDED: 'Event recorded successfully',
  SESSION_CREATED: 'Session created successfully',
  SESSION_ENDED: 'Session ended successfully',
  DATA_AGGREGATED: 'Data aggregated successfully',
  HEALTH_CHECK_PASSED: 'Health check passed',
} as const;
