import { sql } from "drizzle-orm";
import type { AudiencePlatform, AudiencePlatformMetric, AudienceSummary } from "@harborline/contracts";
import { getDb, hasDatabase } from "@harborline/backend/db";
import { apiKeys, audienceInstallations } from "@harborline/backend/schema";

const platformDetails: Record<AudiencePlatform, Pick<AudiencePlatformMetric, "label" | "measurement">> = {
  web: { label: "Web", measurement: "installations" },
  ios: { label: "iOS", measurement: "installations" },
  android: { label: "Android", measurement: "installations" },
  tvos: { label: "Apple TV", measurement: "installations" },
  roku: { label: "Roku", measurement: "installations" },
  api: { label: "Developer API", measurement: "accounts" },
};

const platformOrder: AudiencePlatform[] = ["web", "ios", "android", "tvos", "roku", "api"];

function emptyMetric(platform: AudiencePlatform): AudiencePlatformMetric {
  return {
    platform,
    ...platformDetails[platform],
    allTime: 0,
    active24h: 0,
    active7d: 0,
    active30d: 0,
    knownAccounts: 0,
  };
}

export function emptyAudienceSummary(): AudienceSummary {
  return {
    platforms: platformOrder.map(emptyMetric),
    totals: {
      trackedInstallations: 0,
      active24h: 0,
      active7d: 0,
      active30d: 0,
      knownAccountLinks: 0,
      apiConsumers: 0,
    },
    generatedAt: new Date().toISOString(),
    database: "not configured",
  };
}

export async function getAudienceSummary(): Promise<AudienceSummary> {
  if (!hasDatabase()) return emptyAudienceSummary();

  const now = Date.now();
  const since24h = new Date(now - 24 * 60 * 60 * 1000);
  const since7d = new Date(now - 7 * 24 * 60 * 60 * 1000);
  const since30d = new Date(now - 30 * 24 * 60 * 60 * 1000);
  const db = getDb();

  const [installationRows, [apiRow]] = await Promise.all([
    db
      .select({
        platform: audienceInstallations.platform,
        allTime: sql<number>`count(*)::int`,
        active24h: sql<number>`count(*) filter (where ${audienceInstallations.lastSeenAt} >= ${since24h})::int`,
        active7d: sql<number>`count(*) filter (where ${audienceInstallations.lastSeenAt} >= ${since7d})::int`,
        active30d: sql<number>`count(*) filter (where ${audienceInstallations.lastSeenAt} >= ${since30d})::int`,
        knownAccounts: sql<number>`count(distinct ${audienceInstallations.userClerkId})::int`,
      })
      .from(audienceInstallations)
      .groupBy(audienceInstallations.platform),
    db.select({
      allTime: sql<number>`count(distinct ${apiKeys.ownerClerkId})::int`,
      active24h: sql<number>`count(distinct ${apiKeys.ownerClerkId}) filter (where ${apiKeys.lastUsedAt} >= ${since24h})::int`,
      active7d: sql<number>`count(distinct ${apiKeys.ownerClerkId}) filter (where ${apiKeys.lastUsedAt} >= ${since7d})::int`,
      active30d: sql<number>`count(distinct ${apiKeys.ownerClerkId}) filter (where ${apiKeys.lastUsedAt} >= ${since30d})::int`,
    }).from(apiKeys),
  ]);

  const metrics = new Map<AudiencePlatform, AudiencePlatformMetric>();
  for (const platform of platformOrder) metrics.set(platform, emptyMetric(platform));
  for (const row of installationRows) {
    if (!platformOrder.includes(row.platform as AudiencePlatform) || row.platform === "api") continue;
    const platform = row.platform as AudiencePlatform;
    metrics.set(platform, {
      platform,
      ...platformDetails[platform],
      allTime: row.allTime,
      active24h: row.active24h,
      active7d: row.active7d,
      active30d: row.active30d,
      knownAccounts: row.knownAccounts,
    });
  }
  metrics.set("api", {
    platform: "api",
    ...platformDetails.api,
    allTime: apiRow?.allTime ?? 0,
    active24h: apiRow?.active24h ?? 0,
    active7d: apiRow?.active7d ?? 0,
    active30d: apiRow?.active30d ?? 0,
    knownAccounts: apiRow?.allTime ?? 0,
  });

  const platforms = platformOrder.map((platform) => metrics.get(platform) ?? emptyMetric(platform));
  const installations = platforms.filter((item) => item.measurement === "installations");
  return {
    platforms,
    totals: {
      trackedInstallations: installations.reduce((sum, item) => sum + item.allTime, 0),
      active24h: installations.reduce((sum, item) => sum + item.active24h, 0),
      active7d: installations.reduce((sum, item) => sum + item.active7d, 0),
      active30d: installations.reduce((sum, item) => sum + item.active30d, 0),
      knownAccountLinks: installations.reduce((sum, item) => sum + item.knownAccounts, 0),
      apiConsumers: metrics.get("api")?.allTime ?? 0,
    },
    generatedAt: new Date().toISOString(),
    database: "connected",
  };
}
