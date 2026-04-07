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

let stripe: any = null;

export async function initializeStripe() {
  if (process.env.STRIPE_SECRET_KEY) {
    try {
      const StripeConstructor = await import('stripe');
      const Stripe = StripeConstructor.default;
      stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
        apiVersion: '2025-02-24.acacia', // latest stable version
      });
      console.log('✅ Stripe initialized successfully');
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

  // Create Stripe customer for a school
  async createSchoolCustomer(schoolId: number) {
    this.ensureStripeReady();

    const [school] = await db
      .select()
      .from(schools)
      .where(eq(schools.id, schoolId))
      .limit(1);

    if (!school) throw new Error("School not found");

    // Look up the school owner's email for billing
    let billingEmail = `billing-school-${schoolId}@musicdott.app`;
    if (school.ownerId) {
      const [owner] = await db
        .select({ email: users.email })
        .from(users)
        .where(eq(users.id, school.ownerId))
        .limit(1);
      if (owner?.email) billingEmail = owner.email;
    }

    const customer = await stripe.customers.create({
      name: school.name,
      email: billingEmail,
      metadata: {
        schoolId: schoolId.toString(),
        type: 'school',
      },
      address: {
        line1: school.address || '',
        city: school.city || '',
        country: 'NL',
      },
    });

    await db
      .update(schoolSubscriptions)
      .set({ stripeCustomerId: customer.id, updatedAt: new Date() })
      .where(eq(schoolSubscriptions.schoolId, schoolId));

    return customer;
  }

  // Create Stripe customer for an individual teacher
  async createTeacherCustomer(userId: number) {
    this.ensureStripeReady();

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) throw new Error("User not found");

    const customer = await stripe.customers.create({
      name: user.name,
      email: user.email,
      metadata: {
        userId: userId.toString(),
        type: 'teacher',
      },
    });

    await db
      .update(teacherSubscriptions)
      .set({ stripeCustomerId: customer.id, updatedAt: new Date() })
      .where(eq(teacherSubscriptions.userId, userId));

    return customer;
  }

  // Create a Stripe subscription using a saved payment method.
  // Uses an existing Stripe Price object (recommended) or a price_data fallback.
  async createStripeSubscription(customerId: string, type: 'school' | 'teacher', entityId: number) {
    this.ensureStripeReady();

    // Determine current pricing for this entity
    let amountInCents: number;
    if (type === 'school') {
      const pricing = await subscriptionService.calculateSchoolMonthlyPrice(entityId);
      amountInCents = pricing.totalPrice;
    } else {
      const pricing = await subscriptionService.calculateTeacherMonthlyPrice(entityId);
      amountInCents = pricing.totalPrice;
    }

    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [
        {
          price_data: {
            currency: 'eur',
            product_data: {
              name: 'MusicDott Abonnement',
              description: `Maandelijks abonnement gebaseerd op gebruik`,
            },
            unit_amount: amountInCents,
            recurring: { interval: 'month' },
          },
          quantity: 1,
        },
      ],
      // default_incomplete: klant moet betaalmethode koppelen voordat subscription actief wordt
      payment_behavior: 'default_incomplete',
      payment_settings: {
        payment_method_types: ['card', 'sepa_debit'],
        save_default_payment_method: 'on_subscription',
      },
      expand: ['latest_invoice.payment_intent'],
      metadata: { type, entityId: entityId.toString() },
    });

    // Update local subscription record
    const now = new Date();
    if (type === 'school') {
      await db
        .update(schoolSubscriptions)
        .set({
          stripeSubscriptionId: subscription.id,
          status: 'active',
          billingPeriodStart: now,
          billingPeriodEnd: addMonths(now, 1),
          updatedAt: now,
        })
        .where(eq(schoolSubscriptions.schoolId, entityId));
    } else {
      await db
        .update(teacherSubscriptions)
        .set({
          stripeSubscriptionId: subscription.id,
          status: 'active',
          billingPeriodStart: now,
          billingPeriodEnd: addMonths(now, 1),
          updatedAt: now,
        })
        .where(eq(teacherSubscriptions.userId, entityId));
    }

    return subscription;
  }

  // Update Stripe subscription item price for the next billing cycle
  async updateSubscriptionPricing(stripeSubscriptionId: string, newAmountCents: number, description: string) {
    this.ensureStripeReady();

    const subscription = await stripe.subscriptions.retrieve(stripeSubscriptionId);
    const itemId = subscription.items.data[0]?.id;
    if (!itemId) throw new Error("No subscription item found");

    await stripe.subscriptionItems.update(itemId, {
      price_data: {
        currency: 'eur',
        product_data: { name: 'MusicDott Abonnement', description },
        unit_amount: newAmountCents,
        recurring: { interval: 'month' },
      },
    });

    return subscription;
  }

  // Process monthly billing for all active subscriptions
  async processMonthlyBilling() {
    console.log('🔄 Starting monthly billing process...');

    const activeSchoolSubs = await db
      .select()
      .from(schoolSubscriptions)
      .where(eq(schoolSubscriptions.status, 'active'));

    for (const schoolSub of activeSchoolSubs) {
      try {
        await this.processSchoolBilling(schoolSub.schoolId!);
        console.log(`✅ Billing processed for school ${schoolSub.schoolId}`);
      } catch (error: any) {
        console.error(`❌ Billing failed for school ${schoolSub.schoolId}:`, error.message);
      }
    }

    const activeTeacherSubs = await db
      .select()
      .from(teacherSubscriptions)
      .where(eq(teacherSubscriptions.status, 'active'));

    for (const teacherSub of activeTeacherSubs) {
      try {
        await this.processTeacherBilling(teacherSub.userId!);
        console.log(`✅ Billing processed for teacher ${teacherSub.userId}`);
      } catch (error: any) {
        console.error(`❌ Billing failed for teacher ${teacherSub.userId}:`, error.message);
      }
    }

    console.log('✅ Monthly billing process completed');
  }

  // Process billing for a specific school
  async processSchoolBilling(schoolId: number) {
    this.ensureStripeReady();

    const [sub] = await db
      .select()
      .from(schoolSubscriptions)
      .where(eq(schoolSubscriptions.schoolId, schoolId))
      .orderBy(desc(schoolSubscriptions.createdAt))
      .limit(1);

    if (!sub || sub.status !== 'active') return;

    const pricing = await subscriptionService.calculateSchoolMonthlyPrice(schoolId);

    // Update Stripe subscription pricing for next cycle
    if (sub.stripeSubscriptionId) {
      const description = `MusicDott ${pricing.plan} plan`;
      await this.updateSubscriptionPricing(sub.stripeSubscriptionId, pricing.totalPrice, description);
    }

    // Record as 'pending' — Stripe webhook will update to 'succeeded' or 'failed'
    const billingMonth = format(new Date(), 'yyyy-MM');
    await db.insert(paymentHistory).values({
      schoolId,
      amount: pricing.totalPrice,
      currency: 'eur',
      status: 'pending',
      description: `Maandelijks abonnement ${billingMonth}`,
      billingMonth,
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

    const [sub] = await db
      .select()
      .from(teacherSubscriptions)
      .where(eq(teacherSubscriptions.userId, userId))
      .orderBy(desc(teacherSubscriptions.createdAt))
      .limit(1);

    if (!sub || sub.status !== 'active') return;

    const pricing = await subscriptionService.calculateTeacherMonthlyPrice(userId);

    if (sub.stripeSubscriptionId) {
      const description = `MusicDott leraar ${pricing.plan} plan`;
      await this.updateSubscriptionPricing(sub.stripeSubscriptionId, pricing.totalPrice, description);
    }

    const billingMonth = format(new Date(), 'yyyy-MM');
    await db.insert(paymentHistory).values({
      userId,
      amount: pricing.totalPrice,
      currency: 'eur',
      status: 'pending',
      description: `Maandelijks leraar abonnement ${billingMonth}`,
      billingMonth,
      paymentDate: new Date(),
    });

    await db
      .update(teacherSubscriptions)
      .set({
        billingPeriodStart: new Date(),
        billingPeriodEnd: addMonths(new Date(), 1),
        updatedAt: new Date(),
      })
      .where(eq(teacherSubscriptions.id, sub.id));
  }

  // Handle verified Stripe webhooks
  async handleWebhook(event: any) {
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
      case 'customer.subscription.updated':
        await this.handleSubscriptionUpdated(event.data.object);
        break;
      default:
        console.log(`[Stripe webhook] Unhandled event type: ${event.type}`);
    }
  }

  private async handlePaymentSucceeded(invoice: any) {
    const stripeInvoiceId = invoice.id;

    // Update the specific pending payment that matches this invoice
    await db
      .update(paymentHistory)
      .set({ status: 'succeeded', stripeInvoiceId })
      .where(eq(paymentHistory.stripeInvoiceId, stripeInvoiceId));

    console.log(`✅ [Webhook] Payment succeeded: invoice ${stripeInvoiceId}`);
  }

  private async handlePaymentFailed(invoice: any) {
    const stripeInvoiceId = invoice.id;
    const stripeSubscriptionId = invoice.subscription;

    await db
      .update(paymentHistory)
      .set({ status: 'failed', stripeInvoiceId })
      .where(eq(paymentHistory.stripeInvoiceId, stripeInvoiceId));

    if (stripeSubscriptionId) {
      await db
        .update(schoolSubscriptions)
        .set({ status: 'past_due', updatedAt: new Date() })
        .where(eq(schoolSubscriptions.stripeSubscriptionId, stripeSubscriptionId));

      await db
        .update(teacherSubscriptions)
        .set({ status: 'past_due', updatedAt: new Date() })
        .where(eq(teacherSubscriptions.stripeSubscriptionId, stripeSubscriptionId));
    }

    console.log(`❌ [Webhook] Payment failed: invoice ${stripeInvoiceId}`);
  }

  private async handleSubscriptionCanceled(subscription: any) {
    const stripeSubscriptionId = subscription.id;

    await db
      .update(schoolSubscriptions)
      .set({ status: 'canceled', updatedAt: new Date() })
      .where(eq(schoolSubscriptions.stripeSubscriptionId, stripeSubscriptionId));

    await db
      .update(teacherSubscriptions)
      .set({ status: 'canceled', updatedAt: new Date() })
      .where(eq(teacherSubscriptions.stripeSubscriptionId, stripeSubscriptionId));

    console.log(`[Webhook] Subscription canceled: ${stripeSubscriptionId}`);
  }

  private async handleSubscriptionUpdated(subscription: any) {
    const stripeSubscriptionId = subscription.id;
    const status = subscription.status === 'active' ? 'active' : subscription.status;

    await db
      .update(schoolSubscriptions)
      .set({ status, updatedAt: new Date() })
      .where(eq(schoolSubscriptions.stripeSubscriptionId, stripeSubscriptionId));

    await db
      .update(teacherSubscriptions)
      .set({ status, updatedAt: new Date() })
      .where(eq(teacherSubscriptions.stripeSubscriptionId, stripeSubscriptionId));
  }

  // Create SetupIntent so the customer can save a payment method before first charge
  async createSetupIntent(customerId: string) {
    this.ensureStripeReady();

    return await stripe.setupIntents.create({
      customer: customerId,
      // Use dynamic payment methods via dashboard instead of hardcoding
      automatic_payment_methods: { enabled: true },
      usage: 'off_session',
    });
  }

  // Get all payment methods for a customer (card + SEPA debit)
  async getPaymentMethods(customerId: string) {
    this.ensureStripeReady();

    const [cards, sepaDebits] = await Promise.all([
      stripe.paymentMethods.list({ customer: customerId, type: 'card' }),
      stripe.paymentMethods.list({ customer: customerId, type: 'sepa_debit' }),
    ]);

    return {
      data: [...cards.data, ...sepaDebits.data],
    };
  }

  // Issue a refund via Stripe
  async issueRefund(paymentIntentId: string, amountCents: number | null, reason: string) {
    this.ensureStripeReady();

    const refundParams: any = {
      payment_intent: paymentIntentId,
      reason: 'requested_by_customer',
      metadata: { reason },
    };

    if (amountCents) {
      refundParams.amount = amountCents;
    }

    return await stripe.refunds.create(refundParams);
  }

  // List recent Stripe invoices
  async listInvoices(limit = 50) {
    this.ensureStripeReady();
    return await stripe.invoices.list({ limit });
  }

  // List recent Stripe payment intents
  async listPaymentIntents(limit = 50) {
    this.ensureStripeReady();
    return await stripe.paymentIntents.list({ limit });
  }

  // List recent Stripe refunds
  async listRefunds(limit = 50) {
    this.ensureStripeReady();
    return await stripe.refunds.list({ limit });
  }

  // Update Stripe customer credit balance (negative balance = credit)
  async applyCustomerCredit(customerId: string, amountCents: number, description: string) {
    this.ensureStripeReady();

    return await stripe.customers.createBalanceTransaction(customerId, {
      amount: -Math.abs(amountCents), // negative = credit
      currency: 'eur',
      description,
    });
  }
}

export const stripeService = new StripeService();
