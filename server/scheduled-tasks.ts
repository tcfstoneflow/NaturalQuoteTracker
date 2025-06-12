import { validateProductData, optimizeQuoteCalculations, cleanupExpiredData, generateHealthReport } from "./database-maintenance";
import { cleanupExpiredGalleryImages } from "./cleanup-expired-images";

/**
 * Scheduled maintenance tasks to keep the CRM system running optimally
 */

class TaskScheduler {
  private intervals: Map<string, NodeJS.Timeout> = new Map();

  start() {
    console.log('Starting scheduled maintenance tasks...');

    // Run database validation daily at 2 AM
    this.scheduleDaily('database-validation', 2, async () => {
      console.log('Running daily database validation...');
      try {
        const result = await validateProductData();
        if (result.issues.length > 0) {
          console.warn('Database validation issues found:', result.issues);
        }
        if (result.fixed.length > 0) {
          console.log('Database issues fixed:', result.fixed);
        }
      } catch (error) {
        console.error('Database validation failed:', error);
      }
    });

    // Run quote optimization weekly on Sundays at 3 AM
    this.scheduleWeekly('quote-optimization', 0, 3, async () => {
      console.log('Running weekly quote optimization...');
      try {
        await optimizeQuoteCalculations();
        console.log('Quote calculations optimized successfully');
      } catch (error) {
        console.error('Quote optimization failed:', error);
      }
    });

    // Clean up expired data weekly on Sundays at 4 AM
    this.scheduleWeekly('data-cleanup', 0, 4, async () => {
      console.log('Running weekly data cleanup...');
      try {
        await cleanupExpiredData();
        await cleanupExpiredGalleryImages();
        console.log('Expired data cleaned up successfully');
      } catch (error) {
        console.error('Data cleanup failed:', error);
      }
    });

    // Generate health report every 24 hours (reduced frequency to prevent connection issues)
    this.scheduleInterval('health-report', 24 * 60 * 60 * 1000, async () => {
      try {
        const report = await generateHealthReport();
        if (report.systemHealth === 'critical') {
          console.error('CRITICAL: System health is critical!', report.recommendations);
        } else if (report.systemHealth === 'warning') {
          console.warn('WARNING: System health needs attention:', report.recommendations);
        } else {
          console.log('System health check completed: System is healthy');
        }
      } catch (error) {
        console.error('Health report generation error:', error);
        // Don't mark as critical for connection timeouts, just log and continue
      }
    });
  }

  stop() {
    console.log('Stopping scheduled maintenance tasks...');
    this.intervals.forEach((interval, name) => {
      clearInterval(interval);
      console.log(`Stopped task: ${name}`);
    });
    this.intervals.clear();
  }

  private scheduleDaily(name: string, hour: number, task: () => Promise<void>) {
    const runTask = async () => {
      const now = new Date();
      const nextRun = new Date();
      nextRun.setHours(hour, 0, 0, 0);
      
      if (nextRun <= now) {
        nextRun.setDate(nextRun.getDate() + 1);
      }
      
      const timeout = nextRun.getTime() - now.getTime();
      
      setTimeout(async () => {
        await task();
        // Schedule next run
        this.scheduleDaily(name, hour, task);
      }, timeout);
    };

    runTask();
  }

  private scheduleWeekly(name: string, dayOfWeek: number, hour: number, task: () => Promise<void>) {
    const runTask = async () => {
      const now = new Date();
      const nextRun = new Date();
      nextRun.setHours(hour, 0, 0, 0);
      
      const daysUntilTarget = (dayOfWeek + 7 - now.getDay()) % 7;
      if (daysUntilTarget === 0 && nextRun <= now) {
        nextRun.setDate(nextRun.getDate() + 7);
      } else {
        nextRun.setDate(nextRun.getDate() + daysUntilTarget);
      }
      
      const timeout = nextRun.getTime() - now.getTime();
      
      setTimeout(async () => {
        await task();
        // Schedule next run
        this.scheduleWeekly(name, dayOfWeek, hour, task);
      }, timeout);
    };

    runTask();
  }

  private scheduleInterval(name: string, intervalMs: number, task: () => Promise<void>) {
    const interval = setInterval(async () => {
      try {
        await task();
      } catch (error) {
        console.error(`Scheduled task ${name} failed:`, error);
      }
    }, intervalMs);
    
    this.intervals.set(name, interval);
    
    // Run immediately on startup with error handling
    setTimeout(async () => {
      try {
        await task();
      } catch (error) {
        console.error(`Initial run of scheduled task ${name} failed:`, error);
      }
    }, 1000);
  }
}

export const taskScheduler = new TaskScheduler();

// Auto-start in production
if (process.env.NODE_ENV === 'production') {
  taskScheduler.start();
}