import { getDb, hasDatabase } from "@harborline/backend/db";
import { platformLicenses } from "@harborline/backend/schema";
import { desc } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireEmployeeCapability, writeEmployeeAudit } from "@/lib/employee-auth";
import { generateLicenseKey, recordLicenseVersion } from "@/lib/platform-license-server";

export const runtime = "nodejs";

const schema = z.object({
  organizationId: z.string().uuid(),
  customerId: z.string().uuid(),
  productId: z.string().uuid(),
  applicationId: z.string().uuid(),
  planId: z.string().uuid(),
  kind: z.enum(["commercial", "trial", "development"]),
  startsAt: z.coerce.date().optional(),
  expiresAt: z.coerce.date().optional(),
}).strict();

export async function GET() {
  const viewer = await requireEmployeeCapability("platform:license-admin");
  if (!viewer) return NextResponse.json({ error: { code: "forbidden", message: "License administration access required" } }, { status: 403 });
  if (!hasDatabase()) return NextResponse.json({ data: [], meta: { apiVersion: "1" } });
  const data = await getDb().select({
    id: platformLicenses.id,
    kind: platformLicenses.kind,
    status: platformLicenses.status,
    version: platformLicenses.version,
    keyPrefix: platformLicenses.keyPrefix,
    applicationId: platformLicenses.applicationId,
    planId: platformLicenses.planId,
    startsAt: platformLicenses.startsAt,
    expiresAt: platformLicenses.expiresAt,
    createdAt: platformLicenses.createdAt,
  }).from(platformLicenses).orderBy(desc(platformLicenses.createdAt)).limit(100);
  return NextResponse.json({ data, meta: { apiVersion: "1" } });
}
export async function POST(request: Request) {
  const viewer = await requireEmployeeCapability("platform:license-admin");
  if (!viewer) return NextResponse.json({ error: { code: "forbidden", message: "License administration access required" } }, { status: 403 });
  if (!hasDatabase()) return NextResponse.json({ error: { code: "service_not_configured", message: "DATABASE_URL is not configured" } }, { status: 503 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success || (parsed.data?.expiresAt && parsed.data.startsAt && parsed.data.expiresAt <= parsed.data.startsAt)) {
    return NextResponse.json({ error: { code: "invalid_request", message: "License definition is invalid" } }, { status: 400 });
  }
  try {
    const generated = generateLicenseKey();
    const [license] = await getDb().insert(platformLicenses).values({
      ...parsed.data,
      keyPrefix: generated.prefix,
      keyHash: generated.hash,
    }).returning();
    await recordLicenseVersion(license, viewer.id);
    await writeEmployeeAudit(request, viewer, "platform.license.created", { type: "license", id: license.id }, { kind: license.kind });
    return NextResponse.json({
      data: { license: { ...license, keyHash: undefined }, licenseKey: generated.key },
      meta: { apiVersion: "1", secretShownOnce: true },
    }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: { code: "license_create_failed", message: "License could not be created from the supplied catalog references" } }, { status: 409 });
  }
}
