/**
 * Active Users Module - Main Export
 * 
 * Bu dosya Active Users modülünün ana export dosyasıdır.
 * Tüm alt modülleri (EMA, Presence, Heartbeat) ve ana sınıfları export eder.
 */

// Main classes
export { PresenceTracker } from './presence';
export { HeartbeatManager, ClientHeartbeatHelpers } from './heartbeat';

// EMA functions
export {
  alpha,
  emaStep,
  calculateTrend,
  updateEMAState,
  calculateEMAResult,
  createInitialEMAState,
  normalizeEMA,
  isValidEMAState,
  resetEMAState,
  getEMAStats,
} from './ema';

// Types
export type {
  PresenceData,
  PresenceUpdate,
  RedisPresenceData,
  EMAResult,
  EMAState,
  HeartbeatPayload,
  HeartbeatResponse,
  ActiveUsersMetrics,
  DailyActiveUsersMetrics,
  PresenceBeatRequest,
  PresenceByeRequest,
  ActiveUsersStreamResponse,
  ActiveUsersError,
  ActiveUsersConfig,
  PresenceEvent,
  EMACalculationEvent,
  TrendDirection,
  PresenceStatus,
  EMACalculationMethod,
  ActiveUsersMinutelyRow,
  ActiveUsersDailyRow,
  ActiveUsersStateRow,
} from './types';

// Constants
export {
  HEARTBEAT_MS,
  TTL_MS,
  TICK_MS,
  EMA_TAU_FAST,
  EMA_TAU_SLOW,
  REDIS_KEYS,
  DB_TABLES,
  EMA_MIN_ALPHA,
  EMA_MAX_ALPHA,
  PRESENCE_CLEANUP_INTERVAL_MS,
  PRESENCE_BATCH_SIZE,
  MAX_RETRY_ATTEMPTS,
  RETRY_DELAY_MS,
  MIN_SHOP_ID_LENGTH,
  MAX_SHOP_ID_LENGTH,
  MIN_VISITOR_ID_LENGTH,
  MAX_VISITOR_ID_LENGTH,
  CACHE_TTL_SECONDS,
  BATCH_PROCESSING_DELAY_MS,
} from './constants';

// Main Active Users Manager Class
import { redis } from '../../utils/redis';
import { PresenceTracker } from './presence';
import { HeartbeatManager } from './heartbeat';
import { 
  updateEMAState, 
  calculateEMAResult, 
  createInitialEMAState,
  isValidEMAState 
} from './ema';
import { 
  ActiveUsersMetrics, 
  EMAState
} from './types';
import { REDIS_KEYS, TTL_MS, TICK_MS } from './constants';

export class ActiveUsersManager {
  private presenceTracker: PresenceTracker;
  private heartbeatManager: HeartbeatManager;
  private tickInterval: NodeJS.Timeout | undefined;

  constructor() {
    this.presenceTracker = new PresenceTracker();
    this.heartbeatManager = new HeartbeatManager(this.presenceTracker);
  }

  /**
   * Active Users Manager'ı başlatır
   */
  public async start(): Promise<void> {
    await this.presenceTracker.start();
    
    // Tick interval'ı başlat (EMA hesaplamaları için)
    this.tickInterval = setInterval(
      () => this.processTick(),
      TICK_MS
    );
  }

  /**
   * Active Users Manager'ı durdurur
   */
  public async stop(): Promise<void> {
    await this.presenceTracker.stop();
    this.heartbeatManager.clearAllHeartbeats();
    
    if (this.tickInterval) {
      clearInterval(this.tickInterval);
      this.tickInterval = undefined;
    }
  }

  /**
   * Heartbeat'i işler
   * @param payload - Heartbeat payload
   * @returns Heartbeat response
   */
  public async processHeartbeat(payload: any): Promise<any> {
    return await this.heartbeatManager.processHeartbeat(payload);
  }

  /**
   * Page unload'ı işler
   * @param payload - Page unload payload
   * @returns Response
   */
  public async processPageUnload(payload: any): Promise<any> {
    return await this.heartbeatManager.processPageUnload(payload);
  }

  /**
   * Aktif kullanıcı sayısını getirir
   * @param shop - Mağaza kimliği
   * @returns Aktif kullanıcı sayısı
   */
  public async getActiveUserCount(shop: string): Promise<number> {
    return await this.presenceTracker.getActiveUserCount(shop);
  }

  /**
   * Active Users metriklerini getirir
   * @param shop - Mağaza kimliği
   * @returns Active Users metrikleri
   */
  public async getActiveUsersMetrics(shop: string): Promise<ActiveUsersMetrics> {
    const auRaw = await this.presenceTracker.getActiveUserCount(shop);
    const emaState = await this.getEMAState(shop);
    const emaResult = calculateEMAResult(emaState);
    
    return {
      shop,
      timestamp: Date.now(),
      au_raw: auRaw,
      au_ema_fast: emaResult.ema_fast,
      au_ema_slow: emaResult.ema_slow,
      total_tabs: auRaw, // Bu değer daha detaylı hesaplanabilir
      window_seconds: Math.floor(TTL_MS / 1000),
    };
  }

