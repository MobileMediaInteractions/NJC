import assert from "node:assert/strict";
import test from "node:test";
import {
  countNotificationRecipients,
  normalizeNotificationDestination,
  notificationAudienceSchema,
  notificationCampaignInputSchema,
  resolveExclusiveNjcPlusSegment,
  webPushSubscriptionSchema,
} from "../src/lib/site-notification-policy";

test("notification destinations allow public local routes only", () => {
  assert.equal(
    normalizeNotificationDestination("/story/council-budget?from=push#update"),
    "/story/council-budget?from=push#update",
  );
  assert.equal(normalizeNotificationDestination("/foo/../studio/team"), null);
  assert.equal(normalizeNotificationDestination("/api/v1/stories"), null);
  assert.equal(normalizeNotificationDestination("https://example.com/story"), null);
  assert.equal(normalizeNotificationDestination("//example.com/story"), null);
  assert.equal(normalizeNotificationDestination("/story\\unsafe"), null);
});

test("campaign input requires confirmation and canonical audience choices", () => {
  const valid = notificationCampaignInputSchema.safeParse({
    title: "School budget vote",
    body: "The council meeting begins at 7 p.m.",
    destination: "/story/school-budget-vote",
    audience: {
      type: "accounts",
      userClerkIds: ["user_reader123", "user_reader123", "user_reader456"],
    },
    confirmed: true,
  });
  assert.equal(valid.success, true);
  if (valid.success) {
    assert.deepEqual(valid.data.audience, {
      type: "accounts",
      userClerkIds: ["user_reader123", "user_reader456"],
    });
  }

  assert.equal(notificationCampaignInputSchema.safeParse({
    title: "School budget vote",
    body: "The council meeting begins at 7 p.m.",
    destination: "/story/school-budget-vote",
    audience: { type: "sitewide" },
    confirmed: false,
  }).success, false);
  assert.equal(notificationAudienceSchema.safeParse({
    type: "njc_plus_segment",
    segment: "paid_or_beta",
  }).success, false);
});

test("browser subscription input accepts standard Web Push keys only over HTTPS", () => {
  const subscription = {
    endpoint: "https://push.example.test/subscriptions/abc",
    expirationTime: null,
    keys: {
      p256dh: "A".repeat(65),
      auth: "B".repeat(24),
    },
  };
  assert.equal(webPushSubscriptionSchema.safeParse(subscription).success, true);
  assert.equal(webPushSubscriptionSchema.safeParse({
    ...subscription,
    endpoint: "http://push.example.test/subscriptions/abc",
  }).success, false);
  assert.equal(webPushSubscriptionSchema.safeParse({
    ...subscription,
    keys: { ...subscription.keys, auth: "<script>" },
  }).success, false);
});

test("recipient counts deduplicate signed-in accounts but retain anonymous devices", () => {
  assert.equal(countNotificationRecipients([
    { id: "subscription-1", userClerkId: "user_reader123" },
    { id: "subscription-2", userClerkId: "user_reader123" },
    { id: "subscription-3", userClerkId: null },
    { id: "subscription-4", userClerkId: null },
  ]), 3);
});

test("NJC+ notification segments follow the canonical non-overlapping entitlement priority", () => {
  const input = {
    member: ["user_member"],
    trial: ["user_member", "user_trial"],
    complimentary: ["user_member", "user_trial", "user_comp"],
    invitedBetaTester: [
      "user_member",
      "user_trial",
      "user_comp",
      "user_beta",
    ],
  };
  assert.deepEqual(resolveExclusiveNjcPlusSegment("member", input), ["user_member"]);
  assert.deepEqual(resolveExclusiveNjcPlusSegment("trial", input), ["user_trial"]);
  assert.deepEqual(resolveExclusiveNjcPlusSegment("complimentary", input), ["user_comp"]);
  assert.deepEqual(resolveExclusiveNjcPlusSegment("invited_beta_tester", input), ["user_beta"]);
});
