#!/usr/bin/env node

const requestedOrigin = process.argv.slice(2).find((argument) => argument !== "--")
  ?? process.env.PRESS_DOMAIN_CHECK_ORIGIN;

if (!requestedOrigin) {
  console.error("Usage: pnpm domain:verify:press -- https://press.example.com");
  process.exit(1);
}

let origin;
try {
  const parsed = new URL(requestedOrigin);
  if (parsed.protocol !== "https:" || parsed.username || parsed.password || parsed.pathname !== "/" || parsed.search || parsed.hash) {
    throw new Error("Use a credential-free HTTPS origin without a path, query, or fragment");
  }
  origin = parsed.origin;
} catch (error) {
  console.error(error instanceof Error ? error.message : "Invalid origin");
  process.exit(1);
}

const checks = [
  {
    name: "Press portal metadata",
    path: "/",
    status: 200,
    validate(response, body) {
      const canonical = body.match(/<link[^>]*rel="canonical"[^>]*href="([^"]+)"/i)?.[1];
      const openGraph = body.match(/<meta[^>]*property="og:url"[^>]*content="([^"]+)"/i)?.[1];
      return response.headers.get("content-type")?.includes("text/html")
        && canonical === origin
        && openGraph === origin
        && body.includes("Press &amp; Media");
    },
  },
  {
    name: "Legacy alias settles on the portal root",
    path: "/press",
    status: 200,
    validate(response) {
      return response.url === `${origin}/`;
    },
  },
  {
    name: "Press API cannot be indexed",
    path: "/api/v1/press-portal/assets",
    acceptableStatuses: new Set([200, 503]),
    validate(response) {
      return response.headers.get("x-robots-tag")?.includes("noindex") ?? false;
    },
  },
];

let failed = false;
for (const check of checks) {
  try {
    const response = await fetch(`${origin}${check.path}`, {
      redirect: "follow",
      signal: AbortSignal.timeout(15_000),
    });
    const body = await response.text();
    const accepted = check.acceptableStatuses?.has(response.status) ?? response.status === check.status;
    const passed = accepted && new URL(response.url).origin === origin && check.validate(response, body);
    console.log(`${passed ? "PASS" : "FAIL"}  ${check.name} (${response.status} ${check.path})`);
    if (!passed) failed = true;
  } catch (error) {
    failed = true;
    console.log(`FAIL  ${check.name} (${error instanceof Error ? error.message : "request failed"})`);
  }
}

if (failed) process.exit(1);
console.log(`Press & Media domain verified for ${origin}`);
