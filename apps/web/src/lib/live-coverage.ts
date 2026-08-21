import { and, asc, desc, eq, gt, inArray } from "drizzle-orm";
import { z } from "zod";
import { getDb, hasDatabase } from "@harborline/backend/db";
import {
  liveEvents,
  liveEventUpdates,
} from "@harborline/backend/schema";
import {
  liveCoverageStatuses,
  liveUpdateKinds,
  type LiveCoverageDetail,
  type LiveCoverageEvent,
  type LiveCoverageStatus,
  type LiveCoverageUpdate,
} from "@harborline/contracts";

const safeHttpsUrl = z
  .string()
  .trim()
  .max(2_000)
  .refine((value) => {
    if (!value) return true;
    try {
      return new URL(value).protocol === "https:";
    } catch {
      return false;
    }
  }, "Use a complete HTTPS URL or leave this blank");

export const liveEventCreateInput = z.object({
  title: z.string().trim().min(8).max(180),
  description: z.string().trim().min(20).max(1_200),
  location: z.string().trim().max(120).default(""),
  scheduledAt: z.iso.datetime().nullable().optional(),
  relatedStoryId: z.uuid().nullable().optional(),
});

export const liveEventUpdateInput = z.object({
  title: z.string().trim().min(8).max(180).optional(),
  description: z.string().trim().min(20).max(1_200).optional(),
  location: z.string().trim().max(120).nullable().optional(),
  streamUrl: safeHttpsUrl.nullable().optional(),
  heroImageUrl: safeHttpsUrl.nullable().optional(),
  heroImageAlt: z.string().trim().max(240).nullable().optional(),
  relatedStoryId: z.uuid().nullable().optional(),
  isFeatured: z.boolean().optional(),
  scheduledAt: z.iso.datetime().nullable().optional(),
  transition: z
    .enum(["schedule", "start", "pause", "resume", "end", "archive"])
    .optional(),
  confirmation: z.string().trim().max(80).optional(),
});

export const liveTimelineUpdateInput = z.object({
  kind: z.enum(liveUpdateKinds),
  headline: z.string().trim().max(180).nullable().optional(),
  body: z.string().trim().min(2).max(8_000),
  mediaUrl: safeHttpsUrl.nullable().optional(),
  mediaAlt: z.string().trim().max(240).nullable().optional(),
  sourceUrl: safeHttpsUrl.nullable().optional(),
  sourceLabel: z.string().trim().max(120).nullable().optional(),
  isPinned: z.boolean().default(false),
  publish: z.boolean().default(false),
});

export const liveTimelineRevisionInput = z.object({
  action: z.enum(["publish", "edit", "pin", "unpin", "retract"]),
  headline: z.string().trim().max(180).nullable().optional(),
  body: z.string().trim().min(2).max(8_000).optional(),
  kind: z.enum(liveUpdateKinds).optional(),
  reason: z.string().trim().min(8).max(500),
  confirmation: z.string().trim().max(80).optional(),
});

export function liveSlug(title: string) {
  const normalized = title
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90);
  return normalized || `live-${Date.now()}`;
}

export function normalizeLiveEvent(
  row: typeof liveEvents.$inferSelect,
  updateCount = 0,
  latestUpdateAt: Date | null = null,
): LiveCoverageEvent {
  const rawStatus = row.status as LiveCoverageStatus;
  const status = liveCoverageStatuses.includes(rawStatus)
    ? rawStatus
    : row.isLive
      ? "live"
      : row.endedAt
        ? "ended"
        : "draft";
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    description: row.description,
    status,
    location: row.location,
    streamUrl: row.streamUrl,
    heroImageUrl: row.heroImageUrl,
    heroImageAlt: row.heroImageAlt,
    relatedStoryId: row.relatedStoryId,
    isFeatured: row.isFeatured,
    scheduledAt: row.scheduledAt?.toISOString() ?? null,
    startedAt: row.startedAt?.toISOString() ?? null,
    endedAt: row.endedAt?.toISOString() ?? null,
    updatedAt: row.updatedAt.toISOString(),
    updateCount,
    latestUpdateAt: latestUpdateAt?.toISOString() ?? null,
  };
}

export function normalizeLiveUpdate(
  row: typeof liveEventUpdates.$inferSelect,
): LiveCoverageUpdate {
  return {
    id: row.id,
    kind: liveUpdateKinds.includes(row.kind as LiveCoverageUpdate["kind"])
      ? (row.kind as LiveCoverageUpdate["kind"])
      : "update",
    headline: row.headline,
    body: row.body,
    mediaUrl: row.mediaUrl,
    mediaAlt: row.mediaAlt,
    sourceUrl: row.sourceUrl,
    sourceLabel: row.sourceLabel,
    author: {
      name: row.authorSnapshot.name,
      role: row.authorSnapshot.role,
      initials: row.authorSnapshot.initials,
    },
    isPinned: row.isPinned,
    revision: row.revision,
    publishedAt: (row.publishedAt ?? row.createdAt).toISOString(),
    correctedAt: row.correctedAt?.toISOString() ?? null,
  };
}

const publicEventStatuses: LiveCoverageStatus[] = [
  "scheduled",
  "live",
  "paused",
  "ended",
  "archived",
];

