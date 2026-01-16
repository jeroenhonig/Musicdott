import { db } from "../db";
import { cronJobHealth, type CronJobHealth } from "@shared/schema";
import { eq } from "drizzle-orm";

interface JobExecutionStart {
  jobName: string;
  cronSchedule: string;
  nextScheduledRun?: Date;
}

interface JobExecutionResult {
  jobName: string;
  status: 'success' | 'failed';
  duration: number;
  result?: any;
  error?: string;
}

class CronHealthMonitor {
  async registerJob(jobName: string, cronSchedule: string): Promise<void> {
    try {
      const existing = await db
        .select()
        .from(cronJobHealth)
        .where(eq(cronJobHealth.jobName, jobName))
        .limit(1);

      if (existing.length === 0) {
        await db.insert(cronJobHealth).values({
          jobName,
          cronSchedule,
          isActive: true,
          successCount: 0,
          failureCount: 0,
        });
        console.log(`✅ Registered cron job for monitoring: ${jobName}`);
      }
    } catch (error) {
      console.error(`❌ Failed to register job ${jobName}:`, error);
    }
  }

  async recordJobStart(params: JobExecutionStart): Promise<void> {
    const { jobName, cronSchedule, nextScheduledRun } = params;
    
    try {
      await db
        .update(cronJobHealth)
        .set({
          lastRunAt: new Date(),
          lastRunStatus: 'running',
          nextScheduledRun: nextScheduledRun || null,
          cronSchedule,
          updatedAt: new Date(),
        })
        .where(eq(cronJobHealth.jobName, jobName));
    } catch (error) {
      console.error(`❌ Failed to record job start for ${jobName}:`, error);
    }
  }

  async recordJobCompletion(params: JobExecutionResult): Promise<void> {
    const { jobName, status, duration, result, error } = params;
    
    try {
      const [job] = await db
        .select()
        .from(cronJobHealth)
        .where(eq(cronJobHealth.jobName, jobName))
        .limit(1);

      if (!job) {
        console.error(`❌ Job ${jobName} not found in health monitoring`);
        return;
      }

      const newSuccessCount = status === 'success' ? (job.successCount || 0) + 1 : job.successCount || 0;
      const newFailureCount = status === 'failed' ? (job.failureCount || 0) + 1 : job.failureCount || 0;

      await db
        .update(cronJobHealth)
        .set({
          lastRunStatus: status,
          lastRunDuration: duration,
          lastRunResult: result ? JSON.parse(JSON.stringify(result)) : null,
          lastError: error || null,
          successCount: newSuccessCount,
          failureCount: newFailureCount,
          updatedAt: new Date(),
        })
        .where(eq(cronJobHealth.jobName, jobName));

      const statusEmoji = status === 'success' ? '✅' : '❌';
      console.log(`${statusEmoji} Cron job health updated: ${jobName} (${status} in ${duration}ms)`);
    } catch (error) {
      console.error(`❌ Failed to record job completion for ${jobName}:`, error);
    }
  }

  async getJobHealth(jobName: string): Promise<CronJobHealth | null> {
    try {
      const [job] = await db
        .select()
        .from(cronJobHealth)
        .where(eq(cronJobHealth.jobName, jobName))
        .limit(1);

      return job || null;
    } catch (error) {
      console.error(`❌ Failed to get job health for ${jobName}:`, error);
      return null;
    }
  }

  async getAllJobsHealth(): Promise<CronJobHealth[]> {
    try {
      return await db
        .select()
        .from(cronJobHealth)
        .orderBy(cronJobHealth.jobName);
    } catch (error) {
      console.error('❌ Failed to get all jobs health:', error);
      return [];
    }
  }

  async getHealthSummary(): Promise<{
    totalJobs: number;
    activeJobs: number;
    healthyJobs: number;
    failingJobs: number;
    jobs: CronJobHealth[];
  }> {
    try {
      const jobs = await this.getAllJobsHealth();
      
      const activeJobs = jobs.filter(j => j.isActive).length;
      
      // Base health on LAST RUN STATUS, not cumulative failure count
      // A job is healthy if its most recent run succeeded
      const healthyJobs = jobs.filter(j => 
        j.lastRunStatus === 'success'
      ).length;
      
      // A job is failing only if its most recent run failed
      const failingJobs = jobs.filter(j => 
        j.lastRunStatus === 'failed'
      ).length;

      return {
        totalJobs: jobs.length,
        activeJobs,
        healthyJobs,
        failingJobs,
        jobs,
      };
    } catch (error) {
      console.error('❌ Failed to get health summary:', error);
      return {
        totalJobs: 0,
        activeJobs: 0,
        healthyJobs: 0,
        failingJobs: 0,
        jobs: [],
      };
    }
  }

  async deactivateJob(jobName: string): Promise<void> {
    try {
      await db
        .update(cronJobHealth)
        .set({
          isActive: false,
          updatedAt: new Date(),
        })
        .where(eq(cronJobHealth.jobName, jobName));

      console.log(`🛑 Deactivated cron job: ${jobName}`);
    } catch (error) {
      console.error(`❌ Failed to deactivate job ${jobName}:`, error);
    }
  }
}

export const cronHealthMonitor = new CronHealthMonitor();
