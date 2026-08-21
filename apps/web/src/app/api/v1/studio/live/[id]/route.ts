import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { eq, ne } from "drizzle-orm";
import { getDb, hasDatabase } from "@harborline/backend/db";
import { liveEvents } from "@harborline/backend/schema";
import type { LiveCoverageStatus } from "@harborline/contracts";
import { getStudioUser } from "@/lib/auth";
import { writeApiAudit } from "@/lib/api-keys";
import {
  canPublishLiveCoverage,
  canWriteLiveCoverage,
  liveEventUpdateInput,
  nextLiveEventStatus,
} from "@/lib/live-coverage";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const viewer = await getStudioUser();
  if (!viewer || !canWriteLiveCoverage(viewer.role)) {
    return NextResponse.json(
      { error: { code: "forbidden", message: "A newsroom reporting role is required" } },
      { status: viewer ? 403 : 401 },
    );
  }
  if (!hasDatabase()) {
    return NextResponse.json(
      { error: { code: "service_not_configured", message: "Postgres is required for live desks" } },
      { status: 503 },
    );
  }
  const parsed = liveEventUpdateInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "invalid_request", message: "Review the live desk changes", details: parsed.error.flatten() } },
      { status: 400 },
    );
  }
  const { id } = await params;
  const [current] = await getDb().select().from(liveEvents).where(eq(liveEvents.id, id)).limit(1);
  if (!current) {
    return NextResponse.json(
      { error: { code: "not_found", message: "The live desk no longer exists" } },
      { status: 404 },
    );
  }

  const publishingChange = Boolean(parsed.data.transition) || parsed.data.isFeatured !== undefined;
  if (publishingChange && !canPublishLiveCoverage(viewer.role)) {
    return NextResponse.json(
      { error: { code: "forbidden", message: "A producer, editor or administrator must change public live-desk state" } },
      { status: 403 },
    );
  }

  const transition = parsed.data.transition;
  const currentStatus = current.status as LiveCoverageStatus;
  const nextStatus = transition ? nextLiveEventStatus(currentStatus, transition) : currentStatus;
  if (transition && !nextStatus) {
    return NextResponse.json(
      { error: { code: "invalid_transition", message: `A ${currentStatus} live desk cannot ${transition}` } },
      { status: 409 },
    );
  }
  const resolvedStatus = nextStatus ?? currentStatus;
  const scheduledAt = parsed.data.scheduledAt === undefined
    ? current.scheduledAt
    : parsed.data.scheduledAt
      ? new Date(parsed.data.scheduledAt)
      : null;
  if (transition === "schedule" && (!scheduledAt || scheduledAt <= new Date())) {
    return NextResponse.json(
      { error: { code: "invalid_schedule", message: "Choose a future start time before scheduling the live desk" } },
      { status: 409 },
    );
  }
  if (["end", "archive"].includes(transition ?? "") && parsed.data.confirmation !== current.title) {
    return NextResponse.json(
      { error: { code: "confirmation_required", message: "Type the exact live desk title to confirm this transition" } },
      { status: 409 },
    );
  }

  const now = new Date();
  const values: Partial<typeof liveEvents.$inferInsert> = {
    title: parsed.data.title ?? current.title,
    description: parsed.data.description ?? current.description,
    location: parsed.data.location === undefined ? current.location : parsed.data.location || null,
    streamUrl: parsed.data.streamUrl === undefined ? current.streamUrl : parsed.data.streamUrl || null,
    heroImageUrl: parsed.data.heroImageUrl === undefined ? current.heroImageUrl : parsed.data.heroImageUrl || null,
    heroImageAlt: parsed.data.heroImageAlt === undefined ? current.heroImageAlt : parsed.data.heroImageAlt || null,
    relatedStoryId: parsed.data.relatedStoryId === undefined ? current.relatedStoryId : parsed.data.relatedStoryId,
    isFeatured: parsed.data.isFeatured ?? current.isFeatured,
    scheduledAt,
    status: resolvedStatus,
    isLive: resolvedStatus === "live",
    startedAt: ["start", "resume"].includes(transition ?? "") ? current.startedAt ?? now : current.startedAt,
    endedAt: transition === "end" ? now : current.endedAt,
    updatedByClerkId: viewer.id,
    updatedAt: now,
  };

  try {
    const event = await getDb().transaction(async (tx) => {
      if (values.isFeatured) {
        await tx.update(liveEvents).set({ isFeatured: false, updatedAt: now }).where(ne(liveEvents.id, id));
      }
      const [updated] = await tx.update(liveEvents).set(values).where(eq(liveEvents.id, id)).returning();
      return updated;
    });
    await writeApiAudit({
      request,
      actorClerkId: viewer.id,
      event: transition ? `live_desk.${transition}` : "live_desk.updated",
      metadata: { eventId: id, previousStatus: current.status, nextStatus: resolvedStatus },
    });
    revalidatePath("/live");
    revalidatePath(`/live/${current.slug}`);
    return NextResponse.json({ data: event, meta: { apiVersion: "1" } });
  } catch (error) {
    console.error("Live desk update failed", { id, error });
    return NextResponse.json(
      { error: { code: "save_failed", message: "The live desk changes could not be saved" } },
      { status: 500 },
    );
  }
}
