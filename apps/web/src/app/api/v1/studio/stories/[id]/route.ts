import { and, desc, eq, inArray, isNull, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb, hasDatabase } from "@harborline/backend/db";
import {
  stories,
  mediaAssetUsages,
  storyApprovals,
  storyPublicationJobs,
  storyRevisions,
} from "@harborline/backend/schema";
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
import { storyContentHash, storyPublicationBlockers } from "@/lib/story-content-integrity";
import { canApproveStory } from "@/lib/story-scheduling-policy";
import { InvalidStoryLeadMediaError, resolveStoryLeadMedia } from "@/lib/story-lead-media";
import { hasMeaningfulStoryRevisionChange } from "@/lib/story-revisions";

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
    action: z.literal("approve"),
    note: z.string().trim().max(500).default(""),
  }),
  z.object({
    action: z.literal("reschedule"),
    scheduledAt: z.iso.datetime(),
    confirmation: z.literal("RESCHEDULE"),
  }),
  z.object({
    action: z.literal("cancel_schedule"),
    confirmation: z.literal("CANCEL SCHEDULE"),
  }),
  z.object({
    action: z.literal("retry_schedule"),
  }),
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
    if (mutation.action === "approve") {
      if (!canApproveStory({
        role: viewer.role,
        storyStatus: current.status,
        viewerUserId: viewer.databaseId,
        authorId: current.authorId,
      })) {
        return NextResponse.json(
          { error: { code: "independent_approval_required", message: "A publisher other than the story owner must approve this reviewed revision." } },
          { status: 403 },
        );
      }
      const blockers = storyPublicationBlockers(current);
      if (blockers.length) {
        return NextResponse.json(
          { error: { code: "publication_blocked", message: `Resolve the publication checks first: ${blockers.join(", ")}` } },
          { status: 409 },
        );
      }
      const hash = storyContentHash(current);
      const approval = await getDb().transaction(async (tx) => {
        await tx.update(storyApprovals).set({
          invalidatedAt: new Date(),
          invalidatedByClerkId: viewer.id,
          invalidationReason: "Superseded by a newer approval",
        }).where(and(eq(storyApprovals.storyId, current.id), isNull(storyApprovals.invalidatedAt)));
        const [created] = await tx.insert(storyApprovals).values({
          storyId: current.id,
          contentVersion: current.contentVersion,
          contentHash: hash,
          approvedById: viewer.databaseId ?? null,
          approvedByClerkId: viewer.id,
          note: mutation.note || null,
        }).returning();
        await tx.update(stories).set({ contentHash: hash, updatedAt: new Date() }).where(eq(stories.id, current.id));
        return created;
      });
      await writeApiAudit({
        actorClerkId: viewer.id,
        event: "story.approved",
        request,
        metadata: { storyId: current.id, approvalId: approval?.id, contentVersion: current.contentVersion, contentHash: hash },
      });
      revalidatePath(`/studio/stories/${current.id}`);
      return NextResponse.json({ data: approval, meta: { apiVersion: "1" } });
    }

    if (mutation.action === "reschedule") {
      if (!canPublishStory(viewer.role) || current.status !== "scheduled") {
        return NextResponse.json({ error: { code: "forbidden", message: "Publisher access and an active schedule are required" } }, { status: 403 });
      }
      const nextTime = new Date(mutation.scheduledAt);
      if (!isValidScheduledPublication(nextTime)) {
        return NextResponse.json({ error: { code: "invalid_schedule", message: "Choose a valid future publication time." } }, { status: 400 });
      }
      const [job] = await getDb().select().from(storyPublicationJobs)
        .where(and(eq(storyPublicationJobs.storyId, current.id), inArray(storyPublicationJobs.status, ["queued", "blocked", "failed"]))).limit(1);
      if (!job) return NextResponse.json({ error: { code: "schedule_missing", message: "No active publication job was found." } }, { status: 409 });
      await getDb().transaction(async (tx) => {
        await tx.update(storyPublicationJobs).set({ status: "queued", scheduledAt: nextTime, updatedByClerkId: viewer.id, lastErrorCode: null, lastErrorMessage: null, updatedAt: new Date() }).where(eq(storyPublicationJobs.id, job.id));
        await tx.update(stories).set({ scheduledAt: nextTime, updatedAt: new Date() }).where(eq(stories.id, current.id));
      });
      await writeApiAudit({ actorClerkId: viewer.id, event: "story.schedule_changed", request, metadata: { storyId: current.id, originalScheduledAt: job.originalScheduledAt.toISOString(), previousScheduledAt: job.scheduledAt.toISOString(), scheduledAt: nextTime.toISOString() } });
      revalidatePath(`/studio/stories/${current.id}`);
      return NextResponse.json({ data: { scheduledAt: nextTime.toISOString(), status: "queued" }, meta: { apiVersion: "1" } });
    }

    if (mutation.action === "cancel_schedule") {
      if (!canPublishStory(viewer.role) || current.status !== "scheduled") {
        return NextResponse.json({ error: { code: "forbidden", message: "Publisher access and an active schedule are required" } }, { status: 403 });
      }
      const now = new Date();
      await getDb().transaction(async (tx) => {
        await tx.update(storyPublicationJobs).set({ status: "cancelled", cancelledAt: now, updatedByClerkId: viewer.id, updatedAt: now }).where(and(eq(storyPublicationJobs.storyId, current.id), inArray(storyPublicationJobs.status, ["queued", "blocked", "failed"])));
        await tx.update(stories).set({ status: "review", scheduledAt: null, updatedAt: now }).where(and(eq(stories.id, current.id), eq(stories.status, "scheduled")));
      });
      await writeApiAudit({ actorClerkId: viewer.id, event: "story.schedule_cancelled", request, metadata: { storyId: current.id, previousScheduledAt: current.scheduledAt?.toISOString() } });
      revalidatePath(`/studio/stories/${current.id}`);
      return NextResponse.json({ data: { status: "review" }, meta: { apiVersion: "1" } });
    }

    if (mutation.action === "retry_schedule") {
      if (!canPublishStory(viewer.role) || current.status !== "review") {
        return NextResponse.json({ error: { code: "forbidden", message: "Publisher access is required to retry a held schedule" } }, { status: 403 });
      }
      return NextResponse.json({ error: { code: "approval_required", message: "A blocked publication must be reviewed and approved again before it can be rescheduled." } }, { status: 409 });
    }

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
  const workflowConfiguration = await getSiteConfiguration();
  if (
    nextStatus === "scheduled" &&
    !workflowConfiguration.studio.automations.scheduledPublishing
  ) {
    return NextResponse.json(
      {
        error: {
          code: "feature_disabled",
          message: "Scheduled publication is disabled in Studio Configuration.",
        },
      },
      { status: 409 },
    );
  }
  if (
    (nextStatus === "scheduled" || nextStatus === "published") &&
    mutation.isActive &&
    !workflowConfiguration.studio.editorialWorkflow
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
  const [activeApproval] =
    nextStatus === "scheduled" || nextStatus === "published"
      ? await getDb()
          .select()
          .from(storyApprovals)
          .where(and(eq(storyApprovals.storyId, current.id), isNull(storyApprovals.invalidatedAt)))
          .limit(1)
      : [];
  const currentHash = storyContentHash(current);
  const approvalMatches = Boolean(
    activeApproval &&
      activeApproval.contentVersion === current.contentVersion &&
      activeApproval.contentHash === currentHash,
  );
  const isApprovedPublicationTransition =
    (nextStatus === "scheduled" || nextStatus === "published") &&
    (current.status === "review" || current.status === "scheduled") &&
    canPublishStory(viewer.role) &&
    workflowConfiguration.studio.editorialWorkflow.schedulingEligibleRoles.includes(viewer.role as "admin" | "editor" | "producer") &&
    !isOwner &&
    approvalMatches;
  if (!canTransitionStoryStatus(current.status, nextStatus, viewer.role, isOwner) && !isApprovedPublicationTransition) {
    if ((nextStatus === "scheduled" || nextStatus === "published") && isOwner) {
      return NextResponse.json(
        { error: { code: "independent_publication_required", message: "The story owner cannot publish their own reviewed work. Ask another publisher to complete the action." } },
        { status: 403 },
      );
    }
    if ((nextStatus === "scheduled" || nextStatus === "published") && !approvalMatches) {
      return NextResponse.json(
        { error: { code: "approval_required", message: "Approve the current content revision before scheduling or publishing." } },
        { status: 409 },
      );
    }
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
        !workflowConfiguration.features.pseudonyms
      ) {
        throw new BylineUnavailableError(
          "Pseudonymous publication is currently disabled in Studio Configuration.",
        );
      }
      if (publishByline?.mode === "pseudonym") {
        const owner = current.authorId
          ? await getBylineOwner(current.authorId)
          : null;
        if (
          !owner ||
          !workflowConfiguration.studio.editorialWorkflow.pseudonymEligibleRoles.includes(owner.role) ||
          !validateSavedPublicByline(owner, publishByline)
        ) {
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

      if (nextStatus === "draft") {
        await tx.update(storyApprovals).set({ invalidatedAt: now, invalidatedByClerkId: viewer.id, invalidationReason: "Story returned to draft" }).where(and(eq(storyApprovals.storyId, story.id), isNull(storyApprovals.invalidatedAt)));
        await tx.update(storyPublicationJobs).set({ status: "cancelled", cancelledAt: now, updatedByClerkId: viewer.id, updatedAt: now }).where(and(eq(storyPublicationJobs.storyId, story.id), inArray(storyPublicationJobs.status, ["queued", "blocked", "failed"])));
      }

      if (nextStatus === "scheduled" && scheduledAt && activeApproval) {
        await tx
          .update(storyPublicationJobs)
          .set({ status: "cancelled", cancelledAt: now, updatedByClerkId: viewer.id, updatedAt: now })
          .where(and(eq(storyPublicationJobs.storyId, story.id), inArray(storyPublicationJobs.status, ["queued", "blocked", "failed"])));
        await tx.insert(storyPublicationJobs).values({
          storyId: story.id,
          approvalId: activeApproval.id,
          status: "queued",
          scheduledAt,
          originalScheduledAt: scheduledAt,
          contentHash: activeApproval.contentHash,
          createdByClerkId: viewer.id,
          updatedByClerkId: viewer.id,
        });
      }
      if (nextStatus === "published") {
        await tx
          .update(storyPublicationJobs)
          .set({ status: "published", publishedAt: now, updatedByClerkId: viewer.id, updatedAt: now })
          .where(and(eq(storyPublicationJobs.storyId, story.id), inArray(storyPublicationJobs.status, ["queued", "publishing", "blocked", "failed"])));
      }

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
    includePublicNote,
    publicNoteType,
    publicNote,
    bylineMode,
    status: requestedStatus,
    imageUrl: _imageUrl,
    imageAlt: _imageAlt,
    imageAssetId: _imageAssetId,
    imageKind: _imageKind,
    ...storyValues
  } = parsedBody.data;
  void _publishedAt;
  void _publishedAtRiskAcknowledged;
  void _publishedAtChangeReason;
  void _imageUrl;
  void _imageAlt;
  void _imageAssetId;
  void _imageKind;

  try {
    const leadMedia = await resolveStoryLeadMedia(parsedBody.data);
    if (
      bylineMode === "pseudonym" &&
      (!(await getSiteConfiguration()).features.pseudonyms || !(await getSiteConfiguration()).studio.editorialWorkflow.pseudonymEligibleRoles.includes(viewer.role))
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
    const proposedEditorialSnapshot = {
      ...current,
      ...storyValues,
      status: isPublishedUpdate ? "published" : effectiveStatus,
      publicBylineSnapshot: nextPublicByline,
      whyItMatters: includeWhyItMatters
        ? generateWhyItMatters(parsedBody.data)
        : null,
      publicNoteType: includePublicNote ? publicNoteType : null,
      publicNote: includePublicNote ? publicNote : null,
      ...leadMedia,
      imageAlt: parsedBody.data.imageAlt || null,
      seoTitle: parsedBody.data.seoTitle || null,
      seoDescription: parsedBody.data.seoDescription || null,
      canonicalUrl: parsedBody.data.canonicalUrl || null,
      scheduledAt: isPublishedUpdate
        ? null
        : scheduledAt
          ? new Date(scheduledAt)
          : null,
    };
    if (!hasMeaningfulStoryRevisionChange(current, proposedEditorialSnapshot)) {
      return NextResponse.json({
        data: current,
        meta: { apiVersion: "1", unchanged: true },
      });
    }
    if (isPublishedUpdate) {
      const proposedSnapshot = {
        ...proposedEditorialSnapshot,
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
        publicBylinesSnapshot: current.authorId
          ? [{ userId: current.authorId, ...nextPublicByline }]
          : [],
        contentVersion: current.contentVersion + 1,
        contentHash: null,
        whyItMatters: includeWhyItMatters
          ? generateWhyItMatters(parsedBody.data)
          : null,
        publicNoteType: includePublicNote ? publicNoteType : null,
        publicNote: includePublicNote ? publicNote : null,
        ...leadMedia,
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

      await tx.delete(mediaAssetUsages).where(and(
        eq(mediaAssetUsages.ownerType, "story"),
        eq(mediaAssetUsages.ownerId, story.id),
        eq(mediaAssetUsages.field, "lead_image"),
      ));
      if (leadMedia.imageAssetId) {
        await tx.insert(mediaAssetUsages).values({
          assetId: leadMedia.imageAssetId,
          ownerType: "story",
          ownerId: story.id,
          field: "lead_image",
        });
      }

      await tx.update(storyApprovals).set({
        invalidatedAt: now,
        invalidatedByClerkId: viewer.id,
        invalidationReason: "Material story content changed",
      }).where(and(eq(storyApprovals.storyId, story.id), isNull(storyApprovals.invalidatedAt)));
      await tx.update(storyPublicationJobs).set({
        status: "cancelled",
        cancelledAt: now,
        updatedByClerkId: viewer.id,
        lastErrorCode: "content_changed",
        lastErrorMessage: "The schedule was removed because approved content changed.",
        updatedAt: now,
      }).where(and(eq(storyPublicationJobs.storyId, story.id), inArray(storyPublicationJobs.status, ["queued", "blocked", "failed"])));

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
    if (error instanceof InvalidStoryLeadMediaError) {
      return NextResponse.json(
        { error: { code: "invalid_lead_media", message: error.message } },
        { status: 409 },
      );
    }
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
