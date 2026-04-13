import * as Sentry from "@sentry/node";

if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV ?? "development",
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
  });
}

import cors from "cors";
import express, { type Request, type Response, type NextFunction } from "express";
import fs from "fs";
import helmet from "helmet";
import { createServer, type Server } from "http";
import path from "path";
import { fileURLToPath } from "url";
import { errorHandler, notFoundHandler } from "./middleware/error-handler";
import {
  apiRateLimit,
  fileUploadSecurity,
  getAllowedAppOrigins,
  getContentSecurityPolicyDirectives,
  httpsRedirect,
  sanitizeRequestBody,
  sanitizeRequestMetadata,
  securityHeaders,
  validateEnvironment,
} from "./middleware/security";
import { logger } from "./utils/logger";
import type { StorageMode } from "./storage-wrapper";

type BootstrapMode = "development" | "production" | "test";

interface InitializeAppOptions {
  mode?: BootstrapMode;
  storageMode?: StorageMode;
  allowDegradedStorage?: boolean;
  enableRealtime?: boolean;
  enableFrontend?: boolean;
  enableSchedulers?: boolean;
  setupDatabase?: boolean;
  minimalRoutes?: boolean;
}

export const app = express();

let middlewareConfigured = false;
let errorMiddlewareConfigured = false;
let initializePromise: Promise<Server> | null = null;
let httpServer: Server | null = null;
let realtimeBus: any = null;
let shutdownHandlersRegistered = false;
let billingSchedulerRef: { stop(): void } | null = null;
let birthdaySchedulerRef: { stop(): void } | null = null;
let lessonReminderSchedulerRef: { stop(): void } | null = null;

function getBootstrapMode(mode?: BootstrapMode): BootstrapMode {
  if (mode) {
    return mode;
  }

  if (process.env.NODE_ENV === "test") {
    return "test";
  }

  if (process.env.NODE_ENV === "production") {
    return "production";
  }

  return "development";
}

function getCurrentDir(): string {
  // @ts-ignore - __dirname is available in CJS (bundled), import.meta.url in ESM
  return typeof __dirname !== "undefined"
    ? __dirname
    : path.dirname(fileURLToPath(import.meta.url));
}

function readStorageModeOverride(): StorageMode | undefined {
  const value = process.env.MUSICDOTT_STORAGE_MODE;
  if (value === "auto" || value === "database" || value === "memory") {
    return value;
  }

  return undefined;
}

function getRequestedStorageMode(mode: BootstrapMode, requestedMode?: StorageMode): StorageMode {
  if (requestedMode) {
    return requestedMode;
  }

  const envMode = readStorageModeOverride();
  if (envMode) {
    return envMode;
  }

  return mode === "test" ? "memory" : "auto";
}

function shouldAllowDegradedStorage(mode: BootstrapMode, storageMode: StorageMode, explicit?: boolean): boolean {
  if (typeof explicit === "boolean") {
    return explicit;
  }

  if (storageMode === "memory") {
    return true;
  }

  if (process.env.MUSICDOTT_ENABLE_DEGRADED_STORAGE === "1") {
    return true;
  }

  return mode !== "production";
}

