import assert from "node:assert/strict";
import test from "node:test";
import nextConfig from "../next.config";

test("production subdomains have explicit host-aware routes", async () => {
  const redirects = await nextConfig.redirects?.();
  const rewrites = await nextConfig.rewrites?.();

  assert.ok(redirects);
  assert.ok(rewrites && !Array.isArray(rewrites));

  assert.ok(redirects.some((route) =>
    route.source === "/" &&
    route.destination === "/studio" &&
    route.has?.some((condition) =>
      condition.type === "host" &&
      condition.value === "studio.thejerseycourier.com"
    )
  ));
  assert.ok(rewrites.beforeFiles?.some((route) =>
    route.source === "/" &&
    route.destination === "/plus" &&
    route.has?.some((condition) =>
      condition.type === "host" &&
      condition.value === "plus.thejerseycourier.com"
    )
  ));
  assert.ok(rewrites.beforeFiles?.some((route) =>
    route.source === "/v1/:path*" &&
    route.destination === "/api/v1/:path*" &&
    route.has?.some((condition) =>
      condition.type === "host" &&
      condition.value === "api.thejerseycourier.com"
    )
  ));
});
