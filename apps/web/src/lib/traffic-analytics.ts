import { and, asc, desc, eq, gte, inArray, isNotNull, lte, sql } from "drizzle-orm";
import { getDb, hasDatabase } from "@harborline/backend/db";
import {
  analyticsDailyViews,
  analyticsPeriodArchives,
  stories,
  type AnalyticsDeviceView,
  type AnalyticsPathView,
  type AnalyticsSourceView,
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
  sourceViews: AnalyticsSourceView[];
  deviceViews: AnalyticsDeviceView[];
  generatedAt: string;
};

export type StoryTrafficMetric = AnalyticsStoryView & {
  views7d: number;
  views30d: number;
};

export type TrafficSourceMetric = AnalyticsSourceView & {
  label: string;
  share: number;
};

export type TrafficDeviceMetric = AnalyticsDeviceView & {
  label: string;
  share: number;
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
  sources: TrafficSourceMetric[];
  devices: TrafficDeviceMetric[];
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

const sourceLabels: Record<string, string> = {
  direct: "Direct or unknown",
  google: "Google",
  bing: "Bing",
  x: "X / Twitter",
  facebook: "Facebook",
  instagram: "Instagram",
  linkedin: "LinkedIn",
  reddit: "Reddit",
  youtube: "YouTube",
  email: "Email or newsletter",
  internal: "Courier internal",
  other: "Other websites",
  unknown: "Legacy traffic",
};

const deviceLabels: Record<string, string> = {
  desktop: "Desktop / laptop",
  mobile: "Mobile phone",
  tablet: "Tablet",
  tv: "Smart TV",
  unknown: "Unknown device",
};

function sourceFromValue(value: string) {
  const normalized = value.trim().toLowerCase().replace(/^@/, "").replace(/[._\s-]+/g, "");
  if (["x", "twitter", "twittercom", "tco"].includes(normalized)) return "x";
  if (["facebook", "fb", "facebookcom"].includes(normalized)) return "facebook";
  if (["instagram", "ig", "instagramcom"].includes(normalized)) return "instagram";
  if (["google", "googlecom", "googlenews"].includes(normalized)) return "google";
  if (["bing", "bingcom"].includes(normalized)) return "bing";
  if (["linkedin", "linkedincom"].includes(normalized)) return "linkedin";
  if (["reddit", "redditcom"].includes(normalized)) return "reddit";
  if (["youtube", "youtubecom", "youtu", "youtu.be"].includes(normalized)) return "youtube";
  if (["email", "newsletter", "mail", "substack"].includes(normalized)) return "email";
  return null;
}

export function classifyTrafficSource(referrerValue?: string | null, sourceHint?: string | null, siteOrigin?: string | null) {
  const hinted = sourceHint ? sourceFromValue(sourceHint) : null;
  if (hinted) return hinted;
  if (!referrerValue) return "direct";
  let referrer: URL;
  try {
    referrer = new URL(referrerValue);
  } catch {
    return "direct";
  }
  const host = referrer.hostname.toLowerCase().replace(/^www\./, "");
  let siteHost: string | null = null;
  try {
    siteHost = siteOrigin ? new URL(siteOrigin).hostname.toLowerCase().replace(/^www\./, "") : null;
  } catch {
    siteHost = null;
  }
  if (siteHost && host === siteHost) return "internal";
  if (["thejerseycourier.com", "njc-web.vercel.app"].includes(host)) return "internal";
  if (host === "mail.google.com" || host.endsWith(".mail.yahoo.com") || host === "outlook.live.com") return "email";
  if (host === "t.co" || host === "x.com" || host.endsWith(".x.com") || host === "twitter.com" || host.endsWith(".twitter.com")) return "x";
  if (host === "facebook.com" || host.endsWith(".facebook.com") || host === "fb.com" || host.endsWith(".fb.com")) return "facebook";
  if (host === "instagram.com" || host.endsWith(".instagram.com")) return "instagram";
  if (host === "linkedin.com" || host.endsWith(".linkedin.com") || host === "lnkd.in") return "linkedin";
  if (host === "reddit.com" || host.endsWith(".reddit.com") || host === "redd.it") return "reddit";
  if (host === "youtube.com" || host.endsWith(".youtube.com") || host === "youtu.be") return "youtube";
  if (host === "google.com" || host.endsWith(".google.com") || /(^|\.)google\.[a-z.]+$/.test(host)) return "google";
  if (host === "bing.com" || host.endsWith(".bing.com")) return "bing";
  return "other";
}

export function classifyDevicePlatform(userAgentValue?: string | null, mobileHint?: string | null) {
  const userAgent = userAgentValue ?? "";
  if (/smart-tv|smarttv|hbbtv|googletv|appletv|roku|crkey|aft[a-z0-9]* build|netcast|webos|tizen/i.test(userAgent)) return "tv";
  if (/ipad|tablet|kindle|silk/i.test(userAgent) || (/android/i.test(userAgent) && !/mobile/i.test(userAgent))) return "tablet";
  if (mobileHint === "?1" || /iphone|ipod|android.*mobile|windows phone|blackberry|opera mini|mobile/i.test(userAgent)) return "mobile";
  return userAgent ? "desktop" : "unknown";
}

export function trafficSourceLabel(value: string) {
  return sourceLabels[value] ?? sourceLabels.other;
}

export function trafficDeviceLabel(value: string) {
  return deviceLabels[value] ?? deviceLabels.unknown;
}

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
    sources: [],
    devices: [],
    archives: { week: [], month: [], year: [] },
  };
}

