import assert from "node:assert/strict";
import test from "node:test";
import {
  canManageDistribution,
  isDistributionDownloadAllowed,
  isDistributionGrantActive,
  isDistributionPackageAvailable,
} from "../src/lib/distribution-policy";
import {
  distributionMediaKind,
  distributionPackageInput,
} from "../src/lib/distribution-input";
import { toLocalDateTimeInput } from "../src/lib/local-datetime";

test("distribution management is limited to operational newsroom roles", () => {
  assert.equal(canManageDistribution("admin"), true);
  assert.equal(canManageDistribution("editor"), true);
  assert.equal(canManageDistribution("producer"), true);
  assert.equal(canManageDistribution("reporter"), false);
  assert.equal(canManageDistribution("contributor"), false);
  assert.equal(canManageDistribution(null), false);
});

test("recipient access requires both an active package and grant window", () => {
  const now = new Date("2026-07-25T12:00:00.000Z");
  assert.equal(
    isDistributionGrantActive(
      {
        startsAt: new Date("2026-07-25T11:00:00.000Z"),
        expiresAt: new Date("2026-07-25T13:00:00.000Z"),
        revokedAt: null,
      },
      now,
    ),
    true,
  );
  assert.equal(
    isDistributionGrantActive(
      {
        startsAt: new Date("2026-07-25T11:00:00.000Z"),
        expiresAt: null,
        revokedAt: now,
      },
      now,
    ),
    false,
  );
  assert.equal(
    isDistributionPackageAvailable(
      { status: "available", availableAt: null, expiresAt: null },
      now,
    ),
    true,
  );
  assert.equal(
    isDistributionPackageAvailable(
      {
        status: "draft",
        availableAt: null,
        expiresAt: null,
      },
      now,
    ),
    false,
  );
});

test("package windows and viewer media kinds are validated", () => {
  const invalid = distributionPackageInput.safeParse({
    title: "Advance release",
    description: "",
    status: "available",
    availableAt: "2026-07-26T12:00:00.000Z",
    expiresAt: "2026-07-25T12:00:00.000Z",
    embargoAt: null,
    downloadPolicy: "view_only",
    termsText: "",
  });
  assert.equal(invalid.success, false);
  assert.equal(distributionMediaKind("video/mp4"), "video");
  assert.equal(distributionMediaKind("application/pdf"), "pdf");
  assert.equal(distributionMediaKind("text/plain"), "text");
  assert.equal(distributionMediaKind("text/html"), "text");
  assert.equal(isDistributionDownloadAllowed("view_only", true), false);
  assert.equal(isDistributionDownloadAllowed("grant_controlled", false), false);
  assert.equal(isDistributionDownloadAllowed("grant_controlled", true), true);
  assert.equal(isDistributionDownloadAllowed("download", false), true);
});

test("distribution date fields preserve the viewer's local wall time", () => {
  const instant = new Date(2026, 6, 28, 14, 5);
  assert.equal(toLocalDateTimeInput(instant), "2026-07-28T14:05");
  assert.equal(toLocalDateTimeInput(instant.toISOString()), "2026-07-28T14:05");
  assert.equal(toLocalDateTimeInput(null), "");
  assert.equal(toLocalDateTimeInput("not-a-date"), "");
});
