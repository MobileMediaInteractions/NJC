import { and, asc, desc, eq, gte, inArray, isNotNull, lte, sql } from "drizzle-orm";
import { getDb, hasDatabase } from "@harborline/backend/db";
import {
  analyticsDailyViews,
  analyticsPeriodArchives,
  stories,
  type AnalyticsPathView,
  type AnalyticsStoryView,
} from "@harborline/backend/schema";

export type AnalyticsPeriod = "week" | "month" | "year";

export type AnalyticsArchive = {
  id: string;
  period: AnalyticsPeriod;
  periodStart: string;
  periodEnd: string;
  totalViews: number;
  storyViews: AnalyticsStoryView[];
  pathViews: AnalyticsPathView[];
  generatedAt: string;
};

export type StoryTrafficMetric = AnalyticsStoryView & {
  views7d: number;
  views30d: number;
};

export type TrafficAnalyticsSummary = {
  database: "connected" | "not configured";
  generatedAt: string;
  totals: {
    siteViews: number;
    storyViews: number;
    views7d: number;
    views30d: number;
  };
  topStory: StoryTrafficMetric | null;
  stories: StoryTrafficMetric[];
  daily: Array<{ day: string; views: number }>;
  archives: Record<AnalyticsPeriod, AnalyticsArchive[]>;
};

export type AnalyticsPeriodRange = {
  period: AnalyticsPeriod;
  periodStart: string;
  periodEnd: string;
};

const excludedPrefixes = [
  "/api",
  "/studio",
  "/sign-in",
  "/sign-up",
  "/employee-link",
  "/_next",
] as const;

function dateFromKey(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function dateKey(value: Date) {
  return value.toISOString().slice(0, 10);
}

function addUtcDays(value: Date, amount: number) {
  const next = new Date(value);
  next.setUTCDate(next.getUTCDate() + amount);
  return next;
}

function startOfPeriod(period: AnalyticsPeriod, value: Date) {
  if (period === "week") {
    const weekdayFromMonday = (value.getUTCDay() + 6) % 7;
    return addUtcDays(value, -weekdayFromMonday);
  }
  if (period === "month") return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), 1));
  return new Date(Date.UTC(value.getUTCFullYear(), 0, 1));
}

function nextPeriod(period: AnalyticsPeriod, value: Date) {
  if (period === "week") return addUtcDays(value, 7);
  if (period === "month") return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth() + 1, 1));
  return new Date(Date.UTC(value.getUTCFullYear() + 1, 0, 1));
}

export function publicationDay(value = new Date(), timeZone = "America/New_York") {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(value);
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}

export function normalizeAnalyticsPathname(value: string) {
  if (!value.startsWith("/") || value.startsWith("//") || value.length > 500) return null;
  let pathname: string;
  try {
    pathname = new URL(value, "https://www.thejerseycourier.com").pathname;
    decodeURI(pathname);
  } catch {
    return null;
  }
  pathname = pathname.replace(/\/{2,}/g, "/");
  if (pathname.length > 1) pathname = pathname.replace(/\/$/, "");
  if (excludedPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))) return null;
  return pathname;
}

export function completedAnalyticsPeriods(earliestDay: string, today: string): AnalyticsPeriodRange[] {
  const earliest = dateFromKey(earliestDay);
  const currentDay = dateFromKey(today);
  if (!earliest || !currentDay || earliest >= currentDay) return [];
  const ranges: AnalyticsPeriodRange[] = [];
  for (const period of ["week", "month", "year"] as const) {
    const currentStart = startOfPeriod(period, currentDay);
    let cursor = startOfPeriod(period, earliest);
    while (cursor < currentStart) {
      const next = nextPeriod(period, cursor);
      ranges.push({
        period,
        periodStart: dateKey(cursor),
        periodEnd: dateKey(addUtcDays(next, -1)),
      });
      cursor = next;
    }
  }
  return ranges;
}

function emptySummary(): TrafficAnalyticsSummary {
  return {
    database: "not configured",
    generatedAt: new Date().toISOString(),
    totals: { siteViews: 0, storyViews: 0, views7d: 0, views30d: 0 },
    topStory: null,
    stories: [],
    daily: [],
    archives: { week: [], month: [], year: [] },
  };
}

