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
const distributionHostname =
  process.env.NEXT_PUBLIC_DISTRIBUTION_HOST ??
  "distribution.thejerseycourier.com";
const canonicalSiteHostname = new URL(canonicalSiteOrigin).hostname;
const studioOrigin = `https://${studioHostname}`;
const apiOrigin = `https://${apiHostname}`;
const plusOrigin = `https://${plusHostname}`;
const distributionOrigin = `https://${distributionHostname}`;
const studioSections = [
  "20-under-20",
  "analytics",
  "chat",
  "commands",
  "distribution",
  "exports",
  "finance",
  "legal",
  "media",
  "njc-plus",
  "notifications",
  "press",
  "press-releases",
  "profile",
  "settings",
  "sign-in",
  "stories",
  "team",
  "tips",
] as const;

function onHost(value: string) {
  return [{ type: "host" as const, value }];
}

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
      {
        source: "/:path*",
        has: onHost(studioHostname),
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" }],
      },
      {
        source: "/:path*",
        has: onHost(apiHostname),
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
      {
        source: "/distribution/:path*",
        headers: [
          {
            key: "X-Robots-Tag",
            value: "noindex, nofollow, noarchive, nosnippet",
          },
          { key: "Referrer-Policy", value: "no-referrer" },
          { key: "X-Frame-Options", value: "DENY" },
        ],
      },
      {
        source: "/:path*",
        has: onHost(distributionHostname),
        headers: [
          {
            key: "X-Robots-Tag",
            value: "noindex, nofollow, noarchive, nosnippet",
          },
          { key: "Referrer-Policy", value: "no-referrer" },
          { key: "X-Frame-Options", value: "DENY" },
        ],
      },
    ];
  },
  async redirects() {
    return [
      {
        source: "/analytics",
        has: onHost(canonicalSiteHostname),
        destination: `${studioOrigin}/analytics`,
        permanent: true,
      },
      {
        source: "/studio",
        has: onHost(canonicalSiteHostname),
        destination: studioOrigin,
        permanent: true,
      },
      {
        source: "/studio/:path*",
        has: onHost(canonicalSiteHostname),
        destination: `${studioOrigin}/:path*`,
        permanent: true,
      },
      {
        source: "/studio",
        has: onHost(studioHostname),
        destination: studioOrigin,
        permanent: true,
      },
      {
        source: "/studio/:path*",
        has: onHost(studioHostname),
        destination: `${studioOrigin}/:path*`,
        permanent: true,
      },
      {
        source: "/plus",
        has: onHost(canonicalSiteHostname),
        destination: plusOrigin,
        permanent: true,
      },
      {
        source: "/plus/:path*",
        has: onHost(canonicalSiteHostname),
        destination: `${plusOrigin}/:path*`,
        permanent: true,
      },
      {
        source: "/plus",
        has: onHost(plusHostname),
        destination: plusOrigin,
        permanent: true,
      },
      {
        source: "/plus/:path*",
        has: onHost(plusHostname),
        destination: `${plusOrigin}/:path*`,
        permanent: true,
      },
      {
        source: "/developers",
        has: onHost(canonicalSiteHostname),
        destination: apiOrigin,
        permanent: true,
      },
      {
        source: "/distribution",
        has: onHost(canonicalSiteHostname),
        destination: distributionOrigin,
        permanent: true,
      },
      {
        source: "/distribution/:path*",
        has: onHost(canonicalSiteHostname),
        destination: `${distributionOrigin}/:path*`,
        permanent: true,
      },
      {
        source: "/distribution",
        has: onHost(distributionHostname),
        destination: distributionOrigin,
        permanent: true,
      },
      {
        source: "/distribution/:path*",
        has: onHost(distributionHostname),
        destination: `${distributionOrigin}/:path*`,
        permanent: true,
      },
      {
        source: "/docs",
        has: onHost(apiHostname),
        destination: apiOrigin,
        permanent: true,
      },
      // Authentication callbacks may still return to the internal portal path.
      // Settle those requests on the clean API hostname root as well.
      {
        source: "/developers",
        has: onHost(apiHostname),
        destination: apiOrigin,
        permanent: true,
      },
    ];
  },
  async rewrites() {
    return {
      beforeFiles: [
        {
          source: "/",
          has: onHost(studioHostname),
          destination: "/studio",
        },
        ...studioSections.flatMap((section) => [
          {
            source: `/${section}`,
            has: onHost(studioHostname),
            destination: `/studio/${section}`,
          },
          {
            source: `/${section}/:path*`,
            has: onHost(studioHostname),
            destination: `/studio/${section}/:path*`,
          },
        ]),
        {
          source: "/",
          has: onHost(apiHostname),
          destination: "/developers",
        },
        {
          source: "/",
          has: onHost(distributionHostname),
          destination: "/distribution",
        },
        ...["package", "file", "item"].flatMap((section) => [
          {
            source: `/${section}/:path*`,
            has: onHost(distributionHostname),
            destination: `/distribution/${section}/:path*`,
          },
        ]),
        {
          source: "/:slug",
          has: onHost(plusHostname),
          destination: "/plus/:slug",
        },
        {
          source: "/",
          has: onHost(plusHostname),
          destination: "/plus",
        },
        ...["watch", "listen", "live", "search", "join"].map((section) => ({
          source: `/${section}`,
          has: onHost(plusHostname),
          destination: `/plus/${section}`,
        })),
        {
          source: "/join/:path*",
          has: onHost(plusHostname),
          destination: "/plus/join/:path*",
        },
        {
          source: "/v1/:path*",
          has: onHost(apiHostname),
          destination: "/api/v1/:path*",
        },
        {
          source: "/developer/:path*",
          has: onHost(apiHostname),
          destination: "/api/developer/:path*",
        },
      ],
      afterFiles: [],
      fallback: [],
    };
  },
};

export default nextConfig;
