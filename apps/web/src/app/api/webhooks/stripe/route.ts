import { and, eq, inArray } from "drizzle-orm";
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { getDb, hasDatabase } from "@harborline/backend/db";
import {
  financialLedgerEntries,
  financialProviderEvents,
  premiumBetaTesterGrants,
  premiumEntitlements,
  premiumSubscriptions,
} from "@harborline/backend/schema";
import { syncStripeBalanceTransactions } from "@/lib/finance";
import { getStripe, hasStripe } from "@/lib/stripe";

export const dynamic = "force-dynamic";

const financialEventTypes = new Set([
  "balance.available",
  "charge.refunded",
  "charge.dispute.created",
  "charge.dispute.closed",
  "payout.paid",
  "payout.failed",
]);

export async function POST(request: Request) {
  if (
    !hasStripe() ||
    !process.env.STRIPE_WEBHOOK_SECRET ||
    !hasDatabase()
  ) {
    return NextResponse.json(
      { error: "Webhook not configured" },
      { status: 503 },
    );
  }
  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(
      await request.text(),
      signature,
      process.env.STRIPE_WEBHOOK_SECRET,
    );
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const claim = await claimProviderEvent(event);
  if (claim === "duplicate") {
    return NextResponse.json({ received: true, duplicate: true });
  }
  if (claim === "in_progress") {
    return NextResponse.json(
      { error: "Event is already being processed" },
      { status: 409, headers: { "Retry-After": "5" } },
    );
  }

  try {
    let handled = true;
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutCompleted(event);
        break;
      case "customer.subscription.updated":
        await handleSubscriptionUpdated(event.data.object);
        break;
      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(event.data.object);
        break;
      case "invoice.paid":
        await handleInvoiceStatus(event.data.object, "active");
        await syncStripeBalanceTransactions({
          lookbackDays: 45,
          maxTransactions: 500,
        });
        await applyInvoiceTaxToLedger(event.data.object, event.id);
        break;
      case "invoice.payment_failed":
      case "invoice.payment_action_required":
        await handleInvoiceStatus(event.data.object, "past_due");
        break;
      case "invoice.finalization_failed":
        await handleInvoiceStatus(event.data.object, "incomplete");
        break;
      default:
        handled = financialEventTypes.has(event.type);
        if (handled) {
          await syncStripeBalanceTransactions({
            lookbackDays: 45,
            maxTransactions: 500,
          });
        }
        break;
    }

    await getDb()
      .update(financialProviderEvents)
      .set({
        status: handled ? "processed" : "ignored",
        processedAt: new Date(),
        lastErrorCode: null,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(financialProviderEvents.provider, "stripe"),
          eq(financialProviderEvents.providerEventId, event.id),
        ),
      );
    return NextResponse.json({ received: true, handled });
  } catch (error) {
    const errorCode =
      error instanceof Stripe.errors.StripeError
        ? error.code ?? error.type
        : error instanceof Error
          ? error.name
          : "unknown";
    await getDb()
      .update(financialProviderEvents)
      .set({
        status: "failed",
        lastErrorCode: String(errorCode).slice(0, 180),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(financialProviderEvents.provider, "stripe"),
          eq(financialProviderEvents.providerEventId, event.id),
        ),
      )
      .catch((updateError) => {
        console.error("Stripe provider-event failure could not be recorded", {
          eventId: event.id,
          updateError,
        });
      });
    console.error("NJC+ Stripe webhook processing failed", {
      eventId: event.id,
      type: event.type,
      error,
    });
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 },
    );
  }
}

async function claimProviderEvent(event: Stripe.Event) {
  const object = event.data.object as { id?: string };
  const [created] = await getDb()
    .insert(financialProviderEvents)
    .values({
      provider: "stripe",
      providerEventId: event.id,
      eventType: event.type,
      providerObjectId: object.id ?? null,
      livemode: event.livemode,
      status: "processing",
      attemptCount: 1,
    })
    .onConflictDoNothing()
    .returning({ id: financialProviderEvents.id });
  if (created) return "claimed" as const;

  const [existing] = await getDb()
    .select({
      status: financialProviderEvents.status,
      attemptCount: financialProviderEvents.attemptCount,
      updatedAt: financialProviderEvents.updatedAt,
    })
    .from(financialProviderEvents)
    .where(
      and(
        eq(financialProviderEvents.provider, "stripe"),
        eq(financialProviderEvents.providerEventId, event.id),
      ),
    )
    .limit(1);
  if (!existing || ["processed", "ignored"].includes(existing.status)) {
    return "duplicate" as const;
  }
  if (
    existing.status === "processing" &&
    Date.now() - existing.updatedAt.getTime() < 10 * 60_000
  ) {
    return "in_progress" as const;
  }
  await getDb()
    .update(financialProviderEvents)
    .set({
      status: "processing",
      attemptCount: existing.attemptCount + 1,
      lastErrorCode: null,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(financialProviderEvents.provider, "stripe"),
        eq(financialProviderEvents.providerEventId, event.id),
      ),
    );
  return "claimed" as const;
}

