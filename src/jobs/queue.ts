import { Queue, Worker, Job } from 'bullmq';
import { redis } from '../config/redis.js';
import logger from '../config/logger.js';

export interface EmailJobData {
  to: string;
  subject: string;
  html: string;
  attachments?: Array<{
    filename: string;
    content: Buffer;
    contentType: string;
  }>;
}

export interface BackupJobData {
  type: 'database' | 'files';
  retention?: number; // days
}

export interface MaintenanceJobData {
  task: 'cleanup_expired_images' | 'optimize_database' | 'update_analytics';
}

// Create queues
export const emailQueue = new Queue<EmailJobData>('email', {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: 10,
    removeOnFail: 5,
  },
});

export const backupQueue = new Queue<BackupJobData>('backup', {
  connection: redis,
  defaultJobOptions: {
    attempts: 2,
    backoff: {
      type: 'fixed',
      delay: 5000,
    },
    removeOnComplete: 5,
    removeOnFail: 3,
  },
});

export const maintenanceQueue = new Queue<MaintenanceJobData>('maintenance', {
  connection: redis,
  defaultJobOptions: {
    attempts: 2,
    removeOnComplete: 5,
    removeOnFail: 3,
  },
});

// Workers
const emailWorker = new Worker<EmailJobData>(
  'email',
  async (job: Job<EmailJobData>) => {
    const { data } = job;
    logger.info(`Processing email job: ${job.id}`, { to: data.to, subject: data.subject });
    
    // Import email service dynamically to avoid circular deps
    const { sendEmail } = await import('../services/emailService.js');
    await sendEmail(data);
    
    logger.info(`Email job completed: ${job.id}`);
  },
  {
    connection: redis,
    concurrency: 5,
  }
);

const backupWorker = new Worker<BackupJobData>(
  'backup',
  async (job: Job<BackupJobData>) => {
    const { data } = job;
    logger.info(`Processing backup job: ${job.id}`, { type: data.type });
    
    const { performBackup } = await import('../services/backupService.js');
    await performBackup(data);
    
    logger.info(`Backup job completed: ${job.id}`);
  },
  {
    connection: redis,
    concurrency: 1,
  }
);

const maintenanceWorker = new Worker<MaintenanceJobData>(
  'maintenance',
  async (job: Job<MaintenanceJobData>) => {
    const { data } = job;
    logger.info(`Processing maintenance job: ${job.id}`, { task: data.task });
    
    const { runMaintenanceTask } = await import('../services/maintenanceService.js');
    await runMaintenanceTask(data.task);
    
    logger.info(`Maintenance job completed: ${job.id}`);
  },
  {
    connection: redis,
    concurrency: 1,
  }
);

// Error handling
emailWorker.on('failed', (job, err) => {
  logger.error(`Email job failed: ${job?.id}`, { error: err.message });
});

backupWorker.on('failed', (job, err) => {
  logger.error(`Backup job failed: ${job?.id}`, { error: err.message });
});

maintenanceWorker.on('failed', (job, err) => {
  logger.error(`Maintenance job failed: ${job?.id}`, { error: err.message });
});

// Schedule recurring jobs
export async function scheduleRecurringJobs(): Promise<void> {
  // Daily database backup at 2 AM
  await backupQueue.add(
    'daily-backup',
    { type: 'database', retention: 30 },
    {
      repeat: { pattern: '0 2 * * *' },
      jobId: 'daily-database-backup',
    }
  );

  // Weekly file cleanup on Sundays at 3 AM
  await maintenanceQueue.add(
    'cleanup-files',
    { task: 'cleanup_expired_images' },
    {
      repeat: { pattern: '0 3 * * 0' },
      jobId: 'weekly-cleanup',
    }
  );

  logger.info('Recurring jobs scheduled');
}

export async function closeQueues(): Promise<void> {
  await Promise.all([
    emailWorker.close(),
    backupWorker.close(),
    maintenanceWorker.close(),
    emailQueue.close(),
    backupQueue.close(),
    maintenanceQueue.close(),
  ]);
  logger.info('All queues closed');
}