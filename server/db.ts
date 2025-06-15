import { Pool, Client } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Create a more conservative connection pool for Neon/Serverless databases
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 5, // Reduced from 20 to avoid overwhelming serverless DB
  min: 1, // Reduced minimum connections
  idleTimeoutMillis: 30000, // Reduced idle timeout
  connectionTimeoutMillis: 10000,
  allowExitOnIdle: false,
  // Add SSL configuration for production
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

// Enhanced error handling with connection state tracking
let isConnected = false;
let reconnectAttempts = 0;
const maxReconnectAttempts = 5;

pool.on('error', (err: Error & { code?: string }) => {
  console.error('Database pool error:', err);
  isConnected = false;
  
  // Attempt to reconnect on connection errors
  if (err.code === '57P01' || err.code === 'ECONNRESET') {
    handleReconnection();
  }
});

pool.on('connect', (client) => {
  console.log('Database pool connection established');
  isConnected = true;
  reconnectAttempts = 0;
  
  // Set connection parameters for better stability
  client.query('SET application_name = $1', ['stone-crm-app']);
});

pool.on('remove', () => {
  console.log('Database connection removed from pool');
});

async function handleReconnection() {
  if (reconnectAttempts >= maxReconnectAttempts) {
    console.error('Max reconnection attempts reached');
    return;
  }
  
  reconnectAttempts++;
  const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 10000);
  
  console.log(`Attempting database reconnection (${reconnectAttempts}/${maxReconnectAttempts}) in ${delay}ms`);
  
  setTimeout(async () => {
    try {
      // Test connection
      const client = await pool.connect();
      await client.query('SELECT 1');
      client.release();
      isConnected = true;
      reconnectAttempts = 0;
      console.log('Database reconnection successful');
    } catch (error) {
      console.error('Database reconnection failed:', error);
      handleReconnection();
    }
  }, delay);
}

// Initialize connection with health check
async function initializeDatabase() {
  try {
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();
    isConnected = true;
    console.log('Database connection initialized successfully');
  } catch (error) {
    console.error('Database initialization failed:', error);
    isConnected = false;
    handleReconnection();
  }
}

// Initialize on startup
initializeDatabase();

export const db = drizzle(pool, { schema });

// Export connection status for health checks
export const getConnectionStatus = () => ({ isConnected, reconnectAttempts });