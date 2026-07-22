import { clerkMiddleware } from "@clerk/nextjs/server";

export default clerkMiddleware();

export const config = {
  matcher: [
    "/studio/:path*",
    "/developers",
    "/sign-in/:path*",
    "/sign-up/:path*",
    "/api/v1/studio/:path*",
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
