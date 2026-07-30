import { and, count, desc, eq, gt, isNull, lte, or } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb, hasDatabase } from "@harborline/backend/db";
import { premiumOffers, premiumSubscriptions, premiumTiers } from "@harborline/backend/schema";
import { getAccountIdentity } from "@/lib/auth";
import { isNjcPlusFeatureEnabled } from "@/lib/feature-flags";
import { getRequestOrigin } from "@/lib/origin";
import { resolveNjcPlusSurface, writePremiumAudit } from "@/lib/njc-plus";
import { getStripe, hasStripe, stripeTaxEnabled } from "@/lib/stripe";

const input = z.object({ tierId: z.uuid(), offerId: z.uuid().optional() });

export async function POST(request: Request) {
  const surface = await resolveNjcPlusSurface({ feature: "njc_plus_checkout" });
  if (!surface.available || !(await isNjcPlusFeatureEnabled("njc_plus_paywalls"))) return NextResponse.json({ error: { code: "not_found", message: "Not found" } }, { status: 404 });
  const user = await getAccountIdentity();
  if (!user) return NextResponse.json({ error: { code: "unauthorized", message: "Sign in before starting checkout" } }, { status: 401 });
  if (!hasDatabase() || !hasStripe()) return NextResponse.json({ error: { code: "service_not_configured", message: "Secure checkout is not configured yet" } }, { status: 503 });
  const parsed = input.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: { code: "invalid_request", message: "Choose a valid NJC+ access option" } }, { status: 400 });
  if (parsed.data.offerId && !(await isNjcPlusFeatureEnabled("njc_plus_trials"))) {
    return NextResponse.json({ error: { code: "not_found", message: "Not found" } }, { status: 404 });
  }
  const [tier] = await getDb().select().from(premiumTiers).where(and(eq(premiumTiers.id, parsed.data.tierId), eq(premiumTiers.available, true), eq(premiumTiers.visible, true))).limit(1);
  if (!tier?.providerPriceId) return NextResponse.json({ error: { code: "unavailable", message: "This NJC+ tier is not ready for checkout" } }, { status: 409 });
  const now = new Date();
  const [offer] = parsed.data.offerId ? await getDb().select().from(premiumOffers).where(and(
    eq(premiumOffers.id, parsed.data.offerId),
    eq(premiumOffers.tierId, tier.id),
    eq(premiumOffers.active, true),
    or(isNull(premiumOffers.startsAt), lte(premiumOffers.startsAt, now)),
    or(isNull(premiumOffers.endsAt), gt(premiumOffers.endsAt, now)),
  )).limit(1) : [];
  if (parsed.data.offerId && !offer) return NextResponse.json({ error: { code: "offer_unavailable", message: "That promotion is no longer available" } }, { status: 409 });
  if (offer?.paymentRequired && !offer.providerPriceId) {
    return NextResponse.json({ error: { code: "offer_unavailable", message: "This paid offer is not configured for secure checkout" } }, { status: 409 });
  }
  if (offer) {
    const [usage] = await getDb().select({ value: count() }).from(premiumSubscriptions).where(and(eq(premiumSubscriptions.userClerkId, user.clerkId), eq(premiumSubscriptions.offerId, offer.id)));
    if (Number(usage?.value ?? 0) >= offer.perUserLimit) return NextResponse.json({ error: { code: "offer_limit", message: "This account has already used that offer" } }, { status: 409 });
  }

  const origin = getRequestOrigin(request);
  const idempotencyKey = request.headers.get("idempotency-key")?.slice(0, 200);
  const metadata = { userClerkId: user.clerkId, tierId: tier.id, offerId: offer?.id ?? "" };
  try {
    const [existingSubscription] = await getDb()
      .select({ providerCustomerId: premiumSubscriptions.providerCustomerId })
      .from(premiumSubscriptions)
      .where(and(
        eq(premiumSubscriptions.userClerkId, user.clerkId),
        eq(premiumSubscriptions.provider, "stripe"),
      ))
      .orderBy(desc(premiumSubscriptions.updatedAt))
      .limit(1);
    const providerCustomerId = existingSubscription?.providerCustomerId ?? null;
    const session = await getStripe().checkout.sessions.create({
      mode: "subscription",
      ...(providerCustomerId
        ? {
            customer: providerCustomerId,
            customer_update: { address: "auto", name: "auto" },
          }
        : { customer_email: user.email }),
      client_reference_id: user.clerkId,
      billing_address_collection: "required",
      tax_id_collection: { enabled: true },
      automatic_tax: { enabled: stripeTaxEnabled() },
      line_items: [
        { price: tier.providerPriceId, quantity: 1 },
        ...(offer?.paymentRequired && offer.providerPriceId ? [{ price: offer.providerPriceId, quantity: 1 }] : []),
      ],
      subscription_data: {
        metadata,
        ...(offer ? { trial_period_days: offer.durationDays } : {}),
        ...(offer && !offer.autoRenews ? { cancel_at: Math.floor(Date.now() / 1000) + offer.durationDays * 86_400 } : {}),
      },
      metadata,
      allow_promotion_codes: !offer,
      success_url: `${origin}/plus/join/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/plus/join`,
    }, idempotencyKey ? { idempotencyKey } : undefined);
    await writePremiumAudit({ request, actorClerkId: user.clerkId, action: "checkout.started", targetType: "tier", targetId: tier.id, metadata: { offerId: offer?.id, checkoutSessionId: session.id } });
    return NextResponse.json({ data: { url: session.url }, meta: { apiVersion: "1" } }, { status: 201 });
  } catch (error) {
    console.error("NJC+ checkout session failed", error);
    return NextResponse.json({ error: { code: "checkout_failed", message: "Secure checkout could not be started" } }, { status: 502 });
  }
}
