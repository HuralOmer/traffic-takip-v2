/**
 * Redis Database Adapter
 */

import { createClient, RedisClientType } from 'redis';
import { CacheDatabaseAdapter } from '../interfaces/database.interface';

export class RedisAdapter implements CacheDatabaseAdapter {
  private client: RedisClientType | null = null;
  private connected = false;

  constructor() {
    // Redis client will be initialized in connect()
  }

  // DatabaseAdapter interface methods
  async connect(): Promise<void> {
    try {
      const host = process.env['REDIS_HOST'] || 'localhost';
      const port = parseInt(process.env['REDIS_PORT'] || '6379');
      const password = process.env['REDIS_PASSWORD'] || undefined;

      const clientOptions: any = {
        socket: {
          host,
          port,
        },
      };
      
      if (password) {
        clientOptions.password = password;
      }

      this.client = createClient(clientOptions);

      this.client.on('error', (err) => {
        // Only log Redis errors once to reduce spam
        if (!this.connected) {
          console.warn('Redis Client Error:', err.message);
        }
        this.connected = false;
      });

      this.client.on('connect', () => {
        this.connected = true;
      });

      await this.client.connect();
      
      // Test connection
      await this.client.ping();
      
    } catch (error) {
      this.connected = false;
      throw new Error(`Redis connection failed: ${error}`);
    }
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.quit();
      this.client = null;
    }
    this.connected = false;
  }

  async isConnected(): Promise<boolean> {
    if (!this.client || !this.connected) {
      return false;
    }
    
    try {
      await this.client.ping();
      return true;
    } catch {
      this.connected = false;
      return false;
    }
  }

  async healthCheck(): Promise<{ status: string; details: any }> {
    try {
      const isConnected = await this.isConnected();
      return { 
        status: isConnected ? 'healthy' : 'unhealthy', 
        details: { 
          type: 'redis',
          connected: isConnected
        } 
      };
    } catch (error) {
      return { 
        status: 'unhealthy', 
        details: { 
          type: 'redis',
          error: error instanceof Error ? error.message : 'Unknown error'
        } 
      };
    }
  }

  // CacheDatabaseAdapter interface methods
  async setPresence(key: string, data: any, ttl?: number): Promise<void> {
    if (!this.client) {
      throw new Error('Redis not connected');
    }

    try {
      const value = JSON.stringify(data);
      if (ttl) {
        await this.client.setEx(key, ttl, value);
      } else {
        await this.client.set(key, value);
      }
    } catch (error) {
      throw new Error(`Failed to set presence: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getPresence(key: string): Promise<any> {
    if (!this.client) {
      throw new Error('Redis not connected');
    }

    try {
      const value = await this.client.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      throw new Error(`Failed to get presence: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async deletePresence(key: string): Promise<boolean> {
    if (!this.client) {
      throw new Error('Redis not connected');
    }

    try {
      const result = await this.client.del(key);
      return result > 0;
    } catch (error) {
      throw new Error(`Failed to delete presence: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async incrementCounter(key: string, value: number = 1): Promise<number> {
    if (!this.client) {
      throw new Error('Redis not connected');
    }

    try {
      const result = await this.client.incrBy(key, value);
      return result;
    } catch (error) {
      throw new Error(`Failed to increment counter: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async decrementCounter(key: string, value: number = 1): Promise<number> {
    if (!this.client) {
      throw new Error('Redis not connected');
    }

    try {
      const result = await this.client.decrBy(key, value);
      return result;
    } catch (error) {
      throw new Error(`Failed to decrement counter: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getCounter(key: string): Promise<number> {
    if (!this.client) {
      throw new Error('Redis not connected');
    }

    try {
      const value = await this.client.get(key);
      return value ? parseInt(value, 10) : 0;
    } catch (error) {
      throw new Error(`Failed to get counter: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async setCounter(key: string, value: number, ttl?: number): Promise<void> {
    if (!this.client) {
      throw new Error('Redis not connected');
    }

    try {
      if (ttl) {
        await this.client.setEx(key, ttl, value.toString());
      } else {
        await this.client.set(key, value.toString());
      }
    } catch (error) {
      throw new Error(`Failed to set counter: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async checkRateLimit(key: string, limit: number, _window: number): Promise<boolean> {
    if (!this.client) {
      throw new Error('Redis not connected');
    }

    try {
      const current = await this.client.get(key);
      const count = current ? parseInt(current, 10) : 0;
      return count < limit;
    } catch (error) {
      throw new Error(`Failed to check rate limit: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async incrementRateLimit(key: string, window: number): Promise<number> {
    if (!this.client) {
      throw new Error('Redis not connected');
    }

    try {
      const multi = this.client.multi();
      multi.incr(key);
      multi.expire(key, window);
      const results = await multi.exec();
      
      if (!results || results.length === 0) {
        throw new Error('Rate limit increment failed');
      }
      
      return results[0] as unknown as number;
    } catch (error) {
      throw new Error(`Failed to increment rate limit: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async publish(channel: string, message: any): Promise<void> {
    if (!this.client) {
      throw new Error('Redis not connected');
    }

    try {
      const messageStr = typeof message === 'string' ? message : JSON.stringify(message);
      await this.client.publish(channel, messageStr);
    } catch (error) {
      throw new Error(`Failed to publish message: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async subscribe(channel: string, callback: (message: any) => void): Promise<void> {
    if (!this.client) {
      throw new Error('Redis not connected');
    }

    try {
      // Create a separate subscriber client for pub/sub
      const subscriber = this.client.duplicate();
      await subscriber.connect();
      
      await subscriber.subscribe(channel, (message: string, _channel: string) => {
        try {
          // Try to parse as JSON, fallback to string
          let parsedMessage;
          try {
            parsedMessage = JSON.parse(message);
          } catch {
            parsedMessage = message;
          }
          callback(parsedMessage);
        } catch (error) {
          console.error('Error in subscription callback:', error);
        }
      });
    } catch (error) {
      throw new Error(`Failed to subscribe to channel: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async unsubscribe(channel: string): Promise<void> {
    if (!this.client) {
      throw new Error('Redis not connected');
    }

    try {
      await this.client.unsubscribe(channel);
    } catch (error) {
      throw new Error(`Failed to unsubscribe from channel: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}
