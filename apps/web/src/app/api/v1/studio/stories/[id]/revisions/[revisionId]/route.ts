import { and, desc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb, hasDatabase } from "@harborline/backend/db";
import { stories, storyRevisions } from "@harborline/backend/schema";
import { writeApiAudit } from "@/lib/api-keys";
import { getStudioUser } from "@/lib/auth";
import { canPublishStory } from "@/lib/story-workflow";
import { storyRichTextDocumentSchema } from "@/lib/story-rich-text";

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
]);
const snapshotInput = z.object({
  slug: z.string(),
  headline: z.string(),
  dek: z.string(),
  body: z.array(z.string()),
  richBody: storyRichTextDocumentSchema.nullable().optional(),
  whyItMatters: z.string().nullable(),
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
        categorySlug: proposed.categorySlug,
        categoryLabel: proposed.categoryLabel,
        location: proposed.location,
        publicBylineSnapshot:
          proposed.publicBylineSnapshot as typeof story.publicBylineSnapshot,
        imageUrl: proposed.imageUrl,
        imageAlt: proposed.imageAlt,
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
