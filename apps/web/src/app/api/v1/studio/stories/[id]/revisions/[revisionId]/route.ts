import { and, desc, eq, inArray, isNull, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb, hasDatabase } from "@harborline/backend/db";
import {
  mediaAssetUsages,
  stories,
  storyApprovals,
  storyPublicationJobs,
  storyRevisions,
} from "@harborline/backend/schema";
import { writeApiAudit } from "@/lib/api-keys";
import { getStudioUser } from "@/lib/auth";
import { canPublishStory } from "@/lib/story-workflow";
import { storyRichTextDocumentSchema } from "@/lib/story-rich-text";
import { storyPublicationBlockers } from "@/lib/story-content-integrity";
import { isAiStoryImageGeneration } from "@/lib/ai-story-image";

const paramsInput = z.object({
  id: z.uuid(),
  revisionId: z.uuid(),
});
const reviewInput = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("approve"),
    confirmation: z.literal("APPROVE UPDATE"),
    note: z.string().trim().max(500).optional().default(""),
  }),
  z.object({
    action: z.literal("reject"),
    confirmation: z.literal("REJECT UPDATE"),
    note: z.string().trim().max(500).optional().default(""),
  }),
  z.object({
    action: z.literal("restore"),
    confirmation: z.literal("RESTORE REVISION"),
    note: z.string().trim().min(10).max(500),
  }),
]);
const snapshotInput = z.object({
  slug: z.string(),
  headline: z.string(),
  dek: z.string(),
  body: z.array(z.string()),
  richBody: storyRichTextDocumentSchema.nullable().optional(),
  whyItMatters: z.string().nullable(),
  publicNoteType: z.enum(["editors_note", "reporting_note", "update_note"]).nullable().optional(),
  publicNote: z.string().nullable().optional(),
  categorySlug: z.string(),
  categoryLabel: z.string(),
  location: z.string(),
  publicBylineSnapshot: z.object({
    mode: z.enum(["account", "pseudonym"]),
    name: z.string(),
    initials: z.string(),
    role: z.string(),
    avatar: z.string().optional(),
    profileSlug: z.string().optional(),
    pseudonymRevision: z.number().int().optional(),
  }).nullable(),
  imageUrl: z.string().nullable(),
  imageAlt: z.string().nullable(),
  imageAssetId: z.uuid().nullable().optional(),
  imageKind: z.enum(["editorial", "ai_placeholder"]).default("editorial"),
  imageGeneration: z.unknown().nullable().optional(),
  videoUrl: z.string().nullable(),
  tags: z.array(z.string()),
  seoTitle: z.string().nullable(),
  seoDescription: z.string().nullable(),
  canonicalUrl: z.string().nullable(),
  noIndex: z.boolean(),
  readingMinutes: z.number().int().positive(),
  isBreaking: z.boolean(),
  isLive: z.boolean(),
  isExclusive: z.boolean(),
  isDeveloping: z.boolean(),
});

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string; revisionId: string }> },
) {
  const viewer = await getStudioUser();
  if (!viewer || !canPublishStory(viewer.role)) {
    return responseError(
      "forbidden",
      "Publisher access is required to review live-story updates",
      403,
    );
  }
  if (!hasDatabase()) {
    return responseError("service_not_configured", "Postgres is required", 503);
  }
  const parsedParams = paramsInput.safeParse(await context.params);
  const parsedBody = reviewInput.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsedParams.success || !parsedBody.success) {
    return responseError(
      "invalid_request",
      "Choose a valid revision and review action",
      400,
    );
  }

  const db = getDb();
  const [[story], [revision]] = await Promise.all([
    db
      .select()
      .from(stories)
      .where(eq(stories.id, parsedParams.data.id))
      .limit(1),
    db
      .select()
      .from(storyRevisions)
      .where(and(
        eq(storyRevisions.id, parsedParams.data.revisionId),
        eq(storyRevisions.storyId, parsedParams.data.id),
      ))
      .limit(1),
  ]);
  if (!story || !revision) {
    return responseError("not_found", "Story revision not found", 404);
  }
  if (parsedBody.data.action === "restore") {
    return restoreRevision({
      request,
      story,
      revision,
      viewer,
      note: parsedBody.data.note,
    });
  }
  if (revision.reviewStatus !== "pending") {
    return responseError(
      "revision_closed",
      "This revision has already been reviewed",
      409,
    );
  }
  if (revision.editorId && revision.editorId === viewer.databaseId) {
    return responseError(
      "independent_review_required",
      "A different publisher must approve or reject this update",
      409,
    );
  }

  const now = new Date();
  if (parsedBody.data.action === "reject") {
    const [rejected] = await db
      .update(storyRevisions)
      .set({
        reviewStatus: "rejected",
        reviewedById: viewer.databaseId ?? null,
        reviewedAt: now,
        reviewNote: parsedBody.data.note || "Rejected during editorial review",
      })
      .where(and(
        eq(storyRevisions.id, revision.id),
        eq(storyRevisions.reviewStatus, "pending"),
      ))
      .returning();
    if (!rejected) {
      return responseError(
        "conflict",
        "This revision changed while you were reviewing it",
        409,
      );
    }
    await writeApiAudit({
      actorClerkId: viewer.id,
      event: "story.revision_rejected",
      request,
      metadata: { storyId: story.id, revisionId: revision.id },
    });
    revalidatePath(`/studio/stories/${story.id}`);
    return NextResponse.json({ data: rejected, meta: { apiVersion: "1" } });
  }

  if (story.status !== "published" || !story.isActive) {
    return responseError(
      "story_locked",
      "This story was closed before the revision could be approved",
      409,
    );
  }
  const snapshot = snapshotInput.safeParse(revision.snapshot);
  if (!snapshot.success) {
    return responseError(
      "invalid_revision",
      "The proposed revision failed integrity checks",
      409,
    );
  }
  const publicationBlockers = storyPublicationBlockers({
    ...snapshot.data,
    publicBylineSnapshot: snapshot.data.publicBylineSnapshot,
  });
  if (publicationBlockers.length) {
    return responseError(
      "publication_blocked",
      `Resolve the publication checks first: ${publicationBlockers.join(", ")}`,
      409,
    );
  }
  const [latestApplied] = await db
    .select({ version: storyRevisions.version })
    .from(storyRevisions)
    .where(and(
      eq(storyRevisions.storyId, story.id),
      eq(storyRevisions.reviewStatus, "applied"),
    ))
    .orderBy(desc(storyRevisions.version))
    .limit(1);
  if ((latestApplied?.version ?? 0) !== (revision.baseVersion ?? 0)) {
    return responseError(
      "stale_revision",
      "The live story changed after this update was submitted. Reject it and create a new revision.",
      409,
    );
  }

  const approved = await db.transaction(async (tx) => {
    const proposed = snapshot.data;
    const [updatedStory] = await tx
      .update(stories)
      .set({
        headline: proposed.headline,
        dek: proposed.dek,
        body: proposed.body,
        richBody: proposed.richBody ?? null,
        whyItMatters: proposed.whyItMatters,
        publicNoteType: proposed.publicNoteType ?? null,
        publicNote: proposed.publicNote ?? null,
        categorySlug: proposed.categorySlug,
        categoryLabel: proposed.categoryLabel,
        location: proposed.location,
        publicBylineSnapshot:
          proposed.publicBylineSnapshot as typeof story.publicBylineSnapshot,
        imageUrl: proposed.imageUrl,
        imageAlt: proposed.imageAlt,
        imageAssetId: proposed.imageAssetId ?? null,
        imageKind: proposed.imageKind,
        imageGeneration: isAiStoryImageGeneration(proposed.imageGeneration)
          ? proposed.imageGeneration
          : null,
        videoUrl: proposed.videoUrl,
        tags: proposed.tags,
        seoTitle: proposed.seoTitle,
        seoDescription: proposed.seoDescription,
        canonicalUrl: proposed.canonicalUrl,
        noIndex: proposed.noIndex,
        readingMinutes: proposed.readingMinutes,
        isBreaking: proposed.isBreaking,
        isLive: proposed.isLive,
        isExclusive: proposed.isExclusive,
        isDeveloping: proposed.isDeveloping,
        updatedAt: now,
      })
      .where(and(
        eq(stories.id, story.id),
        eq(stories.status, "published"),
        eq(stories.isActive, true),
      ))
      .returning();
    if (!updatedStory) return null;

    await tx.delete(mediaAssetUsages).where(and(
      eq(mediaAssetUsages.ownerType, "story"),
      eq(mediaAssetUsages.ownerId, story.id),
      eq(mediaAssetUsages.field, "lead_image"),
    ));
    if (proposed.imageAssetId) {
      await tx.insert(mediaAssetUsages).values({
        assetId: proposed.imageAssetId,
        ownerType: "story",
        ownerId: story.id,
        field: "lead_image",
      });
    }

    const [updatedRevision] = await tx
      .update(storyRevisions)
      .set({
        snapshot: updatedStory,
        reviewStatus: "applied",
        reviewedById: viewer.databaseId ?? null,
        reviewedAt: now,
        reviewNote: parsedBody.data.note || "Approved for live publication",
      })
      .where(and(
        eq(storyRevisions.id, revision.id),
        eq(storyRevisions.reviewStatus, "pending"),
      ))
      .returning();
    if (!updatedRevision) tx.rollback();
    return { story: updatedStory, revision: updatedRevision };
  });
  if (!approved) {
    return responseError(
      "conflict",
      "The story or revision changed during approval. Reload and review again.",
      409,
    );
  }

  await writeApiAudit({
    actorClerkId: viewer.id,
    event: "story.revision_approved",
    request,
    metadata: {
      storyId: approved.story.id,
      revisionId: approved.revision.id,
      version: approved.revision.version,
    },
  });
  revalidateStoryPaths(approved.story);
  return NextResponse.json({ data: approved, meta: { apiVersion: "1" } });
}

