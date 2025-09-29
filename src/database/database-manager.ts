/**
 * Database Manager - Central database management
 * 
 * Manages connections to all database types and provides
 * a unified interface for database operations
 */

import { DatabaseAdapter, OLTPDatabaseAdapter, OLAPDatabaseAdapter, CacheDatabaseAdapter } from './interfaces/database.interface';
import { PostgreSQLAdapter } from './adapters/postgresql';
import { ClickHouseAdapter } from './adapters/clickhouse';
import { RedisAdapter } from './adapters/redis';
import { createLogger } from '../utils/logger';

const logger = createLogger('database-manager');

export class DatabaseManager {
  private postgresql: OLTPDatabaseAdapter | null = null;
  private clickhouse: OLAPDatabaseAdapter | null = null;
  private redis: CacheDatabaseAdapter | null = null;
  private initialized = false;

  constructor() {
    // Initialize adapters based on environment
    this.initializeAdapters();
  }

  /**
   * Initialize all database connections
   */
  public async initialize(): Promise<void> {
    try {
      logger.info('Initializing database connections...');

      // Connect to all databases
      const connectionPromises = [];

      if (this.postgresql) {
        connectionPromises.push(this.postgresql.connect());
      }

      if (this.clickhouse) {
        connectionPromises.push(this.clickhouse.connect());
      }

      if (this.redis) {
        connectionPromises.push(this.redis.connect());
      }

      await Promise.all(connectionPromises);

      // Verify all connections
      await this.verifyConnections();

      this.initialized = true;
      logger.info('All database connections initialized successfully');

    } catch (error) {
      logger.error('Failed to initialize database connections:', error);
      throw error;
    }
  }

  /**
   * Get PostgreSQL adapter
   */
  public getPostgreSQL(): OLTPDatabaseAdapter {
    if (!this.postgresql) {
      throw new Error('PostgreSQL adapter not initialized');
    }
    return this.postgresql;
  }

  /**
   * Get ClickHouse adapter
   */
  public getClickHouse(): OLAPDatabaseAdapter {
    if (!this.clickhouse) {
      throw new Error('ClickHouse adapter not initialized');
    }
    return this.clickhouse;
  }

  /**
   * Get Redis adapter
   */
  public getRedis(): CacheDatabaseAdapter {
    if (!this.redis) {
      throw new Error('Redis adapter not initialized');
    }
    return this.redis;
  }

  /**
   * Get health status of all databases
   */
  public async getHealthStatus(): Promise<{
    postgresql: any;
    clickhouse: any;
    redis: any;
    overall: string;
  }> {
    const healthChecks = await Promise.allSettled([
      this.postgresql?.healthCheck() || Promise.resolve({ status: 'disabled', details: {} }),
      this.clickhouse?.healthCheck() || Promise.resolve({ status: 'disabled', details: {} }),
      this.redis?.healthCheck() || Promise.resolve({ status: 'disabled', details: {} })
    ]);

    const [postgresqlResult, clickhouseResult, redisResult] = healthChecks;

    const postgresql = postgresqlResult.status === 'fulfilled' ? postgresqlResult.value : { status: 'error', details: postgresqlResult.reason };
    const clickhouse = clickhouseResult.status === 'fulfilled' ? clickhouseResult.value : { status: 'error', details: clickhouseResult.reason };
    const redis = redisResult.status === 'fulfilled' ? redisResult.value : { status: 'error', details: redisResult.reason };

    const overall = [postgresql, clickhouse, redis].every(h => h.status === 'healthy' || h.status === 'disabled') ? 'healthy' : 'unhealthy';

    return {
      postgresql,
      clickhouse,
      redis,
      overall
    };
  }

  /**
   * Close all database connections
   */
  public async close(): Promise<void> {
    try {
      logger.info('Closing database connections...');

      const closePromises = [];

      if (this.postgresql) {
        closePromises.push(this.postgresql.disconnect());
      }

      if (this.clickhouse) {
        closePromises.push(this.clickhouse.disconnect());
      }

      if (this.redis) {
        closePromises.push(this.redis.disconnect());
      }

      await Promise.all(closePromises);

      this.initialized = false;
      logger.info('All database connections closed');

    } catch (error) {
      logger.error('Error closing database connections:', error);
      throw error;
    }
  }

  /**
   * Check if all databases are initialized
   */
  public isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Initialize database adapters based on environment
   */
  private initializeAdapters(): void {
    const databaseType = process.env.DATABASE_TYPE || 'postgresql+clickhouse+redis';

    if (databaseType.includes('postgresql')) {
      this.postgresql = new PostgreSQLAdapter();
    }

    if (databaseType.includes('clickhouse')) {
      this.clickhouse = new ClickHouseAdapter();
    }

    if (databaseType.includes('redis')) {
      this.redis = new RedisAdapter();
    }

    logger.info(`Initialized database adapters: ${databaseType}`);
  }

  /**
   * Verify all database connections
   */
  private async verifyConnections(): Promise<void> {
    const verificationPromises = [];

    if (this.postgresql) {
      verificationPromises.push(
        this.postgresql.isConnected().then(connected => {
          if (!connected) throw new Error('PostgreSQL connection failed');
        })
      );
    }

    if (this.clickhouse) {
      verificationPromises.push(
        this.clickhouse.isConnected().then(connected => {
          if (!connected) throw new Error('ClickHouse connection failed');
        })
      );
    }

    if (this.redis) {
      verificationPromises.push(
        this.redis.isConnected().then(connected => {
          if (!connected) throw new Error('Redis connection failed');
        })
      );
    }

    await Promise.all(verificationPromises);
  }
}
