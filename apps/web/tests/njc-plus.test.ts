import assert from "node:assert/strict";
import test from "node:test";
import {
  premiumContentInput,
  premiumKindFormat,
  requiredFeatureForContent,
  sumAccessCredits,
} from "../src/lib/njc-plus";
import { remainingCreditLots } from "../src/lib/access-credits";
import {
  betaTesterCanAccessContent,
  betaTesterHasFeature,
  classifyNjcPlusEntitlement,
  isBetaTesterGrantActive,
  njcPlusBetaDisclosure,
  njcPlusEntitlementLabel,
} from "../src/lib/njc-plus-beta-contract";

test("NJC+ formats map to the correct child release boundary", () => {
  assert.equal(requiredFeatureForContent("video"), "njc_plus_video");
  assert.equal(requiredFeatureForContent("podcast_episode"), "njc_plus_podcasts");
  assert.equal(requiredFeatureForContent("audio"), "njc_plus_audio");
  assert.equal(requiredFeatureForContent("live"), "njc_plus_live");
  assert.equal(requiredFeatureForContent("article"), null);
  assert.equal(premiumKindFormat("documentary"), "video");
  assert.equal(premiumKindFormat("podcast"), "audio");
  assert.equal(premiumKindFormat("story"), "article");
});

test("premium content rejects unsafe slugs and accepts a complete draft", () => {
  const safe = premiumContentInput.safeParse({
    kind: "investigation",
    status: "draft",
    slug: "inside-the-water-system",
    title: "Inside the water system",
    summary: "A months-long NJC+ investigation.",
  });
  assert.equal(safe.success, true);
  const unsafe = premiumContentInput.safeParse({
    kind: "video",
    slug: "../../private",
    title: "Unsafe path",
  });
  assert.equal(unsafe.success, false);
});

test("premium publishing requires schedule, accessible images and playable media", () => {
  const scheduledWithoutTime = premiumContentInput.safeParse({
    kind: "article",
    status: "scheduled",
    slug: "scheduled-report",
    title: "Scheduled report",
    body: ["Complete reporting."],
  });
  assert.equal(scheduledWithoutTime.success, false);

  const imageWithoutAlt = premiumContentInput.safeParse({
    kind: "article",
    status: "draft",
    slug: "visual-report",
    title: "Visual report",
    imageUrl: "https://example.com/report.jpg",
  });
  assert.equal(imageWithoutAlt.success, false);

  const videoWithoutMedia = premiumContentInput.safeParse({
    kind: "video",
    status: "published",
    slug: "evening-report",
    title: "Evening report",
  });
  assert.equal(videoWithoutMedia.success, false);
});

test("Access Credits derive their balance from immutable signed transactions", () => {
  assert.equal(sumAccessCredits([{ amount: 100 }, { amount: -30 }, { amount: 5 }]), 75);
  assert.equal(sumAccessCredits([]), 0);
});

test("Access Credit expiration preserves consumed and permanent credit lots", () => {
  const createdAt = new Date("2026-01-01T00:00:00.000Z");
  const rows = [
    { id: "expiring", userClerkId: "user_1", amount: 100, expiresAt: new Date("2026-01-03T00:00:00.000Z"), sourceType: null, sourceId: null, createdAt },
    { id: "permanent", userClerkId: "user_1", amount: 100, expiresAt: null, sourceType: null, sourceId: null, createdAt: new Date("2026-01-01T00:01:00.000Z") },
    { id: "spend", userClerkId: "user_1", amount: -150, expiresAt: null, sourceType: "redemption", sourceId: null, createdAt: new Date("2026-01-02T00:00:00.000Z") },
  ];
  const remaining = remainingCreditLots(rows);
  assert.equal(remaining.get("expiring"), 0);
  assert.equal(remaining.get("permanent"), 50);
});

test("Invited Beta Tester stays separate from membership and trials", () => {
  assert.equal(classifyNjcPlusEntitlement({
    paidMember: false,
    trial: false,
    complimentary: false,
    invitedBetaTester: true,
  }), "invited_beta_tester");
  assert.equal(njcPlusEntitlementLabel("invited_beta_tester"), "Invited Beta Tester");
  assert.notEqual(njcPlusEntitlementLabel("invited_beta_tester"), "NJC+ Member");
  assert.equal(classifyNjcPlusEntitlement({
    paidMember: false,
    trial: true,
    complimentary: false,
    invitedBetaTester: true,
  }), "njc_plus_trial");
});

test("temporary beta grants enforce time, feature and premium content boundaries", () => {
  const grant = {
    status: "active",
    featureKeys: ["njc_plus_video"],
    premiumContentIncluded: false,
    contentIds: ["selected-content"],
    showMemberBranding: true,
    startsAt: new Date("2026-07-01T00:00:00.000Z"),
    endsAt: new Date("2026-08-01T00:00:00.000Z"),
  };
  const now = new Date("2026-07-25T00:00:00.000Z");
  assert.equal(isBetaTesterGrantActive(grant, now), true);
  assert.equal(betaTesterHasFeature(grant, "njc_plus_video", now), true);
  assert.equal(betaTesterHasFeature(grant, "njc_plus_audio", now), false);
  assert.equal(betaTesterCanAccessContent(grant, "selected-content", "direct_payment", now), true);
  assert.equal(betaTesterCanAccessContent(grant, "other-content", "njc_plus", now), false);
  assert.equal(isBetaTesterGrantActive(grant, new Date("2026-08-01T00:00:00.000Z")), false);
});

test("customer-facing beta disclosure uses the approved entitlement wording", () => {
  assert.equal(
    njcPlusBetaDisclosure,
    "Most NJC+ beta features are included for active NJC+ members. A limited number of invited testers may also receive temporary access to selected beta features.",
  );
});