async function restoreRevision({
  request,
  story,
  revision,
  viewer,
  note,
}: {
  request: Request;
  story: typeof stories.$inferSelect;
  revision: typeof storyRevisions.$inferSelect;
  viewer: NonNullable<Awaited<ReturnType<typeof getStudioUser>>>;
  note: string;
}) {
  const snapshot = snapshotInput.safeParse(revision.snapshot);
  if (!snapshot.success) {
    return responseError(
      "invalid_revision",
      "This historical snapshot cannot be restored because it no longer passes current content integrity checks.",
      409,
    );
  }
  const [pending] = await getDb()
    .select({ id: storyRevisions.id })
    .from(storyRevisions)
    .where(and(
      eq(storyRevisions.storyId, story.id),
      eq(storyRevisions.reviewStatus, "pending"),
    ))
    .limit(1);
  if (pending) {
    return responseError(
      "revision_pending",
      "Resolve the pending live-story update before restoring another revision.",
      409,
    );
  }
  if (story.status === "published" && !story.isActive) {
    return responseError(
      "story_locked",
      "This published story is final. Reopen active editing through the approved editorial workflow before restoring copy.",
      409,
    );
  }

  const restored = snapshot.data;
  const [slugConflict] = await getDb()
    .select({ id: stories.id })
    .from(stories)
    .where(and(eq(stories.slug, restored.slug), ne(stories.id, story.id)))
    .limit(1);
  if (slugConflict && story.status !== "published") {
    return responseError(
      "slug_conflict",
      "The historical story URL is now used by another article. Change that URL before restoring this revision.",
      409,
    );
  }

  const db = getDb();
  const now = new Date();
  const [latest] = await db
    .select({ version: storyRevisions.version })
    .from(storyRevisions)
    .where(eq(storyRevisions.storyId, story.id))
    .orderBy(desc(storyRevisions.version))
    .limit(1);
  const nextVersion = (latest?.version ?? 0) + 1;

  if (story.status === "published") {
    const [latestApplied] = await db
      .select({ version: storyRevisions.version })
      .from(storyRevisions)
      .where(and(
        eq(storyRevisions.storyId, story.id),
        eq(storyRevisions.reviewStatus, "applied"),
      ))
      .orderBy(desc(storyRevisions.version))
      .limit(1);
    const proposedSnapshot = {
      ...story,
      ...restored,
      slug: story.slug,
      publicBylineSnapshot: story.publicBylineSnapshot,
      status: "published",
      publishedAt: story.publishedAt,
      scheduledAt: null,
      isActive: true,
      editingClosedAt: null,
      updatedAt: now,
    };
    const blockers = storyPublicationBlockers(proposedSnapshot);
    if (blockers.length) {
      return responseError(
        "publication_blocked",
        `The historical revision cannot return to publication until these checks are resolved: ${blockers.join(", ")}`,
        409,
      );
    }
    const [created] = await db.insert(storyRevisions).values({
      storyId: story.id,
      editorId: viewer.databaseId ?? null,
      version: nextVersion,
      baseVersion: latestApplied?.version ?? 0,
      snapshot: proposedSnapshot,
      note: `Restore revision ${revision.version}: ${note}`,
      reviewStatus: "pending",
    }).returning();
    await writeApiAudit({
      actorClerkId: viewer.id,
      event: "story.revision_restore_submitted",
      request,
      metadata: {
        storyId: story.id,
        sourceRevisionId: revision.id,
        sourceVersion: revision.version,
        revisionId: created?.id,
        version: created?.version,
      },
    });
    revalidatePath(`/studio/stories/${story.id}`);
    return NextResponse.json({
      data: created,
      meta: { apiVersion: "1", requiresReview: true },
    });
  }

  const result = await db.transaction(async (tx) => {
    const [updatedStory] = await tx.update(stories).set({
      slug: restored.slug,
      headline: restored.headline,
      dek: restored.dek,
      body: restored.body,
      richBody: restored.richBody ?? null,
      whyItMatters: restored.whyItMatters,
      publicNoteType: restored.publicNoteType ?? null,
      publicNote: restored.publicNote ?? null,
      categorySlug: restored.categorySlug,
      categoryLabel: restored.categoryLabel,
      location: restored.location,
      publicBylineSnapshot:
        restored.publicBylineSnapshot as typeof story.publicBylineSnapshot,
      publicBylinesSnapshot:
        story.authorId && restored.publicBylineSnapshot
          ? [{
              userId: story.authorId,
              ...restored.publicBylineSnapshot,
            }] as typeof story.publicBylinesSnapshot
          : [],
      imageUrl: restored.imageUrl,
      imageAlt: restored.imageAlt,
      imageAssetId: restored.imageAssetId ?? null,
      imageKind: restored.imageKind,
      imageGeneration: isAiStoryImageGeneration(restored.imageGeneration)
        ? restored.imageGeneration
        : null,
      videoUrl: restored.videoUrl,
      tags: restored.tags,
      seoTitle: restored.seoTitle,
      seoDescription: restored.seoDescription,
      canonicalUrl: restored.canonicalUrl,
      noIndex: restored.noIndex,
      readingMinutes: restored.readingMinutes,
      isBreaking: restored.isBreaking,
      isLive: restored.isLive,
      isExclusive: restored.isExclusive,
      isDeveloping: restored.isDeveloping,
      status: "draft",
      scheduledAt: null,
      publishedAt: null,
      contentVersion: story.contentVersion + 1,
      contentHash: null,
      updatedAt: now,
    }).where(eq(stories.id, story.id)).returning();
    if (!updatedStory) return null;

    await tx.update(storyApprovals).set({
      invalidatedAt: now,
      invalidatedByClerkId: viewer.id,
      invalidationReason: `Revision ${revision.version} restored`,
    }).where(and(
      eq(storyApprovals.storyId, story.id),
      isNull(storyApprovals.invalidatedAt),
    ));
    await tx.update(storyPublicationJobs).set({
      status: "cancelled",
      cancelledAt: now,
      updatedByClerkId: viewer.id,
      lastErrorCode: "revision_restored",
      lastErrorMessage: "The active schedule was cancelled by a revision restoration.",
      updatedAt: now,
    }).where(and(
      eq(storyPublicationJobs.storyId, story.id),
      inArray(storyPublicationJobs.status, ["queued", "blocked", "failed"]),
    ));
    await tx.delete(mediaAssetUsages).where(and(
      eq(mediaAssetUsages.ownerType, "story"),
      eq(mediaAssetUsages.ownerId, story.id),
      eq(mediaAssetUsages.field, "lead_image"),
    ));
    if (restored.imageAssetId) {
      await tx.insert(mediaAssetUsages).values({
        assetId: restored.imageAssetId,
        ownerType: "story",
        ownerId: story.id,
        field: "lead_image",
      });
    }
    const [createdRevision] = await tx.insert(storyRevisions).values({
      storyId: story.id,
      editorId: viewer.databaseId ?? null,
      version: nextVersion,
      baseVersion: latest?.version ?? null,
      snapshot: updatedStory,
      note: `Restored from revision ${revision.version}: ${note}`,
      reviewStatus: "applied",
    }).returning();
    return { story: updatedStory, revision: createdRevision };
  });
  if (!result) {
    return responseError(
      "conflict",
      "The story changed while the revision was being restored. Reload and try again.",
      409,
    );
  }
  await writeApiAudit({
    actorClerkId: viewer.id,
    event: "story.revision_restored",
    request,
    metadata: {
      storyId: story.id,
      sourceRevisionId: revision.id,
      sourceVersion: revision.version,
      revisionId: result.revision?.id,
      version: result.revision?.version,
    },
  });
  revalidateStoryPaths(result.story);
  return NextResponse.json({
    data: result,
    meta: { apiVersion: "1", requiresReview: false },
  });
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

function responseError(code: string, message: string, status: number) {
  return NextResponse.json(
    { error: { code, message } },
    {
      status,
      headers: {
        "Cache-Control": "private, no-store",
        "X-Robots-Tag": "noindex, nofollow",
      },
    },
  );
}
