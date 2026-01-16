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

export class SubscriptionService {
  // Get all available subscription plans
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
    
    // Update current usage counts
    await this.updateLicenseUsage(sub.id, 'school');
    
    const now = new Date();
    const trialEnd = new Date(sub.trialEndDate);
    const isTrialActive = sub.status === 'trial' && now < trialEnd;
    const trialDaysRemaining = isTrialActive 
      ? Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      : 0;

    // Calculate automatic pricing based on actual usage
    const currentMonthlyPrice = await this.calculateSchoolMonthlyPrice(schoolId);

    return {
      hasAccess: sub.status === 'active' || isTrialActive,
      subscriptionType: 'school',
      status: sub.status,
      planName: sub.planName,
      isTrialActive,
      trialDaysRemaining,
      pricing: currentMonthlyPrice,
      licenseStatus: {
        teachers: {
          used: sub.currentTeacherCount,
          available: sub.teacherLicenses,
          hasCapacity: sub.teacherLicenses === -1 || sub.currentTeacherCount < sub.teacherLicenses,
        },
        students: {
          used: sub.currentStudentCount,
          available: sub.totalStudentLicenses,
          hasCapacity: sub.currentStudentCount < sub.totalStudentLicenses,
        },
      },
    };
  }

  // Calculate monthly price based on actual teacher/student count
  async calculateSchoolMonthlyPrice(schoolId: number) {
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
    let totalPrice = sub.planPrice; // Base plan price
    let breakdown = {
      basePlan: {
        name: sub.planName,
        price: sub.planPrice,
        includedTeachers: sub.teacherLicenses,
        includedStudents: sub.studentLicenses,
      },
      additionalCosts: [] as any[],
      total: sub.planPrice,
    };

    // Calculate extra student licenses needed beyond plan limits
    const extraStudentsNeeded = Math.max(0, sub.currentStudentCount - sub.studentLicenses);
    if (extraStudentsNeeded > 0) {
      const extraStudentCost = this.calculateExtraStudentPrice(extraStudentsNeeded);
      totalPrice += extraStudentCost;
      breakdown.additionalCosts.push({
        type: 'extra_students',
        description: `${extraStudentsNeeded} extra student licenses`,
        quantity: extraStudentsNeeded,
        unitPrice: 450, // €4.50 per 5 students
        totalPrice: extraStudentCost,
      });
    }

    // For Standaard plan, check if teacher count exceeds limit
    if (sub.teacherLicenses !== -1 && sub.currentTeacherCount > sub.teacherLicenses) {
      // Automatically upgrade to Pro if teacher limit exceeded
      const proPlans = await db
        .select()
        .from(subscriptionPlans)
        .where(and(
          eq(subscriptionPlans.name, 'pro'),
          eq(subscriptionPlans.isActive, true)
        ))
        .limit(1);

      if (proPlans.length) {
        const proPlan = proPlans[0];
        totalPrice = proPlan.priceMonthly;
        breakdown.basePlan = {
          name: proPlan.name,
          price: proPlan.priceMonthly,
          includedTeachers: -1, // Unlimited
          includedStudents: proPlan.studentLicenses,
        };
        breakdown.additionalCosts.push({
          type: 'auto_upgrade',
          description: `Automatic upgrade to Pro (${sub.currentTeacherCount} teachers exceed Standaard limit)`,
          totalPrice: proPlan.priceMonthly - sub.planPrice,
        });
      }
    }

    breakdown.total = totalPrice;
    return breakdown;
  }

  // Calculate pricing for extra student licenses (€4.50 per 5 students)
  calculateExtraStudentPrice(extraLicenses: number): number {
    const pricePerBlock = 450; // €4.50 in cents
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
        .from(schoolSubscriptions)
        .where(eq(schoolSubscriptions.schoolId, schoolId))
        .orderBy(desc(schoolSubscriptions.createdAt))
        .limit(1);

      if (!schoolSub.length || schoolSub[0].status === 'trial') {
        return null; // No billing during trial
      }

      subscription = schoolSub[0];
      pricing = await this.calculateSchoolMonthlyPrice(schoolId);
      customerId = subscription.stripeCustomerId;
      subscriptionId = subscription.stripeSubscriptionId;

    } else if (userId) {
      // Individual teacher billing
      const teacherSub = await db
        .select()
        .from(teacherSubscriptions)
        .where(eq(teacherSubscriptions.userId, userId))
        .orderBy(desc(teacherSubscriptions.createdAt))
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
        schoolId: schoolId || null,
        userId: userId || null,
        amount: pricing.total,
        currency: 'eur',
        status: 'pending',
        description,
        billingMonth,
        paymentDate: new Date(),
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

    // Get payment history
    const payments = await db
      .select()
      .from(paymentHistoryTable)
      .where(
        userData.schoolId 
          ? eq(paymentHistoryTable.schoolId, userData.schoolId)
          : eq(paymentHistoryTable.userId, userId)
      )
      .orderBy(desc(paymentHistoryTable.paymentDate))
      .limit(12);

    return {
      paymentHistory: payments,
      user: userData
    };
  }

  // Calculate teacher subscription pricing
  async calculateTeacherMonthlyPrice(userId: number) {
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
    let totalPrice = sub.planPrice;
    const breakdown = {
      basePlan: {
        name: sub.planName,
        price: sub.planPrice,
        includedStudents: sub.studentLicenses,
      },
      additionalCosts: [] as any[],
      total: sub.planPrice,
    };

    // Calculate extra student licenses if needed
    const extraStudentsNeeded = Math.max(0, sub.currentStudentCount - sub.studentLicenses);
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
        .select({ schoolId: schoolSubscriptions.schoolId })
        .from(schoolSubscriptions)
        .where(eq(schoolSubscriptions.id, subscriptionId))
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

      await db
        .update(schoolSubscriptions)
        .set({
          currentTeacherCount: teacherCount.count,
          currentStudentCount: studentCount.count,
          updatedAt: new Date(),
        })
        .where(eq(schoolSubscriptions.id, subscriptionId));

    } else {
      const subscription = await db
        .select({ userId: teacherSubscriptions.userId })
        .from(teacherSubscriptions)
        .where(eq(teacherSubscriptions.id, subscriptionId))
        .limit(1);

      if (!subscription.length) return;

      const userId = subscription[0].userId;

      // Count students assigned to this teacher
      const [studentCount] = await db
        .select({ count: count() })
        .from(students)
        .where(eq(students.assignedTeacherId, userId));

      await db
        .update(teacherSubscriptions)
        .set({
          currentStudentCount: studentCount.count,
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
      throw new Error("Default subscription plan not found");
    }

    const trialStart = startOfDay(new Date());
    const trialEnd = addDays(trialStart, 30);

    const [subscription] = await db
      .insert(schoolSubscriptions)
      .values({
        schoolId,
        planId: standaardPlan.id,
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
        basePlan: {
          name: standaardPlan.name,
          price: standaardPlan.priceMonthly,
          includedTeachers: standaardPlan.teacherLicenses,
          includedStudents: standaardPlan.studentLicenses,
        },
        additionalCosts: [],
        total: standaardPlan.priceMonthly,
      },
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
    const trialEnd = new Date(sub.trialEndDate);
    const isTrialActive = sub.status === 'trial' && now < trialEnd;
    const trialDaysRemaining = isTrialActive 
      ? Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
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
          used: sub.currentStudentCount,
          available: sub.totalStudentLicenses,
          hasCapacity: sub.currentStudentCount < sub.totalStudentLicenses,
        },
      },
    };
  }

  // Create 30-day trial for independent teacher
  async createTeacherTrial(userId: number) {
    const plans = await this.getSubscriptionPlans();
    const standaardPlan = plans.find(p => p.name === 'standaard');
    
    if (!standaardPlan) {
      throw new Error("Default subscription plan not found");
    }

    const trialStart = startOfDay(new Date());
    const trialEnd = addDays(trialStart, 30);

    await db
      .insert(teacherSubscriptions)
      .values({
        userId,
        planId: standaardPlan.id,
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
        basePlan: {
          name: standaardPlan.name,
          price: standaardPlan.priceMonthly,
          includedStudents: standaardPlan.studentLicenses,
        },
        additionalCosts: [],
        total: standaardPlan.priceMonthly,
      },
    };
  }
}

export const subscriptionService = new SubscriptionService();