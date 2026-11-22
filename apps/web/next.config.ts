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
const courierCutHostname =
  process.env.NEXT_PUBLIC_COURIER_CUT_HOST ?? "cut.thejerseycourier.com";
const distributionHostname =
  process.env.NEXT_PUBLIC_DISTRIBUTION_HOST ??
  "distribution.thejerseycourier.com";
const pressHostname =
  process.env.NEXT_PUBLIC_PRESS_HOST ?? "press.thejerseycourier.com";
const linksHostname =
  process.env.NEXT_PUBLIC_LINKS_HOST ?? "links.thejerseycourier.com";
const pressSubdomainEnabled = process.env.PRESS_SUBDOMAIN_ENABLED === "true";
const canonicalSiteHostname = new URL(canonicalSiteOrigin).hostname;
const studioOrigin = `https://${studioHostname}`;
const apiOrigin = `https://${apiHostname}`;
const plusOrigin = `https://${plusHostname}`;
const distributionOrigin = `https://${distributionHostname}`;
const pressOrigin = `https://${pressHostname}`;
const futureRedirectHostnames = [
  "support.thejerseycourier.com",
  "careers.thejerseycourier.com",
  "events.thejerseycourier.com",
  "live.thejerseycourier.com",
  "weather.thejerseycourier.com",
  "newsletters.thejerseycourier.com",
  "ads.thejerseycourier.com",
  "account.thejerseycourier.com",
] as const;
const studioSections = [
  "20-under-20",
  "analytics",
  "chat",
  "commands",
  "community",
  "distribution",
  "exports",
  "finance",
  "legal",
  "links",
  "live",
  "mag-engine",
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
  allowedDevOrigins: ["*.vercel.run"],
  transpilePackages: ["@harborline/backend", "@harborline/contracts", "@harborline/media-player", "@njcourier/domain-registry"],
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
    "/api/v1/press-portal/requests/[id]/submit": ["./public/assets/**/*"],
    "/api/v1/studio/press-kit/requests/[id]": ["./public/assets/**/*"],
  },
  async headers() {
    return [
      {
        source: "/njc-push-sw.js",
        headers: [
          {
            key: "Content-Type",
            value: "application/javascript; charset=utf-8",
          },
          {
            key: "Cache-Control",
            value: "public, max-age=0, must-revalidate",
          },
          { key: "Service-Worker-Allowed", value: "/" },
          { key: "Content-Security-Policy", value: "default-src 'self'" },
        ],
      },
      {
        source: "/manifest.webmanifest",
        headers: [
          {
            key: "Content-Type",
            value: "application/manifest+json; charset=utf-8",
          },
          { key: "Cache-Control", value: "public, max-age=0, must-revalidate" },
        ],
      },
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
    ];
  },
  async redirects() {
    return [
      {
        source: "/rss",
        destination: "/rss.xml",
        permanent: false,
      },
      {
        source: "/stories",
        destination: "/news",
        permanent: false,
      },
      {
        source: "/story/:slug",
        destination: "/news/:slug",
        permanent: false,
      },
      {
        source: "/:slug",
        has: onHost(studioHostname),
        destination: `${studioOrigin}/:slug`,
        permanent: false,
      },
      {
        source: "/admin",
        has: onHost(canonicalSiteHostname),
        destination: studioOrigin,
        permanent: true,
      },
      {
        source: "/admin/:path*",
        has: onHost(canonicalSiteHostname),
        destination: `${studioOrigin}/:path*`,
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
        source: "/plus",
        has: onHost(canonicalSiteHostname),
        destination: plusOrigin,
        permanent: true,
      },
      {
        source: "/press",
        has: onHost(canonicalSiteHostname),
        destination: pressOrigin,
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
        {
          source: "/",
          has: onHost(pressHostname),
          destination: "/press-portal",
        },
        {
          source: "/:slug",
          has: onHost(linksHostname),
          destination: "/link-in-bio/:slug",
        },
        {
          source: "/",
          has: onHost(linksHostname),
          destination: "/link-in-bio",
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
          source: "/:slug",
          has: onHost(courierCutHostname),
          destination: "/plus/:slug?courier_cut=1",
        },
        {
          source: "/",
          has: onHost(courierCutHostname),
          destination: "/courier-cut",
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