export async function recordPageView(input: {
  pathname: string;
  referrer?: string | null;
  sourceHint?: string | null;
  isEntry?: boolean;
  userAgent?: string | null;
  mobileHint?: string | null;
  siteOrigin?: string | null;
}, now = new Date()) {
  const pathname = normalizeAnalyticsPathname(input.pathname);
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
  const trafficSource = classifyTrafficSource(input.referrer, input.sourceHint, input.siteOrigin);
  const devicePlatform = classifyDevicePlatform(input.userAgent, input.mobileHint);
  const entries = input.isEntry ? 1 : 0;

  await db
    .insert(analyticsDailyViews)
    .values({
      day,
      pathname,
      storyId: story?.id ?? null,
      storySlug: story?.slug ?? null,
      storyHeadline: story?.headline ?? null,
      trafficSource,
      devicePlatform,
      entries,
      views: 1,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: [
        analyticsDailyViews.day,
        analyticsDailyViews.pathname,
        analyticsDailyViews.trafficSource,
        analyticsDailyViews.devicePlatform,
      ],
      set: {
        storyId: story?.id ?? null,
        storySlug: story?.slug ?? null,
        storyHeadline: story?.headline ?? null,
        entries: sql`${analyticsDailyViews.entries} + ${entries}`,
        views: sql`${analyticsDailyViews.views} + 1`,
        updatedAt: now,
      },
    });
  return { recorded: true as const, day, pathname, storySlug: story?.slug ?? null, trafficSource, devicePlatform };
}

