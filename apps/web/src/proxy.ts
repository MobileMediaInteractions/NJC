import { clerkMiddleware } from "@clerk/nextjs/server";

export default clerkMiddleware();

export const config = {
  matcher: [
    // Clean Studio, API-portal, and NJC+ subdomain paths are rewritten to
    // their internal routes after proxy matching. Clerk must therefore run
    // on those service hosts before the rewrite, while public news routes on
    // the primary site continue to bypass Clerk.
    {
      source:
        "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
      has: [
        {
          type: "header",
          key: "host",
          value:
            "(?:studio|api|plus|distribution)\\.thejerseycourier\\.com(?::\\d+)?",
        },
      ],
    },
    "/studio/:path*",
    "/developers",
    "/profile/:path*",
    "/plus/:path*",
    "/distribution/:path*",
    "/sign-in/:path*",
    "/sign-up/:path*",
    "/api/v1/studio/:path*",
    "/api/v1/plus/:path*",
    "/api/v1/distribution/:path*",
    "/api/v1/employee/:path*",
    "/api/v1/developer/keys/:path*",
    "/api/v1/mobile/admin/:path*",
    "/api/v1/mobile/push/register",
    "/api/v1/data-requests",
    "/api/v1/audience/presence",
    "/api/v1/device-pairing/approve",
    "/api/v1/device-pairing/:id/approve",
  ],
};
