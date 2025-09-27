/**
 * Shopify Trafik Takip Uygulaması - Ana Sunucu Dosyası
 * 
 * Bu dosya, Shopify mağazaları için gelişmiş trafik takip ve analitik sistemi sağlar.
 * Fastify framework'ü kullanarak yüksek performanslı bir API sunucusu oluşturur.
 * 
 * Özellikler:
 * - Gerçek zamanlı kullanıcı takibi (presence tracking)
 * - Sayfa görüntüleme analitikleri
 * - E-ticaret olay takibi
 * - Performans metrikleri
 * - Redis tabanlı önbellekleme
 * - WebSocket desteği
 */

import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import staticFiles from '@fastify/static';
import websocket from '@fastify/websocket';
import { join } from 'path';
import dotenv from 'dotenv';

// Ortam değişkenlerini yükle (.env dosyasından)
dotenv.config();

// Yardımcı araçları ve servisleri içe aktar
import { db, redis, createLogger, setupRequestTracking, getHealthStatus } from './tracking/utils';
import { ActiveUsersManager } from './tracking/active-users';
import { verifyProxyHmac, getShopFromQuery, HMAC_ERRORS } from './tracking/utils/hmac-verification';

// Sunucu için logger oluştur
const logger = createLogger('Server');

// Active Users Manager instance
const activeUsersManager = new ActiveUsersManager();

/**
 * App konfigürasyonunu getirir (feature flags ile)
 * @param shop - Mağaza kimliği
 * @returns App konfigürasyonu
 */
async function getAppConfig(shop: string) {
  return {
    version: '1.0.0',
    features: {
      activeUsers: true,
      pageAnalytics: true,
      sessions: true,
      ecommerce: true,
      performance: true,
    },
    settings: {
      heartbeatInterval: 10000, // 10 saniye
      ttl: 30000, // 30 saniye
      tickInterval: 5000, // 5 saniye
      emaTauFast: 10, // 10 saniye
      emaTauSlow: 60, // 60 saniye
    },
    endpoints: {
      collect: '/apps/app-proxy/collect',
      config: '/apps/app-proxy/config.json',
    },
    shop,
    timestamp: Date.now(),
  };
}

/**
 * Dashboard HTML'ini oluşturur
 * @param shop - Mağaza kimliği
 * @returns Dashboard HTML
 */
// Unused function removed to fix compilation error
/*
function generateDashboardHtml(shop: string): string {
  return `
<!DOCTYPE html>
<html lang="tr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>HRL Traffic Tracking - Dashboard</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }
        
        .dashboard-container {
            background: white;
            border-radius: 16px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
            padding: 40px;
            max-width: 600px;
            width: 100%;
            text-align: center;
        }
        
        .logo {
            width: 80px;
            height: 80px;
            background: linear-gradient(135deg, #667eea, #764ba2);
            border-radius: 50%;
            margin: 0 auto 20px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 32px;
            color: white;
            font-weight: bold;
        }
        
        .title {
            font-size: 28px;
            font-weight: 700;
            color: #2d3748;
            margin-bottom: 10px;
        }
        
        .subtitle {
            color: #718096;
            font-size: 16px;
            margin-bottom: 40px;
        }
        
        .status-card {
            background: #f7fafc;
            border-radius: 12px;
            padding: 30px;
            margin-bottom: 30px;
            border-left: 4px solid #e2e8f0;
        }
        
        .status-indicator {
            display: inline-flex;
            align-items: center;
            gap: 10px;
            font-size: 18px;
            font-weight: 600;
            margin-bottom: 20px;
        }
        
        .status-dot {
            width: 12px;
            height: 12px;
            border-radius: 50%;
            animation: pulse 2s infinite;
        }
        
        .status-running .status-dot {
            background: #48bb78;
        }
        
        .status-error .status-dot {
            background: #f56565;
        }
        
        .status-inactive .status-dot {
            background: #ed8936;
        }
        
        @keyframes pulse {
            0% { opacity: 1; }
            50% { opacity: 0.5; }
            100% { opacity: 1; }
        }
        
        .metrics {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin-top: 20px;
        }
        
        .metric {
            background: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.05);
        }
        
        .metric-value {
            font-size: 24px;
            font-weight: 700;
            color: #2d3748;
        }
        
        .metric-label {
            color: #718096;
            font-size: 14px;
            margin-top: 5px;
        }
        
        .loading {
            display: none;
        }
        
        .loading.show {
            display: block;
        }
        
        .spinner {
            width: 40px;
            height: 40px;
            border: 4px solid #e2e8f0;
            border-top: 4px solid #667eea;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin: 0 auto 20px;
        }
        
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        
        .error-message {
            color: #f56565;
            background: #fed7d7;
            padding: 15px;
            border-radius: 8px;
            margin-top: 20px;
        }
        
        .success-message {
            color: #48bb78;
            background: #c6f6d5;
            padding: 15px;
            border-radius: 8px;
            margin-top: 20px;
        }
    </style>
</head>
<body>
    <div class="dashboard-container">
        <div class="logo">HRL</div>
        <h1 class="title">Traffic Tracking Dashboard</h1>
        <p class="subtitle">Mağaza: ${shop}</p>
        
        <div class="loading" id="loading">
            <div class="spinner"></div>
            <p>Uygulama durumu kontrol ediliyor...</p>
        </div>
        
        <div class="status-card" id="statusCard" style="display: none;">
            <div class="status-indicator" id="statusIndicator">
                <div class="status-dot"></div>
                <span id="statusText">Kontrol ediliyor...</span>
            </div>
            
            <div id="statusMessage"></div>
            
            <div class="metrics" id="metrics" style="display: none;">
                <div class="metric">
                    <div class="metric-value" id="activeUsers">-</div>
                    <div class="metric-label">Aktif Kullanıcı</div>
                </div>
                <div class="metric">
                    <div class="metric-value" id="activeSessions">-</div>
                    <div class="metric-label">Aktif Oturum</div>
                </div>
            </div>
        </div>
    </div>

    <script>
        async function checkAppStatus() {
            const loading = document.getElementById('loading');
            const statusCard = document.getElementById('statusCard');
            const statusIndicator = document.getElementById('statusIndicator');
            const statusText = document.getElementById('statusText');
            const statusMessage = document.getElementById('statusMessage');
            const metrics = document.getElementById('metrics');
            const activeUsers = document.getElementById('activeUsers');
            const activeSessions = document.getElementById('activeSessions');
            
            try {
                loading.classList.add('show');
                statusCard.style.display = 'none';
                
                const response = await fetch('/api/dashboard/status');
                const data = await response.json();
                
                loading.classList.remove('show');
                statusCard.style.display = 'block';
                
                if (data.success) {
                    const { app_status, tracking_status, metrics: appMetrics } = data.data;
                    
                    // Uygulama durumu
                    if (app_status === 'running') {
                        statusIndicator.className = 'status-indicator status-running';
                        statusText.textContent = 'Uygulama Başarıyla Çalışıyor!';
                        statusMessage.innerHTML = '<div class="success-message">✅ Tüm sistemler aktif ve çalışıyor.</div>';
                    } else {
                        statusIndicator.className = 'status-indicator status-error';
                        statusText.textContent = 'Uygulama Hatası';
                        statusMessage.innerHTML = '<div class="error-message">❌ Uygulama çalışmıyor. Lütfen destek ile iletişime geçin.</div>';
                    }
                    
                    // Tracking durumu
                    if (tracking_status === 'active') {
                        statusMessage.innerHTML += '<div class="success-message">📊 Trafik takibi aktif - Veriler toplanıyor.</div>';
                        metrics.style.display = 'grid';
                        activeUsers.textContent = appMetrics.active_users || 0;
                        activeSessions.textContent = appMetrics.active_sessions || 0;
                    } else {
                        statusMessage.innerHTML += '<div class="error-message">⚠️ Trafik takibi henüz aktif değil. Mağaza ziyaretçileri bekleniyor.</div>';
                    }
                    
                } else {
                    statusIndicator.className = 'status-indicator status-error';
                    statusText.textContent = 'Durum Kontrolü Başarısız';
                    statusMessage.innerHTML = '<div class="error-message">❌ Uygulama durumu kontrol edilemedi.</div>';
                }
                
            } catch (error) {
                loading.classList.remove('show');
                statusCard.style.display = 'block';
                
                statusIndicator.className = 'status-indicator status-error';
                statusText.textContent = 'Bağlantı Hatası';
                statusMessage.innerHTML = '<div class="error-message">❌ Sunucuya bağlanılamadı. Lütfen internet bağlantınızı kontrol edin.</div>';
                
                console.error('Dashboard error:', error);
            }
        }
        
        // Sayfa yüklendiğinde durumu kontrol et
        document.addEventListener('DOMContentLoaded', checkAppStatus);
        
        // Her 30 saniyede bir güncelle
        setInterval(checkAppStatus, 30000);
    </script>
</body>
</html>
  `;
}
*/

