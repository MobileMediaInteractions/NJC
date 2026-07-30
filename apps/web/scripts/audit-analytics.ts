import { and, eq, sql } from "drizzle-orm";
import { getDb, hasDatabase } from "@harborline/backend/db";
import {
  analyticsDailyViews,
  analyticsEvents,
  analyticsPeriodArchives,
  audienceInstallations,
  audienceInstallationVersions,
  audiencePresenceEvents,
} from "@harborline/backend/schema";

async function main() {
  if (!hasDatabase())
    throw new Error("DATABASE_URL is required for the analytics audit");

  const db = getDb();
  const [
  installationGroups,
  versionGroups,
  pageEventGroups,
  presenceEventGroups,
  aggregateGroups,
  archiveGroups,
  [verifiedPageEvents],
  [verifiedAggregateViews],
] = await Promise.all([
  db
    .select({
      platform: audienceInstallations.platform,
      product: audienceInstallations.product,
      environment: audienceInstallations.environment,
      qualityStatus: audienceInstallations.qualityStatus,
      installations: sql<number>`count(*)::int`,
      linkedAccounts: sql<number>`count(distinct ${audienceInstallations.userClerkId})::int`,
      events: sql<number>`sum(${audienceInstallations.eventCount})::int`,
      firstSeenAt: sql<Date>`min(${audienceInstallations.firstSeenAt})`,
      lastSeenAt: sql<Date>`max(${audienceInstallations.lastSeenAt})`,
    })
    .from(audienceInstallations)
    .groupBy(
      audienceInstallations.platform,
      audienceInstallations.product,
      audienceInstallations.environment,
      audienceInstallations.qualityStatus,
    ),
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
      events: sql<number>`sum(${audienceInstallationVersions.eventCount})::int`,
      firstSeenAt: sql<Date>`min(${audienceInstallationVersions.firstSeenAt})`,
      lastSeenAt: sql<Date>`max(${audienceInstallationVersions.lastSeenAt})`,
    })
    .from(audienceInstallationVersions)
    .groupBy(
      audienceInstallationVersions.platform,
      audienceInstallationVersions.product,
      audienceInstallationVersions.releaseChannel,
      audienceInstallationVersions.appVersion,
      audienceInstallationVersions.buildNumber,
      audienceInstallationVersions.environment,
      audienceInstallationVersions.qualityStatus,
    ),
  db
    .select({
      environment: analyticsEvents.environment,
      qualityStatus: analyticsEvents.qualityStatus,
      product: analyticsEvents.product,
      platform: analyticsEvents.platform,
      events: sql<number>`count(*)::int`,
      installations: sql<number>`count(distinct ${analyticsEvents.installationId})::int`,
      sessions: sql<number>`count(distinct ${analyticsEvents.sessionId})::int`,
      firstReceivedAt: sql<Date>`min(${analyticsEvents.receivedAt})`,
      lastReceivedAt: sql<Date>`max(${analyticsEvents.receivedAt})`,
    })
    .from(analyticsEvents)
    .groupBy(
      analyticsEvents.environment,
      analyticsEvents.qualityStatus,
      analyticsEvents.product,
      analyticsEvents.platform,
    ),
  db
    .select({
      environment: audiencePresenceEvents.environment,
      qualityStatus: audiencePresenceEvents.qualityStatus,
      product: audiencePresenceEvents.product,
      platform: audiencePresenceEvents.platform,
      events: sql<number>`count(*)::int`,
      installations: sql<number>`count(distinct ${audiencePresenceEvents.installationId})::int`,
      accounts: sql<number>`count(distinct ${audiencePresenceEvents.userClerkId})::int`,
      firstReceivedAt: sql<Date>`min(${audiencePresenceEvents.receivedAt})`,
      lastReceivedAt: sql<Date>`max(${audiencePresenceEvents.receivedAt})`,
    })
    .from(audiencePresenceEvents)
    .groupBy(
      audiencePresenceEvents.environment,
      audiencePresenceEvents.qualityStatus,
      audiencePresenceEvents.product,
      audiencePresenceEvents.platform,
    ),
  db
    .select({
      calculationVersion: analyticsDailyViews.calculationVersion,
      qualityStatus: analyticsDailyViews.qualityStatus,
      environment: analyticsDailyViews.environment,
      product: analyticsDailyViews.product,
      views: sql<number>`sum(${analyticsDailyViews.views})::int`,
      entries: sql<number>`sum(${analyticsDailyViews.entries})::int`,
      rows: sql<number>`count(*)::int`,
      firstDay: sql<string>`min(${analyticsDailyViews.day})`,
      lastDay: sql<string>`max(${analyticsDailyViews.day})`,
    })
    .from(analyticsDailyViews)
    .groupBy(
      analyticsDailyViews.calculationVersion,
      analyticsDailyViews.qualityStatus,
      analyticsDailyViews.environment,
      analyticsDailyViews.product,
    ),
  db
    .select({
      calculationVersion: analyticsPeriodArchives.calculationVersion,
      qualityStatus: analyticsPeriodArchives.qualityStatus,
      period: analyticsPeriodArchives.period,
      archives: sql<number>`count(*)::int`,
      views: sql<number>`sum(${analyticsPeriodArchives.totalViews})::int`,
    })
    .from(analyticsPeriodArchives)
    .groupBy(
      analyticsPeriodArchives.calculationVersion,
      analyticsPeriodArchives.qualityStatus,
      analyticsPeriodArchives.period,
    ),
  db
    .select({ value: sql<number>`count(*)::int` })
    .from(analyticsEvents)
    .where(and(
      eq(analyticsEvents.calculationVersion, 2),
      eq(analyticsEvents.qualityStatus, "verified"),
      eq(analyticsEvents.environment, "production"),
    )),
  db
    .select({ value: sql<number>`coalesce(sum(${analyticsDailyViews.views}), 0)::int` })
    .from(analyticsDailyViews)
    .where(and(
      eq(analyticsDailyViews.calculationVersion, 2),
      eq(analyticsDailyViews.qualityStatus, "verified"),
      eq(analyticsDailyViews.environment, "production"),
    )),
  ]);

  const eventTotal = verifiedPageEvents?.value ?? 0;
  const aggregateTotal = verifiedAggregateViews?.value ?? 0;
  console.log(JSON.stringify({
    generatedAt: new Date().toISOString(),
    calculationVersion: 2,
    privacy: "No installation IDs, account IDs, session IDs or raw referrers are included.",
    reconciliation: {
      verifiedPageEvents: eventTotal,
      verifiedAggregateViews: aggregateTotal,
      difference: aggregateTotal - eventTotal,
      status: eventTotal === aggregateTotal ? "matched" : "mismatch",
    },
    installationGroups,
    versionGroups,
    pageEventGroups,
    presenceEventGroups,
    aggregateGroups,
    archiveGroups,
  }, null, 2));
}

main().catch((error) => {
  console.error(
    error instanceof Error ? error.message : "Analytics audit failed.",
  );
  process.exitCode = 1;
});