export async function recordPageView(pathnameValue: string, now = new Date()) {
  const pathname = normalizeAnalyticsPathname(pathnameValue);
  if (!pathname || !hasDatabase()) return { recorded: false as const, reason: pathname ? "database" : "pathname" };

  const db = getDb();
  const storyMatch = /^\/story\/([^/]+)$/.exec(pathname);
  let slug: string | null = null;
  if (storyMatch) {
    try {
      slug = decodeURIComponent(storyMatch[1]);
    } catch {
      return { recorded: false as const, reason: "pathname" };
    }
  }
  const [story] = slug
    ? await db
        .select({ id: stories.id, slug: stories.slug, headline: stories.headline })
        .from(stories)
        .where(and(eq(stories.slug, slug), eq(stories.status, "published")))
        .limit(1)
    : [];
  const day = publicationDay(now);

  await db
    .insert(analyticsDailyViews)
    .values({
      day,
      pathname,
      storyId: story?.id ?? null,
      storySlug: story?.slug ?? null,
      storyHeadline: story?.headline ?? null,
      views: 1,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: [analyticsDailyViews.day, analyticsDailyViews.pathname],
      set: {
        storyId: story?.id ?? null,
        storySlug: story?.slug ?? null,
        storyHeadline: story?.headline ?? null,
        views: sql`${analyticsDailyViews.views} + 1`,
        updatedAt: now,
      },
    });
  return { recorded: true as const, day, pathname, storySlug: story?.slug ?? null };
}

async function createPeriodArchive(range: AnalyticsPeriodRange) {
  const db = getDb();
  const rows = await db
    .select({
      pathname: analyticsDailyViews.pathname,
      storyId: analyticsDailyViews.storyId,
      storySlug: analyticsDailyViews.storySlug,
      storyHeadline: analyticsDailyViews.storyHeadline,
      views: analyticsDailyViews.views,
      day: analyticsDailyViews.day,
    })
    .from(analyticsDailyViews)
    .where(and(gte(analyticsDailyViews.day, range.periodStart), lte(analyticsDailyViews.day, range.periodEnd)))
    .orderBy(asc(analyticsDailyViews.day));

  const paths = new Map<string, number>();
  const storyMetrics = new Map<string, AnalyticsStoryView>();
  let totalViews = 0;
  for (const row of rows) {
    totalViews += row.views;
    paths.set(row.pathname, (paths.get(row.pathname) ?? 0) + row.views);
    if (!row.storySlug) continue;
    const current = storyMetrics.get(row.storySlug);
    storyMetrics.set(row.storySlug, {
      storyId: row.storyId ?? current?.storyId ?? null,
      slug: row.storySlug,
      headline: row.storyHeadline ?? current?.headline ?? row.storySlug,
      views: (current?.views ?? 0) + row.views,
    });
  }
  const storyViews = [...storyMetrics.values()].sort((a, b) => b.views - a.views || a.headline.localeCompare(b.headline));
  const pathViews = [...paths].map(([pathname, views]) => ({ pathname, views })).sort((a, b) => b.views - a.views || a.pathname.localeCompare(b.pathname));

  await db
    .insert(analyticsPeriodArchives)
    .values({ ...range, totalViews, storyViews, pathViews, generatedAt: new Date() })
    .onConflictDoUpdate({
      target: [analyticsPeriodArchives.period, analyticsPeriodArchives.periodStart],
      set: { periodEnd: range.periodEnd, totalViews, storyViews, pathViews, generatedAt: new Date() },
    });
}

export async function refreshAnalyticsArchives(now = new Date()) {
  if (!hasDatabase()) return { created: 0, database: "not configured" as const };
  const db = getDb();
  const [[first], existing] = await Promise.all([
    db.select({ day: sql<string | null>`min(${analyticsDailyViews.day})` }).from(analyticsDailyViews),
    db.select({ period: analyticsPeriodArchives.period, periodStart: analyticsPeriodArchives.periodStart }).from(analyticsPeriodArchives),
  ]);
  if (!first?.day) return { created: 0, database: "connected" as const };
  const existingKeys = new Set(existing.map((item) => `${item.period}:${item.periodStart}`));
  const missing = completedAnalyticsPeriods(first.day, publicationDay(now)).filter(
    (range) => !existingKeys.has(`${range.period}:${range.periodStart}`),
  );
  for (const range of missing) await createPeriodArchive(range);
  return { created: missing.length, database: "connected" as const };
}

