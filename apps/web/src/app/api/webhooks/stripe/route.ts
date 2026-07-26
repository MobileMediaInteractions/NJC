import { and, eq, inArray } from "drizzle-orm";
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { getDb, hasDatabase } from "@harborline/backend/db";
import { premiumBetaTesterGrants, premiumEntitlements, premiumSubscriptions } from "@harborline/backend/schema";
import { getStripe, hasStripe } from "@/lib/stripe";

export async function POST(request: Request) {
  if (!hasStripe() || !process.env.STRIPE_WEBHOOK_SECRET || !hasDatabase()) return NextResponse.json({ error: "Webhook not configured" }, { status: 503 });
  const signature = request.headers.get("stripe-signature");
  if (!signature) return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(await request.text(), signature, process.env.STRIPE_WEBHOOK_SECRET);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }
  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      const userClerkId = session.metadata?.userClerkId;
      const tierId = session.metadata?.tierId;
      const offerId = session.metadata?.offerId || null;
      const providerSubscriptionId = typeof session.subscription === "string" ? session.subscription : session.subscription?.id;
      if (!userClerkId || !tierId || !providerSubscriptionId) throw new Error("Checkout metadata is incomplete");
      const subscription = await getStripe().subscriptions.retrieve(providerSubscriptionId);
      const periodEnd = subscription.items.data[0]?.current_period_end;
      await getDb().transaction(async (tx) => {
        const [record] = await tx.insert(premiumSubscriptions).values({
          userClerkId, tierId, offerId, provider: "stripe",
          providerCustomerId: typeof session.customer === "string" ? session.customer : session.customer?.id,
          providerSubscriptionId,
          status: subscription.status,
          currentPeriodStartsAt: subscription.items.data[0]?.current_period_start ? new Date(subscription.items.data[0].current_period_start * 1000) : null,
          currentPeriodEndsAt: periodEnd ? new Date(periodEnd * 1000) : null,
          cancelAtPeriodEnd: subscription.cancel_at_period_end,
        }).onConflictDoUpdate({
          target: [premiumSubscriptions.provider, premiumSubscriptions.providerSubscriptionId],
          set: { status: subscription.status, currentPeriodEndsAt: periodEnd ? new Date(periodEnd * 1000) : null, cancelAtPeriodEnd: subscription.cancel_at_period_end, updatedAt: new Date() },
        }).returning();
        await tx.insert(premiumEntitlements).values({
          userClerkId, scopeType: "tier", scopeId: tierId, sourceType: offerId ? "trial" : "subscription",
          sourceId: providerSubscriptionId, status: "active",
          endsAt: periodEnd ? new Date(periodEnd * 1000) : null,
          metadata: { subscriptionId: record.id, stripeEventId: event.id },
        }).onConflictDoUpdate({
          target: [
            premiumEntitlements.userClerkId,
            premiumEntitlements.sourceType,
            premiumEntitlements.sourceId,
            premiumEntitlements.scopeType,
            premiumEntitlements.scopeId,
          ],
          set: {
            status: "active",
            endsAt: periodEnd ? new Date(periodEnd * 1000) : null,
            revokedAt: null,
            metadata: { subscriptionId: record.id, stripeEventId: event.id },
            updatedAt: new Date(),
          },
        });
        await tx.update(premiumBetaTesterGrants).set({
          status: "converted",
          revokedAt: new Date(),
          updatedAt: new Date(),
          metadata: { convertedTo: offerId ? "njc_plus_trial" : "njc_plus_member", stripeEventId: event.id },
        }).where(and(
          eq(premiumBetaTesterGrants.userClerkId, userClerkId),
          inArray(premiumBetaTesterGrants.status, ["active", "paused"]),
        ));
      });
    }
    if (event.type === "customer.subscription.updated") {
      const subscription = event.data.object;
      const end = subscription.items.data[0]?.current_period_end;
      await getDb().transaction(async (tx) => {
        await tx.update(premiumSubscriptions).set({ status: subscription.status, currentPeriodEndsAt: end ? new Date(end * 1000) : null, cancelAtPeriodEnd: subscription.cancel_at_period_end, updatedAt: new Date() }).where(and(eq(premiumSubscriptions.provider, "stripe"), eq(premiumSubscriptions.providerSubscriptionId, subscription.id)));
        await tx.update(premiumEntitlements).set({
          status: ["active", "trialing"].includes(subscription.status) ? "active" : "paused",
          endsAt: end ? new Date(end * 1000) : null,
          pausedAt: ["active", "trialing"].includes(subscription.status) ? null : new Date(),
          updatedAt: new Date(),
        }).where(eq(premiumEntitlements.sourceId, subscription.id));
      });
    }
    if (event.type === "customer.subscription.deleted") {
      const subscription = event.data.object;
      await getDb().transaction(async (tx) => {
        await tx.update(premiumSubscriptions).set({ status: "canceled", cancelledAt: new Date(), updatedAt: new Date() }).where(and(eq(premiumSubscriptions.provider, "stripe"), eq(premiumSubscriptions.providerSubscriptionId, subscription.id)));
        await tx.update(premiumEntitlements).set({ status: "revoked", revokedAt: new Date(), updatedAt: new Date() }).where(eq(premiumEntitlements.sourceId, subscription.id));
      });
    }
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("NJC+ Stripe webhook processing failed", { eventId: event.id, type: event.type, error });
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}
