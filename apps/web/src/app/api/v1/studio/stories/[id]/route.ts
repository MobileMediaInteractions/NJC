import { and, desc, eq, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb, hasDatabase } from "@harborline/backend/db";
import { stories, storyRevisions } from "@harborline/backend/schema";
import { writeApiAudit } from "@/lib/api-keys";
import { canDeleteStory, getStudioUser } from "@/lib/auth";
import { storyInput } from "@/lib/story-input";
import {
  canPublishStory,
  canTransitionStoryStatus,
  isValidScheduledPublication,
} from "@/lib/story-workflow";
import { generateWhyItMatters } from "@/lib/why-it-matters";
import {
  BylineUnavailableError,
  getBylineOwner,
  resolvePublicByline,
  validateSavedPublicByline,
} from "@/lib/bylines";
import { legacyPublicBylineSnapshot } from "@/lib/pseudonyms";
import { getSiteConfiguration } from "@/lib/site-settings";

const storyId = z.uuid();
const transitionInput = z.discriminatedUnion("status", [
  z.object({ status: z.literal("draft") }),
  z.object({ status: z.literal("review") }),
  z.object({
    status: z.literal("scheduled"),
    scheduledAt: z.iso.datetime(),
    isActive: z.boolean().default(false),
  }),
  z.object({
    status: z.literal("published"),
    isActive: z.boolean().default(false),
  }),
]);
const storyActionInput = z.union([
  transitionInput,
  z.object({
    action: z.literal("close_editing"),
    confirmation: z.literal("CLOSE STORY"),
  }),
]);

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
  const parsedBody = storyActionInput.safeParse(await request.json().catch(() => null));
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

  const mutation = parsedBody.data;
  if ("action" in mutation) {
    if (!canPublishStory(viewer.role)) {
      return NextResponse.json(
        { error: { code: "forbidden", message: "Publisher access is required to close a live story" } },
        { status: 403 },
      );
    }
    if (current.status !== "published" || !current.isActive) {
      return NextResponse.json(
        { error: { code: "story_locked", message: "This story is already closed to further editing" } },
        { status: 409 },
      );
    }
    const [pendingRevision] = await getDb()
      .select({ id: storyRevisions.id })
      .from(storyRevisions)
      .where(and(
        eq(storyRevisions.storyId, current.id),
        eq(storyRevisions.reviewStatus, "pending"),
      ))
      .limit(1);
    if (pendingRevision) {
      return NextResponse.json(
        {
          error: {
            code: "revision_pending",
            message:
              "Approve or reject the pending update before marking this story final.",
          },
        },
        { status: 409 },
      );
    }
    const now = new Date();
    const updated = await getDb().transaction(async (tx) => {
      const [story] = await tx
        .update(stories)
        .set({ isActive: false, editingClosedAt: now, updatedAt: now })
        .where(and(
          eq(stories.id, current.id),
          eq(stories.status, "published"),
          eq(stories.isActive, true),
        ))
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
        note: `Live editing closed by ${viewer.name}`,
        reviewStatus: "applied",
      });
      return story;
    });
    if (!updated) {
      return NextResponse.json(
        { error: { code: "conflict", message: "The story changed while editing was being closed. Reload and try again." } },
        { status: 409 },
      );
    }
    await writeApiAudit({
      actorClerkId: viewer.id,
      event: "story.editing_closed",
      request,
      metadata: { storyId: updated.id, slug: updated.slug },
    });
    revalidateStoryPaths(updated);
    return NextResponse.json({ data: updated, meta: { apiVersion: "1" } });
  }

  const nextStatus = mutation.status;
  if (
    (nextStatus === "scheduled" || nextStatus === "published") &&
    mutation.isActive &&
    !(await getSiteConfiguration()).studio.editorialWorkflow
      .activeStoryRevisions
  ) {
    return NextResponse.json(
      { error: { code: "feature_disabled", message: "Active-story revisions are disabled in Studio Configuration" } },
      { status: 409 },
    );
  }
  const scheduledAt =
    nextStatus === "scheduled"
      ? new Date(mutation.scheduledAt)
      : null;
  if (
    nextStatus === "scheduled" &&
    (!scheduledAt || !isValidScheduledPublication(scheduledAt))
  ) {
    return NextResponse.json(
      {
        error: {
          code: "invalid_schedule",
          message:
            "Choose a valid publication time at least one minute in the future.",
        },
      },
      { status: 400 },
    );
  }
  const isOwner = Boolean(
    viewer.databaseId && current.authorId === viewer.databaseId,
  );
  if (!canTransitionStoryStatus(current.status, nextStatus, viewer.role, isOwner)) {
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
    let publishByline = current.publicBylineSnapshot;
    if (nextStatus === "scheduled" || nextStatus === "published") {
      if (
        publishByline?.mode === "pseudonym" &&
        !(await getSiteConfiguration()).features.pseudonyms
      ) {
        throw new BylineUnavailableError(
          "Pseudonymous publication is currently disabled in Studio Configuration.",
        );
      }
      if (publishByline?.mode === "pseudonym") {
        const owner = current.authorId
          ? await getBylineOwner(current.authorId)
          : null;
        if (!owner || !validateSavedPublicByline(owner, publishByline)) {
          throw new BylineUnavailableError(
            "The saved pseudonym changed or is no longer available. Return the story to draft and review the public byline.",
          );
        }
      } else if (!publishByline) {
        publishByline = legacyPublicBylineSnapshot({
          authorSnapshot: current.authorSnapshot,
        });
      }
    }
    const updated = await getDb().transaction(async (tx) => {
      const [story] = await tx.update(stories).set({
        status: nextStatus,
        publicBylineSnapshot: publishByline,
        isActive:
          nextStatus === "scheduled" || nextStatus === "published"
            ? mutation.isActive
            : current.isActive,
        editingClosedAt:
          nextStatus === "published"
            ? mutation.isActive
              ? null
              : now
            : current.editingClosedAt,
        publishedAt: nextStatus === "published" ? now : current.publishedAt,
        scheduledAt:
          nextStatus === "scheduled"
            ? scheduledAt
            : current.status === "scheduled" && nextStatus === "review"
              ? null
              : current.scheduledAt,
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
      metadata: {
        storyId: updated.id,
        slug: updated.slug,
        from: current.status,
        to: updated.status,
        scheduledAt: updated.scheduledAt?.toISOString(),
      },
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
    if (error instanceof BylineUnavailableError) {
      return NextResponse.json(
        { error: { code: "byline_requires_review", message: error.message } },
        { status: 409 },
      );
    }
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
  const isPublishedUpdate =
    current.status === "published" && current.isActive;
  if (
    isPublishedUpdate &&
    !(await getSiteConfiguration()).studio.editorialWorkflow
      .activeStoryRevisions
  ) {
    return NextResponse.json(
      { error: { code: "feature_disabled", message: "Active-story revisions are disabled in Studio Configuration" } },
      { status: 409 },
    );
  }
  if (
    current.status !== "draft" &&
    current.status !== "review" &&
    current.status !== "scheduled" &&
    !isPublishedUpdate
  )
    return NextResponse.json(
      { error: { code: "story_locked", message: "This published story is closed to further editing" } },
      { status: 409 },
    );

  const isOwner = Boolean(
    viewer.databaseId && current.authorId === viewer.databaseId,
  );
  const isPublisher = canPublishStory(viewer.role);
  if (!isOwner && !isPublisher)
    return NextResponse.json(
      { error: { code: "forbidden", message: "Only the story owner or a publisher can edit this story" } },
      { status: 403 },
    );
  if (
    !isPublishedUpdate &&
    (parsedBody.data.status === "scheduled" ||
      parsedBody.data.status === "published" ||
      parsedBody.data.publishedAt)
  )
    return NextResponse.json(
      {
        error: {
          code: "workflow_required",
          message:
            "Save editorial copy as a draft, then use the review screen to schedule or publish it.",
        },
      },
      { status: 409 },
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
  if (isPublishedUpdate && parsedBody.data.slug !== current.slug) {
    return NextResponse.json(
      {
        error: {
          code: "published_slug_locked",
          message: "A published story keeps its original URL. Update the headline without changing the slug.",
        },
      },
      { status: 409 },
    );
  }

  const now = new Date();
  const {
    publishedAt: _publishedAt,
    scheduledAt,
    publishedAtRiskAcknowledged: _publishedAtRiskAcknowledged,
    publishedAtChangeReason: _publishedAtChangeReason,
    includeWhyItMatters,
    bylineMode,
    status: requestedStatus,
    ...storyValues
  } = parsedBody.data;
  void _publishedAt;
  void _publishedAtRiskAcknowledged;
  void _publishedAtChangeReason;

  try {
    if (
      bylineMode === "pseudonym" &&
      !(await getSiteConfiguration()).features.pseudonyms
    ) {
      return NextResponse.json(
        { error: { code: "feature_disabled", message: "Pseudonyms are currently disabled in Studio Configuration" } },
        { status: 409 },
      );
    }
    const nextPublicByline = isPublishedUpdate
      ? current.publicBylineSnapshot ??
        legacyPublicBylineSnapshot({ authorSnapshot: current.authorSnapshot })
      : current.authorId
        ? await resolvePublicByline(current.authorId, bylineMode)
        : bylineMode === "account"
          ? legacyPublicBylineSnapshot({
              authorSnapshot: current.authorSnapshot,
            })
          : (() => {
              throw new BylineUnavailableError(
                "A legacy story without an assigned owner cannot use a pseudonym.",
              );
            })();
    const previousPublicByline =
      current.publicBylineSnapshot ??
      legacyPublicBylineSnapshot({ authorSnapshot: current.authorSnapshot });
    const bylineChanged =
      previousPublicByline.mode !== nextPublicByline.mode ||
      previousPublicByline.name !== nextPublicByline.name ||
      previousPublicByline.pseudonymRevision !==
        nextPublicByline.pseudonymRevision;
    if (isPublishedUpdate && bylineChanged) {
      return NextResponse.json(
        { error: { code: "published_byline_locked", message: "The public byline cannot change after publication" } },
        { status: 409 },
      );
    }
    if (isPublishedUpdate) {
      const [pending] = await getDb()
        .select({ id: storyRevisions.id })
        .from(storyRevisions)
        .where(and(
          eq(storyRevisions.storyId, current.id),
          eq(storyRevisions.reviewStatus, "pending"),
        ))
        .limit(1);
      if (pending) {
        return NextResponse.json(
          {
            error: {
              code: "revision_pending",
              message: "An update is already awaiting approval. Review or reject it before submitting another.",
            },
          },
          { status: 409 },
        );
      }
    }
    const effectiveStatus =
      current.status === "review" || current.status === "scheduled"
        ? "draft"
        : requestedStatus;
    if (
      current.status === "draft" &&
      effectiveStatus === "review" &&
      !canTransitionStoryStatus(
        current.status,
        effectiveStatus,
        viewer.role,
        isOwner,
      )
    ) {
      return NextResponse.json(
        {
          error: {
            code: "forbidden",
            message:
              "Only the story owner or a publisher can submit this draft.",
          },
        },
        { status: 403 },
      );
    }
    if (isPublishedUpdate) {
      const proposedSnapshot = {
        ...current,
        ...storyValues,
        publicBylineSnapshot: nextPublicByline,
        whyItMatters: includeWhyItMatters
          ? generateWhyItMatters(parsedBody.data)
          : null,
        imageUrl: parsedBody.data.imageUrl || null,
        imageAlt: parsedBody.data.imageAlt || null,
        seoTitle: parsedBody.data.seoTitle || null,
        seoDescription: parsedBody.data.seoDescription || null,
        canonicalUrl: parsedBody.data.canonicalUrl || null,
        scheduledAt: null,
        publishedAt: current.publishedAt,
        status: "published",
        isActive: true,
        editingClosedAt: null,
        readingMinutes: Math.max(
          1,
          Math.ceil(parsedBody.data.body.join(" ").split(/\s+/).length / 220),
        ),
        updatedAt: now,
      };
      const revision = await getDb().transaction(async (tx) => {
        const [latest] = await tx
          .select({ version: storyRevisions.version })
          .from(storyRevisions)
          .where(eq(storyRevisions.storyId, current.id))
          .orderBy(desc(storyRevisions.version))
          .limit(1);
        const [latestApplied] = await tx
          .select({ version: storyRevisions.version })
          .from(storyRevisions)
          .where(and(
            eq(storyRevisions.storyId, current.id),
            eq(storyRevisions.reviewStatus, "applied"),
          ))
          .orderBy(desc(storyRevisions.version))
          .limit(1);
        const version = (latest?.version ?? 0) + 1;
        const [created] = await tx
          .insert(storyRevisions)
          .values({
            storyId: current.id,
            editorId: viewer.databaseId ?? null,
            version,
            baseVersion: latestApplied?.version ?? 0,
            snapshot: proposedSnapshot,
            note: `Published-story update submitted by ${viewer.name}`,
            reviewStatus: "pending",
          })
          .returning();
        return created;
      });
      await writeApiAudit({
        actorClerkId: viewer.id,
        event: "story.revision_submitted",
        request,
        metadata: {
          storyId: current.id,
          revisionId: revision?.id,
          version: revision?.version,
        },
      });
      revalidatePath(`/studio/stories/${current.id}`);
      return NextResponse.json({
        data: { ...current, revisionPending: true },
        meta: { apiVersion: "1", revisionId: revision?.id },
      });
    }

    const updated = await getDb().transaction(async (tx) => {
      const [story] = await tx.update(stories).set({
        ...storyValues,
        status: effectiveStatus,
        publicBylineSnapshot: nextPublicByline,
        whyItMatters: includeWhyItMatters
          ? generateWhyItMatters(parsedBody.data)
          : null,
        imageUrl: parsedBody.data.imageUrl || null,
        imageAlt: parsedBody.data.imageAlt || null,
        seoTitle: parsedBody.data.seoTitle || null,
        seoDescription: parsedBody.data.seoDescription || null,
        canonicalUrl: parsedBody.data.canonicalUrl || null,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
        publishedAt: null,
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
        note:
          current.status === "review" || current.status === "scheduled"
            ? `Pre-publication content updated by ${viewer.name}; review or active schedule invalidated and returned to draft`
            : bylineChanged
              ? `Public byline updated by ${viewer.name}`
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
      event: "story.edited",
      request,
      metadata: {
        storyId: updated.id,
        previousSlug: current.slug,
        slug: updated.slug,
        fromStatus: current.status,
        toStatus: updated.status,
        bylineMode: updated.publicBylineSnapshot?.mode,
        bylineChanged,
      },
    });

    revalidatePath("/studio");
    revalidatePath("/studio/stories");
    revalidatePath(`/studio/stories/${updated.id}`);
    revalidatePath(`/studio/stories/${updated.id}/edit`);
    return NextResponse.json({ data: updated, meta: { apiVersion: "1" } });
  } catch (error) {
    if (error instanceof BylineUnavailableError) {
      return NextResponse.json(
        { error: { code: "byline_unavailable", message: error.message } },
        { status: 409 },
      );
    }
    console.error("[studio:stories] edit failed", { storyId: current.id, actorId: viewer.id, error });
    return NextResponse.json(
      { error: { code: "save_failed", message: "The story changes could not be saved" } },
      { status: 500 },
    );
  }
}

function revalidateStoryPaths(story: typeof stories.$inferSelect) {
  revalidatePath("/studio");
  revalidatePath("/studio/stories");
  revalidatePath(`/studio/stories/${story.id}`);
  revalidatePath(`/studio/stories/${story.id}/edit`);
  revalidatePath("/");
  revalidatePath("/latest");
  revalidatePath(`/category/${story.categorySlug}`);
  revalidatePath(`/story/${story.slug}`);
  revalidatePath("/api/v1/stories");
  revalidatePath("/feed.xml");
  revalidatePath("/sitemap.xml");
  revalidatePath("/news-sitemap.xml");
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
