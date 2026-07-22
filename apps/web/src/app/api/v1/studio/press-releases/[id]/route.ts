import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb, hasDatabase } from "@harborline/backend/db";
import { pressReleases } from "@harborline/backend/schema";
import { requireEmployeeCapability, writeEmployeeAudit } from "@/lib/employee-auth";
import { pressReleaseInput } from "@/lib/press-release";

const idSchema = z.string().uuid();

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const viewer = await requireEmployeeCapability("tools:press");
  if (!viewer) return NextResponse.json({ error: { code: "forbidden", message: "Press-release access is required" } }, { status: 403 });
  if (!hasDatabase()) return NextResponse.json({ error: { code: "service_not_configured", message: "Postgres is required for press releases" } }, { status: 503 });
  const { id } = await context.params;
  if (!idSchema.safeParse(id).success) return NextResponse.json({ error: { code: "not_found", message: "Press release not found" } }, { status: 404 });
  const [data] = await getDb().select().from(pressReleases).where(eq(pressReleases.id, id)).limit(1);
  return data
    ? NextResponse.json({ data, meta: { apiVersion: "1" } })
    : NextResponse.json({ error: { code: "not_found", message: "Press release not found" } }, { status: 404 });
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const viewer = await requireEmployeeCapability("tools:press");
  if (!viewer) return NextResponse.json({ error: { code: "forbidden", message: "Press-release access is required" } }, { status: 403 });
  if (!hasDatabase()) return NextResponse.json({ error: { code: "service_not_configured", message: "Postgres is required to save a press release" } }, { status: 503 });
  const { id } = await context.params;
  if (!idSchema.safeParse(id).success) return NextResponse.json({ error: { code: "not_found", message: "Press release not found" } }, { status: 404 });
  const parsed = pressReleaseInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: { code: "invalid_request", message: "Review the press-release fields", details: parsed.error.flatten() } }, { status: 400 });
  const [data] = await getDb().update(pressReleases).set({
    ...parsed.data,
    releaseAt: parsed.data.releaseAt ? new Date(parsed.data.releaseAt) : null,
    updatedByClerkId: viewer.id,
    updatedAt: new Date(),
  }).where(eq(pressReleases.id, id)).returning();
  if (!data) return NextResponse.json({ error: { code: "not_found", message: "Press release not found" } }, { status: 404 });
  await writeEmployeeAudit(request, viewer, "press_release.updated", { type: "press_release", id }, { documentType: data.documentType, status: data.status });
  return NextResponse.json({ data, meta: { apiVersion: "1" } });
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  const viewer = await requireEmployeeCapability("tools:press");
  if (!viewer) return NextResponse.json({ error: { code: "forbidden", message: "Press-release access is required" } }, { status: 403 });
  if (!hasDatabase()) return NextResponse.json({ error: { code: "service_not_configured", message: "Postgres is required to archive a press release" } }, { status: 503 });
  const { id } = await context.params;
  if (!idSchema.safeParse(id).success) return NextResponse.json({ error: { code: "not_found", message: "Press release not found" } }, { status: 404 });
  const [data] = await getDb().update(pressReleases).set({ status: "archived", updatedByClerkId: viewer.id, updatedAt: new Date() }).where(eq(pressReleases.id, id)).returning();
  if (!data) return NextResponse.json({ error: { code: "not_found", message: "Press release not found" } }, { status: 404 });
  await writeEmployeeAudit(request, viewer, "press_release.archived", { type: "press_release", id });
  return NextResponse.json({ data, meta: { apiVersion: "1" } });
}
