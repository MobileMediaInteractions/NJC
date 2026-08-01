import { and, eq, isNull } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb, hasDatabase } from "@harborline/backend/db";
import { pseudonymModerationEvents, stories, storyApprovals, storyPublicationJobs, users } from "@harborline/backend/schema";
import { writeApiAudit } from "@/lib/api-keys";
import { getStudioUser } from "@/lib/auth";

const inputSchema = z.object({
  action: z.enum(["disable", "restore", "require_correction"]),
  reason: z.string().trim().min(12).max(500),
});

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const viewer = await getStudioUser();
  if (!viewer || viewer.role !== "admin") return NextResponse.json({ error: { code: "forbidden", message: "Administrator access is required" } }, { status: 403 });
  if (!hasDatabase()) return NextResponse.json({ error: { code: "service_not_configured", message: "Postgres is required" } }, { status: 503 });
  const parsed = inputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: { code: "invalid_request", message: "Choose an action and provide an audit reason of at least 12 characters" } }, { status: 400 });
  const { id } = await context.params;
  const [target] = await getDb().select().from(users).where(eq(users.clerkId, id)).limit(1);
  if (!target) return NextResponse.json({ error: { code: "not_found", message: "Newsroom profile not found" } }, { status: 404 });
  const nextStatus = parsed.data.action === "restore" ? "active" : parsed.data.action === "disable" ? "disabled" : "correction_required";
  const now = new Date();
  await getDb().transaction(async (tx) => {
    await tx.update(users).set({ pseudonymEnabled: nextStatus === "active", pseudonymModerationStatus: nextStatus, pseudonymModerationReason: parsed.data.reason, pseudonymModeratedByClerkId: viewer.id, pseudonymModeratedAt: now, updatedAt: now }).where(eq(users.id, target.id));
    await tx.insert(pseudonymModerationEvents).values({ userId: target.id, actorClerkId: viewer.id, action: parsed.data.action, reason: parsed.data.reason, previousStatus: target.pseudonymModerationStatus, nextStatus, pseudonymRevision: target.pseudonymRevision });
    if (nextStatus !== "active") {
      const affected = await tx.select({ id: stories.id }).from(stories).where(and(eq(stories.authorId, target.id), eq(stories.status, "scheduled")));
      for (const story of affected) {
        await tx.update(storyApprovals).set({ invalidatedAt: now, invalidatedByClerkId: viewer.id, invalidationReason: "Pseudonym was moderated before publication" }).where(and(eq(storyApprovals.storyId, story.id), isNull(storyApprovals.invalidatedAt)));
        await tx.update(storyPublicationJobs).set({ status: "blocked", lastErrorCode: "pseudonym_moderated", lastErrorMessage: "The scheduled byline requires editorial review.", updatedByClerkId: viewer.id, updatedAt: now }).where(and(eq(storyPublicationJobs.storyId, story.id), eq(storyPublicationJobs.status, "queued")));
        await tx.update(stories).set({ status: "review", scheduledAt: null, updatedAt: now }).where(eq(stories.id, story.id));
      }
    }
  });
  await writeApiAudit({ actorClerkId: viewer.id, event: `pseudonym.${parsed.data.action}`, request, metadata: { targetClerkId: id, targetUserId: target.id, reason: parsed.data.reason, previousStatus: target.pseudonymModerationStatus, nextStatus } });
  return NextResponse.json({ data: { status: nextStatus, moderatedAt: now.toISOString() }, meta: { apiVersion: "1" } });
}