async function applyInvoiceTaxToLedger(
  invoice: Stripe.Invoice,
  providerEventId: string,
) {
  const totalTaxCents = (invoice.total_taxes ?? []).reduce(
    (sum, tax) => sum + tax.amount,
    0,
  );
  if (totalTaxCents <= 0) return;
  const payments = await getStripe().invoicePayments.list({
    invoice: invoice.id,
    status: "paid",
    limit: 100,
    expand: ["data.payment.payment_intent.latest_charge"],
  });
  const paid = payments.data.filter(
    (payment) => payment.status === "paid" && (payment.amount_paid ?? 0) > 0,
  );
  const paidTotal = paid.reduce(
    (sum, payment) => sum + (payment.amount_paid ?? 0),
    0,
  );
  let assignedTax = 0;
  for (const [index, payment] of paid.entries()) {
    const balanceTransactionId = await invoicePaymentBalanceTransactionId(
      payment,
    );
    if (!balanceTransactionId) continue;
    const taxAmountCents =
      index === paid.length - 1
        ? totalTaxCents - assignedTax
        : Math.round(
            (totalTaxCents * (payment.amount_paid ?? 0)) /
              Math.max(1, paidTotal),
          );
    const updated = await getDb()
      .update(financialLedgerEntries)
      .set({
        taxAmountCents,
        providerEventId,
      })
      .where(
        eq(
          financialLedgerEntries.providerBalanceTransactionId,
          balanceTransactionId,
        ),
      )
      .returning({ id: financialLedgerEntries.id });
    if (updated.length) assignedTax += taxAmountCents;
  }
}

async function invoicePaymentBalanceTransactionId(
  payment: Stripe.InvoicePayment,
) {
  let charge: string | Stripe.Charge | null | undefined =
    payment.payment.charge;
  if (!charge && payment.payment.payment_intent) {
    const intent =
      typeof payment.payment.payment_intent === "string"
        ? await getStripe().paymentIntents.retrieve(
            payment.payment.payment_intent,
            { expand: ["latest_charge"] },
          )
        : payment.payment.payment_intent;
    charge = intent.latest_charge;
  }
  if (!charge) return null;
  const expandedCharge =
    typeof charge === "string"
      ? await getStripe().charges.retrieve(charge, {
          expand: ["balance_transaction"],
        })
      : charge;
  return typeof expandedCharge.balance_transaction === "string"
    ? expandedCharge.balance_transaction
    : expandedCharge.balance_transaction?.id ?? null;
}

