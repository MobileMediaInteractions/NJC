import "server-only";

import { and, asc, desc, eq, gt, isNull, lte, ne, or } from "drizzle-orm";
import { getDb, hasDatabase } from "@harborline/backend/db";
import {
  mediaAssets,
  premiumContent,
  premiumPlatformIntros,
  premiumPreviewConfigurations,
  premiumPreviewInvitations,
  premiumPreviewQuestions,
  premiumPreviewResponses,
  premiumTimelineSegments,
} from "@harborline/backend/schema";
import { getAccountIdentity } from "@/lib/auth";
import type { PlatformIntroPresentation } from "@/lib/njc-plus-timeline";
import { premiumPreviewQuestionInput, premiumTimelineSegmentInput } from "@/lib/njc-plus-contract";

export async function getContentTimeline(contentId: string) {
  if (!hasDatabase()) return [];
  const rows = await getDb().select().from(premiumTimelineSegments)
    .where(eq(premiumTimelineSegments.contentId, contentId))
    .orderBy(asc(premiumTimelineSegments.startMs), asc(premiumTimelineSegments.sortOrder));
  return rows.map((row) => ({ id: row.id, ...premiumTimelineSegmentInput.parse(row) }));
}

export async function getActivePlatformIntro(): Promise<PlatformIntroPresentation | null> {
  if (!hasDatabase()) return null;
  const [row] = await getDb().select({
    id: premiumPlatformIntros.id,
    title: premiumPlatformIntros.title,
    durationMs: premiumPlatformIntros.durationMs,
    blackGapMs: premiumPlatformIntros.blackGapMs,
    src: mediaAssets.blobUrl,
  }).from(premiumPlatformIntros)
    .innerJoin(mediaAssets, eq(mediaAssets.id, premiumPlatformIntros.mediaAssetId))
    .where(and(eq(premiumPlatformIntros.status, "active"), eq(mediaAssets.visibility, "public"), isNull(mediaAssets.deletedAt)))
    .limit(1);
  return row ?? null;
}

export async function getPlaybackPresentation(content: {
  id: string;
  isOriginal: boolean;
  globalIntroEnabled: boolean;
}) {
  const [contentSegments, platformIntro] = await Promise.all([
    getContentTimeline(content.id),
    content.isOriginal && content.globalIntroEnabled
      ? getActivePlatformIntro()
      : Promise.resolve(null),
  ]);
  return { contentSegments, platformIntro };
}

export async function getPreviewConfiguration(contentId: string) {
  if (!hasDatabase()) return null;
  const [configuration] = await getDb().select().from(premiumPreviewConfigurations)
    .where(eq(premiumPreviewConfigurations.contentId, contentId)).limit(1);
  if (!configuration) return null;
  const [invitations, questions, responses] = await Promise.all([
    getDb().select().from(premiumPreviewInvitations)
      .where(eq(premiumPreviewInvitations.previewId, configuration.id))
      .orderBy(desc(premiumPreviewInvitations.createdAt)),
    getDb().select().from(premiumPreviewQuestions)
      .where(eq(premiumPreviewQuestions.previewId, configuration.id))
      .orderBy(asc(premiumPreviewQuestions.sortOrder)),
    getDb().select().from(premiumPreviewResponses)
      .innerJoin(premiumPreviewInvitations, eq(premiumPreviewInvitations.id, premiumPreviewResponses.invitationId))
      .where(eq(premiumPreviewInvitations.previewId, configuration.id))
      .orderBy(desc(premiumPreviewResponses.submittedAt)),
  ]);
  return { configuration, invitations, questions, responses: responses.map((row) => row.premium_preview_responses) };
}

