import { desc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb, hasDatabase } from "@harborline/backend/db";
import { stories, storyRevisions } from "@harborline/backend/schema";
import { writeApiAudit } from "@/lib/api-keys";
import { getStudioUser } from "@/lib/auth";
import { storyTimestampInput } from "@/lib/story-input";
import { canPublishStory } from "@/lib/story-workflow";

const storyId = z.uuid();

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const viewer = await getStudioUser();
  if (!viewer) {
    return NextResponse.json(
      { error: { code: "unauthorized", message: "Newsroom sign-in required" } },
      { status: 401 },
    );
  }
  if (!canPublishStory(viewer.role)) {
    return NextResponse.json(
      { error: { code: "forbidden", message: "A publishing role is required to change public timestamps" } },
      { status: 403 },
    );
  }
  if (!hasDatabase()) {
    return NextResponse.json(
      { error: { code: "service_not_configured", message: "Postgres is not configured" } },
      { status: 503 },
    );
  }

  const parsedId = storyId.safeParse((await context.params).id);
  const parsedBody = storyTimestampInput.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsedId.success || !parsedBody.success) {
    return NextResponse.json(
      {
        error: {
          code: "invalid_request",
          message: "Review the timestamp warning and required values",
          details: parsedBody.success ? undefined : parsedBody.error.flatten(),
        },
      },
      { status: 400 },
    );
  }

  const [current] = await getDb()
    .select()
    .from(stories)
    .where(eq(stories.id, parsedId.data))
    .limit(1);
  if (!current) {
    return NextResponse.json(
      { error: { code: "not_found", message: "Story not found" } },
      { status: 404 },
    );
  }
  if (current.status !== "published" || !current.publishedAt) {
    return NextResponse.json(
      { error: { code: "invalid_status", message: "Only published stories have public posted timestamps" } },
      { status: 409 },
    );
  }

  const publishedAt = new Date(parsedBody.data.publishedAt);
  const updatedAt = new Date(parsedBody.data.updatedAt);
  try {
    const updated = await getDb().transaction(async (tx) => {
      const [story] = await tx
        .update(stories)
        .set({ publishedAt, updatedAt })
        .where(eq(stories.id, current.id))
        .returning();
      if (!story) return null;
      const [latest] = await tx
        .select({ version: storyRevisions.version })
        .from(storyRevisions)
        .where(eq(storyRevisions.storyId, story.id))
        .orderBy(desc(storyRevisions.version))
        .limit(1);
      await tx.insert(storyRevisions).values({
        storyId: story.id,
        editorId: viewer.databaseId ?? null,
        version: (latest?.version ?? 0) + 1,
        snapshot: story,
        note: `Public timestamps changed by ${viewer.name}: ${parsedBody.data.reason}`,
      });
      return story;
    });
    if (!updated) throw new Error("Timestamp update returned no story");

    await writeApiAudit({
      actorClerkId: viewer.id,
      event: "story.timestamps_changed",
      request,
      metadata: {
        storyId: updated.id,
        slug: updated.slug,
        previousPublishedAt: current.publishedAt.toISOString(),
        publishedAt: updated.publishedAt?.toISOString(),
        previousUpdatedAt: current.updatedAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
        reason: parsedBody.data.reason,
      },
    });

    revalidatePath("/");
    revalidatePath("/latest");
    revalidatePath(`/category/${updated.categorySlug}`);
    revalidatePath(`/story/${updated.slug}`);
    revalidatePath(`/studio/stories/${updated.id}`);
    revalidatePath("/api/v1/stories");
    revalidatePath("/feed.xml");
    revalidatePath("/sitemap.xml");
    revalidatePath("/news-sitemap.xml");
    return NextResponse.json({ data: updated, meta: { apiVersion: "1" } });
  } catch (error) {
    console.error("Story timestamp update failed", {
      storyId: current.id,
      actorId: viewer.id,
      error,
    });
    return NextResponse.json(
      { error: { code: "update_failed", message: "The public timestamps could not be changed" } },
      { status: 500 },
    );
  }
}
