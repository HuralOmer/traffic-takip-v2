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
import { db, redis, createLogger, setupRequestTracking, getHealthStatus, hashIP } from './tracking/utils';
import { ActiveUsersManager } from './tracking/active-users';
import { SessionManager } from './tracking/sessions';

// Sunucu için logger oluştur
const logger = createLogger('Server');

// Active Users Manager instance
const activeUsersManager = new ActiveUsersManager();

// Session Manager instance
const sessionManager = new SessionManager();

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
 * Referrer'ı analiz eder ve kaynak bilgisini döndürür
 * @param referrer - Referrer URL
 * @param userAgent - User Agent string
 */
function analyzeReferrer(referrer: string, userAgent: string): {
  source: string;
  platform: string;
  isSocial: boolean;
  isApp: boolean;
  details: string;
} {
  const ua = userAgent.toLowerCase();
  const ref = referrer.toLowerCase();
  
  // Instagram tespiti
  if (ref.includes('instagram.com') || ua.includes('instagram')) {
    return {
      source: 'Instagram',
      platform: ua.includes('instagram') ? 'Instagram App' : 'Instagram Web',
      isSocial: true,
      isApp: ua.includes('instagram'),
      details: `Instagram ${ua.includes('instagram') ? 'App' : 'Web'} - ${referrer}`
    };
  }
  
  // Facebook tespiti
  if (ref.includes('facebook.com') || ref.includes('fb.com') || ua.includes('fban') || ua.includes('fbav')) {
    return {
      source: 'Facebook',
      platform: ua.includes('fban') || ua.includes('fbav') ? 'Facebook App' : 'Facebook Web',
      isSocial: true,
      isApp: ua.includes('fban') || ua.includes('fbav'),
      details: `Facebook ${ua.includes('fban') || ua.includes('fbav') ? 'App' : 'Web'} - ${referrer}`
    };
  }
  
  // Twitter tespiti
  if (ref.includes('twitter.com') || ref.includes('t.co') || ua.includes('twitter')) {
    return {
      source: 'Twitter',
      platform: ua.includes('twitter') ? 'Twitter App' : 'Twitter Web',
      isSocial: true,
      isApp: ua.includes('twitter'),
      details: `Twitter ${ua.includes('twitter') ? 'App' : 'Web'} - ${referrer}`
    };
  }
  
  // TikTok tespiti
  if (ref.includes('tiktok.com') || ua.includes('tiktok')) {
    return {
      source: 'TikTok',
      platform: ua.includes('tiktok') ? 'TikTok App' : 'TikTok Web',
      isSocial: true,
      isApp: ua.includes('tiktok'),
      details: `TikTok ${ua.includes('tiktok') ? 'App' : 'Web'} - ${referrer}`
    };
  }
  
  // Google tespiti
  if (ref.includes('google.com') || ref.includes('google.') || ua.includes('googlebot')) {
    return {
      source: 'Google',
      platform: 'Google Search',
      isSocial: false,
      isApp: false,
      details: `Google Search - ${referrer}`
    };
  }
  
  // YouTube tespiti
  if (ref.includes('youtube.com') || ref.includes('youtu.be') || ua.includes('youtube')) {
    return {
      source: 'YouTube',
      platform: ua.includes('youtube') ? 'YouTube App' : 'YouTube Web',
      isSocial: true,
      isApp: ua.includes('youtube'),
      details: `YouTube ${ua.includes('youtube') ? 'App' : 'Web'} - ${referrer}`
    };
  }
  
  // WhatsApp tespiti
  if (ua.includes('whatsapp')) {
    return {
      source: 'WhatsApp',
      platform: 'WhatsApp App',
      isSocial: true,
      isApp: true,
      details: `WhatsApp App - ${referrer || 'No referrer'}`
    };
  }
  
  // Telegram tespiti
  if (ua.includes('telegram')) {
    return {
      source: 'Telegram',
      platform: 'Telegram App',
      isSocial: true,
      isApp: true,
      details: `Telegram App - ${referrer || 'No referrer'}`
    };
  }
  
  // Direct/Empty referrer
  if (!referrer || referrer === '') {
    return {
      source: 'Direct',
      platform: 'Direct Visit',
      isSocial: false,
      isApp: false,
      details: 'Direct visit or bookmark'
    };
  }
  
  // External site
  return {
    source: 'External',
    platform: 'External Website',
    isSocial: false,
    isApp: false,
    details: `External site - ${referrer}`
  };
}

/**
 * Shop'un veritabanında var olduğundan emin olur
 * @param shop - Mağaza kimliği
 */
