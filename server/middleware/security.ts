import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';

// Environment-aware rate limiting configuration
const isDevelopment = process.env.NODE_ENV === 'development';

// Enhanced rate limiting middleware for different endpoints
export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isDevelopment ? 100 : 5, // Much higher for development
  message: 'Too many authentication attempts, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful requests
  // Skip health checks and HEAD requests
  skip: (req) => {
    return req.path === '/health' || 
           req.path === '/api/health' || 
           req.method === 'HEAD' ||
           req.path === '/api';
  }
});

// General API rate limiting - Development-friendly
export const apiRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes  
  max: isDevelopment ? 5000 : 1000, // Even higher for development
  message: 'Too many requests, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  // Skip health checks and HEAD requests that are causing issues
  skip: (req) => {
    return req.path === '/health' || 
           req.path === '/api/health' || 
           req.method === 'HEAD' ||
           req.path === '/api';
  }
});

// Strict rate limiting for sensitive operations
export const strictRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: isDevelopment ? 50 : 10, // Higher for development
  message: 'Too many sensitive operations, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Content Security Policy middleware
export const cspMiddleware = (req: Request, res: Response, next: NextFunction) => {
  res.setHeader('Content-Security-Policy', 
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://www.youtube.com https://www.gstatic.com https://replit.com; " +
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
    "img-src 'self' data: https: blob:; " +
    "font-src 'self' https://fonts.gstatic.com; " +
    "connect-src 'self' https://api.stripe.com https://www.youtube.com; " +
    "frame-src 'self' https://www.youtube.com https://open.spotify.com https://music.apple.com; " +
    "media-src 'self' data: blob:;"
  );
  next();
};

// Enhanced HTTPS redirect middleware
export const httpsRedirect = (req: Request, res: Response, next: NextFunction) => {
  if (process.env.NODE_ENV === 'production') {
    // Check various headers that proxies might use
    const isHttps = req.header('x-forwarded-proto') === 'https' ||
                   req.header('x-forwarded-ssl') === 'on' ||
                   req.header('x-url-scheme') === 'https' ||
                   req.secure;
    
    if (!isHttps) {
      const host = req.header('host');
      if (host) {
        return res.redirect(301, `https://${host}${req.url}`);
      }
    }
  }
  next();
};

// Request logging middleware (production-safe)
export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  const originalIp = req.ip || req.connection.remoteAddress;
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const logData = {
      method: req.method,
      url: req.url,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: originalIp,
      userAgent: req.header('user-agent'),
      timestamp: new Date().toISOString()
    };
    
    // Only log errors and warnings in production
    if (process.env.NODE_ENV === 'production') {
      if (res.statusCode >= 400) {
        console.error('Request error:', JSON.stringify(logData));
      }
    } else {
      console.log('Request:', JSON.stringify(logData));
    }
  });
  
  next();
};

// File upload security middleware
export const fileUploadSecurity = (req: Request, res: Response, next: NextFunction) => {
  // Check Content-Type for file uploads
  if (req.headers['content-type']?.includes('multipart/form-data')) {
    // Limit file upload size (already handled by express.json limit)
    const contentLength = parseInt(req.headers['content-length'] || '0');
    if (contentLength > 10 * 1024 * 1024) { // 10MB
      return res.status(413).json({ error: 'File too large' });
    }
  }
  next();
};

// API key validation middleware (if needed in future)
export const validateApiKey = (req: Request, res: Response, next: NextFunction) => {
  const apiKey = req.header('x-api-key');
  
  if (req.path.startsWith('/api/public/') || req.path === '/api/health') {
    return next(); // Skip validation for public endpoints
  }
  
  // For now, just continue. This can be implemented when API keys are needed
  next();
};

// Enhanced security headers middleware
export const securityHeaders = (req: Request, res: Response, next: NextFunction) => {
  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  // Prevent clickjacking
  res.setHeader('X-Frame-Options', 'DENY');
  
  // XSS protection (deprecated but still useful for older browsers)
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  // Control referrer information
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Disable unnecessary browser features
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');
  
  // Remove server information
  res.removeHeader('X-Powered-By');
  
  // Prevent caching of sensitive data
  if (req.url.includes('/api/') && !req.url.includes('/api/health')) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }
  
  next();
};

// Enhanced input sanitization middleware
export const sanitizeInput = (req: Request, res: Response, next: NextFunction) => {
  if (req.body) {
    sanitizeObject(req.body);
  }
  if (req.query) {
    sanitizeObject(req.query);
  }
  if (req.params) {
    sanitizeObject(req.params);
  }
  next();
};

// Recursive sanitization function
function sanitizeObject(obj: any): void {
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      if (typeof obj[key] === 'string') {
        obj[key] = sanitizeString(obj[key]);
      } else if (typeof obj[key] === 'object' && obj[key] !== null) {
        sanitizeObject(obj[key]);
      }
    }
  }
}

// Enhanced string sanitization
function sanitizeString(str: string): string {
  return str
    // Remove script tags
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    // Remove iframe tags
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    // Remove object and embed tags
    .replace(/<(object|embed)\b[^<]*(?:(?!<\/(object|embed)>)<[^<]*)*<\/(object|embed)>/gi, '')
    // Remove javascript: protocol
    .replace(/javascript:/gi, '')
    // Remove on* event handlers
    .replace(/on\w+\s*=/gi, '')
    // Remove data: URIs except for images
    .replace(/data:(?!image\/(png|jpg|jpeg|gif|webp|svg))[^;,]*[;,]/gi, '')
    // Limit length to prevent DoS
    .substring(0, 10000);
}

// Environment validation middleware
export const validateEnvironment = (req: Request, res: Response, next: NextFunction) => {
  const requiredEnvVars = ['SESSION_SECRET'];
  
  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      console.error(`Missing required environment variable: ${envVar}`);
      return res.status(500).json({ error: 'Server configuration error' });
    }
  }
  
  // Validate session secret strength in production
  if (process.env.NODE_ENV === 'production' && process.env.SESSION_SECRET) {
    if (process.env.SESSION_SECRET.length < 32) {
      console.error('SESSION_SECRET is too short for production use');
      return res.status(500).json({ error: 'Server configuration error' });
    }
  }
  
  next();
};