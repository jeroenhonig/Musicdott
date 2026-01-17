import express, { type Request, Response, NextFunction } from "express";
import { createServer } from "http";
import { registerRoutes } from "./routes";
import { setupDatabase } from "./setup-db";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { billingScheduler } from "./services/billing-scheduler";
import { birthdayScheduler } from "./services/birthday-scheduler";
import { securityHeaders, httpsRedirect, sanitizeInput, apiRateLimit, validateEnvironment, fileUploadSecurity } from "./middleware/security";
import { errorHandler, notFoundHandler } from "./middleware/error-handler";
import { logger } from "./utils/logger";
import { RealtimeBus } from "./services/realtime-bus";
import { NotationCollaborationService } from "./services/notation-collaboration";
import { storage } from "./storage-wrapper";
import helmet from "helmet";
import cors from "cors";

const app = express();

// Security middleware - CSP enabled for production, disabled for development
app.use(helmet({
  contentSecurityPolicy: process.env.NODE_ENV === 'production' ? {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://js.stripe.com", "https://checkout.stripe.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "blob:", "https:"],
      connectSrc: ["'self'", "https://api.stripe.com"],
      frameSrc: ["'self'", "https://js.stripe.com", "https://checkout.stripe.com"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: []
    }
  } : false // Disable CSP in development for easier debugging
}));

app.use(cors({
  origin: process.env.NODE_ENV === 'production' ? ['https://musicdott.app'] : true,
  credentials: true
}));

// Apply security middleware in proper order
app.use(validateEnvironment);
app.use(httpsRedirect);
app.use(securityHeaders);
app.use(apiRateLimit);
app.use(sanitizeInput);
app.use(fileUploadSecurity);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false, limit: '10mb' }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      logger.info(logLine);
    }
  });

  next();
});

(async () => {
  // Setup database with migrations, admin bootstrap, and seeding
  try {
    const dbResult = await setupDatabase();
    if (dbResult.success) {
      logger.info('✅ Database setup completed successfully');
      logger.info('📊 Database status:', dbResult.status);

      // Initialize automated billing scheduler
      try {
        logger.info('Initializing automated monthly billing scheduler...');
        // The billing scheduler starts automatically when imported
        logger.info('✅ Billing scheduler initialized successfully');
      } catch (billingError) {
        logger.error('❌ Billing scheduler initialization error', billingError instanceof Error ? billingError.message : String(billingError));
      }
    } else {
      logger.error('❌ Database setup failed:', dbResult.message);
      logger.warn('⚠️  Server will attempt to continue with limited functionality');
      // Continue anyway, as the server will fall back to file-based storage
    }
  } catch (error) {
    logger.error('❌ Database setup error', error instanceof Error ? error.message : String(error));
    logger.warn('⚠️  Server will attempt to continue with limited functionality');
    // Continue anyway, as the server will fall back to file-based storage
  }

  // Initialize storage after database verification has completed
  try {
    logger.info('Initializing storage after database verification...');
    await storage.initializeStorage();
    logger.info('Storage initialization completed successfully');
  } catch (storageError) {
    logger.error('Storage initialization error', storageError instanceof Error ? storageError.message : String(storageError));
  }
  
  const httpServer = createServer(app);
  
  // Initialize RealtimeBus with storage (session middleware will be applied via setupAuth)
  const realtimeBus = new RealtimeBus(httpServer, storage);
  console.log("✅ RealtimeBus initialized successfully");
  
  // Connect RealtimeBus to StorageWrapper for event broadcasting
  storage.setRealtimeBus(realtimeBus);
  
  // Make RealtimeBus globally available for routes
  (app as any).realtimeBus = realtimeBus;
  
  // Initialize collaborative notation service with RealtimeBus
  const notationService = new NotationCollaborationService(realtimeBus);
  console.log("✅ Collaborative notation service initialized");
  
  // Register routes (auth setup and cron health routes will happen inside)
  const server = await registerRoutes(app);

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    const { setupVite } = await import("./vite.js");
    await setupVite(app, server);
  } else {
    // Serve static files in production (inline to avoid loading vite module)
    // @ts-ignore - __dirname is available in CJS (bundled)
    const currentDir = typeof __dirname !== 'undefined' ? __dirname : path.dirname(fileURLToPath(import.meta.url));
    const distPath = path.resolve(currentDir, "public");

    if (!fs.existsSync(distPath)) {
      throw new Error(
        `Could not find the build directory: ${distPath}, make sure to build the client first`,
      );
    }

    app.use(express.static(distPath));

    // fall through to index.html if the file doesn't exist
    app.use("*", (_req, res) => {
      res.sendFile(path.resolve(distPath, "index.html"));
    });
  }

  // Error handling middleware - must be after all routes
  app.use(notFoundHandler);
  app.use(errorHandler);

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = 5000;
  httpServer.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    logger.info(`serving on port ${port}`);
    logger.info(`🚀 MusicDott 2.0 production server started on port ${port}`);
    logger.info(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
    logger.info(`💾 Database: ${process.env.DATABASE_URL ? 'PostgreSQL' : 'Memory fallback'}`);
  });

  // Graceful shutdown handling for production deployment
  const gracefulShutdown = async (signal: string) => {
    logger.info(`🛑 Received ${signal}, starting graceful shutdown...`);
    
    try {
      // Stop accepting new connections
      httpServer.close(() => {
        logger.info('✅ HTTP server closed');
      });
      
      // Stop billing scheduler
      billingScheduler.stop();
      logger.info('✅ Billing scheduler stopped');
      
      // Stop birthday scheduler
      birthdayScheduler.stop();
      logger.info('✅ Birthday scheduler stopped');
      
      // Close RealtimeBus connections
      realtimeBus.close();
      logger.info('✅ RealtimeBus connections closed');
      
      // Give time for existing requests to complete
      setTimeout(() => {
        logger.info('✅ Graceful shutdown completed');
        process.exit(0);
      }, 5000);
      
    } catch (error) {
      logger.error('❌ Error during graceful shutdown:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  };
  
  // Register shutdown handlers
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  
  // Handle uncaught exceptions in production
  process.on('uncaughtException', (error) => {
    logger.error('🔥 Uncaught Exception:', error.message);
    gracefulShutdown('uncaughtException');
  });
  
  process.on('unhandledRejection', (reason) => {
    logger.error('🔥 Unhandled Rejection:', reason instanceof Error ? reason.message : String(reason));
    gracefulShutdown('unhandledRejection');
  });
})();
