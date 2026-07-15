import { getDb, hasDatabase } from "@harborline/backend/db";
import { platformLicenses } from "@harborline/backend/schema";
import { eq, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireEmployeeCapability, writeEmployeeAudit } from "@/lib/employee-auth";
import { recordLicenseVersion } from "@/lib/platform-license-server";

export const runtime = "nodejs";
const schema = z.object({ status: z.enum(["active", "suspended", "revoked"]) }).strict();

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const viewer = await requireEmployeeCapability("platform:license-admin");
  if (!viewer) return NextResponse.json({ error: { code: "forbidden", message: "License administration access required" } }, { status: 403 });
  if (!hasDatabase()) return NextResponse.json({ error: { code: "service_not_configured", message: "DATABASE_URL is not configured" } }, { status: 503 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: { code: "invalid_request", message: "Status is invalid" } }, { status: 400 });
  const { id } = await context.params;
  const now = new Date();
  const [license] = await getDb().update(platformLicenses).set({
    status: parsed.data.status,
    version: sql`${platformLicenses.version} + 1`,
    updatedAt: now,
    suspendedAt: parsed.data.status === "suspended" ? now : null,
    revokedAt: parsed.data.status === "revoked" ? now : null,
  }).where(eq(platformLicenses.id, id)).returning();
  if (!license) return NextResponse.json({ error: { code: "not_found", message: "License not found" } }, { status: 404 });
  await recordLicenseVersion(license, viewer.id);
  await writeEmployeeAudit(request, viewer, `platform.license.${parsed.data.status}`, { type: "license", id }, { version: license.version });
  return NextResponse.json({ data: { ...license, keyHash: undefined }, meta: { apiVersion: "1" } });
}
