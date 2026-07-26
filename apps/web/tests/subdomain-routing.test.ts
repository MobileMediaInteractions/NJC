import assert from "node:assert/strict";
import test from "node:test";
import nextConfig from "../next.config";

test("production subdomains have explicit host-aware routes", async () => {
  const redirects = await nextConfig.redirects?.();
  const rewrites = await nextConfig.rewrites?.();

  assert.ok(redirects);
  assert.ok(rewrites && !Array.isArray(rewrites));

  assert.ok(rewrites.beforeFiles?.some((route) =>
    route.source === "/" &&
    route.destination === "/studio" &&
    route.has?.some((condition) =>
      condition.type === "host" &&
      condition.value === "studio.thejerseycourier.com"
    )
  ));
  assert.ok(rewrites.beforeFiles?.some((route) =>
    route.source === "/stories/:path*" &&
    route.destination === "/studio/stories/:path*" &&
    route.has?.some((condition) =>
      condition.type === "host" &&
      condition.value === "studio.thejerseycourier.com"
    )
  ));
  assert.ok(redirects.some((route) =>
    route.source === "/studio/:path*" &&
    route.destination === "https://studio.thejerseycourier.com/:path*" &&
    route.permanent === true &&
    route.has?.some((condition) =>
      condition.type === "host" &&
      condition.value === "www.thejerseycourier.com"
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
  assert.ok(rewrites.beforeFiles?.some((route) =>
    route.source === "/" &&
    route.destination === "/developers" &&
    route.has?.some((condition) =>
      condition.type === "host" &&
      condition.value === "api.thejerseycourier.com"
    )
  ));
  assert.ok(redirects.some((route) =>
    route.source === "/developers" &&
    route.destination === "https://api.thejerseycourier.com" &&
    route.permanent === true &&
    route.has?.some((condition) =>
      condition.type === "host" &&
      condition.value === "api.thejerseycourier.com"
    )
  ));
});
