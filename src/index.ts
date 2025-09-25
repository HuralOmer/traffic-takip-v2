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
import { db, redis, createLogger, setupRequestTracking, getHealthStatus } from '@/tracking/utils';

// Sunucu için logger oluştur
const logger = createLogger('Server');

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
    const { metricsCollector } = await import('@/tracking/utils');
    const metrics = metricsCollector.getMetrics();
    reply.send(metrics);
  } catch (error) {
    logger.error('Metrics retrieval failed', { error });
    reply.status(500).send({ error: 'Metrics retrieval failed' });
  }
});

/**
 * Ana endpoint (root)
 * 
 * Uygulamanın temel bilgilerini döndürür.
 * API'nin çalışıp çalışmadığını kontrol etmek için kullanılır.
 * 
 * @returns {Object} Uygulama bilgileri
 */
fastify.get('/', async (_request, reply) => {
  reply.send({
    name: 'Shopify Tracking App',
    version: '1.0.0',
    status: 'running',
    timestamp: new Date().toISOString(),
  });
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
        const { heartbeatPayloadSchema } = await import('@/tracking/utils/validation');
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
        const { heartbeatPayloadSchema } = await import('@/tracking/utils/validation');
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
        const { pageViewSchema } = await import('@/tracking/utils/validation');
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
  
  reply.status(500).send({
    error: 'Internal server error',
    message: process.env['NODE_ENV'] === 'development' ? error.message : 'Something went wrong',
  });
});

// Graceful shutdown
async function gracefulShutdown(signal: string) {
  logger.info(`Received ${signal}, shutting down gracefully`);
  
  try {
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
    const dbHealthy = await db.healthCheck();
    const redisHealthy = await redis.healthCheck();

    if (!dbHealthy) {
      throw new Error('Database connection failed');
    }

    if (!redisHealthy) {
      throw new Error('Redis connection failed');
    }

    logger.info('Database and Redis connections established');

    // Register plugins and routes
    await registerPlugins();
    await registerRoutes();

    // Setup request tracking
    setupRequestTracking(fastify);

    // Start server
    const port = parseInt(process.env['PORT'] || '3000');
    const host = process.env['HOST'] || '0.0.0.0';

    await fastify.listen({ port, host });
    
    logger.info(`Server running on http://${host}:${port}`);
    logger.info('Health check available at /health');
    logger.info('Metrics available at /metrics');
  } catch (error) {
    logger.error('Failed to start server', { error });
    process.exit(1);
  }
}

// Start the server
start();
