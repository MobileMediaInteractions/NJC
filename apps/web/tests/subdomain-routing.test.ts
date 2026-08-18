import assert from "node:assert/strict";
import test from "node:test";
import nextConfig from "../next.config";
import { studioNavigationHubs } from "../src/lib/studio-navigation";

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
    route.source === "/distribution/:path*" &&
    route.destination === "/studio/distribution/:path*" &&
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
  assert.ok(rewrites.beforeFiles?.some((route) =>
    route.source === "/20-under-20" &&
    route.destination === "/studio/20-under-20" &&
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
  assert.ok(redirects.some((route) =>
    route.source === "/analytics" &&
    route.destination === "https://studio.thejerseycourier.com/analytics" &&
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
    route.source === "/" &&
    route.destination === "/courier-cut" &&
    route.has?.some((condition) =>
      condition.type === "host" &&
      condition.value === "cut.thejerseycourier.com"
    )
  ));
  assert.ok(rewrites.beforeFiles?.some((route) =>
    route.source === "/:slug" &&
    route.destination === "/plus/:slug?courier_cut=1" &&
    route.has?.some((condition) =>
      condition.type === "host" &&
      condition.value === "cut.thejerseycourier.com"
    )
  ));
  const plusSlugRewriteIndex = rewrites.beforeFiles?.findIndex((route) =>
    route.source === "/:slug" &&
    route.destination === "/plus/:slug"
  ) ?? -1;
  const plusRootRewriteIndex = rewrites.beforeFiles?.findIndex((route) =>
    route.source === "/" &&
    route.destination === "/plus" &&
    route.has?.some((condition) =>
      condition.type === "host" &&
      condition.value === "plus.thejerseycourier.com"
    )
  ) ?? -1;
  assert.ok(plusSlugRewriteIndex >= 0);
  assert.ok(plusRootRewriteIndex > plusSlugRewriteIndex);
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
  assert.ok(rewrites.beforeFiles?.some((route) =>
    route.source === "/" &&
    route.destination === "/distribution" &&
    route.has?.some((condition) =>
      condition.type === "host" &&
      condition.value === "distribution.thejerseycourier.com"
    )
  ));
  assert.ok(rewrites.beforeFiles?.some((route) =>
    route.source === "/file/:path*" &&
    route.destination === "/distribution/file/:path*" &&
    route.has?.some((condition) =>
      condition.type === "host" &&
      condition.value === "distribution.thejerseycourier.com"
    )
  ));
  assert.ok(redirects.some((route) =>
    route.source === "/distribution/:path*" &&
    route.destination === "https://distribution.thejerseycourier.com/:path*" &&
    route.permanent === true &&
    route.has?.some((condition) =>
      condition.type === "host" &&
      condition.value === "www.thejerseycourier.com"
    )
  ));
  assert.ok(rewrites.beforeFiles?.some((route) =>
    route.source === "/" &&
    route.destination === "/press-portal" &&
    route.has?.some((condition) => condition.type === "host" && condition.value === "press.thejerseycourier.com")
  ));
  assert.equal(redirects.some((route) =>
    route.source === "/press-portal" &&
    route.destination === "https://press.thejerseycourier.com" &&
    route.permanent === true &&
    route.has?.some((condition) => condition.type === "host" && condition.value === "www.thejerseycourier.com")
  ), false, "the main-domain fallback must remain available until DNS is explicitly activated");
  assert.ok(rewrites.beforeFiles?.some((route) =>
    route.source === "/" &&
    route.destination === "/link-in-bio" &&
    route.has?.some((condition) => condition.type === "host" && condition.value === "links.thejerseycourier.com")
  ));
  assert.ok(rewrites.beforeFiles?.some((route) =>
    route.source === "/:slug" &&
    route.destination === "/link-in-bio/:slug" &&
    route.has?.some((condition) => condition.type === "host" && condition.value === "links.thejerseycourier.com")
  ));
  const linkStoryRewriteIndex = rewrites.beforeFiles?.findIndex((route) =>
    route.source === "/:slug" && route.destination === "/link-in-bio/:slug"
  ) ?? -1;
  const linkRootRewriteIndex = rewrites.beforeFiles?.findIndex((route) =>
    route.source === "/" && route.destination === "/link-in-bio"
  ) ?? -1;
  assert.ok(
    linkStoryRewriteIndex >= 0 && linkStoryRewriteIndex < linkRootRewriteIndex,
    "the story rewrite must run before the root rewrite so Next does not rewrite the internal root a second time",
  );
  assert.equal(redirects.some((route) =>
    route.has?.some((condition) => condition.type === "host" && condition.value === "links.thejerseycourier.com")
  ), false, "the live Link in Bio hostname must not use the reserved-host redirect");
});

test("every clean Studio navigation section has a host rewrite", async () => {
  const rewrites = await nextConfig.rewrites?.();
  assert.ok(rewrites && !Array.isArray(rewrites));

  const rewrittenSections = new Set(
    rewrites.beforeFiles
      ?.filter((route) =>
        route.has?.some((condition) =>
          condition.type === "host" &&
          condition.value === "studio.thejerseycourier.com"
        )
      )
      .flatMap((route) => {
        const match = route.destination.match(/^\/studio\/([^/:]+)/);
        return match?.[1] ? [match[1]] : [];
      }),
  );
  const navigationSections = new Set(
    studioNavigationHubs
      .flatMap((hub) => hub.items)
      .flatMap((item) => {
        const match = item.href.match(/^\/studio\/([^/]+)/);
        return match?.[1] ? [match[1]] : [];
      }),
  );

  for (const section of navigationSections) {
    assert.equal(
      rewrittenSections.has(section),
      true,
      `Missing clean Studio-host rewrite for /${section}`,
    );
  }
});
