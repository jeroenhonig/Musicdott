import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import { isTrustedEmbedUrl, TRUSTED_EMBED_FRAME_SOURCES } from '@shared/utils/trusted-embed-origins';

// Environment-aware rate limiting configuration
const isDevelopment = process.env.NODE_ENV === 'development';
const isProduction = process.env.NODE_ENV === 'production';
const UNSAFE_HTTP_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const CSRF_EXEMPT_PATH_SUFFIXES = [
  '/api/webhooks/stripe',
  '/api/subscriptions/webhook',
  '/api/billing/webhook',
] as const;
const PROD_APP_ORIGINS = [
  'https://musicdott.app',
  'https://www.musicdott.app',
  'https://musicdott.honig-it.com',
] as const;

function readTrustedOriginEnvVars(): string[] {
  const candidates = [
    process.env.APP_URL,
    process.env.PUBLIC_URL,
    process.env.CLIENT_URL,
    process.env.CORS_ORIGIN,
  ];

  return candidates
    .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
    .map((value) => value.trim());
}

export function getAllowedAppOrigins(): string[] {
  return Array.from(new Set([
    ...PROD_APP_ORIGINS,
    ...readTrustedOriginEnvVars(),
  ]));
}

export function getContentSecurityPolicyDirectives() {
  return {
    defaultSrc: ["'self'"],
    baseUri: ["'self'"],
    frameAncestors: ["'none'"],
    formAction: ["'self'", 'https://checkout.stripe.com'],
    scriptSrc: [
      "'self'",
      "'unsafe-inline'",
      "'unsafe-eval'",
      'blob:',
      'https://js.stripe.com',
      'https://checkout.stripe.com',
      'https://infird.com',
    ],
    styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
    fontSrc: ["'self'", 'data:', 'https://fonts.gstatic.com'],
    imgSrc: ["'self'", 'data:', 'blob:', 'https:'],
    connectSrc: [
      "'self'",
      'https://api.stripe.com',
      'https://js.stripe.com',
      'https://checkout.stripe.com',
      'https://infird.com',
      'https://musicdott.app',
      'https://musicdott.honig-it.com',
      'https://sync.musicdott.app',
      'https://flat.io',
      'https://*.flat.io',
      'wss://musicdott.app',
      'wss://musicdott.honig-it.com',
    ],
    frameSrc: ["'self'", 'blob:', 'data:', 'https://js.stripe.com', 'https://checkout.stripe.com', ...TRUSTED_EMBED_FRAME_SOURCES],
    mediaSrc: ["'self'", 'data:', 'blob:', 'https:'],
    workerSrc: ["'self'", 'blob:'],
    objectSrc: ["'none'"],
    upgradeInsecureRequests: [],
  };
}

function serializeCspDirectives(directives: Record<string, string[]>): string {
  return Object.entries(directives)
    .map(([key, values]) => `${key.replace(/[A-Z]/g, (match) => `-${match.toLowerCase()}`)} ${values.join(' ')}`)
    .join('; ');
}

function shouldSkipRateLimit(req: Request): boolean {
  return req.path === '/health' ||
    req.path === '/api/health' ||
    req.method === 'HEAD' ||
    req.path === '/api';
}

function createRateLimit(options: {
  windowMs: number;
  max: number;
  message: string;
  skipSuccessfulRequests?: boolean;
}) {
  return rateLimit({
    ...options,
    standardHeaders: true,
    legacyHeaders: false,
    skip: shouldSkipRateLimit,
  });
}

// Enhanced rate limiting middleware for different endpoints
// Note: skipSuccessfulRequests is intentionally NOT set — all attempts count toward the limit.
// This prevents an attacker with valid credentials from bypassing the rate limit.
export const authRateLimit = createRateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isDevelopment ? 100 : 5,
  message: 'Too many authentication attempts, please try again later.',
});

export const ownerAuthRateLimit = createRateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDevelopment ? 50 : 3,
  message: 'Too many administrator authentication attempts, please try again later.',
});

export const passwordChangeRateLimit = createRateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDevelopment ? 30 : 5,
  message: 'Too many password change attempts, please try again later.',
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
  res.setHeader('Content-Security-Policy', serializeCspDirectives(getContentSecurityPolicyDirectives()));
  next();
};

