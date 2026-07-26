import { and, count, desc, eq, gt, inArray } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb, hasDatabase } from "@harborline/backend/db";
import {
  accessCreditLedger,
  premiumBetaTesterGrants,
  premiumContent,
  premiumEntitlements,
  premiumTiers,
} from "@harborline/backend/schema";
import { getStudioUser } from "@/lib/auth";
import { njcPlusInvitedBetaFeatures } from "@/lib/feature-flags";
import { getInvitedBetaTesterLimit, getNjcPlusIdentityState } from "@/lib/njc-plus-beta";
import { sumAccessCredits, writePremiumAudit } from "@/lib/njc-plus";

const grantInput = z.object({
  action: z.literal("grant_access"),
  userClerkId: z.string().trim().min(3).max(200),
  scopeType: z.enum(["product", "tier", "content"]),
  scopeId: z.string().trim().min(1).max(200),
  sourceType: z.enum(["manual", "trial", "promotion", "complimentary"]),
  startsAt: z.iso.datetime().optional(),
  endsAt: z.iso.datetime().nullable().optional(),
  reason: z.string().trim().min(8).max(500),
});
const creditInput = z.object({
  action: z.literal("credit_transaction"),
  userClerkId: z.string().trim().min(3).max(200),
  amount: z.number().int().min(-10_000_000).max(10_000_000).refine((value) => value !== 0),
  transactionType: z.enum(["grant", "deduction", "expiration", "refund", "correction", "reversal"]),
  reason: z.string().trim().min(8).max(500),
  idempotencyKey: z.string().trim().min(8).max(200).optional(),
  expiresAt: z.iso.datetime().nullable().optional(),
});
const entitlementAction = z.object({
  action: z.enum(["revoke_access", "pause_access", "resume_access"]),
  entitlementId: z.uuid(),
  reason: z.string().trim().min(8).max(500),
});
const adjustEntitlement = z.object({
  action: z.literal("adjust_access"),
  entitlementId: z.uuid(),
  endsAt: z.iso.datetime().nullable(),
  reason: z.string().trim().min(8).max(500),
});
const betaGrantFields = {
  featureKeys: z.array(z.enum(njcPlusInvitedBetaFeatures)).min(1).max(njcPlusInvitedBetaFeatures.length),
  premiumContentIncluded: z.boolean(),
  contentIds: z.array(z.uuid()).max(100).default([]),
  showMemberBranding: z.boolean(),
  startsAt: z.iso.datetime(),
  endsAt: z.iso.datetime(),
  reason: z.string().trim().min(8).max(500),
};
const grantBetaTester = z.object({
  action: z.literal("grant_invited_beta"),
  userClerkId: z.string().trim().min(3).max(200),
  ...betaGrantFields,
});
const updateBetaTester = z.object({
  action: z.literal("update_invited_beta"),
  grantId: z.uuid(),
  ...betaGrantFields,
});
const betaTesterAction = z.object({
  action: z.enum(["pause_invited_beta", "resume_invited_beta", "revoke_invited_beta"]),
  grantId: z.uuid(),
  reason: z.string().trim().min(8).max(500),
});
const input = z.discriminatedUnion("action", [
  grantInput,
  creditInput,
  entitlementAction,
  adjustEntitlement,
  grantBetaTester,
  updateBetaTester,
  betaTesterAction,
]);

