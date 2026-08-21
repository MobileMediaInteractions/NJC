import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb, hasDatabase } from "@harborline/backend/db";
import {
  liveEvents,
  liveEventUpdateRevisions,
  liveEventUpdates,
} from "@harborline/backend/schema";
import { getStudioUser } from "@/lib/auth";
import { writeApiAudit } from "@/lib/api-keys";
import {
  canPublishLiveCoverage,
  canWriteLiveCoverage,
  liveTimelineUpdateInput,
} from "@/lib/live-coverage";

export const dynamic = "force-dynamic";

export async function POST(
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
      { error: { code: "service_not_configured", message: "Postgres is required for live updates" } },
      { status: 503 },
    );
  }
  const parsed = liveTimelineUpdateInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "invalid_request", message: "Review the timeline update", details: parsed.error.flatten() } },
      { status: 400 },
    );
  }
  if (parsed.data.publish && !canPublishLiveCoverage(viewer.role)) {
    return NextResponse.json(
      { error: { code: "forbidden", message: "A producer, editor or administrator must publish live updates" } },
      { status: 403 },
    );
  }
  const { id } = await params;
  const [event] = await getDb().select().from(liveEvents).where(eq(liveEvents.id, id)).limit(1);
  if (!event) {
    return NextResponse.json(
      { error: { code: "not_found", message: "The live desk no longer exists" } },
      { status: 404 },
    );
  }
  if (parsed.data.publish && !["live", "paused"].includes(event.status)) {
    return NextResponse.json(
      { error: { code: "desk_not_live", message: "Start the live desk before publishing timeline updates" } },
      { status: 409 },
    );
  }

  const now = new Date();
  const authorSnapshot = {
    clerkId: viewer.id,
    name: viewer.name,
    role: viewer.role,
    initials: viewer.name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase(),
  };
  try {
    const update = await getDb().transaction(async (tx) => {
      const [created] = await tx.insert(liveEventUpdates).values({
        eventId: id,
        kind: parsed.data.kind,
        status: parsed.data.publish ? "published" : "draft",
        headline: parsed.data.headline || null,
        body: parsed.data.body,
        mediaUrl: parsed.data.mediaUrl || null,
        mediaAlt: parsed.data.mediaAlt || null,
        sourceUrl: parsed.data.sourceUrl || null,
        sourceLabel: parsed.data.sourceLabel || null,
        authorSnapshot,
        isPinned: parsed.data.isPinned,
        publishedAt: parsed.data.publish ? now : null,
      }).returning();
      await tx.insert(liveEventUpdateRevisions).values({
        updateId: created.id,
        revision: 1,
        snapshot: created,
        reason: parsed.data.publish ? "Initial update published" : "Initial update saved as a draft",
        actorClerkId: viewer.id,
      });
      await tx.update(liveEvents).set({ updatedAt: now, updatedByClerkId: viewer.id }).where(eq(liveEvents.id, id));
      return created;
    });
    await writeApiAudit({
      request,
      actorClerkId: viewer.id,
      event: parsed.data.publish ? "live_update.published" : "live_update.drafted",
      metadata: { eventId: id, updateId: update.id, kind: update.kind },
    });
    revalidatePath("/live");
    revalidatePath(`/live/${event.slug}`);
    return NextResponse.json({ data: update, meta: { apiVersion: "1" } }, { status: 201 });
  } catch (error) {
    console.error("Live timeline update failed", { id, error });
    return NextResponse.json(
      { error: { code: "save_failed", message: "The timeline update could not be saved" } },
      { status: 500 },
    );
  }
}
