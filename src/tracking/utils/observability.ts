/**
 * Gözlemlenebilirlik ve İzleme Araçları
 * 
 * Bu dosya, sistem performansını izlemek ve metrikleri toplamak için
 * gerekli araçları içerir. Prometheus benzeri metrik toplama, sağlık
 * kontrolü, loglama ve hata takibi işlevleri sağlar.
 * 
 * Özellikler:
 * - Metrik toplama (istek sayısı, süre, hata oranı)
 * - Sağlık kontrolü (veritabanı, Redis, bellek)
 * - Yapılandırılmış loglama
 * - Performans izleme
 * - Hata takibi
 * - Request tracking middleware
 */

import { FastifyInstance } from 'fastify';

// FastifyRequest tipini genişlet
declare module 'fastify' {
  interface FastifyRequest {
    startTime?: number;
  }
}

/**
 * Sistem Metrikleri Interface'i
 * Toplanan tüm metrikleri tanımlar
 */
export interface Metrics {
  requests_total: number; // Toplam istek sayısı
  requests_duration_ms: number[]; // İstek süreleri (milisaniye)
  requests_errors: number; // Hata sayısı
  active_connections: number; // Aktif bağlantı sayısı
  memory_usage_mb: number; // Bellek kullanımı (MB)
  redis_operations: number; // Redis işlem sayısı
  database_queries: number; // Veritabanı sorgu sayısı
}

/**
 * Metrik Toplayıcı Sınıfı
 * Sistem performans metriklerini toplar ve analiz eder
 */
export class MetricsCollector {
  private metrics: Metrics = {
    requests_total: 0, // Toplam istek sayısı
    requests_duration_ms: [], // İstek süreleri dizisi
    requests_errors: 0, // Hata sayısı
    active_connections: 0, // Aktif bağlantı sayısı
    memory_usage_mb: 0, // Bellek kullanımı
    redis_operations: 0, // Redis işlem sayısı
    database_queries: 0, // Veritabanı sorgu sayısı
  };

  private startTime = Date.now(); // Başlangıç zamanı (uptime hesaplama için)

  incrementRequests(): void {
    this.metrics.requests_total++;
  }

  addRequestDuration(duration: number): void {
    this.metrics.requests_duration_ms.push(duration);
    
    // Keep only last 1000 durations for memory efficiency
    if (this.metrics.requests_duration_ms.length > 1000) {
      this.metrics.requests_duration_ms = this.metrics.requests_duration_ms.slice(-1000);
    }
  }

  incrementErrors(): void {
    this.metrics.requests_errors++;
  }

  setActiveConnections(count: number): void {
    this.metrics.active_connections = count;
  }

  incrementRedisOperations(): void {
    this.metrics.redis_operations++;
  }

  incrementDatabaseQueries(): void {
    this.metrics.database_queries++;
  }

  getMetrics(): Metrics & {
    uptime_seconds: number;
    requests_per_second: number;
    error_rate: number;
    p95_duration_ms: number;
    p99_duration_ms: number;
  } {
    const uptime = (Date.now() - this.startTime) / 1000;
    const rps = this.metrics.requests_total / uptime;
    const errorRate = this.metrics.requests_total > 0 
      ? (this.metrics.requests_errors / this.metrics.requests_total) * 100 
      : 0;

    // Calculate percentiles
    const sortedDurations = [...this.metrics.requests_duration_ms].sort((a, b) => a - b);
    const p95Index = Math.floor(sortedDurations.length * 0.95);
    const p99Index = Math.floor(sortedDurations.length * 0.99);
    
    const p95 = sortedDurations[p95Index] || 0;
    const p99 = sortedDurations[p99Index] || 0;

    return {
      ...this.metrics,
      uptime_seconds: uptime,
      requests_per_second: rps,
      error_rate: errorRate,
      p95_duration_ms: p95,
      p99_duration_ms: p99,
    };
  }

  reset(): void {
    this.metrics = {
      requests_total: 0,
      requests_duration_ms: [],
      requests_errors: 0,
      active_connections: 0,
      memory_usage_mb: 0,
      redis_operations: 0,
      database_queries: 0,
    };
    this.startTime = Date.now();
  }
}

export const metricsCollector = new MetricsCollector();

// Health check utilities
export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  services: {
    database: 'up' | 'down' | 'degraded';
    redis: 'up' | 'down' | 'degraded';
    memory: 'ok' | 'warning' | 'critical';
  };
  metrics: {
    uptime_seconds: number;
    requests_per_second: number;
    error_rate: number;
    memory_usage_mb: number;
  };
}