/**
 * Tracking script'ini oluşturur
 * @param config - App konfigürasyonu
 * @returns JavaScript tracking script
 */
function generateTrackingScript(config: any): string {
  return `
(function() {
  'use strict';
  
  // App configuration
  const CONFIG = ${JSON.stringify(config)};
  
  // Global tracking object
  window.HRLTracking = {
    config: CONFIG,
    initialized: false,
    heartbeatInterval: null,
    visitorId: null,
    sessionId: null,
    
    // Initialize tracking
    init: function() {
      if (this.initialized) return;
      
      this.visitorId = this.getOrCreateVisitorId();
      this.sessionId = this.generateSessionId();
      
      this.startActiveUsers();
      this.startPageAnalytics();
      this.startSessions();
      
      this.initialized = true;
      console.log('HRL Tracking initialized');
    },
    
    // Get or create visitor ID
    getOrCreateVisitorId: function() {
      let visitorId = localStorage.getItem('hrl_visitor_id');
      if (!visitorId) {
        visitorId = 'visitor_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem('hrl_visitor_id', visitorId);
      }
      return visitorId;
    },
    
    // Generate session ID
    generateSessionId: function() {
      return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    },
    
    // Start active users tracking
    startActiveUsers: function() {
      if (!CONFIG.features.activeUsers) return;
      
      const self = this;
      
      // Heartbeat function
      function sendHeartbeat() {
        fetch(CONFIG.endpoints.collect, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Shop': CONFIG.shop
          },
          body: JSON.stringify({
            event_type: 'heartbeat',
            data: {
              visitor_id: self.visitorId,
              session_id: self.sessionId,
              page_path: window.location.pathname,
              timestamp: Date.now()
            }
          })
        }).catch(err => console.warn('Heartbeat failed:', err));
      }
      
      // Send initial heartbeat
      sendHeartbeat();
      
      // Set up periodic heartbeat
      this.heartbeatInterval = setInterval(sendHeartbeat, CONFIG.settings.heartbeatInterval);
      
      // Send heartbeat on page unload
      window.addEventListener('beforeunload', function() {
        if (self.heartbeatInterval) {
          clearInterval(self.heartbeatInterval);
        }
        
        // Send final heartbeat
        navigator.sendBeacon(CONFIG.endpoints.collect, JSON.stringify({
          event_type: 'page_unload',
          data: {
            visitor_id: self.visitorId,
            session_id: self.sessionId,
            page_path: window.location.pathname,
            timestamp: Date.now()
          }
        }));
      });
    },
    
    // Start page analytics
    startPageAnalytics: function() {
      if (!CONFIG.features.pageAnalytics) return;
      
      const self = this;
      const startTime = Date.now();
      
      // Track page view
      fetch(CONFIG.endpoints.collect, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shop': CONFIG.shop
        },
        body: JSON.stringify({
          event_type: 'page_view',
          data: {
            visitor_id: self.visitorId,
            session_id: self.sessionId,
            page_path: window.location.pathname,
            page_title: document.title,
            referrer: document.referrer,
            timestamp: startTime
          }
        })
      }).catch(err => console.warn('Page view tracking failed:', err));
      
      // Track page close
      window.addEventListener('beforeunload', function() {
        const duration = Date.now() - startTime;
        
        navigator.sendBeacon(CONFIG.endpoints.collect, JSON.stringify({
          event_type: 'page_close',
          data: {
            visitor_id: self.visitorId,
            session_id: self.sessionId,
            page_path: window.location.pathname,
            duration_ms: duration,
            timestamp: Date.now()
          }
        }));
      });
    },
    
    // Start session tracking
    startSessions: function() {
      if (!CONFIG.features.sessions) return;
      
      const self = this;
      
      // Track session start
      fetch(CONFIG.endpoints.collect, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shop': CONFIG.shop
        },
        body: JSON.stringify({
          event_type: 'session_start',
          data: {
            visitor_id: self.visitorId,
            session_id: self.sessionId,
            page_path: window.location.pathname,
            timestamp: Date.now()
          }
        })
      }).catch(err => console.warn('Session tracking failed:', err));
    }
  };
  
  // Auto-initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      window.HRLTracking.init();
    });
  } else {
    window.HRLTracking.init();
  }
})();
`;
}

