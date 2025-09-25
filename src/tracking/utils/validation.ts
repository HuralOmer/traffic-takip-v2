/**
 * Veri Doğrulama Şemaları
 * 
 * Bu dosya, tüm tracking verilerinin doğruluğunu kontrol etmek için
 * Zod kütüphanesi ile oluşturulmuş validation şemalarını içerir.
 * 
 * Şema Türleri:
 * - Base Event: Temel olay şeması
 * - Active Users: Kullanıcı varlık takibi
 * - Page Analytics: Sayfa analitikleri
 * - E-commerce: E-ticaret olayları
 * - Device Intelligence: Cihaz bilgileri
 * - User Behavior: Kullanıcı davranışları
 * - Performance: Performans metrikleri
 * - Meta CAPI: Meta Conversions API
 */

import { z } from 'zod';

/**
 * Temel Olay Şeması
 * Tüm tracking olaylarının ortak alanlarını tanımlar
 */
export const baseEventSchema = z.object({
  event_id: z.string().uuid(), // Benzersiz olay ID'si
  shop: z.string().min(1), // Mağaza adı (boş olamaz)
  occurred_at: z.date(), // Olay zamanı
  visitor_id: z.string().optional(), // Ziyaretçi ID'si (opsiyonel)
  session_id: z.string().uuid().optional(), // Oturum ID'si (opsiyonel)
});

/**
 * Aktif Kullanıcı Takibi Şemaları
 * Gerçek zamanlı kullanıcı varlık takibi için
 */

/**
 * Heartbeat Payload Şeması
 * Kullanıcının aktif olduğunu bildirmek için gönderilen veri
 */
export const heartbeatPayloadSchema = z.object({
  visitor_id: z.string().min(1), // Ziyaretçi ID'si (boş olamaz)
  session_id: z.string().uuid(), // Oturum ID'si (UUID formatında)
  page_path: z.string().min(1), // Sayfa yolu (boş olamaz)
  user_agent: z.string().optional(), // Tarayıcı bilgisi (opsiyonel)
  viewport: z.object({
    width: z.number().positive(), // Viewport genişliği (pozitif sayı)
    height: z.number().positive(), // Viewport yüksekliği (pozitif sayı)
  }).optional(), // Viewport bilgileri (opsiyonel)
});

// Page Analytics validation
export const pageViewSchema = z.object({
  view_id: z.string().uuid(),
  shop: z.string().min(1),
  occurred_at: z.date(),
  visitor_id: z.string().optional(),
  session_id: z.string().uuid().optional(),
  page_url: z.string().url(),
  page_path: z.string().min(1),
  landing: z.boolean().default(false),
  referrer_url: z.string().url().optional(),
  referrer_domain: z.string().optional(),
  utm_source: z.string().optional(),
  utm_medium: z.string().optional(),
  utm_campaign: z.string().optional(),
  utm_term: z.string().optional(),
  utm_content: z.string().optional(),
  gclid: z.string().optional(),
  fbclid: z.string().optional(),
  msclkid: z.string().optional(),
  device_type: z.enum(['desktop', 'tablet', 'mobile']).optional(),
  browser: z.string().optional(),
  os: z.string().optional(),
  screen_w: z.number().positive().optional(),
  screen_h: z.number().positive().optional(),
  scroll_depth_max: z.number().min(0).max(100).optional(),
  ended_at: z.date().optional(),
  duration_ms: z.number().positive().optional(),
  is_bounce: z.boolean().default(false),
});

// E-commerce validation
export const productViewEventSchema = baseEventSchema.extend({
  product_id: z.string().min(1),
  variant_id: z.string().optional(),
  product_title: z.string().min(1),
  variant_title: z.string().optional(),
  price: z.number().positive(),
  currency: z.string().length(3),
  sku: z.string().optional(),
  page_path: z.string().min(1),
  page_url: z.string().url().optional(),
  referrer_domain: z.string().optional(),
  utm_source: z.string().optional(),
  utm_medium: z.string().optional(),
  utm_campaign: z.string().optional(),
  utm_term: z.string().optional(),
  utm_content: z.string().optional(),
});

export const addToCartEventSchema = baseEventSchema.extend({
  product_id: z.string().min(1),
  variant_id: z.string().optional(),
  quantity: z.number().positive(),
  unit_price: z.number().positive(),
  value_total: z.number().positive(),
  currency: z.string().length(3),
  page_path: z.string().min(1),
  referrer_domain: z.string().optional(),
  utm_source: z.string().optional(),
  utm_medium: z.string().optional(),
  utm_campaign: z.string().optional(),
  utm_term: z.string().optional(),
  utm_content: z.string().optional(),
});

export const checkoutStepEventSchema = baseEventSchema.extend({
  checkout_id: z.string().optional(),
  step: z.enum(['contact', 'shipping', 'payment', 'review', 'other']),
  step_index: z.number().int().min(0).max(10).optional(),
  page_path: z.string().optional(),
});

export const orderCompletedEventSchema = baseEventSchema.extend({
  order_id: z.string().min(1),
  checkout_id: z.string().optional(),
  total_price: z.number().positive(),
  currency: z.string().length(3),
  referrer_domain: z.string().optional(),
  utm_source: z.string().optional(),
  utm_medium: z.string().optional(),
  utm_campaign: z.string().optional(),
});

