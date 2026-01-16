import { createWriteStream, existsSync, mkdirSync } from 'fs';
import path from 'path';

// Create logs directory if it doesn't exist
const logsDir = path.join(process.cwd(), 'logs');
if (!existsSync(logsDir)) {
  mkdirSync(logsDir, { recursive: true });
}

// Log levels
export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3
}

// Current log level based on environment
const currentLogLevel = process.env.NODE_ENV === 'production' ? LogLevel.INFO : LogLevel.DEBUG;

// Log streams for different levels
const errorStream = createWriteStream(path.join(logsDir, 'error.log'), { flags: 'a' });
const infoStream = createWriteStream(path.join(logsDir, 'app.log'), { flags: 'a' });

// Logger interface
export interface Logger {
  error(message: string, meta?: any): void;
  warn(message: string, meta?: any): void;
  info(message: string, meta?: any): void;
  debug(message: string, meta?: any): void;
}

// Format log message
const formatMessage = (level: string, message: string, meta?: any): string => {
  const timestamp = new Date().toISOString();
  const baseMessage = `${timestamp} [${level}] ${message}`;
  
  if (meta) {
    return `${baseMessage} ${JSON.stringify(meta)}`;
  }
  return baseMessage;
};

// Production logger
class ProductionLogger implements Logger {
  error(message: string, meta?: any): void {
    if (currentLogLevel >= LogLevel.ERROR) {
      const formatted = formatMessage('ERROR', message, meta);
      errorStream.write(formatted + '\n');
      console.error(formatted);
    }
  }

  warn(message: string, meta?: any): void {
    if (currentLogLevel >= LogLevel.WARN) {
      const formatted = formatMessage('WARN', message, meta);
      infoStream.write(formatted + '\n');
      console.warn(formatted);
    }
  }

  info(message: string, meta?: any): void {
    if (currentLogLevel >= LogLevel.INFO) {
      const formatted = formatMessage('INFO', message, meta);
      infoStream.write(formatted + '\n');
      console.log(formatted);
    }
  }

  debug(message: string, meta?: any): void {
    if (currentLogLevel >= LogLevel.DEBUG) {
      const formatted = formatMessage('DEBUG', message, meta);
      console.log(formatted);
    }
  }
}

// Development logger (maintains console.log behavior)
class DevelopmentLogger implements Logger {
  error(message: string, meta?: any): void {
    console.error(`[ERROR] ${message}`, meta || '');
  }

  warn(message: string, meta?: any): void {
    console.warn(`[WARN] ${message}`, meta || '');
  }

  info(message: string, meta?: any): void {
    console.log(`[INFO] ${message}`, meta || '');
  }

  debug(message: string, meta?: any): void {
    console.log(`[DEBUG] ${message}`, meta || '');
  }
}

// Export logger instance
export const logger: Logger = process.env.NODE_ENV === 'production' 
  ? new ProductionLogger() 
  : new DevelopmentLogger();

// Helper function to sanitize sensitive data from logs
export const sanitizeForLog = (obj: any): any => {
  if (typeof obj !== 'object' || obj === null) return obj;
  
  const sanitized = { ...obj };
  const sensitiveFields = ['password', 'token', 'secret', 'key', 'auth'];
  
  for (const key in sanitized) {
    if (sensitiveFields.some(field => key.toLowerCase().includes(field))) {
      sanitized[key] = '[REDACTED]';
    }
  }
  
  return sanitized;
};