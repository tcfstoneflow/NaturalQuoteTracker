import { exec } from 'child_process';
import { promisify } from 'util';
import { writeFile, mkdir } from 'fs/promises';
import { env } from '../config/env.js';
import logger from '../config/logger.js';
import { BackupJobData } from '../jobs/queue.js';

const execAsync = promisify(exec);

export async function performBackup(data: BackupJobData): Promise<void> {
  try {
    if (data.type === 'database') {
      await performDatabaseBackup(data.retention);
    } else if (data.type === 'files') {
      await performFileBackup(data.retention);
    }
  } catch (error) {
    logger.error('Backup failed', { type: data.type, error: error instanceof Error ? error.message : 'Unknown error' });
    throw error;
  }
}

async function performDatabaseBackup(retentionDays: number = 30): Promise<void> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = 'backups/database';
  const backupFile = `${backupDir}/backup-${timestamp}.sql`;

  try {
    // Create backup directory
    await mkdir(backupDir, { recursive: true });

    // Generate pg_dump command
    const dumpCommand = `pg_dump "${env.DATABASE_URL}" > ${backupFile}`;
    
    logger.info('Starting database backup', { file: backupFile });
    await execAsync(dumpCommand);
    
    // Compress the backup
    const gzipCommand = `gzip ${backupFile}`;
    await execAsync(gzipCommand);
    
    logger.info('Database backup completed', { file: `${backupFile}.gz` });

    // Cleanup old backups
    if (retentionDays > 0) {
      await cleanupOldBackups(backupDir, retentionDays);
    }
  } catch (error) {
    logger.error('Database backup failed', { error: error instanceof Error ? error.message : 'Unknown error' });
    throw error;
  }
}

async function performFileBackup(retentionDays: number = 30): Promise<void> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = 'backups/files';
  const backupFile = `${backupDir}/files-${timestamp}.tar.gz`;

  try {
    await mkdir(backupDir, { recursive: true });

    // Backup important directories
    const tarCommand = `tar -czf ${backupFile} upload/ logs/ --exclude='logs/*.log' || true`;
    
    logger.info('Starting file backup', { file: backupFile });
    await execAsync(tarCommand);
    
    logger.info('File backup completed', { file: backupFile });

    if (retentionDays > 0) {
      await cleanupOldBackups(backupDir, retentionDays);
    }
  } catch (error) {
    logger.error('File backup failed', { error: error instanceof Error ? error.message : 'Unknown error' });
    throw error;
  }
}

async function cleanupOldBackups(backupDir: string, retentionDays: number): Promise<void> {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    const findCommand = `find ${backupDir} -name "*.gz" -type f -mtime +${retentionDays} -delete`;
    await execAsync(findCommand);
    
    logger.info('Old backups cleaned up', { retentionDays, cutoffDate });
  } catch (error) {
    logger.warn('Failed to cleanup old backups', { error: error instanceof Error ? error.message : 'Unknown error' });
  }
}