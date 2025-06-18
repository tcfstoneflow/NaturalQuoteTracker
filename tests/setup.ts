import { beforeAll, afterAll } from 'vitest';
import { db, pool } from '../src/config/database.js';
import { redis, closeRedisConnection } from '../src/config/redis.js';
import { env } from '../src/config/env.js';

// Test database setup
beforeAll(async () => {
  // Ensure we're using test environment
  if (env.NODE_ENV !== 'test') {
    throw new Error('Tests must run in test environment');
  }
  
  // Connect to test database
  try {
    await db.execute({ sql: 'SELECT 1' });
    console.log('Test database connected');
  } catch (error) {
    console.error('Failed to connect to test database:', error);
    throw error;
  }
});

afterAll(async () => {
  // Clean up connections
  await pool.end();
  await closeRedisConnection();
});