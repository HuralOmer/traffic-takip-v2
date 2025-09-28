/**
 * Presence Tracking Implementation
 * 
 * Bu dosya Active Users tracking için presence tracking logic'ini implement eder.
 * Redis ZSET operations kullanarak visitor ve session tracking yapar.
 * ZCOUNT ile aktif kullanıcı sayımı ve ZREMRANGEBYSCORE ile cleanup işlemleri.
 */

import { redis } from '../utils/redis';
import { PresenceData, RedisPresenceData } from './types';
import { REDIS_KEYS, TTL_MS, PRESENCE_CLEANUP_INTERVAL_MS } from './constants';

export class PresenceTracker {
  private cleanupInterval: NodeJS.Timeout | undefined;

  constructor() {
    // Constructor'da redis'i parametre olarak almıyoruz, global instance kullanıyoruz
  }

  /**
   * Presence tracking'i başlatır
   */
  public async start(): Promise<void> {
    // Cleanup interval'ı başlat
    this.cleanupInterval = setInterval(
      () => this.cleanupExpiredPresence(),
      PRESENCE_CLEANUP_INTERVAL_MS
    );
  }

  /**
   * Presence tracking'i durdurur
   */
  public async stop(): Promise<void> {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = undefined;
    }
  }

  /**
   * Visitor presence'ını günceller
   * @param presenceData - Presence verisi
   */
  public async updateVisitorPresence(presenceData: PresenceData): Promise<void> {
    const { shop, visitor_id, timestamp, page_path, user_agent, ip_hash } = presenceData;
    
    console.log('PresenceTracker: updateVisitorPresence called', { shop, visitor_id, timestamp });
    
    const key = `${REDIS_KEYS.PRESENCE_VISITORS}:${shop}`;
    
    // Önce eski entry'leri sil (visitor_id'ye göre)
    await this.removeVisitorEntries(key, visitor_id);
    
    // Yeni entry'yi ekle
    const member = JSON.stringify({
      visitor_id,
      timestamp,
      page_path,
      user_agent,
      ip_hash,
    } as RedisPresenceData);

    console.log('PresenceTracker: Adding to Redis', { key, member, score: timestamp });

    await redis.getClient().zadd(key, { score: timestamp, member });
    
    console.log('PresenceTracker: Successfully added to Redis');
    
    // TTL ayarla
    await redis.getClient().expire(key, Math.ceil(TTL_MS / 1000));

    // Dashboard'a real-time update gönder
    await this.publishPresenceUpdate(shop, {
      type: 'visitor_update',
      visitor_id,
      timestamp,
      page_path,
      is_online: true,
    });
  }

  /**
   * Session presence'ını günceller
   * @param presenceData - Presence verisi
   */
  public async updateSessionPresence(presenceData: PresenceData): Promise<void> {
    const { shop, session_id, timestamp, page_path, user_agent, ip_hash } = presenceData;
    
    if (!session_id) return;

    const key = `${REDIS_KEYS.PRESENCE_SESSIONS}:${shop}`;
    
    // Önce eski entry'leri sil (session_id'ye göre)
    await this.removeSessionEntries(key, session_id);
    
    // Yeni entry'yi ekle
    const member = JSON.stringify({
      session_id,
      timestamp,
      page_path,
      user_agent,
      ip_hash,
    } as RedisPresenceData);

    await redis.getClient().zadd(key, { score: timestamp, member });
    
    // TTL ayarla
    await redis.getClient().expire(key, Math.ceil(TTL_MS / 1000));

    // Dashboard'a real-time update gönder
    await this.publishPresenceUpdate(shop, {
      type: 'session_update',
      session_id,
      timestamp,
      page_path,
      is_online: true,
    });
  }

  /**
   * Aktif visitor sayısını hesaplar
   * @param shop - Mağaza kimliği
   * @param timeWindow - Zaman penceresi (ms)
   * @returns Aktif visitor sayısı
   */
  public async getActiveVisitorCount(shop: string, timeWindow: number = TTL_MS): Promise<number> {
    const key = `${REDIS_KEYS.PRESENCE_VISITORS}:${shop}`;
    const now = Date.now();
    const cutoff = now - timeWindow;

    try {
      const count = await redis.getClient().zcount(key, cutoff, '+inf');
      return count || 0;
    } catch (error) {
      console.error('Error getting active visitor count:', error);
      return 0;
    }
  }

  /**
   * Aktif session sayısını hesaplar
   * @param shop - Mağaza kimliği
   * @param timeWindow - Zaman penceresi (ms)
   * @returns Aktif session sayısı
   */
  public async getActiveSessionCount(shop: string, timeWindow: number = TTL_MS): Promise<number> {
    const key = `${REDIS_KEYS.PRESENCE_SESSIONS}:${shop}`;
    const now = Date.now();
    const cutoff = now - timeWindow;

    try {
      const count = await redis.getClient().zcount(key, cutoff, '+inf');
      return count || 0;
    } catch (error) {
      console.error('Error getting active session count:', error);
      return 0;
    }
  }

  /**
   * Aktif kullanıcı sayısını hesaplar (visitor + session)
   * @param shop - Mağaza kimliği
   * @param timeWindow - Zaman penceresi (ms)
   * @returns Aktif kullanıcı sayısı
   */
  public async getActiveUserCount(shop: string, timeWindow: number = TTL_MS): Promise<number> {
    const [visitorCount, sessionCount] = await Promise.all([
      this.getActiveVisitorCount(shop, timeWindow),
      this.getActiveSessionCount(shop, timeWindow),
    ]);

    // Visitor ve session sayılarının maksimumunu al
    // (aynı kişi hem visitor hem session olabilir)
    return Math.max(visitorCount, sessionCount);
  }

  /**
   * Visitor'ı offline yapar
   * @param shop - Mağaza kimliği
   * @param visitor_id - Visitor kimliği
   */
  public async setVisitorOffline(shop: string, visitor_id: string): Promise<void> {
    const key = `${REDIS_KEYS.PRESENCE_VISITORS}:${shop}`;
    
    try {
      // Visitor'ın tüm presence kayıtlarını sil
      const members = await redis.getClient().zrange(key, '-inf', '+inf', { byScore: true, withScores: true });
      
      for (let i = 0; i < members.length; i += 2) {
        const member = members[i] as string;
        
        try {
          // Member'ı string olarak kontrol et
          let data: RedisPresenceData;
          if (typeof member === 'string') {
            data = JSON.parse(member) as RedisPresenceData;
          } else {
            // Eğer object ise, string'e çevir
            data = JSON.parse(JSON.stringify(member)) as RedisPresenceData;
          }
          
          if (data.visitor_id === visitor_id) {
            await redis.getClient().zrem(key, member);
          }
        } catch (parseError) {
          console.warn('Error parsing member for removal:', parseError, 'Member:', member);
          // Parse edilemeyen member'ı da sil
          try {
            await redis.getClient().zrem(key, member);
          } catch (removalError) {
            console.warn('Error removing invalid member:', removalError);
          }
        }
      }

      // Dashboard'a offline update gönder
      await this.publishPresenceUpdate(shop, {
        type: 'visitor_offline',
        visitor_id,
        timestamp: Date.now(),
        is_online: false,
      });
    } catch (error) {
      console.error('Error setting visitor offline:', error);
    }
  }

  /**
   * Session'ı offline yapar
   * @param shop - Mağaza kimliği
   * @param session_id - Session kimliği
   */
  public async setSessionOffline(shop: string, session_id: string): Promise<void> {
    const key = `${REDIS_KEYS.PRESENCE_SESSIONS}:${shop}`;
    
    try {
      // Session'ın tüm presence kayıtlarını sil
      const members = await redis.getClient().zrange(key, '-inf', '+inf', { byScore: true, withScores: true });
      
      for (let i = 0; i < members.length; i += 2) {
        const member = members[i] as string;
        
        try {
          // Member'ı string olarak kontrol et
          let data: RedisPresenceData;
          if (typeof member === 'string') {
            data = JSON.parse(member) as RedisPresenceData;
          } else {
            // Eğer object ise, string'e çevir
            data = JSON.parse(JSON.stringify(member)) as RedisPresenceData;
          }
          
          if (data.session_id === session_id) {
            await redis.getClient().zrem(key, member);
          }
        } catch (parseError) {
          console.warn('Error parsing member for removal:', parseError, 'Member:', member);
          // Parse edilemeyen member'ı da sil
          try {
            await redis.getClient().zrem(key, member);
          } catch (removalError) {
            console.warn('Error removing invalid member:', removalError);
          }
        }
      }

      // Dashboard'a offline update gönder
      await this.publishPresenceUpdate(shop, {
        type: 'session_offline',
        session_id,
        timestamp: Date.now(),
        is_online: false,
      });
    } catch (error) {
      console.error('Error setting session offline:', error);
    }
  }

  /**
   * Süresi dolmuş presence kayıtlarını temizler
   */
  private async cleanupExpiredPresence(): Promise<void> {
    try {
      const now = Date.now();
      const cutoff = now - TTL_MS;

      // Tüm shop'ları al
      const shops = await this.getActiveShops();
      
      for (const shop of shops) {
        await this.cleanupShopPresence(shop, cutoff);
      }
    } catch (error) {
      console.error('Error during presence cleanup:', error);
    }
  }

  /**
   * Belirli bir shop'un presence kayıtlarını temizler
   * @param shop - Mağaza kimliği
   * @param cutoff - Kesim zamanı
   */
  private async cleanupShopPresence(shop: string, cutoff: number): Promise<void> {
    const visitorKey = `${REDIS_KEYS.PRESENCE_VISITORS}:${shop}`;
    const sessionKey = `${REDIS_KEYS.PRESENCE_SESSIONS}:${shop}`;

    try {
      // Eski visitor kayıtlarını sil
      await (redis.getClient().zremrangebyscore as any)(visitorKey, '-inf', cutoff);
      
      // Eski session kayıtlarını sil
      await (redis.getClient().zremrangebyscore as any)(sessionKey, '-inf', cutoff);
    } catch (error) {
      console.error(`Error cleaning up presence for shop ${shop}:`, error);
    }
  }

  /**
   * Aktif shop'ları getirir
   * @returns Aktif shop listesi
   */
  private async getActiveShops(): Promise<string[]> {
    try {
      const pattern = `${REDIS_KEYS.PRESENCE_VISITORS}:*`;
      const keys = await redis.getClient().keys(pattern);
      
      return keys.map((key: string) => key.replace(`${REDIS_KEYS.PRESENCE_VISITORS}:`, ''));
    } catch (error) {
      console.error('Error getting active shops:', error);
      return [];
    }
  }

  /**
   * Presence istatistiklerini getirir
   * @param shop - Mağaza kimliği
   * @returns Presence istatistikleri
   */
  public async getPresenceStats(shop: string): Promise<{
    active_visitors: number;
    active_sessions: number;
    total_visitors: number;
    total_sessions: number;
    last_activity: number;
  }> {
    const [activeVisitors, activeSessions, totalVisitors, totalSessions, lastActivity] = await Promise.all([
      this.getActiveVisitorCount(shop),
      this.getActiveSessionCount(shop),
      this.getTotalVisitorCount(shop),
      this.getTotalSessionCount(shop),
      this.getLastActivityTime(shop),
    ]);

    return {
      active_visitors: activeVisitors,
      active_sessions: activeSessions,
      total_visitors: totalVisitors,
      total_sessions: totalSessions,
      last_activity: lastActivity,
    };
  }

  /**
   * Toplam visitor sayısını getirir
   * @param shop - Mağaza kimliği
   * @returns Toplam visitor sayısı
   */
  private async getTotalVisitorCount(shop: string): Promise<number> {
    const key = `${REDIS_KEYS.PRESENCE_VISITORS}:${shop}`;
    
    try {
      return await redis.getClient().zcard(key);
    } catch (error) {
      console.error('Error getting total visitor count:', error);
      return 0;
    }
  }

  /**
   * Toplam session sayısını getirir
   * @param shop - Mağaza kimliği
   * @returns Toplam session sayısı
   */
  private async getTotalSessionCount(shop: string): Promise<number> {
    const key = `${REDIS_KEYS.PRESENCE_SESSIONS}:${shop}`;
    
    try {
      return await redis.getClient().zcard(key);
    } catch (error) {
      console.error('Error getting total session count:', error);
      return 0;
    }
  }

  /**
   * Son aktivite zamanını getirir
   * @param shop - Mağaza kimliği
   * @returns Son aktivite zamanı
   */
  private async getLastActivityTime(shop: string): Promise<number> {
    const key = `${REDIS_KEYS.PRESENCE_VISITORS}:${shop}`;
    
    try {
      const members = await redis.getClient().zrange(key, '-inf', '+inf', { byScore: true, withScores: true });
      if (members.length >= 2) {
        // En son elemanı al (en yüksek score'a sahip)
        const lastScore = members[members.length - 1] as number;
        return lastScore;
      }
      return 0;
    } catch (error) {
      console.error('Error getting last activity time:', error);
      return 0;
    }
  }

  /**
   * Visitor'ın eski entry'lerini siler
   * @param key - Redis key
   * @param visitor_id - Visitor kimliği
   */
  private async removeVisitorEntries(key: string, visitor_id: string): Promise<void> {
    try {
      const members = await redis.getClient().zrange(key, '-inf', '+inf', { byScore: true, withScores: true });
      
      for (let i = 0; i < members.length; i += 2) {
        const member = members[i] as string;
        
        try {
          const data = JSON.parse(member) as RedisPresenceData;
          if (data.visitor_id === visitor_id) {
            await redis.getClient().zrem(key, member);
            console.log('PresenceTracker: Removed old visitor entry', { visitor_id, member });
          }
        } catch (parseError) {
          console.warn('Error parsing member for removal:', parseError, 'Member:', member);
        }
      }
    } catch (error) {
      console.error('Error removing visitor entries:', error);
    }
  }

  /**
   * Session'ın eski entry'lerini siler
   * @param key - Redis key
   * @param session_id - Session kimliği
   */
  private async removeSessionEntries(key: string, session_id: string): Promise<void> {
    try {
      const members = await redis.getClient().zrange(key, '-inf', '+inf', { byScore: true, withScores: true });
      
      for (let i = 0; i < members.length; i += 2) {
        const member = members[i] as string;
        
        try {
          const data = JSON.parse(member) as RedisPresenceData;
          if (data.session_id === session_id) {
            await redis.getClient().zrem(key, member);
            console.log('PresenceTracker: Removed old session entry', { session_id, member });
          }
        } catch (parseError) {
          console.warn('Error parsing member for removal:', parseError, 'Member:', member);
        }
      }
    } catch (error) {
      console.error('Error removing session entries:', error);
    }
  }

  /**
   * Dashboard'a presence update gönderir
   * @param shop - Mağaza kimliği
   * @param update - Presence update verisi
   */
  private async publishPresenceUpdate(shop: string, update: any): Promise<void> {
    try {
      const channel = `${REDIS_KEYS.PUBSUB_CHANNEL}:${shop}`;
      await redis.publish(channel, {
        ...update,
        shop,
        timestamp: Date.now(),
      });
    } catch (error) {
      console.error('Error publishing presence update:', error);
    }
  }
}