/**
 * Tracking event'ini işler
 * @param shop - Mağaza kimliği
 * @param eventType - Event türü
 * @param data - Event verisi
 */
async function processTrackingEvent(shop: string, eventType: string, data: any) {
  try {
    switch (eventType) {
      case 'heartbeat':
        await activeUsersManager.processHeartbeat(data);
        break;
        
      case 'page_unload':
        await activeUsersManager.processPageUnload(data);
        break;
        
      case 'page_view':
        // Page view'i database'e kaydet
        await db.getServiceClient()
          .from('page_views')
          .insert({
            shop,
            visitor_id: data.visitor_id,
            session_id: data.session_id,
            page_path: data.page_path,
            page_title: data.page_title,
            referrer: data.referrer,
            timestamp: new Date(data.timestamp),
          });
        break;
        
      case 'page_close':
        // Page close'i güncelle
        await db.getServiceClient()
          .from('page_views')
          .update({
            ended_at: new Date(data.timestamp),
            duration_ms: data.duration_ms,
            is_bounce: data.duration_ms < 10000,
          })
          .eq('visitor_id', data.visitor_id)
          .eq('session_id', data.session_id)
          .eq('page_path', data.page_path);
        break;
        
      case 'session_start':
        // Session'ı Redis'e kaydet
        await redis.addPresence(shop, data.visitor_id, data.session_id, data.page_path);
        break;
        
      default:
        logger.warn('Unknown event type', { eventType, shop });
    }
  } catch (error) {
    logger.error('Event processing failed', { error, eventType, shop });
    throw error;
  }
}

/**
 * Fastify sunucu instance'ını oluştur
 * 
 * Konfigürasyon:
 * - Loglama seviyesi ortam değişkeninden alınır
 * - Development modunda pretty print aktif
 * - Proxy güveni aktif (load balancer arkasında çalışabilir)
 * - Maksimum body boyutu 1MB
 */
const fastify = Fastify({
  logger: process.env['NODE_ENV'] === 'development' ? {
    level: process.env['LOG_LEVEL'] || 'info',
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true
      }
    }
  } : {
    level: process.env['LOG_LEVEL'] || 'info'
  },
  trustProxy: true,
  bodyLimit: 1048576, // 1MB
});

/**
 * Fastify eklentilerini kaydet
 * 
 * Bu fonksiyon güvenlik, performans ve işlevsellik eklentilerini yükler:
 * - CORS: Cross-origin istekler için
 * - Helmet: Güvenlik başlıkları
 * - Rate Limiting: İstek sınırlaması
 * - Static Files: Statik dosya servisi
 * - WebSocket: Gerçek zamanlı iletişim
 */
async function registerPlugins() {
  // CORS (Cross-Origin Resource Sharing) yapılandırması
  // Tüm origin'lere izin verir ve credentials destekler
  await fastify.register(cors, {
    origin: true,
    credentials: true,
  });

  // Güvenlik başlıkları (Helmet)
  // Content Security Policy ile XSS saldırılarını önler
  await fastify.register(helmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'", "wss:", "https:"],
      },
    },
  });

  // Rate limiting (İstek sınırlaması)
  // Spam ve DDoS saldırılarını önler
  await fastify.register(rateLimit, {
    max: parseInt(process.env['RATE_LIMIT_MAX'] || '1000'), // Maksimum istek sayısı
    timeWindow: parseInt(process.env['RATE_LIMIT_TIME_WINDOW'] || '60000'), // Zaman penceresi (ms)
    keyGenerator: (request) => {
      // Rate limiting için benzersiz anahtar oluştur
      // IP + shop kombinasyonu kullanarak mağaza bazında sınırlama
      const ip = request.ip;
      const shop = request.headers['x-shop'] as string;
      return shop ? `${ip}:${shop}` : ip;
    },
  });

  // Statik dosya servisi
  // Public klasöründeki dosyaları /public/ prefix'i ile sunar
  await fastify.register(staticFiles, {
    root: join(__dirname, '../public'),
    prefix: '/public/',
  });

  // WebSocket desteği
  // Gerçek zamanlı güncellemeler için
  await fastify.register(websocket);
}

/**
 * HMAC Doğrulama Middleware'i
 * 
 * Tüm /app-proxy/* istekleri için HMAC doğrulaması yapar.
 * Bu sayede sadece Shopify'dan gelen isteklerin kabul edilmesi sağlanır.
 */
async function setupHmacMiddleware() {
  // App Proxy istekleri için HMAC doğrulaması
  fastify.addHook('preHandler', async (request, reply) => {
    // Sadece /app-proxy/* istekleri için çalış
    if (!request.url.startsWith('/app-proxy/')) {
      return;
    }

    try {
      const apiSecret = process.env['SHOPIFY_API_SECRET'];
      
      // API Secret kontrolü
      if (!apiSecret) {
        logger.error('SHOPIFY_API_SECRET environment variable is missing');
        return reply.status(500).send({ 
          error: 'Server configuration error',
          message: 'API secret not configured'
        });
      }

      // HMAC doğrulaması
      const isValidHmac = verifyProxyHmac(request.query as Record<string, any>, apiSecret);
      
      if (!isValidHmac) {
        logger.warn('Invalid HMAC signature', { 
          url: request.url,
          ip: request.ip,
          userAgent: request.headers['user-agent']
        });
        
        return reply.status(401).send({ 
          error: 'Unauthorized',
          message: HMAC_ERRORS.INVALID_HMAC
        });
      }

      // Güvenli shop bilgisini al
      const shop = getShopFromQuery(request.query as Record<string, any>);
      
      if (!shop) {
        logger.warn('Invalid shop format', { 
          url: request.url,
          query: request.query
        });
        
        return reply.status(400).send({ 
          error: 'Bad Request',
          message: HMAC_ERRORS.INVALID_SHOP
        });
      }

      // Shop bilgisini request'e ekle (güvenli)
      (request as any).shop = shop;
      
      logger.debug('HMAC verification successful', { shop, url: request.url });
      
    } catch (error) {
      logger.error('HMAC verification error', { error, url: request.url });
      return reply.status(500).send({ 
        error: 'Internal Server Error',
        message: 'HMAC verification failed'
      });
    }
  });
}

