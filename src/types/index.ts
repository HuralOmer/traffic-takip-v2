/**
 * TypeScript Tip Tanımlamaları
 * 
 * Bu dosya, Shopify Trafik Takip Uygulaması için tüm tip tanımlamalarını içerir.
 * TypeScript'in tip güvenliğini sağlamak ve geliştirici deneyimini iyileştirmek için
 * kapsamlı interface'ler ve type'lar tanımlanmıştır.
 * 
 * İçerik:
 * - Temel event tipleri
 * - Tracking konfigürasyonu
 * - Aktif kullanıcı tipleri
 * - Oturum yönetimi tipleri
 * - Sayfa analitik tipleri
 * - E-ticaret tipleri
 * - Cihaz bilgileri tipleri
 * - Kullanıcı davranış tipleri
 * - Performans tipleri
 * - Meta CAPI tipleri
 * - Veritabanı tipleri
 * - API tipleri
 * - Utility tipleri
 */

/**
 * Temel Olay Interface'i
 * Tüm tracking olaylarının ortak alanlarını tanımlar
 */
export interface BaseEvent {
  event_id: string; // Benzersiz olay ID'si
  shop: string; // Mağaza adı
  occurred_at: Date; // Olay zamanı
  visitor_id?: string; // Ziyaretçi ID'si (opsiyonel)
  session_id?: string; // Oturum ID'si (opsiyonel)
}

/**
 * Tracking Konfigürasyon Interface'i
 * Sistem genelinde tracking ayarlarını tanımlar
 */
export interface TrackingConfig {
  enabled: boolean; // Tracking aktif mi?
  consent_required: boolean; // Kullanıcı onayı gerekli mi?
  data_retention_days: number; // Veri saklama süresi (gün)
  rate_limit_max: number; // Maksimum istek sayısı
  rate_limit_window: number; // Rate limit zaman penceresi (ms)
}

/**
 * Aktif Kullanıcı Takibi Tipleri
 * Gerçek zamanlı kullanıcı varlık takibi için
 */

/**
 * Kullanıcı Varlık Verisi Interface'i
 * Kullanıcının mevcut durumunu tanımlar
 */
export interface PresenceData {
  visitor_id: string; // Ziyaretçi ID'si
  session_id: string; // Oturum ID'si
  last_seen: number; // Son görülme zamanı (timestamp)
  page_path: string; // Mevcut sayfa yolu
}

export interface EMAResult {
  au_raw: number;
  au_ema_fast: number;
  au_ema_slow: number;
  trend: number;
  timestamp: number;
}

export interface HeartbeatPayload {
  visitor_id: string;
  session_id: string;
  page_path: string;
  user_agent?: string;
  viewport?: {
    width: number;
    height: number;
  };
}

// Sessions Types
export interface SessionData {
  session_id: string;
  shop: string;
  visitor_id: string;
  started_at: Date;
  ended_at?: Date;
  first_page?: string;
  last_page?: string;
  referrer?: string;
  user_agent?: string;
  ip_hash?: string;
}

export interface VisitorSessionCount {
  shop: string;
  visitor_id: string;
  total_sessions: number;
  first_seen: Date;
  last_session_started_at: Date;
}

// Page Analytics Types
export interface PageViewData {
  view_id: string;
  shop: string;
  occurred_at: Date;
  visitor_id?: string;
  session_id?: string;
  page_url: string;
  page_path: string;
  landing: boolean;
  referrer_url?: string;
  referrer_domain?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
  gclid?: string;
  fbclid?: string;
  msclkid?: string;
  device_type?: string;
  browser?: string;
  os?: string;
  screen_w?: number;
  screen_h?: number;
  scroll_depth_max?: number;
  ended_at?: Date;
  duration_ms?: number;
  is_bounce: boolean;
}

// E-commerce Types
export interface ProductViewEvent {
  event_id: string;
  shop: string;
  occurred_at: Date;
  visitor_id?: string;
  session_id?: string;
  product_id: string;
  variant_id?: string;
  product_title: string;
  variant_title?: string;
  price: number;
  currency: string;
  sku?: string;
  page_path: string;
  page_url?: string;
  referrer_domain?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
}

export interface AddToCartEvent {
  event_id: string;
  shop: string;
  occurred_at: Date;
  visitor_id?: string;
  session_id?: string;
  product_id: string;
  variant_id?: string;
  quantity: number;
  unit_price: number;
  value_total: number;
  currency: string;
  page_path: string;
  referrer_domain?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
}

export interface CheckoutStepEvent {
  event_id: string;
  shop: string;
  occurred_at: Date;
  visitor_id?: string;
  session_id?: string;
  checkout_id?: string;
  step: 'contact' | 'shipping' | 'payment' | 'review' | 'other';
  step_index?: number;
  page_path?: string;
}

export interface OrderCompletedEvent {
  event_id: string;
  shop: string;
  occurred_at: Date;
  visitor_id?: string;
  session_id?: string;
  checkout_id?: string;
  order_id: string;
  total_price: number;
  currency: string;
  referrer_domain?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
}

