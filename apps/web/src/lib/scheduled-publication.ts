import "server-only";

import { and, eq, inArray, isNull, lt, lte, or, sql } from "drizzle-orm";
import { getDb, hasDatabase } from "@harborline/backend/db";
import {
  stories,
  storyApprovals,
  storyPublicationJobs,
  users,
} from "@harborline/backend/schema";
import { validateSavedPublicByline } from "@/lib/bylines";
import { getSiteConfiguration } from "@/lib/site-settings";
import {
  storyContentHash,
  storyPublicationBlockers,
} from "@/lib/story-content-integrity";

export type ScheduledPublicationResult = {
  id: string;
  slug: string;
  categorySlug: string;
  outcome: "published" | "blocked" | "failed";
  reason?: string;
};

/**
 * Claims and resolves each due publication job transactionally. The job row,
 * approval and current story hash are checked on every attempt, which makes
 * retries and concurrent workers safe. A delayed worker may publish overdue
 * eligible work once, but never publishes early or bypasses a changed byline.
 */
export async function publishDueStories(now = new Date()) {
  if (!hasDatabase()) return [];
  const configuration = await getSiteConfiguration();
  if (!configuration.studio.automations.scheduledPublishing) return [];

  const due = await getDb()
    .select({ id: storyPublicationJobs.id })
    .from(storyPublicationJobs)
    .where(
      and(
        or(
          eq(storyPublicationJobs.status, "queued"),
          and(
            eq(storyPublicationJobs.status, "failed"),
            lt(storyPublicationJobs.attemptCount, 5),
            or(
              isNull(storyPublicationJobs.lastAttemptAt),
              lte(storyPublicationJobs.lastAttemptAt, new Date(now.getTime() - 5 * 60_000)),
            ),
          ),
        ),
        lte(storyPublicationJobs.scheduledAt, now),
      ),
    )
    .limit(50);

  const results: ScheduledPublicationResult[] = [];
  for (const candidate of due) {
    try {
      const result = await getDb().transaction(async (tx) => {
        const [job] = await tx
          .update(storyPublicationJobs)
          .set({
            status: "publishing",
            attemptCount: sql`${storyPublicationJobs.attemptCount} + 1`,
            lastAttemptAt: now,
            updatedAt: now,
          })
          .where(
            and(
              eq(storyPublicationJobs.id, candidate.id),
              inArray(storyPublicationJobs.status, ["queued", "failed"]),
              lte(storyPublicationJobs.scheduledAt, now),
            ),
          )
          .returning();
        if (!job) return null;

        const [story] = await tx
          .select()
          .from(stories)
          .where(eq(stories.id, job.storyId))
          .limit(1);
        const [approval] = await tx
          .select()
          .from(storyApprovals)
          .where(eq(storyApprovals.id, job.approvalId))
          .limit(1);

        let reason = "";
        if (!story || story.status !== "scheduled") reason = "story_not_scheduled";
        else if (!approval || approval.invalidatedAt) reason = "approval_invalid";
        else if (approval.storyId !== story.id) reason = "approval_story_mismatch";
        else if (approval.contentVersion !== story.contentVersion) reason = "revision_changed";
        else {
          const currentHash = storyContentHash(story);
          if (currentHash !== approval.contentHash || currentHash !== job.contentHash) {
            reason = "content_hash_changed";
          }
        }
        if (!reason && story) {
          const blockers = storyPublicationBlockers(story);
          if (blockers.length) reason = blockers.join(",");
        }
        if (!reason && story) {
          const savedBylines = story.publicBylinesSnapshot.length
            ? story.publicBylinesSnapshot
            : story.authorId && story.publicBylineSnapshot
              ? [{ userId: story.authorId, ...story.publicBylineSnapshot }]
              : [];
          const authorIds = savedBylines.map((byline) => byline.userId);
          const owners = authorIds.length
            ? await tx.select().from(users).where(inArray(users.id, authorIds))
            : [];
          const ownerById = new Map(owners.map((owner) => [owner.id, owner]));

          for (const byline of savedBylines) {
            const owner = ownerById.get(byline.userId);
            if (!owner?.isActive) {
              reason = "author_unavailable";
              break;
            }
            if (
              byline.mode === "pseudonym" &&
              (!configuration.features.pseudonyms ||
                !configuration.studio.editorialWorkflow.pseudonymEligibleRoles.includes(owner.role) ||
                !validateSavedPublicByline(owner, byline))
            ) {
              reason = "pseudonym_changed_or_moderated";
              break;
            }
          }
        }

        if (reason || !story) {
          await tx
            .update(storyPublicationJobs)
            .set({
              status: "blocked",
              lastErrorCode: reason || "story_missing",
              lastErrorMessage:
                "Automatic publication was held because the approved story no longer matches its verified publication state.",
              updatedAt: now,
            })
            .where(eq(storyPublicationJobs.id, job.id));
          if (story) {
            await tx
              .update(stories)
              .set({ status: "review", scheduledAt: null, updatedAt: now })
              .where(and(eq(stories.id, story.id), eq(stories.status, "scheduled")));
          }
          return story
            ? { id: story.id, slug: story.slug, categorySlug: story.categorySlug, outcome: "blocked" as const, reason }
            : null;
        }

        const [published] = await tx
          .update(stories)
          .set({ status: "published", publishedAt: now, updatedAt: now })
          .where(and(eq(stories.id, story.id), eq(stories.status, "scheduled")))
          .returning({ id: stories.id, slug: stories.slug, categorySlug: stories.categorySlug });
        if (!published) throw new Error("story_transition_conflict");
        await tx
          .update(storyPublicationJobs)
          .set({
            status: "published",
            publishedAt: now,
            lastErrorCode: null,
            lastErrorMessage: null,
            updatedAt: now,
          })
          .where(eq(storyPublicationJobs.id, job.id));
        return { ...published, outcome: "published" as const };
      });
      if (result) results.push(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : "unknown_worker_error";
      await getDb()
        .update(storyPublicationJobs)
        .set({
          status: "failed",
          lastErrorCode: "worker_failure",
          lastErrorMessage: message.slice(0, 500),
          lastAttemptAt: now,
          updatedAt: now,
        })
        .where(eq(storyPublicationJobs.id, candidate.id));
      results.push({ id: candidate.id, slug: "", categorySlug: "", outcome: "failed", reason: message });
    }
  }
  return results;
}