export async function getPublicLiveEvents(limit = 24) {
  if (!hasDatabase()) return [] as LiveCoverageEvent[];
  const rows = await getDb()
    .select()
    .from(liveEvents)
    .where(inArray(liveEvents.status, publicEventStatuses))
    .orderBy(desc(liveEvents.isFeatured), desc(liveEvents.startedAt), desc(liveEvents.updatedAt))
    .limit(Math.min(Math.max(limit, 1), 100));

  if (!rows.length) return [];
  const updateRows = await getDb()
    .select({
      eventId: liveEventUpdates.eventId,
      publishedAt: liveEventUpdates.publishedAt,
    })
    .from(liveEventUpdates)
    .where(
      and(
        inArray(liveEventUpdates.eventId, rows.map((row) => row.id)),
        eq(liveEventUpdates.status, "published"),
      ),
    )
    .orderBy(desc(liveEventUpdates.publishedAt));
  const counts = new Map<string, number>();
  const latest = new Map<string, Date>();
  for (const update of updateRows) {
    counts.set(update.eventId, (counts.get(update.eventId) ?? 0) + 1);
    if (update.publishedAt && !latest.has(update.eventId)) {
      latest.set(update.eventId, update.publishedAt);
    }
  }
  return rows.map((row) =>
    normalizeLiveEvent(row, counts.get(row.id) ?? 0, latest.get(row.id) ?? null),
  );
}

export async function getPublicLiveEvent(
  slug: string,
  options?: { after?: Date },
): Promise<LiveCoverageDetail | null> {
  if (!hasDatabase()) return null;
  const [event] = await getDb()
    .select()
    .from(liveEvents)
    .where(
      and(
        eq(liveEvents.slug, slug),
        inArray(liveEvents.status, publicEventStatuses),
      ),
    )
    .limit(1);
  if (!event) return null;

  const publishedRows = await getDb()
    .select()
    .from(liveEventUpdates)
    .where(
      and(
        eq(liveEventUpdates.eventId, event.id),
        eq(liveEventUpdates.status, "published"),
      ),
    )
    .orderBy(asc(liveEventUpdates.publishedAt), asc(liveEventUpdates.createdAt))
    .limit(500);
  const changedRows = options?.after
    ? await getDb()
        .select()
        .from(liveEventUpdates)
        .where(
          and(
            eq(liveEventUpdates.eventId, event.id),
            inArray(liveEventUpdates.status, ["published", "retracted"]),
            gt(liveEventUpdates.updatedAt, options.after),
          ),
        )
        .orderBy(asc(liveEventUpdates.updatedAt), asc(liveEventUpdates.createdAt))
        .limit(500)
    : publishedRows;
  const latest = publishedRows.at(-1)?.publishedAt ?? null;
  return {
    ...normalizeLiveEvent(event, publishedRows.length, latest),
    updates: changedRows
      .filter((row) => row.status === "published")
      .map(normalizeLiveUpdate),
    removedUpdateIds: changedRows
      .filter((row) => row.status === "retracted")
      .map((row) => row.id),
  };
}

export async function getStudioLiveEvents() {
  if (!hasDatabase()) return [];
  const events = await getDb()
    .select()
    .from(liveEvents)
    .orderBy(desc(liveEvents.updatedAt))
    .limit(100);
  const updates = events.length
    ? await getDb()
        .select()
        .from(liveEventUpdates)
        .where(inArray(liveEventUpdates.eventId, events.map((event) => event.id)))
        .orderBy(desc(liveEventUpdates.createdAt))
        .limit(2_000)
    : [];
  const byEvent = new Map<string, typeof updates>();
  for (const update of updates) {
    byEvent.set(update.eventId, [...(byEvent.get(update.eventId) ?? []), update]);
  }
  return events.map((event) => ({
    event: normalizeLiveEvent(
      event,
      (byEvent.get(event.id) ?? []).filter((update) => update.status === "published").length,
      (byEvent.get(event.id) ?? []).find((update) => update.status === "published")?.publishedAt ?? null,
    ),
    updates: (byEvent.get(event.id) ?? []).map((update) => ({
      ...normalizeLiveUpdate(update),
      status: update.status as "draft" | "published" | "retracted",
      retractedAt: update.retractedAt?.toISOString() ?? null,
    })),
  }));
}

export function canWriteLiveCoverage(role: string) {
  return ["admin", "editor", "producer", "reporter"].includes(role);
}

export function canPublishLiveCoverage(role: string) {
  return ["admin", "editor", "producer"].includes(role);
}

export function nextLiveEventStatus(
  current: LiveCoverageStatus,
  transition: NonNullable<z.infer<typeof liveEventUpdateInput>["transition"]>,
) {
  const transitions: Record<LiveCoverageStatus, Partial<Record<typeof transition, LiveCoverageStatus>>> = {
    draft: { schedule: "scheduled", start: "live", archive: "archived" },
    scheduled: { start: "live", archive: "archived" },
    live: { pause: "paused", end: "ended" },
    paused: { resume: "live", end: "ended" },
    ended: { archive: "archived" },
    archived: {},
  };
  return transitions[current]?.[transition] ?? null;
}
