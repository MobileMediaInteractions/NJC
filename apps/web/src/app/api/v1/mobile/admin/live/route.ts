import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb, hasDatabase } from "@harborline/backend/db";
import { siteSettings } from "@harborline/backend/schema";
import { requireEmployeeCapability } from "@/lib/employee-auth";

export async function PATCH(request: Request) {
  const viewer = await requireEmployeeCapability("tools:live");
  if (!viewer) return NextResponse.json({ error: { code: "forbidden", message: "Live-tools permission required" } }, { status: 403 });
  if (!hasDatabase()) return NextResponse.json({ error: { code: "service_not_configured", message: "Postgres is not configured" } }, { status: 503 });
  const parsed = z.object({ isLive: z.boolean() }).safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: { code: "invalid_request", message: "isLive must be a boolean" } }, { status: 400 });
  const [record] = await getDb().insert(siteSettings).values({ key: "live_banner", value: { enabled: parsed.data.isLive }, updatedByClerkId: viewer.id }).onConflictDoUpdate({ target: siteSettings.key, set: { value: { enabled: parsed.data.isLive }, updatedByClerkId: viewer.id, updatedAt: new Date() } }).returning();
  return NextResponse.json({ data: record, meta: { apiVersion: "1" } });
}
