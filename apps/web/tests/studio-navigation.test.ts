import assert from "node:assert/strict";
import test from "node:test";
import {
  getVisibleStudioNavigation,
  isStudioRouteActive,
  resolveStudioNavigation,
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
});

test("navigation hides unauthorized and unavailable destinations", () => {
  const contributor = getVisibleStudioNavigation({
    role: "contributor",
    chatEnabled: false,
    pressEnabled: false,
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
  });
  const administratorIds = administrator.flatMap((hub) =>
    hub.items.map((item) => item.id),
  );
  for (const id of ["tips", "twenty-under-twenty", "team", "settings", "legal-registry", "chat", "press-releases", "distribution-manager"]) {
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
    { role: "editor", chatEnabled: true, pressEnabled: true },
  );
  assert.equal(resolved.activeHub.id, "njc-plus");
  assert.equal(resolved.activeItem?.id, "njc-plus-content");

  const pressRelease = resolveStudioNavigation(
    "/studio/press-releases/new",
    { role: "producer", chatEnabled: true, pressEnabled: true },
  );
  assert.equal(pressRelease.activeHub.id, "distribution");
  assert.equal(pressRelease.activeItem?.id, "press-releases");

  const distributionManager = resolveStudioNavigation(
    "/studio/distribution",
    { role: "editor", chatEnabled: false, pressEnabled: false },
  );
  assert.equal(distributionManager.activeHub.id, "distribution");
  assert.equal(distributionManager.activeItem?.id, "distribution-manager");
});
