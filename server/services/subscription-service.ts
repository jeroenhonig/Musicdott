import { db } from "../db";
import {
  subscriptionPlans,
  subscriptions,
  paymentHistory as paymentHistoryTable,
  schoolBillingSummary,
  users,
  students,
  schools
} from "@shared/schema";
import { eq, and, count, desc } from "drizzle-orm";
import { addDays, addMonths, startOfDay, format } from "date-fns";

// Helper to get plan details from the constant subscriptionPlans object
function getPlanByType(planType: string) {
  if (planType === 'pro') return subscriptionPlans.pro;
  return subscriptionPlans.standard; // default
}

// Helper to get plan price from plan type
function getPlanPrice(planType: string): number {
  return getPlanByType(planType).price;
}

// Helper to get student limit for a plan
function getStudentLimit(planType: string): number {
  return planType === 'pro' ? 999999 : 25; // Standard: 25, Pro: unlimited
}

// Helper to get teacher limit for a plan (-1 means unlimited)
function getTeacherLimit(planType: string): number {
  return planType === 'pro' ? -1 : 1; // Standard: 1 teacher, Pro: unlimited
}

export class SubscriptionService {
  // Get all available subscription plans
  async getSubscriptionPlans() {
    return Object.values(subscriptionPlans);
  }

  // Check if user has access to platform features
  async checkUserAccess(userId: number) {
    const user = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user.length) {
      throw new Error("User not found");
    }

    const userData = user[0];

    // Special unlimited access for drumschoolstefanvandebrug (owner account)
    if (userData.username === 'Drumschoolstefanvandebrug') {
      return {
        hasAccess: true,
        subscriptionType: 'unlimited',
        status: 'active',
        planName: 'Owner Account - Unlimited',
        isTrialActive: false,
        trialDaysRemaining: 0,
        licenseStatus: {
          teachers: {
            used: 0,
            available: 999999,
            hasCapacity: true,
          },
          students: {
            used: 0,
            available: 999999,
            hasCapacity: true,
          },
        },
        pricing: {
          basePlan: {
            name: 'Owner Account - Unlimited',
            price: 0,
            includedStudents: 999999,
            includedTeachers: 999999,
          },
          additionalCosts: [],
          total: 0,
        },
      };
    }

    // If user belongs to a school, check school subscription
    if (userData.schoolId) {
      return await this.checkSchoolSubscription(userData.schoolId);
    }

    // If independent teacher, check individual subscription
    if (userData.role === 'teacher') {
      return await this.checkTeacherSubscription(userId);
    }

    // Students inherit access from their school/teacher
    if (userData.role === 'student') {
      return {
        hasAccess: true,
        subscriptionType: 'student',
        status: 'active',
        isTrialActive: false,
        trialDaysRemaining: 0,
      };
    }

