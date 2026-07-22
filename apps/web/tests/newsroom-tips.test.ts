import assert from "node:assert/strict";
import test from "node:test";
import {
  canViewNewsTips,
  formatTipBadge,
  tipInput,
  tipStatusInput,
} from "../src/lib/newsroom-tips";

test("tip intake validates persisted newsroom fields", () => {
  assert.equal(
    tipInput.safeParse({
      name: "",
      email: "source@example.com",
      subject: "School board records",
      body: "The attached public agenda appears to omit a scheduled vote.",
    }).success,
    true,
  );
  assert.equal(
    tipInput.safeParse({ subject: "No", body: "Too short" }).success,
    false,
  );
});

test("tip workflow accepts only known triage statuses", () => {
  assert.equal(tipStatusInput.safeParse({ status: "reviewing" }).success, true);
  assert.equal(tipStatusInput.safeParse({ status: "deleted" }).success, false);
});

test("Studio tip badge caps display at 9+", () => {
  assert.equal(formatTipBadge(0), null);
  assert.equal(formatTipBadge(1), "1");
  assert.equal(formatTipBadge(9), "9");
  assert.equal(formatTipBadge(10), "9+");
  assert.equal(formatTipBadge(200), "9+");
});

test("contributors cannot access sensitive source submissions", () => {
  assert.equal(canViewNewsTips("contributor"), false);
  assert.equal(canViewNewsTips("reporter"), true);
  assert.equal(canViewNewsTips("admin"), true);
});
