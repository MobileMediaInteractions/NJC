import { and, asc, desc, eq, inArray, isNull } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb, hasDatabase } from "@harborline/backend/db";
import { stories, storyApprovals, storyAuthors, storyPublicationJobs, storyRevisions, users } from "@harborline/backend/schema";
import { writeApiAudit } from "@/lib/api-keys";
import { getStudioUser } from "@/lib/auth";
import { buildPublicBylineSnapshot } from "@/lib/bylines";
import { getSiteConfiguration } from "@/lib/site-settings";
import { canPublishStory } from "@/lib/story-workflow";

const inputSchema = z.object({ authors: z.array(z.object({ userId: z.uuid(), mode: z.enum(["account", "pseudonym"]) })).min(1).max(8) }).refine((value) => new Set(value.authors.map((author) => author.userId)).size === value.authors.length, "Authors must be unique");

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const viewer = await getStudioUser();
  if (!viewer) return NextResponse.json({ error: { code: "unauthorized", message: "Newsroom sign-in required" } }, { status: 401 });
  const { id } = await context.params;
  const rows = await getDb().select({ userId: storyAuthors.userId, position: storyAuthors.position, mode: storyAuthors.bylineMode, name: users.displayName }).from(storyAuthors).innerJoin(users, eq(users.id, storyAuthors.userId)).where(eq(storyAuthors.storyId, id)).orderBy(asc(storyAuthors.position));
  return NextResponse.json({ data: rows, meta: { apiVersion: "1" } });
}

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  const viewer = await getStudioUser();
  if (!viewer) return NextResponse.json({ error: { code: "unauthorized", message: "Newsroom sign-in required" } }, { status: 401 });
  if (!hasDatabase()) return NextResponse.json({ error: { code: "service_not_configured", message: "Postgres is required" } }, { status: 503 });
  const parsed = inputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: { code: "invalid_request", message: "Choose one to eight unique newsroom accounts" } }, { status: 400 });
  if (parsed.data.authors.some((author) => author.mode === "pseudonym" && author.userId !== viewer.databaseId)) return NextResponse.json({ error: { code: "pseudonym_consent_required", message: "You cannot select another person’s pseudonym. Add their verified account byline; they can opt in themselves." } }, { status: 403 });
  const configuration = await getSiteConfiguration();
  if (
    parsed.data.authors.some((author) => author.mode === "pseudonym") &&
    (!configuration.features.pseudonyms ||
      !configuration.studio.editorialWorkflow.pseudonymEligibleRoles.includes(viewer.role))
  ) {
    return NextResponse.json({ error: { code: "feature_disabled", message: "Pseudonymous bylines are not available for this role." } }, { status: 409 });
  }
  const { id } = await context.params;
  const [current] = await getDb().select().from(stories).where(eq(stories.id, id)).limit(1);
  if (!current || current.status === "published") return NextResponse.json({ error: { code: "story_locked", message: "Collaborative bylines must be finalized before publication" } }, { status: 409 });
  const existingAuthors = await getDb()
    .select({ userId: storyAuthors.userId, mode: storyAuthors.bylineMode })
    .from(storyAuthors)
    .where(eq(storyAuthors.storyId, current.id))
    .orderBy(asc(storyAuthors.position));
  const currentAuthors = existingAuthors.length
    ? existingAuthors
    : current.authorId
      ? [{ userId: current.authorId, mode: current.publicBylineSnapshot?.mode ?? "account" }]
      : [];
  if (!canPublishStory(viewer.role)) {
    const preservesPeopleAndOrder =
      parsed.data.authors.length === currentAuthors.length &&
      parsed.data.authors.every((author, index) => author.userId === currentAuthors[index]?.userId);
    const changesOnlyViewer = parsed.data.authors.every(
      (author, index) => author.userId === viewer.databaseId || author.mode === currentAuthors[index]?.mode,
    );
    if (!viewer.databaseId || !currentAuthors.some((author) => author.userId === viewer.databaseId) || !preservesPeopleAndOrder || !changesOnlyViewer) {
      return NextResponse.json({ error: { code: "forbidden", message: "Only a publisher may reassign or reorder authors. You may change only your own public byline." } }, { status: 403 });
    }
  }
  const authorIds = parsed.data.authors.map((author) => author.userId);
  const records = await getDb().select().from(users).where(and(inArray(users.id, authorIds), eq(users.isActive, true)));
  if (records.length !== authorIds.length) return NextResponse.json({ error: { code: "author_unavailable", message: "Every selected author must have an active newsroom account" } }, { status: 409 });
  const byId = new Map(records.map((record) => [record.id, record]));
  const snapshots = parsed.data.authors.map((author) => ({ userId: author.userId, ...buildPublicBylineSnapshot(byId.get(author.userId)!, author.mode) }));
  const primary = byId.get(authorIds[0]!)!;
  const now = new Date();
  const updated = await getDb().transaction(async (tx) => {
    await tx.delete(storyAuthors).where(eq(storyAuthors.storyId, current.id));
    await tx.insert(storyAuthors).values(parsed.data.authors.map((author, position) => ({ storyId: current.id, userId: author.userId, position, bylineMode: author.mode, addedByClerkId: viewer.id })));
    await tx.update(storyApprovals).set({ invalidatedAt: now, invalidatedByClerkId: viewer.id, invalidationReason: "Story authors or public byline changed" }).where(and(eq(storyApprovals.storyId, current.id), isNull(storyApprovals.invalidatedAt)));
    await tx.update(storyPublicationJobs).set({ status: "cancelled", cancelledAt: now, updatedByClerkId: viewer.id, updatedAt: now }).where(and(eq(storyPublicationJobs.storyId, current.id), inArray(storyPublicationJobs.status, ["queued", "blocked", "failed"])));
    const [story] = await tx.update(stories).set({ authorId: primary.id, authorSnapshot: { id: primary.clerkId, name: primary.displayName, role: primary.role, initials: snapshots[0]!.initials, ...(primary.avatarUrl ? { avatar: primary.avatarUrl } : {}) }, publicBylineSnapshot: snapshots[0]!, publicBylinesSnapshot: snapshots, contentVersion: current.contentVersion + 1, contentHash: null, status: "draft", scheduledAt: null, updatedAt: now }).where(eq(stories.id, current.id)).returning();
    const [latest] = await tx.select({ version: storyRevisions.version }).from(storyRevisions).where(eq(storyRevisions.storyId, current.id)).orderBy(desc(storyRevisions.version)).limit(1);
    await tx.insert(storyRevisions).values({ storyId: current.id, editorId: viewer.databaseId ?? null, version: (latest?.version ?? 0) + 1, snapshot: story, note: "Ownership or collaborative byline changed; approval invalidated", reviewStatus: "applied" });
    return story;
  });
  await writeApiAudit({ actorClerkId: viewer.id, event: "story.authors_updated", request, metadata: { storyId: current.id, previousAuthorId: current.authorId, authorIds } });
  return NextResponse.json({ data: updated, meta: { apiVersion: "1" } });
}
