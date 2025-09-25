/**
 * Yardımcı Fonksiyonlar
 * 
 * Bu dosya, trafik takip sistemi için gerekli yardımcı fonksiyonları içerir.
 * UUID oluşturma, hash işlemleri, URL işlemleri, metin sanitizasyonu gibi
 * temel işlemler burada tanımlanmıştır.
 * 
 * Özellikler:
 * - UUID oluşturma
 * - Hash işlemleri (IP, metin)
 * - URL işlemleri (domain, path, UTM parametreleri)
 * - Metin sanitizasyonu (PII koruması)
 * - Zaman işlemleri
 * - Cihaz sınıflandırması
 * - Hata işleme
 * - Retry mekanizması
 */

import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';

/**
 * UUID Oluşturma Fonksiyonları
 * Her türlü benzersiz ID ihtiyacı için kullanılır
 */

/**
 * Olay ID'si oluştur
 * Her tracking olayı için benzersiz ID
 * 
 * @returns string - UUID v4 formatında benzersiz ID
 */
export function generateEventId(): string {
  return uuidv4();
}

/**
 * Oturum ID'si oluştur
 * Kullanıcı oturumu için benzersiz ID
 * 
 * @returns string - UUID v4 formatında benzersiz ID
 */
export function generateSessionId(): string {
  return uuidv4();
}

/**
 * Görüntüleme ID'si oluştur
 * Sayfa görüntüleme için benzersiz ID
 * 
 * @returns string - UUID v4 formatında benzersiz ID
 */
export function generateViewId(): string {
  return uuidv4();
}

/**
 * Hash İşlemleri
 * Güvenlik ve gizlilik için hash fonksiyonları
 */

/**
 * String hash'le
 * Belirtilen algoritma ile string'i hash'ler
 * 
 * @param input - Hash'lenecek string
 * @param algorithm - Hash algoritması (varsayılan: sha256)
 * @returns string - Hash edilmiş string
 */
export function hashString(input: string, algorithm: string = 'sha256'): string {
  return crypto.createHash(algorithm).update(input).digest('hex');
}

/**
 * IP adresini hash'le
 * Gizlilik koruması için IP adresini tuz ile hash'ler
 * 
 * @param ip - Hash'lenecek IP adresi
 * @returns string - Hash edilmiş IP adresi
 */
export function hashIP(ip: string): string {
  const salt = process.env['IP_HASH_SALT'] || 'default-salt';
  return hashString(`${ip}:${salt}`);
}

/**
 * Metni sanitize et (PII koruması)
 * Hassas bilgileri (email, telefon, kart numarası) maskeleyerek gizliliği korur
 * 
 * @param text - Sanitize edilecek metin
 * @param maxLength - Maksimum uzunluk
 * @returns string - Sanitize edilmiş metin
 */
export function sanitizeText(text: string, maxLength: number = 100): string {
  if (!text) return '';
  
  // PII (Kişisel Bilgiler) kalıplarını kaldır
  let sanitized = text
    .replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '[EMAIL]') // Email adresleri
    .replace(/\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g, '[PHONE]') // Telefon numaraları
    .replace(/\b\d{4}[-.]?\d{4}[-.]?\d{4}[-.]?\d{4}\b/g, '[CARD]') // Kart numaraları
    .replace(/\b[A-Za-z0-9]{8,}\b/g, (match) => match.length > 20 ? '[LONG_TEXT]' : match); // Uzun metinler
  
  // Çok uzunsa kırp
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength - 3) + '...';
  }
  
  return sanitized;
}

// URL utilities
export function extractDomain(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname || 'unknown';
  } catch {
    return 'unknown';
  }
}

export function normalizeUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    return `${urlObj.protocol}//${urlObj.hostname}${urlObj.pathname}`;
  } catch {
    return url;
  }
}

export function extractPath(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.pathname;
  } catch {
    return url;
  }
}

// UTM parameter extraction
export function extractUTMParams(url: string): {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
  gclid?: string;
  fbclid?: string;
  msclkid?: string;
} {
  try {
    const urlObj = new URL(url);
    const params = urlObj.searchParams;
    
    const result: {
      utm_source?: string;
      utm_medium?: string;
      utm_campaign?: string;
      utm_term?: string;
      utm_content?: string;
      gclid?: string;
      fbclid?: string;
      msclkid?: string;
    } = {};
    
    const utm_source = params.get('utm_source');
    if (utm_source) result.utm_source = utm_source;
    
    const utm_medium = params.get('utm_medium');
    if (utm_medium) result.utm_medium = utm_medium;
    
    const utm_campaign = params.get('utm_campaign');
    if (utm_campaign) result.utm_campaign = utm_campaign;
    
    const utm_term = params.get('utm_term');
    if (utm_term) result.utm_term = utm_term;
    
    const utm_content = params.get('utm_content');
    if (utm_content) result.utm_content = utm_content;
    
    const gclid = params.get('gclid');
    if (gclid) result.gclid = gclid;
    
    const fbclid = params.get('fbclid');
    if (fbclid) result.fbclid = fbclid;
    
    const msclkid = params.get('msclkid');
    if (msclkid) result.msclkid = msclkid;
    
    return result;
  } catch {
    return {};
  }
}