// Enhanced HTTPS redirect middleware
export const httpsRedirect = (req: Request, res: Response, next: NextFunction) => {
  if (process.env.NODE_ENV === 'production') {
    const host = req.header('host') || '';

    // Skip HTTPS redirect for localhost/local development
    const isLocalhost = host.startsWith('localhost') ||
                        host.startsWith('127.0.0.1') ||
                        host.startsWith('0.0.0.0');

    if (isLocalhost) {
      return next();
    }

    // Check various headers that proxies might use
    const isHttps = req.header('x-forwarded-proto') === 'https' ||
                   req.header('x-forwarded-ssl') === 'on' ||
                   req.header('x-url-scheme') === 'https' ||
                   req.secure;

    if (!isHttps) {
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
    // Coarse pre-check before multer runs. Keep a stricter default, but allow larger POS CSV imports.
    const contentLength = parseInt(req.headers['content-length'] || '0');
    const isPosCsvImport =
      req.path.startsWith('/api/pos-import/') || req.path === '/api/import/csv-convert';

    const maxContentLength = isPosCsvImport
      ? 60 * 1024 * 1024 // 60MB for large POS CSV exports (songs can contain embedded HTML/lyrics)
      : 10 * 1024 * 1024; // 10MB default

    if (contentLength > maxContentLength) {
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
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=(self)');
  
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

type SanitizeOptions = {
  allowTrustedEmbeds?: boolean;
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function sanitizeValue(value: unknown, options: SanitizeOptions): unknown {
  if (typeof value === 'string') {
    return sanitizeString(value, options);
  }

  if (Array.isArray(value)) {
    for (let index = 0; index < value.length; index += 1) {
      value[index] = sanitizeValue(value[index], options);
    }
    return value;
  }

  if (isPlainObject(value)) {
    for (const key of Object.keys(value)) {
      value[key] = sanitizeValue(value[key], options);
    }
  }

  return value;
}

function shouldSkipBodySanitization(req: Request): boolean {
  const target = req.originalUrl || req.url || req.path || '';
  if (CSRF_EXEMPT_PATH_SUFFIXES.some((suffix) => target.endsWith(suffix))) {
    return true;
  }

  return req.headers['content-type']?.includes('multipart/form-data') ?? false;
}

// Query/params sanitization can run before body parsers.
export const sanitizeRequestMetadata = (req: Request, _res: Response, next: NextFunction) => {
  if (req.query) {
    sanitizeValue(req.query, { allowTrustedEmbeds: false });
  }
  if (req.params) {
    sanitizeValue(req.params, { allowTrustedEmbeds: false });
  }
  next();
};

// Body sanitization must happen after JSON/urlencoded parsers so request payloads are available.
export const sanitizeRequestBody = (req: Request, _res: Response, next: NextFunction) => {
  if (req.body && !shouldSkipBodySanitization(req)) {
    sanitizeValue(req.body, { allowTrustedEmbeds: true });
  }
  next();
};

// Backwards-compatible alias for older imports.
export const sanitizeInput = sanitizeRequestMetadata;

function sanitizeIframeElement(iframeHtml: string): string {
  const srcMatch = iframeHtml.match(/\ssrc\s*=\s*["']([^"']+)["']/i);
  const src = srcMatch?.[1]?.trim();

  if (!src || !isTrustedEmbedUrl(src, { allowLocalDevelopment: !isProduction })) {
    return '';
  }

  return iframeHtml
    .replace(/\son\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/\s(src|href)\s*=\s*(["'])\s*(?:javascript|vbscript):.*?\2/gi, '');
}

// Enhanced string sanitization
function sanitizeString(str: string, options: SanitizeOptions): string {
  let sanitized = str
    // Remove script tags
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    // Remove javascript: and vbscript: protocols from quoted src/href attributes
    .replace(/\s(src|href)\s*=\s*(["'])\s*(?:javascript|vbscript):.*?\2/gi, '')
    // Remove inline event handlers
    .replace(/\son\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '');

  if (options.allowTrustedEmbeds) {
    sanitized = sanitized.replace(
      /<iframe\b[^>]*>[\s\S]*?<\/iframe>/gi,
      (match) => sanitizeIframeElement(match),
    );
  }

  return sanitized.substring(0, 10000);
}

function getCandidateRequestOrigin(req: Request): string | null {
  const origin = req.header('origin');
  if (origin) {
    return origin;
  }

  const referer = req.header('referer');
  if (!referer) {
    return null;
  }

  try {
    return new URL(referer).origin;
  } catch {
    return null;
  }
}

function getRequestOrigin(req: Request): string | null {
  const host = req.header('x-forwarded-host') || req.header('host');
  if (!host) {
    return null;
  }

  const protocolHeader = req.header('x-forwarded-proto');
  const protocol = protocolHeader ? protocolHeader.split(',')[0].trim() : req.protocol;
  return `${protocol}://${host}`;
}

function isTrustedLocalOrigin(origin: string): boolean {
  try {
    const parsed = new URL(origin);
    return /^(localhost|127\.0\.0\.1)$/i.test(parsed.hostname);
  } catch {
    return false;
  }
}

function isCsrfExemptRequest(req: Request): boolean {
  const target = req.originalUrl || req.url || req.path || '';
  return CSRF_EXEMPT_PATH_SUFFIXES.some((suffix) => target.endsWith(suffix));
}

function hasSessionContext(req: Request): boolean {
  const cookieHeader = req.header('cookie') || '';
  const hasSessionCookie = /(?:^|;\s*)(?:musicdott\.sid|md\.sid)=/.test(cookieHeader);
  const isAuthenticated = typeof (req as any).isAuthenticated === 'function' && (req as any).isAuthenticated();
  return hasSessionCookie || isAuthenticated;
}

export const verifySameOrigin = (req: Request, res: Response, next: NextFunction) => {
  if (!UNSAFE_HTTP_METHODS.has(req.method) || isCsrfExemptRequest(req) || !hasSessionContext(req)) {
    return next();
  }

  const candidateOrigin = getCandidateRequestOrigin(req);
  if (!candidateOrigin) {
    return res.status(403).json({ message: 'Missing trusted origin for state-changing request' });
  }

  const trustedOrigins = new Set(getAllowedAppOrigins());
  const requestOrigin = getRequestOrigin(req);

  if (candidateOrigin === requestOrigin || trustedOrigins.has(candidateOrigin)) {
    return next();
  }

  if (!isProduction && isTrustedLocalOrigin(candidateOrigin)) {
    return next();
  }

  return res.status(403).json({ message: 'Cross-site request blocked' });
};

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
