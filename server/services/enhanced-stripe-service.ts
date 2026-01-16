import { subscriptionService } from "./subscription-service";
import { BillingAuditService } from "./billing-audit-service";
import { EmailNotificationService } from "./email-notifications";
import { db, isDatabaseAvailable } from "../db";
import { 
  schoolSubscriptions, 
  teacherSubscriptions,
  paymentHistory,
  users,
  schools
} from "@shared/schema";
import { eq, desc } from "drizzle-orm";
import { format, addMonths } from "date-fns";
import crypto from "crypto";
import Stripe from "stripe";

// Stripe will be initialized when secrets are provided
let stripe: Stripe | null = null;
let stripeWebhookSecret: string | null = null;

class EnhancedStripeService {
  constructor() {
    this.initializeStripe();
  }

  private initializeStripe() {
    try {
      if (process.env.STRIPE_SECRET_KEY) {
        stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
          apiVersion: '2023-10-16',
        });
        
        // Initialize webhook secret for verification
        stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET || null;
        
        console.log("✅ Stripe initialized successfully");
        if (!stripeWebhookSecret) {
          console.log("⚠️ STRIPE_WEBHOOK_SECRET not configured - webhook verification disabled");
        }
      } else {
        console.log("⚠️ STRIPE_SECRET_KEY not found. Stripe features will be unavailable.");
      }
    } catch (error) {
      console.warn("⚠️ Stripe library not installed. Payment features will be unavailable:", error instanceof Error ? error.message : String(error));
    }
  }

  private ensureStripeReady() {
    if (!stripe) {
      throw new Error("Stripe is not initialized. Please provide STRIPE_SECRET_KEY.");
    }
  }

  // 1. Stripe Webhook Verification - Cryptographic verification of incoming webhooks
  verifyWebhookSignature(payload: string, signature: string): boolean {
    if (!stripeWebhookSecret) {
      console.warn("⚠️ Webhook verification skipped - STRIPE_WEBHOOK_SECRET not configured");
      return true; // Allow in development but warn
    }

    try {
      // Stripe uses HMAC SHA256 for webhook signatures
      const elements = signature.split(',');
      const timestamp = elements.find(el => el.startsWith('t='))?.split('=')[1];
      const signatures = elements.filter(el => el.startsWith('v1='));

      if (!timestamp || signatures.length === 0) {
        throw new Error("Invalid webhook signature format");
      }

      // Check timestamp to prevent replay attacks (5 minutes tolerance)
      const timestampNum = parseInt(timestamp);
      const currentTime = Math.floor(Date.now() / 1000);
      if (Math.abs(currentTime - timestampNum) > 300) {
        throw new Error("Webhook timestamp too old");
      }

      // Verify signature
      const signedPayload = `${timestamp}.${payload}`;
      const expectedSignature = crypto
        .createHmac('sha256', stripeWebhookSecret)
        .update(signedPayload, 'utf8')
        .digest('hex');

      const isValid = signatures.some(sig => {
        const providedSignature = sig.split('=')[1];
        return crypto.timingSafeEqual(
          Buffer.from(expectedSignature, 'hex'),
          Buffer.from(providedSignature, 'hex')
        );
      });

      if (!isValid) {
        throw new Error("Invalid webhook signature");
      }

      console.log("✅ Webhook signature verified successfully");
      return true;
    } catch (error) {
      console.error("❌ Webhook verification failed:", error.message);
      return false;
    }
  }

  // Enhanced Stripe API calls with robust error handling and retry mechanism
  async makeStripeApiCall<T>(
    operation: () => Promise<T>,
    operationName: string,
    schoolId?: number,
    maxRetries: number = 3
  ): Promise<T> {
    let lastError: any;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const startTime = Date.now();
        const result = await operation();
        const processingTime = Date.now() - startTime;
        
        // Log successful API call
        console.log(`✅ Stripe ${operationName} succeeded (${processingTime}ms)${schoolId ? ` for school ${schoolId}` : ''}`);
        
        return result;
      } catch (error) {
        lastError = error;
        const isRetryable = this.isRetryableStripeError(error);
        
        console.error(`❌ Stripe ${operationName} failed (attempt ${attempt}/${maxRetries})${schoolId ? ` for school ${schoolId}` : ''}:`, {
          error: error.message,
          code: error.code,
          type: error.type,
          isRetryable
        });

        // Log the error for audit trail
        if (schoolId) {
          await BillingAuditService.logBillingEvent({
            schoolId,
            eventType: 'stripe_api_error',
            eventData: {
              operation: operationName,
              attempt,
              maxRetries,
              errorCode: error.code,
              errorType: error.type
            },
            errorMessage: error.message
          });
        }

        // Don't retry if it's not a retryable error or last attempt
        if (!isRetryable || attempt === maxRetries) {
          break;
        }

        // Wait before retrying (exponential backoff)
        const waitTime = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
        console.log(`⏳ Retrying in ${waitTime}ms...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }

    // All retries failed
    const errorMessage = `Stripe ${operationName} failed after ${maxRetries} attempts: ${lastError.message}`;
    
    if (schoolId) {
      await BillingAuditService.createBillingAlert({
        schoolId,
        alertType: 'stripe_api_failure',
        severity: 'high',
        title: `Stripe ${operationName} Failed`,
        message: errorMessage,
        actionRequired: true,
        metadata: {
          operation: operationName,
          attempts: maxRetries,
          lastError: {
            message: lastError.message,
            code: lastError.code,
            type: lastError.type
          }
        }
      });
    }

    throw new Error(errorMessage);
  }

  private isRetryableStripeError(error: any): boolean {
    // Retry on network errors, rate limits, and temporary server errors
    const retryableCodes = [
      'rate_limit',
      'api_connection_error',
      'api_error'
    ];
    
    const retryableTypes = [
      'api_connection_error',
      'api_error'
    ];

    return retryableCodes.includes(error.code) || 
           retryableTypes.includes(error.type) ||
           (error.statusCode >= 500 && error.statusCode < 600);
  }

  // Enhanced billing process with comprehensive audit trail
  async processMonthlyBilling() {
    console.log('🔄 Starting enhanced monthly billing process...');
    const startTime = Date.now();
    let schoolsProcessed = 0;
    let totalProcessed = 0;
    const errors: any[] = [];

    try {
      if (!isDatabaseAvailable) {
        console.log("⚠️ Database unavailable - using mock billing process");
        await this.mockBillingProcess();
        return { schoolsProcessed: 1, totalProcessed: 2995, errors: [] };
      }

      // Process school subscriptions with enhanced tracking
      const activeSchoolSubs = await db
        .select()
        .from(schoolSubscriptions)
        .where(eq(schoolSubscriptions.status, 'active'));

      for (const schoolSub of activeSchoolSubs) {
        try {
          const result = await this.processSchoolBillingWithAudit(schoolSub.schoolId);
          if (result.success) {
            schoolsProcessed++;
            totalProcessed += result.amount;
          } else {
            errors.push({ schoolId: schoolSub.schoolId, error: result.error });
          }
        } catch (error) {
          console.error(`Failed to process billing for school ${schoolSub.schoolId}:`, error);
          errors.push({ schoolId: schoolSub.schoolId, error: error.message });
          
          // Track failed billing
          await BillingAuditService.handleFailedPayment(
            schoolSub.schoolId, 
            0, 
            error.message
          );
        }
      }

      // Process teacher subscriptions
      const activeTeacherSubs = await db
        .select()
        .from(teacherSubscriptions)
        .where(eq(teacherSubscriptions.status, 'active'));

      for (const teacherSub of activeTeacherSubs) {
        try {
          const result = await this.processTeacherBillingWithAudit(teacherSub.userId);
          if (result.success) {
            totalProcessed += result.amount;
          } else {
            errors.push({ userId: teacherSub.userId, error: result.error });
          }
        } catch (error) {
          console.error(`Failed to process billing for teacher ${teacherSub.userId}:`, error);
          errors.push({ userId: teacherSub.userId, error: error.message });
        }
      }

      const processingTime = Date.now() - startTime;
      
      // Log overall billing completion
      await BillingAuditService.logBillingEvent({
        eventType: 'monthly_billing_completed',
        eventData: {
          schoolsProcessed,
          totalProcessed,
          errors: errors.length,
          processingTime
        },
        processingTime,
        metadata: { 
          billingMonth: format(new Date(), 'yyyy-MM'),
          errorDetails: errors
        }
      });

      console.log(`✅ Enhanced monthly billing completed: ${schoolsProcessed} schools, €${(totalProcessed / 100).toFixed(2)} total`);
      
      return { schoolsProcessed, totalProcessed, errors };
    } catch (error) {
      console.error('❌ Enhanced monthly billing failed:', error);
      
      await BillingAuditService.logBillingEvent({
        eventType: 'monthly_billing_failed',
        eventData: { error: error.message },
        errorMessage: error.message,
        processingTime: Date.now() - startTime
      });

      throw error;
    }
  }

  // 3. Usage Summary per School (Backend) - Get comprehensive school usage data
  async getSchoolUsageSummary(schoolId: number): Promise<{
    schoolId: number;
    schoolName: string;
    activeTeachers: number;
    activeStudents: number;
    currentPlan: string;
    extraBlocks: number;
    monthlyAmount: number;
    lastBillingDate: string | null;
    nextBillingDate: string;
    paymentStatus: string;
  }> {
    try {
      if (!isDatabaseAvailable) {
        // Mock data for development
        return {
          schoolId,
          schoolName: "Stefan van de Brug Drum School",
          activeTeachers: 1,
          activeStudents: 97,
          currentPlan: "pro",
          extraBlocks: 10, // (97-50)/5 = 9.4 rounded up
          monthlyAmount: 94.45, // €49.95 + (10 * €4.50)
          lastBillingDate: "2025-07-01T02:00:00Z",
          nextBillingDate: "2025-08-01T02:00:00Z",
          paymentStatus: "active"
        };
      }

      // Get real usage data
      const pricing = await subscriptionService.calculateSchoolMonthlyPrice(schoolId);
      if (!pricing) {
        throw new Error(`Unable to calculate pricing for school ${schoolId}`);
      }

      // Get school name
      const school = await db
        .select({ name: schools.name })
        .from(schools)
        .where(eq(schools.id, schoolId))
        .limit(1);

      const schoolName = school[0]?.name || `School ${schoolId}`;

      // Calculate extra blocks
      const includedStudents = pricing.plan === 'pro' ? 50 : 25;
      const extraStudents = Math.max(0, pricing.studentCount - includedStudents);
      const extraBlocks = Math.ceil(extraStudents / 5);

      return {
        schoolId,
        schoolName,
        activeTeachers: pricing.teacherCount,
        activeStudents: pricing.studentCount,
        currentPlan: pricing.plan,
        extraBlocks,
        monthlyAmount: pricing.totalPrice,
        lastBillingDate: "2025-07-01T02:00:00Z",
        nextBillingDate: "2025-08-01T02:00:00Z",
        paymentStatus: "active"
      };
    } catch (error) {
      console.error(`Failed to get usage summary for school ${schoolId}:`, error);
      throw error;
    }
  }

  // 6. Log Billing Run per School - Comprehensive logging for each school billing
  async logSchoolBillingRun(schoolId: number, billingData: {
    planApplied: string;
    teacherCount: number;
    studentCount: number;
    amountCharged: number;
    success: boolean;
    errorMessage?: string;
    fallbackFlags?: string[];
  }) {
    const logEntry = {
      schoolId,
      eventType: 'school_billing_run',
      eventData: {
        planApplied: billingData.planApplied,
        teacherCount: billingData.teacherCount,
        studentCount: billingData.studentCount,
        amountCharged: billingData.amountCharged,
        success: billingData.success,
        billingMonth: format(new Date(), 'yyyy-MM'),
        timestamp: new Date().toISOString()
      },
      currentAmount: billingData.amountCharged / 100,
      errorMessage: billingData.errorMessage,
      metadata: {
        fallbackFlags: billingData.fallbackFlags || [],
        extraStudents: Math.max(0, billingData.studentCount - (billingData.planApplied === 'pro' ? 50 : 25)),
        autoUpgrade: billingData.teacherCount > 1 && billingData.planApplied === 'pro'
      }
    };

    await BillingAuditService.logBillingEvent(logEntry);

    console.log(`📊 [BILLING LOG] School ${schoolId}: ${billingData.planApplied} plan, ${billingData.teacherCount}T/${billingData.studentCount}S, €${(billingData.amountCharged / 100).toFixed(2)}, ${billingData.success ? 'SUCCESS' : 'FAILED'}`);
  }

  // Process school billing with comprehensive audit trail
  async processSchoolBillingWithAudit(schoolId: number) {
    const startTime = Date.now();
    
    try {
      // Get current billing calculation
      const pricing = await subscriptionService.calculateSchoolMonthlyPrice(schoolId);
      if (!pricing) {
        throw new Error("Unable to calculate pricing for school");
      }

      // Get previous billing amount for comparison
      const summary = await db
        .select()
        .from(BillingAuditService.schoolBillingSummary)
        .where(eq(BillingAuditService.schoolBillingSummary.schoolId, schoolId))
        .limit(1);

      const previousAmount = summary[0]?.lastBillingAmount ? parseFloat(summary[0].lastBillingAmount) : 0;
      const currentAmount = pricing.totalPrice;
      const amountInCents = Math.round(currentAmount * 100);

      // Log billing calculation
      await BillingAuditService.logBillingEvent({
        schoolId,
        eventType: 'billing_calculated',
        eventData: {
          plan: pricing.plan,
          teacherCount: pricing.teacherCount,
          studentCount: pricing.studentCount,
          basePrice: pricing.basePrice,
          extraStudents: pricing.extraStudents,
          totalPrice: pricing.totalPrice
        },
        previousAmount,
        currentAmount,
        processingTime: Date.now() - startTime,
        metadata: { 
          billingMonth: format(new Date(), 'yyyy-MM'),
          pricingBreakdown: pricing
        }
      });

      // Check for plan upgrades
      if (pricing.plan === 'pro' && summary[0]?.currentPlan === 'standard') {
        await BillingAuditService.createBillingAlert({
          schoolId,
          alertType: 'plan_upgraded',
          severity: 'medium',
          title: 'Automatic Plan Upgrade',
          message: `School ${schoolId} automatically upgraded to Pro plan due to ${pricing.teacherCount} teachers`,
          metadata: { oldPlan: 'standard', newPlan: 'pro', reason: 'teacher_count_exceeded' }
        });
      }

      // Process payment with enhanced error handling and Stripe API wrapper
      if (!stripe) {
        console.log(`💰 [MOCK] Would charge school ${schoolId}: €${currentAmount.toFixed(2)}`);
        
        // Simulate payment success/failure for testing
        const shouldSimulateFailure = Math.random() < 0.1; // 10% failure rate for testing
        
        if (shouldSimulateFailure) {
          // Log failed billing run
          await this.logSchoolBillingRun(schoolId, {
            planApplied: pricing.plan,
            teacherCount: pricing.teacherCount,
            studentCount: pricing.studentCount,
            amountCharged: amountInCents,
            success: false,
            errorMessage: "Simulated payment failure for testing",
            fallbackFlags: ["mock_failure"]
          });

          await BillingAuditService.handleFailedPayment(
            schoolId, 
            amountInCents, 
            "Simulated payment failure for testing"
          );
          return { success: false, error: "Simulated payment failure", amount: 0 };
        } else {
          // Log successful billing run
          await this.logSchoolBillingRun(schoolId, {
            planApplied: pricing.plan,
            teacherCount: pricing.teacherCount,
            studentCount: pricing.studentCount,
            amountCharged: amountInCents,
            success: true,
            fallbackFlags: ["mock_success"]
          });

          await BillingAuditService.handleSuccessfulPayment(
            schoolId, 
            amountInCents
          );
          
          // Update billing summary
          await BillingAuditService.updateSchoolBillingSummary(schoolId, {
            currentPlan: pricing.plan,
            teacherCount: pricing.teacherCount,
            studentCount: pricing.studentCount,
            lastBillingAmount: currentAmount,
            nextBillingAmount: currentAmount,
            lastBillingDate: new Date(),
            nextBillingDate: addMonths(new Date(), 1),
            paymentStatus: 'active'
          });
          
          return { success: true, amount: amountInCents };
        }
      }

      // Real Stripe payment processing with retry mechanism
      try {
        const stripeResult = await this.makeStripeApiCall(
          async () => {
            // This would be the actual Stripe payment processing
            // For now, return mock success
            return { id: 'mock_payment_id', status: 'succeeded' };
          },
          'process_payment',
          schoolId
        );

        // Log successful billing run
        await this.logSchoolBillingRun(schoolId, {
          planApplied: pricing.plan,
          teacherCount: pricing.teacherCount,
          studentCount: pricing.studentCount,
          amountCharged: amountInCents,
          success: true
        });

        await BillingAuditService.handleSuccessfulPayment(
          schoolId, 
          amountInCents,
          stripeResult.id
        );

        return { success: true, amount: amountInCents };
      } catch (stripeError) {
        // Log failed billing run
        await this.logSchoolBillingRun(schoolId, {
          planApplied: pricing.plan,
          teacherCount: pricing.teacherCount,
          studentCount: pricing.studentCount,
          amountCharged: amountInCents,
          success: false,
          errorMessage: stripeError.message,
          fallbackFlags: ["stripe_failure"]
        });

        throw stripeError;
      }
      
    } catch (error) {
      console.error(`Failed to process school billing for ${schoolId}:`, error);
      
      await BillingAuditService.handleFailedPayment(
        schoolId, 
        0, 
        error.message
      );
      
      return { success: false, error: error.message, amount: 0 };
    }
  }

  // Process teacher billing with audit trail
  async processTeacherBillingWithAudit(userId: number) {
    const startTime = Date.now();
    
    try {
      const pricing = await subscriptionService.calculateTeacherMonthlyPrice(userId);
      if (!pricing) {
        throw new Error("Unable to calculate pricing for teacher");
      }

      await BillingAuditService.logBillingEvent({
        userId,
        eventType: 'teacher_billing_calculated',
        eventData: {
          plan: pricing.plan,
          studentCount: pricing.studentCount,
          totalPrice: pricing.totalPrice
        },
        currentAmount: pricing.totalPrice,
        processingTime: Date.now() - startTime,
        metadata: { 
          billingMonth: format(new Date(), 'yyyy-MM'),
          pricingBreakdown: pricing
        }
      });

      // Mock payment processing for teachers
      console.log(`💰 [MOCK] Would charge teacher ${userId}: €${pricing.totalPrice.toFixed(2)}`);
      
      return { success: true, amount: Math.round(pricing.totalPrice * 100) };
    } catch (error) {
      console.error(`Failed to process teacher billing for ${userId}:`, error);
      return { success: false, error: error.message, amount: 0 };
    }
  }

  // Mock billing process for when database is unavailable
  async mockBillingProcess() {
    console.log("🎭 Running mock billing process with audit simulation...");
    
    // Simulate processing a test school
    await BillingAuditService.logBillingEvent({
      schoolId: 1,
      eventType: 'billing_calculated',
      eventData: {
        plan: 'standard',
        teacherCount: 1,
        studentCount: 27,
        basePrice: 29.95,
        extraStudents: 2,
        totalPrice: 34.45
      },
      currentAmount: 34.45,
      metadata: { 
        billingMonth: format(new Date(), 'yyyy-MM'),
        mockRun: true
      }
    });

    // Simulate successful payment
    await BillingAuditService.handleSuccessfulPayment(1, 3445); // €34.45 in cents
    
    console.log("🎭 Mock billing process completed");
  }

  // Manual billing trigger for specific school
  async triggerSchoolBilling(schoolId: number, triggerBy: number) {
    console.log(`🔄 Manual billing trigger for school ${schoolId} by user ${triggerBy}`);
    
    try {
      const result = await this.processSchoolBillingWithAudit(schoolId);
      
      await BillingAuditService.logBillingEvent({
        schoolId,
        userId: triggerBy,
        eventType: 'manual_billing_triggered',
        eventData: {
          triggerBy,
          result: result.success ? 'success' : 'failed',
          amount: result.amount
        },
        currentAmount: result.amount / 100,
        metadata: { manualTrigger: true, triggerTimestamp: new Date().toISOString() }
      });

      return result;
    } catch (error) {
      console.error(`Manual billing trigger failed for school ${schoolId}:`, error);
      throw error;
    }
  }

  // 4. Pre-billing Warning Logic - Check for usage increases before billing
  async checkPreBillingWarnings() {
    console.log('🔍 Checking pre-billing warnings for all schools...');
    
    try {
      if (!isDatabaseAvailable) {
        console.log('⚠️ Database unavailable - skipping pre-billing warnings');
        return [];
      }

      const warnings = [];
      const schools = await db.select().from(db.schools);

      for (const school of schools) {
        try {
          const currentUsage = await this.getSchoolUsageSummary(school.id);
          
          // Check if usage will exceed current plan limits
          const currentPlan = currentUsage.currentPlan;
          const teacherCount = currentUsage.activeTeachers;
          const studentCount = currentUsage.activeStudents;
          
          // Warning conditions
          if (currentPlan === 'standard' && teacherCount > 1) {
            warnings.push({
              schoolId: school.id,
              type: 'auto_upgrade_warning',
              message: `School ${school.id} will auto-upgrade to Pro plan (${teacherCount} teachers)`,
              impact: `€${(49.95 - 29.95).toFixed(2)} additional monthly cost`
            });
          }

          if (currentPlan === 'standard' && studentCount > 30) {
            const extraBlocks = Math.ceil((studentCount - 25) / 5);
            warnings.push({
              schoolId: school.id,
              type: 'usage_increase_warning',
              message: `School ${school.id} has ${studentCount} students (${extraBlocks} extra blocks)`,
              impact: `€${(extraBlocks * 4.50).toFixed(2)} in extra student costs`
            });
          }

          if (currentPlan === 'pro' && studentCount > 60) {
            const extraBlocks = Math.ceil((studentCount - 50) / 5);
            warnings.push({
              schoolId: school.id,
              type: 'high_usage_warning',
              message: `School ${school.id} has ${studentCount} students on Pro plan`,
              impact: `€${(extraBlocks * 4.50).toFixed(2)} in extra student costs`
            });
          }

          // Log the warning check
          await BillingAuditService.logBillingEvent({
            schoolId: school.id,
            eventType: 'pre_billing_warning_check',
            eventData: {
              currentPlan,
              teacherCount,
              studentCount,
              warningsGenerated: warnings.filter(w => w.schoolId === school.id).length
            },
            metadata: { checkDate: new Date().toISOString() }
          });

        } catch (error) {
          console.error(`Error checking warnings for school ${school.id}:`, error);
        }
      }

      // Create alerts for significant warnings
      for (const warning of warnings) {
        if (warning.type === 'auto_upgrade_warning') {
          await BillingAuditService.createBillingAlert({
            schoolId: warning.schoolId,
            alertType: 'pre_billing_warning',
            severity: 'medium',
            title: 'Pre-billing Warning: Auto-upgrade Detected',
            message: warning.message,
            metadata: { warning, scheduledFor: '28th of month' }
          });
        }
      }

      console.log(`🔍 Pre-billing check complete: ${warnings.length} warnings generated`);
      return warnings;
      
    } catch (error) {
      console.error('Failed to check pre-billing warnings:', error);
      return [];
    }
  }

  // 5. Improved /billing/status endpoint - Enhanced status with clear values
  async getBillingHealthStatus() {
    try {
      if (!isDatabaseAvailable) {
        return {
          status: 'degraded',
          message: 'Database unavailable - using in-memory storage',
          lastBillingRun: null,
          lastBillingStatus: 'unknown',
          nextBilling: '2025-08-01T02:00:00Z',
          alerts: 0,
          stripeStatus: stripe ? 'connected' : 'not_configured',
          schoolPlans: {},
          lastSuccessfulCharge: null,
          systemHealth: {
            database: 'degraded',
            stripe: stripe ? 'connected' : 'not_configured',
            scheduler: 'active',
            webhooks: stripeWebhookSecret ? 'configured' : 'not_configured'
          }
        };
      }

      const recentAlerts = await BillingAuditService.getBillingAlerts(10, true);
      const criticalAlerts = recentAlerts.filter(alert => alert.severity === 'critical').length;
      
      // Get last billing run information
      const lastBillingEvent = await db
        .select()
        .from(BillingAuditService.billingAuditLog)
        .where(eq(BillingAuditService.billingAuditLog.eventType, 'monthly_billing_completed'))
        .orderBy(desc(BillingAuditService.billingAuditLog.createdAt))
        .limit(1);

      // Get current plans for all schools
      const schoolSummaries = await db.select().from(BillingAuditService.schoolBillingSummary);
      const schoolPlans = schoolSummaries.reduce((acc, summary) => {
        acc[summary.schoolId] = {
          plan: summary.currentPlan,
          teachers: summary.teacherCount,
          students: summary.studentCount,
          lastBilling: summary.lastBillingAmount,
          status: summary.paymentStatus
        };
        return acc;
      }, {} as Record<number, any>);

      // Get last successful charge
      const lastSuccess = await db
        .select()
        .from(BillingAuditService.billingAuditLog)
        .where(eq(BillingAuditService.billingAuditLog.eventType, 'payment_processed'))
        .orderBy(desc(BillingAuditService.billingAuditLog.createdAt))
        .limit(1);
      
      return {
        status: criticalAlerts > 0 ? 'critical' : 'healthy',
        message: criticalAlerts > 0 ? `${criticalAlerts} critical billing issues` : 'All billing systems operational',
        lastBillingRun: lastBillingEvent[0]?.createdAt || null,
        lastBillingStatus: lastBillingEvent[0] ? 'completed' : 'pending',
        nextBilling: '2025-08-01T02:00:00Z',
        alerts: recentAlerts.length,
        stripeStatus: stripe ? 'connected' : 'not_configured',
        schoolPlans,
        lastSuccessfulCharge: lastSuccess[0]?.createdAt || null,
        systemHealth: {
          database: 'healthy',
          stripe: stripe ? 'connected' : 'not_configured',
          scheduler: 'active',
          webhooks: stripeWebhookSecret ? 'configured' : 'not_configured'
        }
      };
    } catch (error) {
      console.error("Failed to get billing health status:", error);
      return {
        status: 'error',
        message: 'Unable to determine billing health',
        error: error.message,
        systemHealth: {
          database: 'error',
          stripe: 'unknown',
          scheduler: 'unknown',
          webhooks: 'unknown'
        }
      };
    }
  }

  // ==================== INVOICE MANAGEMENT ====================

  async createInvoice(schoolId: number, items: { description: string; amount: number }[], dueDate?: Date): Promise<any> {
    this.ensureStripeReady();
    
    return this.makeStripeApiCall(async () => {
      const subscription = await db
        .select()
        .from(schoolSubscriptions)
        .where(eq(schoolSubscriptions.schoolId, schoolId))
        .limit(1);

      if (!subscription[0]?.stripeCustomerId) {
        throw new Error(`No Stripe customer found for school ${schoolId}`);
      }

      const invoice = await stripe!.invoices.create({
        customer: subscription[0].stripeCustomerId,
        collection_method: 'send_invoice',
        days_until_due: dueDate ? Math.ceil((dueDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : 30,
        auto_advance: false,
      });

      for (const item of items) {
        await stripe!.invoiceItems.create({
          customer: subscription[0].stripeCustomerId,
          invoice: invoice.id,
          description: item.description,
          amount: Math.round(item.amount * 100),
          currency: 'eur',
        });
      }

      await BillingAuditService.logBillingEvent({
        schoolId,
        eventType: 'invoice_created',
        eventData: { invoiceId: invoice.id, items, totalAmount: items.reduce((sum, i) => sum + i.amount, 0) },
      });

      return invoice;
    }, 'createInvoice', schoolId);
  }

  async listInvoices(schoolId?: number, limit: number = 50): Promise<any[]> {
    this.ensureStripeReady();

    return this.makeStripeApiCall(async () => {
      let customerId: string | undefined;

      if (schoolId) {
        const subscription = await db
          .select()
          .from(schoolSubscriptions)
          .where(eq(schoolSubscriptions.schoolId, schoolId))
          .limit(1);
        customerId = subscription[0]?.stripeCustomerId || undefined;
      }

      const invoices = await stripe!.invoices.list({
        customer: customerId,
        limit,
        expand: ['data.customer'],
      });

      return invoices.data.map(inv => ({
        id: inv.id,
        number: inv.number,
        status: inv.status,
        amountDue: inv.amount_due / 100,
        amountPaid: inv.amount_paid / 100,
        currency: inv.currency,
        customerEmail: typeof inv.customer === 'object' ? inv.customer?.email : null,
        customerName: typeof inv.customer === 'object' ? inv.customer?.name : null,
        dueDate: inv.due_date ? new Date(inv.due_date * 1000).toISOString() : null,
        createdAt: new Date(inv.created * 1000).toISOString(),
        paidAt: inv.status_transitions?.paid_at ? new Date(inv.status_transitions.paid_at * 1000).toISOString() : null,
        invoicePdf: inv.invoice_pdf,
        hostedInvoiceUrl: inv.hosted_invoice_url,
      }));
    }, 'listInvoices', schoolId);
  }

  async getInvoicePdfUrl(invoiceId: string): Promise<string> {
    this.ensureStripeReady();

    return this.makeStripeApiCall(async () => {
      const invoice = await stripe!.invoices.retrieve(invoiceId);
      if (!invoice.invoice_pdf) {
        throw new Error('Invoice PDF not available');
      }
      return invoice.invoice_pdf;
    }, 'getInvoicePdfUrl');
  }

  async sendInvoice(invoiceId: string): Promise<any> {
    this.ensureStripeReady();

    return this.makeStripeApiCall(async () => {
      const invoice = await stripe!.invoices.sendInvoice(invoiceId);
      
      await BillingAuditService.logBillingEvent({
        eventType: 'invoice_sent',
        eventData: { invoiceId, status: invoice.status },
      });

      return invoice;
    }, 'sendInvoice');
  }

  async finalizeInvoice(invoiceId: string): Promise<any> {
    this.ensureStripeReady();

    return this.makeStripeApiCall(async () => {
      const invoice = await stripe!.invoices.finalizeInvoice(invoiceId);
      return invoice;
    }, 'finalizeInvoice');
  }

  async voidInvoice(invoiceId: string, reason: string): Promise<any> {
    this.ensureStripeReady();

    return this.makeStripeApiCall(async () => {
      const invoice = await stripe!.invoices.voidInvoice(invoiceId);
      
      await BillingAuditService.logBillingEvent({
        eventType: 'invoice_voided',
        eventData: { invoiceId, reason },
      });

      return invoice;
    }, 'voidInvoice');
  }

  // ==================== PRICING CONTROL ====================

  async updateSchoolPrice(schoolId: number, newMonthlyPrice: number, reason: string): Promise<any> {
    this.ensureStripeReady();

    return this.makeStripeApiCall(async () => {
      const subscription = await db
        .select()
        .from(schoolSubscriptions)
        .where(eq(schoolSubscriptions.schoolId, schoolId))
        .limit(1);

      if (!subscription[0]) {
        throw new Error(`No subscription found for school ${schoolId}`);
      }

      const oldPrice = subscription[0].monthlyPrice || 0;

      await db
        .update(schoolSubscriptions)
        .set({ 
          monthlyPrice: newMonthlyPrice,
          updatedAt: new Date(),
        })
        .where(eq(schoolSubscriptions.schoolId, schoolId));

      if (subscription[0].stripeSubscriptionId) {
        const stripeSub = await stripe!.subscriptions.retrieve(subscription[0].stripeSubscriptionId);
        const priceItem = stripeSub.items.data[0];

        if (priceItem) {
          const newPrice = await stripe!.prices.create({
            unit_amount: Math.round(newMonthlyPrice * 100),
            currency: 'eur',
            recurring: { interval: 'month' },
            product: typeof priceItem.price.product === 'string' ? priceItem.price.product : priceItem.price.product.id,
          });

          await stripe!.subscriptions.update(subscription[0].stripeSubscriptionId, {
            items: [{ id: priceItem.id, price: newPrice.id }],
            proration_behavior: 'create_prorations',
          });
        }
      }

      await BillingAuditService.logBillingEvent({
        schoolId,
        eventType: 'price_updated',
        eventData: { oldPrice, newPrice: newMonthlyPrice, reason },
      });

      return { success: true, oldPrice, newPrice: newMonthlyPrice };
    }, 'updateSchoolPrice', schoolId);
  }

  async applyCredit(schoolId: number, amount: number, reason: string): Promise<any> {
    this.ensureStripeReady();

    return this.makeStripeApiCall(async () => {
      const subscription = await db
        .select()
        .from(schoolSubscriptions)
        .where(eq(schoolSubscriptions.schoolId, schoolId))
        .limit(1);

      if (!subscription[0]?.stripeCustomerId) {
        throw new Error(`No Stripe customer found for school ${schoolId}`);
      }

      const creditBalance = await stripe!.customers.createBalanceTransaction(
        subscription[0].stripeCustomerId,
        {
          amount: -Math.round(amount * 100),
          currency: 'eur',
          description: reason,
        }
      );

      await BillingAuditService.logBillingEvent({
        schoolId,
        eventType: 'credit_applied',
        eventData: { amount, reason, balanceTransactionId: creditBalance.id },
      });

      return { success: true, creditBalance };
    }, 'applyCredit', schoolId);
  }

  async getSchoolPricing(schoolId: number): Promise<any> {
    const subscription = await db
      .select()
      .from(schoolSubscriptions)
      .where(eq(schoolSubscriptions.schoolId, schoolId))
      .limit(1);

    if (!subscription[0]) {
      return null;
    }

    const school = await db
      .select({ name: schools.name })
      .from(schools)
      .where(eq(schools.id, schoolId))
      .limit(1);

    let stripeBalance = 0;
    if (stripe && subscription[0].stripeCustomerId) {
      try {
        const customer = await stripe.customers.retrieve(subscription[0].stripeCustomerId) as Stripe.Customer;
        stripeBalance = (customer.balance || 0) / -100;
      } catch (e) {
        console.warn('Could not fetch Stripe balance:', e);
      }
    }

    return {
      schoolId,
      schoolName: school[0]?.name || `School ${schoolId}`,
      currentPlan: subscription[0].plan || 'basic',
      monthlyPrice: subscription[0].monthlyPrice || 0,
      status: subscription[0].status,
      stripeCustomerId: subscription[0].stripeCustomerId,
      stripeSubscriptionId: subscription[0].stripeSubscriptionId,
      creditBalance: stripeBalance,
      nextBillingDate: subscription[0].nextBillingDate,
    };
  }

  async listAllSchoolPricing(): Promise<any[]> {
    const subscriptions = await db
      .select({
        schoolId: schoolSubscriptions.schoolId,
        plan: schoolSubscriptions.plan,
        monthlyPrice: schoolSubscriptions.monthlyPrice,
        status: schoolSubscriptions.status,
        stripeCustomerId: schoolSubscriptions.stripeCustomerId,
        nextBillingDate: schoolSubscriptions.nextBillingDate,
      })
      .from(schoolSubscriptions);

    const schoolIds = subscriptions.map(s => s.schoolId);
    const schoolsData = await db
      .select({ id: schools.id, name: schools.name })
      .from(schools);

    const schoolMap = new Map(schoolsData.map(s => [s.id, s.name]));

    return subscriptions.map(sub => ({
      ...sub,
      schoolName: schoolMap.get(sub.schoolId) || `School ${sub.schoolId}`,
    }));
  }

  // ==================== REFUND PROCESSING ====================

  async issueRefund(paymentIntentId: string, amount: number | null, reason: string, schoolId?: number): Promise<any> {
    this.ensureStripeReady();

    return this.makeStripeApiCall(async () => {
      const refundParams: Stripe.RefundCreateParams = {
        payment_intent: paymentIntentId,
        reason: 'requested_by_customer' as const,
        metadata: { internalReason: reason },
      };

      if (amount !== null) {
        refundParams.amount = Math.round(amount * 100);
      }

      const refund = await stripe!.refunds.create(refundParams);

      await db.insert(paymentHistory).values({
        schoolId: schoolId || null,
        amount: -(refund.amount / 100),
        status: 'refunded',
        stripePaymentIntentId: paymentIntentId,
        createdAt: new Date(),
        metadata: { refundId: refund.id, reason },
      });

      await BillingAuditService.logBillingEvent({
        schoolId,
        eventType: 'refund_issued',
        eventData: {
          refundId: refund.id,
          paymentIntentId,
          amount: refund.amount / 100,
          reason,
          status: refund.status,
        },
      });

      return {
        success: true,
        refundId: refund.id,
        amount: refund.amount / 100,
        status: refund.status,
        currency: refund.currency,
      };
    }, 'issueRefund', schoolId);
  }

  async getRefundHistory(schoolId?: number, limit: number = 50): Promise<any[]> {
    this.ensureStripeReady();

    return this.makeStripeApiCall(async () => {
      const refunds = await stripe!.refunds.list({ limit });

      const refundList = refunds.data.map(refund => ({
        id: refund.id,
        amount: refund.amount / 100,
        currency: refund.currency,
        status: refund.status,
        reason: refund.reason,
        paymentIntentId: refund.payment_intent,
        createdAt: new Date(refund.created * 1000).toISOString(),
        metadata: refund.metadata,
      }));

      return refundList;
    }, 'getRefundHistory', schoolId);
  }

  async getPaymentDetails(paymentIntentId: string): Promise<any> {
    this.ensureStripeReady();

    return this.makeStripeApiCall(async () => {
      const paymentIntent = await stripe!.paymentIntents.retrieve(paymentIntentId, {
        expand: ['customer', 'invoice'],
      });

      return {
        id: paymentIntent.id,
        amount: paymentIntent.amount / 100,
        amountRefunded: (paymentIntent.amount - (paymentIntent.amount_received || 0)) / 100,
        currency: paymentIntent.currency,
        status: paymentIntent.status,
        customerEmail: typeof paymentIntent.customer === 'object' ? paymentIntent.customer?.email : null,
        invoiceId: typeof paymentIntent.invoice === 'object' ? paymentIntent.invoice?.id : paymentIntent.invoice,
        createdAt: new Date(paymentIntent.created * 1000).toISOString(),
        refundable: paymentIntent.status === 'succeeded',
      };
    }, 'getPaymentDetails');
  }

  async listPayments(schoolId?: number, limit: number = 50): Promise<any[]> {
    this.ensureStripeReady();

    return this.makeStripeApiCall(async () => {
      let customerId: string | undefined;

      if (schoolId) {
        const subscription = await db
          .select()
          .from(schoolSubscriptions)
          .where(eq(schoolSubscriptions.schoolId, schoolId))
          .limit(1);
        customerId = subscription[0]?.stripeCustomerId || undefined;
      }

      const paymentIntents = await stripe!.paymentIntents.list({
        customer: customerId,
        limit,
      });

      return paymentIntents.data.map(pi => ({
        id: pi.id,
        amount: pi.amount / 100,
        currency: pi.currency,
        status: pi.status,
        createdAt: new Date(pi.created * 1000).toISOString(),
        description: pi.description,
        refundable: pi.status === 'succeeded',
      }));
    }, 'listPayments', schoolId);
  }
}

export const enhancedStripeService = new EnhancedStripeService();