function configureBaseMiddleware() {
  if (middlewareConfigured) {
    return;
  }

  middlewareConfigured = true;

  app.use(helmet({
    contentSecurityPolicy: process.env.NODE_ENV === "production" ? {
      directives: getContentSecurityPolicyDirectives(),
    } : false,
  }));

  const devOrigins = [
    "http://localhost:5000",
    "http://localhost:5001",
    "http://localhost:5173",
    "http://localhost:3000",
    "http://127.0.0.1:5000",
    "http://127.0.0.1:5173",
  ];
  app.use(cors({
    origin: process.env.NODE_ENV === "production"
      ? getAllowedAppOrigins()
      : devOrigins,
    credentials: true,
  }));

  app.use(validateEnvironment);
  app.use(httpsRedirect);
  app.use(securityHeaders);
  app.use(apiRateLimit);
  app.use(sanitizeRequestMetadata);
  app.use(fileUploadSecurity);

  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: false, limit: "10mb" }));
  app.use(sanitizeRequestBody);

  app.use((req: Request, res: Response, next: NextFunction) => {
    const start = Date.now();
    const requestPath = req.path;
    let capturedJsonResponse: Record<string, any> | undefined;

    const originalResJson = res.json;
    res.json = function (bodyJson, ...args) {
      capturedJsonResponse = bodyJson;
      return originalResJson.apply(res, [bodyJson, ...args]);
    };

    res.on("finish", () => {
      const duration = Date.now() - start;
      if (!requestPath.startsWith("/api")) {
        return;
      }

      let logLine = `${req.method} ${requestPath} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = `${logLine.slice(0, 79)}…`;
      }

      logger.info(logLine);
    });

    next();
  });
}

async function runDatabaseSetup() {
  try {
    const { setupDatabase } = await import("./setup-db");
    const dbResult = await setupDatabase({
      migrate: true,
      seedAdminAndSchool: false,
      seedAchievements: false,
      seedTestData: false,
    });

    if (dbResult.success) {
      logger.info("✅ Database migrations completed successfully");
      logger.info("📊 Database status", dbResult.status);
      return;
    }

    logger.error("❌ Database migration step failed", dbResult.message);
    logger.warn("⚠️ Server will attempt to continue with limited functionality");
  } catch (error) {
    logger.error("❌ Database migration error", error instanceof Error ? error.message : String(error));
    logger.warn("⚠️ Server will attempt to continue with limited functionality");
  }
}

async function initializeRealtime(server: Server) {
  if (realtimeBus) {
    return;
  }

  const [{ RealtimeBus }, { NotationCollaborationService }, { storage }] = await Promise.all([
    import("./services/realtime-bus"),
    import("./services/notation-collaboration"),
    import("./storage-wrapper"),
  ]);

  realtimeBus = new RealtimeBus(server, storage);
  storage.setRealtimeBus(realtimeBus);
  (app as any).realtimeBus = realtimeBus;
  new NotationCollaborationService(realtimeBus);

  // Wire in the lesson display service (second-screen feature)
  const { LessonDisplayService } = await import("./services/lesson-display-service");
  const lessonDisplayService = new LessonDisplayService(realtimeBus.getIO());
  realtimeBus.setLessonDisplayService(lessonDisplayService);
  (app as any).lessonDisplayService = lessonDisplayService;

  console.log("✅ RealtimeBus initialized successfully");
  console.log("✅ Collaborative notation service initialized");
  console.log("✅ Lesson display service initialized");
}

async function setupFrontend(mode: BootstrapMode, server: Server) {
  if (mode === "test") {
    return;
  }

  if (mode === "development") {
    const { setupVite } = await import("./vite.js");
    await setupVite(app, server);
    return;
  }

  const currentDir = getCurrentDir();
  const distPath = path.resolve(currentDir, "public");

  if (!fs.existsSync(distPath)) {
    throw new Error(`Could not find the build directory: ${distPath}, make sure to build the client first`);
  }

  app.use(express.static(distPath));
  app.use("*", (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}

function configureErrorMiddleware() {
  if (errorMiddlewareConfigured) {
    return;
  }

  errorMiddlewareConfigured = true;
  app.use(notFoundHandler);
  app.use(errorHandler);
}

async function initializeSchedulers() {
  if (billingSchedulerRef && birthdaySchedulerRef) {
    return;
  }

  const [{ billingScheduler }, { birthdayScheduler }, { lessonReminderScheduler }] = await Promise.all([
    import("./services/billing-scheduler"),
    import("./services/birthday-scheduler"),
    import("./services/lesson-reminder-scheduler"),
  ]);

  billingSchedulerRef = billingScheduler;
  birthdaySchedulerRef = birthdayScheduler;
  lessonReminderSchedulerRef = lessonReminderScheduler;

  logger.info("✅ Billing scheduler initialized successfully");
  logger.info("✅ Birthday scheduler initialized successfully");
  logger.info("✅ Lesson reminder scheduler initialized successfully");

  // AVG Art. 5(1)(e): run data retention cleanup daily at 03:00 UTC
  const { runDataRetentionCleanup } = await import("./services/data-retention");
  const { CronJob } = await import("cron");
  new CronJob("0 3 * * *", async () => {
    try {
      const result = await runDataRetentionCleanup();
      if (result.anonymized > 0) {
        logger.info(`[data-retention] Anonymized ${result.anonymized} inactive account(s)`);
      }
    } catch (err) {
      logger.error("[data-retention] Cleanup failed:", err);
    }
  }, null, true, "UTC");
}

export async function initializeApp(options: InitializeAppOptions = {}): Promise<Server> {
  const mode = getBootstrapMode(options.mode);

  if (!initializePromise) {
    initializePromise = (async () => {
      configureBaseMiddleware();

      const shouldBootstrapDatabase =
        options.setupDatabase ?? process.env.MUSICDOTT_RUN_DB_SETUP === "1";

      if (shouldBootstrapDatabase) {
        await runDatabaseSetup();
      }

      const storageMode = getRequestedStorageMode(mode, options.storageMode);
      const allowDegradedStorage = shouldAllowDegradedStorage(
        mode,
        storageMode,
        options.allowDegradedStorage,
      );
      const enableRealtime = options.enableRealtime ?? mode !== "test";
      const enableFrontend = options.enableFrontend ?? mode !== "test";
      const enableSchedulers = options.enableSchedulers ?? mode !== "test";
      const minimalRoutes = options.minimalRoutes ?? false;
      const [{ storage }, { registerRoutes }] = await Promise.all([
        import("./storage-wrapper"),
        import("./routes"),
      ]);

      await storage.initializeStorage({
        mode: storageMode,
        allowDegradedStorage,
      });
      app.locals.storageRuntime = storage.getRuntimeState();

      httpServer ??= createServer(app);

      if (enableRealtime) {
        await initializeRealtime(httpServer);
      }

      await registerRoutes(app, httpServer, { minimal: minimalRoutes });

      if (enableFrontend) {
        await setupFrontend(mode, httpServer);
      }

      configureErrorMiddleware();

      if (enableSchedulers) {
        await initializeSchedulers();
      }

      return httpServer;
    })().catch((error) => {
      initializePromise = null;
      throw error;
    });
  }

  return initializePromise;
}

function registerShutdownHandlers(server: Server) {
  if (shutdownHandlersRegistered) {
    return;
  }

  shutdownHandlersRegistered = true;

  const gracefulShutdown = async (signal: string) => {
    logger.info(`🛑 Received ${signal}, starting graceful shutdown...`);

    try {
      if (server.listening) {
        await new Promise<void>((resolve, reject) => {
          server.close((error) => {
            if (error) {
              reject(error);
              return;
            }

            logger.info("✅ HTTP server closed");
            resolve();
          });
        });
      }

      billingSchedulerRef?.stop();
      logger.info("✅ Billing scheduler stopped");

      birthdaySchedulerRef?.stop();
      logger.info("✅ Birthday scheduler stopped");

      realtimeBus?.close();
      logger.info("✅ RealtimeBus connections closed");

      setTimeout(() => {
        logger.info("✅ Graceful shutdown completed");
        process.exit(0);
      }, 5000);
    } catch (error) {
      logger.error("❌ Error during graceful shutdown:", error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  };

  process.on("SIGTERM", () => void gracefulShutdown("SIGTERM"));
  process.on("SIGINT", () => void gracefulShutdown("SIGINT"));
  process.on("uncaughtException", (error) => {
    logger.error("🔥 Uncaught Exception:", error.message);
    void gracefulShutdown("uncaughtException");
  });
  process.on("unhandledRejection", (reason) => {
    logger.error("🔥 Unhandled Rejection:", reason instanceof Error ? reason.message : String(reason));
    void gracefulShutdown("unhandledRejection");
  });
}

export async function startServer(): Promise<Server> {
  const server = await initializeApp();

  if (server.listening) {
    return server;
  }

  registerShutdownHandlers(server);

  await new Promise<void>((resolve, reject) => {
    const port = parseInt(process.env.PORT || "5000", 10);
    server.listen({
      port: parseInt(process.env.PORT || "5000"),
      host: "127.0.0.1",
    }, (error?: Error) => {
      if (error) {
        reject(error);
        return;
      }

      const storageRuntime = app.locals.storageRuntime;
      logger.info(`serving on port ${process.env.PORT || "5000"}`);
      logger.info("🚀 MusicDott 2.0 production server started on port 5000");
      logger.info(`📍 Environment: ${process.env.NODE_ENV || "development"}`);
      logger.info(
        `💾 Storage: ${storageRuntime?.resolvedMode || "unknown"} ` +
        `(requested=${storageRuntime?.requestedMode || "unknown"}, session=${storageRuntime?.sessionBackend || "unknown"})`,
      );
      resolve();
    });
  });

  return server;
}

if (process.env.NODE_ENV !== "test" && process.env.MUSICDOTT_SKIP_SERVER_START !== "1") {
  void startServer().catch((error) => {
    logger.error("❌ Server startup failed", error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}
