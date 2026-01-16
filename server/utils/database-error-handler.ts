import { logger } from "./logger";

export class DatabaseError extends Error {
  constructor(
    message: string,
    public operation: string,
    public table?: string,
    public originalError?: Error
  ) {
    super(message);
    this.name = 'DatabaseError';
  }
}

interface DatabaseOperationOptions {
  operation: string;
  table?: string;
  logDetails?: boolean;
}

export async function withDatabaseErrorHandling<T>(
  fn: () => Promise<T>,
  options: DatabaseOperationOptions
): Promise<T> {
  const { operation, table, logDetails = true } = options;
  
  try {
    const startTime = Date.now();
    const result = await fn();
    const duration = Date.now() - startTime;
    
    if (logDetails && duration > 1000) {
      logger.warn(`Slow database query: ${operation}${table ? ` on ${table}` : ''} took ${duration}ms`);
    }
    
    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    // Log the error with context
    logger.error(`Database error in ${operation}${table ? ` on ${table}` : ''}`, {
      operation,
      table,
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined
    });
    
    // Throw a structured database error
    throw new DatabaseError(
      `Failed to ${operation}${table ? ` on ${table}` : ''}`,
      operation,
      table,
      error instanceof Error ? error : undefined
    );
  }
}

// Retry logic for transient database errors
export async function withDatabaseRetry<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number;
    retryDelay?: number;
    operation: string;
    table?: string;
  }
): Promise<T> {
  const { maxRetries = 3, retryDelay = 1000, operation, table } = options;
  
  let lastError: Error | undefined;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await withDatabaseErrorHandling(fn, { operation, table });
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      // Check the original error (if wrapped in DatabaseError) for non-retryable patterns
      const errorToCheck = lastError instanceof DatabaseError && lastError.originalError 
        ? lastError.originalError 
        : lastError;
      
      // Don't retry on certain errors (constraint violations, etc.)
      if (isNonRetryableError(errorToCheck)) {
        throw lastError;
      }
      
      if (attempt < maxRetries) {
        logger.warn(`Database operation failed, retrying (${attempt}/${maxRetries})`, {
          operation,
          table,
          error: lastError.message
        });
        
        await new Promise(resolve => setTimeout(resolve, retryDelay * attempt));
      }
    }
  }
  
  throw lastError || new Error('Database operation failed after retries');
}

function isNonRetryableError(error: Error): boolean {
  const nonRetryablePatterns = [
    'unique constraint',
    'foreign key constraint',
    'not null constraint',
    'check constraint',
    'duplicate key',
    'invalid input syntax'
  ];
  
  const errorMessage = error.message.toLowerCase();
  return nonRetryablePatterns.some(pattern => errorMessage.includes(pattern));
}

// Connection pool health monitoring
export function monitorDatabaseHealth(db: any) {
  if (process.env.NODE_ENV === 'production') {
    setInterval(() => {
      try {
        // Log connection pool stats if available
        logger.info('Database health check', {
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        logger.error('Database health check failed', error instanceof Error ? error.message : String(error));
      }
    }, 60000); // Every minute
  }
}