export async function GET(request: Request) {
  const viewer = await getStudioUser();
  if (!viewer || viewer.role !== "admin") return NextResponse.json({ error: { code: "forbidden", message: "Administrator access is required" } }, { status: 403 });
  if (!hasDatabase()) return NextResponse.json({ data: { entitlements: [], betaGrants: [], ledger: [], balance: 0, betaCapacity: { used: 0, limit: getInvitedBetaTesterLimit() } }, meta: { apiVersion: "1", database: false } });
  const userClerkId = new URL(request.url).searchParams.get("userClerkId")?.trim();
  const now = new Date();
  const [{ value: betaUsed }] = await getDb().select({ value: count() }).from(premiumBetaTesterGrants).where(and(
    inArray(premiumBetaTesterGrants.status, ["active", "paused"]),
    gt(premiumBetaTesterGrants.endsAt, now),
  ));
  const betaCapacity = { used: Number(betaUsed), limit: getInvitedBetaTesterLimit() };
  if (!userClerkId) return NextResponse.json({ data: { entitlements: [], betaGrants: [], ledger: [], balance: null, betaCapacity }, meta: { apiVersion: "1" } });
  const [entitlements, betaGrants, ledger] = await Promise.all([
    getDb().select().from(premiumEntitlements).where(eq(premiumEntitlements.userClerkId, userClerkId)).orderBy(desc(premiumEntitlements.createdAt)).limit(100),
    getDb().select().from(premiumBetaTesterGrants).where(eq(premiumBetaTesterGrants.userClerkId, userClerkId)).orderBy(desc(premiumBetaTesterGrants.createdAt)).limit(100),
    getDb().select().from(accessCreditLedger).where(eq(accessCreditLedger.userClerkId, userClerkId)).orderBy(desc(accessCreditLedger.createdAt)).limit(500),
  ]);
  return NextResponse.json({ data: { entitlements, betaGrants, ledger, balance: sumAccessCredits(ledger), betaCapacity }, meta: { apiVersion: "1" } });
}

