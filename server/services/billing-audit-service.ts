import { db, isDatabaseAvailable } from "../db";
import { billingAuditLog, billingAlerts, schoolBillingSummary } from "@shared/schema";
import { eq, desc, and } from "drizzle-orm";
import { EmailNotificationService } from "./email-notifications";

export class BillingAuditService {
  // Log billing events for audit trail
  static async logBillingEvent(event: {
    schoolId?: number;
    userId?: number;
    eventType: string;
    eventData: any;
    previousAmount?: number;
    currentAmount?: number;
    stripeEventId?: string;
    errorMessage?: string;
    processingTime?: number;
    metadata?: any;
  }) {
    if (!isDatabaseAvailable) {
      console.log("📝 [AUDIT] Billing event logged (in-memory):", event.eventType);
      return;
    }

    try {
      const auditEntry = await db.insert(billingAuditLog).values({
        schoolId: event.schoolId,
        userId: event.userId,
        eventType: event.eventType,
        eventData: event.eventData,
        previousAmount: event.previousAmount?.toString(),
        currentAmount: event.currentAmount?.toString(),
        stripeEventId: event.stripeEventId,
        errorMessage: event.errorMessage,
        processingTime: event.processingTime,
        metadata: event.metadata,
      }).returning();

      console.log(`📝 [AUDIT] Billing event logged: ${event.eventType} for school ${event.schoolId}`);
      return auditEntry[0];
    } catch (error) {
      console.error("Failed to log billing event:", error);
      // Don't throw - audit logging should not break billing process
    }
  }

  // Create billing alerts for admin attention
  static async createBillingAlert(alert: {
    schoolId?: number;
    alertType: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    title: string;
    message: string;
    actionRequired?: boolean;
    metadata?: any;
  }) {
    if (!isDatabaseAvailable) {
      console.log("🚨 [ALERT] Billing alert created (in-memory):", alert.title);
      return;
    }

    try {
      const alertEntry = await db.insert(billingAlerts).values({
        schoolId: alert.schoolId,
        alertType: alert.alertType,
        severity: alert.severity,
        title: alert.title,
        message: alert.message,
        actionRequired: alert.actionRequired || false,
        metadata: alert.metadata,
      }).returning();

      // Send email notification for high/critical alerts
      if (alert.severity === 'high' || alert.severity === 'critical') {
        await EmailNotificationService.notifyBillingEvent({
          type: `Billing Alert: ${alert.title}`,
          entity: `School ${alert.schoolId}`,
          status: alert.severity.toUpperCase(),
          error: alert.message,
          actionRequired: alert.actionRequired
        });
      }

      console.log(`🚨 [ALERT] ${alert.severity.toUpperCase()} billing alert created: ${alert.title}`);
      return alertEntry[0];
    } catch (error) {
      console.error("Failed to create billing alert:", error);
    }
  }

  // Update school billing summary
  static async updateSchoolBillingSummary(schoolId: number, updates: {
    currentPlan?: string;
    teacherCount?: number;
    studentCount?: number;
    lastBillingAmount?: number;
    nextBillingAmount?: number;
    lastBillingDate?: Date;
    nextBillingDate?: Date;
    paymentStatus?: string;
    stripeCustomerId?: string;
    stripeSubscriptionId?: string;
  }) {
    if (!isDatabaseAvailable) {
      console.log("📊 [SUMMARY] Billing summary updated (in-memory) for school:", schoolId);
      return;
    }

    try {
      const existingSummary = await db
        .select()
        .from(schoolBillingSummary)
        .where(eq(schoolBillingSummary.schoolId, schoolId))
        .limit(1);

      const summaryData = {
        schoolId,
        currentPlan: updates.currentPlan || 'standard',
        teacherCount: updates.teacherCount || 0,
        studentCount: updates.studentCount || 0,
        lastBillingAmount: updates.lastBillingAmount?.toString() || '0',
        nextBillingAmount: updates.nextBillingAmount?.toString() || '0',
        lastBillingDate: updates.lastBillingDate,
        nextBillingDate: updates.nextBillingDate,
        paymentStatus: updates.paymentStatus || 'active',
        stripeCustomerId: updates.stripeCustomerId,
        stripeSubscriptionId: updates.stripeSubscriptionId,
        updatedAt: new Date(),
      };

      if (existingSummary.length > 0) {
        // Update existing summary
        await db
          .update(schoolBillingSummary)
          .set(summaryData)
          .where(eq(schoolBillingSummary.schoolId, schoolId));
      } else {
        // Create new summary
        await db.insert(schoolBillingSummary).values(summaryData);
      }

      console.log(`📊 [SUMMARY] Billing summary updated for school ${schoolId}`);
    } catch (error) {
      console.error("Failed to update billing summary:", error);
    }
  }

