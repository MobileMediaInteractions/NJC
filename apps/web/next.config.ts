import type { NextConfig } from "next";

const configuredAssetUrl = process.env.NEXT_PUBLIC_ASSET_ORIGIN
  ? new URL(process.env.NEXT_PUBLIC_ASSET_ORIGIN)
  : undefined;

const canonicalSiteOrigin =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ??
  "https://www.thejerseycourier.com";
const studioHostname =
  process.env.NEXT_PUBLIC_STUDIO_HOST ?? "studio.thejerseycourier.com";
const apiHostname =
  process.env.NEXT_PUBLIC_API_HOST ?? "api.thejerseycourier.com";
const plusHostname =
  process.env.NEXT_PUBLIC_PLUS_HOST ?? "plus.thejerseycourier.com";

const nextConfig: NextConfig = {
  transpilePackages: ["@harborline/backend", "@harborline/contracts"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      ...(configuredAssetUrl
        ? [
            {
              protocol: configuredAssetUrl.protocol.replace(":", "") as
                | "http"
                | "https",
              hostname: configuredAssetUrl.hostname,
              port: configuredAssetUrl.port,
              pathname: "/assets/**",
            },
          ]
        : []),
      {
        protocol: "https",
        hostname: "*.public.blob.vercel-storage.com",
      },
    ],
  },
  experimental: {
    typedEnv: true,
  },
  outputFileTracingIncludes: {
    "/api/v1/studio/exports": ["./drizzle/**/*"],
    "/api/v1/press-kit": ["./public/assets/**/*"],
  },
  async headers() {
    return [
      {
        source: "/api/:path*",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
      {
        source: "/studio/:path*",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" }],
      },
    ];
  },
  async redirects() {
    return [
      {
        source: "/",
        has: [{ type: "host", value: studioHostname }],
        destination: "/studio",
        permanent: false,
      },
      {
        source: "/",
        has: [{ type: "host", value: apiHostname }],
        destination: `${canonicalSiteOrigin}/developers`,
        permanent: false,
      },
      {
        source: "/:path*",
        has: [{ type: "host", value: plusHostname }],
        destination: `${canonicalSiteOrigin}/:path*`,
        // NJC+ is intentionally temporary. Avoid a browser-cached 308 so this
        // hostname can become a first-class product without a migration.
        permanent: false,
      },
    ];
  },
  async rewrites() {
    return {
      beforeFiles: [
        {
          source: "/v1/:path*",
          has: [{ type: "host", value: apiHostname }],
          destination: "/api/v1/:path*",
        },
        {
          source: "/developer/:path*",
          has: [{ type: "host", value: apiHostname }],
          destination: "/api/developer/:path*",
        },
        {
          source: "/docs",
          has: [{ type: "host", value: apiHostname }],
          destination: "/developers",
        },
      ],
      afterFiles: [],
      fallback: [],
    };
  },
};

export default nextConfig;