  /**
   * EMA state'ini getirir
   * @param shop - Mağaza kimliği
   * @returns EMA state
   */
  private async getEMAState(shop: string): Promise<EMAState> {
    const key = `${REDIS_KEYS.EMA_STATE}:${shop}`;
    
    try {
      const client = redis.getClient();
      if (!client) {
        // Redis not available, return initial state
        return createInitialEMAState(0, Date.now());
      }
      
      const data = await client.hgetall(key);
      
      if (!data || Object.keys(data).length === 0) {
        // İlk kez, sıfır state oluştur
        const initialState = createInitialEMAState(0, Date.now());
        await this.setEMAState(shop, initialState);
        return initialState;
      }

      const emaState: EMAState = {
        ema_fast: parseFloat(String(data['ema_fast'] || '0')),
        ema_slow: parseFloat(String(data['ema_slow'] || '0')),
        last_ts: parseInt(String(data['last_ts'] || '0')),
        last_au_raw: parseInt(String(data['last_au_raw'] || '0')),
      };

      if (!isValidEMAState(emaState)) {
        // Geçersiz state, sıfırla
        const initialState = createInitialEMAState(0, Date.now());
        await this.setEMAState(shop, initialState);
        return initialState;
      }

      return emaState;
    } catch (error) {
      console.error('Error getting EMA state:', error);
      return createInitialEMAState(0, Date.now());
    }
  }

  /**
   * EMA state'ini set eder
   * @param shop - Mağaza kimliği
   * @param emaState - EMA state
   */
  private async setEMAState(shop: string, emaState: EMAState): Promise<void> {
    const key = `${REDIS_KEYS.EMA_STATE}:${shop}`;
    
    try {
      const client = redis.getClient();
      if (!client) {
        // Redis not available, skip
        return;
      }
      
      await client.hset(key, {
        ema_fast: emaState.ema_fast.toString(),
        ema_slow: emaState.ema_slow.toString(),
        last_ts: emaState.last_ts.toString(),
        last_au_raw: emaState.last_au_raw.toString(),
      });
      
      // TTL ayarla
      await client.expire(key, Math.ceil(TTL_MS / 1000));
    } catch (error) {
      console.error('Error setting EMA state:', error);
    }
  }

  /**
   * Tick işlemini gerçekleştirir (EMA hesaplamaları)
   */
  private async processTick(): Promise<void> {
    try {
      // Redis mevcut değilse tick processing'i skip et
      const client = redis.getClient();
      if (!client) {
        return; // Redis yoksa hiçbir şey yapma
      }

      // Tüm aktif shop'ları al
      const shops = await this.getActiveShops();
      
      for (const shop of shops) {
        await this.processShopTick(shop);
      }
    } catch (error) {
      console.error('Error during tick processing:', error);
    }
  }

  /**
   * Belirli bir shop için tick işlemini gerçekleştirir
   * @param shop - Mağaza kimliği
   */
  private async processShopTick(shop: string): Promise<void> {
    try {
      const auRaw = await this.presenceTracker.getActiveUserCount(shop);
      const emaState = await this.getEMAState(shop);
      
      // EMA state'ini güncelle
      const updatedEMAState = updateEMAState(emaState, auRaw, Date.now());
      await this.setEMAState(shop, updatedEMAState);
      
      // Database'e kaydet (opsiyonel)
      await this.saveActiveUsersMetrics(shop, auRaw, updatedEMAState);
      
      // Dashboard'a EMA update gönder
      await this.publishEMAUpdate(shop, auRaw, updatedEMAState);
      
    } catch (error) {
      console.error(`Error processing tick for shop ${shop}:`, error);
    }
  }

  /**
   * Active Users metriklerini database'e kaydeder
   * @param shop - Mağaza kimliği
   * @param auRaw - Raw aktif kullanıcı sayısı
   * @param emaState - EMA state
   */
  private async saveActiveUsersMetrics(shop: string, auRaw: number, emaState: EMAState): Promise<void> {
    try {
      // Bu kısım production'da implement edilecek
      // Supabase'e active_users_minutely tablosuna kayıt
      console.log(`Saving metrics for shop ${shop}: au_raw=${auRaw}, ema_fast=${emaState.ema_fast}, ema_slow=${emaState.ema_slow}`);
    } catch (error) {
      console.error('Error saving active users metrics:', error);
    }
  }

  /**
   * Aktif shop'ları getirir
   * @returns Aktif shop listesi
   */
  private async getActiveShops(): Promise<string[]> {
    try {
      const client = redis.getClient();
      if (!client) {
        // Redis not available, return empty array
        return [];
      }
      
      const pattern = `${REDIS_KEYS.PRESENCE_VISITORS}:*`;
      const keys = await client.keys(pattern);
      
      return keys.map((key: string) => key.replace(`${REDIS_KEYS.PRESENCE_VISITORS}:`, ''));
    } catch (error) {
      // Redis connection errors are expected when Redis is not available
      // Don't log these as errors to reduce noise
      return [];
    }
  }

  /**
   * Manager istatistiklerini getirir
   * @returns Manager istatistikleri
   */
  public async getStats(): Promise<{
    active_shops: number;
    active_heartbeats: number;
    presence_stats: any;
  }> {
    const shops = await this.getActiveShops();
    const heartbeatStats = this.heartbeatManager.getHeartbeatStats();
    
    return {
      active_shops: shops.length,
      active_heartbeats: heartbeatStats.active_heartbeats,
      presence_stats: heartbeatStats,
    };
  }

  /**
   * Dashboard'a EMA update gönderir
   * @param shop - Mağaza kimliği
   * @param auRaw - Raw aktif kullanıcı sayısı
   * @param emaState - EMA state
   */
  private async publishEMAUpdate(shop: string, auRaw: number, emaState: EMAState): Promise<void> {
    try {
      const channel = `${REDIS_KEYS.PUBSUB_CHANNEL}:${shop}`;
      await redis.publish(channel, {
        type: 'ema_update',
        shop,
        au_raw: auRaw,
        ema_fast: emaState.ema_fast,
        ema_slow: emaState.ema_slow,
        trend: emaState.ema_fast - emaState.ema_slow,
        timestamp: Date.now(),
      });
    } catch (error) {
      console.error('Error publishing EMA update:', error);
    }
  }
}