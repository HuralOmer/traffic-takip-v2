/**
 * HRL Universal Traffic Tracking - Main Application
 * 
 * Modern multi-database architecture:
 * - PostgreSQL (OLTP) - Application data
 * - ClickHouse (OLAP) - Analytics data  
 * - Redis - Real-time metrics & presence
 */

import { createServer } from './api/server';
import { DatabaseManager } from './database/database-manager';
import { ActiveUsersManager } from './tracking/active-users';
import { createLogger } from './utils/logger';

const logger = createLogger('main');

async function main() {
  try {
    logger.info('Starting HRL Universal Traffic Tracking...');
    
    // Initialize database manager (optional)
    let dbManager: DatabaseManager | null = null;
    try {
      dbManager = new DatabaseManager();
      await dbManager.initialize();
      logger.info('Database connections initialized successfully');
    } catch (error) {
      logger.warn('Database initialization failed, running without databases:', error instanceof Error ? error.message : String(error));
    }
    
    // Initialize active users manager (optional)
    let activeUsersManager: ActiveUsersManager | null = null;
    try {
      if (dbManager) {
        activeUsersManager = new ActiveUsersManager();
        await activeUsersManager.start();
        logger.info('Active users manager started successfully');
      }
    } catch (error) {
      logger.warn('Active users manager failed to start:', error instanceof Error ? error.message : String(error));
    }
    
    // Create and start server
    const server = createServer(dbManager, activeUsersManager);
    await server.start();
    
    logger.info('HRL Universal Traffic Tracking started successfully');
    
  } catch (error) {
    logger.error('Failed to start application:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  logger.info('Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('Shutting down gracefully...');
  process.exit(0);
});

main().catch((error) => {
  logger.error('Unhandled error:', error instanceof Error ? error.message : String(error));
  process.exit(1);
});
