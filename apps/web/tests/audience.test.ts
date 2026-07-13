import assert from "node:assert/strict";
import test from "node:test";
import { audiencePlatforms } from "@harborline/contracts";
import { emptyAudienceSummary } from "../src/lib/audience";

test("audience summary always exposes every supported platform", () => {
  const summary = emptyAudienceSummary();
  assert.deepEqual(summary.platforms.map((item) => item.platform), audiencePlatforms);
  assert.equal(summary.database, "not configured");
  assert.ok(summary.platforms.every((item) => item.allTime === 0 && item.active30d === 0));
});

test("developer API is reported as accounts while app surfaces use installations", () => {
  const summary = emptyAudienceSummary();
  assert.equal(summary.platforms.find((item) => item.platform === "api")?.measurement, "accounts");
  assert.ok(summary.platforms.filter((item) => item.platform !== "api").every((item) => item.measurement === "installations"));
});