export async function getHealthStatus(): Promise<HealthStatus> {
  const timestamp = new Date().toISOString();
  const metrics = metricsCollector.getMetrics();
  
  // Check database health
  let databaseStatus: 'up' | 'down' = 'down';
  try {
    const { db } = await import('./database');
    const isHealthy = await db.healthCheck();
    databaseStatus = isHealthy ? 'up' : 'down';
  } catch (error) {
    console.error('Database health check failed:', error);
  }

  // Check Redis health
  let redisStatus: 'up' | 'down' = 'down';
  try {
    const { redis } = await import('./redis');
    const isHealthy = await redis.healthCheck();
    redisStatus = isHealthy ? 'up' : 'down';
  } catch (error) {
    console.error('Redis health check failed:', error);
  }

  // Check memory usage
  const memoryUsage = process.memoryUsage();
  const memoryUsageMB = memoryUsage.heapUsed / 1024 / 1024;
  const memoryStatus: 'ok' | 'warning' | 'critical' = 
    memoryUsageMB > 1000 ? 'critical' : 
    memoryUsageMB > 500 ? 'warning' : 'ok';

  // Determine overall status
  const overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 
    databaseStatus === 'down' || redisStatus === 'down' ? 'unhealthy' :
    memoryStatus === 'critical' ? 'degraded' :
    'healthy';

  return {
    status: overallStatus,
    timestamp,
    services: {
      database: databaseStatus,
      redis: redisStatus,
      memory: memoryStatus,
    },
    metrics: {
      uptime_seconds: metrics.uptime_seconds,
      requests_per_second: metrics.requests_per_second,
      error_rate: metrics.error_rate,
      memory_usage_mb: memoryUsageMB,
    },
  };
}

// Logging utilities
export class Logger {
  private context: string;

  constructor(context: string) {
    this.context = context;
  }

  private formatMessage(level: string, message: string, meta?: any): string {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      context: this.context,
      message,
      ...(meta && { meta }),
    };
    return JSON.stringify(logEntry);
  }

  info(message: string, meta?: any): void {
    console.log(this.formatMessage('INFO', message, meta));
  }

  warn(message: string, meta?: any): void {
    console.warn(this.formatMessage('WARN', message, meta));
  }

  error(message: string, meta?: any): void {
    console.error(this.formatMessage('ERROR', message, meta));
    metricsCollector.incrementErrors();
  }

  debug(message: string, meta?: any): void {
    if (process.env['NODE_ENV'] === 'development' || process.env['DEBUG'] === 'true') {
      console.debug(this.formatMessage('DEBUG', message, meta));
    }
  }
}

export function createLogger(context: string): Logger {
  return new Logger(context);
}

// Performance monitoring
export class PerformanceMonitor {
  private timers: Map<string, number> = new Map();

  startTimer(name: string): void {
    this.timers.set(name, Date.now());
  }

  endTimer(name: string): number {
    const startTime = this.timers.get(name);
    if (!startTime) {
      console.warn(`Timer '${name}' was not started`);
      return 0;
    }

    const duration = Date.now() - startTime;
    this.timers.delete(name);
    return duration;
  }

  async measureAsync<T>(name: string, fn: () => Promise<T>): Promise<T> {
    this.startTimer(name);
    try {
      const result = await fn();
      const duration = this.endTimer(name);
      metricsCollector.addRequestDuration(duration);
      return result;
    } catch (error) {
      this.endTimer(name);
      throw error;
    }
  }

  measure<T>(name: string, fn: () => T): T {
    this.startTimer(name);
    try {
      const result = fn();
      const duration = this.endTimer(name);
      metricsCollector.addRequestDuration(duration);
      return result;
    } catch (error) {
      this.endTimer(name);
      throw error;
    }
  }
}

export const performanceMonitor = new PerformanceMonitor();

// Error tracking
export interface ErrorContext {
  shop?: string;
  visitor_id?: string;
  session_id?: string;
  user_agent?: string | undefined;
  url?: string;
  stack?: string;
}

export function trackError(error: Error, context: ErrorContext = {}): void {
  const logger = createLogger('ErrorTracker');
  
  logger.error('Application error occurred', {
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack,
    },
    context,
  });

  metricsCollector.incrementErrors();
}

// Request tracking middleware
export function setupRequestTracking(fastify: FastifyInstance): void {
  fastify.addHook('onRequest', async (request) => {
    metricsCollector.incrementRequests();
    request.startTime = Date.now();
  });

  fastify.addHook('onResponse', async (request, reply) => {
    const startTime = request.startTime || Date.now();
    const duration = Date.now() - startTime;
    metricsCollector.addRequestDuration(duration);
    
    if (reply.statusCode >= 400) {
      metricsCollector.incrementErrors();
    }
  });

  fastify.addHook('onError', async (request, _reply, error) => {
    trackError(error, {
      shop: request.headers['x-shop'] as string,
      visitor_id: request.headers['x-visitor-id'] as string,
      session_id: request.headers['x-session-id'] as string,
      user_agent: request.headers['user-agent'] || undefined,
      url: request.url,
    });
  });
}
