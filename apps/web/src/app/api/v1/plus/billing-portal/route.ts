import { and, desc, eq, isNotNull } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb, hasDatabase } from "@harborline/backend/db";
import { premiumSubscriptions } from "@harborline/backend/schema";
import { getAccountIdentity } from "@/lib/auth";
import { getRequestOrigin } from "@/lib/origin";
import { writePremiumAudit } from "@/lib/njc-plus";
import {
  getStripe,
  hasStripe,
  stripeBillingPortalConfiguration,
} from "@/lib/stripe";

export async function POST(request: Request) {
  const user = await getAccountIdentity();
  if (!user) {
    return NextResponse.json(
      { error: { code: "unauthorized", message: "Sign in to manage billing" } },
      { status: 401 },
    );
  }
  if (!hasDatabase() || !hasStripe()) {
    return NextResponse.json(
      {
        error: {
          code: "service_not_configured",
          message: "Billing management is not configured",
        },
      },
      { status: 503 },
    );
  }
  const [subscription] = await getDb()
    .select({
      id: premiumSubscriptions.id,
      providerCustomerId: premiumSubscriptions.providerCustomerId,
    })
    .from(premiumSubscriptions)
    .where(
      and(
        eq(premiumSubscriptions.userClerkId, user.clerkId),
        eq(premiumSubscriptions.provider, "stripe"),
        isNotNull(premiumSubscriptions.providerCustomerId),
      ),
    )
    .orderBy(desc(premiumSubscriptions.updatedAt))
    .limit(1);
  if (!subscription?.providerCustomerId) {
    return NextResponse.json(
      {
        error: {
          code: "billing_account_not_found",
          message: "No Stripe billing account is connected to this profile",
        },
      },
      { status: 404 },
    );
  }
  try {
    const configuration = stripeBillingPortalConfiguration();
    const session = await getStripe().billingPortal.sessions.create({
      customer: subscription.providerCustomerId,
      return_url: `${getRequestOrigin(request)}/plus/account`,
      ...(configuration ? { configuration } : {}),
    });
    await writePremiumAudit({
      request,
      actorClerkId: user.clerkId,
      action: "billing_portal.opened",
      targetType: "subscription",
      targetId: subscription.id,
    });
    return NextResponse.json(
      { data: { url: session.url }, meta: { apiVersion: "1" } },
      { status: 201 },
    );
  } catch (error) {
    console.error("Stripe billing portal session failed", {
      userClerkId: user.clerkId,
      error,
    });
    return NextResponse.json(
      {
        error: {
          code: "billing_portal_failed",
          message: "Billing management could not be opened",
        },
      },
      { status: 502 },
    );
  }
}
