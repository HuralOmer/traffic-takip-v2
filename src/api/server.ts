/**
 * API Server - Fastify-based HTTP server
 * 
 * Modern, performant HTTP server with:
 * - CORS support
 * - Rate limiting
 * - Security headers
 * - WebSocket support
 * - Health checks
 */

import Fastify, { FastifyInstance, FastifyServerOptions } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import staticFiles from '@fastify/static';
import websocket from '@fastify/websocket';
import { join } from 'path';
import { DatabaseManager } from '../database/database-manager';
import { ActiveUsersManager } from '../tracking/active-users';
import { createLogger } from '../utils/logger';

const logger = createLogger('api-server');

export interface ServerConfig {
  port: number;
  host: string;
  cors: {
    origin: string | string[];
    credentials: boolean;
  };
  rateLimit: {
    max: number;
    timeWindow: string;
  };
}

export class Server {
  private fastify: FastifyInstance;
  private config: ServerConfig;
  private dbManager: DatabaseManager | null;
  private activeUsersManager: ActiveUsersManager | null;

  constructor(
    dbManager: DatabaseManager | null, 
    activeUsersManager: ActiveUsersManager | null,
    config?: Partial<ServerConfig>
  ) {
    this.dbManager = dbManager;
    this.activeUsersManager = activeUsersManager;
    
    // Default configuration
    this.config = {
      port: parseInt(process.env['PORT'] || '3000'),
      host: process.env['HOST'] || '0.0.0.0',
      cors: {
        origin: process.env['CORS_ORIGIN']?.split(',') || '*',
        credentials: true
      },
      rateLimit: {
        max: parseInt(process.env['RATE_LIMIT_MAX'] || '100'),
        timeWindow: process.env['RATE_LIMIT_WINDOW'] || '1 minute'
      },
      ...config
    };

    // Fastify server options
    const serverOptions: FastifyServerOptions = {
      logger: process.env['NODE_ENV'] === 'development' ? {
        level: process.env['LOG_LEVEL'] || 'info',
        transport: {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'HH:MM:ss Z',
            ignore: 'pid,hostname'
          }
        }
      } : {
        level: process.env['LOG_LEVEL'] || 'info'
      }
    };

