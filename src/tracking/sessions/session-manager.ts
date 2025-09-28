/**
 * Session Manager Implementation
 * 
 * Bu dosya sessions tracking için ana session yönetim mantığını implement eder.
 * Offline → Online geçiş mantığı, atomik session kararları ve race condition önleme.
 */

import { redis } from '../utils/redis';
import { db } from '../utils/database';
import { 
  SessionData, 
  SessionStartPayload, 
  SessionEndPayload, 
  SessionUpdatePayload,
  SessionStartResponse, 
  SessionEndResponse,
  SessionAnalytics,
  SessionDistribution,
  AnalyticsTimeRange
} from './types';
import { 
  SESSION_TTL_MS, 
  SESSION_GAP_MS, 
  TICKER_INTERVAL_MS,
  REDIS_KEYS,
  DB_TABLES,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES
} from './constants';
import { LUA_SCRIPTS } from './lua-scripts';

export class SessionManager {
  private cleanupInterval: NodeJS.Timeout | undefined;
  private isInitialized = false;

  constructor() {
    // Constructor'da initialization yapmıyoruz, start() metodunda yapacağız
  }

  /**
   * Session Manager'ı başlatır
   */
  public async start(): Promise<void> {
    if (this.isInitialized) {
      console.log('SessionManager already initialized');
      return;
    }

    try {
      // Cleanup interval'ı başlat
      this.cleanupInterval = setInterval(
        () => this.performCleanup(),
        TICKER_INTERVAL_MS
      );

      this.isInitialized = true;
      console.log('SessionManager started successfully');
    } catch (error) {
      console.error('Failed to start SessionManager:', error);
      throw error;
    }
  }

  /**
   * Session Manager'ı durdurur
   */
  public async stop(): Promise<void> {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = undefined;
    }