async function ensureShopExists(shop: string): Promise<void> {
  try {
    logger.info('Checking if shop exists', { shop });
    
    // Önce basit bir test yapalım
    try {
      const { data: testData, error: testError } = await db.getServiceClient()
        .from('shops')
        .select('id')
        .limit(1);
      
      logger.info('Database connection test', { testData, testError });
    } catch (testErr) {
      logger.error('Database connection test failed', { testErr });
    }
    
    // Shop'un var olup olmadığını kontrol et
    const { data: existingShop, error: checkError } = await db.getServiceClient()
      .from('shops')
      .select('id')
      .eq('shop_domain', shop)
      .single();

    logger.info('Shop check result', { 
      shop, 
      existingShop, 
      checkError: checkError ? { 
        code: checkError.code, 
        message: checkError.message,
        details: checkError.details,
        hint: checkError.hint
      } : null 
    });

    if (checkError && checkError.code === 'PGRST116') {
      // Shop yoksa oluştur (PGRST116 = row not found)
      logger.info('Creating shop record for universal tracking', { shop });
      
      try {
        const { error: insertError } = await db.getServiceClient()
          .from('shops')
          .insert({
            shop_domain: shop,
            access_token: 'universal_tracking', // Universal tracking için özel token
            shop_name: shop.replace('.myshopify.com', '').replace('.com', ''),
            shop_email: '',
            shop_currency: 'USD',
            shop_timezone: 'UTC',
            installed_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });

        if (insertError) {
          logger.error('Failed to create shop record', { 
            shop, 
            error: {
              message: insertError.message,
              code: insertError.code,
              details: insertError.details,
              hint: insertError.hint
            }
          });
        } else {
          logger.info('Shop record created successfully', { shop });
        }
      } catch (insertErr) {
        logger.error('Exception during shop creation', { 
          shop, 
          insertErr: insertErr instanceof Error ? {
            message: insertErr.message,
            stack: insertErr.stack,
            name: insertErr.name
          } : {
            type: typeof insertErr,
            string: String(insertErr),
            json: JSON.stringify(insertErr, null, 2)
          }
        });
      }
    } else if (existingShop) {
      // Shop zaten var, updated_at'i güncelle
      logger.info('Shop already exists, updating timestamp', { shop });
      try {
        await db.getServiceClient()
          .from('shops')
          .update({ updated_at: new Date().toISOString() })
          .eq('shop_domain', shop);
      } catch (updateErr) {
        logger.error('Exception during shop update', { 
          shop, 
          updateErr: updateErr instanceof Error ? {
            message: updateErr.message,
            stack: updateErr.stack,
            name: updateErr.name
          } : {
            type: typeof updateErr,
            string: String(updateErr),
            json: JSON.stringify(updateErr, null, 2)
          }
        });
      }
    } else if (checkError) {
      // Başka bir hata var
      logger.error('Error checking shop existence', { 
        shop, 
        error: {
          message: checkError.message,
          code: checkError.code,
          details: checkError.details,
          hint: checkError.hint
        }
      });
    } else {
      // Shop var ama existingShop null
      logger.info('Shop exists but existingShop is null', { shop });
    }
  } catch (error) {
    logger.error('Error ensuring shop exists', { 
      shop, 
      error: error instanceof Error ? {
        message: error.message,
        stack: error.stack,
        name: error.name
      } : error,
      errorType: typeof error,
      errorString: String(error)
    });
  }
}

/**
 * Tracking event'ini işler
 * @param shop - Mağaza kimliği
 * @param eventType - Event türü
 * @param data - Event verisi
 */
