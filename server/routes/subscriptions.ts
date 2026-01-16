import { Router } from "express";
import { z } from "zod";
import { subscriptionService } from "../services/subscription-service";
import { stripeService } from "../services/stripe-service";
import { db } from "../db";
import { subscriptionPlans, schoolSubscriptions, teacherSubscriptions } from "@shared/schema";
import { eq, desc } from "drizzle-orm";

const router = Router();

// Get user's current subscription status and pricing
router.get("/status", async (req: any, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const accessInfo = await subscriptionService.checkUserAccess(userId);
    res.json(accessInfo);
  } catch (error) {
    console.error("Error fetching subscription status:", error);
    res.status(500).json({ message: "Failed to fetch subscription status" });
  }
});

// Get available subscription plans
router.get("/plans", async (req: any, res) => {
  try {
    const plans = await subscriptionService.getSubscriptionPlans();
    res.json(plans);
  } catch (error) {
    console.error("Error fetching subscription plans:", error);
    res.status(500).json({ message: "Failed to fetch subscription plans" });
  }
});

// Get subscription summary with billing history
router.get("/summary", async (req: any, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const summary = await subscriptionService.getSubscriptionSummary(userId);
    res.json(summary);
  } catch (error) {
    console.error("Error fetching subscription summary:", error);
    res.status(500).json({ message: "Failed to fetch subscription summary" });
  }
});

// Start subscription after trial (create Stripe customer and subscription)
router.post("/start", async (req: any, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const user = req.user;
    let customer;
    let subscription;

    if (user.schoolId) {
      // School subscription
      customer = await stripeService.createSchoolCustomer(user.schoolId);
      subscription = await stripeService.createStripeSubscription(customer.id, 'school', user.schoolId);
    } else if (user.role === 'teacher') {
      // Individual teacher subscription
      customer = await stripeService.createTeacherCustomer(userId);
      subscription = await stripeService.createStripeSubscription(customer.id, 'teacher', userId);
    } else {
      return res.status(400).json({ message: "Invalid user type for subscription" });
    }

    // Create setup intent for payment method
    const setupIntent = await stripeService.createSetupIntent(customer.id);

    res.json({
      customer,
      subscription,
      setupIntent,
      clientSecret: setupIntent.client_secret,
    });
  } catch (error) {
    console.error("Error starting subscription:", error);
    res.status(500).json({ message: "Failed to start subscription" });
  }
});

// Update subscription plan
router.put("/plan", async (req: any, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const { planId } = req.body;
    if (!planId) {
      return res.status(400).json({ message: "Plan ID is required" });
    }

    const user = req.user;
    
    if (user.schoolId) {
      // Update school subscription plan
      await db
        .update(schoolSubscriptions)
        .set({
          planId: planId,
          updatedAt: new Date(),
        })
        .where(eq(schoolSubscriptions.schoolId, user.schoolId));
    } else if (user.role === 'teacher') {
      // Update teacher subscription plan
      await db
        .update(teacherSubscriptions)
        .set({
          planId: planId,
          updatedAt: new Date(),
        })
        .where(eq(teacherSubscriptions.userId, userId));
    }

    // Get updated subscription status
    const accessInfo = await subscriptionService.checkUserAccess(userId);
    res.json(accessInfo);
  } catch (error) {
    console.error("Error updating subscription plan:", error);
    res.status(500).json({ message: "Failed to update subscription plan" });
  }
});

