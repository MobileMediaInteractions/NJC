import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb, hasDatabase } from "@harborline/backend/db";
import { mediaAssetUsages, stories, storyRevisions } from "@harborline/backend/schema";
import { writeApiAudit } from "@/lib/api-keys";
import { getStudioUser } from "@/lib/auth";
import { storyInput } from "@/lib/story-input";
import { generateWhyItMatters } from "@/lib/why-it-matters";
import {
  BylineUnavailableError,
  resolvePublicByline,
} from "@/lib/bylines";
import { getSiteConfiguration } from "@/lib/site-settings";
import { InvalidStoryLeadMediaError, resolveStoryLeadMedia } from "@/lib/story-lead-media";

export async function POST(request: Request) {
  const viewer = await getStudioUser();
  if (!viewer) return NextResponse.json({ error: { code: "unauthorized", message: "Newsroom sign-in required" } }, { status: 401 });
  if (!hasDatabase()) return NextResponse.json({ error: { code: "service_not_configured", message: "Connect Neon Postgres before saving newsroom content" } }, { status: 503 });
  const parsed = storyInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    const details = parsed.error.flatten();
    console.warn("[studio:stories] validation failed", { userId: viewer.id, fields: Object.keys(details.fieldErrors) });
    return NextResponse.json({ error: { code: "invalid_request", message: "Check the highlighted story fields", details } }, { status: 400 });
  }
  if (
    parsed.data.status !== "draft" ||
    parsed.data.publishedAt
  ) {
    return NextResponse.json(
      {
        error: {
          code: "draft_required",
          message:
            "A new story must be saved as a draft before it can enter review, scheduling, or publication.",
        },
      },
      { status: 409 },
    );
  }
  const configuration = await getSiteConfiguration();
  if (
    parsed.data.bylineMode === "pseudonym" &&
    (!configuration.features.pseudonyms || !configuration.studio.editorialWorkflow.pseudonymEligibleRoles.includes(viewer.role))
  ) {
    return NextResponse.json(
      { error: { code: "feature_disabled", message: "Pseudonyms are currently disabled in Studio Configuration" } },
      { status: 409 },
    );
  }
  if (!viewer.databaseId) {
    return NextResponse.json(
      { error: { code: "profile_unavailable", message: "A synchronized newsroom profile is required before saving a story" } },
      { status: 409 },
    );
  }

  const [existing] = await getDb().select({ id: stories.id }).from(stories).where(eq(stories.slug, parsed.data.slug)).limit(1);
  if (existing) return NextResponse.json({ error: { code: "slug_conflict", message: "A story with this headline URL already exists. Change the headline before saving." } }, { status: 409 });

  try {
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
      status: _requestedStatus,
      imageUrl: _imageUrl,
      imageAlt: _imageAlt,
      imageAssetId: _imageAssetId,
      imageKind: _imageKind,
      ...storyValues
    } = parsed.data;
    void _publishedAt;
    void _publishedAtRiskAcknowledged;
    void _publishedAtChangeReason;
    void _requestedStatus;
    void _imageUrl;
    void _imageAlt;
    void _imageAssetId;
    void _imageKind;
    const leadMedia = await resolveStoryLeadMedia(parsed.data);
    const publicBylineSnapshot = await resolvePublicByline(
      viewer.databaseId,
      bylineMode,
    );
    const story = await getDb().transaction(async (tx) => {
      const storyInsert: typeof stories.$inferInsert = {
        ...storyValues,
        status: "draft",
        whyItMatters: includeWhyItMatters
          ? generateWhyItMatters(parsed.data)
          : null,
        publicNoteType: includePublicNote ? publicNoteType : null,
        publicNote: includePublicNote ? publicNote : null,
        ...leadMedia,
        imageAlt: parsed.data.imageAlt || null,
        seoTitle: parsed.data.seoTitle || null,
        seoDescription: parsed.data.seoDescription || null,
        canonicalUrl: parsed.data.canonicalUrl || null,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
        publishedAt: null,
        readingMinutes: Math.max(1, Math.ceil(parsed.data.body.join(" ").split(/\s+/).length / 220)),
        authorId: viewer.databaseId ?? null,
        authorSnapshot: { id: viewer.id, name: viewer.name, role: viewer.role, initials: viewer.name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase() },
        publicBylineSnapshot,
        publicBylinesSnapshot: [
          { userId: viewer.databaseId!, ...publicBylineSnapshot },
        ],
      };
      const [created] = await tx.insert(stories).values(storyInsert).returning();
      await tx.insert(storyRevisions).values({
        storyId: created.id,
        version: 1,
        snapshot: created,
        note: scheduledAt
          ? "Initial newsroom draft saved with a planned publication time"
          : "Initial newsroom draft saved",
      });
      if (leadMedia.imageAssetId) {
        await tx.insert(mediaAssetUsages).values({
          assetId: leadMedia.imageAssetId,
          ownerType: "story",
          ownerId: created.id,
          field: "lead_image",
        });
      }
      return created;
    });
    await writeApiAudit({
      actorClerkId: viewer.id,
      event: "story.draft_created",
      request,
      metadata: {
        storyId: story.id,
        slug: story.slug,
        plannedPublicationAt: story.scheduledAt?.toISOString(),
      },
    });
    console.info("[studio:stories] saved", { storyId: story.id, status: story.status, authorId: viewer.id });
    return NextResponse.json({ data: story, meta: { apiVersion: "1" } }, { status: 201 });
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
    console.error("[studio:stories] persistence failed", { status: "draft", userId: viewer.id, error });
    return NextResponse.json({ error: { code: "save_failed", message: "The story could not be saved. No publication was confirmed." } }, { status: 500 });
  }
}
