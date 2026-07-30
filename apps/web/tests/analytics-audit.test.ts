import assert from "node:assert/strict";
import test from "node:test";
import {
  auditControlledAnalyticsEvents,
  type ControlledAnalyticsEvent,
} from "../src/lib/analytics-audit";

function presence(
  eventId: string,
  installationId: string,
  accountId: string | null,
  platform: string,
  appVersion: string,
  buildNumber: string,
  overrides: Partial<ControlledAnalyticsEvent> = {},
): ControlledAnalyticsEvent {
  return {
    eventId,
    eventType: "presence",
    environment: "production",
    qualityStatus: "verified",
    installationId,
    accountId,
    platform,
    product: platform === "roku" ? "reader-roku" : "news-web",
    appVersion,
    buildNumber,
    ...overrides,
  };
}

test("the controlled two-person scenario keeps people, installations and versions separate", () => {
  const result = auditControlledAnalyticsEvents([
    presence("presence_a_000000000001", "web_installation_0001", "account_a", "web", "0.2.0", "web-a"),
    presence("presence_b_000000000002", "web_installation_0002", "account_b", "web", "0.2.0", "web-a"),
    presence("presence_c_000000000003", "roku_installation_0001", "account_a", "roku", "1.0.3", "3"),
    presence("presence_d_000000000004", "roku_installation_0001", "account_a", "roku", "1.0.4", "4"),
  ]);

  assert.equal(result.knownAccounts, 2);
  assert.equal(result.installations, 3);
  assert.equal(result.versions, 4);
  assert.deepEqual(result.installationsByPlatform, { web: 2, roku: 1 });
});

test("a same-installation Roku upgrade adds a version without inventing another installation", () => {
  const result = auditControlledAnalyticsEvents([
    presence("presence_a_100000000001", "roku_installation_0001", "account_a", "roku", "1.0.3", "3"),
    presence("presence_b_100000000002", "roku_installation_0001", "account_a", "roku", "1.0.4", "4"),
  ]);

  assert.equal(result.installations, 1);
  assert.equal(result.versions, 2);
  assert.equal(result.installationsByPlatform.roku, 1);
});

test("two distinct Roku installations remain two installations even on the same build", () => {
  const result = auditControlledAnalyticsEvents([
    presence("presence_a_200000000001", "roku_installation_0001", "account_a", "roku", "1.0.4", "4"),
    presence("presence_b_200000000002", "roku_installation_0002", "account_a", "roku", "1.0.4", "4"),
  ]);

  assert.equal(result.knownAccounts, 1);
  assert.equal(result.installations, 2);
  assert.equal(result.versions, 2);
});

test("duplicate event IDs, preview traffic and legacy events never inflate authoritative totals", () => {
  const page: ControlledAnalyticsEvent = {
    eventId: "view_event_0000000000001",
    eventType: "page_view",
    environment: "production",
    qualityStatus: "verified",
  };
  const result = auditControlledAnalyticsEvents([
    page,
    page,
    { ...page, eventId: "view_event_0000000000002", environment: "preview" },
    { ...page, eventId: "view_event_0000000000003", qualityStatus: "legacy" },
  ]);

  assert.equal(result.acceptedEvents, 1);
  assert.equal(result.pageViews, 1);
  assert.equal(result.duplicateEvents, 1);
  assert.equal(result.excludedEvents, 2);
});
