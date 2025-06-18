import { Router } from 'express';
import { checkDatabaseHealth } from '../config/database.js';
import { checkRedisHealth } from '../config/redis.js';
import logger from '../config/logger.js';

const router = Router();

interface HealthStatus {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  uptime: number;
  services: {
    database: boolean;
    redis: boolean;
  };
  memory: NodeJS.MemoryUsage;
  version: string;
}

router.get('/health', async (req, res) => {
  try {
    const [dbHealthy, redisHealthy] = await Promise.all([
      checkDatabaseHealth(),
      checkRedisHealth()
    ]);

    const healthStatus: HealthStatus = {
      status: dbHealthy && redisHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      services: {
        database: dbHealthy,
        redis: redisHealthy
      },
      memory: process.memoryUsage(),
      version: process.env.npm_package_version || '1.0.0'
    };

    const statusCode = healthStatus.status === 'healthy' ? 200 : 503;
    res.status(statusCode).json(healthStatus);

    if (statusCode === 503) {
      logger.warn('Health check failed', healthStatus);
    }
  } catch (error) {
    logger.error('Health check error:', error);
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Health check failed'
    });
  }
});

router.get('/ready', async (req, res) => {
  try {
    const dbHealthy = await checkDatabaseHealth();
    if (dbHealthy) {
      res.status(200).json({ status: 'ready' });
    } else {
      res.status(503).json({ status: 'not ready' });
    }
  } catch (error) {
    res.status(503).json({ status: 'not ready' });
  }
});

export default router;