// Add extra student licenses
router.post("/extra-licenses", async (req: any, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const { extraLicenses } = req.body;
    if (!extraLicenses || extraLicenses < 0) {
      return res.status(400).json({ message: "Valid extra licenses count is required" });
    }

    const user = req.user;
    
    if (user.schoolId) {
      // Update school subscription with extra licenses
      const subscription = await db
        .select()
        .from(schoolSubscriptions)
        .where(eq(schoolSubscriptions.schoolId, user.schoolId))
        .orderBy(desc(schoolSubscriptions.createdAt))
        .limit(1);

      if (subscription.length) {
        const sub = subscription[0];
        const basePlan = await db
          .select()
          .from(subscriptionPlans)
          .where(eq(subscriptionPlans.id, sub.planId))
          .limit(1);

        if (basePlan.length) {
          const newTotalLicenses = basePlan[0].studentLicenses + extraLicenses;
          
          await db
            .update(schoolSubscriptions)
            .set({
              extraStudentLicenses: extraLicenses,
              totalStudentLicenses: newTotalLicenses,
              updatedAt: new Date(),
            })
            .where(eq(schoolSubscriptions.id, sub.id));
        }
      }
    } else if (user.role === 'teacher') {
      // Update teacher subscription with extra licenses
      const subscription = await db
        .select()
        .from(teacherSubscriptions)
        .where(eq(teacherSubscriptions.userId, userId))
        .orderBy(desc(teacherSubscriptions.createdAt))
        .limit(1);

      if (subscription.length) {
        const sub = subscription[0];
        const basePlan = await db
          .select()
          .from(subscriptionPlans)
          .where(eq(subscriptionPlans.id, sub.planId))
          .limit(1);

        if (basePlan.length) {
          const newTotalLicenses = basePlan[0].studentLicenses + extraLicenses;
          
          await db
            .update(teacherSubscriptions)
            .set({
              extraStudentLicenses: extraLicenses,
              totalStudentLicenses: newTotalLicenses,
              updatedAt: new Date(),
            })
            .where(eq(teacherSubscriptions.id, sub.id));
        }
      }
    }

    // Get updated subscription status
    const accessInfo = await subscriptionService.checkUserAccess(userId);
    res.json(accessInfo);
  } catch (error) {
    console.error("Error adding extra licenses:", error);
    res.status(500).json({ message: "Failed to add extra licenses" });
  }
});

// Stripe webhook endpoint
router.post("/webhook", async (req, res) => {
  try {
    const signature = req.headers['stripe-signature'];
    
    // Verify webhook signature (when Stripe is configured)
    if (process.env.STRIPE_WEBHOOK_SECRET && signature) {
      // Stripe webhook verification would go here
    }

    const event = req.body;
    await stripeService.handleWebhook(event);
    
    res.json({ received: true });
  } catch (error) {
    console.error("Webhook error:", error);
    res.status(400).json({ message: "Webhook processing failed" });
  }
});

// Admin endpoint to process monthly billing (would typically be called by a cron job)
router.post("/process-billing", async (req: any, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    // Only allow admin users to trigger billing
    if (req.user.role !== 'school_owner') {
      return res.status(403).json({ message: "Access denied" });
    }

    await stripeService.processMonthlyBilling();
    res.json({ message: "Monthly billing processed successfully" });
  } catch (error) {
    console.error("Error processing monthly billing:", error);
    res.status(500).json({ message: "Failed to process monthly billing" });
  }
});

// Get payment methods
router.get("/payment-methods", async (req: any, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const user = req.user;
    let customerId;

    if (user.schoolId) {
      const subscription = await db
        .select({ stripeCustomerId: schoolSubscriptions.stripeCustomerId })
        .from(schoolSubscriptions)
        .where(eq(schoolSubscriptions.schoolId, user.schoolId))
        .orderBy(desc(schoolSubscriptions.createdAt))
        .limit(1);
      
      customerId = subscription[0]?.stripeCustomerId;
    } else if (user.role === 'teacher') {
      const subscription = await db
        .select({ stripeCustomerId: teacherSubscriptions.stripeCustomerId })
        .from(teacherSubscriptions)
        .where(eq(teacherSubscriptions.userId, userId))
        .orderBy(desc(teacherSubscriptions.createdAt))
        .limit(1);
      
      customerId = subscription[0]?.stripeCustomerId;
    }

    if (!customerId) {
      return res.json({ paymentMethods: [] });
    }

    const paymentMethods = await stripeService.getPaymentMethods(customerId);
    res.json({ paymentMethods: paymentMethods.data });
  } catch (error) {
    console.error("Error fetching payment methods:", error);
    res.status(500).json({ message: "Failed to fetch payment methods" });
  }
});

export default router;