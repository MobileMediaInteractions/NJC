import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@harborline/contracts"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },
  experimental: {
    typedEnv: true,
  },
  outputFileTracingIncludes: {
    "/api/v1/studio/exports": ["./drizzle/**/*"],
  },
};

export default nextConfig;
