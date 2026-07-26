import { and, desc, eq, gt, isNull, lte, or } from "drizzle-orm";
import { getDb, hasDatabase } from "@harborline/backend/db";
import {
  premiumBetaTesterGrants,
  premiumEntitlements,
  premiumSubscriptions,
} from "@harborline/backend/schema";
import { getOptionalAccountId } from "@/lib/auth";
import {
  classifyNjcPlusEntitlement,
  isBetaTesterGrantActive,
  type BetaTesterGrantLike,
} from "@/lib/njc-plus-beta-contract";

export function getInvitedBetaTesterLimit() {
  const configured = Number(process.env.NJC_PLUS_INVITED_BETA_LIMIT ?? 10);
  return Number.isInteger(configured) ? Math.min(Math.max(configured, 1), 25) : 10;
}

export async function getActiveBetaTesterGrant(suppliedUserId?: string | null) {
  const userId = suppliedUserId === undefined ? await getOptionalAccountId() : suppliedUserId;
  if (!userId || !hasDatabase()) return null;
  const now = new Date();
  const [grant] = await getDb().select().from(premiumBetaTesterGrants).where(and(
    eq(premiumBetaTesterGrants.userClerkId, userId),
    eq(premiumBetaTesterGrants.status, "active"),
    lte(premiumBetaTesterGrants.startsAt, now),
    gt(premiumBetaTesterGrants.endsAt, now),
  )).orderBy(desc(premiumBetaTesterGrants.createdAt)).limit(1);
  return grant && isBetaTesterGrantActive(grant as BetaTesterGrantLike, now) ? grant : null;
}

export async function getNjcPlusIdentityState(userId: string) {
  if (!hasDatabase()) {
    return {
      entitlementType: "none" as const,
      paidMember: false,
      trial: false,
      complimentary: false,
      betaGrant: null,
    };
  }
  const now = new Date();
  const [subscriptions, entitlements, betaGrant] = await Promise.all([
    getDb().select({ status: premiumSubscriptions.status }).from(premiumSubscriptions).where(and(
      eq(premiumSubscriptions.userClerkId, userId),
      or(eq(premiumSubscriptions.status, "active"), eq(premiumSubscriptions.status, "trialing")),
      or(isNull(premiumSubscriptions.currentPeriodEndsAt), gt(premiumSubscriptions.currentPeriodEndsAt, now)),
    )),
    getDb().select({ sourceType: premiumEntitlements.sourceType }).from(premiumEntitlements).where(and(
      eq(premiumEntitlements.userClerkId, userId),
      eq(premiumEntitlements.status, "active"),
      lte(premiumEntitlements.startsAt, now),
      or(isNull(premiumEntitlements.endsAt), gt(premiumEntitlements.endsAt, now)),
      or(eq(premiumEntitlements.scopeType, "product"), eq(premiumEntitlements.scopeType, "tier")),
    )),
    getActiveBetaTesterGrant(userId),
  ]);
  const paidMember = subscriptions.some((item) => item.status === "active");
  const trial = subscriptions.some((item) => item.status === "trialing") ||
    entitlements.some((item) => item.sourceType === "trial");
  const complimentary = entitlements.some((item) =>
    ["manual", "promotion", "complimentary"].includes(item.sourceType),
  );
  return {
    entitlementType: classifyNjcPlusEntitlement({
      paidMember,
      trial,
      complimentary,
      invitedBetaTester: Boolean(betaGrant),
    }),
    paidMember,
    trial,
    complimentary,
    betaGrant,
  };
}
