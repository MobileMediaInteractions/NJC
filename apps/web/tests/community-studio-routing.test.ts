import assert from "node:assert/strict";
import test from "node:test";
import nextConfig from "../next.config";

test("the community inbox and nested review routes stay inside Studio on its service host", async () => {
  const rewrites = await nextConfig.rewrites?.();
  assert.ok(rewrites && !Array.isArray(rewrites));
  for (const suffix of ["", "/:path*"]) {
    const route = rewrites.beforeFiles?.find((item) => item.source === `/community${suffix}` && item.destination === `/studio/community${suffix}`);
    assert.ok(route, `Missing community admin rewrite ${suffix}`);
    assert.deepEqual(route.has, [{ type: "host", value: "studio.thejerseycourier.com" }]);
  }
});

test("the publication host keeps its separate public community page", async () => {
  const rewrites = await nextConfig.rewrites?.();
  assert.ok(rewrites && !Array.isArray(rewrites));
  assert.equal(rewrites.beforeFiles?.some((item) => item.source === "/community" && item.destination === "/studio/community" && (!item.has?.length || item.has.some((condition) => condition.type === "host" && condition.value === "www.thejerseycourier.com"))), false);
});
