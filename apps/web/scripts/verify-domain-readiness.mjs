#!/usr/bin/env node

const requestedOrigin = process.argv.slice(2).find((argument) => argument !== "--") ?? process.env.DOMAIN_CHECK_ORIGIN;

if (!requestedOrigin) {
  console.error("Usage: pnpm domain:verify -- https://your-canonical-origin.example");
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
    name: "homepage canonical metadata",
    path: "/",
    status: 200,
    validate(response, body) {
      const canonical = body.match(/<link[^>]*rel="canonical"[^>]*href="([^"]+)"/i)?.[1];
      const openGraph = body.match(/<meta[^>]*property="og:url"[^>]*content="([^"]+)"/i)?.[1];
      return response.headers.get("content-type")?.includes("text/html")
        && canonical !== undefined
        && openGraph !== undefined
        && new URL(canonical).origin === origin
        && new URL(openGraph).origin === origin;
    },
  },
  {
    name: "robots origin",
    path: "/robots.txt",
    status: 200,
    validate(_response, body) {
      return body.includes(`Host: ${origin}`) && body.includes(`Sitemap: ${origin}/sitemap.xml`) && body.includes(`Sitemap: ${origin}/news-sitemap.xml`);
    },
  },
  {
    name: "general sitemap",
    path: "/sitemap.xml",
    status: 200,
    validate(response, body) {
      return response.headers.get("content-type")?.includes("xml") && body.includes(`<loc>${origin}`);
    },
  },
  {
    name: "news sitemap",
    path: "/news-sitemap.xml",
    status: 200,
    validate(response, body) {
      return response.headers.get("content-type")?.includes("xml") && body.includes("xmlns:news=");
    },
  },
  {
    name: "RSS self link",
    path: "/feed.xml",
    status: 200,
    validate(response, body) {
      return response.headers.get("content-type")?.includes("rss+xml") && body.includes(`href="${origin}/feed.xml"`);
    },
  },
  {
    name: "public API",
    path: "/api/v1/config",
    status: 200,
    validate(response, body) {
      if (!response.headers.get("content-type")?.includes("application/json")) return false;
      const payload = JSON.parse(body);
      return payload?.data?.name === "The New Jersey Courier";
    },
  },
  {
    name: "Studio callback route",
    path: "/studio/sign-in/sso-callback",
    status: 200,
    validate(response) {
      return response.headers.get("x-robots-tag")?.includes("noindex") ?? false;
    },
  },
  {
    name: "employee iOS association",
    path: "/.well-known/apple-app-site-association",
    status: 200,
    validate(response, body) {
      if (!response.headers.get("content-type")?.includes("application/json")) return false;
      return Array.isArray(JSON.parse(body)?.applinks?.details);
    },
  },
  {
    name: "employee Android association",
    path: "/.well-known/assetlinks.json",
    status: 200,
    validate(response, body) {
      if (!response.headers.get("content-type")?.includes("application/json")) return false;
      return Array.isArray(JSON.parse(body));
    },
  },
];

let failed = false;
for (const check of checks) {
  try {
    const response = await fetch(`${origin}${check.path}`, { redirect: "follow", signal: AbortSignal.timeout(15_000) });
    const body = await response.text();
    const finalOrigin = new URL(response.url).origin;
    const passed = response.status === check.status && finalOrigin === origin && check.validate(response, body);
    console.log(`${passed ? "PASS" : "FAIL"}  ${check.name} (${response.status} ${check.path})`);
    if (!passed) failed = true;
  } catch (error) {
    failed = true;
    console.log(`FAIL  ${check.name} (${error instanceof Error ? error.message : "request failed"})`);
  }
}

if (failed) process.exit(1);
console.log(`Domain surface verified for ${origin}`);