export async function getActivePreviewInvitation(contentId: string, suppliedClerkId?: string | null) {
  const clerkId = suppliedClerkId === undefined
    ? (await getAccountIdentity())?.clerkId ?? null
    : suppliedClerkId;
  if (!clerkId || !hasDatabase()) return null;
  const now = new Date();
  const [row] = await getDb().select({
    invitation: premiumPreviewInvitations,
    preview: premiumPreviewConfigurations,
  }).from(premiumPreviewInvitations)
    .innerJoin(premiumPreviewConfigurations, eq(premiumPreviewConfigurations.id, premiumPreviewInvitations.previewId))
    .where(and(
      eq(premiumPreviewConfigurations.contentId, contentId),
      eq(premiumPreviewConfigurations.enabled, true),
      eq(premiumPreviewInvitations.userClerkId, clerkId),
      or(
        eq(premiumPreviewInvitations.status, "invited"),
        eq(premiumPreviewInvitations.status, "viewing"),
        eq(premiumPreviewInvitations.status, "viewed"),
        eq(premiumPreviewInvitations.status, "feedback_submitted"),
      ),
      lte(premiumPreviewInvitations.startsAt, now),
      or(isNull(premiumPreviewInvitations.expiresAt), gt(premiumPreviewInvitations.expiresAt, now)),
      or(isNull(premiumPreviewConfigurations.opensAt), lte(premiumPreviewConfigurations.opensAt, now)),
      or(isNull(premiumPreviewConfigurations.expiresAt), gt(premiumPreviewConfigurations.expiresAt, now)),
    )).limit(1);
  return row ?? null;
}

export async function getAccessiblePreviewContentBySlug(slug: string) {
  if (!hasDatabase()) return null;
  const [content] = await getDb().select().from(premiumContent)
    .where(and(eq(premiumContent.slug, slug), isNull(premiumContent.archivedAt))).limit(1);
  if (!content || content.status === "published") return null;
  const access = await getActivePreviewInvitation(content.id);
  return access ? { content, access } : null;
}

export async function listAccountPreviews(clerkId: string) {
  if (!hasDatabase()) return [];
  const now = new Date();
  return getDb().select({
    content: premiumContent,
    invitation: premiumPreviewInvitations,
    preview: premiumPreviewConfigurations,
  }).from(premiumPreviewInvitations)
    .innerJoin(premiumPreviewConfigurations, eq(premiumPreviewConfigurations.id, premiumPreviewInvitations.previewId))
    .innerJoin(premiumContent, eq(premiumContent.id, premiumPreviewConfigurations.contentId))
    .where(and(
      eq(premiumPreviewInvitations.userClerkId, clerkId),
      isNull(premiumContent.archivedAt),
      ne(premiumContent.status, "published"),
      eq(premiumPreviewConfigurations.enabled, true),
      or(
        eq(premiumPreviewInvitations.status, "invited"),
        eq(premiumPreviewInvitations.status, "viewing"),
        eq(premiumPreviewInvitations.status, "viewed"),
        eq(premiumPreviewInvitations.status, "feedback_submitted"),
      ),
      lte(premiumPreviewInvitations.startsAt, now),
      or(isNull(premiumPreviewInvitations.expiresAt), gt(premiumPreviewInvitations.expiresAt, now)),
      or(isNull(premiumPreviewConfigurations.opensAt), lte(premiumPreviewConfigurations.opensAt, now)),
      or(isNull(premiumPreviewConfigurations.expiresAt), gt(premiumPreviewConfigurations.expiresAt, now)),
    )).orderBy(desc(premiumPreviewInvitations.updatedAt));
}

export async function getPreviewViewerDetails(previewId: string, invitationId: string) {
  if (!hasDatabase()) return null;
  const [preview, questions, response] = await Promise.all([
    getDb().select().from(premiumPreviewConfigurations).where(eq(premiumPreviewConfigurations.id, previewId)).limit(1),
    getDb().select().from(premiumPreviewQuestions).where(eq(premiumPreviewQuestions.previewId, previewId)).orderBy(asc(premiumPreviewQuestions.sortOrder)),
    getDb().select().from(premiumPreviewResponses).where(eq(premiumPreviewResponses.invitationId, invitationId)).limit(1),
  ]);
  return preview[0] ? { configuration: preview[0], questions: questions.map((question) => ({ id: question.id, ...premiumPreviewQuestionInput.parse(question) })), response: response[0] ?? null } : null;
}
