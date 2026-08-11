import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@harborline/backend", "@harborline/contracts"],
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive, nosnippet" },
          { key: "Cache-Control", value: "private, no-store" },
          { key: "Referrer-Policy", value: "no-referrer" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
          { key: "Content-Security-Policy", value: "default-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'; object-src 'none'; script-src 'self' 'unsafe-inline' https://*.clerk.accounts.dev https://clerk.thejerseycourier.com https://challenges.cloudflare.com; style-src 'self' 'unsafe-inline'; connect-src 'self' https://*.clerk.accounts.dev https://clerk.thejerseycourier.com; img-src 'self' data: https://img.clerk.com; frame-src https://*.clerk.accounts.dev https://clerk.thejerseycourier.com https://challenges.cloudflare.com https://accounts.google.com; worker-src 'self' blob:; upgrade-insecure-requests" }
        ],
      },
    ];
  },
};

export default nextConfig;