async function createPeriodArchive(range: AnalyticsPeriodRange) {
  const db = getDb();
  const rows = await db
    .select({
      pathname: analyticsDailyViews.pathname,
      storyId: analyticsDailyViews.storyId,
      storySlug: analyticsDailyViews.storySlug,
      storyHeadline: analyticsDailyViews.storyHeadline,
      trafficSource: analyticsDailyViews.trafficSource,
      devicePlatform: analyticsDailyViews.devicePlatform,
      entries: analyticsDailyViews.entries,
      views: analyticsDailyViews.views,
      day: analyticsDailyViews.day,
    })
    .from(analyticsDailyViews)
    .where(and(gte(analyticsDailyViews.day, range.periodStart), lte(analyticsDailyViews.day, range.periodEnd)))
    .orderBy(asc(analyticsDailyViews.day));

  const paths = new Map<string, number>();
  const storyMetrics = new Map<string, AnalyticsStoryView>();
  const sourceMetrics = new Map<string, AnalyticsSourceView>();
  const deviceMetrics = new Map<string, AnalyticsDeviceView>();
  let totalViews = 0;
  for (const row of rows) {
    totalViews += row.views;
    paths.set(row.pathname, (paths.get(row.pathname) ?? 0) + row.views);
    const source = sourceMetrics.get(row.trafficSource);
    sourceMetrics.set(row.trafficSource, {
      source: row.trafficSource,
      entries: (source?.entries ?? 0) + row.entries,
      views: (source?.views ?? 0) + row.views,
    });
    const device = deviceMetrics.get(row.devicePlatform);
    deviceMetrics.set(row.devicePlatform, {
      platform: row.devicePlatform,
      entries: (device?.entries ?? 0) + row.entries,
      views: (device?.views ?? 0) + row.views,
    });
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
  const sourceViews = [...sourceMetrics.values()].sort((a, b) => b.entries - a.entries || b.views - a.views || a.source.localeCompare(b.source));
  const deviceViews = [...deviceMetrics.values()].sort((a, b) => b.views - a.views || a.platform.localeCompare(b.platform));

  await db
    .insert(analyticsPeriodArchives)
    .values({ ...range, totalViews, storyViews, pathViews, sourceViews, deviceViews, generatedAt: new Date() })
    .onConflictDoUpdate({
      target: [analyticsPeriodArchives.period, analyticsPeriodArchives.periodStart],
      set: { periodEnd: range.periodEnd, totalViews, storyViews, pathViews, sourceViews, deviceViews, generatedAt: new Date() },
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

  const [[total], [storyTotal], [recent], dailyRows, storyRows, sourceRows, deviceRows, archiveRows] = await Promise.all([
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
    db.select({
      source: analyticsDailyViews.trafficSource,
      entries: sql<number>`coalesce(sum(${analyticsDailyViews.entries}), 0)::int`,
      views: sql<number>`coalesce(sum(${analyticsDailyViews.views}), 0)::int`,
    })
      .from(analyticsDailyViews)
      .groupBy(analyticsDailyViews.trafficSource)
      .orderBy(desc(sql`coalesce(sum(${analyticsDailyViews.entries}), 0)`), desc(sql`coalesce(sum(${analyticsDailyViews.views}), 0)`)),
    db.select({
      platform: analyticsDailyViews.devicePlatform,
      entries: sql<number>`coalesce(sum(${analyticsDailyViews.entries}), 0)::int`,
      views: sql<number>`coalesce(sum(${analyticsDailyViews.views}), 0)::int`,
    })
      .from(analyticsDailyViews)
      .groupBy(analyticsDailyViews.devicePlatform)
      .orderBy(desc(sql`coalesce(sum(${analyticsDailyViews.views}), 0)`)),
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
  const totalEntries = sourceRows.reduce((sum, row) => sum + row.entries, 0);
  const totalDeviceViews = deviceRows.reduce((sum, row) => sum + row.views, 0);
  const sources: TrafficSourceMetric[] = sourceRows.map((row) => ({
    ...row,
    label: trafficSourceLabel(row.source),
    share: totalEntries ? (row.entries / totalEntries) * 100 : 0,
  }));
  const devices: TrafficDeviceMetric[] = deviceRows.map((row) => ({
    ...row,
    label: trafficDeviceLabel(row.platform),
    share: totalDeviceViews ? (row.views / totalDeviceViews) * 100 : 0,
  }));
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
      sourceViews: row.sourceViews,
      deviceViews: row.deviceViews,
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
    sources,
    devices,
    archives,
  };
}
