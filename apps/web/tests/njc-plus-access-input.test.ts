import assert from "node:assert/strict";
import test from "node:test";
import { njcPlusAccessActionInput } from "../src/lib/njc-plus-access-input";

const userClerkId = "user_newsroom";
const reason = "Approved by the managing editor";
const uuid = "7b1e1c96-0f67-4b52-873d-df62e4abcb2b";

test("guided NJC+ grants accept canonical selected values", () => {
  for (const sourceType of ["manual", "trial", "promotion", "complimentary"]) {
    assert.equal(njcPlusAccessActionInput.safeParse({
      action: "grant_access",
      userClerkId,
      scopeType: "product",
      scopeId: "njc_plus",
      sourceType,
      endsAt: null,
      reason,
    }).success, true);
  }
});

test("guided access rejects missing accounts, unsupported choices, and zero credits", () => {
  assert.equal(njcPlusAccessActionInput.safeParse({
    action: "grant_access",
    userClerkId: "",
    scopeType: "unknown",
    scopeId: "",
    sourceType: "manual",
    reason,
  }).success, false);
  assert.equal(njcPlusAccessActionInput.safeParse({
    action: "credit_transaction",
    userClerkId,
    amount: 0,
    transactionType: "grant",
    reason,
  }).success, false);
});

test("invited beta input stays temporary and uses selected feature/content IDs", () => {
  const parsed = njcPlusAccessActionInput.safeParse({
    action: "grant_invited_beta",
    userClerkId,
    featureKeys: ["njc_plus_video", "njc_plus_search"],
    premiumContentIncluded: false,
    contentIds: [uuid],
    showMemberBranding: false,
    startsAt: "2026-07-28T12:00:00.000Z",
    endsAt: "2026-08-27T12:00:00.000Z",
    reason,
  });
  assert.equal(parsed.success, true);
  if (parsed.success) assert.equal(parsed.data.action, "grant_invited_beta");
});

test("every guided entitlement status action requires an auditable reason", () => {
  for (const action of ["revoke_access", "pause_access", "resume_access"]) {
    assert.equal(njcPlusAccessActionInput.safeParse({
      action,
      entitlementId: uuid,
      reason,
    }).success, true);
    assert.equal(njcPlusAccessActionInput.safeParse({
      action,
      entitlementId: uuid,
      reason: "short",
    }).success, false);
  }
});
