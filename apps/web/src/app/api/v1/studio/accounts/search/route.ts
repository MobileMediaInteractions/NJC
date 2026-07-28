import { NextResponse } from "next/server";
import { getStudioUser } from "@/lib/auth";
import { studioAccountSearchSchema } from "@/lib/studio-account-policy";
import { searchStudioAccounts } from "@/lib/studio-accounts";

export async function GET(request: Request) {
  const viewer = await getStudioUser();
  if (!viewer || viewer.role !== "admin") {
    return NextResponse.json(
      { error: { code: "forbidden", message: "Administrator access is required" } },
      { status: 403 },
    );
  }

  const parsed = studioAccountSearchSchema.safeParse(
    Object.fromEntries(new URL(request.url).searchParams),
  );
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "invalid_query", message: "Enter an account name, username, email address, or exact account ID" } },
      { status: 400 },
    );
  }

  try {
    const accounts = await searchStudioAccounts(parsed.data.q, parsed.data.limit);
    return NextResponse.json(
      { data: accounts, meta: { apiVersion: "1", count: accounts.length } },
      {
        headers: {
          "Cache-Control": "private, no-store",
          "X-Robots-Tag": "noindex, nofollow",
        },
      },
    );
  } catch (error) {
    console.error("Studio account search failed", error);
    return NextResponse.json(
      { error: { code: "identity_unavailable", message: "Account search is temporarily unavailable" } },
      { status: 503 },
    );
  }
}