// Device Intelligence validation
export const deviceInfoSchema = z.object({
  device_type: z.enum(['desktop', 'tablet', 'mobile']),
  browser_family: z.string().min(1),
  browser_major: z.number().int().positive(),
  os_family: z.string().min(1),
  os_major: z.number().int().positive(),
  is_bot: z.boolean().default(false),
  screen_w: z.number().positive(),
  screen_h: z.number().positive(),
  viewport_w: z.number().positive(),
  viewport_h: z.number().positive(),
  device_pixel_ratio: z.number().positive(),
  touch_support: z.boolean(),
  resolution_bucket: z.string().min(1),
  viewport_bucket: z.enum(['xs', 'sm', 'md', 'lg', 'xl']),
});

// User Behavior validation
export const scrollEventSchema = baseEventSchema.extend({
  page_path: z.string().min(1),
  scroll_y: z.number().min(0),
  scroll_percentage: z.number().min(0).max(100),
  viewport_height: z.number().positive(),
  page_height: z.number().positive(),
});

export const clickEventSchema = baseEventSchema.extend({
  page_path: z.string().min(1),
  element_selector: z.string().min(1),
  element_tag: z.string().min(1),
  element_id: z.string().optional(),
  element_class: z.string().optional(),
  element_text_sanit: z.string().optional(),
  element_text_hash: z.string().optional(),
  click_x: z.number().min(0),
  click_y: z.number().min(0),
});

export const interactionEventSchema = baseEventSchema.extend({
  page_path: z.string().min(1),
  interaction_type: z.enum(['hover', 'focus', 'blur', 'resize']),
  element_selector: z.string().min(1),
  duration_ms: z.number().positive().optional(),
  viewport_width: z.number().positive(),
  viewport_height: z.number().positive(),
});

// Performance validation
export const pageLoadEventSchema = baseEventSchema.extend({
  page_path: z.string().min(1),
  navigation_type: z.enum(['navigate', 'reload', 'back_forward']),
  device_type: z.enum(['desktop', 'tablet', 'mobile']).optional(),
  browser_family: z.string().optional(),
  os_family: z.string().optional(),
  ttfb_ms: z.number().positive().optional(),
  fcp_ms: z.number().positive().optional(),
  dom_content_loaded_ms: z.number().positive().optional(),
  dom_complete_ms: z.number().positive().optional(),
  load_event_ms: z.number().positive().optional(),
  transfer_size_bytes: z.number().positive().optional(),
  decoded_body_size_bytes: z.number().positive().optional(),
  effective_type: z.string().optional(),
  downlink_mbps: z.number().positive().optional(),
});

export const webVitalsEventSchema = baseEventSchema.extend({
  page_path: z.string().min(1),
  device_type: z.enum(['desktop', 'tablet', 'mobile']).optional(),
  browser_family: z.string().optional(),
  metric: z.enum(['LCP', 'INP', 'CLS', 'FCP', 'TTFB']),
  value: z.number().positive(),
  rating: z.enum(['good', 'needs_improvement', 'poor']),
  sample_rate: z.number().min(0).max(100).optional(),
  element_key: z.string().optional(),
});

export const errorEventSchema = baseEventSchema.extend({
  page_path: z.string().min(1),
  device_type: z.enum(['desktop', 'tablet', 'mobile']).optional(),
  browser_family: z.string().optional(),
  error_type: z.enum(['js', 'promise', 'resource', 'http']),
  message_sanit: z.string().optional(),
  message_hash: z.string().optional(),
  stack_hash: z.string().optional(),
  file_url: z.string().url().optional(),
  line: z.number().int().positive().optional(),
  col: z.number().int().positive().optional(),
  http_status: z.number().int().min(100).max(599).optional(),
  method: z.string().optional(),
  resource_url: z.string().url().optional(),
  is_fatal: z.boolean().default(false),
  sample_rate: z.number().min(0).max(100).optional(),
});

// Meta CAPI validation
export const metaEventPayloadSchema = z.object({
  event_name: z.enum(['ViewContent', 'AddToCart', 'InitiateCheckout', 'Purchase', 'Lead']),
  event_id: z.string().uuid(),
  event_time: z.number().positive(),
  action_source: z.string().default('website'),
  event_source_url: z.string().url().optional(),
  client_user_agent: z.string().optional(),
  client_ip_address: z.string().ip().optional(),
  fbp: z.string().optional(),
  fbc: z.string().optional(),
  custom_data: z.record(z.any()).optional(),
  user_data: z.record(z.string()).optional(),
});

// API validation helpers
export function validateEvent<T>(schema: z.ZodSchema<T>, data: unknown): T {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(`Validation error: ${error.errors.map(e => e.message).join(', ')}`);
    }
    throw error;
  }
}

export function validateEventSafe<T>(schema: z.ZodSchema<T>, data: unknown): { success: true; data: T } | { success: false; error: string } {
  try {
    const result = schema.parse(data);
    return { success: true, data: result };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors.map(e => e.message).join(', ') };
    }
    return { success: false, error: 'Unknown validation error' };
  }
}