  // Get billing alerts for admin dashboard
  static async getBillingAlerts(limit: number = 50, unreadOnly: boolean = false) {
    if (!isDatabaseAvailable) {
      return [];
    }

    try {
      const query = db
        .select()
        .from(billingAlerts)
        .orderBy(desc(billingAlerts.createdAt))
        .limit(limit);

      if (unreadOnly) {
        query.where(eq(billingAlerts.isResolved, false));
      }

      return await query;
    } catch (error) {
      console.error("Failed to get billing alerts:", error);
      return [];
    }
  }

  // Get billing audit trail for a school
  static async getSchoolBillingAudit(schoolId: number, limit: number = 100) {
    if (!isDatabaseAvailable) {
      return [];
    }

    try {
      return await db
        .select()
        .from(billingAuditLog)
        .where(eq(billingAuditLog.schoolId, schoolId))
        .orderBy(desc(billingAuditLog.createdAt))
        .limit(limit);
    } catch (error) {
      console.error("Failed to get billing audit trail:", error);
      return [];
    }
  }

  // Resolve billing alert
  static async resolveBillingAlert(alertId: number, resolvedBy: number) {
    if (!isDatabaseAvailable) {
      console.log("✅ [ALERT] Alert resolved (in-memory):", alertId);
      return;
    }

    try {
      await db
        .update(billingAlerts)
        .set({
          isResolved: true,
          resolvedAt: new Date(),
          resolvedBy: resolvedBy,
          updatedAt: new Date(),
        })
        .where(eq(billingAlerts.id, alertId));

      console.log(`✅ [ALERT] Alert ${alertId} resolved by user ${resolvedBy}`);
    } catch (error) {
      console.error("Failed to resolve billing alert:", error);
    }
  }

  // Track failed payment and create appropriate alerts
  static async handleFailedPayment(schoolId: number, amount: number, error: string, stripeEventId?: string) {
    // Log the failed payment
    await this.logBillingEvent({
      schoolId,
      eventType: 'payment_failed',
      eventData: { amount, error, retryAttempt: 1 },
      currentAmount: amount,
      stripeEventId,
      errorMessage: error,
      metadata: { failureTimestamp: new Date().toISOString() }
    });

    // Create high-priority alert
    await this.createBillingAlert({
      schoolId,
      alertType: 'payment_failed',
      severity: 'high',
      title: 'Payment Failed',
      message: `Payment of €${(amount / 100).toFixed(2)} failed for school ${schoolId}. Error: ${error}`,
      actionRequired: true,
      metadata: { amount, error, stripeEventId }
    });

    // Update billing summary status
    await this.updateSchoolBillingSummary(schoolId, {
      paymentStatus: 'failed'
    });

    console.log(`💥 [PAYMENT] Failed payment tracked for school ${schoolId}: €${(amount / 100).toFixed(2)}`);
  }

  // Track successful payment
  static async handleSuccessfulPayment(schoolId: number, amount: number, stripeEventId?: string) {
    await this.logBillingEvent({
      schoolId,
      eventType: 'payment_processed',
      eventData: { amount, success: true },
      currentAmount: amount,
      stripeEventId,
      metadata: { successTimestamp: new Date().toISOString() }
    });

    // Update billing summary status
    await this.updateSchoolBillingSummary(schoolId, {
      paymentStatus: 'active',
      lastBillingAmount: amount / 100,
      lastBillingDate: new Date()
    });

    console.log(`✅ [PAYMENT] Successful payment tracked for school ${schoolId}: €${(amount / 100).toFixed(2)}`);
  }

  // Check for trials ending soon
  static async checkTrialsEndingSoon() {
    if (!isDatabaseAvailable) {
      return [];
    }

    try {
      const threeDaysFromNow = new Date();
      threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

      const endingSoon = await db
        .select()
        .from(schoolBillingSummary)
        .where(
          and(
            eq(schoolBillingSummary.isTrialActive, true),
            eq(schoolBillingSummary.trialEndDate, threeDaysFromNow)
          )
        );

      // Create alerts for trials ending soon
      for (const trial of endingSoon) {
        await this.createBillingAlert({
          schoolId: trial.schoolId,
          alertType: 'trial_ending',
          severity: 'medium',
          title: 'Trial Ending Soon',
          message: `School ${trial.schoolId} trial ends in 3 days`,
          actionRequired: false,
          metadata: { trialEndDate: trial.trialEndDate }
        });
      }

      return endingSoon;
    } catch (error) {
      console.error("Failed to check trials ending soon:", error);
      return [];
    }
  }
}