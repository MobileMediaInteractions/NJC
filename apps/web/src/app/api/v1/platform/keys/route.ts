import { NextResponse } from "next/server";
import { getPublicVerificationKeys } from "@/lib/platform-license-server";
import { platformApiError } from "@/lib/platform-api";

export const runtime = "nodejs";

export async function GET() {
  try {
    return NextResponse.json({ data: await getPublicVerificationKeys(), meta: { apiVersion: "1", cacheSeconds: 300 } }, {
      headers: { "Cache-Control": "public, max-age=300, stale-while-revalidate=3600" },
    });
  } catch (error) {
    return platformApiError(error);
  }
}
