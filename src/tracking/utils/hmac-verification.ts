/**
 * Shopify HMAC Doğrulama Yardımcı Fonksiyonları
 * 
 * Bu modül Shopify'dan gelen isteklerin güvenliğini sağlamak için
 * HMAC (Hash-based Message Authentication Code) doğrulaması yapar.
 * 
 * Özellikler:
 * - App Proxy istekleri için HMAC doğrulaması
 * - Webhook istekleri için HMAC doğrulaması
 * - Timing-safe karşılaştırma (timing attack koruması)
 * - Query parametrelerinden güvenli shop bilgisi alma
 */

import crypto from 'node:crypto';

/**
 * Shopify App Proxy HMAC doğrulaması
 * 
 * Shopify, app proxy isteklerini forward ederken query string'e HMAC imzası ekler.
 * Bu fonksiyon bu imzayı doğrular ve isteğin gerçekten Shopify'dan geldiğini garanti eder.
 * 
 * @param query - Request query parametreleri
 * @param secret - Shopify API Secret
 * @returns HMAC doğrulaması başarılı mı?
 */
export function verifyProxyHmac(query: Record<string, any>, secret: string): boolean {
  try {
    // HMAC parametresini çıkar
    const { hmac, ...rest } = query;
    
    // HMAC yoksa doğrulama başarısız
    if (!hmac || typeof hmac !== 'string') {
      return false;
    }
    
    // Secret yoksa doğrulama başarısız
    if (!secret) {
      return false;
    }
    
    // Query parametrelerini sırala ve message oluştur
    const message = Object.keys(rest)
      .sort()
      .map(key => {
        const value = rest[key];
        if (Array.isArray(value)) {
          return `${key}=${value.join(',')}`;
        }
        return `${key}=${value ?? ''}`;
      })
      .join('&');
    
    // HMAC oluştur
    const digest = crypto
      .createHmac('sha256', secret)
      .update(message)
      .digest('hex');
    
    // Timing-safe karşılaştırma
    return crypto.timingSafeEqual(
      Buffer.from(digest, 'hex'),
      Buffer.from(hmac, 'hex')
    );
  } catch (error) {
    // Hata durumunda güvenli tarafta kal
    return false;
  }
}

/**
 * Shopify Webhook HMAC doğrulaması
 * 
 * Webhook istekleri için HMAC doğrulaması yapar.
 * HMAC header'da bulunur ve raw body ile oluşturulur.
 * 
 * @param body - Raw request body
 * @param signature - X-Shopify-Hmac-Sha256 header değeri
 * @param secret - Shopify Webhook Secret
 * @returns HMAC doğrulaması başarılı mı?
 */
export function verifyWebhookHmac(
  body: string | Buffer, 
  signature: string, 
  secret: string
): boolean {
  try {
    if (!signature || !secret) {
      return false;
    }
    
    // HMAC oluştur
    const digest = crypto
      .createHmac('sha256', secret)
      .update(body)
      .digest('base64');
    
    // Timing-safe karşılaştırma
    return crypto.timingSafeEqual(
      Buffer.from(digest, 'base64'),
      Buffer.from(signature, 'base64')
    );
  } catch (error) {
    return false;
  }
}

/**
 * Query parametrelerinden güvenli shop bilgisi al
 * 
 * HMAC doğrulaması yapıldıktan sonra shop bilgisini güvenle alabiliriz.
 * 
 * @param query - Request query parametreleri
 * @returns Shop domain'i (örn: my-store.myshopify.com) veya null
 */
export function getShopFromQuery(query: Record<string, any>): string | null {
  const shop = query['shop'];
  
  if (!shop || typeof shop !== 'string') {
    return null;
  }
  
  // Shop formatını doğrula (myshopify.com ile bitmeli)
  if (!shop.endsWith('.myshopify.com')) {
    return null;
  }
  
  return shop;
}

/**
 * HMAC doğrulama hata mesajları
 */
export const HMAC_ERRORS = {
  INVALID_HMAC: 'Invalid HMAC signature',
  MISSING_HMAC: 'Missing HMAC parameter',
  MISSING_SECRET: 'Missing API secret',
  INVALID_SHOP: 'Invalid shop format',
  VERIFICATION_FAILED: 'HMAC verification failed'
} as const;