/**
 * Sistem sağlık kontrolü endpoint'i
 * 
 * Bu endpoint, sistem bileşenlerinin (veritabanı, Redis) sağlık durumunu kontrol eder.
 * Load balancer'lar ve monitoring sistemleri tarafından kullanılır.
 * 
 * @returns {Object} Sistem sağlık durumu
 */
fastify.get('/health', async (_request, reply) => {
  try {
    const health = await getHealthStatus();
    // Sağlık durumuna göre HTTP status kodu döndür
    reply.status(health.status === 'healthy' ? 200 : 503).send(health);
  } catch (error) {
    logger.error('Health check failed', { error });
    reply.status(503).send({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Health check failed',
    });
  }
});

/**
 * Sistem metrikleri endpoint'i
 * 
 * Bu endpoint, sistem performans metriklerini döndürür.
 * Prometheus veya diğer monitoring sistemleri tarafından kullanılabilir.
 * 
 * @returns {Object} Sistem metrikleri
 */
fastify.get('/metrics', async (_request, reply) => {
  try {
    const { metricsCollector } = await import('./tracking/utils');
    const metrics = metricsCollector.getMetrics();
    reply.send(metrics);
  } catch (error) {
    logger.error('Metrics retrieval failed', { error });
    reply.status(500).send({ error: 'Metrics retrieval failed' });
  }
});


/**
 * API route'larını kaydet
 * 
 * Bu fonksiyon tüm API endpoint'lerini organize eder:
 * - Presence tracking (kullanıcı varlık takibi)
 * - Data collection (veri toplama)
 * - Analytics API (analitik veriler)
 */
