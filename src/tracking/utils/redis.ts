/**
 * Redis Yönetim Sınıfı
 * 
 * Bu sınıf, Redis bağlantısını yönetir ve trafik takip sistemi için
 * gerekli Redis operasyonlarını sağlar. Singleton pattern kullanır.
 * 
 * Redis Kullanım Alanları:
 * - Presence tracking (kullanıcı varlık takibi)
 * - Session management (oturum yönetimi)
 * - Rate limiting (istek sınırlama)
 * - EMA state (Exponential Moving Average durumu)
 * - Pub/Sub (gerçek zamanlı güncellemeler)
 * - Caching (önbellekleme)
 * 
 * Özellikler:
 * - Otomatik yeniden bağlanma
 * - Health check
 * - Error handling
 * - Connection pooling
 */

import { Redis } from 'ioredis';
import { RedisConfig } from '@/types';

/**
 * Redis yöneticisi sınıfı
 * Singleton pattern ile tek instance garantisi
 */
class RedisManager {
  private static instance: RedisManager;
  private redis: Redis; // Redis client instance'ı

  private constructor() {
    const config: RedisConfig = {
      url: process.env['UPSTASH_REDIS_REST_URL'] || '',
      token: process.env['UPSTASH_REDIS_REST_TOKEN'] || '',
    };

    if (!config.url || !config.token) {
      throw new Error('Redis configuration is missing. Please check your environment variables.');
    }

    // Parse Redis URL to get host and port
    const url = new URL(config.url);
    const host = url.hostname;
    const port = parseInt(url.port) || 6379;

    this.redis = new Redis({
      host,
      port,
      password: config.token,
      enableReadyCheck: false,
      maxRetriesPerRequest: 3,
      lazyConnect: true,
    });

    this.redis.on('error', (error) => {
      console.error('Redis connection error:', error);
    });

    this.redis.on('connect', () => {
      console.log('Redis connected successfully');
    });
  }

  public static getInstance(): RedisManager {
    if (!RedisManager.instance) {
      RedisManager.instance = new RedisManager();
    }
    return RedisManager.instance;
  }

  public getClient(): Redis {
    return this.redis;
  }

  // Presence tracking methods
  public async addPresence(shop: string, visitorId: string, sessionId: string, pagePath: string): Promise<void> {
    const now = Date.now();
    const key = `presence:v:${shop}`;
    
    await this.redis.zadd(key, now, `${visitorId}:${sessionId}:${pagePath}`);
    await this.redis.expire(key, 60); // 60 seconds TTL
  }

  public async getActiveUsers(shop: string): Promise<number> {
    const key = `presence:v:${shop}`;
    const now = Date.now();
    const ttl = 30000; // 30 seconds
    
    // Count active users in the last 30 seconds
    const count = await this.redis.zcount(key, now - ttl, now);
    
    // Clean up old entries
    await this.redis.zremrangebyscore(key, 0, now - ttl);
    
    return count;
  }

  public async getActiveSessions(shop: string): Promise<number> {
    const key = `presence:s:${shop}`;
    const now = Date.now();
    const ttl = 30000; // 30 seconds
    
    const count = await this.redis.zcount(key, now - ttl, now);
    await this.redis.zremrangebyscore(key, 0, now - ttl);
    
    return count;
  }

  // EMA state management
  public async getEMAState(shop: string): Promise<{ ema_fast: number; ema_slow: number; last_ts: number } | null> {
    const key = `presence:ema:${shop}`;
    const data = await this.redis.hgetall(key);
    
    if (!data['ema_fast'] || !data['ema_slow'] || !data['last_ts']) {
      return null;
    }

    return {
      ema_fast: parseFloat(data['ema_fast']),
      ema_slow: parseFloat(data['ema_slow']),
      last_ts: parseInt(data['last_ts']),
    };
  }

  public async setEMAState(shop: string, ema_fast: number, ema_slow: number, last_ts: number): Promise<void> {
    const key = `presence:ema:${shop}`;
    await this.redis.hset(key, {
      ema_fast: ema_fast.toString(),
      ema_slow: ema_slow.toString(),
      last_ts: last_ts.toString(),
    });
    await this.redis.expire(key, 3600); // 1 hour TTL
  }

  // Session management
  public async setCurrentSession(shop: string, visitorId: string, sessionId: string): Promise<void> {
    const key = `visitor:current_session:${shop}:${visitorId}`;
    await this.redis.set(key, sessionId, 'EX', 1800); // 30 minutes TTL
  }

  public async getCurrentSession(shop: string, visitorId: string): Promise<string | null> {
    const key = `visitor:current_session:${shop}:${visitorId}`;
    return await this.redis.get(key);
  }

  public async removeCurrentSession(shop: string, visitorId: string): Promise<void> {
    const key = `visitor:current_session:${shop}:${visitorId}`;
    await this.redis.del(key);
  }

  // Rate limiting
  public async checkRateLimit(identifier: string, limit: number, windowMs: number): Promise<boolean> {
    const key = `rate_limit:${identifier}`;
    const current = await this.redis.incr(key);
    
    if (current === 1) {
      await this.redis.expire(key, Math.ceil(windowMs / 1000));
    }
    
    return current <= limit;
  }

  // Pub/Sub for real-time updates
  public async publish(channel: string, message: any): Promise<void> {
    await this.redis.publish(channel, JSON.stringify(message));
  }

  public async subscribe(channel: string, callback: (message: any) => void): Promise<void> {
    const subscriber = this.redis.duplicate();
    await subscriber.subscribe(channel);
    
    subscriber.on('message', (ch, message) => {
      if (ch === channel) {
        try {
          callback(JSON.parse(message));
        } catch (error) {
          console.error('Error parsing Redis message:', error);
        }
      }
    });
  }

  // Health check
  public async healthCheck(): Promise<boolean> {
    try {
      const result = await this.redis.ping();
      return result === 'PONG';
    } catch (error) {
      console.error('Redis health check failed:', error);
      return false;
    }
  }

  // Cleanup method
  public async cleanup(): Promise<void> {
    await this.redis.quit();
  }
}

export const redis = RedisManager.getInstance();
export default redis;
