/**
 * Heartbeat Mechanism Implementation
 * 
 * Bu dosya Active Users tracking için heartbeat mechanism'ini implement eder.
 * Client-side heartbeat (10 saniye + jitter), sendBeacon ile page unload,
 * Activity detection (mouse/keyboard) ve server-side heartbeat processing.
 */

import { PresenceTracker } from './presence';
import { HeartbeatPayload, HeartbeatResponse, PresenceData } from './types';
import { HEARTBEAT_MS, TTL_MS } from './constants';

export class HeartbeatManager {
  private presenceTracker: PresenceTracker;
  private activeHeartbeats: Map<string, NodeJS.Timeout> = new Map();

  constructor(presenceTracker: PresenceTracker) {
    this.presenceTracker = presenceTracker;
  }

  /**
   * Heartbeat'i işler
   * @param payload - Heartbeat payload
   * @returns Heartbeat response
   */
  public async processHeartbeat(payload: HeartbeatPayload): Promise<HeartbeatResponse> {
    try {
      const { shop, visitor_id, session_id, page_path, user_agent } = payload;

      console.log('HeartbeatManager: Processing heartbeat', { shop, visitor_id, session_id, page_path });

      // Presence data oluştur - Server timestamp kullan
      const presenceData: PresenceData = {
        shop,
        visitor_id,
        session_id: session_id || undefined,
        timestamp: Date.now(), // Her zaman server timestamp kullan
        page_path,
        user_agent: user_agent || undefined,
      };

      console.log('HeartbeatManager: Created presence data', presenceData);

      // Visitor presence'ını güncelle
      await this.presenceTracker.updateVisitorPresence(presenceData);
      console.log('HeartbeatManager: Updated visitor presence');

      // Session varsa session presence'ını da güncelle
      if (session_id) {
        await this.presenceTracker.updateSessionPresence(presenceData);
        console.log('HeartbeatManager: Updated session presence');
      }

      // Heartbeat timeout'ını ayarla
      this.setHeartbeatTimeout(shop, visitor_id);

      return {
        success: true,
        next_heartbeat_in: this.calculateNextHeartbeatInterval(),
      };
    } catch (error) {
      console.error('Error processing heartbeat:', error);
      return {
        success: false,
        message: 'Failed to process heartbeat',
        next_heartbeat_in: HEARTBEAT_MS,
      };
    }
  }

  /**
   * Page unload heartbeat'ini işler
   * @param payload - Heartbeat payload
   * @returns Heartbeat response
   */
  public async processPageUnload(payload: HeartbeatPayload): Promise<HeartbeatResponse> {
    try {
      const { shop, visitor_id, session_id } = payload;

      // Visitor'ı offline yap
      await this.presenceTracker.setVisitorOffline(shop, visitor_id);

      // Session varsa session'ı da offline yap
      if (session_id) {
        await this.presenceTracker.setSessionOffline(shop, session_id);
      }

      // Heartbeat timeout'ını temizle
      this.clearHeartbeatTimeout(shop, visitor_id);

      return {
        success: true,
      };
    } catch (error) {
      console.error('Error processing page unload:', error);
      return {
        success: false,
        message: 'Failed to process page unload',
      };
    }
  }

  /**
   * Heartbeat timeout'ını ayarlar
   * @param shop - Mağaza kimliği
   * @param visitor_id - Visitor kimliği
   */
  private setHeartbeatTimeout(shop: string, visitor_id: string): void {
    const key = `${shop}:${visitor_id}`;
    
    // Mevcut timeout'ı temizle
    this.clearHeartbeatTimeout(shop, visitor_id);

    // Yeni timeout ayarla
    const timeout = setTimeout(async () => {
      await this.handleHeartbeatTimeout(shop, visitor_id);
    }, TTL_MS);

    this.activeHeartbeats.set(key, timeout);
  }

  /**
   * Heartbeat timeout'ını temizler
   * @param shop - Mağaza kimliği
   * @param visitor_id - Visitor kimliği
   */
  private clearHeartbeatTimeout(shop: string, visitor_id: string): void {
    const key = `${shop}:${visitor_id}`;
    const timeout = this.activeHeartbeats.get(key);
    
    if (timeout) {
      clearTimeout(timeout);
      this.activeHeartbeats.delete(key);
    }
  }

  /**
   * Heartbeat timeout'ını işler
   * @param shop - Mağaza kimliği
   * @param visitor_id - Visitor kimliği
   */
  private async handleHeartbeatTimeout(shop: string, visitor_id: string): Promise<void> {
    try {
      // Visitor'ı offline yap
      await this.presenceTracker.setVisitorOffline(shop, visitor_id);
      
      // Timeout'ı temizle
      this.clearHeartbeatTimeout(shop, visitor_id);
      
      console.log(`Heartbeat timeout for ${shop}:${visitor_id}`);
    } catch (error) {
      console.error('Error handling heartbeat timeout:', error);
    }
  }

