/**
 * Rate Limiting (İstek Sınırlama) Sistemi
 * 
 * Bu dosya, API isteklerini sınırlamak ve DDoS saldırılarını önlemek için
 * çeşitli rate limiting stratejileri sağlar. Redis tabanlı olarak çalışır.
 * 
 * Rate Limiting Türleri:
 * - Temel Rate Limiting: Sabit pencere boyutu
 * - Sliding Window: Kaydırmalı pencere
 * - Burst Protection: Ani trafik artışlarını koruma
 * - Distributed: Dağıtık sistemler için
 * 
 * Önceden Yapılandırılmış Limiterlar:
 * - IP Rate Limiter: IP bazında sınırlama
 * - Shop Rate Limiter: Mağaza bazında sınırlama
 * - API Key Rate Limiter: API anahtarı bazında sınırlama
 */

import { redis } from './redis';

/**
 * Rate Limiting Konfigürasyon Interface'i
 */
export interface RateLimitConfig {
  max: number; // Maksimum istek sayısı
  windowMs: number; // Zaman penceresi (milisaniye)
  keyGenerator?: (identifier: string) => string; // Anahtar oluşturucu fonksiyon
}

export class RateLimiter {
  private config: RateLimitConfig;

  constructor(config: RateLimitConfig) {
    this.config = config;
  }

  async checkLimit(identifier: string): Promise<{
    allowed: boolean;
    remaining: number;
    resetTime: number;
  }> {
    const key = this.config.keyGenerator 
      ? this.config.keyGenerator(identifier)
      : `rate_limit:${identifier}`;

    const current = await redis.getClient().incr(key);
    
    if (current === 1) {
      await redis.getClient().expire(key, Math.ceil(this.config.windowMs / 1000));
    }

    const remaining = Math.max(0, this.config.max - current);
    const ttl = await redis.getClient().ttl(key);
    const resetTime = Date.now() + (ttl * 1000);

    return {
      allowed: current <= this.config.max,
      remaining,
      resetTime,
    };
  }

  async getRemaining(identifier: string): Promise<number> {
    const key = this.config.keyGenerator 
      ? this.config.keyGenerator(identifier)
      : `rate_limit:${identifier}`;

    const current = await redis.getClient().get(key);
    const count = current ? parseInt(String(current)) : 0;
    
    return Math.max(0, this.config.max - count);
  }

  async reset(identifier: string): Promise<void> {
    const key = this.config.keyGenerator 
      ? this.config.keyGenerator(identifier)
      : `rate_limit:${identifier}`;

    await redis.getClient().del(key);
  }
}

// Pre-configured rate limiters
export const ipRateLimiter = new RateLimiter({
  max: parseInt(process.env['RATE_LIMIT_MAX'] || '1000'),
  windowMs: parseInt(process.env['RATE_LIMIT_TIME_WINDOW'] || '60000'),
  keyGenerator: (ip: string) => `rate_limit:ip:${ip}`,
});

export const shopRateLimiter = new RateLimiter({
  max: 5000, // Higher limit for shop-based requests
  windowMs: 60000,
  keyGenerator: (shop: string) => `rate_limit:shop:${shop}`,
});

export const apiKeyRateLimiter = new RateLimiter({
  max: 10000, // Very high limit for API keys
  windowMs: 60000,
  keyGenerator: (key: string) => `rate_limit:api:${key}`,
});

// Sliding window rate limiter for more precise control
export class SlidingWindowRateLimiter {
  private config: RateLimitConfig;

  constructor(config: RateLimitConfig) {
    this.config = config;
  }

