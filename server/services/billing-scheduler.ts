import { CronJob } from 'cron';
import { enhancedStripeService } from './enhanced-stripe-service';
import { BillingAuditService } from './billing-audit-service';

class BillingScheduler {
  private monthlyBillingJob: CronJob | null = null;
  private preBillingWarningJob: CronJob | null = null;

  constructor() {
    this.initializeScheduledJobs();
  }

  private initializeScheduledJobs() {
    try {
      // Monthly billing on 1st of each month at 2:00 AM UTC
      this.monthlyBillingJob = new CronJob(
        '0 2 1 * *', // Cron expression: minute=0, hour=2, day=1, month=*, dayOfWeek=*
        this.runMonthlyBilling.bind(this),
        null,
        false, // Don't start immediately
        'UTC'
      );

      // Pre-billing warnings on 28th of each month at 10:00 AM UTC
      this.preBillingWarningJob = new CronJob(
        '0 10 28 * *', // Cron expression: minute=0, hour=10, day=28, month=*, dayOfWeek=*
        this.runPreBillingWarnings.bind(this),
        null,
        false, // Don't start immediately
        'UTC'
      );

      // Start the jobs
      this.monthlyBillingJob.start();
      this.preBillingWarningJob.start();

      console.log('✅ Billing scheduler initialized with enhanced features:');
      console.log('   - Monthly billing: 1st of each month at 2:00 AM UTC');
      console.log('   - Pre-billing warnings: 28th of each month at 10:00 AM UTC');

    } catch (error) {
      console.error('❌ Failed to initialize billing scheduler:', error);
    }
  }

  private async runMonthlyBilling() {
    const startTime = Date.now();
    console.log('🔄 Starting scheduled monthly billing process...');

    try {
      // Log the start of monthly billing
      await BillingAuditService.logBillingEvent({
        eventType: 'monthly_billing_started',
        eventData: {
          scheduledRun: true,
          startTime: new Date().toISOString()
        },
        metadata: { automated: true }
      });

      // Run the enhanced billing process
      const result = await enhancedStripeService.processMonthlyBilling();
      const processingTime = Date.now() - startTime;

      // Log completion
      await BillingAuditService.logBillingEvent({
        eventType: 'monthly_billing_completed',
        eventData: {
          schoolsProcessed: result.schoolsProcessed,
          totalProcessed: result.totalProcessed,
          errors: result.errors.length,
          scheduledRun: true,
          completedAt: new Date().toISOString()
        },
        processingTime,
        metadata: { 
          automated: true,
          errorDetails: result.errors
        }
      });

      console.log(`✅ Scheduled monthly billing completed in ${processingTime}ms`);
      console.log(`   - Schools processed: ${result.schoolsProcessed}`);
      console.log(`   - Total amount: €${(result.totalProcessed / 100).toFixed(2)}`);
      console.log(`   - Errors: ${result.errors.length}`);

      // Create alert if there were errors
      if (result.errors.length > 0) {
        await BillingAuditService.createBillingAlert({
          alertType: 'monthly_billing_errors',
          severity: 'high',
          title: 'Monthly Billing Completed with Errors',
          message: `${result.errors.length} schools failed billing processing`,
          actionRequired: true,
          metadata: { 
            errors: result.errors,
            processingTime
          }
        });
      }

    } catch (error) {
      const processingTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('❌ Scheduled monthly billing failed:', error);

      // Log the failure
      await BillingAuditService.logBillingEvent({
        eventType: 'monthly_billing_failed',
        eventData: {
          scheduledRun: true,
          error: errorMessage,
          failedAt: new Date().toISOString()
        },
        errorMessage,
        processingTime,
        metadata: { automated: true }
      });

      // Create critical alert
      await BillingAuditService.createBillingAlert({
        alertType: 'monthly_billing_failure',
        severity: 'critical',
        title: 'Scheduled Monthly Billing Failed',
        message: `Automated billing process failed: ${errorMessage}`,
        actionRequired: true,
        metadata: { 
          error: errorMessage,
          processingTime,
          scheduledRun: true
        }
      });
    }
  }

  private async runPreBillingWarnings() {
    console.log('🔍 Starting scheduled pre-billing warning check...');

    try {
      // Log the start of warning check
      await BillingAuditService.logBillingEvent({
        eventType: 'pre_billing_warning_scheduled',
        eventData: {
          scheduledRun: true,
          startTime: new Date().toISOString()
        },
        metadata: { automated: true }
      });

      // Run the pre-billing warning check
      const warnings = await enhancedStripeService.checkPreBillingWarnings();

      console.log(`🔍 Pre-billing warning check completed: ${warnings.length} warnings generated`);

      // Log completion
      await BillingAuditService.logBillingEvent({
        eventType: 'pre_billing_warning_completed',
        eventData: {
          warningsGenerated: warnings.length,
          scheduledRun: true,
          completedAt: new Date().toISOString()
        },
        metadata: { 
          automated: true,
          warnings: warnings.slice(0, 5) // Store sample of warnings
        }
      });

      // Create summary alert if warnings were found
      if (warnings.length > 0) {
        const criticalWarnings = warnings.filter(w => w.type === 'auto_upgrade_warning').length;
        await BillingAuditService.createBillingAlert({
          alertType: 'pre_billing_warning_summary',
          severity: criticalWarnings > 0 ? 'medium' : 'low',
          title: 'Pre-billing Warning Check Completed',
          message: `${warnings.length} warnings generated for upcoming billing cycle`,
          actionRequired: criticalWarnings > 0,
          metadata: { 
            totalWarnings: warnings.length,
            criticalWarnings,
            scheduledFor: '28th of month'
          }
        });
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('❌ Pre-billing warning check failed:', error);

      await BillingAuditService.createBillingAlert({
        alertType: 'pre_billing_warning_failure',
        severity: 'medium',
        title: 'Pre-billing Warning Check Failed',
        message: `Scheduled warning check failed: ${errorMessage}`,
        actionRequired: false,
        metadata: { 
          error: errorMessage,
          scheduledRun: true
        }
      });
    }
  }

  // Manual trigger for testing
  async triggerMonthlyBilling(): Promise<any> {
    console.log('🔧 Manual trigger for monthly billing...');
    return await this.runMonthlyBilling();
  }

  async triggerPreBillingWarnings(): Promise<any> {
    console.log('🔧 Manual trigger for pre-billing warnings...');
    return await this.runPreBillingWarnings();
  }

  // Get next scheduled run times
  getScheduleInfo() {
    return {
      monthlyBilling: {
        nextRun: this.monthlyBillingJob?.nextDate()?.toISO() || null,
        schedule: '1st of each month at 2:00 AM UTC',
        active: this.monthlyBillingJob ? true : false
      },
      preBillingWarnings: {
        nextRun: this.preBillingWarningJob?.nextDate()?.toISO() || null,
        schedule: '28th of each month at 10:00 AM UTC',
        active: this.preBillingWarningJob ? true : false
      }
    };
  }

  // Stop the scheduler
  stop() {
    if (this.monthlyBillingJob) {
      this.monthlyBillingJob.stop();
    }
    if (this.preBillingWarningJob) {
      this.preBillingWarningJob.stop();
    }
    console.log('🛑 Billing scheduler stopped');
  }
}

export const billingScheduler = new BillingScheduler();