import { asc, desc, eq, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb, hasDatabase } from "@harborline/backend/db";
import { linkInBioEntries, stories } from "@harborline/backend/schema";
import { getEmployeeViewer, writeEmployeeAudit } from "@/lib/employee-auth";
import {
  linkInBioEntryInput,
  linkInBioOrderInput,
} from "@/lib/link-in-bio";
import { canPublishStory } from "@/lib/story-workflow";

export const dynamic = "force-dynamic";

async function getManager() {
  const viewer = await getEmployeeViewer();
  return viewer && canPublishStory(viewer.role) ? viewer : null;
}

export async function GET() {
  const manager = await getManager();
  if (!manager) return error("forbidden", "Publisher access is required", 403);
  if (!hasDatabase()) return error("service_not_configured", "Postgres is required", 503);

  const data = await getDb()
    .select({
      id: linkInBioEntries.id,
      slug: linkInBioEntries.slug,
      storyId: linkInBioEntries.storyId,
      displayTitle: linkInBioEntries.displayTitle,
      sortOrder: linkInBioEntries.sortOrder,
      isVisible: linkInBioEntries.isVisible,
      startsAt: linkInBioEntries.startsAt,
      endsAt: linkInBioEntries.endsAt,
      clickCount: linkInBioEntries.clickCount,
      lastClickedAt: linkInBioEntries.lastClickedAt,
      updatedAt: linkInBioEntries.updatedAt,
      headline: stories.headline,
      categoryLabel: stories.categoryLabel,
      imageUrl: stories.imageUrl,
      publishedAt: stories.publishedAt,
      storyStatus: stories.status,
    })
    .from(linkInBioEntries)
    .innerJoin(stories, eq(linkInBioEntries.storyId, stories.id))
    .orderBy(asc(linkInBioEntries.sortOrder), desc(linkInBioEntries.updatedAt));
  return NextResponse.json(
    { data, meta: { apiVersion: "1", count: data.length } },
    { headers: privateHeaders() },
  );
}

export async function POST(request: Request) {
  const manager = await getManager();
  if (!manager) return error("forbidden", "Publisher access is required", 403);
  if (!hasDatabase()) return error("service_not_configured", "Postgres is required", 503);
  const parsed = linkInBioEntryInput.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "invalid_request", message: "Review the selected story and availability window", details: parsed.error.flatten() } },
      { status: 400, headers: privateHeaders() },
    );
  }

  const db = getDb();
  const [story] = await db
    .select({ id: stories.id, slug: stories.slug, headline: stories.headline })
    .from(stories)
    .where(eq(stories.id, parsed.data.storyId))
    .limit(1);
  if (!story) return error("story_not_found", "The selected story does not exist", 404);

  const [published] = await db
    .select({ id: stories.id })
    .from(stories)
    .where(sql`${stories.id} = ${story.id} and ${stories.status} = 'published' and ${stories.publishedAt} is not null and ${stories.publishedAt} <= now()`)
    .limit(1);
  if (!published) {
    return error(
      "story_not_published",
      "Only a currently published story can be added to Link in Bio",
      409,
    );
  }

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(linkInBioEntries);
  if (Number(count) >= 50) {
    return error("entry_limit", "Archive an existing link before adding another", 409);
  }
  const [last] = await db
    .select({ sortOrder: linkInBioEntries.sortOrder })
    .from(linkInBioEntries)
    .orderBy(desc(linkInBioEntries.sortOrder))
    .limit(1);

  try {
    const [data] = await db
      .insert(linkInBioEntries)
      .values({
        storyId: story.id,
        slug: story.slug,
        displayTitle: parsed.data.displayTitle || null,
        startsAt: parsed.data.startsAt ? new Date(parsed.data.startsAt) : null,
        endsAt: parsed.data.endsAt ? new Date(parsed.data.endsAt) : null,
        sortOrder: (last?.sortOrder ?? -1) + 1,
        createdByClerkId: manager.id,
        updatedByClerkId: manager.id,
      })
      .returning();
    await writeEmployeeAudit(
      request,
      manager,
      "link_in_bio.entry_created",
      { type: "link_in_bio_entry", id: data.id },
      { storyId: story.id, storySlug: story.slug },
    );
    return NextResponse.json(
      { data, meta: { apiVersion: "1" } },
      { status: 201, headers: privateHeaders() },
    );
  } catch (cause) {
    if (isUniqueViolation(cause)) {
      return error("duplicate_story", "That story is already in Link in Bio", 409);
    }
    throw cause;
  }
}

export async function PATCH(request: Request) {
  const manager = await getManager();
  if (!manager) return error("forbidden", "Publisher access is required", 403);
  if (!hasDatabase()) return error("service_not_configured", "Postgres is required", 503);
  const parsed = linkInBioOrderInput.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return error("invalid_order", "The complete unique link order is required", 400);
  }
  if (new Set(parsed.data.order).size !== parsed.data.order.length) {
    return error("invalid_order", "The complete unique link order is required", 400);
  }

  const db = getDb();
  const existing = await db
    .select({ id: linkInBioEntries.id })
    .from(linkInBioEntries);
  const existingIds = new Set(existing.map((entry) => entry.id));
  if (
    existingIds.size !== parsed.data.order.length ||
    parsed.data.order.some((id) => !existingIds.has(id))
  ) {
    return error("stale_order", "The link list changed; refresh before reordering", 409);
  }

  await db.transaction(async (tx) => {
    for (const [sortOrder, id] of parsed.data.order.entries()) {
      await tx
        .update(linkInBioEntries)
        .set({ sortOrder, updatedByClerkId: manager.id, updatedAt: new Date() })
        .where(eq(linkInBioEntries.id, id));
    }
  });
  await writeEmployeeAudit(request, manager, "link_in_bio.reordered", { type: "link_in_bio", id: "public" }, { entryIds: parsed.data.order });
  return NextResponse.json(
    { data: { order: parsed.data.order }, meta: { apiVersion: "1" } },
    { headers: privateHeaders() },
  );
}

function privateHeaders() {
  return { "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex, nofollow" };
}

function error(code: string, message: string, status: number) {
  return NextResponse.json(
    { error: { code, message } },
    { status, headers: privateHeaders() },
  );
}

function isUniqueViolation(cause: unknown) {
  return Boolean(cause && typeof cause === "object" && "code" in cause && cause.code === "23505");
}