async function handleCheckoutCompleted(
  event: Stripe.CheckoutSessionCompletedEvent,
) {
  const session = event.data.object;
  const userClerkId = session.metadata?.userClerkId;
  const tierId = session.metadata?.tierId;
  const offerId = session.metadata?.offerId || null;
  const providerSubscriptionId =
    typeof session.subscription === "string"
      ? session.subscription
      : session.subscription?.id;
  if (!userClerkId || !tierId || !providerSubscriptionId) {
    throw new Error("Checkout metadata is incomplete");
  }
  const subscription = await getStripe().subscriptions.retrieve(
    providerSubscriptionId,
  );
  const firstItem = subscription.items.data[0];
  const periodEnd = firstItem?.current_period_end;
  await getDb().transaction(async (tx) => {
    const [record] = await tx
      .insert(premiumSubscriptions)
      .values({
        userClerkId,
        tierId,
        offerId,
        provider: "stripe",
        providerCustomerId:
          typeof session.customer === "string"
            ? session.customer
            : session.customer?.id,
        providerSubscriptionId,
        status: subscription.status,
        currentPeriodStartsAt: firstItem?.current_period_start
          ? new Date(firstItem.current_period_start * 1_000)
          : null,
        currentPeriodEndsAt: periodEnd
          ? new Date(periodEnd * 1_000)
          : null,
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
      })
      .onConflictDoUpdate({
        target: [
          premiumSubscriptions.provider,
          premiumSubscriptions.providerSubscriptionId,
        ],
        set: {
          providerCustomerId:
            typeof session.customer === "string"
              ? session.customer
              : session.customer?.id,
          status: subscription.status,
          currentPeriodStartsAt: firstItem?.current_period_start
            ? new Date(firstItem.current_period_start * 1_000)
            : null,
          currentPeriodEndsAt: periodEnd
            ? new Date(periodEnd * 1_000)
            : null,
          cancelAtPeriodEnd: subscription.cancel_at_period_end,
          updatedAt: new Date(),
        },
      })
      .returning();
    await tx
      .insert(premiumEntitlements)
      .values({
        userClerkId,
        scopeType: "tier",
        scopeId: tierId,
        sourceType: offerId ? "trial" : "subscription",
        sourceId: providerSubscriptionId,
        status: "active",
        endsAt: periodEnd ? new Date(periodEnd * 1_000) : null,
        metadata: { subscriptionId: record.id, stripeEventId: event.id },
      })
      .onConflictDoUpdate({
        target: [
          premiumEntitlements.userClerkId,
          premiumEntitlements.sourceType,
          premiumEntitlements.sourceId,
          premiumEntitlements.scopeType,
          premiumEntitlements.scopeId,
        ],
        set: {
          status: "active",
          endsAt: periodEnd ? new Date(periodEnd * 1_000) : null,
          revokedAt: null,
          metadata: { subscriptionId: record.id, stripeEventId: event.id },
          updatedAt: new Date(),
        },
      });
    await tx
      .update(premiumBetaTesterGrants)
      .set({
        status: "converted",
        revokedAt: new Date(),
        updatedAt: new Date(),
        metadata: {
          convertedTo: offerId ? "njc_plus_trial" : "njc_plus_member",
          stripeEventId: event.id,
        },
      })
      .where(
        and(
          eq(premiumBetaTesterGrants.userClerkId, userClerkId),
          inArray(premiumBetaTesterGrants.status, ["active", "paused"]),
        ),
      );
  });
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const firstItem = subscription.items.data[0];
  const end = firstItem?.current_period_end;
  await getDb().transaction(async (tx) => {
    await tx
      .update(premiumSubscriptions)
      .set({
        status: subscription.status,
        currentPeriodStartsAt: firstItem?.current_period_start
          ? new Date(firstItem.current_period_start * 1_000)
          : null,
        currentPeriodEndsAt: end ? new Date(end * 1_000) : null,
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(premiumSubscriptions.provider, "stripe"),
          eq(
            premiumSubscriptions.providerSubscriptionId,
            subscription.id,
          ),
        ),
      );
    await tx
      .update(premiumEntitlements)
      .set({
        status: ["active", "trialing"].includes(subscription.status)
          ? "active"
          : "paused",
        endsAt: end ? new Date(end * 1_000) : null,
        pausedAt: ["active", "trialing"].includes(subscription.status)
          ? null
          : new Date(),
        updatedAt: new Date(),
      })
      .where(eq(premiumEntitlements.sourceId, subscription.id));
  });
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  await getDb().transaction(async (tx) => {
    await tx
      .update(premiumSubscriptions)
      .set({
        status: "canceled",
        cancelledAt: new Date(),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(premiumSubscriptions.provider, "stripe"),
          eq(
            premiumSubscriptions.providerSubscriptionId,
            subscription.id,
          ),
        ),
      );
    await tx
      .update(premiumEntitlements)
      .set({
        status: "revoked",
        revokedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(premiumEntitlements.sourceId, subscription.id));
  });
}

async function handleInvoiceStatus(
  invoice: Stripe.Invoice,
  status: "active" | "past_due" | "incomplete",
) {
  const subscriptionReference =
    invoice.parent?.subscription_details?.subscription;
  const subscriptionId =
    typeof subscriptionReference === "string"
      ? subscriptionReference
      : subscriptionReference?.id;
  if (!subscriptionId) return;
  await getDb()
    .update(premiumSubscriptions)
    .set({ status, updatedAt: new Date() })
    .where(
      and(
        eq(premiumSubscriptions.provider, "stripe"),
        eq(premiumSubscriptions.providerSubscriptionId, subscriptionId),
      ),
    );
}
