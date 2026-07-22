import { and, desc, eq, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb, hasDatabase } from "@harborline/backend/db";
import { stories, storyRevisions } from "@harborline/backend/schema";
import { writeApiAudit } from "@/lib/api-keys";
import { canDeleteStory, getStudioUser } from "@/lib/auth";
import { storyInput } from "@/lib/story-input";
import { canPublishStory, canTransitionStoryStatus } from "@/lib/story-workflow";

const storyId = z.uuid();
const transitionInput = z.object({ status: z.enum(["draft", "review", "published"]) });

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const viewer = await getStudioUser();
  if (!viewer)
    return NextResponse.json(
      { error: { code: "unauthorized", message: "Newsroom sign-in required" } },
      { status: 401 },
    );
  if (!hasDatabase())
    return NextResponse.json(
      { error: { code: "service_not_configured", message: "Postgres is not configured" } },
      { status: 503 },
    );

  const parsedId = storyId.safeParse((await context.params).id);
  const parsedBody = transitionInput.safeParse(await request.json().catch(() => null));
  if (!parsedId.success || !parsedBody.success)
    return NextResponse.json(
      { error: { code: "invalid_request", message: "Choose a valid story and editorial action" } },
      { status: 400 },
    );

  const [current] = await getDb().select().from(stories).where(eq(stories.id, parsedId.data)).limit(1);
  if (!current)
    return NextResponse.json(
      { error: { code: "not_found", message: "Story not found" } },
      { status: 404 },
    );

  const nextStatus = parsedBody.data.status;
  if (!canTransitionStoryStatus(current.status, nextStatus, viewer.role, current.authorSnapshot?.id === viewer.id)) {
    if (current.status === "review" && !canPublishStory(viewer.role)) {
      return NextResponse.json(
        { error: { code: "forbidden", message: "Your role cannot complete editorial review" } },
        { status: 403 },
      );
    }
    if (current.status === "draft" && nextStatus === "review") {
      return NextResponse.json(
        { error: { code: "forbidden", message: "Only the story owner or a publisher can submit this draft" } },
        { status: 403 },
      );
    }
    return NextResponse.json(
      { error: { code: "invalid_transition", message: `A ${current.status} story cannot move directly to ${nextStatus}` } },
      { status: 409 },
    );
  }

  const now = new Date();
  try {
    const updated = await getDb().transaction(async (tx) => {
      const [story] = await tx.update(stories).set({
        status: nextStatus,
        publishedAt: nextStatus === "published" ? now : current.publishedAt,
        updatedAt: now,
      }).where(and(eq(stories.id, current.id), eq(stories.status, current.status))).returning();
      if (!story) return null;

      const [latest] = await tx.select({ version: storyRevisions.version }).from(storyRevisions).where(eq(storyRevisions.storyId, story.id)).orderBy(desc(storyRevisions.version)).limit(1);
      await tx.insert(storyRevisions).values({
        storyId: story.id,
        editorId: viewer.databaseId ?? null,
        version: (latest?.version ?? 0) + 1,
        snapshot: story,
        note: `${current.status} → ${nextStatus} by ${viewer.name}`,
      });
      return story;
    });

    if (!updated)
      return NextResponse.json(
        { error: { code: "conflict", message: "This story changed while you were reviewing it. Reload and try again." } },
        { status: 409 },
      );

    await writeApiAudit({
      actorClerkId: viewer.id,
      event: "story.status_changed",
      request,
      metadata: { storyId: updated.id, slug: updated.slug, from: current.status, to: updated.status },
    });

    revalidatePath("/studio");
    revalidatePath("/studio/stories");
    revalidatePath(`/studio/stories/${updated.id}`);
    if (updated.status === "published") {
      revalidatePath("/");
      revalidatePath("/latest");
      revalidatePath(`/category/${updated.categorySlug}`);
      revalidatePath(`/story/${updated.slug}`);
      revalidatePath("/api/v1/stories");
      revalidatePath("/feed.xml");
      revalidatePath("/sitemap.xml");
      revalidatePath("/news-sitemap.xml");
    }
    console.info("[studio:stories] status changed", { storyId: updated.id, from: current.status, to: updated.status, actorId: viewer.id });
    return NextResponse.json({ data: updated, meta: { apiVersion: "1" } });
  } catch (error) {
    console.error("[studio:stories] status change failed", { storyId: current.id, from: current.status, to: nextStatus, actorId: viewer.id, error });
    return NextResponse.json(
      { error: { code: "transition_failed", message: "The editorial action could not be completed" } },
      { status: 500 },
    );
  }
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const viewer = await getStudioUser();
  if (!viewer)
    return NextResponse.json(
      { error: { code: "unauthorized", message: "Newsroom sign-in required" } },
      { status: 401 },
    );
  if (!hasDatabase())
    return NextResponse.json(
      { error: { code: "service_not_configured", message: "Postgres is not configured" } },
      { status: 503 },
    );

  const parsedId = storyId.safeParse((await context.params).id);
  const parsedBody = storyInput.safeParse(await request.json().catch(() => null));
  if (!parsedId.success || !parsedBody.success) {
    const details = parsedBody.success ? undefined : parsedBody.error.flatten();
    return NextResponse.json(
      { error: { code: "invalid_request", message: "Check the highlighted story fields", details } },
      { status: 400 },
    );
  }

  const [current] = await getDb().select().from(stories).where(eq(stories.id, parsedId.data)).limit(1);
  if (!current)
    return NextResponse.json(
      { error: { code: "not_found", message: "Story not found" } },
      { status: 404 },
    );
  if (current.status !== "draft" && current.status !== "review")
    return NextResponse.json(
      { error: { code: "story_locked", message: "Only draft and submitted stories can be edited in this workspace" } },
      { status: 409 },
    );

  const isOwner = current.authorSnapshot?.id === viewer.id;
  const isPublisher = canPublishStory(viewer.role);
  if (!isOwner && !isPublisher)
    return NextResponse.json(
      { error: { code: "forbidden", message: "Only the story owner or a publisher can edit this story" } },
      { status: 403 },
    );
  if (parsedBody.data.status === "published" && !isPublisher)
    return NextResponse.json(
      { error: { code: "forbidden", message: "Your role cannot publish stories" } },
      { status: 403 },
    );

  const [slugConflict] = await getDb()
    .select({ id: stories.id })
    .from(stories)
    .where(and(eq(stories.slug, parsedBody.data.slug), ne(stories.id, current.id)))
    .limit(1);
  if (slugConflict)
    return NextResponse.json(
      { error: { code: "slug_conflict", message: "A story with this headline URL already exists. Change the headline before saving." } },
      { status: 409 },
    );

  const now = new Date();
  const {
    publishedAt,
    publishedAtRiskAcknowledged: _publishedAtRiskAcknowledged,
    publishedAtChangeReason,
    ...storyValues
  } = parsedBody.data;
  void _publishedAtRiskAcknowledged;

  try {
    const updated = await getDb().transaction(async (tx) => {
      const [story] = await tx.update(stories).set({
        ...storyValues,
        imageUrl: parsedBody.data.imageUrl || null,
        imageAlt: parsedBody.data.imageAlt || null,
        seoTitle: parsedBody.data.seoTitle || null,
        seoDescription: parsedBody.data.seoDescription || null,
        canonicalUrl: parsedBody.data.canonicalUrl || null,
        scheduledAt: parsedBody.data.scheduledAt ? new Date(parsedBody.data.scheduledAt) : null,
        publishedAt: parsedBody.data.status === "published"
          ? publishedAt
            ? new Date(publishedAt)
            : now
          : null,
        readingMinutes: Math.max(1, Math.ceil(parsedBody.data.body.join(" ").split(/\s+/).length / 220)),
        updatedAt: now,
      }).where(and(eq(stories.id, current.id), eq(stories.status, current.status))).returning();
      if (!story) return null;

      const [latest] = await tx.select({ version: storyRevisions.version }).from(storyRevisions).where(eq(storyRevisions.storyId, story.id)).orderBy(desc(storyRevisions.version)).limit(1);
      await tx.insert(storyRevisions).values({
        storyId: story.id,
        editorId: viewer.databaseId ?? null,
        version: (latest?.version ?? 0) + 1,
        snapshot: story,
        note: publishedAt
          ? `Story updated with custom posted time by ${viewer.name}: ${publishedAtChangeReason}`
          : `Story updated as ${story.status} by ${viewer.name}`,
      });
      return story;
    });

    if (!updated)
      return NextResponse.json(
        { error: { code: "conflict", message: "This story changed while you were editing it. Reload and try again." } },
        { status: 409 },
      );

    await writeApiAudit({
      actorClerkId: viewer.id,
      event: publishedAt ? "story.edited_with_custom_published_at" : "story.edited",
      request,
      metadata: {
        storyId: updated.id,
        previousSlug: current.slug,
        slug: updated.slug,
        fromStatus: current.status,
        toStatus: updated.status,
        publishedAt: updated.publishedAt?.toISOString(),
        reason: publishedAt ? publishedAtChangeReason : undefined,
      },
    });

    revalidatePath("/studio");
    revalidatePath("/studio/stories");
    revalidatePath(`/studio/stories/${updated.id}`);
    revalidatePath(`/studio/stories/${updated.id}/edit`);
    if (updated.status === "published") {
      revalidatePath("/");
      revalidatePath("/latest");
      revalidatePath(`/category/${updated.categorySlug}`);
      revalidatePath(`/story/${updated.slug}`);
      revalidatePath("/api/v1/stories");
      revalidatePath("/feed.xml");
      revalidatePath("/sitemap.xml");
      revalidatePath("/news-sitemap.xml");
    }
    return NextResponse.json({ data: updated, meta: { apiVersion: "1" } });
  } catch (error) {
    console.error("[studio:stories] edit failed", { storyId: current.id, actorId: viewer.id, error });
    return NextResponse.json(
      { error: { code: "save_failed", message: "The story changes could not be saved" } },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const viewer = await getStudioUser();
  if (!viewer)
    return NextResponse.json(
      { error: { code: "unauthorized", message: "Newsroom sign-in required" } },
      { status: 401 },
    );
  if (!canDeleteStory(viewer.role))
    return NextResponse.json(
      { error: { code: "forbidden", message: "Only administrators and editors can delete stories" } },
      { status: 403 },
    );
  if (!hasDatabase())
    return NextResponse.json(
      { error: { code: "service_not_configured", message: "Postgres is not configured" } },
      { status: 503 },
    );

  const parsedId = storyId.safeParse((await context.params).id);
  if (!parsedId.success)
    return NextResponse.json(
      { error: { code: "invalid_request", message: "A valid story ID is required" } },
      { status: 400 },
    );

  try {
    const [deleted] = await getDb()
      .delete(stories)
      .where(eq(stories.id, parsedId.data))
      .returning({
        id: stories.id,
        slug: stories.slug,
        headline: stories.headline,
        status: stories.status,
        categorySlug: stories.categorySlug,
      });
    if (!deleted)
      return NextResponse.json(
        { error: { code: "not_found", message: "Story not found" } },
        { status: 404 },
      );

    await writeApiAudit({
      actorClerkId: viewer.id,
      event: "story.deleted",
      request,
      metadata: {
        storyId: deleted.id,
        slug: deleted.slug,
        headline: deleted.headline,
        status: deleted.status,
      },
    });

    revalidatePath("/");
    revalidatePath("/latest");
    revalidatePath("/studio/stories");
    revalidatePath(`/category/${deleted.categorySlug}`);
    revalidatePath(`/story/${deleted.slug}`);
    revalidatePath("/api/v1/stories");
    revalidatePath("/feed.xml");
    revalidatePath("/sitemap.xml");
    revalidatePath("/news-sitemap.xml");
    console.info("[studio:stories] deleted", {
      storyId: deleted.id,
      status: deleted.status,
      actorId: viewer.id,
    });
    return NextResponse.json({
      data: { id: deleted.id, deleted: true },
      meta: { apiVersion: "1" },
    });
  } catch (error) {
    console.error("[studio:stories] deletion failed", {
      storyId: parsedId.data,
      actorId: viewer.id,
      error,
    });
    return NextResponse.json(
      { error: { code: "delete_failed", message: "The story could not be deleted" } },
      { status: 500 },
    );
  }
}
