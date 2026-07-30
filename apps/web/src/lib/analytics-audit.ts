export type ControlledAnalyticsEvent = {
  eventId: string;
  eventType: "page_view" | "presence";
  environment: string;
  qualityStatus: string;
  installationId?: string | null;
  accountId?: string | null;
  platform?: string | null;
  product?: string | null;
  appVersion?: string | null;
  buildNumber?: string | null;
};

export type ControlledAnalyticsAudit = {
  acceptedEvents: number;
  duplicateEvents: number;
  excludedEvents: number;
  pageViews: number;
  knownAccounts: number;
  installations: number;
  versions: number;
  installationsByPlatform: Record<string, number>;
};

export function auditControlledAnalyticsEvents(
  events: ControlledAnalyticsEvent[],
): ControlledAnalyticsAudit {
  const seenEvents = new Set<string>();
  const installations = new Set<string>();
  const accounts = new Set<string>();
  const versions = new Set<string>();
  const platformInstallations = new Map<string, Set<string>>();
  let acceptedEvents = 0;
  let duplicateEvents = 0;
  let excludedEvents = 0;
  let pageViews = 0;

  for (const event of events) {
    if (seenEvents.has(event.eventId)) {
      duplicateEvents += 1;
      continue;
    }
    seenEvents.add(event.eventId);
    if (
      event.environment !== "production" ||
      event.qualityStatus !== "verified"
    ) {
      excludedEvents += 1;
      continue;
    }
    acceptedEvents += 1;
    if (event.eventType === "page_view") {
      pageViews += 1;
      continue;
    }
    if (event.accountId) accounts.add(event.accountId);
    if (!event.installationId) continue;
    installations.add(event.installationId);
    const platform = event.platform ?? "unknown";
    const byPlatform =
      platformInstallations.get(platform) ?? new Set<string>();
    byPlatform.add(event.installationId);
    platformInstallations.set(platform, byPlatform);
    versions.add(
      [
        event.installationId,
        event.product ?? "unknown",
        event.appVersion ?? "unknown",
        event.buildNumber ?? "unknown",
      ].join(":"),
    );
  }

  return {
    acceptedEvents,
    duplicateEvents,
    excludedEvents,
    pageViews,
    knownAccounts: accounts.size,
    installations: installations.size,
    versions: versions.size,
    installationsByPlatform: Object.fromEntries(
      [...platformInstallations].map(([platform, values]) => [
        platform,
        values.size,
      ]),
    ),
  };
}
