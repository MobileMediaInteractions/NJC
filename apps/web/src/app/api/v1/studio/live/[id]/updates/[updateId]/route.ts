import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
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
  liveTimelineRevisionInput,
} from "@/lib/live-coverage";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; updateId: string }> },
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
  const parsed = liveTimelineRevisionInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "invalid_request", message: "Review the update action", details: parsed.error.flatten() } },
      { status: 400 },
    );
  }
  const { id, updateId } = await params;
  const [[event], [current]] = await Promise.all([
    getDb().select().from(liveEvents).where(eq(liveEvents.id, id)).limit(1),
    getDb().select().from(liveEventUpdates).where(and(eq(liveEventUpdates.id, updateId), eq(liveEventUpdates.eventId, id))).limit(1),
  ]);
  if (!event || !current) {
    return NextResponse.json(
      { error: { code: "not_found", message: "The live update no longer exists" } },
      { status: 404 },
    );
  }
  const publicAction = current.status === "published" || ["publish", "pin", "unpin", "retract"].includes(parsed.data.action);
  if (publicAction && !canPublishLiveCoverage(viewer.role)) {
    return NextResponse.json(
      { error: { code: "forbidden", message: "A producer, editor or administrator must change public live updates" } },
      { status: 403 },
    );
  }
  if (parsed.data.action === "publish" && current.status !== "draft") {
    return NextResponse.json(
      { error: { code: "invalid_transition", message: "Only a draft update can be published" } },
      { status: 409 },
    );
  }
  if (parsed.data.action === "publish" && !["live", "paused"].includes(event.status)) {
    return NextResponse.json(
      { error: { code: "desk_not_live", message: "Start the live desk before publishing this update" } },
      { status: 409 },
    );
  }
  if (["pin", "unpin"].includes(parsed.data.action) && current.status !== "published") {
    return NextResponse.json(
      { error: { code: "invalid_transition", message: "Only published updates can be pinned" } },
      { status: 409 },
    );
  }
  if (parsed.data.action === "retract" && parsed.data.confirmation !== "RETRACT") {
    return NextResponse.json(
      { error: { code: "confirmation_required", message: "Type RETRACT to remove this update from public view" } },
      { status: 409 },
    );
  }

  const now = new Date();
  const nextRevision = current.revision + 1;
  const changes: Partial<typeof liveEventUpdates.$inferInsert> = {
    revision: nextRevision,
    updatedAt: now,
  };
  if (parsed.data.action === "publish") {
    changes.status = "published";
    changes.publishedAt = now;
  }
  if (parsed.data.action === "edit") {
    changes.headline = parsed.data.headline === undefined ? current.headline : parsed.data.headline || null;
    changes.body = parsed.data.body ?? current.body;
    changes.kind = parsed.data.kind ?? current.kind;
    if (current.status === "published") changes.correctedAt = now;
  }
  if (parsed.data.action === "pin") changes.isPinned = true;
  if (parsed.data.action === "unpin") changes.isPinned = false;
  if (parsed.data.action === "retract") {
    changes.status = "retracted";
    changes.retractedAt = now;
    changes.isPinned = false;
  }

  try {
    const update = await getDb().transaction(async (tx) => {
      const [updated] = await tx.update(liveEventUpdates).set(changes).where(eq(liveEventUpdates.id, updateId)).returning();
      await tx.insert(liveEventUpdateRevisions).values({
        updateId,
        revision: nextRevision,
        snapshot: updated,
        reason: parsed.data.reason,
        actorClerkId: viewer.id,
      });
      await tx.update(liveEvents).set({ updatedAt: now, updatedByClerkId: viewer.id }).where(eq(liveEvents.id, id));
      return updated;
    });
    await writeApiAudit({
      request,
      actorClerkId: viewer.id,
      event: `live_update.${parsed.data.action}`,
      metadata: { eventId: id, updateId, revision: nextRevision, reason: parsed.data.reason },
    });
    revalidatePath("/live");
    revalidatePath(`/live/${event.slug}`);
    return NextResponse.json({ data: update, meta: { apiVersion: "1" } });
  } catch (error) {
    console.error("Live update revision failed", { id, updateId, error });
    return NextResponse.json(
      { error: { code: "save_failed", message: "The live update action could not be completed" } },
      { status: 500 },
    );
  }
}
