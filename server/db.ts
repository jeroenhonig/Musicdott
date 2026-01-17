import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

// Configure Neon WebSocket - will fall back to in-memory when disabled
try {
  if (typeof ws !== 'undefined') {
    neonConfig.webSocketConstructor = ws;
    neonConfig.useSecureWebSocket = true;
    neonConfig.pipelineConnect = false;
    console.log("WebSocket configuration successful");
  }
} catch (wsError) {
  console.warn("WebSocket configuration failed:", wsError);
}

// Helper function to URL-encode DATABASE_URL password if needed
function sanitizeDatabaseUrl(url: string | undefined): string | undefined {
  if (!url) return undefined;

  try {
    // Parse the URL to check if it's valid
    new URL(url);
    return url; // Already valid, no encoding needed
  } catch {
    // Try to fix common issues: encode password in URL
    const match = url.match(/^(postgresql:\/\/[^:]+):([^@]+)@(.+)$/);
    if (match) {
      const [, prefix, password, suffix] = match;
      const encodedPassword = encodeURIComponent(password);
      const fixedUrl = `${prefix}:${encodedPassword}@${suffix}`;
      console.log('🔧 Auto-encoded DATABASE_URL password');
      return fixedUrl;
    }
    return url; // Can't fix, return as-is
  }
}

// Check if DATABASE_URL is available
const DATABASE_URL = sanitizeDatabaseUrl(process.env.DATABASE_URL);
const hasDbUrl = !!DATABASE_URL;

// Export a variable to indicate database connectivity status
export let isDatabaseAvailable = false;
export let pool: Pool;
export let db: ReturnType<typeof drizzle<typeof schema>>;

// Connection retry configuration
const MAX_RETRIES = 3;
const RETRY_DELAY = 2000; // 2 seconds
let connectionRetries = 0;
let lastConnectionAttempt = 0;

// Health check state
let lastHealthCheck = 0;
const HEALTH_CHECK_INTERVAL = 60000; // 1 minute

async function initializeDatabase() {
  try {
    if (hasDbUrl) {
      console.log("Initializing database connection...");
      
      pool = new Pool({
        connectionString: DATABASE_URL,
        connectionTimeoutMillis: 8000,
        max: 10,
        min: 2,
        idleTimeoutMillis: 60000,
        allowExitOnIdle: false
      });
      
      // Enhanced error handling for the pool
      pool.on('error', (err) => {
        console.error('Database pool error:', err.message);
        isDatabaseAvailable = false;
        // Schedule reconnection attempt
        scheduleReconnection();
      });
      
      pool.on('connect', () => {
        console.log('New database connection established');
        isDatabaseAvailable = true;
        connectionRetries = 0; // Reset retry counter
      });
      
      pool.on('remove', () => {
        console.log('Database connection removed from pool');
      });
      
      db = drizzle(pool, { schema });
      
      // Test connection with enhanced health check
      await performHealthCheck();
      
      if (isDatabaseAvailable) {
        console.log("Database connection established successfully");
        // Start periodic health checks
        startHealthCheckScheduler();
      }
    } else {
      console.warn("DATABASE_URL not set. Database features will be unavailable.");
    }
  } catch (err) {
    console.error("Failed to initialize database connection:", err);
    console.log("Continuing with in-memory storage fallback");
    isDatabaseAvailable = false;
    
    // Ensure pool is defined even if connection fails
    if (!pool && hasDbUrl) {
      try {
        pool = new Pool({
          connectionString: DATABASE_URL,
          connectionTimeoutMillis: 1000,
          max: 1
        });
      } catch (poolError) {
        console.warn("Could not create pool:", poolError);
      }
    }
  }
}

// Initialize database connection
initializeDatabase().catch(err => {
  console.error("Database initialization error:", err);
  isDatabaseAvailable = false;
});