// Channel classification
export function classifyChannel(referrer?: string, utm_source?: string, utm_medium?: string): {
  channel: string;
  source_bucket: string;
  is_organic: boolean;
} {
  if (!referrer && !utm_source) {
    return { channel: 'direct', source_bucket: 'direct', is_organic: false };
  }

  if (utm_source) {
    const source = utm_source.toLowerCase();
    const medium = utm_medium?.toLowerCase() || '';
    
    if (medium === 'cpc' || medium === 'paid') {
      return { channel: 'paid', source_bucket: source, is_organic: false };
    }
    
    if (medium === 'email') {
      return { channel: 'email', source_bucket: 'email', is_organic: false };
    }
    
    if (medium === 'social') {
      return { channel: 'social', source_bucket: source, is_organic: false };
    }
    
    return { channel: 'other', source_bucket: source, is_organic: false };
  }

  if (referrer) {
    const domain = extractDomain(referrer).toLowerCase();
    
    // Domain geçerli değilse unknown olarak işaretle
    if (domain === 'unknown') {
      return { channel: 'other', source_bucket: 'unknown', is_organic: false };
    }
    
    // Search engines
    if (['google.com', 'google.co', 'bing.com', 'yahoo.com', 'duckduckgo.com'].includes(domain)) {
      return { channel: 'organic', source_bucket: 'search', is_organic: true };
    }
    
    // Social media
    if (['facebook.com', 'instagram.com', 'twitter.com', 'linkedin.com', 'tiktok.com', 'youtube.com'].includes(domain)) {
      const domainParts = domain.split('.');
      return { channel: 'social', source_bucket: domainParts[0] || domain, is_organic: true };
    }
    
    // Referral
    return { channel: 'referral', source_bucket: domain, is_organic: true };
  }

  return { channel: 'other', source_bucket: 'unknown', is_organic: false };
}

// Time utilities
export function getCurrentTimestamp(): number {
  return Math.floor(Date.now() / 1000);
}

export function getCurrentTimestampMs(): number {
  return Date.now();
}

export function formatDate(date: Date): string {
  const isoString = date.toISOString();
  const parts = isoString.split('T');
  return parts[0] || isoString;
}

export function getDayOfWeek(date: Date): number {
  return date.getDay(); // 0 = Sunday, 1 = Monday, etc.
}

export function getHourOfDay(date: Date): number {
  return date.getHours();
}

// Device utilities
export function getViewportBucket(width: number): 'xs' | 'sm' | 'md' | 'lg' | 'xl' {
  if (width < 576) return 'xs';
  if (width < 768) return 'sm';
  if (width < 992) return 'md';
  if (width < 1200) return 'lg';
  return 'xl';
}

export function getResolutionBucket(width: number, height: number): string {
  if (width >= 2560 && height >= 1440) return '>=2560x1440';
  if (width >= 1920 && height >= 1080) return '>=1920x1080';
  if (width >= 1600 && height >= 900) return '1600x900';
  if (width >= 1536 && height >= 864) return '1536x864';
  if (width >= 1366 && height >= 768) return '1366x768';
  return '<1280x720';
}

// Scroll utilities
export function calculateScrollPercentage(scrollY: number, pageHeight: number, viewportHeight: number): number {
  const maxScroll = Math.max(0, pageHeight - viewportHeight);
  if (maxScroll === 0) return 0;
  
  const percentage = (scrollY / maxScroll) * 100;
  return Math.min(100, Math.max(0, Math.round(percentage * 100) / 100));
}

// Error utilities
export function sanitizeErrorMessage(message: string): string {
  return sanitizeText(message, 200);
}

export function createErrorHash(message: string, stack?: string): string {
  const content = `${message}:${stack || ''}`;
  return hashString(content);
}

// Rate limiting utilities
export function createRateLimitKey(identifier: string, windowMs: number): string {
  const window = Math.floor(Date.now() / windowMs);
  return `rate_limit:${identifier}:${window}`;
}

// Batch processing utilities
export function chunkArray<T>(array: T[], chunkSize: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }
  return chunks;
}

export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Retry utilities
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxAttempts: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      
      if (attempt === maxAttempts) {
        throw lastError;
      }
      
      const delayMs = baseDelay * Math.pow(2, attempt - 1);
      await delay(delayMs);
    }
  }
  
  throw lastError!;
}
