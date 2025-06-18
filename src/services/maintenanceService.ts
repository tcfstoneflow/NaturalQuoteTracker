import { unlink, readdir, stat } from 'fs/promises';
import { join } from 'path';
import { db } from '../config/database.js';
import { sql } from 'drizzle-orm';
import logger from '../config/logger.js';

export async function runMaintenanceTask(task: string): Promise<void> {
  logger.info(`Starting maintenance task: ${task}`);
  
  switch (task) {
    case 'cleanup_expired_images':
      await cleanupExpiredImages();
      break;
    case 'optimize_database':
      await optimizeDatabase();
      break;
    case 'update_analytics':
      await updateAnalytics();
      break;
    default:
      throw new Error(`Unknown maintenance task: ${task}`);
  }
  
  logger.info(`Completed maintenance task: ${task}`);
}

async function cleanupExpiredImages(): Promise<void> {
  try {
    const uploadDir = 'upload';
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 30); // 30 days old

    const files = await readdir(uploadDir);
    let deletedCount = 0;

    for (const file of files) {
      const filePath = join(uploadDir, file);
      const stats = await stat(filePath);
      
      if (stats.isFile() && stats.mtime < cutoffDate) {
        await unlink(filePath);
        deletedCount++;
      }
    }

    logger.info(`Cleaned up ${deletedCount} expired images`);
  } catch (error) {
    logger.error('Failed to cleanup expired images', { error: error instanceof Error ? error.message : 'Unknown error' });
    throw error;
  }
}

async function optimizeDatabase(): Promise<void> {
  try {
    // Run VACUUM and ANALYZE on the database
    await db.execute(sql`VACUUM ANALYZE;`);
    
    // Update table statistics
    await db.execute(sql`ANALYZE;`);
    
    logger.info('Database optimization completed');
  } catch (error) {
    logger.error('Failed to optimize database', { error: error instanceof Error ? error.message : 'Unknown error' });
    throw error;
  }
}

async function updateAnalytics(): Promise<void> {
  try {
    // Update materialized views or cached analytics data
    // This is a placeholder for analytics refresh operations
    logger.info('Analytics update completed');
  } catch (error) {
    logger.error('Failed to update analytics', { error: error instanceof Error ? error.message : 'Unknown error' });
    throw error;
  }
}