// Enhanced query function with proper error propagation - PRODUCTION SAFETY FIX
export async function executeQuery(query: string, params?: any[]): Promise<{ rows: any[] }> {
  try {
    // Check if database needs health check
    if (shouldPerformHealthCheck()) {
      await performHealthCheck();
    }
    
    // CRITICAL FIX: Throw error instead of returning empty results when DB unavailable
    if (!isDatabaseAvailable) {
      const error = new Error("Database connection is unavailable. Please try again later.");
      error.name = 'DatabaseUnavailableError';
      console.warn("Database query attempted while database is unavailable");
      // Attempt reconnection if enough time has passed
      if (Date.now() - lastConnectionAttempt > RETRY_DELAY) {
        scheduleReconnection();
      }
      throw error;
    }
    
    let result;
    if (params) {
      result = await pool.query(query, params);
    } else {
      const dbResult = await db.execute(query);
      result = { rows: dbResult.rows || [] };
    }
    
    // Query successful, ensure availability is true
    if (!isDatabaseAvailable) {
      isDatabaseAvailable = true;
      console.log("Database connection restored");
    }
    
    return result;
  } catch (error) {
    console.error("Database query error:", error);
    
    // Enhanced error detection and handling
    if (error instanceof Error) {
      const errorMessage = error.message.toLowerCase();
      const isConnectionError = 
        errorMessage.includes("endpoint is disabled") || 
        errorMessage.includes("connection") || 
        errorMessage.includes("timeout") ||
        errorMessage.includes("econnrefused") ||
        errorMessage.includes("network") ||
        errorMessage.includes("socket");
      
      if (isConnectionError) {
        console.warn("Database connection appears to be down, marking as unavailable");
        isDatabaseAvailable = false;
        scheduleReconnection();
        
        // Create a specific error for connection issues
        const connectionError = new Error("Database connection lost. The system will attempt to reconnect automatically.");
        connectionError.name = 'DatabaseConnectionError';
        throw connectionError;
      }
    }
    
    // CRITICAL FIX: Re-throw errors instead of masking them
    throw error;
  }
}

// Health check function
export async function performHealthCheck(): Promise<boolean> {
  try {
    if (!pool) {
      isDatabaseAvailable = false;
      return false;
    }
    
    // Use a simpler approach with SQL via raw pool query
    const testResult = await Promise.race([
      pool.query('SELECT 1'),
      new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Health check timeout')), 3000)
      )
    ]);
    
    if (testResult && testResult.rows && testResult.rows.length > 0) {
      isDatabaseAvailable = true;
      lastHealthCheck = Date.now();
      console.log("✅ Database health check successful");
      return true;
    } else {
      console.warn("⚠️ Database health check returned no rows");
      // Don't immediately mark as unavailable, allow fallback
      return false;
    }
  } catch (error) {
    console.error("Database health check failed:", error);
    // Check if this is just a health check issue vs actual connectivity
    try {
      // Try a simple connection test without complex queries
      const simpleTest = await pool.query('SELECT 1');
      if (simpleTest && simpleTest.rows && simpleTest.rows.length > 0) {
        console.log("✅ Simple database test passed despite health check failure");
        isDatabaseAvailable = true;
        lastHealthCheck = Date.now();
        return true;
      }
    } catch (simpleError) {
      console.error("Simple database test also failed:", simpleError);
    }
    
    isDatabaseAvailable = false;
    return false;
  }
}

// Check if health check is needed
function shouldPerformHealthCheck(): boolean {
  return Date.now() - lastHealthCheck > HEALTH_CHECK_INTERVAL;
}

// Schedule reconnection attempt
function scheduleReconnection(): void {
  if (connectionRetries >= MAX_RETRIES) {
    console.error(`Max reconnection attempts (${MAX_RETRIES}) reached. Stopping reconnection attempts.`);
    return;
  }
  
  const now = Date.now();
  if (now - lastConnectionAttempt < RETRY_DELAY) {
    return; // Too soon to retry
  }
  
  lastConnectionAttempt = now;
  connectionRetries++;
  
  console.log(`Attempting database reconnection (attempt ${connectionRetries}/${MAX_RETRIES})...`);
  
  setTimeout(async () => {
    try {
      await performHealthCheck();
      if (isDatabaseAvailable) {
        console.log("Database reconnection successful");
        connectionRetries = 0;
      }
    } catch (error) {
      console.error("Reconnection attempt failed:", error);
    }
  }, RETRY_DELAY * connectionRetries); // Exponential backoff
}

// Start periodic health check scheduler
function startHealthCheckScheduler(): void {
  setInterval(async () => {
    if (isDatabaseAvailable) {
      const healthy = await performHealthCheck();
      if (!healthy) {
        console.warn("Periodic health check failed, scheduling reconnection");
        scheduleReconnection();
      }
    }
  }, HEALTH_CHECK_INTERVAL);
}

// Enhanced database status function
export function getDatabaseStatus(): {
  available: boolean;
  lastHealthCheck: number;
  connectionRetries: number;
  poolStats?: any;
  databaseUrl?: string;
} {
  return {
    available: isDatabaseAvailable,
    lastHealthCheck,
    connectionRetries,
    databaseUrl: DATABASE_URL ? 'configured' : 'missing',
    poolStats: pool ? {
      totalCount: pool.totalCount,
      idleCount: pool.idleCount,
      waitingCount: pool.waitingCount
    } : undefined
  };
}