  async checkLimit(identifier: string): Promise<{
    allowed: boolean;
    remaining: number;
    resetTime: number;
  }> {
    const key = `sliding_rate_limit:${identifier}`;
    const now = Date.now();
    const windowStart = now - this.config.windowMs;

    // Remove old entries
    await redis.getClient().zremrangebyscore(key, 0, windowStart);

    // Count current entries
    const current = await redis.getClient().zcard(key);

    if (current >= this.config.max) {
      const oldestEntry = await redis.getClient().zrange(key, 0, 0, { withScores: true });
      const resetTime = oldestEntry.length > 0 && oldestEntry[1] 
        ? parseInt(String(oldestEntry[1])) + this.config.windowMs
        : now + this.config.windowMs;

      return {
        allowed: false,
        remaining: 0,
        resetTime,
      };
    }

    // Add current request
    await redis.getClient().zadd(key, { score: now, member: `${now}-${Math.random()}` });
    await redis.getClient().expire(key, Math.ceil(this.config.windowMs / 1000));

    return {
      allowed: true,
      remaining: this.config.max - current - 1,
      resetTime: now + this.config.windowMs,
    };
  }
}

// Burst protection for sudden traffic spikes
export class BurstProtection {
  private config: {
    maxBurst: number;
    burstWindowMs: number;
    normalWindowMs: number;
    normalMax: number;
  };

  constructor(config: {
    maxBurst: number;
    burstWindowMs: number;
    normalWindowMs: number;
    normalMax: number;
  }) {
    this.config = config;
  }

  async checkBurst(identifier: string): Promise<{
    allowed: boolean;
    reason: 'normal' | 'burst' | 'blocked';
    remaining: number;
  }> {
    const burstKey = `burst:${identifier}`;
    const normalKey = `normal:${identifier}`;
    const now = Date.now();

    // Check burst window
    const burstCount = await redis.getClient().zcount(
      burstKey,
      now - this.config.burstWindowMs,
      now
    );

    if (burstCount >= this.config.maxBurst) {
      return {
        allowed: false,
        reason: 'blocked',
        remaining: 0,
      };
    }

    // Check normal window
    const normalCount = await redis.getClient().zcount(
      normalKey,
      now - this.config.normalWindowMs,
      now
    );

    if (normalCount >= this.config.normalMax) {
      return {
        allowed: false,
        reason: 'normal',
        remaining: this.config.normalMax - normalCount,
      };
    }

    // Add to both windows
    const requestId = `${now}-${Math.random()}`;
    
    await Promise.all([
      redis.getClient().zadd(burstKey, { score: now, member: requestId }),
      redis.getClient().zadd(normalKey, { score: now, member: requestId }),
      redis.getClient().expire(burstKey, Math.ceil(this.config.burstWindowMs / 1000)),
      redis.getClient().expire(normalKey, Math.ceil(this.config.normalWindowMs / 1000)),
    ]);

    return {
      allowed: true,
      reason: burstCount > this.config.maxBurst * 0.8 ? 'burst' : 'normal',
      remaining: this.config.normalMax - normalCount - 1,
    };
  }
}

// Distributed rate limiter using Redis Lua scripts
export class DistributedRateLimiter {
  private script = `
    local key = KEYS[1]
    local max = tonumber(ARGV[1])
    local window = tonumber(ARGV[2])
    local now = tonumber(ARGV[3])
    
    local current = redis.call('GET', key)
    if current == false then
      redis.call('SET', key, 1)
      redis.call('EXPIRE', key, window)
      return {1, window}
    end
    
    local count = tonumber(current)
    if count >= max then
      local ttl = redis.call('TTL', key)
      return {0, ttl}
    end
    
    redis.call('INCR', key)
    local ttl = redis.call('TTL', key)
    return {1, ttl}
  `;

  async checkLimit(identifier: string, max: number, windowMs: number): Promise<{
    allowed: boolean;
    remaining: number;
    resetTime: number;
  }> {
    const key = `distributed_rate_limit:${identifier}`;
    const now = Math.floor(Date.now() / 1000);
    const window = Math.ceil(windowMs / 1000);

    const result = await redis.getClient().eval(
      this.script,
      [key],
      [max.toString(), window.toString(), now.toString()]
    ) as [number, number];

    const [allowed, ttl] = result;
    const remaining = Math.max(0, max - (max - allowed));
    const resetTime = Date.now() + (ttl * 1000);

    return {
      allowed: allowed === 1,
      remaining,
      resetTime,
    };
  }
}
