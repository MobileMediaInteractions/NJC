import assert from "node:assert/strict";
import test from "node:test";
import {
  defaultCourierCutDistributionMode,
  resolveCourierCutDistributionMode,
  withCourierCutDistributionMode,
} from "../src/lib/courier-cut-contract";

test("Courier Cut defaults to NJC+ viewing with an invite-only subdomain", () => {
  assert.equal(resolveCourierCutDistributionMode(undefined), defaultCourierCutDistributionMode);
  assert.equal(resolveCourierCutDistributionMode({}), "njc_plus_only");
  assert.equal(resolveCourierCutDistributionMode({ distributionMode: "courier_cut_only" }), "njc_plus_only");
});

test("Courier Cut can add its host without removing NJC+", () => {
  assert.deepEqual(
    withCourierCutDistributionMode(
      { retainedSetting: true },
      "njc_plus_and_subdomain",
    ),
    {
      retainedSetting: true,
      distributionMode: "njc_plus_and_subdomain",
    },
  );
});

