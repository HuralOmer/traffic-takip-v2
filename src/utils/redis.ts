/**
 * Redis Utility - Centralized Redis connection management
 * 
 * Provides a singleton Redis client for the application
 */

import { Redis } from 'ioredis';
import { createLogger } from './logger';

const logger = createLogger('redis');

class RedisManager {
  private client: Redis | null = null;
  private isConnected = false;

  constructor() {
    this.initializeClient();
  }

  /**
   * Initialize Redis client (lazy initialization)
   */
  private initializeClient(): void {
    // Don't create client immediately - wait for first usage
    logger.info('Redis client will be created on first usage');
  }

  /**
   * Get Redis client (lazy initialization)
   */
  public getClient(): Redis | null {
    // Create client only when first requested
    if (!this.client && process.env['REDIS_URL']) {
      this.createClient();
    }
    return this.client;
  }

  /**
   * Create Redis client with proper error handling
   */
  private createClient(): void {
    try {
      const redisUrl = process.env['REDIS_URL'];
      if (!redisUrl) {
        return;
      }

      logger.info('Creating Redis client...');
      
      this.client = new Redis(redisUrl, {
        maxRetriesPerRequest: 0,
        lazyConnect: true,
        keepAlive: 30000,
        connectTimeout: 3000,
        commandTimeout: 2000,
        enableOfflineQueue: false
      });

      // Event listeners
      this.client.on('connect', () => {
        logger.info('Redis client connected');
        this.isConnected = true;
      });

      this.client.on('ready', () => {
        logger.info('Redis client ready');
        this.isConnected = true;
      });

      this.client.on('error', () => {
        // Only log error once per connection attempt
        if (!this.isConnected) {
          logger.warn('Redis client connection failed - Redis features disabled');
        }
        this.isConnected = false;
      });

      this.client.on('close', () => {
        logger.warn('Redis client connection closed');
        this.isConnected = false;
      });

    } catch (error) {
      logger.error('Failed to create Redis client:', error);
      this.client = null;
    }
  }

  /**
   * Check if Redis is connected
   */
  public isRedisConnected(): boolean {
    return this.isConnected && this.client?.status === 'ready';
  }

  /**
   * Connect to Redis
   */
  public async connect(): Promise<void> {
    if (!this.client) {
      throw new Error('Redis client not initialized');
    }

    try {
      await this.client.connect();
      logger.info('Redis connection established');
    } catch (error) {
      logger.error('Failed to connect to Redis:', error);
      throw error;
    }
  }

  /**
   * Disconnect from Redis
   */
  public async disconnect(): Promise<void> {
    if (this.client) {
      try {
        await this.client.quit();
        logger.info('Redis connection closed');
      } catch (error) {
        logger.error('Error closing Redis connection:', error);
        throw error;
      }
    }
  }

  /**
   * Health check
   */
  public async healthCheck(): Promise<{ status: string; details: any }> {
    try {
      if (!this.client || !this.isRedisConnected()) {
        return {
          status: 'unhealthy',
          details: { error: 'Not connected' }
        };
      }

      const pong = await this.client.ping();
      if (pong !== 'PONG') {
        return {
          status: 'unhealthy',
          details: { error: 'Ping failed' }
        };
      }

      return {
        status: 'healthy',
        details: {
          connected: this.isConnected,
          status: this.client.status
        }
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        details: { error: error instanceof Error ? error.message : String(error) }
      };
    }
  }

  /**
   * Publish message to channel
   */
  public async publish(channel: string, message: any): Promise<void> {
    if (!this.client || !this.isRedisConnected()) {
      throw new Error('Redis client not connected');
    }

    try {
      await this.client.publish(channel, JSON.stringify(message));
    } catch (error) {
      logger.error('Failed to publish message:', error);
      throw error;
    }
  }

  /**
   * Subscribe to channel
   */
  public async subscribe(channel: string, callback: (message: any) => void): Promise<void> {
    if (!this.client || !this.isRedisConnected()) {
      throw new Error('Redis client not connected');
    }

    try {
      await this.client.subscribe(channel);
      this.client.on('message', (receivedChannel, message) => {
        if (receivedChannel === channel) {
          try {
            const parsedMessage = JSON.parse(message);
            callback(parsedMessage);
          } catch (error) {
            logger.error('Failed to parse message:', error);
          }
        }
      });
    } catch (error) {
      logger.error('Failed to subscribe to channel:', error);
      throw error;
    }
  }
}

// Singleton instance
export const redis = new RedisManager();
