import { CronJob } from 'cron';
import { notificationService } from './notification-service';
import { cronHealthMonitor } from './cron-health-monitor';

class BirthdayScheduler {
  private birthdayCheckJob: CronJob | null = null;
  private readonly JOB_NAME = 'birthday_check';
  private readonly CRON_SCHEDULE = '0 9 * * *';

  constructor() {
    // Initialize asynchronously without blocking
    this.initializeScheduledJobs();
  }

  private initializeScheduledJobs() {
    try {
      // Register job with health monitor (non-blocking)
      cronHealthMonitor.registerJob(this.JOB_NAME, this.CRON_SCHEDULE).catch(err => {
        console.error('Failed to register birthday job with health monitor:', err);
      });

      // Check for birthdays every day at 9:00 AM UTC
      this.birthdayCheckJob = new CronJob(
        this.CRON_SCHEDULE, // Cron expression: minute=0, hour=9, day=*, month=*, dayOfWeek=*
        this.runBirthdayCheck.bind(this),
        null,
        false, // Don't start immediately
        'UTC'
      );

      // Start the job
      this.birthdayCheckJob.start();

      console.log('✅ Birthday scheduler initialized:');
      console.log('   - Daily birthday check: Every day at 9:00 AM UTC');

    } catch (error) {
      console.error('❌ Failed to initialize birthday scheduler:', error);
    }
  }

  private async runBirthdayCheck() {
    const startTime = Date.now();
    console.log('🎂 Starting scheduled birthday check...');

    try {
      // Record job start in health monitor
      await cronHealthMonitor.recordJobStart({
        jobName: this.JOB_NAME,
        cronSchedule: this.CRON_SCHEDULE,
        nextScheduledRun: this.birthdayCheckJob?.nextDate()?.toJSDate(),
      });

      const notificationsCreated = await notificationService.createBirthdayNotifications();
      const processingTime = Date.now() - startTime;

      console.log(`✅ Birthday check completed in ${processingTime}ms`);
      console.log(`   - Birthday notifications created: ${notificationsCreated}`);

      // Record successful completion
      await cronHealthMonitor.recordJobCompletion({
        jobName: this.JOB_NAME,
        status: 'success',
        duration: processingTime,
        result: { notificationsCreated },
      });

    } catch (error) {
      const processingTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('❌ Birthday check failed:', error);
      console.error(`   - Processing time: ${processingTime}ms`);
      console.error(`   - Error: ${errorMessage}`);

      // Record failure in health monitor
      await cronHealthMonitor.recordJobCompletion({
        jobName: this.JOB_NAME,
        status: 'failed',
        duration: processingTime,
        error: errorMessage,
      });
    }
  }

  /**
   * Manually trigger birthday check (for testing or immediate execution)
   */
  public async runImmediately(): Promise<number> {
    console.log('🎂 Manual birthday check triggered...');
    return await notificationService.createBirthdayNotifications();
  }

  /**
   * Stop the scheduler
   */
  public stop(): void {
    if (this.birthdayCheckJob) {
      this.birthdayCheckJob.stop();
      console.log('Birthday scheduler stopped');
    }
  }

  /**
   * Get scheduler status
   */
  public getStatus(): { running: boolean; nextRun: Date | null } {
    if (!this.birthdayCheckJob) {
      return { running: false, nextRun: null };
    }

    return {
      running: this.birthdayCheckJob.running,
      nextRun: this.birthdayCheckJob.nextDate().toJSDate(),
    };
  }
}

// Export singleton instance
export const birthdayScheduler = new BirthdayScheduler();
