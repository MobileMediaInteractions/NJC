import type { NextConfig } from "next";

const configuredAssetUrl = process.env.NEXT_PUBLIC_ASSET_ORIGIN
  ? new URL(process.env.NEXT_PUBLIC_ASSET_ORIGIN)
  : undefined;

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
};

export default nextConfig;