  /**
   * Sonraki heartbeat interval'ını hesaplar
   * @returns Sonraki heartbeat interval (ms)
   */
  private calculateNextHeartbeatInterval(): number {
    // Jitter ekle (±20% random)
    const jitter = (Math.random() - 0.5) * 0.4; // -20% ile +20% arası
    const baseInterval = HEARTBEAT_MS;
    const jitteredInterval = baseInterval * (1 + jitter);
    
    return Math.max(1000, Math.min(30000, jitteredInterval)); // 1-30 saniye arası
  }

  /**
   * Aktif heartbeat'leri getirir
   * @returns Aktif heartbeat sayısı
   */
  public getActiveHeartbeatCount(): number {
    return this.activeHeartbeats.size;
  }

  /**
   * Tüm heartbeat'leri temizler
   */
  public clearAllHeartbeats(): void {
    for (const [, timeout] of this.activeHeartbeats) {
      clearTimeout(timeout);
    }
    this.activeHeartbeats.clear();
  }

  /**
   * Heartbeat istatistiklerini getirir
   * @returns Heartbeat istatistikleri
   */
  public getHeartbeatStats(): {
    active_heartbeats: number;
    total_processed: number;
    timeout_rate: number;
  } {
    return {
      active_heartbeats: this.activeHeartbeats.size,
      total_processed: 0, // Bu değer production'da counter ile takip edilebilir
      timeout_rate: 0, // Bu değer production'da hesaplanabilir
    };
  }
}

/**
 * Client-side heartbeat helper'ları
 * Bu fonksiyonlar browser'da çalışacak JavaScript kodlarıdır
 */
export const ClientHeartbeatHelpers = {
  /**
   * Heartbeat gönderir
   * @param endpoint - Heartbeat endpoint URL
   * @param payload - Heartbeat payload
   * @returns Promise<boolean>
   */
  async sendHeartbeat(endpoint: string, payload: HeartbeatPayload): Promise<boolean> {
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json() as HeartbeatResponse;
      return result.success;
    } catch (error) {
      console.error('Error sending heartbeat:', error);
      return false;
    }
  },

  /**
   * Page unload heartbeat'ini gönderir (sendBeacon kullanarak)
   * @param endpoint - Page unload endpoint URL
   * @param payload - Heartbeat payload
   * @returns boolean
   */
  sendPageUnload(endpoint: string, payload: HeartbeatPayload): boolean {
    try {
      if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
        const data = JSON.stringify(payload);
        return navigator.sendBeacon(endpoint, data);
      } else {
        // Fallback: synchronous fetch
        fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
          keepalive: true,
        }).catch(() => {
          // Ignore errors during page unload
        });
        return true;
      }
    } catch (error) {
      console.error('Error sending page unload heartbeat:', error);
      return false;
    }
  },

  /**
   * Activity detection başlatır
   * @param onActivity - Activity callback
   * @returns Cleanup function
   */
  startActivityDetection(onActivity: () => void): () => void {
    let lastActivity = Date.now();
    const activityThreshold = 1000; // 1 saniye

    const handleActivity = () => {
      const now = Date.now();
      if (now - lastActivity > activityThreshold) {
        lastActivity = now;
        onActivity();
      }
    };

    // Event listeners ekle
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    events.forEach(event => {
      if (typeof document !== 'undefined') {
        document.addEventListener(event, handleActivity, { passive: true });
      }
    });

    // Cleanup function döndür
    return () => {
      events.forEach(event => {
        if (typeof document !== 'undefined') {
          document.removeEventListener(event, handleActivity);
        }
      });
    };
  },

  /**
   * Heartbeat interval'ını başlatır
   * @param endpoint - Heartbeat endpoint URL
   * @param payload - Heartbeat payload
   * @param onSuccess - Success callback
   * @param onError - Error callback
   * @returns Cleanup function
   */
  startHeartbeatInterval(
    endpoint: string,
    payload: HeartbeatPayload,
    onSuccess?: (response: HeartbeatResponse) => void,
    onError?: (error: Error) => void
  ): () => void {
    let intervalId: NodeJS.Timeout;
    let isActive = true;

    const sendHeartbeat = async () => {
      if (!isActive) return;

      try {
        const success = await ClientHeartbeatHelpers.sendHeartbeat(endpoint, payload);
        
        if (success && onSuccess) {
          onSuccess({ success: true, next_heartbeat_in: HEARTBEAT_MS });
        } else if (!success && onError) {
          onError(new Error('Heartbeat failed'));
        }
      } catch (error) {
        if (onError) {
          onError(error as Error);
        }
      }
    };

    // İlk heartbeat'i hemen gönder
    sendHeartbeat();

    // Interval başlat
    intervalId = setInterval(sendHeartbeat, HEARTBEAT_MS);

    // Page unload listener ekle
    const handlePageUnload = () => {
      ClientHeartbeatHelpers.sendPageUnload(endpoint.replace('/beat', '/bye'), payload);
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', handlePageUnload);
      window.addEventListener('pagehide', handlePageUnload);
    }

    // Cleanup function döndür
    return () => {
      isActive = false;
      clearInterval(intervalId);
      if (typeof window !== 'undefined') {
        window.removeEventListener('beforeunload', handlePageUnload);
        window.removeEventListener('pagehide', handlePageUnload);
      }
    };
  },
};