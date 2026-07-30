import { and, eq, sql } from "drizzle-orm";
import type {
  AudienceApplicationVersionMetric,
  AudiencePlatform,
  AudiencePlatformMetric,
  AudienceSummary,
} from "@harborline/contracts";
import { getDb, hasDatabase } from "@harborline/backend/db";
import {
  apiKeys,
  audienceInstallations,
  audienceInstallationVersions,
} from "@harborline/backend/schema";

const platformDetails: Record<AudiencePlatform, Pick<AudiencePlatformMetric, "label" | "measurement">> = {
  web: { label: "Web", measurement: "installations" },
  ios: { label: "iOS", measurement: "installations" },
  android: { label: "Android", measurement: "installations" },
  tvos: { label: "Apple TV", measurement: "installations" },
  androidtv: { label: "Android TV / Google TV", measurement: "installations" },
  roku: { label: "Roku", measurement: "installations" },
  api: { label: "Developer API", measurement: "accounts" },
};

const platformOrder: AudiencePlatform[] = [
  "web",
  "ios",
  "android",
  "tvos",
  "androidtv",
  "roku",
  "api",
];

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
    versions: [],
    totals: {
      trackedInstallations: 0,
      active24h: 0,
      active7d: 0,
      active30d: 0,
      knownAccountLinks: 0,
      apiConsumers: 0,
    },
    identity: { knownAccounts: 0, anonymousInstallations: 0 },
    legacy: { installations: 0, active30d: 0 },
    dataQuality: {
      status: "provisional",
      calculationVersion: 2,
      notes: ["The database is not configured, so no audience evidence is available."],
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

  const [
    installationRows,
    versionRows,
    [apiRow],
    [identityRow],
    [legacyRow],
  ] = await Promise.all([
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
      .where(
        and(
          eq(audienceInstallations.qualityStatus, "verified"),
          eq(audienceInstallations.environment, "production"),
        ),
      )
      .groupBy(audienceInstallations.platform),
    db
      .select({
        platform: audienceInstallationVersions.platform,
        product: audienceInstallationVersions.product,
        releaseChannel: audienceInstallationVersions.releaseChannel,
        appVersion: audienceInstallationVersions.appVersion,
        buildNumber: audienceInstallationVersions.buildNumber,
        environment: audienceInstallationVersions.environment,
        qualityStatus: audienceInstallationVersions.qualityStatus,
        installations: sql<number>`count(distinct ${audienceInstallationVersions.installationId})::int`,
        active24h: sql<number>`count(distinct ${audienceInstallationVersions.installationId}) filter (where ${audienceInstallationVersions.lastSeenAt} >= ${since24h})::int`,
        active7d: sql<number>`count(distinct ${audienceInstallationVersions.installationId}) filter (where ${audienceInstallationVersions.lastSeenAt} >= ${since7d})::int`,
        active30d: sql<number>`count(distinct ${audienceInstallationVersions.installationId}) filter (where ${audienceInstallationVersions.lastSeenAt} >= ${since30d})::int`,
        knownAccounts: sql<number>`count(distinct ${audienceInstallations.userClerkId})::int`,
        firstSeenAt: sql<Date>`min(${audienceInstallationVersions.firstSeenAt})`,
        lastSeenAt: sql<Date>`max(${audienceInstallationVersions.lastSeenAt})`,
      })
      .from(audienceInstallationVersions)
      .leftJoin(
        audienceInstallations,
        eq(
          audienceInstallations.installationId,
          audienceInstallationVersions.installationId,
        ),
      )
      .groupBy(
        audienceInstallationVersions.platform,
        audienceInstallationVersions.product,
        audienceInstallationVersions.releaseChannel,
        audienceInstallationVersions.appVersion,
        audienceInstallationVersions.buildNumber,
        audienceInstallationVersions.environment,
        audienceInstallationVersions.qualityStatus,
      )
      .orderBy(
        audienceInstallationVersions.platform,
        audienceInstallationVersions.product,
        audienceInstallationVersions.appVersion,
        audienceInstallationVersions.buildNumber,
      ),
    db.select({
      allTime: sql<number>`count(distinct ${apiKeys.ownerClerkId})::int`,
      active24h: sql<number>`count(distinct ${apiKeys.ownerClerkId}) filter (where ${apiKeys.lastUsedAt} >= ${since24h})::int`,
      active7d: sql<number>`count(distinct ${apiKeys.ownerClerkId}) filter (where ${apiKeys.lastUsedAt} >= ${since7d})::int`,
      active30d: sql<number>`count(distinct ${apiKeys.ownerClerkId}) filter (where ${apiKeys.lastUsedAt} >= ${since30d})::int`,
    }).from(apiKeys),
    db
      .select({
        knownAccounts: sql<number>`count(distinct ${audienceInstallations.userClerkId})::int`,
        anonymousInstallations: sql<number>`count(*) filter (where ${audienceInstallations.userClerkId} is null)::int`,
      })
      .from(audienceInstallations)
      .where(
        and(
          eq(audienceInstallations.qualityStatus, "verified"),
          eq(audienceInstallations.environment, "production"),
        ),
      ),
    db
      .select({
        installations: sql<number>`count(*)::int`,
        active30d: sql<number>`count(*) filter (where ${audienceInstallations.lastSeenAt} >= ${since30d})::int`,
      })
      .from(audienceInstallations)
      .where(eq(audienceInstallations.qualityStatus, "legacy")),
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
  const versions: AudienceApplicationVersionMetric[] = versionRows.flatMap((row) => {
    if (!platformOrder.includes(row.platform as AudiencePlatform) || row.platform === "api")
      return [];
    const platform = row.platform as AudiencePlatform;
    return [{
      platform,
      platformLabel: platformDetails[platform].label,
      product: row.product,
      releaseChannel: row.releaseChannel,
      environment: row.environment,
      appVersion: row.appVersion,
      buildNumber: row.buildNumber,
      installations: row.installations,
      active24h: row.active24h,
      active7d: row.active7d,
      active30d: row.active30d,
      knownAccounts: row.knownAccounts,
      firstSeenAt: row.firstSeenAt.toISOString(),
      lastSeenAt: row.lastSeenAt.toISOString(),
      qualityStatus: row.qualityStatus === "verified" ? "verified" : "legacy",
    }];
  });
  const unknownVersions = versions.filter(
    (item) => item.appVersion === "unknown" || item.buildNumber === "unknown",
  ).length;
  const legacyInstallations = legacyRow?.installations ?? 0;
  const baselineApproved =
    process.env.ANALYTICS_V2_BASELINE_APPROVED === "true";
  const notes = [
    ...(!baselineApproved
      ? [
          "The analytics v2 production baseline is awaiting documented product and editorial approval.",
        ]
      : []),
    ...(legacyInstallations
      ? [
          `${legacyInstallations} pre-audit installation${legacyInstallations === 1 ? "" : "s"} are excluded from authoritative totals and retained as legacy evidence.`,
        ]
      : []),
    ...(unknownVersions
      ? [
          `${unknownVersions} application version group${unknownVersions === 1 ? "" : "s"} lack a complete version/build identity.`,
        ]
      : []),
  ];
  return {
    platforms,
    versions,
    totals: {
      trackedInstallations: installations.reduce((sum, item) => sum + item.allTime, 0),
      active24h: installations.reduce((sum, item) => sum + item.active24h, 0),
      active7d: installations.reduce((sum, item) => sum + item.active7d, 0),
      active30d: installations.reduce((sum, item) => sum + item.active30d, 0),
      knownAccountLinks: identityRow?.knownAccounts ?? 0,
      apiConsumers: metrics.get("api")?.allTime ?? 0,
    },
    identity: {
      knownAccounts: identityRow?.knownAccounts ?? 0,
      anonymousInstallations: identityRow?.anonymousInstallations ?? 0,
    },
    legacy: {
      installations: legacyInstallations,
      active30d: legacyRow?.active30d ?? 0,
    },
    dataQuality: {
      status:
        baselineApproved && unknownVersions === 0 ? "verified" : "provisional",
      calculationVersion: 2,
      notes,
    },
    generatedAt: new Date().toISOString(),
    database: "connected",
  };
}
