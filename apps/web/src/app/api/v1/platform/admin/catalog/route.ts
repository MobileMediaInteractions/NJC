import { getDb, hasDatabase } from "@harborline/backend/db";
import {
  platformApplicationIdentities,
  platformApplications,
  platformCustomers,
  platformOrganizations,
  platformPlanEntitlements,
  platformPlans,
  platformProducts,
} from "@harborline/backend/schema";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireEmployeeCapability, writeEmployeeAudit } from "@/lib/employee-auth";

export const runtime = "nodejs";

const schema = z.object({
  organizationName: z.string().min(2).max(200),
  customerEmail: z.string().email().optional(),
  productSlug: z.string().regex(/^[a-z0-9-]{2,80}$/),
  productName: z.string().min(2).max(200),
  applicationName: z.string().min(2).max(200),
  identity: z.object({
    platform: z.enum(["web", "ios", "android", "tvos", "androidtv", "roku", "node"]),
    environment: z.enum(["development", "preview", "staging", "production"]),
    buildId: z.string().min(1).max(200),
    bundleOrPackageId: z.string().min(1).max(300).optional(),
    signingIdentity: z.string().min(1).max(500).optional(),
    host: z.string().min(1).max(300).optional(),
    attestationRequired: z.boolean().default(true),
  }).strict(),
  plan: z.object({
    slug: z.string().regex(/^[a-z0-9-]{2,80}$/),
    name: z.string().min(2).max(200),
    features: z.array(z.string().min(1).max(200)).min(1).max(100),
    seatLimit: z.number().int().min(1).max(100_000).default(1),
    deviceLimit: z.number().int().min(1).max(100_000).default(1),
    onlineLeaseSeconds: z.number().int().min(60).max(86_400).default(3_600),
    offlineLeaseSeconds: z.number().int().min(60).max(31_536_000).default(86_400),
    graceSeconds: z.number().int().min(0).max(604_800).default(300),
    usageLimits: z.record(z.string(), z.number().nonnegative()).default({}),
  }).strict(),
}).strict();

export async function POST(request: Request) {
  const viewer = await requireEmployeeCapability("platform:license-admin");
  if (!viewer) return NextResponse.json({ error: { code: "forbidden", message: "License administration access required" } }, { status: 403 });
  if (!hasDatabase()) return NextResponse.json({ error: { code: "service_not_configured", message: "DATABASE_URL is not configured" } }, { status: 503 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: { code: "invalid_request", message: "Catalog definition is invalid", details: parsed.error.flatten() } }, { status: 400 });
  try {
    const db = getDb();
    const [organization] = await db.insert(platformOrganizations).values({ name: parsed.data.organizationName }).returning();
    const [customer] = await db.insert(platformCustomers).values({ organizationId: organization.id, email: parsed.data.customerEmail }).returning();
    const [product] = await db.insert(platformProducts).values({ slug: parsed.data.productSlug, name: parsed.data.productName }).returning();
    const [application] = await db.insert(platformApplications).values({ organizationId: organization.id, productId: product.id, name: parsed.data.applicationName }).returning();
    const [identity] = await db.insert(platformApplicationIdentities).values({ applicationId: application.id, ...parsed.data.identity }).returning();
    const { features, ...planInput } = parsed.data.plan;
    const [plan] = await db.insert(platformPlans).values({ productId: product.id, ...planInput }).returning();
    await db.insert(platformPlanEntitlements).values([...new Set(features)].map((featureId) => ({ planId: plan.id, featureId })));
    await writeEmployeeAudit(request, viewer, "platform.catalog.created", { type: "application", id: application.id }, { productId: product.id, planId: plan.id });
    return NextResponse.json({ data: { organization, customer, product, application, identity, plan, features: [...new Set(features)].sort() }, meta: { apiVersion: "1" } }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: { code: "catalog_create_failed", message: "Catalog could not be created; inspect server logs and retry with unique slugs" } }, { status: 409 });
  }
}
