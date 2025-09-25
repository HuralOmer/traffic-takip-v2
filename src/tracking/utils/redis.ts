/**
 * Redis Yönetim Sınıfı
 * 
 * Bu sınıf, Upstash Redis REST API bağlantısını yönetir ve trafik takip sistemi için
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
 * - Upstash REST API kullanımı
 * - Health check
 * - Error handling
 * - Connection pooling
 */

import { Redis } from '@upstash/redis';
import { RedisConfig } from '../../types';

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

    // Debug: Environment variables'ları logla
    console.log('Redis Environment Variables Debug:');
    console.log('UPSTASH_REDIS_REST_URL:', process.env['UPSTASH_REDIS_REST_URL'] ? 'SET' : 'NOT SET');
    console.log('UPSTASH_REDIS_REST_TOKEN:', process.env['UPSTASH_REDIS_REST_TOKEN'] ? 'SET' : 'NOT SET');

    if (!config.url || !config.token) {
      console.warn('Redis configuration is missing. Running in mock mode.');
      // Mock Redis client for development
      this.redis = null as any;
      return;
    }

    try {
      // Upstash Redis REST API client'ı oluştur
      this.redis = new Redis({
        url: config.url,
        token: config.token,
      });

      console.log('Redis client initialized successfully');
    } catch (error) {
      console.error('Redis initialization failed:', error);
      console.warn('Running in mock mode.');
      this.redis = null as any;
    }
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
    if (!this.redis) {
      console.log(`Mock: addPresence for ${shop}, ${visitorId}, ${sessionId}, ${pagePath}`);
      return;
    }
    
    const now = Date.now();
    const key = `presence:v:${shop}`;
    
    await this.redis.zadd(key, { score: now, member: `${visitorId}:${sessionId}:${pagePath}` });
    await this.redis.expire(key, 60); // 60 seconds TTL
  }

  public async getActiveUsers(shop: string): Promise<number> {
    if (!this.redis) {
      console.log(`Mock: getActiveUsers for ${shop}`);
      return 0;
    }
    
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
    await this.redis.set(key, sessionId, { ex: 1800 }); // 30 minutes TTL
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
    // Upstash REST API doesn't support persistent subscriptions
    // This would need to be implemented with WebSockets or polling
    console.warn('Pub/Sub not supported with Upstash REST API');
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
    // Upstash REST API doesn't require explicit cleanup
    console.log('Redis cleanup completed');
  }
}

export const redis = RedisManager.getInstance();
export default redis;