async function processTrackingEvent(shop: string, eventType: string, data: any) {
  try {
    // Shop'u veritabanına kaydet (eğer yoksa)
    await ensureShopExists(shop);
    
    switch (eventType) {
      case 'heartbeat':
        await activeUsersManager.processHeartbeat(data);
        break;
        
      case 'page_unload':
        await activeUsersManager.processPageUnload(data);
        break;
        
      case 'page_view':
        // Referrer analizi yap
        const referrerAnalysis = analyzeReferrer(data.referrer || '', data.user_agent || '');
        
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
            referrer_source: referrerAnalysis.source,
            referrer_platform: referrerAnalysis.platform,
            is_social_traffic: referrerAnalysis.isSocial,
            is_app_traffic: referrerAnalysis.isApp,
            timestamp: new Date(data.timestamp),
          });
        
        logger.info('Page view recorded with referrer analysis', {
          shop,
          referrer: data.referrer,
          analysis: referrerAnalysis
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
        // Session tracking artık heartbeat ile yapılıyor
        // await redis.addPresence(shop, data.visitor_id, data.session_id, data.page_path);
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
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Shop', 'Accept'],
    exposedHeaders: ['Content-Length', 'X-Request-Id'],
    maxAge: 86400, // 24 hours
  });

  // Güvenlik başlıkları (Helmet)
  // Content Security Policy ile XSS saldırılarını önler
  await fastify.register(helmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https:"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'", "wss:", "https:"],
        frameSrc: ["'self'", "https:"],
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
  // Register static file serving (optional)
  try {
    await fastify.register(staticFiles, {
      root: join(__dirname, '../public'),
      prefix: '/public/',
    });
    logger.info('Static file serving registered');
  } catch (error) {
    logger.warn('Static file serving failed, continuing without it', { error });
  }

  // WebSocket desteği
  // Gerçek zamanlı güncellemeler için
  await fastify.register(websocket);
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

        // Shop bilgilerini al (veritabanından değil, OAuth'dan)
        logger.info('Dashboard accessed for shop', { shop });

        // Embedded app HTML
        const dashboardHtml = `
          <!DOCTYPE html>
          <html>
          <head>
            <title>HRL Tracking Dashboard</title>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <script src="https://unpkg.com/@shopify/app-bridge@3"></script>
            <script>
              // App Bridge'i başlat
              if (window.ShopifyAppBridge) {
                const AppBridge = window.ShopifyAppBridge.default;
                const createApp = AppBridge.createApp;
                
                const app = createApp({
                  apiKey: '${process.env['SHOPIFY_API_KEY']}',
                  shopOrigin: '${shop}',
                });
                
                // App Bridge'i global olarak erişilebilir yap
                window.app = app;
              }
            </script>
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
                  <p class="stat-value" id="activeUsers">-</p>
                  <p class="stat-label">Active Users</p>
                </div>
                <div class="stat-card">
                  <p class="stat-value" id="activeSessions">-</p>
                  <p class="stat-label">Active Sessions</p>
                </div>
                <div class="stat-card">
                  <p class="stat-value" id="totalSessions">-</p>
                  <p class="stat-label">Total Sessions (Today)</p>
                </div>
                <div class="stat-card">
                  <p class="stat-value" id="avgSessionDuration">-</p>
                  <p class="stat-label">Avg Session Duration</p>
                </div>
                <div class="stat-card">
                  <p class="stat-value" id="bounceRate">-</p>
                  <p class="stat-label">Bounce Rate</p>
                </div>
                <div class="stat-card">
                  <p class="stat-value" id="returnVisitors">-</p>
                  <p class="stat-label">Return Visitors</p>
                </div>
              </div>

              <div class="section">
                <h2 class="section-title">Session Analytics</h2>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 24px;">
                  <div>
                    <h3 style="font-size: 16px; font-weight: 600; color: #202223; margin: 0 0 12px 0;">Session Distribution</h3>
                    <div id="sessionDistribution" style="background: #f6f6f7; padding: 16px; border-radius: 6px; min-height: 200px;">
                      <p style="color: #6d7175; text-align: center; margin: 50px 0;">Loading session distribution...</p>
                    </div>
                  </div>
                  <div>
                    <h3 style="font-size: 16px; font-weight: 600; color: #202223; margin: 0 0 12px 0;">Top Pages</h3>
                    <div id="topPages" style="background: #f6f6f7; padding: 16px; border-radius: 6px; min-height: 200px;">
                      <p style="color: #6d7175; text-align: center; margin: 50px 0;">Loading top pages...</p>
                    </div>
                  </div>
                </div>
              </div>

              <div class="section">
                <h2 class="section-title">Recent Activity</h2>
                <div id="recentActivity" style="background: #f6f6f7; padding: 16px; border-radius: 6px;">
                  <p style="color: #6d7175; text-align: center; margin: 20px 0;">Loading recent activity...</p>
                </div>
              </div>

              <div class="section">
                <h2 class="section-title">Settings</h2>
                <div style="display: flex; gap: 12px; flex-wrap: wrap;">
                  <button id="refreshData" style="background: #008060; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; font-size: 14px;">
                    Refresh Data
                  </button>
                  <button id="clearData" style="background: #dc3545; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; font-size: 14px;">
                    Clear All Data
                  </button>
                </div>
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

              // Load dashboard data
              async function loadDashboardData() {
                try {
                  // Load active users and sessions
                  const response = await fetch('/api/dashboard/status?shop=${shop}');
                  const data = await response.json();
                  
                  if (data.success) {
                    const metrics = data.data.metrics;
                    document.getElementById('activeUsers').textContent = metrics.active_users || 0;
                    document.getElementById('activeSessions').textContent = metrics.active_sessions || 0;
                  }

                  // Load session analytics
                  const analyticsResponse = await fetch('/api/sessions/analytics?shop=${shop}&time_range=today');
                  const analyticsData = await analyticsResponse.json();
                  
                  if (analyticsData.success) {
                    const analytics = analyticsData.data.analytics;
                    document.getElementById('totalSessions').textContent = analytics.total_sessions || 0;
                    document.getElementById('avgSessionDuration').textContent = formatDuration(analytics.avg_session_duration_ms || 0);
                    document.getElementById('bounceRate').textContent = (analytics.bounce_rate || 0).toFixed(1) + '%';
                    document.getElementById('returnVisitors').textContent = (analytics.return_visitor_rate || 0).toFixed(1) + '%';
                  }

                  // Load session distribution
                  const distributionResponse = await fetch('/api/sessions/distribution?shop=${shop}');
                  const distributionData = await distributionResponse.json();
                  
                  if (distributionData.success) {
                    displaySessionDistribution(distributionData.data.distribution || []);
                  }

                  // Load top pages
                  if (analyticsData.success) {
                    displayTopPages(analyticsData.data.analytics.top_pages || []);
                  }

                  // Load recent activity
                  loadRecentActivity();

                } catch (error) {
                  console.error('Failed to load dashboard data:', error);
                }
              }

              // Format duration helper
              function formatDuration(ms) {
                if (ms < 1000) return ms + 'ms';
                const seconds = Math.floor(ms / 1000);
                if (seconds < 60) return seconds + 's';
                const minutes = Math.floor(seconds / 60);
                if (minutes < 60) return minutes + 'm ' + (seconds % 60) + 's';
                const hours = Math.floor(minutes / 60);
                return hours + 'h ' + (minutes % 60) + 'm';
              }

              // Display session distribution
              function displaySessionDistribution(distribution) {
                const container = document.getElementById('sessionDistribution');
                if (distribution.length === 0) {
                  container.innerHTML = '<p style="color: #6d7175; text-align: center; margin: 50px 0;">No session data available</p>';
                  return;
                }

                let html = '<div style="display: flex; flex-direction: column; gap: 8px;">';
                distribution.forEach(item => {
                  html += \`
                    <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px; background: white; border-radius: 4px;">
                      <span style="font-weight: 500;">\${item.bucket} sessions</span>
                      <span style="color: #6d7175;">\${item.count} visitors (\${item.percentage.toFixed(1)}%)</span>
                    </div>
                  \`;
                });
                html += '</div>';
                container.innerHTML = html;
              }

              // Display top pages
              function displayTopPages(pages) {
                const container = document.getElementById('topPages');
                if (pages.length === 0) {
                  container.innerHTML = '<p style="color: #6d7175; text-align: center; margin: 50px 0;">No page data available</p>';
                  return;
                }

                let html = '<div style="display: flex; flex-direction: column; gap: 8px;">';
                pages.slice(0, 5).forEach(page => {
                  html += \`
                    <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px; background: white; border-radius: 4px;">
                      <span style="font-weight: 500; max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">\${page.page}</span>
                      <span style="color: #6d7175;">\${page.session_count} (\${page.percentage.toFixed(1)}%)</span>
                    </div>
                  \`;
                });
                html += '</div>';
                container.innerHTML = html;
              }

              // Load recent activity
              function loadRecentActivity() {
                const container = document.getElementById('recentActivity');
                const now = new Date();
                const timeStr = now.toLocaleTimeString('tr-TR');
                
                container.innerHTML = \`
                  <div style="display: flex; flex-direction: column; gap: 8px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px; background: white; border-radius: 4px;">
                      <span>Dashboard data refreshed</span>
                      <span style="color: #6d7175; font-size: 12px;">\${timeStr}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px; background: white; border-radius: 4px;">
                      <span>Session analytics loaded</span>
                      <span style="color: #6d7175; font-size: 12px;">\${timeStr}</span>
                    </div>
                  </div>
                \`;
              }

              // Load data on page load
              loadDashboardData();
              
              // Refresh data every 30 seconds
              setInterval(loadDashboardData, 30000);

              // Button event listeners
              document.getElementById('refreshData').addEventListener('click', () => {
                loadDashboardData();
              });

              document.getElementById('clearData').addEventListener('click', async () => {
                if (confirm('Are you sure you want to clear all tracking data? This action cannot be undone.')) {
                  try {
                    const response = await fetch('/api/debug/clear-redis?shop=${shop}', { method: 'POST' });
                    const result = await response.json();
                    if (result.success) {
                      alert('Data cleared successfully');
                      loadDashboardData();
                    } else {
                      alert('Failed to clear data');
                    }
                  } catch (error) {
                    console.error('Error clearing data:', error);
                    alert('Error clearing data');
                  }
                }
              });
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
          query: request.query,
          fullUrl: request.url,
          headers: request.headers
        });
        
        if (!code || !shop) {
          logger.error('Missing OAuth parameters', { code: !!code, shop: !!shop, query: request.query });
          return reply.status(400).send({ 
            error: 'Missing required parameters',
            details: { code: !!code, shop: !!shop, query: request.query }
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
          logger.error('Failed to exchange code for token', { 
            shop, 
            code: code.substring(0, 10) + '...',
            clientId: process.env['SHOPIFY_API_KEY'] ? 'present' : 'missing',
            clientSecret: process.env['SHOPIFY_API_SECRET'] ? 'present' : 'missing'
          });
          return reply.status(500).send({ 
            error: 'Failed to authenticate',
            details: 'Token exchange failed - check API credentials'
          });
        }

        logger.info('Access token obtained successfully', { shop });

        // Shop bilgilerini al
        logger.info('Fetching shop information', { shop });
        const shopInfo = await getShopInfo(shop, accessToken);
        
        if (!shopInfo) {
          logger.error('Failed to fetch shop info', { 
            shop,
            accessToken: accessToken ? 'present' : 'missing'
          });
          return reply.status(500).send({ 
            error: 'Failed to fetch shop information',
            details: 'Could not retrieve shop data from Shopify API'
          });
        }

        // Veritabanına kaydet
        logger.info('Saving shop data to database', { shop });
        try {
          await saveShopData(shop, accessToken, shopInfo);
        } catch (error) {
          logger.warn('Failed to save shop data, continuing without database save', { 
            shop, 
            error: error instanceof Error ? error.message : String(error) 
          });
          // Database hatası olsa bile OAuth'u başarılı say
        }

        logger.info('Shop successfully authenticated', { shop });

        // Embedded app için doğru yönlendirme
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
            <div class="message">Redirecting to app...</div>
            
            <script>
              // App Bridge ile embedded app'e yönlendir
              if (window.ShopifyAppBridge) {
                try {
                  const AppBridge = window.ShopifyAppBridge.default;
                  const createApp = AppBridge.createApp;
                  
                  const app = createApp({
                    apiKey: '${process.env['SHOPIFY_API_KEY']}',
                    shopOrigin: '${shop}',
                  });

                  // Embedded app'e yönlendir
                  app.dispatch(AppBridge.actions.Redirect.toApp, {
                    path: '/dashboard'
                  });
                } catch (error) {
                  console.error('App Bridge error:', error);
                  // Fallback: Shopify admin'e yönlendir
                  window.top.location.href = 'https://${shop}/admin/apps';
                }
              } else {
                // Fallback: Shopify admin'e yönlendir
                window.top.location.href = 'https://${shop}/admin/apps';
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
        
        logger.info('OAuth URL generation', {
          shop,
          clientId: clientId ? 'present' : 'missing',
          redirectUri,
          appUrl: process.env['SHOPIFY_APP_URL']
        });
        
        const authUrl = `https://${shop}/admin/oauth/authorize?client_id=${clientId}&scope=${scopes}&redirect_uri=${encodeURIComponent(redirectUri)}&state=install`;

        logger.info('Generated OAuth URL', { authUrl });
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
    fastify.post('/presence/beat', async (_request, reply) => {
      try {
        // Kullanıcı varlığı artık heartbeat ile yönetiliyor
        // Bu endpoint artık kullanılmıyor, heartbeat /collect endpoint'inde işleniyor

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

    // App Proxy collect endpoint (with HMAC for Shopify requests)
    fastify.post('/app-proxy/collect', async (request, reply) => {
      try {
        // Shop bilgisini güvenli şekilde al (HMAC middleware'den)
        const shop = (request as any).shop as string;

        const { type, ...data } = request.body as any;
        
        // Event'i işle
        await processTrackingEvent(shop, type, data);
        
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
      const { shop } = request.query as { 
        shop?: string; 
        hmac?: string; 
        host?: string; 
        timestamp?: string; 
      };

      // Eğer shop parametresi varsa, OAuth akışını başlat
      if (shop && shop.endsWith('.myshopify.com')) {
        // Shop'un zaten yüklü olup olmadığını kontrol et
        try {
          const { data: existingShop } = await db.getClient()
            .from('shops')
            .select('*')
            .eq('shop_domain', shop)
            .single();

          if (existingShop) {
            // Shop zaten yüklü, embedded app'e yönlendir
            logger.info('Shop already installed, redirecting to embedded app', { shop });
            const dashboardUrl = `/dashboard?shop=${shop}`;
            return reply.redirect(dashboardUrl);
          }
        } catch (error) {
          // Database hatası olsa bile OAuth'u başlat
          logger.warn('Database check failed, proceeding with OAuth', { shop, error });
        }

        // Shop yüklü değil, OAuth akışını başlat
        const clientId = process.env['SHOPIFY_API_KEY'];
        const redirectUri = `${process.env['SHOPIFY_APP_URL']}/auth/callback`;
        const scopes = 'read_products,write_products,read_orders,write_orders,read_analytics';
        
        logger.info('Main route OAuth URL generation', {
          shop,
          clientId: clientId ? 'present' : 'missing',
          redirectUri,
          appUrl: process.env['SHOPIFY_APP_URL']
        });
        
        const authUrl = `https://${shop}/admin/oauth/authorize?client_id=${clientId}&scope=${scopes}&redirect_uri=${encodeURIComponent(redirectUri)}&state=install`;
        
        logger.info('Main route generated OAuth URL', { authUrl });
        return reply.redirect(authUrl);
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
    // Debug endpoint for clearing Redis data
    fastify.post('/api/debug/clear-redis', async (request, reply) => {
      try {
        const { shop } = request.query as { shop?: string };
        
        if (!shop) {
          return reply.status(400).send({ 
            success: false, 
            error: 'Shop parameter is required' 
          });
        }

        logger.info('Starting Redis cleanup for shop', { shop });

        // Clear all Redis keys for this shop - use simple approach
        const keysToDelete = [
          `presence:v:${shop}`,
          `presence:s:${shop}`,
          `vis:session-count:${shop}`,
          `hist:sessions:${shop}`
        ];

        let clearedCount = 0;
        for (const key of keysToDelete) {
          try {
            // Try to delete the key directly
            await redis.getClient().del(key);
            clearedCount++;
            logger.info('Cleared key', { key });
          } catch (keyError) {
            logger.warn('Error clearing key', { key, error: keyError });
          }
        }

        logger.info('Redis cleanup completed', { shop, clearedCount });

        return reply.send({
          success: true,
          message: 'Redis data cleared successfully',
          cleared_count: clearedCount
        });
      } catch (error) {
        logger.error('Error clearing Redis data', { error });
        return reply.status(500).send({
          success: false,
          error: 'Failed to clear Redis data',
          details: error instanceof Error ? error.message : String(error)
        });
      }
    });

    // Dashboard API - Uygulama durumu
    fastify.get('/api/dashboard/status', async (request, reply) => {
      try {
        // Shop bilgisini query parametresinden al (embedded app için)
        const { shop } = request.query as { shop?: string };
        if (!shop) {
          reply.status(400).send({ error: 'Shop parameter required' });
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

    // Sessions API endpoints
    // Session başlatma endpoint'i
    fastify.post('/api/sessions/start', async (request, reply) => {
      try {
        const { shop, visitor_id, page_path, referrer, user_agent } = request.body as any;
        
        if (!shop || !visitor_id || !page_path) {
          reply.status(400).send({ 
            success: false, 
            error: 'Missing required fields: shop, visitor_id, page_path' 
          });
          return;
        }

        // IP adresini hash'le
        const ip = request.ip;
        const ipHash = hashIP(ip);
        
        logger.info('Session start request', { 
          shop, 
          visitor_id, 
          ip: ip.substring(0, 8) + '...', // IP'nin ilk 8 karakterini logla
          ipHash: ipHash.substring(0, 8) + '...' // Hash'in ilk 8 karakterini logla
        });

        // Global sessionManager instance'ını kullan
        const result = await sessionManager.startSession({
          shop,
          visitor_id,
          page_path,
          referrer,
          user_agent,
          ip_hash: ipHash
        });

        reply.send(result);
      } catch (error) {
        logger.error('Session start failed', { error });
        reply.status(500).send({ 
          success: false, 
          error: 'Session start failed' 
        });
      }
    });

    // Session sonlandırma endpoint'i
    fastify.post('/api/sessions/end', async (request, reply) => {
      try {
        const { shop, visitor_id, session_id, last_page } = request.body as any;
        
        if (!shop || !visitor_id || !session_id) {
          reply.status(400).send({ 
            success: false, 
            error: 'Missing required fields: shop, visitor_id, session_id' 
          });
          return;
        }

        // Global sessionManager instance'ını kullan

        const result = await sessionManager.endSession({
          shop,
          visitor_id,
          session_id,
          last_page
        });

        reply.send(result);
      } catch (error) {
        logger.error('Session end failed', { error });
        reply.status(500).send({ 
          success: false, 
          error: 'Session end failed' 
        });
      }
    });

    // Session güncelleme endpoint'i (heartbeat)
    fastify.post('/api/sessions/update', async (request, reply) => {
      try {
        const { shop, visitor_id, session_id, page_path } = request.body as any;
        
        if (!shop || !visitor_id || !session_id || !page_path) {
          reply.status(400).send({ 
            success: false, 
            error: 'Missing required fields: shop, visitor_id, session_id, page_path' 
          });
          return;
        }

        // Global sessionManager instance'ını kullan

        const success = await sessionManager.updateSession({
          shop,
          visitor_id,
          session_id,
          page_path
        });

        reply.send({ 
          success, 
          message: success ? 'Session updated successfully' : 'Session update failed' 
        });
      } catch (error) {
        logger.error('Session update failed', { error });
        reply.status(500).send({ 
          success: false, 
          error: 'Session update failed' 
        });
      }
    });

    // Session dağılımı endpoint'i
    fastify.get('/api/sessions/distribution', async (request, reply) => {
      try {
        const { shop } = request.query as { shop?: string };
        if (!shop) {
          reply.status(400).send({ error: 'Shop parameter required' });
          return;
        }

        // Global sessionManager instance'ını kullan

        const distribution = await sessionManager.getSessionDistribution(shop);
        const activeSessions = await sessionManager.getActiveSessionCount(shop);

        reply.send({
          success: true,
          data: {
            distribution,
            active_sessions: activeSessions,
            timestamp: new Date().toISOString()
          }
        });
      } catch (error) {
        logger.error('Session distribution retrieval failed', { error });
        reply.status(500).send({ error: 'Session distribution retrieval failed' });
      }
    });

    // Session analitikleri endpoint'i
    fastify.get('/api/sessions/analytics', async (request, reply) => {
      try {
        const { shop, time_range = 'today' } = request.query as { 
          shop?: string; 
          time_range?: 'today' | '7d' | '30d' | '90d' 
        };
        
        if (!shop) {
          reply.status(400).send({ error: 'Shop parameter required' });
          return;
        }

        // Global sessionManager instance'ını kullan

        const analytics = await sessionManager.getSessionAnalytics(shop, time_range);

        reply.send({
          success: true,
          data: {
            analytics,
            time_range,
            shop,
            timestamp: new Date().toISOString()
          }
        });
      } catch (error) {
        logger.error('Session analytics retrieval failed', { error });
        reply.status(500).send({ error: 'Session analytics retrieval failed' });
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

    // App Proxy tracking script endpoint (HMAC olmadan)
    fastify.get('/app-proxy/tracking.js', async (request, reply) => {
      // Basit tracking script döndür
      const trackingScript = `
        console.log('HRL Tracking: Script loaded successfully!');
        
        // Basit tracking fonksiyonu
        function trackEvent(eventType, data) {
          console.log('HRL Tracking: Event tracked', eventType, data);
          
          fetch('${process.env['SHOPIFY_APP_URL']}/collect', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: eventType,
              shop: '${(request.query as any)?.shop || 'unknown'}',
              timestamp: Date.now(),
              data: data || {}
            })
          }).catch(err => console.warn('HRL Tracking: Send error', err));
        }
        
        // Sayfa yüklendiğinde track et
        trackEvent('page_view', {
          url: location.href,
          title: document.title,
          referrer: document.referrer
        });
        
        // Global olarak erişilebilir yap
        window.HRL = { track: trackEvent };
      `;
      
      reply
        .type('application/javascript')
        .header('Cache-Control', 'public, max-age=300')
        .header('Access-Control-Allow-Origin', '*')
        .header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        .header('Access-Control-Allow-Headers', 'Content-Type, X-Requested-With')
        .header('Access-Control-Allow-Credentials', 'false')
        .header('X-Content-Type-Options', 'nosniff')
        .header('X-Frame-Options', 'ALLOWALL')
        .send(trackingScript);
    });

    // Universal tracking script endpoint (herhangi bir web sitesi için)
    fastify.get('/public/universal-tracking.js', async (_request, reply) => {
      try {
        // Universal tracking script'ini inline olarak döndür
        const scriptContent = `// HRL Universal Traffic Tracking Script
(function () {
  'use strict';

  // ---- Configuration ---------------------------------------------------------
  const CONFIG = {
    // API endpoint - buraya kendi domain'inizi yazın
    apiUrl: '${process.env['SHOPIFY_APP_URL']}',
    // Shop domain - buraya tracking yapılacak site domain'ini yazın
    shop: window.location.hostname,
    // Tracking interval (ms)
    heartbeatInterval: 10000,
    // Session timeout (ms)
    sessionTimeout: 30000
  };

  // ---- Helpers --------------------------------------------------------------
  function uid(prefix) {
    return \`\${prefix}_\${Date.now().toString(36)}_\${Math.random().toString(36).slice(2, 8)}\`;
  }

  function getOrSetLS(key, gen) {
    let v = localStorage.getItem(key);
    if (!v) {
      v = gen();
      localStorage.setItem(key, v);
    }
    return v;
  }

  // ---- State Management -----------------------------------------------------
  const HRL = {
    config: CONFIG,
    visitorId: getOrSetLS('hrl_visitor_id', () => uid('visitor')),
    sessionId: getOrSetLS('hrl_session_id', () => uid('session')),
    initialized: false,
    currentSession: null,
    sessionStartTime: null,
    heartbeatTimer: null,
    startTime: Date.now(),
    isFirstVisit: !localStorage.getItem('hrl_has_visited')
  };

  // ---- API Functions --------------------------------------------------------
  function createPayload(type, extra = {}) {
    return {
      type: type,
      shop: HRL.config.shop,
      visitor_id: HRL.visitorId,
      session_id: HRL.sessionId,
      page_path: location.pathname,
      page_title: document.title,
      referrer: document.referrer,
      timestamp: Date.now(),
      user_agent: navigator.userAgent,
      lang: navigator.language,
      ...extra
    };
  }

  function sendData(endpoint, data) {
    console.log('HRL Tracking: Sending data', data);
    
    return fetch(\`\${HRL.config.apiUrl}\${endpoint}\`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(data),
      mode: 'cors',
      credentials: 'omit'
    })
    .then(response => {
      console.log('HRL Tracking: Response received', response.status);
      if (!response.ok) {
        throw new Error(\`HTTP \${response.status}: \${response.statusText}\`);
      }
      return response.json();
    })
    .then(data => {
      console.log('HRL Tracking: Data processed', data);
      return data;
    })
    .catch(error => {
      console.warn('HRL Tracking: Send error', error);
      throw error;
    });
  }

  // ---- Session Management ---------------------------------------------------
  function startSession() {
    // Sadece ilk ziyarette veya mevcut session yoksa yeni session başlat
    if (HRL.currentSession) return Promise.resolve();
    
    // Session gap kontrolü - localStorage'dan son session zamanını al
    const lastSessionTime = localStorage.getItem('hrl_last_session_time');
    const now = Date.now();
    const sessionGap = lastSessionTime ? now - parseInt(lastSessionTime) : Infinity;
    const SESSION_GAP_MS = 15 * 60 * 1000; // 15 dakika
    
    // Eğer session gap 15 dakikadan azsa, yeni session başlatma
    if (lastSessionTime && sessionGap < SESSION_GAP_MS) {
      console.log('HRL Tracking: Session gap too small, not starting new session', {
        sessionGap: sessionGap,
        gapMinutes: Math.round(sessionGap / 60000),
        thresholdMinutes: 15
      });
      return Promise.resolve();
    }
    
    HRL.sessionStartTime = Date.now();
    const sessionData = {
      shop: HRL.config.shop,
      visitor_id: HRL.visitorId,
      page_path: location.pathname,
      referrer: document.referrer,
      user_agent: navigator.userAgent,
      ip_hash: 'unknown' // Will be set by server
    };

    console.log('HRL Tracking: Starting session', sessionData);
    
    return sendData('/api/sessions/start', sessionData)
      .then(data => {
        if (data.success) {
          HRL.currentSession = data.session_id;
          // Son session zamanını kaydet
          localStorage.setItem('hrl_last_session_time', now.toString());
          console.log('HRL Tracking: Session started', data);
        }
        return data;
      })
      .catch(error => {
        console.warn('HRL Tracking: Session start error', error);
        throw error;
      });
  }

  function endSession() {
    if (!HRL.currentSession) return Promise.resolve();
    
    const sessionData = {
      shop: HRL.config.shop,
      visitor_id: HRL.visitorId,
      session_id: HRL.currentSession,
      last_page: location.pathname
    };

    console.log('HRL Tracking: Ending session', sessionData);
    
    return sendData('/api/sessions/end', sessionData)
      .then(data => {
        console.log('HRL Tracking: Session ended', data);
        HRL.currentSession = null;
        return data;
      })
      .catch(error => {
        console.warn('HRL Tracking: Session end error', error);
        throw error;
      });
  }

  function updateSession() {
    if (!HRL.currentSession) return Promise.resolve();
    
    const sessionData = {
      shop: HRL.config.shop,
      visitor_id: HRL.visitorId,
      session_id: HRL.currentSession,
      page_path: location.pathname
    };

    return sendData('/api/sessions/update', sessionData)
      .catch(error => {
        console.warn('HRL Tracking: Session update error', error);
        throw error;
      });
  }

  // ---- Tracking Functions ---------------------------------------------------
  function track(type, extra = {}) {
    const payload = createPayload(type, extra);
    return sendData('/app-proxy/collect', payload);
  }

  function trackPageView() {
    return track('page_view');
  }

  function trackPageUnload() {
    return track('page_unload', { since_ms: Date.now() - HRL.startTime });
  }

  // ---- Heartbeat Management ------------------------------------------------
  function startHeartbeat() {
    // Sadece ilk ziyarette session başlat
    if (HRL.isFirstVisit) {
      startSession();
      // İlk ziyaret işaretini kaydet
      localStorage.setItem('hrl_has_visited', 'true');
      HRL.isFirstVisit = false;
    }
    
    // First heartbeat
    track('heartbeat', { since_ms: 0 });
    
    // Periodic heartbeat
    HRL.heartbeatTimer = setInterval(() => {
      track('heartbeat', { since_ms: Date.now() - HRL.startTime });
      // Session varsa güncelle, yoksa sadece heartbeat gönder
      if (HRL.currentSession) {
        updateSession();
      }
    }, HRL.config.heartbeatInterval);
  }

  function stopHeartbeat() {
    if (HRL.heartbeatTimer) {
      clearInterval(HRL.heartbeatTimer);
      HRL.heartbeatTimer = null;
    }
    // End session when stopping heartbeat
    endSession();
  }

  // ---- Initialization ------------------------------------------------------
  function init() {
    if (HRL.initialized) return;
    
    console.log('HRL Tracking: Initializing...');
    console.log('HRL Tracking: Shop:', HRL.config.shop);
    console.log('HRL Tracking: API URL:', HRL.config.apiUrl);
    console.log('HRL Tracking: Is first visit:', HRL.isFirstVisit);
    
    // Her sayfa yüklendiğinde page view tracking yap
    trackPageView();
    
    // Heartbeat (session kontrolü ile birlikte)
    startHeartbeat();
    
    // Page unload
    window.addEventListener('beforeunload', () => {
      trackPageUnload();
      // Sadece session varsa sonlandır
      if (HRL.currentSession) {
        endSession();
      }
    });
    
    // Visibility change (tab switch)
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        console.log('HRL Tracking: Page hidden');
      } else {
        console.log('HRL Tracking: Page visible');
        // Sadece session varsa güncelle
        if (HRL.currentSession) {
          updateSession();
        }
      }
    });
    
    HRL.initialized = true;
    console.log('HRL Tracking: Initialized successfully');
  }

  // ---- Auto-start ----------------------------------------------------------
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // ---- Global API ----------------------------------------------------------
  window.HRL = {
    track: track,
    config: HRL.config,
    initialized: () => HRL.initialized,
    startSession: startSession,
    endSession: endSession,
    updateSession: updateSession,
    startHeartbeat: startHeartbeat,
    stopHeartbeat: stopHeartbeat,
    // Configuration methods
    setShop: (shop) => { HRL.config.shop = shop; },
    setApiUrl: (url) => { HRL.config.apiUrl = url; }
  };

})();`;
        
        reply
          .type('application/javascript')
          .header('Cache-Control', 'public, max-age=300')
          .header('Access-Control-Allow-Origin', '*')
          .header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
          .header('Access-Control-Allow-Headers', 'Content-Type, X-Requested-With, Accept, Origin')
          .header('Access-Control-Allow-Credentials', 'false')
          .header('Access-Control-Expose-Headers', 'Content-Length, X-Request-Id')
          .header('X-Content-Type-Options', 'nosniff')
          .header('X-Frame-Options', 'ALLOWALL')
          .header('Cross-Origin-Embedder-Policy', 'unsafe-none')
          .header('Cross-Origin-Opener-Policy', 'unsafe-none')
          .header('Cross-Origin-Resource-Policy', 'cross-origin')
          .send(scriptContent);
      } catch (error) {
        logger.error('Failed to serve universal tracking script', { error });
        reply.status(500).send('// HRL Tracking Script Error');
      }
    });

    // CORS için OPTIONS endpoint
    fastify.options('/app-proxy/tracking.js', async (_request, reply) => {
      reply
        .header('Access-Control-Allow-Origin', '*')
        .header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        .header('Access-Control-Allow-Headers', 'Content-Type, X-Requested-With')
        .header('Access-Control-Allow-Credentials', 'false')
        .header('X-Content-Type-Options', 'nosniff')
        .header('X-Frame-Options', 'ALLOWALL')
        .send();
    });

    // Universal tracking script için OPTIONS endpoint
    fastify.options('/public/universal-tracking.js', async (_request, reply) => {
      reply
        .header('Access-Control-Allow-Origin', '*')
        .header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        .header('Access-Control-Allow-Headers', 'Content-Type, X-Requested-With, Accept, Origin')
        .header('Access-Control-Allow-Credentials', 'false')
        .header('Access-Control-Expose-Headers', 'Content-Length, X-Request-Id')
        .header('X-Content-Type-Options', 'nosniff')
        .header('X-Frame-Options', 'ALLOWALL')
        .header('Cross-Origin-Embedder-Policy', 'unsafe-none')
        .header('Cross-Origin-Opener-Policy', 'unsafe-none')
        .header('Cross-Origin-Resource-Policy', 'cross-origin')
        .send();
    });

    // Debug endpoint - veritabanı bağlantısını test et
    fastify.get('/debug/database', async (_request, reply) => {
      try {
        logger.info('Testing database connection...');
        
        // Service client ile test
        const { data: serviceData, error: serviceError } = await db.getServiceClient()
          .from('shops')
          .select('count')
          .limit(1);
        
        logger.info('Service client test result', { serviceData, serviceError });
        
        // Normal client ile test
        const { data: normalData, error: normalError } = await db.getClient()
          .from('shops')
          .select('count')
          .limit(1);
        
        logger.info('Normal client test result', { normalData, normalError });
        
        reply.send({
          success: true,
          serviceClient: {
            data: serviceData,
            error: serviceError ? {
              message: serviceError.message,
              code: serviceError.code,
              details: serviceError.details
            } : null
          },
          normalClient: {
            data: normalData,
            error: normalError ? {
              message: normalError.message,
              code: normalError.code,
              details: normalError.details
            } : null
          }
        });
      } catch (error) {
        logger.error('Database debug error', { error });
        reply.status(500).send({
          success: false,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    });

    // Debug endpoint - shop oluşturma testi
    fastify.post('/debug/shop-test', async (request, reply) => {
      try {
        const { shop } = request.body as { shop: string };
        if (!shop) {
          return reply.status(400).send({ error: 'Shop parameter required' });
        }

        logger.info('Testing shop creation', { shop });
        
        // Test shop oluşturma
        const testShop = `test-${shop}-${Date.now()}`;
        
        const { data: insertData, error: insertError } = await db.getServiceClient()
          .from('shops')
          .insert({
            shop_domain: testShop,
            access_token: 'test_token',
            shop_name: 'Test Shop',
            shop_email: 'test@example.com',
            shop_currency: 'USD',
            shop_timezone: 'UTC',
            installed_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .select();

        logger.info('Shop creation test result', { insertData, insertError });

        // Test shop'u sil
        if (insertData) {
          await db.getServiceClient()
            .from('shops')
            .delete()
            .eq('shop_domain', testShop);
        }

        reply.send({
          success: true,
          testShop,
          insertData,
          insertError: insertError ? {
            message: insertError.message,
            code: insertError.code,
            details: insertError.details,
            hint: insertError.hint
          } : null
        });
      } catch (error) {
        logger.error('Shop test error', { 
          error: error instanceof Error ? {
            message: error.message,
            stack: error.stack,
            name: error.name
          } : {
            type: typeof error,
            string: String(error),
            json: JSON.stringify(error, null, 2)
          }
        });
        reply.status(500).send({
          success: false,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    });

    // HMAC middleware geçici olarak devre dışı
    // await setupHmacMiddleware();

    // Setup request tracking
    setupRequestTracking(fastify);

    // Start Active Users Manager
    await activeUsersManager.start();
    logger.info('Active Users Manager started');

    // Start Session Manager
    await sessionManager.start();
    logger.info('Session Manager started');

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
    logger.error('Failed to start server', { 
      error: error instanceof Error ? error.message : error,
      stack: error instanceof Error ? error.stack : undefined
    });
    console.error('Detailed error:', error);
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
      
      // For any other database error, just log and continue
      logger.warn('Database save failed, continuing without database save', { 
        shop, 
        error: error.message 
      });
      return;
    }

    logger.info('Shop data saved successfully', { shop });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('Save shop data error', { 
      error: errorMessage,
      shop 
    });
    
    // Don't throw error for any database issue, just log warning
    logger.warn('Database save failed, continuing without database save', { 
      shop, 
      error: errorMessage 
    });
  }
}

// Start the server
start();
