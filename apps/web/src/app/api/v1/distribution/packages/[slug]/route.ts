import { NextResponse } from "next/server";
import {
  getAuthorizedDistributionPackage,
  getDistributionIdentity,
} from "@/lib/distribution";

export async function GET(
  _request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  const identity = await getDistributionIdentity();
  if (!identity) {
    return NextResponse.json(
      { error: { code: "unauthorized", message: "Verified sign-in required" } },
      { status: 401 },
    );
  }
  const record = await getAuthorizedDistributionPackage(
    identity.clerkId,
    (await context.params).slug,
  );
  if (!record) {
    return NextResponse.json(
      { error: { code: "not_found", message: "Package not found" } },
      { status: 404 },
    );
  }
  return NextResponse.json(
    { data: record, meta: { apiVersion: "1" } },
    {
      headers: {
        "Cache-Control": "private, no-store",
        "X-Robots-Tag": "noindex, nofollow, noarchive",
      },
    },
  );
}
