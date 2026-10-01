import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb, hasDatabase } from "@harborline/backend/db";
import { communityEventSubmissions } from "@harborline/backend/schema";
import { getStudioUser } from "@/lib/auth";
import { canManageCommunity } from "@/lib/community";
import { getSiteConfiguration } from "@/lib/site-settings";
import { writeApiAudit } from "@/lib/api-keys";

const idSchema = z.uuid();
const statusSchema = z.object({ status: z.enum(["reviewing", "declined"]) });

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const viewer = await getStudioUser();
  if (!viewer) return NextResponse.json({ error: { code: "unauthorized", message: "Newsroom sign-in required" } }, { status: 401 });
  if (!canManageCommunity(viewer.role)) return NextResponse.json({ error: { code: "forbidden", message: "Community desk access is restricted" } }, { status: 403 });
  if (!(await getSiteConfiguration()).studio.modules.community) return NextResponse.json({ error: { code: "module_disabled", message: "The Community desk is currently disabled" } }, { status: 404 });
  if (!hasDatabase()) return NextResponse.json({ error: { code: "service_not_configured", message: "Postgres is not configured" } }, { status: 503 });
  const id = idSchema.safeParse((await context.params).id);
  const parsed = statusSchema.safeParse(await request.json().catch(() => null));
  if (!id.success || !parsed.success) return NextResponse.json({ error: { code: "invalid_request", message: "Choose a valid submission status" } }, { status: 400 });
  try {
    const [current] = await getDb().select({ id: communityEventSubmissions.id, status: communityEventSubmissions.status }).from(communityEventSubmissions).where(eq(communityEventSubmissions.id, id.data)).limit(1);
    if (!current || current.status === "approved") return NextResponse.json({ error: { code: "not_found", message: "That submission is no longer available for review" } }, { status: 404 });
    if (current.status === "declined") return NextResponse.json({ error: { code: "closed_submission", message: "A declined submission cannot be reopened from this control" } }, { status: 409 });
    const [updated] = await getDb().update(communityEventSubmissions).set({ status: parsed.data.status, reviewedByClerkId: viewer.id, reviewedAt: new Date() }).where(eq(communityEventSubmissions.id, current.id)).returning({ id: communityEventSubmissions.id, status: communityEventSubmissions.status, reviewedAt: communityEventSubmissions.reviewedAt });
    await writeApiAudit({ actorClerkId: viewer.id, event: "community.submission.status_changed", request, metadata: { submissionId: id.data, from: current.status, to: parsed.data.status } });
    return NextResponse.json({ data: updated, meta: { apiVersion: "1" } });
  } catch (error) {
    console.error("Community submission review update failed", { actorId: viewer.id, submissionId: id.data, error });
    return NextResponse.json({ error: { code: "update_failed", message: "The submission could not be updated" } }, { status: 500 });
  }
}
