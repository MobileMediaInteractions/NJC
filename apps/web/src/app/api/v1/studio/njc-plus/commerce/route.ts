import { desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb, hasDatabase } from "@harborline/backend/db";
import {
  accessCreditRedemptionRules,
  premiumOffers,
  premiumTiers,
} from "@harborline/backend/schema";
import { getStudioUser } from "@/lib/auth";
import { writePremiumAudit } from "@/lib/njc-plus";

const tierInput = z.object({
  resource: z.literal("tier"),
  id: z.uuid().optional(),
  slug: z.string().trim().min(2).max(80).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  name: z.string().trim().min(2).max(100),
  description: z.string().trim().max(500).default(""),
  priceCents: z.number().int().min(0).max(10_000_000),
  currency: z.string().trim().length(3).default("usd"),
  interval: z.enum(["day", "week", "month", "year", "one_time"]).default("month"),
  benefits: z.array(z.string().min(1).max(160)).max(30).default([]),
  capabilities: z.array(z.string().min(1).max(100)).max(50).default([]),
  trialEligible: z.boolean().default(false),
  accessCreditEligible: z.boolean().default(false),
  available: z.boolean().default(false),
  visible: z.boolean().default(false),
  providerPriceId: z.string().trim().max(180).nullable().optional(),
});

const offerInput = z.object({
  resource: z.literal("offer"),
  id: z.uuid().optional(),
  slug: z.string().trim().min(2).max(80).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  tierId: z.uuid(),
  name: z.string().trim().min(2).max(120),
  promotionalText: z.string().trim().max(500).default(""),
  priceCents: z.number().int().min(0).max(10_000_000).default(100),
  durationDays: z.number().int().min(1).max(3_650).default(3),
  active: z.boolean().default(false),
  perUserLimit: z.number().int().min(1).max(100).default(1),
  paymentRequired: z.boolean().default(true),
  autoRenews: z.boolean().default(true),
  renewalPriceCents: z.number().int().min(0).max(10_000_000).nullable().optional(),
  startsAt: z.iso.datetime().nullable().optional(),
  endsAt: z.iso.datetime().nullable().optional(),
  providerPriceId: z.string().trim().max(180).nullable().optional(),
});

const creditRuleInput = z.object({
  resource: z.literal("credit_rule"),
  id: z.uuid().optional(),
  name: z.string().trim().min(2).max(120),
  active: z.boolean().default(false),
  costCredits: z.number().int().min(1).max(10_000_000),
  benefitType: z.enum(["days", "weeks", "months", "tier_upgrade", "content_unlock", "rental"]),
  benefitValue: z.number().int().min(1).max(100_000).nullable().optional(),
  tierId: z.uuid().nullable().optional(),
  contentId: z.uuid().nullable().optional(),
  startsAt: z.iso.datetime().nullable().optional(),
  endsAt: z.iso.datetime().nullable().optional(),
}).superRefine((value, context) => {
  if (["days", "weeks", "months", "rental"].includes(value.benefitType) && !value.benefitValue) {
    context.addIssue({ code: "custom", path: ["benefitValue"], message: "This benefit requires a duration" });
  }
  if (value.benefitType === "tier_upgrade" && !value.tierId) {
    context.addIssue({ code: "custom", path: ["tierId"], message: "Tier upgrades require a tier" });
  }
  if (value.benefitType === "content_unlock" && !value.contentId) {
    context.addIssue({ code: "custom", path: ["contentId"], message: "Content unlocks require content" });
  }
});

const input = z.discriminatedUnion("resource", [tierInput, offerInput, creditRuleInput]);

export async function GET() {
  const viewer = await getStudioUser();
  if (!viewer) return NextResponse.json({ error: { code: "unauthorized", message: "Newsroom sign-in required" } }, { status: 401 });
  if (!hasDatabase()) return NextResponse.json({ data: { tiers: [], offers: [], creditRules: [] }, meta: { apiVersion: "1", database: false } });
  const [tiers, offers, creditRules] = await Promise.all([
    getDb().select().from(premiumTiers).orderBy(premiumTiers.priceCents),
    getDb().select().from(premiumOffers).orderBy(desc(premiumOffers.updatedAt)),
    getDb().select().from(accessCreditRedemptionRules).orderBy(accessCreditRedemptionRules.costCredits),
  ]);
  return NextResponse.json({ data: { tiers, offers, creditRules }, meta: { apiVersion: "1" } });
}

export async function POST(request: Request) {
  const viewer = await getStudioUser();
  if (!viewer || viewer.role !== "admin") return NextResponse.json({ error: { code: "forbidden", message: "Administrator access is required for pricing and access rules" } }, { status: 403 });
  if (!hasDatabase()) return NextResponse.json({ error: { code: "service_not_configured", message: "Postgres is required" } }, { status: 503 });
  const parsed = input.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: { code: "invalid_request", message: "Check the pricing or access rule", details: parsed.error.flatten() } }, { status: 400 });
  const value = parsed.data;
  let record: unknown;
  if (value.resource === "tier") {
    const { resource: _resource, id, ...fields } = value;
    void _resource;
    [record] = id
      ? await getDb().update(premiumTiers).set({ ...fields, providerPriceId: fields.providerPriceId || null, updatedAt: new Date() }).where(eq(premiumTiers.id, id)).returning()
      : await getDb().insert(premiumTiers).values({ ...fields, providerPriceId: fields.providerPriceId || null }).returning();
  } else if (value.resource === "offer") {
    const { resource: _resource, id, startsAt, endsAt, ...fields } = value;
    void _resource;
    const values = { ...fields, startsAt: startsAt ? new Date(startsAt) : null, endsAt: endsAt ? new Date(endsAt) : null, providerPriceId: fields.providerPriceId || null, updatedAt: new Date() };
    [record] = id ? await getDb().update(premiumOffers).set(values).where(eq(premiumOffers.id, id)).returning() : await getDb().insert(premiumOffers).values(values).returning();
  } else {
    const { resource: _resource, id, startsAt, endsAt, ...fields } = value;
    void _resource;
    const values = { ...fields, tierId: fields.tierId || null, contentId: fields.contentId || null, startsAt: startsAt ? new Date(startsAt) : null, endsAt: endsAt ? new Date(endsAt) : null, updatedAt: new Date() };
    [record] = id ? await getDb().update(accessCreditRedemptionRules).set(values).where(eq(accessCreditRedemptionRules.id, id)).returning() : await getDb().insert(accessCreditRedemptionRules).values(values).returning();
  }
  if (!record) return NextResponse.json({ error: { code: "not_found", message: "The pricing resource was not found" } }, { status: 404 });
  await writePremiumAudit({ request, actorClerkId: viewer.id, action: `${value.resource}.saved`, targetType: value.resource, targetId: String((record as { id: string }).id), metadata: { active: "active" in value ? value.active : undefined } });
  return NextResponse.json({ data: record, meta: { apiVersion: "1" } }, { status: value.id ? 200 : 201 });
}