    this.isInitialized = false;
    console.log('SessionManager stopped');
  }

  /**
   * Yeni session başlatır
   * Offline → Online geçiş mantığı ile çalışır
   */
  public async startSession(payload: SessionStartPayload): Promise<SessionStartResponse> {
    try {
      const {
        shop,
        visitor_id,
        page_path,
        referrer = 'direct',
        user_agent = 'unknown',
        ip_hash = 'unknown',
        timestamp = Date.now()
      } = payload;

      console.log('SessionManager: Starting session', { shop, visitor_id, page_path });

      // Redis key'lerini hazırla
      const currentSessionKey = `${REDIS_KEYS.CURRENT_SESSION}:${shop}:${visitor_id}`;
      const presenceSessionsKey = `${REDIS_KEYS.PRESENCE_SESSIONS}:${shop}`;
      const visitorCountsKey = `${REDIS_KEYS.VISITOR_SESSION_COUNTS}:${shop}`;
      const sessionMetaKey = `${REDIS_KEYS.SESSION_METADATA}:${shop}:${visitor_id}`;

      // Lua script ile atomik session başlatma
      console.log('SessionManager: Executing Lua script with keys:', [currentSessionKey, presenceSessionsKey, visitorCountsKey, sessionMetaKey]);
      console.log('SessionManager: Executing Lua script with args:', [visitor_id, timestamp.toString(), SESSION_GAP_MS.toString(), SESSION_TTL_MS.toString(), page_path, referrer, user_agent, ip_hash]);
      
      const result = await redis.getClient().eval(
        LUA_SCRIPTS.SESSION_START,
        [currentSessionKey, presenceSessionsKey, visitorCountsKey, sessionMetaKey],
        [
          visitor_id,
          timestamp.toString(),
          SESSION_GAP_MS.toString(),
          SESSION_TTL_MS.toString(),
          page_path,
          referrer,
          user_agent,
          ip_hash
        ]
      ) as any;

      console.log('SessionManager: Session start result', result);

      // Lua script'ten dönen result'ı parse et
      const sessionResult = Array.isArray(result) ? result[0] : result;
      
      // Result kontrolü
      if (!sessionResult || !sessionResult.session_id) {
        console.error('SessionManager: Invalid result from Lua script:', result);
        throw new Error('Invalid result from Lua script');
      }
      
      // Eğer yeni session başlatıldıysa Supabase'e kaydet
      if (sessionResult && sessionResult.is_new_session) {
        await this.saveSessionToDatabase({
          session_id: sessionResult.session_id,
          shop,
          visitor_id,
          started_at: new Date(timestamp),
          first_page: page_path,
          last_page: page_path,
          referrer,
          ua: user_agent,
          ip_hash,
          page_count: 1
        });

        // Visitor session count'unu güncelle
        await this.updateVisitorSessionCount(shop, visitor_id, timestamp);
      }

      return {
        success: true,
        message: SUCCESS_MESSAGES.SESSION_STARTED,
        session_id: sessionResult.session_id,
        is_new_session: sessionResult.is_new_session,
        previous_session_id: sessionResult.previous_session_id,
        session_gap_ms: sessionResult.session_gap_ms
      };

    } catch (error) {
      console.error('SessionManager: Error starting session:', error);
      return {
        success: false,
        message: ERROR_MESSAGES.REDIS_ERROR,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Session'ı sonlandırır
   */
  public async endSession(payload: SessionEndPayload): Promise<SessionEndResponse> {
    try {
      const {
        shop,
        visitor_id,
        session_id,
        last_page = '/',
        timestamp = Date.now()
      } = payload;

      console.log('SessionManager: Ending session', { shop, visitor_id, session_id });

      // Redis key'lerini hazırla
      const currentSessionKey = `${REDIS_KEYS.CURRENT_SESSION}:${shop}:${visitor_id}`;
      const presenceSessionsKey = `${REDIS_KEYS.PRESENCE_SESSIONS}:${shop}`;
      const sessionMetaKey = `${REDIS_KEYS.SESSION_METADATA}:${shop}:${visitor_id}`;

      // Lua script ile atomik session sonlandırma
      const result = await redis.getClient().eval(
        LUA_SCRIPTS.SESSION_END,
        [currentSessionKey, presenceSessionsKey, sessionMetaKey],
        [session_id, timestamp.toString(), last_page]
      ) as any;

      console.log('SessionManager: Session end result', result);

      // Lua script'ten dönen result'ı parse et
      const sessionResult = Array.isArray(result) ? result[0] : result;

      if (sessionResult && sessionResult.success) {
        // Supabase'de session'ı güncelle
        await this.updateSessionInDatabase(session_id, {
          ended_at: new Date(timestamp),
          last_page,
          duration_ms: sessionResult.duration_ms,
          page_count: sessionResult.page_count,
          is_ended: true
        });

        return {
          success: true,
          message: SUCCESS_MESSAGES.SESSION_ENDED,
          session_id: sessionResult.session_id,
          duration_ms: sessionResult.duration_ms,
          page_count: sessionResult.page_count
        };
      } else {
        return {
          success: false,
          message: sessionResult?.error || ERROR_MESSAGES.SESSION_NOT_FOUND,
          session_id
        };
      }

    } catch (error) {
      console.error('SessionManager: Error ending session:', error);
      return {
        success: false,
        message: ERROR_MESSAGES.REDIS_ERROR,
        error: error instanceof Error ? error.message : 'Unknown error',
        session_id: payload.session_id
      };
    }
  }

  /**
   * Session'ı günceller (heartbeat)
   */
  public async updateSession(payload: SessionUpdatePayload): Promise<boolean> {
    try {
      const {
        shop,
        visitor_id,
        session_id,
        page_path,
        timestamp = Date.now()
      } = payload;

      // Redis key'lerini hazırla
      const presenceSessionsKey = `${REDIS_KEYS.PRESENCE_SESSIONS}:${shop}`;
      const sessionMetaKey = `${REDIS_KEYS.SESSION_METADATA}:${shop}:${visitor_id}`;

      // Lua script ile atomik session güncelleme
      const result = await redis.getClient().eval(
        LUA_SCRIPTS.SESSION_UPDATE,
        [presenceSessionsKey, sessionMetaKey],
        [session_id, timestamp.toString(), page_path]
      ) as any;

      // Lua script'ten dönen result'ı parse et
      const sessionResult = Array.isArray(result) ? result[0] : result;

      if (sessionResult && sessionResult.success) {
        // Supabase'de session'ı güncelle
        await this.updateSessionInDatabase(session_id, {
          last_page: page_path,
          page_count: sessionResult.page_count
        });

        return true;
      }

      return false;

    } catch (error) {
      console.error('SessionManager: Error updating session:', error);
      return false;
    }
  }

  /**
   * Aktif session sayısını getirir
   */
  public async getActiveSessionCount(shop: string): Promise<number> {
    try {
      const presenceSessionsKey = `${REDIS_KEYS.PRESENCE_SESSIONS}:${shop}`;
      const currentTimestamp = Date.now();

      const result = await redis.getClient().eval(
        LUA_SCRIPTS.GET_ACTIVE_SESSIONS,
        [presenceSessionsKey],
        [currentTimestamp.toString(), SESSION_TTL_MS.toString()]
      ) as any;

      return result.active_sessions || 0;

    } catch (error) {
      console.error('SessionManager: Error getting active session count:', error);
      return 0;
    }
  }

  /**
   * Session dağılımını getirir
   */
  public async getSessionDistribution(shop: string): Promise<SessionDistribution[]> {
    try {
      const visitorCountsKey = `${REDIS_KEYS.VISITOR_SESSION_COUNTS}:${shop}`;

      const result = await redis.getClient().eval(
        LUA_SCRIPTS.GET_SESSION_DISTRIBUTION,
        [visitorCountsKey],
        ['1'] // bucket_size = 1
      ) as any;

      return result.distribution || [];

    } catch (error) {
      console.error('SessionManager: Error getting session distribution:', error);
      return [];
    }
  }

  /**
   * Session analitiklerini getirir
   */
  public async getSessionAnalytics(shop: string, timeRange: AnalyticsTimeRange = 'today'): Promise<SessionAnalytics> {
    try {
      const startDate = this.getTimeRangeStartDate(timeRange);
      const endDate = new Date();

      // Supabase'den session verilerini al
      const { data: sessions, error } = await db.getClient()
        .from(DB_TABLES.SESSIONS)
        .select('*')
        .eq('shop', shop)
        .gte('started_at', startDate.toISOString())
        .lte('started_at', endDate.toISOString());

      if (error) {
        console.error('SessionManager: Error getting sessions from database:', error);
        throw error;
      }

      // Analitikleri hesapla
      const analytics = this.calculateSessionAnalytics(sessions || []);

      return analytics;

    } catch (error) {
      console.error('SessionManager: Error getting session analytics:', error);
      throw error;
    }
  }

  /**
   * Session'ı Supabase'e kaydeder
   */
  private async saveSessionToDatabase(sessionData: Partial<SessionData>): Promise<void> {
    try {
      const { error } = await db.getClient()
        .from(DB_TABLES.SESSIONS)
        .insert([sessionData]);

      if (error) {
        console.error('SessionManager: Error saving session to database:', error);
        throw error;
      }

      console.log('SessionManager: Session saved to database', { session_id: sessionData.session_id });

    } catch (error) {
      console.error('SessionManager: Error in saveSessionToDatabase:', error);
      throw error;
    }
  }

  /**
   * Session'ı Supabase'de günceller
   */
  private async updateSessionInDatabase(sessionId: string, updates: Partial<SessionData>): Promise<void> {
    try {
      const { error } = await db.getClient()
        .from(DB_TABLES.SESSIONS)
        .update(updates)
        .eq('session_id', sessionId);

      if (error) {
        console.error('SessionManager: Error updating session in database:', error);
        throw error;
      }

    } catch (error) {
      console.error('SessionManager: Error in updateSessionInDatabase:', error);
      throw error;
    }
  }

  /**
   * Visitor session count'unu günceller
   */
  private async updateVisitorSessionCount(shop: string, visitorId: string, timestamp: number): Promise<void> {
    try {
      const { error } = await db.getClient()
        .rpc('inc_visitor_session', {
          p_shop: shop,
          p_visitor_id: visitorId,
          p_last_session_started_at: new Date(timestamp).toISOString()
        });

      if (error) {
        console.error('SessionManager: Error updating visitor session count:', error);
        // Bu hata kritik değil, devam et
      }

    } catch (error) {
      console.error('SessionManager: Error in updateVisitorSessionCount:', error);
      // Bu hata kritik değil, devam et
    }
  }

  /**
   * Session analitiklerini hesaplar
   */
  private calculateSessionAnalytics(sessions: SessionData[]): SessionAnalytics {
    const totalSessions = sessions.length;
    const activeSessions = sessions.filter(s => !s.ended_at).length;
    const endedSessions = sessions.filter(s => s.ended_at).length;

    const durations = sessions
      .filter(s => s.duration_ms)
      .map(s => s.duration_ms!);

    const avgDuration = durations.length > 0 
      ? durations.reduce((a, b) => a + b, 0) / durations.length 
      : 0;

    const sortedDurations = durations.sort((a, b) => a - b);
    const medianDuration = sortedDurations.length > 0
      ? sortedDurations[Math.floor(sortedDurations.length / 2)]
      : 0;

    const maxDuration = durations.length > 0 ? Math.max(...durations) : 0;
    const minDuration = durations.length > 0 ? Math.min(...durations) : 0;

    // const pageCounts = sessions
    //   .filter(s => s.page_count)
    //   .map(s => s.page_count!);

    // const avgPages = pageCounts.length > 0
    //   ? pageCounts.reduce((a, b) => a + b, 0) / pageCounts.length
    //   : 0;

    // Page dağılımı
    const pageMap = new Map<string, number>();
    sessions.forEach(session => {
      if (session.first_page) {
        pageMap.set(session.first_page, (pageMap.get(session.first_page) || 0) + 1);
      }
    });

    const topPages = Array.from(pageMap.entries())
      .map(([page, count]) => ({
        page,
        session_count: count,
        percentage: (count / totalSessions) * 100
      }))
      .sort((a, b) => b.session_count - a.session_count)
      .slice(0, 10);

    // Referrer dağılımı
    const referrerMap = new Map<string, number>();
    sessions.forEach(session => {
      if (session.referrer) {
        referrerMap.set(session.referrer, (referrerMap.get(session.referrer) || 0) + 1);
      }
    });

    const topReferrers = Array.from(referrerMap.entries())
      .map(([referrer, count]) => ({
        referrer,
        session_count: count,
        percentage: (count / totalSessions) * 100
      }))
      .sort((a, b) => b.session_count - a.session_count)
      .slice(0, 10);

    return {
      total_sessions: totalSessions,
      active_sessions: activeSessions,
      ended_sessions: endedSessions,
      avg_session_duration_ms: avgDuration,
      median_session_duration_ms: medianDuration || 0,
      max_session_duration_ms: maxDuration,
      min_session_duration_ms: minDuration,
      session_distribution: [], // Bu Redis'ten gelecek
      top_pages: topPages,
      top_referrers: topReferrers
    };
  }

  /**
   * Zaman aralığı başlangıç tarihini hesaplar
   */
  private getTimeRangeStartDate(timeRange: AnalyticsTimeRange): Date {
    const now = new Date();
    
    switch (timeRange) {
      case 'today':
        return new Date(now.getFullYear(), now.getMonth(), now.getDate());
      case '7d':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      case '30d':
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      case '90d':
        return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      default:
        return new Date(now.getTime() - 24 * 60 * 60 * 1000);
    }
  }

  /**
   * Cleanup işlemini gerçekleştirir
   */
  private async performCleanup(): Promise<void> {
    try {
      console.log('SessionManager: Performing cleanup...');
      
      // Bu metod daha sonra implement edilecek
      // Şimdilik sadece log yazıyoruz
      
    } catch (error) {
      console.error('SessionManager: Error during cleanup:', error);
    }
  }

  /**
   * Session Manager'ın durumunu getirir
   */
  public getStatus(): { isInitialized: boolean; isRunning: boolean } {
    return {
      isInitialized: this.isInitialized,
      isRunning: this.cleanupInterval !== undefined
    };
  }
}