    this.fastify = Fastify(serverOptions);
    this.setupPlugins();
    this.setupRoutes();
  }

  /**
   * Setup Fastify plugins
   */
  private async setupPlugins(): Promise<void> {
    try {
      // Security headers
      await this.fastify.register(helmet, {
        contentSecurityPolicy: {
          directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'", "wss:", "ws:"]
          }
        }
      });

      // CORS
      await this.fastify.register(cors, {
        origin: this.config.cors.origin,
        credentials: this.config.cors.credentials
      });

      // Rate limiting
      await this.fastify.register(rateLimit, {
        max: this.config.rateLimit.max,
        timeWindow: this.config.rateLimit.timeWindow,
        errorResponseBuilder: (_request, context) => ({
          code: 429,
          error: 'Too Many Requests',
          message: `Rate limit exceeded, retry in ${Math.round(Number(context.after))}ms`,
          retryAfter: Math.round(Number(context.after))
        })
      });

      // Static files
      await this.fastify.register(staticFiles, {
        root: join(__dirname, '../../public'),
        prefix: '/public/'
      });

      // WebSocket support
      await this.fastify.register(websocket);

      logger.info('All plugins registered successfully');
    } catch (error) {
      logger.error('Failed to register plugins:', error);
      throw error;
    }
  }

  /**
   * Setup API routes
   */
  private setupRoutes(): void {
    // Health check endpoint
    this.fastify.get('/health', async (_request, reply) => {
      try {
        // Basic health check without database dependencies
        return {
          status: 'ok',
          timestamp: new Date().toISOString(),
          uptime: process.uptime(),
          version: process.env['npm_package_version'] || '1.0.0',
          message: 'Service is running'
        };
      } catch (error) {
        logger.error('Health check failed:', error);
        reply.code(503);
        return {
          status: 'error',
          message: 'Service unavailable',
          timestamp: new Date().toISOString()
        };
      }
    });

    // Active users endpoints
    this.fastify.get('/api/active-users/:shop', async (request, reply) => {
      try {
        if (!this.activeUsersManager) {
          reply.code(503);
          return {
            success: false,
            error: 'Active users manager not available'
          };
        }
        
        const { shop } = request.params as { shop: string };
        const metrics = await this.activeUsersManager.getActiveUsersMetrics(shop);
        
        return {
          success: true,
          data: metrics
        };
      } catch (error) {
        logger.error('Failed to get active users metrics:', error);
        reply.code(500);
        return {
          success: false,
          error: 'Failed to get active users metrics'
        };
      }
    });

    // Heartbeat endpoint
    this.fastify.post('/api/heartbeat', async (request, reply) => {
      try {
        if (!this.activeUsersManager) {
          reply.code(503);
          return {
            success: false,
            error: 'Active users manager not available'
          };
        }
        
        const payload = request.body;
        const response = await this.activeUsersManager.processHeartbeat(payload);
        
        return {
          success: true,
          data: response
        };
      } catch (error) {
        logger.error('Heartbeat processing failed:', error);
        reply.code(500);
        return {
          success: false,
          error: 'Heartbeat processing failed'
        };
      }
    });

    // Page unload endpoint
    this.fastify.post('/api/page-unload', async (request, reply) => {
      try {
        if (!this.activeUsersManager) {
          reply.code(503);
          return {
            success: false,
            error: 'Active users manager not available'
          };
        }
        
        const payload = request.body;
        const response = await this.activeUsersManager.processPageUnload(payload);
        
        return {
          success: true,
          data: response
        };
      } catch (error) {
        logger.error('Page unload processing failed:', error);
        reply.code(500);
        return {
          success: false,
          error: 'Page unload processing failed'
        };
      }
    });

    // WebSocket endpoint for real-time updates
    this.fastify.register(async function (fastify) {
      fastify.get('/ws/:shop', { websocket: true }, (connection, req) => {
        const { shop } = req.params as { shop: string };
        
        logger.info(`WebSocket connection established for shop: ${shop}`);
        
        connection.socket.on('message', (message) => {
          try {
            const data = JSON.parse(message.toString());
            logger.debug('WebSocket message received:', data);
            
            // Echo back the message for now
            connection.socket.send(JSON.stringify({
              type: 'echo',
              data,
              timestamp: Date.now()
            }));
          } catch (error) {
            logger.error('WebSocket message parsing error:', error);
            connection.socket.send(JSON.stringify({
              type: 'error',
              message: 'Invalid message format'
            }));
          }
        });

        connection.socket.on('close', () => {
          logger.info(`WebSocket connection closed for shop: ${shop}`);
        });
      });
    });

    // 404 handler
    this.fastify.setNotFoundHandler((request, reply) => {
      reply.code(404).send({
        success: false,
        error: 'Not Found',
        message: `Route ${request.method}:${request.url} not found`
      });
    });

    // Error handler
    this.fastify.setErrorHandler((error, _request, reply) => {
      logger.error('Unhandled error:', error);
      
      reply.code(500).send({
        success: false,
        error: 'Internal Server Error',
        message: process.env['NODE_ENV'] === 'development' ? error.message : 'Something went wrong'
      });
    });

    logger.info('All routes registered successfully');
  }

  /**
   * Start the server
   */
  public async start(): Promise<void> {
    try {
      const address = await this.fastify.listen({
        port: this.config.port,
        host: this.config.host
      });

      logger.info(`Server started successfully on ${address}`);
      logger.info(`Health check available at: http://${this.config.host}:${this.config.port}/health`);
      logger.info(`WebSocket available at: ws://${this.config.host}:${this.config.port}/ws/:shop`);
    } catch (error) {
      logger.error('Failed to start server:', error);
      throw error;
    }
  }

  /**
   * Stop the server
   */
  public async stop(): Promise<void> {
    try {
      await this.fastify.close();
      logger.info('Server stopped successfully');
    } catch (error) {
      logger.error('Error stopping server:', error);
      throw error;
    }
  }

  /**
   * Get Fastify instance (for advanced usage)
   */
  public getFastifyInstance(): FastifyInstance {
    return this.fastify;
  }
}

/**
 * Create server instance
 */
export function createServer(
  dbManager: DatabaseManager, 
  activeUsersManager: ActiveUsersManager,
  config?: Partial<ServerConfig>
): Server {
  return new Server(dbManager, activeUsersManager, config);
}