async function registerRoutes() {
  /**
   * Shopify Embedded App Routes
   * 
   * Shopify admin panelinde embedded olarak çalışan uygulama için gerekli route'lar.
   */
  fastify.register(async function (fastify) {
    // Dashboard route for embedded app
    fastify.get('/dashboard', async (request, reply) => {
      try {
        const { shop, host } = request.query as { 
          shop?: string; 
          hmac?: string; 
          host?: string; 
          timestamp?: string; 
        };

        if (!shop || !shop.endsWith('.myshopify.com')) {
          return reply.status(400).send({ error: 'Invalid shop parameter' });
        }

        // Check if shop is installed
        const { data: shopData } = await db.getClient()
          .from('shops')
          .select('*')
          .eq('shop_domain', shop)
          .single();

        if (!shopData) {
          return reply.status(404).send({ error: 'Shop not found' });
        }

        // Embedded app HTML
        const dashboardHtml = `
          <!DOCTYPE html>
          <html>
          <head>
            <title>HRL Tracking Dashboard</title>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <script src="https://unpkg.com/@shopify/app-bridge@3"></script>
            <style>
              body { 
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                margin: 0; 
                padding: 20px; 
                background: #f6f6f7;
              }
              .container {
                max-width: 1200px;
                margin: 0 auto;
                background: white;
                border-radius: 8px;
                padding: 24px;
                box-shadow: 0 1px 3px rgba(0,0,0,0.1);
              }
              .header {
                border-bottom: 1px solid #e1e3e5;
                padding-bottom: 16px;
                margin-bottom: 24px;
              }
              .title {
                font-size: 24px;
                font-weight: 600;
                color: #202223;
                margin: 0;
              }
              .subtitle {
                color: #6d7175;
                margin: 4px 0 0 0;
              }
              .stats-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
                gap: 16px;
                margin-bottom: 24px;
              }
              .stat-card {
                background: #f6f6f7;
                padding: 16px;
                border-radius: 6px;
                border-left: 4px solid #008060;
              }
              .stat-value {
                font-size: 24px;
                font-weight: 600;
                color: #202223;
                margin: 0;
              }
              .stat-label {
                color: #6d7175;
                font-size: 14px;
                margin: 4px 0 0 0;
              }
              .section {
                margin-bottom: 32px;
              }
              .section-title {
                font-size: 18px;
                font-weight: 600;
                color: #202223;
                margin: 0 0 16px 0;
              }
              .status-badge {
                display: inline-block;
                padding: 4px 8px;
                border-radius: 4px;
                font-size: 12px;
                font-weight: 500;
                background: #d4edda;
                color: #155724;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1 class="title">HRL Tracking Dashboard</h1>
                <p class="subtitle">Shop: ${shop}</p>
                <span class="status-badge">Active</span>
              </div>
              
              <div class="stats-grid">
                <div class="stat-card">
                  <p class="stat-value">0</p>
                  <p class="stat-label">Active Users</p>
                </div>
                <div class="stat-card">
                  <p class="stat-value">0</p>
                  <p class="stat-label">Page Views</p>
                </div>
                <div class="stat-card">
                  <p class="stat-value">0</p>
                  <p class="stat-label">Sessions</p>
                </div>
                <div class="stat-card">
                  <p class="stat-value">0</p>
                  <p class="stat-label">Conversions</p>
                </div>
              </div>

              <div class="section">
                <h2 class="section-title">Recent Activity</h2>
                <p style="color: #6d7175;">No recent activity to display.</p>
              </div>

              <div class="section">
                <h2 class="section-title">Settings</h2>
                <p style="color: #6d7175;">App settings will be available here.</p>
              </div>
            </div>

            <script>
              // Initialize Shopify App Bridge
              if (window.ShopifyAppBridge) {
                const AppBridge = window.ShopifyAppBridge.default;
                const createApp = AppBridge.createApp;
                
                const app = createApp({
                  apiKey: '${process.env['SHOPIFY_API_KEY']}',
                  shopOrigin: '${shop}',
                  host: '${host}',
                });

                // Set app title
                app.dispatch(AppBridge.actions.TitleBar.set, {
                  title: 'HRL Tracking'
                });
              }
            </script>
          </body>
          </html>
        `;

        return reply
          .type('text/html')
          .header('Content-Security-Policy', "default-src 'self' 'unsafe-inline' 'unsafe-eval' https:; frame-ancestors https://*.myshopify.com https://admin.shopify.com;")
          .header('X-Frame-Options', 'ALLOWALL')
          .send(dashboardHtml);

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error('Dashboard error', { error: errorMessage });
        return reply.status(500).send({ error: 'Dashboard error' });
      }
    });
  });

  /**
   * Shopify OAuth Routes
   * 
   * Uygulamanın Shopify mağazalarına yüklenmesi için gerekli OAuth akışı.
   */
  fastify.register(async function (fastify) {
    // OAuth callback endpoint
    fastify.get('/auth/callback', async (request, reply) => {
      try {
        const { code, shop } = request.query as { code: string; shop: string; state?: string };
        
        logger.info('OAuth callback received', { 
          code: code ? 'present' : 'missing', 
          shop: shop || 'missing',
          query: request.query 
        });
        
        if (!code || !shop) {
          logger.error('Missing OAuth parameters', { code: !!code, shop: !!shop, query: request.query });
          return reply.status(400).send({ 
            error: 'Missing required parameters',
            details: { code: !!code, shop: !!shop }
          });
        }

        // Shop domain'ini doğrula
        if (!shop.endsWith('.myshopify.com')) {
          logger.error('Invalid shop domain', { shop });
          return reply.status(400).send({ error: 'Invalid shop domain' });
        }

        // Access token al
        logger.info('Attempting to exchange code for token', { shop });
        const accessToken = await exchangeCodeForToken(shop, code);
        
        if (!accessToken) {
          logger.error('Failed to exchange code for token', { shop, code: code.substring(0, 10) + '...' });
          return reply.status(500).send({ 
            error: 'Failed to authenticate',
            details: 'Token exchange failed'
          });
        }

        logger.info('Access token obtained successfully', { shop });

        // Shop bilgilerini al
        logger.info('Fetching shop information', { shop });
        const shopInfo = await getShopInfo(shop, accessToken);
        
        if (!shopInfo) {
          logger.error('Failed to fetch shop info', { shop });
          return reply.status(500).send({ 
            error: 'Failed to fetch shop information'
          });
        }

        // Veritabanına kaydet
        logger.info('Saving shop data to database', { shop });
        await saveShopData(shop, accessToken, shopInfo);

        logger.info('Shop successfully authenticated', { shop });

        // Embedded app için App Bridge ile yönlendir
        const successHtml = `
          <!DOCTYPE html>
          <html>
          <head>
            <title>HRL Tracking - Successfully Installed</title>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <script src="https://unpkg.com/@shopify/app-bridge@3"></script>
            <style>
              body { 
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                text-align: center; 
                padding: 50px; 
                background: #f6f6f7;
              }
              .success { color: #28a745; font-size: 24px; margin-bottom: 20px; }
              .message { color: #666; font-size: 16px; margin-bottom: 10px; }
              .redirecting { color: #007bff; font-size: 14px; margin-top: 20px; }
            </style>
          </head>
          <body>
            <div class="success">✅ Successfully Installed!</div>
            <div class="message">HRL Tracking has been successfully installed to your store.</div>
            <div class="message">Redirecting to admin dashboard...</div>
            <div class="redirecting">If you are not redirected automatically, <a href="https://${shop}/admin/apps" target="_top">click here</a>.</div>
            
            <script>
              // App Bridge ile admin'e yönlendir
              if (window.ShopifyAppBridge) {
                const AppBridge = window.ShopifyAppBridge.default;
                const createApp = AppBridge.createApp;
                
                const app = createApp({
                  apiKey: '${process.env['SHOPIFY_API_KEY']}',
                  shopOrigin: '${shop}',
                });

                // Admin'e yönlendir
                app.dispatch(AppBridge.actions.Redirect.toApp, {
                  path: '/dashboard'
                });
                
                // Alternatif: Admin apps sayfasına yönlendir
                setTimeout(() => {
                  window.location.href = 'https://${shop}/admin/apps';
                }, 1000);
              } else {
                // Fallback: Admin apps sayfasına yönlendir
                setTimeout(() => {
                  window.location.href = 'https://${shop}/admin/apps';
                }, 2000);
              }
            </script>
          </body>
          </html>
        `;

        return reply
          .type('text/html')
          .header('Content-Security-Policy', "default-src 'self' 'unsafe-inline' 'unsafe-eval' https:; frame-ancestors https://*.myshopify.com https://admin.shopify.com;")
          .header('X-Frame-Options', 'ALLOWALL')
          .send(successHtml);

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        const errorStack = error instanceof Error ? error.stack : undefined;
        
        logger.error('OAuth callback error', { 
          error: errorMessage, 
          stack: errorStack,
          query: request.query 
        });
        return reply.status(500).send({ 
          error: 'Authentication failed',
          details: errorMessage
        });
      }
    });

    // App installation redirect
    fastify.get('/auth/install', async (request, reply) => {
      try {
        const { shop } = request.query as { shop: string };
        
        if (!shop) {
          return reply.status(400).send({ error: 'Shop parameter required' });
        }

        // Shop domain'ini doğrula
        if (!shop.endsWith('.myshopify.com')) {
          return reply.status(400).send({ error: 'Invalid shop domain' });
        }

        // OAuth URL oluştur
        const clientId = process.env['SHOPIFY_API_KEY'];
        const redirectUri = `${process.env['SHOPIFY_APP_URL']}/auth/callback`;
        const scopes = 'read_products,write_products,read_orders,write_orders,read_analytics';
        
        const authUrl = `https://${shop}/admin/oauth/authorize?client_id=${clientId}&scope=${scopes}&redirect_uri=${encodeURIComponent(redirectUri)}&state=install`;

        return reply.redirect(authUrl);

      } catch (error) {
        logger.error('Install redirect error', { error });
        return reply.status(500).send({ error: 'Installation failed' });
      }
    });
  });

  /**
   * Presence Tracking Route'ları
   * 
   * Kullanıcıların gerçek zamanlı varlığını takip eder.
   * WebSocket ve Server-Sent Events kullanarak canlı güncellemeler sağlar.
   */
  fastify.register(async function (fastify) {
    /**
     * Kullanıcı heartbeat endpoint'i
     * 
     * Kullanıcının aktif olduğunu bildirmek için periyodik olarak çağrılır.
     * Bu sayede gerçek zamanlı "kimler çevrimiçi" bilgisi sağlanır.
     * 
     * @param {Object} body - Heartbeat verisi (visitor_id, session_id, page_path)
     * @returns {Object} Başarı durumu
     */
    fastify.post('/presence/beat', async (request, reply) => {
      try {
        const { heartbeatPayloadSchema } = await import('./tracking/utils/validation');
        const payload = heartbeatPayloadSchema.parse(request.body);
        
        // Kullanıcı varlığını Redis'e ekle
        await redis.addPresence(
          request.headers['x-shop'] as string,
          payload.visitor_id,
          payload.session_id,
          payload.page_path
        );

        reply.send({ success: true, message: 'Heartbeat recorded' });
      } catch (error) {
        logger.error('Heartbeat recording failed', { error });
        reply.status(400).send({ error: 'Invalid heartbeat data' });
      }
    });

    fastify.post('/presence/bye', async (request, reply) => {
      try {
        const { heartbeatPayloadSchema } = await import('./tracking/utils/validation');
        const payload = heartbeatPayloadSchema.parse(request.body);
        
        // Remove from current session tracking
        await redis.removeCurrentSession(
          request.headers['x-shop'] as string,
          payload.visitor_id
        );

        reply.send({ success: true, message: 'Session ended' });
      } catch (error) {
        logger.error('Session end recording failed', { error });
        reply.status(400).send({ error: 'Invalid session end data' });
      }
    });

    // SSE endpoint for real-time updates
    fastify.get('/presence/stream', { websocket: true }, (connection, req) => {
      const shop = req.headers['x-shop'] as string;
      if (!shop) {
        connection.socket.close(1008, 'Shop header required');
        return;
      }

      logger.info('SSE connection established', { shop });

      // Subscribe to shop-specific updates
      const channel = `presence:${shop}`;
      redis.subscribe(channel, (message) => {
        connection.socket.send(JSON.stringify(message));
      });

      connection.socket.on('close', () => {
        logger.info('SSE connection closed', { shop });
      });
    });
  });

  // Collect routes
  fastify.register(async function (fastify) {
    // Page view collection
    fastify.post('/collect/page_view', async (request, reply) => {
      try {
        const { pageViewSchema } = await import('./tracking/utils/validation');
        const pageView = pageViewSchema.parse(request.body);
        
        // Store in database
        const { error } = await db.getServiceClient()
          .from('page_views')
          .insert(pageView);

        if (error) {
          logger.error('Page view insertion failed', { error });
          reply.status(500).send({ error: 'Failed to record page view' });
          return;
        }

        reply.send({ success: true, message: 'Page view recorded' });
      } catch (error) {
        logger.error('Page view collection failed', { error });
        reply.status(400).send({ error: 'Invalid page view data' });
      }
    });

    // Page close collection
    fastify.post('/collect/page_close', async (request, reply) => {
      try {
        const { view_id, duration_ms } = request.body as { view_id: string; duration_ms: number };
        
        // Update page view with end time and duration
        const { error } = await db.getServiceClient()
          .from('page_views')
          .update({
            ended_at: new Date(),
            duration_ms,
            is_bounce: duration_ms < 10000, // 10 second threshold
          })
          .eq('view_id', view_id);

        if (error) {
          logger.error('Page close update failed', { error });
          reply.status(500).send({ error: 'Failed to update page view' });
          return;
        }

        reply.send({ success: true, message: 'Page close recorded' });
      } catch (error) {
        logger.error('Page close collection failed', { error });
        reply.status(400).send({ error: 'Invalid page close data' });
      }
    });
  });

  // App Proxy routes
  fastify.register(async function (fastify) {
    // App Proxy tracking script endpoint
    fastify.get('/app-proxy/tracking.js', async (request, reply) => {
      try {
        // Shop bilgisini güvenli şekilde al (HMAC middleware'den)
        const shop = (request as any).shop as string;

        // Feature flags'i al
        const config = await getAppConfig(shop);
        
        // Tracking script'i oluştur
        const trackingScript = generateTrackingScript(config);
        
        reply
          .type('application/javascript')
          .header('Cache-Control', 'public, max-age=300') // 5 dakika cache
          .send(trackingScript);
      } catch (error) {
        logger.error('Tracking script generation failed', { error });
        reply.status(500).send({ error: 'Failed to generate tracking script' });
      }
    });

    // App Proxy config endpoint
    fastify.get('/app-proxy/config.json', async (request, reply) => {
      try {
        // Shop bilgisini güvenli şekilde al (HMAC middleware'den)
        const shop = (request as any).shop as string;

        const config = await getAppConfig(shop);
        
        reply
          .type('application/json')
          .header('Cache-Control', 'public, max-age=60') // 1 dakika cache
          .send(config);
      } catch (error) {
        logger.error('Config generation failed', { error });
        reply.status(500).send({ error: 'Failed to generate config' });
      }
    });

    // App Proxy collect endpoint
    fastify.post('/app-proxy/collect', async (request, reply) => {
      try {
        // Shop bilgisini güvenli şekilde al (HMAC middleware'den)
        const shop = (request as any).shop as string;

        const { event_type, data } = request.body as { event_type: string; data: any };
        
        // Event'i işle
        await processTrackingEvent(shop, event_type, data);
        
        reply.send({ success: true, message: 'Event recorded' });
      } catch (error) {
        logger.error('Event collection failed', { error });
        reply.status(400).send({ error: 'Invalid event data' });
      }
    });

    // App Proxy collect endpoint (without HMAC for theme extension)
    fastify.post('/collect', async (request, reply) => {
      try {
        const { type, shop, ...data } = request.body as any;
        
        if (!shop) {
          return reply.status(400).send({ error: 'Shop parameter required' });
        }

        // Event'i işle
        await processTrackingEvent(shop, type, data);
        
        reply.send({ success: true, message: 'Event recorded' });
      } catch (error) {
        logger.error('Event collection failed', { error });
        reply.status(400).send({ error: 'Invalid event data' });
      }
    });
  });

  // Main app route - OAuth flow starter
  fastify.get('/', async (request, reply) => {
    try {
      const { shop, hmac, host, timestamp } = request.query as { 
        shop?: string; 
        hmac?: string; 
        host?: string; 
        timestamp?: string; 
      };

      // Eğer shop parametresi varsa, OAuth akışını başlat
      if (shop && shop.endsWith('.myshopify.com')) {
        // Shop'un zaten yüklü olup olmadığını kontrol et
        const { data: existingShop } = await db.getClient()
          .from('shops')
          .select('*')
          .eq('shop_domain', shop)
          .single();

        if (existingShop) {
          // Shop zaten yüklü, embedded app dashboard'a yönlendir
          const dashboardUrl = `/dashboard?shop=${shop}&hmac=${hmac}&host=${host}&timestamp=${timestamp}`;
          return reply.redirect(dashboardUrl);
        } else {
          // Shop yüklü değil, OAuth akışını başlat
          const clientId = process.env['SHOPIFY_API_KEY'];
          const redirectUri = `${process.env['SHOPIFY_APP_URL']}/auth/callback`;
          const scopes = 'read_products,write_products,read_orders,write_orders,read_analytics';
          
          const authUrl = `https://${shop}/admin/oauth/authorize?client_id=${clientId}&scope=${scopes}&redirect_uri=${encodeURIComponent(redirectUri)}&state=install`;
          
          return reply.redirect(authUrl);
        }
      }

      // Shop parametresi yoksa, basit bir bilgi sayfası göster
      const infoHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>HRL Tracking App</title>
          <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
            .info { color: #333; font-size: 18px; margin-bottom: 20px; }
            .status { color: #28a745; font-size: 16px; }
          </style>
        </head>
        <body>
          <div class="info">🚀 HRL Tracking App</div>
          <div class="status">Application is running and ready for installation</div>
          <div class="status">Version: 1.0.0</div>
        </body>
        </html>
      `;

      return reply
        .type('text/html')
        .header('Content-Security-Policy', "default-src 'self' 'unsafe-inline' 'unsafe-eval' https:; frame-ancestors https://*.myshopify.com https://admin.shopify.com;")
        .header('X-Frame-Options', 'ALLOWALL')
        .send(infoHtml);

    } catch (error) {
      logger.error('Main route error', { error });
      return reply.status(500).send({ error: 'Application error' });
    }
  });

  // Dashboard API routes (keeping only API endpoints, removing duplicate /dashboard route)
  fastify.register(async function (fastify) {
    // Dashboard API - Uygulama durumu
    fastify.get('/api/dashboard/status', async (request, reply) => {
      try {
        const shop = (request as any).shop as string;
        if (!shop) {
          reply.status(400).send({ error: 'Shop header required' });
          return;
        }

        // Sistem durumunu kontrol et
        const health = await getHealthStatus();
        const activeUsers = await redis.getActiveUsers(shop);
        const activeSessions = await redis.getActiveSessions(shop);

        // Uygulama durumu
        const isHealthy = health.status === 'healthy';
        const isTrackingActive = activeUsers > 0 || activeSessions > 0;

        reply.send({
          success: true,
          data: {
            app_status: isHealthy ? 'running' : 'error',
            tracking_status: isTrackingActive ? 'active' : 'inactive',
            health: health,
            metrics: {
              active_users: activeUsers,
              active_sessions: activeSessions,
              timestamp: new Date().toISOString()
            }
          }
        });
      } catch (error) {
        logger.error('Dashboard status check failed', { error });
        reply.status(500).send({ 
          success: false,
          error: 'Status check failed',
          data: {
            app_status: 'error',
            tracking_status: 'unknown'
          }
        });
      }
    });
  });

  // API routes
  fastify.register(async function (fastify) {
    // Analytics endpoints
    fastify.get('/api/analytics/daily', async (request, reply) => {
      try {
        const shop = request.headers['x-shop'] as string;
        if (!shop) {
          reply.status(400).send({ error: 'Shop header required' });
          return;
        }

        const { data, error } = await db.getClient()
          .from('page_daily_analytics')
          .select('*')
          .eq('shop', shop)
          .order('date_bucket', { ascending: false })
          .limit(30);

        if (error) {
          logger.error('Daily analytics query failed', { error });
          reply.status(500).send({ error: 'Failed to fetch analytics' });
          return;
        }

        reply.send({ success: true, data });
      } catch (error) {
        logger.error('Daily analytics retrieval failed', { error });
        reply.status(500).send({ error: 'Analytics retrieval failed' });
      }
    });

    // Active users endpoint
    fastify.get('/api/analytics/active-users', async (request, reply) => {
      try {
        const shop = request.headers['x-shop'] as string;
        if (!shop) {
          reply.status(400).send({ error: 'Shop header required' });
          return;
        }

        const activeUsers = await redis.getActiveUsers(shop);
        const activeSessions = await redis.getActiveSessions(shop);

        reply.send({
          success: true,
          data: {
            active_users: activeUsers,
            active_sessions: activeSessions,
            timestamp: new Date().toISOString(),
          },
        });
      } catch (error) {
        logger.error('Active users retrieval failed', { error });
        reply.status(500).send({ error: 'Active users retrieval failed' });
      }
    });
  });
}

// Error handling
fastify.setErrorHandler(async (error, request, reply) => {
  logger.error('Unhandled error', { error, url: request.url, method: request.method });
  
  // Scope error kontrolü
  if (error.statusCode === 403) {
    const { ScopeErrorHandler } = await import('./tracking/utils/scope-error-handler');
    
    if (ScopeErrorHandler.isScopeError(error)) {
      ScopeErrorHandler.handleScopeError(error, {
        url: request.url,
        method: request.method,
        shop: request.headers['x-shop'] as string,
        timestamp: Date.now()
      });
      
      reply.status(403).send({
        error: 'Scope error',
        message: 'Bu özellik için ek izin gerekli. Lütfen uygulamayı güncelleyin.',
        required_scope: ScopeErrorHandler.extractRequiredScope(error)
      });
      return;
    }
  }
  
  reply.status(500).send({
    error: 'Internal server error',
    message: process.env['NODE_ENV'] === 'development' ? error.message : 'Something went wrong',
  });
});

// Graceful shutdown
async function gracefulShutdown(signal: string) {
  logger.info(`Received ${signal}, shutting down gracefully`);
  
  try {
    await activeUsersManager.stop();
    await fastify.close();
    await redis.cleanup();
    logger.info('Server closed successfully');
    process.exit(0);
  } catch (error) {
    logger.error('Error during shutdown', { error });
    process.exit(1);
  }
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Start server
async function start() {
  try {
    // Check database and Redis connections
    logger.info('Checking database and Redis connections...');
    const dbHealthy = await db.healthCheck();
    const redisHealthy = await redis.healthCheck();

    if (!dbHealthy) {
      logger.error('Database connection failed');
      throw new Error('Database connection failed');
    }

    if (!redisHealthy) {
      logger.error('Redis connection failed');
      throw new Error('Redis connection failed');
    }

    logger.info('Database and Redis connections established successfully');

    // Register plugins and routes
    await registerPlugins();
    await registerRoutes();

    // Setup HMAC middleware
    await setupHmacMiddleware();
    logger.info('HMAC middleware configured');

    // Setup request tracking
    setupRequestTracking(fastify);

    // Start Active Users Manager
    await activeUsersManager.start();
    logger.info('Active Users Manager started');

    // Start server
    const port = parseInt(process.env['PORT'] || '3000');
    const host = process.env['HOST'] || '0.0.0.0';

    await fastify.listen({ port, host });
    
    logger.info(`Server running on http://${host}:${port}`);
    logger.info('Health check available at /health');
    logger.info('Metrics available at /metrics');
    
    // Graceful shutdown
    process.on('SIGTERM', async () => {
      logger.info('SIGTERM received, shutting down gracefully');
      await fastify.close();
      process.exit(0);
    });
    
    process.on('SIGINT', async () => {
      logger.info('SIGINT received, shutting down gracefully');
      await fastify.close();
      process.exit(0);
    });
  } catch (error) {
    logger.error('Failed to start server', { error });
    process.exit(1);
  }
}

/**
 * OAuth Helper Functions
 */

/**
 * Authorization code'u access token ile değiştir
 */
async function exchangeCodeForToken(shop: string, code: string): Promise<string | null> {
  try {
    const clientId = process.env['SHOPIFY_API_KEY'];
    const clientSecret = process.env['SHOPIFY_API_SECRET'];

    logger.info('Token exchange attempt', { 
      shop, 
      clientId: clientId ? 'present' : 'missing',
      clientSecret: clientSecret ? 'present' : 'missing',
      code: code.substring(0, 10) + '...'
    });

    if (!clientId || !clientSecret) {
      logger.error('Missing Shopify API credentials', { 
        clientId: !!clientId, 
        clientSecret: !!clientSecret 
      });
      return null;
    }

    const requestBody = {
      client_id: clientId,
      client_secret: clientSecret,
      code: code,
    };

    logger.info('Making token exchange request', { 
      url: `https://${shop}/admin/oauth/access_token`,
      body: { ...requestBody, code: '***' }
    });

    const response = await fetch(`https://${shop}/admin/oauth/access_token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    logger.info('Token exchange response', { 
      status: response.status, 
      statusText: response.statusText
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error('Token exchange failed', { 
        status: response.status, 
        statusText: response.statusText,
        error: errorText
      });
      return null;
    }

    const data = await response.json();
    logger.info('Token exchange successful', { 
      hasAccessToken: !!data.access_token,
      scope: data.scope
    });
    
    return data.access_token || null;

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    logger.error('Token exchange error', { 
      error: errorMessage, 
      stack: errorStack 
    });
    return null;
  }
}

/**
 * Shop bilgilerini al
 */
async function getShopInfo(shop: string, accessToken: string): Promise<any> {
  try {
    const response = await fetch(`https://${shop}/admin/api/2025-07/shop.json`, {
      headers: {
        'X-Shopify-Access-Token': accessToken,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      logger.error('Shop info fetch failed', { status: response.status });
      return null;
    }

    const data = await response.json();
    return data.shop;

  } catch (error) {
    logger.error('Shop info error', { error });
    return null;
  }
}

/**
 * Shop verilerini veritabanına kaydet
 */
async function saveShopData(shop: string, accessToken: string, shopInfo: any): Promise<void> {
  try {
    logger.info('Attempting to save shop data', { 
      shop, 
      hasShopInfo: !!shopInfo,
      shopName: shopInfo?.name 
    });

    const { error } = await db.getClient()
      .from('shops')
      .upsert({
        shop_domain: shop,
        access_token: accessToken,
        shop_name: shopInfo?.name || '',
        shop_email: shopInfo?.email || '',
        shop_currency: shopInfo?.currency || '',
        shop_timezone: shopInfo?.timezone || '',
        installed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

    if (error) {
      logger.error('Failed to save shop data', { 
        error: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint
      });
      
      // If table doesn't exist, log warning but don't fail
      if (error.code === 'PGRST116' || error.message.includes('relation "shops" does not exist')) {
        logger.warn('Shops table does not exist, skipping database save', { shop });
        return;
      }
      
      throw error;
    }

    logger.info('Shop data saved successfully', { shop });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('Save shop data error', { 
      error: errorMessage,
      shop 
    });
    
    // Don't throw error for missing table, just log warning
    if (errorMessage.includes('relation "shops" does not exist')) {
      logger.warn('Shops table does not exist, continuing without database save', { shop });
      return;
    }
    
    throw error;
  }
}

// Start the server
start();
