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
    
    // Initialize database manager
    const dbManager = new DatabaseManager();
    await dbManager.initialize();
    
    // Initialize active users manager
    const activeUsersManager = new ActiveUsersManager();
    await activeUsersManager.start();
    
    // Create and start server
    const server = createServer(dbManager, activeUsersManager);
    await server.start();
    
    logger.info('HRL Universal Traffic Tracking started successfully');
    
  } catch (error) {
    logger.error('Failed to start application:', error);
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
  logger.error('Unhandled error:', error);
  process.exit(1);
});
