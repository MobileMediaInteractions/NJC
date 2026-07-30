import assert from "node:assert/strict";
import test from "node:test";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import {
  getStudioHubSecondaryItems,
  getVisibleStudioNavigation,
  isStudioRouteActive,
  normalizeStudioNavigationPathname,
  resolveStudioNavigation,
  studioNavigationHref,
  studioNavigationHubs,
  usesCleanStudioNavigationPaths,
} from "../src/lib/studio-navigation";

test("Studio route matching respects complete path segments", () => {
  assert.equal(isStudioRouteActive("/studio/press", "/studio/press"), true);
  assert.equal(
    isStudioRouteActive("/studio/press-releases", "/studio/press"),
    false,
  );
  assert.equal(
    isStudioRouteActive("/studio/press-releases/new", "/studio/press-releases"),
    true,
  );
  assert.equal(isStudioRouteActive("/studio/stories", "/studio"), false);
  assert.equal(
    isStudioRouteActive("/finance/ledger", "/studio/finance/ledger"),
    true,
  );
  assert.equal(isStudioRouteActive("/", "/studio"), true);
});

test("clean Studio-host paths resolve to canonical navigation entries", () => {
  assert.equal(
    normalizeStudioNavigationPathname("/finance/ledger/"),
    "/studio/finance/ledger",
  );
  assert.equal(
    studioNavigationHref("/studio/finance/ledger", true),
    "/finance/ledger",
  );
  assert.equal(
    studioNavigationHref("/studio/finance/ledger", false),
    "/studio/finance/ledger",
  );
  assert.equal(studioNavigationHref("/studio", true), "/");
  assert.equal(usesCleanStudioNavigationPaths("/finance/ledger"), true);
  assert.equal(usesCleanStudioNavigationPaths("/studio/finance/ledger"), false);
  assert.equal(usesCleanStudioNavigationPaths("/studio/finance/"), false);

  const resolved = resolveStudioNavigation("/finance/ledger", {
    role: "admin",
    chatEnabled: true,
    pressEnabled: true,
    alertsEnabled: true,
    financeEnabled: true,
  });
  assert.equal(resolved.activeHub.id, "finance");
  assert.equal(resolved.activeItem?.id, "finance-ledger");
});

test("Studio navigation IDs and destinations are unique", () => {
  const items = studioNavigationHubs.flatMap((hub) => hub.items);
  assert.equal(new Set(items.map((item) => item.id)).size, items.length);
  assert.equal(new Set(items.map((item) => item.href)).size, items.length);
});

test("every Studio navigation destination resolves to an implemented page", () => {
  for (const item of studioNavigationHubs.flatMap((hub) => hub.items)) {
    if (item.external) continue;
    const page = fileURLToPath(
      new URL(`../src/app${item.href}/page.tsx`, import.meta.url),
    );
    assert.equal(existsSync(page), true, `Missing page for ${item.href}`);
  }
});

test("a workspace default destination is not repeated in its child list", () => {
  for (const hub of studioNavigationHubs) {
    const secondary = getStudioHubSecondaryItems({
      ...hub,
      items: [...hub.items],
    });
    assert.equal(
      secondary.some((item) => item.href === hub.items[0]?.href),
      false,
      `${hub.label} repeats its default destination`,
    );
  }
});

test("navigation hides unauthorized and unavailable destinations", () => {
  const contributor = getVisibleStudioNavigation({
    role: "contributor",
    chatEnabled: false,
    pressEnabled: false,
    alertsEnabled: false,
    financeEnabled: false,
  });
  const contributorIds = contributor.flatMap((hub) =>
    hub.items.map((item) => item.id),
  );
  assert.equal(contributorIds.includes("tips"), false);
  assert.equal(contributorIds.includes("team"), false);
  assert.equal(contributorIds.includes("settings"), false);
  assert.equal(contributorIds.includes("chat"), false);
  assert.equal(contributorIds.includes("press-releases"), false);
  assert.equal(contributorIds.includes("distribution-manager"), false);

  const administrator = getVisibleStudioNavigation({
    role: "admin",
    chatEnabled: true,
    pressEnabled: true,
    alertsEnabled: true,
    financeEnabled: true,
  });
  const administratorIds = administrator.flatMap((hub) =>
    hub.items.map((item) => item.id),
  );
  for (const id of ["tips", "twenty-under-twenty", "team", "notification-campaigns", "settings", "legal-registry", "chat", "press-releases", "distribution-manager", "finance-overview", "finance-ledger", "finance-reconciliation", "finance-settings"]) {
    assert.equal(administratorIds.includes(id), true);
  }
  assert.equal(
    administrator.find((hub) => hub.id === "configuration")?.items[0]?.id,
    "settings",
  );
});

test("active navigation selects the most specific visible destination", () => {
  const resolved = resolveStudioNavigation(
    "/studio/njc-plus/content/8e828c80-7a65-4cf4-b912-9ed2fbd6a3bd",
    { role: "editor", chatEnabled: true, pressEnabled: true, alertsEnabled: true, financeEnabled: false },
  );
  assert.equal(resolved.activeHub.id, "njc-plus");
  assert.equal(resolved.activeItem?.id, "njc-plus-content");

  const pressRelease = resolveStudioNavigation(
    "/studio/press-releases/new",
    { role: "producer", chatEnabled: true, pressEnabled: true, alertsEnabled: true, financeEnabled: false },
  );
  assert.equal(pressRelease.activeHub.id, "distribution");
  assert.equal(pressRelease.activeItem?.id, "press-releases");

  const distributionManager = resolveStudioNavigation(
    "/studio/distribution",
    { role: "editor", chatEnabled: false, pressEnabled: false, alertsEnabled: false, financeEnabled: false },
  );
  assert.equal(distributionManager.activeHub.id, "distribution");
  assert.equal(distributionManager.activeItem?.id, "distribution-manager");
});
