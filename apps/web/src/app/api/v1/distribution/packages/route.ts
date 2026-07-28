import { NextResponse } from "next/server";
import {
  getDistributionIdentity,
  getDistributionLibrary,
} from "@/lib/distribution";

export async function GET() {
  const identity = await getDistributionIdentity();
  if (!identity) {
    return NextResponse.json(
      { error: { code: "unauthorized", message: "Verified sign-in required" } },
      { status: 401 },
    );
  }
  const packages = await getDistributionLibrary(identity.clerkId);
  return NextResponse.json(
    { data: packages, meta: { apiVersion: "1", count: packages.length } },
    {
      headers: {
        "Cache-Control": "private, no-store",
        "X-Robots-Tag": "noindex, nofollow, noarchive",
      },
    },
  );
}