    return {
      hasAccess: false,
      subscriptionType: 'none',
      status: 'inactive',
      isTrialActive: false,
      trialDaysRemaining: 0,
    };
  }

  // Check school subscription status and automatically scale pricing
  async checkSchoolSubscription(schoolId: number) {
    const subscription = await db
      .select({
        id: subscriptions.id,
        status: subscriptions.status,
        planType: subscriptions.planType,
        currentPeriodEnd: subscriptions.currentPeriodEnd,
        stripeCustomerId: subscriptions.stripeCustomerId,
        stripeSubscriptionId: subscriptions.stripeSubscriptionId,
        cancelAtPeriodEnd: subscriptions.cancelAtPeriodEnd,
        createdAt: subscriptions.createdAt,
      })
      .from(subscriptions)
      .where(eq(subscriptions.schoolId, schoolId))
      .orderBy(desc(subscriptions.createdAt))
      .limit(1);

    if (!subscription.length) {
      return await this.createSchoolTrial(schoolId);
    }

    const sub = subscription[0];
    const plan = getPlanByType(sub.planType);
    const teacherLicenses = getTeacherLimit(sub.planType);
    const studentLicenses = getStudentLimit(sub.planType);

    // Get current usage counts from billing summary
    const billingSummary = await db
      .select({
        teacherCount: schoolBillingSummary.teacherCount,
        studentCount: schoolBillingSummary.studentCount,
      })
      .from(schoolBillingSummary)
      .where(eq(schoolBillingSummary.schoolId, schoolId))
      .limit(1);

    const currentTeacherCount = billingSummary[0]?.teacherCount ?? 0;
    const currentStudentCount = billingSummary[0]?.studentCount ?? 0;

    // Update current usage counts
    await this.updateLicenseUsage(sub.id, 'school');

    const now = new Date();
    const periodEnd = sub.currentPeriodEnd ? new Date(sub.currentPeriodEnd) : now;
    const isTrialActive = sub.status === 'trial' && now < periodEnd;
    const trialDaysRemaining = isTrialActive
      ? Math.ceil((periodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      : 0;

    // Calculate automatic pricing based on actual usage
    const currentMonthlyPrice = await this.calculateSchoolMonthlyPrice(schoolId);

    return {
      hasAccess: sub.status === 'active' || isTrialActive,
      subscriptionType: 'school',
      status: sub.status,
      planName: plan.name,
      isTrialActive,
      trialDaysRemaining,
      pricing: currentMonthlyPrice,
      licenseStatus: {
        teachers: {
          used: currentTeacherCount,
          available: teacherLicenses,
          hasCapacity: teacherLicenses === -1 || currentTeacherCount < teacherLicenses,
        },
        students: {
          used: currentStudentCount,
          available: studentLicenses,
          hasCapacity: currentStudentCount < studentLicenses,
        },
      },
    };
  }

  // Calculate monthly price based on actual teacher/student count
  async calculateSchoolMonthlyPrice(schoolId: number) {
    const subscription = await db
      .select({
        planType: subscriptions.planType,
      })
      .from(subscriptions)
      .where(eq(subscriptions.schoolId, schoolId))
      .orderBy(desc(subscriptions.createdAt))
      .limit(1);

    if (!subscription.length) {
      throw new Error("No subscription found for school");
    }

    const sub = subscription[0];
    const plan = getPlanByType(sub.planType);
    const planPrice = plan.price;
    const planName = plan.name;
    const teacherLicenses = getTeacherLimit(sub.planType);
    const studentLicenses = getStudentLimit(sub.planType);

    // Get current counts from billing summary
    const billingSummary = await db
      .select({
        teacherCount: schoolBillingSummary.teacherCount,
        studentCount: schoolBillingSummary.studentCount,
      })
      .from(schoolBillingSummary)
      .where(eq(schoolBillingSummary.schoolId, schoolId))
      .limit(1);

    const currentTeacherCount = billingSummary[0]?.teacherCount ?? 0;
    const currentStudentCount = billingSummary[0]?.studentCount ?? 0;

    let totalPrice = planPrice; // Base plan price
    let breakdown = {
      basePlan: {
        name: planName,
        price: planPrice,
        includedTeachers: teacherLicenses,
        includedStudents: studentLicenses,
      },
      additionalCosts: [] as any[],
      total: planPrice,
    };

    // Calculate extra student licenses needed beyond plan limits
    const extraStudentsNeeded = Math.max(0, currentStudentCount - studentLicenses);
    if (extraStudentsNeeded > 0) {
      const extraStudentCost = this.calculateExtraStudentPrice(extraStudentsNeeded);
      totalPrice += extraStudentCost;
      breakdown.additionalCosts.push({
        type: 'extra_students',
        description: `${extraStudentsNeeded} extra student licenses`,
        quantity: extraStudentsNeeded,
        unitPrice: 450, // per 5 students
        totalPrice: extraStudentCost,
      });
    }

    // For Standard plan, check if teacher count exceeds limit
    if (teacherLicenses !== -1 && currentTeacherCount > teacherLicenses) {
      // Automatically upgrade to Pro if teacher limit exceeded
      const proPlan = subscriptionPlans.pro;
      const proPlanPrice = proPlan.price;
      totalPrice = proPlanPrice;
      breakdown.basePlan = {
        name: proPlan.name,
        price: proPlanPrice,
        includedTeachers: -1, // Unlimited
        includedStudents: getStudentLimit('pro'),
      };
      breakdown.additionalCosts.push({
        type: 'auto_upgrade',
        description: `Automatic upgrade to Pro (${currentTeacherCount} teachers exceed Standard limit)`,
        totalPrice: proPlanPrice - planPrice,
      });
    }

    breakdown.total = totalPrice;

    // Add convenience properties for compatibility with enhanced-stripe-service
    const extraStudentsForReturn = Math.max(0, currentStudentCount - studentLicenses);
    return {
      ...breakdown,
      // Convenience properties for backwards compatibility
      plan: breakdown.basePlan.name.toLowerCase().includes('pro') ? 'pro' : 'standard',
      planName: breakdown.basePlan.name,
      teacherCount: currentTeacherCount,
      studentCount: currentStudentCount,
      totalPrice: totalPrice,
      basePrice: breakdown.basePlan.price,
      extraStudents: extraStudentsForReturn,
    };
  }

  // Calculate pricing for extra student licenses
  calculateExtraStudentPrice(extraLicenses: number): number {
    const pricePerBlock = 450; // in cents
    const studentsPerBlock = 5;
    const blocks = Math.ceil(extraLicenses / studentsPerBlock);
    return blocks * pricePerBlock;
  }

  // Create monthly invoice and process payment
  async createMonthlyInvoice(schoolId?: number, userId?: number) {
    let subscription;
    let pricing;
    let customerId;
    let subscriptionId;

    if (schoolId) {
      // School subscription billing
      const schoolSub = await db
        .select()
        .from(subscriptions)
        .where(eq(subscriptions.schoolId, schoolId))
        .orderBy(desc(subscriptions.createdAt))
        .limit(1);

      if (!schoolSub.length || schoolSub[0].status === 'trial') {
        return null; // No billing during trial
      }

      subscription = schoolSub[0];
      pricing = await this.calculateSchoolMonthlyPrice(schoolId);
      customerId = subscription.stripeCustomerId;
      subscriptionId = subscription.stripeSubscriptionId;

    } else if (userId) {
      // Individual teacher billing - find subscription by school association
      const teacherUser = await db
        .select()
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (!teacherUser.length || !teacherUser[0].schoolId) {
        return null;
      }

      const teacherSchoolId = teacherUser[0].schoolId;
      const teacherSub = await db
        .select()
        .from(subscriptions)
        .where(eq(subscriptions.schoolId, teacherSchoolId))
        .orderBy(desc(subscriptions.createdAt))
        .limit(1);

      if (!teacherSub.length || teacherSub[0].status === 'trial') {
        return null; // No billing during trial
      }

      subscription = teacherSub[0];
      pricing = await this.calculateTeacherMonthlyPrice(userId);
      customerId = subscription.stripeCustomerId;
      subscriptionId = subscription.stripeSubscriptionId;
    }

    if (!subscription || !customerId) {
      throw new Error("No valid subscription found for billing");
    }

    const billingMonth = format(new Date(), 'yyyy-MM');
    const description = schoolId
      ? `MusicDott subscription for ${billingMonth}`
      : `MusicDott teacher subscription for ${billingMonth}`;

    // Get pricing information
    if (!pricing) {
      throw new Error("Unable to calculate pricing for subscription");
    }

    // Record payment intent in history
    const [paymentRecord] = await db
      .insert(paymentHistoryTable)
      .values({
        schoolId: schoolId || subscription.schoolId,
        amount: pricing.total,
        status: 'pending',
        description,
      })
      .returning();

    return {
      paymentRecord,
      pricing,
      customerId,
      subscriptionId,
    };
  }

  // Get subscription summary for billing dashboard
  async getSubscriptionSummary(userId: number) {
    const user = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user.length) {
      throw new Error("User not found");
    }

    const userData = user[0];

    // Get payment history for the school
    let payments: any[] = [];
    if (userData.schoolId) {
      payments = await db
        .select()
        .from(paymentHistoryTable)
        .where(eq(paymentHistoryTable.schoolId, userData.schoolId))
        .orderBy(desc(paymentHistoryTable.createdAt))
        .limit(12);
    }

    return {
      paymentHistory: payments,
      user: userData
    };
  }

  // Calculate teacher subscription pricing
  async calculateTeacherMonthlyPrice(userId: number) {
    // Find the teacher's school to get subscription info
    const teacherUser = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!teacherUser.length || !teacherUser[0].schoolId) {
      throw new Error("No subscription found for teacher");
    }

    const teacherSchoolId = teacherUser[0].schoolId;
    const subscription = await db
      .select({
        planType: subscriptions.planType,
      })
      .from(subscriptions)
      .where(eq(subscriptions.schoolId, teacherSchoolId))
      .orderBy(desc(subscriptions.createdAt))
      .limit(1);

    if (!subscription.length) {
      throw new Error("No subscription found for teacher");
    }

    const sub = subscription[0];
    const plan = getPlanByType(sub.planType);
    const planPrice = plan.price;
    const studentLicenses = getStudentLimit(sub.planType);

    // Count students assigned to this teacher
    const [studentCountResult] = await db
      .select({ count: count() })
      .from(students)
      .where(eq(students.assignedTeacherId, userId));

    const currentStudentCount = studentCountResult?.count ?? 0;

    let totalPrice = planPrice;
    const breakdown = {
      basePlan: {
        name: plan.name,
        price: planPrice,
        includedStudents: studentLicenses,
      },
      additionalCosts: [] as any[],
      total: planPrice,
    };

    // Calculate extra student licenses if needed
    const extraStudentsNeeded = Math.max(0, currentStudentCount - studentLicenses);
    if (extraStudentsNeeded > 0) {
      const extraStudentCost = this.calculateExtraStudentPrice(extraStudentsNeeded);
      totalPrice += extraStudentCost;
      breakdown.additionalCosts.push({
        type: 'extra_students',
        description: `${extraStudentsNeeded} extra student licenses`,
        quantity: extraStudentsNeeded,
        unitPrice: 450,
        totalPrice: extraStudentCost,
      });
    }

    breakdown.total = totalPrice;
    return breakdown;
  }

  // Update license usage counts
  async updateLicenseUsage(subscriptionId: number, type: 'school' | 'teacher') {
    if (type === 'school') {
      const subscription = await db
        .select({ schoolId: subscriptions.schoolId })
        .from(subscriptions)
        .where(eq(subscriptions.id, subscriptionId))
        .limit(1);

      if (!subscription.length) return;

      const schoolId = subscription[0].schoolId;

      // Count active teachers in school
      const [teacherCount] = await db
        .select({ count: count() })
        .from(users)
        .where(
          and(
            eq(users.schoolId, schoolId),
            eq(users.role, 'teacher')
          )
        );

      // Count active students in school
      const [studentCount] = await db
        .select({ count: count() })
        .from(users)
        .where(
          and(
            eq(users.schoolId, schoolId),
            eq(users.role, 'student')
          )
        );

      // Update billing summary with current counts
      const existingSummary = await db
        .select()
        .from(schoolBillingSummary)
        .where(eq(schoolBillingSummary.schoolId, schoolId))
        .limit(1);

      if (existingSummary.length) {
        await db
          .update(schoolBillingSummary)
          .set({
            teacherCount: teacherCount.count,
            studentCount: studentCount.count,
            updatedAt: new Date(),
          })
          .where(eq(schoolBillingSummary.schoolId, schoolId));
      } else {
        await db
          .insert(schoolBillingSummary)
          .values({
            schoolId,
            teacherCount: teacherCount.count,
            studentCount: studentCount.count,
          });
      }

    } else {
      // For teacher type, find their school and update
      // Since subscriptions are school-based, look up the school
      const subscription = await db
        .select({ schoolId: subscriptions.schoolId })
        .from(subscriptions)
        .where(eq(subscriptions.id, subscriptionId))
        .limit(1);

      if (!subscription.length) return;

      const schoolId = subscription[0].schoolId;

      // Count students in the school
      const [studentCount] = await db
        .select({ count: count() })
        .from(students)
        .where(eq(students.schoolId, schoolId));

      // Update billing summary with student count
      const existingSummary = await db
        .select()
        .from(schoolBillingSummary)
        .where(eq(schoolBillingSummary.schoolId, schoolId))
        .limit(1);

      if (existingSummary.length) {
        await db
          .update(schoolBillingSummary)
          .set({
            studentCount: studentCount.count,
            updatedAt: new Date(),
          })
          .where(eq(schoolBillingSummary.schoolId, schoolId));
      } else {
        await db
          .insert(schoolBillingSummary)
          .values({
            schoolId,
            studentCount: studentCount.count,
          });
      }
    }
  }

  // Create 30-day trial for new school
  async createSchoolTrial(schoolId: number) {
    const plan = subscriptionPlans.standard;
    const studentLicenses = getStudentLimit('standard');
    const teacherLicenses = getTeacherLimit('standard');

    const trialStart = startOfDay(new Date());
    const trialEnd = addDays(trialStart, 30);

    const [subscription] = await db
      .insert(subscriptions)
      .values({
        schoolId,
        planType: 'standard',
        status: 'trial',
        currentPeriodStart: trialStart,
        currentPeriodEnd: trialEnd,
      })
      .returning();

    return {
      hasAccess: true,
      subscriptionType: 'school',
      status: 'trial',
      planName: plan.name,
      isTrialActive: true,
      trialDaysRemaining: 30,
      pricing: {
        basePlan: {
          name: plan.name,
          price: plan.price,
          includedTeachers: teacherLicenses,
          includedStudents: studentLicenses,
        },
        additionalCosts: [],
        total: plan.price,
      },
    };
  }

  // Check individual teacher subscription
  async checkTeacherSubscription(userId: number) {
    // Find teacher's school
    const teacherUser = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!teacherUser.length || !teacherUser[0].schoolId) {
      return await this.createTeacherTrial(userId);
    }

    const teacherSchoolId = teacherUser[0].schoolId;

    const subscription = await db
      .select({
        id: subscriptions.id,
        status: subscriptions.status,
        planType: subscriptions.planType,
        currentPeriodEnd: subscriptions.currentPeriodEnd,
      })
      .from(subscriptions)
      .where(eq(subscriptions.schoolId, teacherSchoolId))
      .orderBy(desc(subscriptions.createdAt))
      .limit(1);

    if (!subscription.length) {
      return await this.createTeacherTrial(userId);
    }

    const sub = subscription[0];
    const plan = getPlanByType(sub.planType);
    const studentLicenses = getStudentLimit(sub.planType);

    await this.updateLicenseUsage(sub.id, 'teacher');

    // Count students assigned to this teacher
    const [studentCountResult] = await db
      .select({ count: count() })
      .from(students)
      .where(eq(students.assignedTeacherId, userId));

    const currentStudentCount = studentCountResult?.count ?? 0;

    const now = new Date();
    const periodEnd = sub.currentPeriodEnd ? new Date(sub.currentPeriodEnd) : now;
    const isTrialActive = sub.status === 'trial' && now < periodEnd;
    const trialDaysRemaining = isTrialActive
      ? Math.ceil((periodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      : 0;

    const pricing = await this.calculateTeacherMonthlyPrice(userId);

    return {
      hasAccess: sub.status === 'active' || isTrialActive,
      subscriptionType: 'teacher',
      status: sub.status,
      planName: plan.name,
      isTrialActive,
      trialDaysRemaining,
      pricing,
      licenseStatus: {
        students: {
          used: currentStudentCount,
          available: studentLicenses,
          hasCapacity: currentStudentCount < studentLicenses,
        },
      },
    };
  }

  // Create 30-day trial for independent teacher
  async createTeacherTrial(userId: number) {
    const plan = subscriptionPlans.standard;
    const studentLicenses = getStudentLimit('standard');

    // Find or create a school association for the teacher
    const teacherUser = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!teacherUser.length || !teacherUser[0].schoolId) {
      // Teacher has no school - return trial info without creating subscription
      return {
        hasAccess: true,
        subscriptionType: 'teacher',
        status: 'trial',
        planName: plan.name,
        isTrialActive: true,
        trialDaysRemaining: 30,
        pricing: {
          basePlan: {
            name: plan.name,
            price: plan.price,
            includedStudents: studentLicenses,
          },
          additionalCosts: [],
          total: plan.price,
        },
      };
    }

    const trialStart = startOfDay(new Date());
    const trialEnd = addDays(trialStart, 30);

    await db
      .insert(subscriptions)
      .values({
        schoolId: teacherUser[0].schoolId,
        planType: 'standard',
        status: 'trial',
        currentPeriodStart: trialStart,
        currentPeriodEnd: trialEnd,
      });

    return {
      hasAccess: true,
      subscriptionType: 'teacher',
      status: 'trial',
      planName: plan.name,
      isTrialActive: true,
      trialDaysRemaining: 30,
      pricing: {
        basePlan: {
          name: plan.name,
          price: plan.price,
          includedStudents: studentLicenses,
        },
        additionalCosts: [],
        total: plan.price,
      },
    };
  }
}

export const subscriptionService = new SubscriptionService();
