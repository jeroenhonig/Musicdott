import { db } from "../db";
import {
  subscriptionPlans,
  schoolSubscriptions,
  teacherSubscriptions,
  paymentHistory as paymentHistoryTable,
  users,
  students,
  schools
} from "@shared/schema";
import { eq, and, count, desc } from "drizzle-orm";
import { addDays, addMonths, startOfDay, format } from "date-fns";

// Consistent pricing breakdown type used across all services
export interface PricingBreakdown {
  plan: string;           // plan name (e.g. 'standaard', 'pro')
  teacherCount: number;
  studentCount: number;
  basePrice: number;      // in cents
  extraStudents: number;
  extraStudentCost: number; // in cents
  totalPrice: number;     // in cents (the canonical billing amount)
  autoUpgraded: boolean;
  basePlan: {
    name: string;
    price: number;        // in cents
    includedTeachers: number;
    includedStudents: number;
  };
  additionalCosts: {
    type: string;
    description: string;
    quantity?: number;
    unitPrice?: number;   // in cents
    totalPrice: number;   // in cents
  }[];
  total: number;          // in cents (alias for totalPrice)
}

export class SubscriptionService {
  // Get all active subscription plans from the database
  async getSubscriptionPlans() {
    return await db
      .select()
      .from(subscriptionPlans)
      .where(eq(subscriptionPlans.isActive, true))
      .orderBy(subscriptionPlans.priceMonthly);
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

    // Special unlimited access for the owner account
    if (userData.username === 'Drumschoolstefanvandebrug') {
      return {
        hasAccess: true,
        subscriptionType: 'unlimited',
        status: 'active',
        planName: 'Owner Account - Unlimited',
        isTrialActive: false,
        trialDaysRemaining: 0,
        licenseStatus: {
          teachers: { used: 0, available: 999999, hasCapacity: true },
          students: { used: 0, available: 999999, hasCapacity: true },
        },
        pricing: {
          plan: 'unlimited',
          teacherCount: 0,
          studentCount: 0,
          basePrice: 0,
          extraStudents: 0,
          extraStudentCost: 0,
          totalPrice: 0,
          autoUpgraded: false,
          basePlan: { name: 'Owner Account - Unlimited', price: 0, includedTeachers: 999999, includedStudents: 999999 },
          additionalCosts: [],
          total: 0,
        } as PricingBreakdown,
      };
    }

    // School member → check school subscription
    if (userData.schoolId) {
      return await this.checkSchoolSubscription(userData.schoolId);
    }

    // Independent teacher → check personal subscription
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
        id: schoolSubscriptions.id,
        status: schoolSubscriptions.status,
        planId: schoolSubscriptions.planId,
        trialEndDate: schoolSubscriptions.trialEndDate,
        totalStudentLicenses: schoolSubscriptions.totalStudentLicenses,
        currentTeacherCount: schoolSubscriptions.currentTeacherCount,
        currentStudentCount: schoolSubscriptions.currentStudentCount,
        planName: subscriptionPlans.name,
        teacherLicenses: subscriptionPlans.teacherLicenses,
        planPrice: subscriptionPlans.priceMonthly,
        studentLicenses: subscriptionPlans.studentLicenses,
      })
      .from(schoolSubscriptions)
      .innerJoin(subscriptionPlans, eq(schoolSubscriptions.planId, subscriptionPlans.id))
      .where(eq(schoolSubscriptions.schoolId, schoolId))
      .orderBy(desc(schoolSubscriptions.createdAt))
      .limit(1);

    if (!subscription.length) {
      return await this.createSchoolTrial(schoolId);
    }

    const sub = subscription[0];

    // Refresh usage counts from actual DB
    await this.updateLicenseUsage(sub.id, 'school');

    const now = new Date();
    const isTrialActive = sub.status === 'trial' && sub.trialEndDate && now < new Date(sub.trialEndDate);
    const trialDaysRemaining = isTrialActive && sub.trialEndDate
      ? Math.ceil((new Date(sub.trialEndDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      : 0;

    const pricing = await this.calculateSchoolMonthlyPrice(schoolId);

    return {
      hasAccess: sub.status === 'active' || isTrialActive,
      subscriptionType: 'school',
      status: sub.status,
      planName: sub.planName,
      isTrialActive,
      trialDaysRemaining,
      pricing,
      licenseStatus: {
        teachers: {
          used: sub.currentTeacherCount ?? 0,
          available: sub.teacherLicenses,
          hasCapacity: sub.teacherLicenses === -1 || (sub.currentTeacherCount ?? 0) < sub.teacherLicenses,
        },
        students: {
          used: sub.currentStudentCount ?? 0,
          available: sub.totalStudentLicenses ?? 25,
          hasCapacity: (sub.currentStudentCount ?? 0) < (sub.totalStudentLicenses ?? 25),
        },
      },
    };
  }

  // Calculate monthly price based on actual teacher/student count.
  // Returns a PricingBreakdown with consistent properties used by ALL services.
  async calculateSchoolMonthlyPrice(schoolId: number): Promise<PricingBreakdown> {
    const subscription = await db
      .select({
        planId: schoolSubscriptions.planId,
        currentTeacherCount: schoolSubscriptions.currentTeacherCount,
        currentStudentCount: schoolSubscriptions.currentStudentCount,
        planPrice: subscriptionPlans.priceMonthly,
        planName: subscriptionPlans.name,
        teacherLicenses: subscriptionPlans.teacherLicenses,
        studentLicenses: subscriptionPlans.studentLicenses,
      })
      .from(schoolSubscriptions)
      .innerJoin(subscriptionPlans, eq(schoolSubscriptions.planId, subscriptionPlans.id))
      .where(eq(schoolSubscriptions.schoolId, schoolId))
      .orderBy(desc(schoolSubscriptions.createdAt))
      .limit(1);

    if (!subscription.length) {
      throw new Error("No subscription found for school");
    }

    const sub = subscription[0];
    const teacherCount = sub.currentTeacherCount ?? 0;
    const studentCount = sub.currentStudentCount ?? 0;
    let activePlan = sub.planName;
    let basePrice = sub.planPrice;
    let teacherLicenses = sub.teacherLicenses;
    let studentLicenses = sub.studentLicenses;
    let autoUpgraded = false;
    const additionalCosts: PricingBreakdown['additionalCosts'] = [];

    // Auto-upgrade to pro when teacher count exceeds standaard limit
    if (sub.teacherLicenses !== -1 && teacherCount > sub.teacherLicenses) {
      const [proPlan] = await db
        .select()
        .from(subscriptionPlans)
        .where(and(eq(subscriptionPlans.name, 'pro'), eq(subscriptionPlans.isActive, true)))
        .limit(1);

      if (proPlan) {
        autoUpgraded = true;
        const upgradeCost = proPlan.priceMonthly - sub.planPrice;
        activePlan = proPlan.name;
        basePrice = proPlan.priceMonthly;
        teacherLicenses = proPlan.teacherLicenses; // -1 = unlimited
        studentLicenses = proPlan.studentLicenses;
        additionalCosts.push({
          type: 'auto_upgrade',
          description: `Automatische upgrade naar Pro (${teacherCount} leraren overschrijden Standaard limiet)`,
          totalPrice: upgradeCost,
        });
      }
    }

    // Extra student licenses in blocks of 5 (€4.50 per block)
    // studentLicenses === -1 means unlimited → no extra charges
    const extraStudents = studentLicenses === -1 ? 0 : Math.max(0, studentCount - studentLicenses);
    const extraStudentCost = this.calculateExtraStudentPrice(extraStudents);
    if (extraStudents > 0) {
      additionalCosts.push({
        type: 'extra_students',
        description: `${extraStudents} extra leerlingen (${Math.ceil(extraStudents / 5)} blokken × €4,50)`,
        quantity: extraStudents,
        unitPrice: 450,
        totalPrice: extraStudentCost,
      });
    }

    const totalPrice = basePrice + extraStudentCost;

    return {
      plan: activePlan,
      teacherCount,
      studentCount,
      basePrice,
      extraStudents,
      extraStudentCost,
      totalPrice,
      autoUpgraded,
      basePlan: {
        name: activePlan,
        price: basePrice,
        includedTeachers: teacherLicenses,
        includedStudents: studentLicenses,
      },
      additionalCosts,
      total: totalPrice,
    };
  }

  // €4.50 per block of 5 students, always rounded up
  calculateExtraStudentPrice(extraLicenses: number): number {
    if (extraLicenses <= 0) return 0;
    const pricePerBlock = 450; // €4.50 in cents
    const studentsPerBlock = 5;
    return Math.ceil(extraLicenses / studentsPerBlock) * pricePerBlock;
  }

  // Create monthly invoice record (sets status to 'pending' — webhook updates to succeeded/failed)
  async createMonthlyInvoice(schoolId?: number, userId?: number) {
    let subscription;
    let pricing: PricingBreakdown;
    let customerId: string | null = null;
    let subscriptionStripeId: string | null = null;

    if (schoolId) {
      const [schoolSub] = await db
        .select()
        .from(schoolSubscriptions)
        .where(eq(schoolSubscriptions.schoolId, schoolId))
        .orderBy(desc(schoolSubscriptions.createdAt))
        .limit(1);

      if (!schoolSub || schoolSub.status === 'trial') {
        return null;
      }

      subscription = schoolSub;
      pricing = await this.calculateSchoolMonthlyPrice(schoolId);
      customerId = subscription.stripeCustomerId;
      subscriptionStripeId = subscription.stripeSubscriptionId;

    } else if (userId) {
      const [teacherSub] = await db
        .select()
        .from(teacherSubscriptions)
        .where(eq(teacherSubscriptions.userId, userId))
        .orderBy(desc(teacherSubscriptions.createdAt))
        .limit(1);

      if (!teacherSub || teacherSub.status === 'trial') {
        return null;
      }

      subscription = teacherSub;
      pricing = await this.calculateTeacherMonthlyPrice(userId);
      customerId = subscription.stripeCustomerId;
      subscriptionStripeId = subscription.stripeSubscriptionId;
    } else {
      throw new Error("Either schoolId or userId is required");
    }

    if (!subscription || !customerId) {
      throw new Error("No valid subscription found for billing");
    }

    const billingMonth = format(new Date(), 'yyyy-MM');
    const description = schoolId
      ? `MusicDott abonnement ${billingMonth}`
      : `MusicDott leraar abonnement ${billingMonth}`;

    // Status starts as 'pending' — Stripe webhook updates to 'succeeded' or 'failed'
    const [paymentRecord] = await db
      .insert(paymentHistoryTable)
      .values({
        schoolId: schoolId ?? null,
        userId: userId ?? null,
        amount: pricing!.totalPrice,
        currency: 'eur',
        status: 'pending',
        description,
        billingMonth,
        paymentDate: new Date(),
      })
      .returning();

    return {
      paymentRecord,
      pricing: pricing!,
      customerId,
      subscriptionStripeId,
    };
  }

  // Get subscription summary for billing dashboard
  async getSubscriptionSummary(userId: number) {
    const [userData] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!userData) {
      throw new Error("User not found");
    }

    const payments = await db
      .select()
      .from(paymentHistoryTable)
      .where(
        userData.schoolId
          ? eq(paymentHistoryTable.schoolId, userData.schoolId)
          : eq(paymentHistoryTable.userId, userId)
      )
      .orderBy(desc(paymentHistoryTable.createdAt))
      .limit(12);

    return {
      paymentHistory: payments,
      user: userData,
    };
  }

  // Calculate teacher subscription pricing
  async calculateTeacherMonthlyPrice(userId: number): Promise<PricingBreakdown> {
    const subscription = await db
      .select({
        planId: teacherSubscriptions.planId,
        currentStudentCount: teacherSubscriptions.currentStudentCount,
        planPrice: subscriptionPlans.priceMonthly,
        planName: subscriptionPlans.name,
        studentLicenses: subscriptionPlans.studentLicenses,
      })
      .from(teacherSubscriptions)
      .innerJoin(subscriptionPlans, eq(teacherSubscriptions.planId, subscriptionPlans.id))
      .where(eq(teacherSubscriptions.userId, userId))
      .orderBy(desc(teacherSubscriptions.createdAt))
      .limit(1);

    if (!subscription.length) {
      throw new Error("No subscription found for teacher");
    }

    const sub = subscription[0];
    const studentCount = sub.currentStudentCount ?? 0;
    const extraStudents = Math.max(0, studentCount - sub.studentLicenses);
    const extraStudentCost = this.calculateExtraStudentPrice(extraStudents);
    const totalPrice = sub.planPrice + extraStudentCost;
    const additionalCosts: PricingBreakdown['additionalCosts'] = [];

    if (extraStudents > 0) {
      additionalCosts.push({
        type: 'extra_students',
        description: `${extraStudents} extra leerlingen (${Math.ceil(extraStudents / 5)} blokken × €4,50)`,
        quantity: extraStudents,
        unitPrice: 450,
        totalPrice: extraStudentCost,
      });
    }

    return {
      plan: sub.planName,
      teacherCount: 1,
      studentCount,
      basePrice: sub.planPrice,
      extraStudents,
      extraStudentCost,
      totalPrice,
      autoUpgraded: false,
      basePlan: {
        name: sub.planName,
        price: sub.planPrice,
        includedTeachers: 1,
        includedStudents: sub.studentLicenses,
      },
      additionalCosts,
      total: totalPrice,
    };
  }

  // Update license usage counts from actual DB records
  async updateLicenseUsage(subscriptionId: number, type: 'school' | 'teacher') {
    if (type === 'school') {
      const [sub] = await db
        .select({ schoolId: schoolSubscriptions.schoolId })
        .from(schoolSubscriptions)
        .where(eq(schoolSubscriptions.id, subscriptionId))
        .limit(1);

      if (!sub?.schoolId) return;

      const [teacherResult] = await db
        .select({ count: count() })
        .from(users)
        .where(and(eq(users.schoolId, sub.schoolId), eq(users.role, 'teacher')));

      const [studentResult] = await db
        .select({ count: count() })
        .from(users)
        .where(and(eq(users.schoolId, sub.schoolId), eq(users.role, 'student')));

      await db
        .update(schoolSubscriptions)
        .set({
          currentTeacherCount: teacherResult.count,
          currentStudentCount: studentResult.count,
          updatedAt: new Date(),
        })
        .where(eq(schoolSubscriptions.id, subscriptionId));

    } else {
      const [sub] = await db
        .select({ userId: teacherSubscriptions.userId })
        .from(teacherSubscriptions)
        .where(eq(teacherSubscriptions.id, subscriptionId))
        .limit(1);

      if (!sub?.userId) return;

      const [studentResult] = await db
        .select({ count: count() })
        .from(students)
        .where(eq(students.assignedTeacherId, sub.userId));

      await db
        .update(teacherSubscriptions)
        .set({
          currentStudentCount: studentResult.count,
          updatedAt: new Date(),
        })
        .where(eq(teacherSubscriptions.id, subscriptionId));
    }
  }

  // Create 30-day trial for new school
  async createSchoolTrial(schoolId: number) {
    const plans = await this.getSubscriptionPlans();
    const standaardPlan = plans.find(p => p.name === 'standaard');

    if (!standaardPlan) {
      throw new Error("Default subscription plan 'standaard' not found in database");
    }

    const trialStart = startOfDay(new Date());
    const trialEnd = addDays(trialStart, 30);

    const [subscription] = await db
      .insert(schoolSubscriptions)
      .values({
        schoolId,
        planId: standaardPlan.id,
        planType: standaardPlan.name,
        status: 'trial',
        trialStartDate: trialStart,
        trialEndDate: trialEnd,
        totalStudentLicenses: standaardPlan.studentLicenses,
        extraStudentLicenses: 0,
        currentTeacherCount: 0,
        currentStudentCount: 0,
      })
      .returning();

    return {
      hasAccess: true,
      subscriptionType: 'school',
      status: 'trial',
      planName: standaardPlan.name,
      isTrialActive: true,
      trialDaysRemaining: 30,
      pricing: {
        plan: standaardPlan.name,
        teacherCount: 0,
        studentCount: 0,
        basePrice: standaardPlan.priceMonthly,
        extraStudents: 0,
        extraStudentCost: 0,
        totalPrice: standaardPlan.priceMonthly,
        autoUpgraded: false,
        basePlan: {
          name: standaardPlan.name,
          price: standaardPlan.priceMonthly,
          includedTeachers: standaardPlan.teacherLicenses,
          includedStudents: standaardPlan.studentLicenses,
        },
        additionalCosts: [],
        total: standaardPlan.priceMonthly,
      } as PricingBreakdown,
    };
  }

  // Check individual teacher subscription
  async checkTeacherSubscription(userId: number) {
    const subscription = await db
      .select({
        id: teacherSubscriptions.id,
        status: teacherSubscriptions.status,
        planId: teacherSubscriptions.planId,
        trialEndDate: teacherSubscriptions.trialEndDate,
        totalStudentLicenses: teacherSubscriptions.totalStudentLicenses,
        currentStudentCount: teacherSubscriptions.currentStudentCount,
        planName: subscriptionPlans.name,
      })
      .from(teacherSubscriptions)
      .innerJoin(subscriptionPlans, eq(teacherSubscriptions.planId, subscriptionPlans.id))
      .where(eq(teacherSubscriptions.userId, userId))
      .orderBy(desc(teacherSubscriptions.createdAt))
      .limit(1);

    if (!subscription.length) {
      return await this.createTeacherTrial(userId);
    }

    const sub = subscription[0];
    await this.updateLicenseUsage(sub.id, 'teacher');

    const now = new Date();
    const isTrialActive = sub.status === 'trial' && sub.trialEndDate && now < new Date(sub.trialEndDate);
    const trialDaysRemaining = isTrialActive && sub.trialEndDate
      ? Math.ceil((new Date(sub.trialEndDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      : 0;

    const pricing = await this.calculateTeacherMonthlyPrice(userId);

    return {
      hasAccess: sub.status === 'active' || isTrialActive,
      subscriptionType: 'teacher',
      status: sub.status,
      planName: sub.planName,
      isTrialActive,
      trialDaysRemaining,
      pricing,
      licenseStatus: {
        students: {
          used: sub.currentStudentCount ?? 0,
          available: sub.totalStudentLicenses ?? 25,
          hasCapacity: (sub.currentStudentCount ?? 0) < (sub.totalStudentLicenses ?? 25),
        },
      },
    };
  }

  // Create 30-day trial for independent teacher
  async createTeacherTrial(userId: number) {
    const plans = await this.getSubscriptionPlans();
    const standaardPlan = plans.find(p => p.name === 'standaard');

    if (!standaardPlan) {
      throw new Error("Default subscription plan 'standaard' not found in database");
    }

    const trialStart = startOfDay(new Date());
    const trialEnd = addDays(trialStart, 30);

    await db
      .insert(teacherSubscriptions)
      .values({
        userId,
        planId: standaardPlan.id,
        planType: standaardPlan.name,
        status: 'trial',
        trialStartDate: trialStart,
        trialEndDate: trialEnd,
        totalStudentLicenses: standaardPlan.studentLicenses,
        extraStudentLicenses: 0,
        currentStudentCount: 0,
      });

    return {
      hasAccess: true,
      subscriptionType: 'teacher',
      status: 'trial',
      planName: standaardPlan.name,
      isTrialActive: true,
      trialDaysRemaining: 30,
      pricing: {
        plan: standaardPlan.name,
        teacherCount: 1,
        studentCount: 0,
        basePrice: standaardPlan.priceMonthly,
        extraStudents: 0,
        extraStudentCost: 0,
        totalPrice: standaardPlan.priceMonthly,
        autoUpgraded: false,
        basePlan: {
          name: standaardPlan.name,
          price: standaardPlan.priceMonthly,
          includedTeachers: 1,
          includedStudents: standaardPlan.studentLicenses,
        },
        additionalCosts: [],
        total: standaardPlan.priceMonthly,
      } as PricingBreakdown,
    };
  }
}

export const subscriptionService = new SubscriptionService();