export async function getTrafficAnalyticsSummary(now = new Date()): Promise<TrafficAnalyticsSummary> {
  if (!hasDatabase()) return emptySummary();
  const db = getDb();
  const today = publicationDay(now);
  const todayDate = dateFromKey(today) ?? new Date();
  const since7d = dateKey(addUtcDays(todayDate, -6));
  const since30d = dateKey(addUtcDays(todayDate, -29));

  const [[total], [storyTotal], [recent], dailyRows, storyRows, archiveRows] = await Promise.all([
    db.select({ views: sql<number>`coalesce(sum(${analyticsDailyViews.views}), 0)::int` }).from(analyticsDailyViews),
    db.select({ views: sql<number>`coalesce(sum(${analyticsDailyViews.views}), 0)::int` }).from(analyticsDailyViews).where(isNotNull(analyticsDailyViews.storySlug)),
    db.select({
      views7d: sql<number>`coalesce(sum(${analyticsDailyViews.views}) filter (where ${analyticsDailyViews.day} >= ${since7d}), 0)::int`,
      views30d: sql<number>`coalesce(sum(${analyticsDailyViews.views}) filter (where ${analyticsDailyViews.day} >= ${since30d}), 0)::int`,
    }).from(analyticsDailyViews),
    db.select({ day: analyticsDailyViews.day, views: sql<number>`sum(${analyticsDailyViews.views})::int` })
      .from(analyticsDailyViews)
      .where(gte(analyticsDailyViews.day, since30d))
      .groupBy(analyticsDailyViews.day)
      .orderBy(asc(analyticsDailyViews.day)),
    db.select({
      slug: stories.slug,
      storyId: stories.id,
      headline: stories.headline,
      views: sql<number>`coalesce(sum(${analyticsDailyViews.views}), 0)::int`,
      views7d: sql<number>`coalesce(sum(${analyticsDailyViews.views}) filter (where ${analyticsDailyViews.day} >= ${since7d}), 0)::int`,
      views30d: sql<number>`coalesce(sum(${analyticsDailyViews.views}) filter (where ${analyticsDailyViews.day} >= ${since30d}), 0)::int`,
    })
      .from(stories)
      .leftJoin(analyticsDailyViews, eq(analyticsDailyViews.storySlug, stories.slug))
      .where(inArray(stories.status, ["published", "archived"]))
      .groupBy(stories.id, stories.slug, stories.headline)
      .orderBy(desc(sql`coalesce(sum(${analyticsDailyViews.views}), 0)`), asc(stories.headline)),
    db.select().from(analyticsPeriodArchives).orderBy(desc(analyticsPeriodArchives.periodStart)).limit(500),
  ]);

  const dailyMap = new Map(dailyRows.map((item) => [item.day, item.views]));
  const daily = Array.from({ length: 30 }, (_, index) => {
    const day = dateKey(addUtcDays(todayDate, index - 29));
    return { day, views: dailyMap.get(day) ?? 0 };
  });
  const storyMetrics: StoryTrafficMetric[] = storyRows.flatMap((row) => row.slug ? [{
    storyId: row.storyId,
    slug: row.slug,
    headline: row.headline,
    views: row.views,
    views7d: row.views7d,
    views30d: row.views30d,
  }] : []);
  const archives: TrafficAnalyticsSummary["archives"] = { week: [], month: [], year: [] };
  for (const row of archiveRows) {
    if (!(["week", "month", "year"] as const).includes(row.period as AnalyticsPeriod)) continue;
    const period = row.period as AnalyticsPeriod;
    archives[period].push({
      id: row.id,
      period,
      periodStart: row.periodStart,
      periodEnd: row.periodEnd,
      totalViews: row.totalViews,
      storyViews: row.storyViews,
      pathViews: row.pathViews,
      generatedAt: row.generatedAt.toISOString(),
    });
  }

  return {
    database: "connected",
    generatedAt: now.toISOString(),
    totals: {
      siteViews: total?.views ?? 0,
      storyViews: storyTotal?.views ?? 0,
      views7d: recent?.views7d ?? 0,
      views30d: recent?.views30d ?? 0,
    },
    topStory: storyMetrics[0]?.views ? storyMetrics[0] : null,
    stories: storyMetrics,
    daily,
    archives,
  };
}
