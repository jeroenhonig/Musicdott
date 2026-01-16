import { subscriptionService } from "./subscription-service";
import { db } from "../db";
import { 
  schoolSubscriptions, 
  teacherSubscriptions,
  paymentHistory,
  users,
  schools
} from "@shared/schema";
import { eq, desc } from "drizzle-orm";
import { format, addMonths } from "date-fns";

// Note: Stripe SDK will be installed when secrets are provided
let Stripe: any = null;
let stripe: any = null;

// Initialize Stripe when secrets are available
export async function initializeStripe() {
  if (process.env.STRIPE_SECRET_KEY) {
    try {
      const StripeConstructor = await import('stripe');
      Stripe = StripeConstructor.default;
      stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
        apiVersion: '2023-10-16',
      });
      console.log('Stripe initialized successfully');
      return true;
    } catch (error) {
      console.error('Failed to initialize Stripe:', error);
      return false;
    }
  }
  return false;
}

export class StripeService {
  constructor() {
    initializeStripe().catch(console.error);
  }

  private ensureStripeReady() {
    if (!stripe) {
      throw new Error('Stripe not initialized. Please provide STRIPE_SECRET_KEY.');
    }
  }

  // Create Stripe customer for school
  async createSchoolCustomer(schoolId: number) {
    this.ensureStripeReady();

    const school = await db
      .select()
      .from(schools)
      .where(eq(schools.id, schoolId))
      .limit(1);

    if (!school.length) {
      throw new Error("School not found");
    }

    const schoolData = school[0];

    const customer = await stripe.customers.create({
      name: schoolData.name,
      email: `billing@${schoolData.name.toLowerCase().replace(/\s+/g, '')}.com`,
      metadata: {
        schoolId: schoolId.toString(),
        type: 'school'
      },
      address: {
        line1: schoolData.address || '',
        city: schoolData.city || '',
        country: 'NL', // Netherlands
      }
    });

    // Update school subscription with Stripe customer ID
    await db
      .update(schoolSubscriptions)
      .set({
        stripeCustomerId: customer.id,
        updatedAt: new Date(),
      })
      .where(eq(schoolSubscriptions.schoolId, schoolId));

    return customer;
  }

  // Create Stripe customer for individual teacher
  async createTeacherCustomer(userId: number) {
    this.ensureStripeReady();

    const user = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user.length) {
      throw new Error("User not found");
    }

    const userData = user[0];

    const customer = await stripe.customers.create({
      name: userData.name,
      email: userData.email,
      metadata: {
        userId: userId.toString(),
        type: 'teacher'
      }
    });

    // Update teacher subscription with Stripe customer ID
    await db
      .update(teacherSubscriptions)
      .set({
        stripeCustomerId: customer.id,
        updatedAt: new Date(),
      })
      .where(eq(teacherSubscriptions.userId, userId));