// Device Intelligence Types
export interface DeviceInfo {
  device_type: 'desktop' | 'tablet' | 'mobile';
  browser_family: string;
  browser_major: number;
  os_family: string;
  os_major: number;
  is_bot: boolean;
  screen_w: number;
  screen_h: number;
  viewport_w: number;
  viewport_h: number;
  device_pixel_ratio: number;
  touch_support: boolean;
  resolution_bucket: string;
  viewport_bucket: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
}

// User Behavior Types
export interface ScrollEvent {
  event_id: string;
  shop: string;
  occurred_at: Date;
  visitor_id?: string;
  session_id?: string;
  page_path: string;
  scroll_y: number;
  scroll_percentage: number;
  viewport_height: number;
  page_height: number;
}

export interface ClickEvent {
  event_id: string;
  shop: string;
  occurred_at: Date;
  visitor_id?: string;
  session_id?: string;
  page_path: string;
  element_selector: string;
  element_tag: string;
  element_id?: string;
  element_class?: string;
  element_text_sanit?: string;
  element_text_hash?: string;
  click_x: number;
  click_y: number;
}

export interface InteractionEvent {
  event_id: string;
  shop: string;
  occurred_at: Date;
  visitor_id?: string;
  session_id?: string;
  page_path: string;
  interaction_type: 'hover' | 'focus' | 'blur' | 'resize';
  element_selector: string;
  duration_ms?: number;
  viewport_width: number;
  viewport_height: number;
}

// Performance Types
export interface PageLoadEvent {
  event_id: string;
  shop: string;
  occurred_at: Date;
  visitor_id?: string;
  session_id?: string;
  page_path: string;
  navigation_type: 'navigate' | 'reload' | 'back_forward';
  device_type?: string;
  browser_family?: string;
  os_family?: string;
  ttfb_ms?: number;
  fcp_ms?: number;
  dom_content_loaded_ms?: number;
  dom_complete_ms?: number;
  load_event_ms?: number;
  transfer_size_bytes?: number;
  decoded_body_size_bytes?: number;
  effective_type?: string;
  downlink_mbps?: number;
}

export interface WebVitalsEvent {
  event_id: string;
  shop: string;
  occurred_at: Date;
  visitor_id?: string;
  session_id?: string;
  page_path: string;
  device_type?: string;
  browser_family?: string;
  metric: 'LCP' | 'INP' | 'CLS' | 'FCP' | 'TTFB';
  value: number;
  rating: 'good' | 'needs_improvement' | 'poor';
  sample_rate?: number;
  element_key?: string;
}

export interface ErrorEvent {
  event_id: string;
  shop: string;
  occurred_at: Date;
  visitor_id?: string;
  session_id?: string;
  page_path: string;
  device_type?: string;
  browser_family?: string;
  error_type: 'js' | 'promise' | 'resource' | 'http';
  message_sanit?: string;
  message_hash?: string;
  stack_hash?: string;
  file_url?: string;
  line?: number;
  col?: number;
  http_status?: number;
  method?: string;
  resource_url?: string;
  is_fatal: boolean;
  sample_rate?: number;
}

// Geographic & Time Types
export interface GeoInfo {
  country_code: string;
  region: string;
  city: string;
  timezone_iana: string;
  offset_minutes: number;
}

export interface TimeBuckets {
  shop_local_hour: number;
  shop_local_dow: number;
  visitor_local_hour?: number;
  visitor_local_dow?: number;
}

// Meta CAPI Types
export interface MetaEventPayload {
  event_name: 'ViewContent' | 'AddToCart' | 'InitiateCheckout' | 'Purchase' | 'Lead';
  event_id: string;
  event_time: number;
  action_source: string;
  event_source_url?: string;
  client_user_agent?: string;
  client_ip_address?: string;
  fbp?: string;
  fbc?: string;
  custom_data?: Record<string, any>;
  user_data?: Record<string, string>;
}

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T = any> extends ApiResponse<T[]> {
  pagination?: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}

// Database Types
export interface DatabaseConfig {
  url: string;
  anon_key: string;
  service_role_key: string;
}

export interface RedisConfig {
  url: string;
  token: string;
}

// Constants
export const TRACKING_CONSTANTS = {
  HEARTBEAT_MS: 10_000,
  TTL_MS: 30_000,
  TICK_MS: 5_000,
  EMA_TAU_FAST: 10,
  EMA_TAU_SLOW: 60,
  SESSION_TTL_MS: 30_000,
  SESSION_GAP_MS: 15 * 60 * 1000,
  BOUNCE_THRESHOLD_MS: 10_000,
  RATE_LIMIT_MAX: 1000,
  RATE_LIMIT_WINDOW: 60_000,
} as const;

export const DEVICE_BREAKPOINTS = {
  xs: 576,
  sm: 768,
  md: 992,
  lg: 1200,
  xl: 1400,
} as const;

export const WEB_VITALS_THRESHOLDS = {
  LCP: { good: 2500, needs_improvement: 4000 },
  INP: { good: 200, needs_improvement: 500 },
  CLS: { good: 0.1, needs_improvement: 0.25 },
  FCP: { good: 1800, needs_improvement: 3000 },
  TTFB: { good: 800, needs_improvement: 1800 },
} as const;
