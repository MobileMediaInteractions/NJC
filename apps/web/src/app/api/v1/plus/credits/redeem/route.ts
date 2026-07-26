import { and, eq, gt, isNull, lte, or, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb, hasDatabase } from "@harborline/backend/db";
import { accessCreditLedger, accessCreditRedemptionRules, accessCreditRedemptions, premiumEntitlements } from "@harborline/backend/schema";
import { getAccountIdentity } from "@/lib/auth";
import { expireAccessCredits } from "@/lib/access-credits";
import { resolveNjcPlusSurface, writePremiumAudit } from "@/lib/njc-plus";

const input = z.object({ ruleId: z.uuid() });

export async function POST(request: Request) {
  const surface = await resolveNjcPlusSurface({ feature: "njc_plus_access_credits" });
  if (!surface.available) return NextResponse.json({ error: { code: "not_found", message: "Not found" } }, { status: 404 });
  const user = await getAccountIdentity();
  if (!user) return NextResponse.json({ error: { code: "unauthorized", message: "Sign in to redeem Access Credits" } }, { status: 401 });
  if (!hasDatabase()) return NextResponse.json({ error: { code: "service_not_configured", message: "Access Credits are unavailable" } }, { status: 503 });
  const parsed = input.safeParse(await request.json().catch(() => null));
  const idempotencyKey = request.headers.get("idempotency-key")?.trim().slice(0, 200);
  if (!parsed.success || !idempotencyKey || idempotencyKey.length < 8) return NextResponse.json({ error: { code: "invalid_request", message: "A valid redemption rule and idempotency key are required" } }, { status: 400 });
  const now = new Date();
  try {
    await expireAccessCredits(now, user.clerkId);
    const result = await getDb().transaction(async (tx) => {
      const [existing] = await tx.select().from(accessCreditRedemptions).where(eq(accessCreditRedemptions.idempotencyKey, idempotencyKey)).limit(1);
      if (existing) return { existing: true, redemption: existing };
      const [rule] = await tx.select().from(accessCreditRedemptionRules).where(and(
        eq(accessCreditRedemptionRules.id, parsed.data.ruleId),
        eq(accessCreditRedemptionRules.active, true),
        or(isNull(accessCreditRedemptionRules.startsAt), lte(accessCreditRedemptionRules.startsAt, now)),
        or(isNull(accessCreditRedemptionRules.endsAt), gt(accessCreditRedemptionRules.endsAt, now)),
      )).limit(1);
      if (!rule) throw new RedemptionError("rule_unavailable", "That redemption is not available");
      const [balanceRow] = await tx.select({ value: sql<number>`coalesce(sum(${accessCreditLedger.amount}), 0)` }).from(accessCreditLedger).where(eq(accessCreditLedger.userClerkId, user.clerkId));
      const balance = Number(balanceRow?.value ?? 0);
      if (balance < rule.costCredits) throw new RedemptionError("insufficient_credits", "This account does not have enough Access Credits");
      const [ledger] = await tx.insert(accessCreditLedger).values({
        userClerkId: user.clerkId,
        amount: -rule.costCredits,
        transactionType: "redemption",
        reason: `Redeemed: ${rule.name}`,
        sourceType: "redemption_rule",
        sourceId: rule.id,
        idempotencyKey: `redeem:${idempotencyKey}`,
        createdByClerkId: user.clerkId,
      }).returning();
      let scopeType = "product";
      let scopeId = "njc_plus";
      if (rule.contentId) { scopeType = "content"; scopeId = rule.contentId; }
      else if (rule.tierId) { scopeType = "tier"; scopeId = rule.tierId; }
      const durationDays = benefitDays(rule.benefitType, rule.benefitValue);
      const [entitlement] = await tx.insert(premiumEntitlements).values({
        userClerkId: user.clerkId, scopeType, scopeId, sourceType: "credit_redemption", sourceId: rule.id,
        endsAt: durationDays ? new Date(now.getTime() + durationDays * 86_400_000) : null,
        metadata: { ruleName: rule.name, costCredits: rule.costCredits },
      }).returning();
      const [redemption] = await tx.insert(accessCreditRedemptions).values({
        userClerkId: user.clerkId, ruleId: rule.id, ledgerTransactionId: ledger.id, entitlementId: entitlement.id, idempotencyKey,
      }).returning();
      return { existing: false, redemption, remainingBalance: balance - rule.costCredits };
    });
    await writePremiumAudit({ request, actorClerkId: user.clerkId, action: "credits.redeemed", targetType: "redemption", targetId: result.redemption.id, metadata: { ruleId: parsed.data.ruleId, existing: result.existing } });
    return NextResponse.json({ data: result, meta: { apiVersion: "1" } }, { status: result.existing ? 200 : 201 });
  } catch (error) {
    if (error instanceof RedemptionError) return NextResponse.json({ error: { code: error.code, message: error.message } }, { status: 409 });
    console.error("Access Credit redemption failed", error);
    return NextResponse.json({ error: { code: "redemption_failed", message: "The redemption could not be completed" } }, { status: 500 });
  }
}
class RedemptionError extends Error { constructor(readonly code: string, message: string) { super(message); } }
function benefitDays(type: string, value: number | null) { if (!value) return null; if (type === "days") return value; if (type === "weeks") return value * 7; if (type === "months") return value * 30; if (type === "rental") return Math.max(1, Math.ceil(value / 24)); return null; }
