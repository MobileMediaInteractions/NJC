import { desc } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb, hasDatabase } from "@harborline/backend/db";
import { pressReleases } from "@harborline/backend/schema";
import { requireEmployeeCapability, writeEmployeeAudit } from "@/lib/employee-auth";
import { pressReleaseInput } from "@/lib/press-release";

export const dynamic = "force-dynamic";

export async function GET() {
  const viewer = await requireEmployeeCapability("tools:press");
  if (!viewer) return NextResponse.json({ error: { code: "forbidden", message: "Press-release access is required" } }, { status: 403 });
  if (!hasDatabase()) return NextResponse.json({ error: { code: "service_not_configured", message: "Postgres is required for press releases" } }, { status: 503 });
  const data = await getDb().select().from(pressReleases).orderBy(desc(pressReleases.updatedAt)).limit(200);
  return NextResponse.json({ data, meta: { apiVersion: "1" } });
}

export async function POST(request: Request) {
  const viewer = await requireEmployeeCapability("tools:press");
  if (!viewer) return NextResponse.json({ error: { code: "forbidden", message: "Press-release access is required" } }, { status: 403 });
  if (!hasDatabase()) return NextResponse.json({ error: { code: "service_not_configured", message: "Postgres is required to save a press release" } }, { status: 503 });
  const parsed = pressReleaseInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: { code: "invalid_request", message: "Review the press-release fields", details: parsed.error.flatten() } }, { status: 400 });
  const [data] = await getDb().insert(pressReleases).values({
    ...parsed.data,
    releaseAt: parsed.data.releaseAt ? new Date(parsed.data.releaseAt) : null,
    createdByClerkId: viewer.id,
    updatedByClerkId: viewer.id,
  }).returning();
  await writeEmployeeAudit(request, viewer, "press_release.created", { type: "press_release", id: data.id }, { documentType: data.documentType, status: data.status });
  return NextResponse.json({ data, meta: { apiVersion: "1" } }, { status: 201 });
}
