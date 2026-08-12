import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb, hasDatabase } from "@harborline/backend/db";
import { linkInBioEntries } from "@harborline/backend/schema";
import { getEmployeeViewer, writeEmployeeAudit } from "@/lib/employee-auth";
import { linkInBioEntryUpdate } from "@/lib/link-in-bio";
import { canPublishStory } from "@/lib/story-workflow";

async function getManager() {
  const viewer = await getEmployeeViewer();
  return viewer && canPublishStory(viewer.role) ? viewer : null;
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const manager = await getManager();
  if (!manager) return response("forbidden", "Publisher access is required", 403);
  if (!hasDatabase()) return response("service_not_configured", "Postgres is required", 503);
  const parsed = linkInBioEntryUpdate.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) return response("invalid_request", "Review the link settings", 400, parsed.error.flatten());
  const { id } = await context.params;
  const [current] = await getDb()
    .select()
    .from(linkInBioEntries)
    .where(eq(linkInBioEntries.id, id))
    .limit(1);
  if (!current) return response("not_found", "Link entry not found", 404);

  const startsAt = parsed.data.startsAt === undefined
    ? current.startsAt
    : parsed.data.startsAt ? new Date(parsed.data.startsAt) : null;
  const endsAt = parsed.data.endsAt === undefined
    ? current.endsAt
    : parsed.data.endsAt ? new Date(parsed.data.endsAt) : null;
  if (startsAt && endsAt && endsAt <= startsAt) {
    return response("invalid_window", "The end time must be after the start time", 400);
  }
  const [data] = await getDb()
    .update(linkInBioEntries)
    .set({
      ...(parsed.data.displayTitle !== undefined
        ? { displayTitle: parsed.data.displayTitle || null }
        : {}),
      ...(parsed.data.isVisible !== undefined
        ? { isVisible: parsed.data.isVisible }
        : {}),
      startsAt,
      endsAt,
      updatedByClerkId: manager.id,
      updatedAt: new Date(),
    })
    .where(eq(linkInBioEntries.id, id))
    .returning();
  await writeEmployeeAudit(request, manager, "link_in_bio.entry_updated", { type: "link_in_bio_entry", id }, { changedFields: Object.keys(parsed.data) });
  return NextResponse.json({ data, meta: { apiVersion: "1" } }, { headers: privateHeaders() });
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const manager = await getManager();
  if (!manager) return response("forbidden", "Publisher access is required", 403);
  if (!hasDatabase()) return response("service_not_configured", "Postgres is required", 503);
  const { id } = await context.params;
  const [removed] = await getDb()
    .delete(linkInBioEntries)
    .where(eq(linkInBioEntries.id, id))
    .returning({ id: linkInBioEntries.id, storyId: linkInBioEntries.storyId });
  if (!removed) return response("not_found", "Link entry not found", 404);
  await writeEmployeeAudit(request, manager, "link_in_bio.entry_removed", { type: "link_in_bio_entry", id }, { storyId: removed.storyId });
  return NextResponse.json({ data: { id }, meta: { apiVersion: "1" } }, { headers: privateHeaders() });
}

function privateHeaders() {
  return { "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex, nofollow" };
}

function response(code: string, message: string, status: number, details?: unknown) {
  return NextResponse.json(
    { error: { code, message, ...(details ? { details } : {}) } },
    { status, headers: privateHeaders() },
  );
}
