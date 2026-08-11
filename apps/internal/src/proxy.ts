import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse, type NextRequest } from "next/server";
import { internalBoundaryConfigured, isAcceptedInternalHost } from "@/lib/internal-boundary";

export default clerkMiddleware(async (_auth, request: NextRequest) => {
  if (!internalBoundaryConfigured() || !isAcceptedInternalHost(request.headers.get("host"))) {
    return new NextResponse(null, { status: 421, headers: { "Cache-Control": "private, no-store" } });
  }

  // This is a cheap defense-in-depth check. The server verifies the signed
  // Cloudflare Access JWT before reading any privileged identity or data.
  if (!request.headers.get("cf-access-jwt-assertion") || !request.headers.get("x-njc-internal-origin")) {
    return new NextResponse(null, { status: 421, headers: { "Cache-Control": "private, no-store" } });
  }
  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