    return customer;
  }

  // Create subscription after trial ends
  async createStripeSubscription(customerId: string, type: 'school' | 'teacher', entityId: number) {
    this.ensureStripeReady();

    // Create a usage-based subscription that will be updated monthly
    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [
        {
          price_data: {
            currency: 'eur',
            product_data: {
              name: 'MusicDott Subscription',
              description: 'Monthly subscription based on usage'
            },
            unit_amount: 2995, // Base price (€29.95)
            recurring: {
              interval: 'month'
            }
          },
          quantity: 1
        }
      ],
      payment_behavior: 'default_incomplete',
      expand: ['latest_invoice.payment_intent'],
      metadata: {
        type,
        entityId: entityId.toString()
      }
    });

    // Update subscription record with Stripe subscription ID
    if (type === 'school') {
      await db
        .update(schoolSubscriptions)
        .set({
          stripeSubscriptionId: subscription.id,
          status: 'active',
          billingPeriodStart: new Date(),
          billingPeriodEnd: addMonths(new Date(), 1),
          updatedAt: new Date(),
        })
        .where(eq(schoolSubscriptions.schoolId, entityId));
    } else {
      await db
        .update(teacherSubscriptions)
        .set({
          stripeSubscriptionId: subscription.id,
          status: 'active',
          billingPeriodStart: new Date(),
          billingPeriodEnd: addMonths(new Date(), 1),
          updatedAt: new Date(),
        })
        .where(eq(teacherSubscriptions.userId, entityId));
    }

    return subscription;
  }

  // Update subscription pricing based on current usage
  async updateSubscriptionPricing(stripeSubscriptionId: string, newAmount: number, description: string) {
    this.ensureStripeReady();

    const subscription = await stripe.subscriptions.retrieve(stripeSubscriptionId);
    
    // Update the subscription item with new pricing
    await stripe.subscriptionItems.update(
      subscription.items.data[0].id,
      {
        price_data: {
          currency: 'eur',
          product_data: {
            name: 'MusicDott Subscription',
            description
          },
          unit_amount: newAmount,
          recurring: {
            interval: 'month'
          }
        }
      }
    );

    return subscription;
  }

  // Process monthly billing for all active subscriptions
  async processMonthlyBilling() {
    console.log('Starting monthly billing process...');

    // Process school subscriptions
    const activeSchoolSubs = await db
      .select()
      .from(schoolSubscriptions)
      .where(eq(schoolSubscriptions.status, 'active'));

    for (const schoolSub of activeSchoolSubs) {
      try {
        await this.processSchoolBilling(schoolSub.schoolId);
        console.log(`Processed billing for school ${schoolSub.schoolId}`);
      } catch (error) {
        console.error(`Failed to process billing for school ${schoolSub.schoolId}:`, error);
      }
    }

    // Process teacher subscriptions
    const activeTeacherSubs = await db
      .select()
      .from(teacherSubscriptions)
      .where(eq(teacherSubscriptions.status, 'active'));

    for (const teacherSub of activeTeacherSubs) {
      try {
        await this.processTeacherBilling(teacherSub.userId);
        console.log(`Processed billing for teacher ${teacherSub.userId}`);
      } catch (error) {
        console.error(`Failed to process billing for teacher ${teacherSub.userId}:`, error);
      }
    }

    console.log('Monthly billing process completed');
  }

  // Process billing for a specific school
  async processSchoolBilling(schoolId: number) {
    this.ensureStripeReady();

    const subscription = await db
      .select()
      .from(schoolSubscriptions)
      .where(eq(schoolSubscriptions.schoolId, schoolId))
      .orderBy(desc(schoolSubscriptions.createdAt))
      .limit(1);

    if (!subscription.length || subscription[0].status !== 'active') {
      return;
    }

    const sub = subscription[0];
    const pricing = await subscriptionService.calculateSchoolMonthlyPrice(schoolId);
    
    // Update Stripe subscription with current pricing
    if (sub.stripeSubscriptionId) {
      const description = `MusicDott subscription - ${pricing.basePlan.name} plan`;
      await this.updateSubscriptionPricing(
        sub.stripeSubscriptionId, 
        pricing.total, 
        description
      );
    }

    // Create invoice record
    const billingMonth = format(new Date(), 'yyyy-MM');
    await db
      .insert(paymentHistory)
      .values({
        schoolId,
        amount: pricing.total,
        currency: 'eur',
        status: 'succeeded',
        description: `Monthly subscription for ${billingMonth}`,
        billingMonth,
        stripeInvoiceId: null, // Will be updated by webhook
        paymentDate: new Date(),
      });

    // Update billing period
    await db
      .update(schoolSubscriptions)
      .set({
        billingPeriodStart: new Date(),
        billingPeriodEnd: addMonths(new Date(), 1),
        updatedAt: new Date(),
      })
      .where(eq(schoolSubscriptions.id, sub.id));
  }

  // Process billing for a specific teacher
  async processTeacherBilling(userId: number) {
    this.ensureStripeReady();

    const subscription = await db
      .select()
      .from(teacherSubscriptions)
      .where(eq(teacherSubscriptions.userId, userId))
      .orderBy(desc(teacherSubscriptions.createdAt))
      .limit(1);

    if (!subscription.length || subscription[0].status !== 'active') {
      return;
    }

    const sub = subscription[0];
    const pricing = await subscriptionService.calculateTeacherMonthlyPrice(userId);
    
    // Update Stripe subscription with current pricing
    if (sub.stripeSubscriptionId) {
      const description = `MusicDott teacher subscription - ${pricing.basePlan.name} plan`;
      await this.updateSubscriptionPricing(
        sub.stripeSubscriptionId, 
        pricing.total, 
        description
      );
    }

    // Create invoice record
    const billingMonth = format(new Date(), 'yyyy-MM');
    await db
      .insert(paymentHistory)
      .values({
        userId,
        amount: pricing.total,
        currency: 'eur',
        status: 'succeeded',
        description: `Monthly teacher subscription for ${billingMonth}`,
        billingMonth,
        stripeInvoiceId: null,
        paymentDate: new Date(),
      });

    // Update billing period
    await db
      .update(teacherSubscriptions)
      .set({
        billingPeriodStart: new Date(),
        billingPeriodEnd: addMonths(new Date(), 1),
        updatedAt: new Date(),
      })
      .where(eq(teacherSubscriptions.id, sub.id));
  }

  // Handle Stripe webhooks
  async handleWebhook(event: any) {
    this.ensureStripeReady();

    switch (event.type) {
      case 'invoice.payment_succeeded':
        await this.handlePaymentSucceeded(event.data.object);
        break;
      case 'invoice.payment_failed':
        await this.handlePaymentFailed(event.data.object);
        break;
      case 'customer.subscription.deleted':
        await this.handleSubscriptionCanceled(event.data.object);
        break;
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }
  }

  // Handle successful payment
  private async handlePaymentSucceeded(invoice: any) {
    const subscriptionId = invoice.subscription;
    const customerId = invoice.customer;
    
    // Update payment status
    await db
      .update(paymentHistory)
      .set({
        status: 'succeeded',
        stripeInvoiceId: invoice.id,
      })
      .where(eq(paymentHistory.stripeInvoiceId, invoice.id));

    console.log(`Payment succeeded for invoice ${invoice.id}`);
  }

  // Handle failed payment
  private async handlePaymentFailed(invoice: any) {
    const subscriptionId = invoice.subscription;
    
    // Update payment status and subscription status
    await db
      .update(paymentHistory)
      .set({
        status: 'failed',
        stripeInvoiceId: invoice.id,
      })
      .where(eq(paymentHistory.stripeInvoiceId, invoice.id));

    // Mark subscription as past due
    await db
      .update(schoolSubscriptions)
      .set({
        status: 'past_due',
        updatedAt: new Date(),
      })
      .where(eq(schoolSubscriptions.stripeSubscriptionId, subscriptionId));

    await db
      .update(teacherSubscriptions)
      .set({
        status: 'past_due',
        updatedAt: new Date(),
      })
      .where(eq(teacherSubscriptions.stripeSubscriptionId, subscriptionId));

    console.log(`Payment failed for invoice ${invoice.id}`);
  }

  // Handle subscription cancellation
  private async handleSubscriptionCanceled(subscription: any) {
    // Mark subscription as canceled
    await db
      .update(schoolSubscriptions)
      .set({
        status: 'canceled',
        updatedAt: new Date(),
      })
      .where(eq(schoolSubscriptions.stripeSubscriptionId, subscription.id));

    await db
      .update(teacherSubscriptions)
      .set({
        status: 'canceled',
        updatedAt: new Date(),
      })
      .where(eq(teacherSubscriptions.stripeSubscriptionId, subscription.id));

    console.log(`Subscription canceled: ${subscription.id}`);
  }

  // Create payment intent for subscription setup
  async createSetupIntent(customerId: string) {
    this.ensureStripeReady();

    const setupIntent = await stripe.setupIntents.create({
      customer: customerId,
      payment_method_types: ['card', 'sepa_debit'],
      usage: 'off_session'
    });

    return setupIntent;
  }

  // Get customer's payment methods
  async getPaymentMethods(customerId: string) {
    this.ensureStripeReady();

    const paymentMethods = await stripe.paymentMethods.list({
      customer: customerId,
      type: 'card'
    });

    return paymentMethods;
  }
}

export const stripeService = new StripeService();