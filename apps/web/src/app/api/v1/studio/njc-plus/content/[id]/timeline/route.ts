import { asc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb, hasDatabase } from "@harborline/backend/db";
import { premiumContent, premiumTimelineSegments } from "@harborline/backend/schema";
import { getStudioUser } from "@/lib/auth";
import { premiumTimelineSegmentInput } from "@/lib/njc-plus-contract";
import { writePremiumAudit } from "@/lib/njc-plus";

const idSchema = z.uuid();
const inputSchema = z.object({ segments: z.array(premiumTimelineSegmentInput).max(100) });

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const viewer = await getStudioUser();
  const id = idSchema.safeParse((await context.params).id);
  if (!viewer) return NextResponse.json({ error: { code: "unauthorized", message: "Newsroom sign-in required" } }, { status: 401 });
  if (!id.success || !hasDatabase()) return NextResponse.json({ error: { code: "not_found", message: "Production not found" } }, { status: 404 });
  const segments = await getDb().select().from(premiumTimelineSegments)
    .where(eq(premiumTimelineSegments.contentId, id.data))
    .orderBy(asc(premiumTimelineSegments.startMs), asc(premiumTimelineSegments.sortOrder));
  return NextResponse.json({ data: segments, meta: { apiVersion: "1", timeline: "source" } });
}

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  const viewer = await getStudioUser();
  const id = idSchema.safeParse((await context.params).id);
  const parsed = inputSchema.safeParse(await request.json().catch(() => null));
  if (!viewer) return NextResponse.json({ error: { code: "unauthorized", message: "Newsroom sign-in required" } }, { status: 401 });
  if (!id.success || !parsed.success) return NextResponse.json({ error: { code: "invalid_request", message: "Check the timeline segment ranges", details: parsed.success ? undefined : parsed.error.flatten() } }, { status: 400 });
  if (!hasDatabase()) return NextResponse.json({ error: { code: "service_not_configured", message: "Postgres is required" } }, { status: 503 });
  const [content] = await getDb().select({ id: premiumContent.id, durationMs: premiumContent.durationMs })
    .from(premiumContent).where(eq(premiumContent.id, id.data)).limit(1);
  if (!content) return NextResponse.json({ error: { code: "not_found", message: "Production not found" } }, { status: 404 });
  if (content.durationMs && parsed.data.segments.some((segment) => segment.endMs > content.durationMs!)) {
    return NextResponse.json({ error: { code: "invalid_range", message: "A timeline segment extends beyond the source program duration" } }, { status: 400 });
  }
  const now = new Date();
  const records = await getDb().transaction(async (tx) => {
    await tx.delete(premiumTimelineSegments).where(eq(premiumTimelineSegments.contentId, content.id));
    if (!parsed.data.segments.length) return [];
    return tx.insert(premiumTimelineSegments).values(parsed.data.segments.map((segment, index) => ({
      contentId: content.id,
      segmentType: segment.segmentType,
      startMs: segment.startMs,
      endMs: segment.endMs,
      internalName: segment.internalName || null,
      viewerLabel: segment.viewerLabel || null,
      skippable: segment.skippable,
      sortOrder: segment.sortOrder ?? index,
      createdByClerkId: viewer.id,
      updatedByClerkId: viewer.id,
      updatedAt: now,
    }))).returning();
  });
  await writePremiumAudit({ request, actorClerkId: viewer.id, action: "timeline.replaced", targetType: "premium_content", targetId: content.id, metadata: { count: records.length, sourceTimeline: true } });
  return NextResponse.json({ data: records, meta: { apiVersion: "1", timeline: "source" } });
}
