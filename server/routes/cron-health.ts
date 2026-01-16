import type { Express, Request, Response, NextFunction } from "express";
import { cronHealthMonitor } from "../services/cron-health-monitor";

// Auth middleware - will be injected from setupAuth
let requireAdmin: (req: Request, res: Response, next: NextFunction) => void;

export function registerCronHealthRoutes(app: Express, authMiddleware?: any) {
  // If auth middleware is provided, use it for admin routes
  if (authMiddleware) {
    requireAdmin = authMiddleware.requireAdmin;
  }

  // Public health check for cron jobs (minimal info) - NO AUTH
  app.get("/health/cron", async (req, res) => {
    try {
      const summary = await cronHealthMonitor.getHealthSummary();
      
      // Public endpoint - only show basic status
      res.json({
        success: true,
        timestamp: new Date().toISOString(),
        stats: {
          totalJobs: summary.totalJobs,
          activeJobs: summary.activeJobs,
          healthyJobs: summary.healthyJobs,
          failingJobs: summary.failingJobs,
        },
        jobs: summary.jobs.map(job => ({
          name: job.jobName,
          status: job.lastRunStatus,
          nextRun: job.nextScheduledRun,
          lastRun: job.lastRunAt,
        })),
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      res.status(500).json({
        success: false,
        error: errorMessage,
      });
    }
  });

  // Get comprehensive health summary of all cron jobs (admin only)
  const adminHealthHandler = async (req: Request, res: Response) => {
    try {
      const summary = await cronHealthMonitor.getHealthSummary();
      
      res.json({
        success: true,
        timestamp: new Date().toISOString(),
        summary,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      res.status(500).json({
        success: false,
        error: errorMessage,
      });
    }
  };

  // Register with auth middleware if available
  if (requireAdmin) {
    app.get("/api/admin/cron-health", requireAdmin, adminHealthHandler);
  } else {
    app.get("/api/admin/cron-health", adminHealthHandler);
  }

  // Get health for a specific job
  const specificJobHandler = async (req: Request, res: Response) => {
    try {
      const { jobName } = req.params;
      const jobHealth = await cronHealthMonitor.getJobHealth(jobName);
      
      if (!jobHealth) {
        return res.status(404).json({
          success: false,
          error: `Job '${jobName}' not found`,
        });
      }

      res.json({
        success: true,
        job: jobHealth,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      res.status(500).json({
        success: false,
        error: errorMessage,
      });
    }
  };

  // Register with auth middleware if available
  if (requireAdmin) {
    app.get("/api/admin/cron-health/:jobName", requireAdmin, specificJobHandler);
  } else {
    app.get("/api/admin/cron-health/:jobName", specificJobHandler);
  }
}