export async function POST(request: Request) {
  const viewer = await getStudioUser();
  if (!viewer || viewer.role !== "admin") return NextResponse.json({ error: { code: "forbidden", message: "Administrator access is required" } }, { status: 403 });
  if (!hasDatabase()) return NextResponse.json({ error: { code: "service_not_configured", message: "Postgres is required" } }, { status: 503 });
  const parsed = input.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: { code: "invalid_request", message: "Check the access action and provide an audit reason", details: parsed.error.flatten() } }, { status: 400 });
  const value = parsed.data;
  if (value.action === "grant_invited_beta" || value.action === "update_invited_beta") {
    const startsAt = new Date(value.startsAt);
    const endsAt = new Date(value.endsAt);
    const maxEnd = new Date(startsAt);
    maxEnd.setUTCFullYear(maxEnd.getUTCFullYear() + 1);
    if (endsAt <= startsAt || endsAt > maxEnd || endsAt <= new Date()) {
      return NextResponse.json({ error: { code: "invalid_window", message: "Invited beta access must end after it starts, within one year, and in the future" } }, { status: 400 });
    }
    if (value.contentIds.length) {
      const existing = await getDb().select({ id: premiumContent.id }).from(premiumContent).where(inArray(premiumContent.id, value.contentIds));
      if (existing.length !== new Set(value.contentIds).size) {
        return NextResponse.json({ error: { code: "invalid_content", message: "One or more selected premium content records do not exist" } }, { status: 400 });
      }
    }
    if (value.action === "grant_invited_beta") {
      const identity = await getNjcPlusIdentityState(value.userClerkId);
      if (identity.paidMember || identity.trial || identity.complimentary) {
        return NextResponse.json({ error: { code: "ineligible", message: "NJC+ members, trial users, and complimentary NJC+ users are not eligible for the separate invited beta entitlement" } }, { status: 409 });
      }
      if (identity.betaGrant) {
        return NextResponse.json({ error: { code: "duplicate_beta", message: "This account already has active invited beta access" } }, { status: 409 });
      }
      const now = new Date();
      const [{ value: activeCount }] = await getDb().select({ value: count() }).from(premiumBetaTesterGrants).where(and(
        inArray(premiumBetaTesterGrants.status, ["active", "paused"]),
        gt(premiumBetaTesterGrants.endsAt, now),
      ));
      if (Number(activeCount) >= getInvitedBetaTesterLimit()) {
        return NextResponse.json({ error: { code: "beta_capacity", message: "The invited beta tester capacity has been reached" } }, { status: 409 });
      }
      const [record] = await getDb().insert(premiumBetaTesterGrants).values({
        userClerkId: value.userClerkId,
        featureKeys: [...new Set(value.featureKeys)],
        premiumContentIncluded: value.premiumContentIncluded,
        contentIds: [...new Set(value.contentIds)],
        showMemberBranding: value.showMemberBranding,
        startsAt,
        endsAt,
        invitedByClerkId: viewer.id,
        reason: value.reason,
      }).returning();
      await writePremiumAudit({ request, actorClerkId: viewer.id, action: "invited_beta.granted", targetType: "beta_tester_grant", targetId: record.id, reason: value.reason, metadata: { userClerkId: value.userClerkId, featureKeys: record.featureKeys, premiumContentIncluded: record.premiumContentIncluded, showMemberBranding: record.showMemberBranding, startsAt, endsAt } });
      return NextResponse.json({ data: record, meta: { apiVersion: "1", entitlementType: "invited_beta_tester" } }, { status: 201 });
    }
    const [record] = await getDb().update(premiumBetaTesterGrants).set({
      featureKeys: [...new Set(value.featureKeys)],
      premiumContentIncluded: value.premiumContentIncluded,
      contentIds: [...new Set(value.contentIds)],
      showMemberBranding: value.showMemberBranding,
      startsAt,
      endsAt,
      updatedAt: new Date(),
      metadata: { lastAdjustmentReason: value.reason, lastAdjustedBy: viewer.id },
    }).where(eq(premiumBetaTesterGrants.id, value.grantId)).returning();
    if (!record) return NextResponse.json({ error: { code: "not_found", message: "Invited beta tester grant not found" } }, { status: 404 });
    await writePremiumAudit({ request, actorClerkId: viewer.id, action: "invited_beta.updated", targetType: "beta_tester_grant", targetId: record.id, reason: value.reason, metadata: { featureKeys: record.featureKeys, premiumContentIncluded: record.premiumContentIncluded, showMemberBranding: record.showMemberBranding, startsAt, endsAt } });
    return NextResponse.json({ data: record, meta: { apiVersion: "1", entitlementType: "invited_beta_tester" } });
  }
  if (value.action === "pause_invited_beta" || value.action === "resume_invited_beta" || value.action === "revoke_invited_beta") {
    const now = new Date();
    const updates = value.action === "pause_invited_beta"
      ? { status: "paused", pausedAt: now, updatedAt: now }
      : value.action === "resume_invited_beta"
        ? { status: "active", pausedAt: null, updatedAt: now }
        : { status: "revoked", revokedAt: now, revokedByClerkId: viewer.id, updatedAt: now };
    const [record] = await getDb().update(premiumBetaTesterGrants).set(updates).where(eq(premiumBetaTesterGrants.id, value.grantId)).returning();
    if (!record) return NextResponse.json({ error: { code: "not_found", message: "Invited beta tester grant not found" } }, { status: 404 });
    await writePremiumAudit({ request, actorClerkId: viewer.id, action: `invited_beta.${value.action.replace("_invited_beta", "")}`, targetType: "beta_tester_grant", targetId: record.id, reason: value.reason });
    return NextResponse.json({ data: record, meta: { apiVersion: "1", entitlementType: "invited_beta_tester" } });
  }
  if (value.action === "grant_access") {
    if (value.scopeType === "product" && value.scopeId !== "njc_plus") {
      return NextResponse.json({ error: { code: "invalid_scope", message: "The NJC+ product scope must use njc_plus" } }, { status: 400 });
    }
    if (value.scopeType === "tier") {
      const [tier] = await getDb().select({ id: premiumTiers.id }).from(premiumTiers).where(eq(premiumTiers.id, value.scopeId)).limit(1);
      if (!tier) return NextResponse.json({ error: { code: "invalid_scope", message: "That NJC+ tier does not exist" } }, { status: 400 });
    }
    if (value.scopeType === "content") {
      const [content] = await getDb().select({ id: premiumContent.id }).from(premiumContent).where(eq(premiumContent.id, value.scopeId)).limit(1);
      if (!content) return NextResponse.json({ error: { code: "invalid_scope", message: "That NJC+ content record does not exist" } }, { status: 400 });
    }
    const [record] = await getDb().insert(premiumEntitlements).values({
      userClerkId: value.userClerkId,
      scopeType: value.scopeType,
      scopeId: value.scopeId,
      sourceType: value.sourceType,
      startsAt: value.startsAt ? new Date(value.startsAt) : new Date(),
      endsAt: value.endsAt ? new Date(value.endsAt) : null,
      metadata: { reason: value.reason, grantedBy: viewer.id },
    }).returning();
    if (value.scopeType !== "content") {
      await getDb().update(premiumBetaTesterGrants).set({
        status: "converted",
        revokedAt: new Date(),
        revokedByClerkId: viewer.id,
        updatedAt: new Date(),
        metadata: { convertedTo: value.sourceType, conversionReason: value.reason },
      }).where(and(
        eq(premiumBetaTesterGrants.userClerkId, value.userClerkId),
        inArray(premiumBetaTesterGrants.status, ["active", "paused"]),
      ));
    }
    await writePremiumAudit({ request, actorClerkId: viewer.id, action: "access.granted", targetType: "entitlement", targetId: record.id, reason: value.reason, metadata: { userClerkId: value.userClerkId, scopeType: value.scopeType, scopeId: value.scopeId } });
    return NextResponse.json({ data: record, meta: { apiVersion: "1" } }, { status: 201 });
  }
  if (value.action === "credit_transaction") {
    const [record] = await getDb().insert(accessCreditLedger).values({
      userClerkId: value.userClerkId,
      amount: value.amount,
      transactionType: value.transactionType,
      reason: value.reason,
      idempotencyKey: value.idempotencyKey,
      expiresAt: value.expiresAt ? new Date(value.expiresAt) : null,
      createdByClerkId: viewer.id,
    }).returning();
    await writePremiumAudit({ request, actorClerkId: viewer.id, action: "credits.recorded", targetType: "credit_transaction", targetId: record.id, reason: value.reason, metadata: { userClerkId: value.userClerkId, amount: value.amount, type: value.transactionType } });
    return NextResponse.json({ data: record, meta: { apiVersion: "1" } }, { status: 201 });
  }
  if (value.action === "adjust_access") {
    const [record] = await getDb().update(premiumEntitlements).set({
      endsAt: value.endsAt ? new Date(value.endsAt) : null,
      updatedAt: new Date(),
    }).where(eq(premiumEntitlements.id, value.entitlementId)).returning();
    if (!record) return NextResponse.json({ error: { code: "not_found", message: "Entitlement not found" } }, { status: 404 });
    await writePremiumAudit({
      request,
      actorClerkId: viewer.id,
      action: "access.adjusted",
      targetType: "entitlement",
      targetId: record.id,
      reason: value.reason,
      metadata: { endsAt: value.endsAt },
    });
    return NextResponse.json({ data: record, meta: { apiVersion: "1" } });
  }
  if (!["revoke_access", "pause_access", "resume_access"].includes(value.action)) {
    return NextResponse.json({ error: { code: "invalid_action", message: "Unsupported entitlement action" } }, { status: 400 });
  }
  const entitlementValue = value as z.infer<typeof entitlementAction>;
  const now = new Date();
  const updates = entitlementValue.action === "revoke_access"
    ? { status: "revoked", revokedAt: now, updatedAt: now }
    : entitlementValue.action === "pause_access"
      ? { status: "paused", pausedAt: now, updatedAt: now }
      : { status: "active", pausedAt: null, updatedAt: now };
  const [record] = await getDb().update(premiumEntitlements).set(updates).where(eq(premiumEntitlements.id, entitlementValue.entitlementId)).returning();
  if (!record) return NextResponse.json({ error: { code: "not_found", message: "Entitlement not found" } }, { status: 404 });
  await writePremiumAudit({ request, actorClerkId: viewer.id, action: `access.${entitlementValue.action.replace("_access", "")}`, targetType: "entitlement", targetId: record.id, reason: entitlementValue.reason });
  return NextResponse.json({ data: record, meta: { apiVersion: "1" } });
}
