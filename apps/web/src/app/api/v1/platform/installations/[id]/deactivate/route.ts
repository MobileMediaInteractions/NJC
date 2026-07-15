import { NextResponse } from "next/server";
import { deactivateInstallation } from "@/lib/platform-license-server";
import { platformApiError } from "@/lib/platform-api";
import { signedReceiptSchema } from "@/lib/platform-api";
import { enforcePlatformRateLimit } from "@/lib/platform-rate-limit";

export const runtime = "nodejs";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const limited = await enforcePlatformRateLimit(request, "lease");
  if (limited) return limited;
  try {
    const { id } = await context.params;
    const parsed = signedReceiptSchema.safeParse((await request.json().catch(() => null))?.receipt);
    if (!parsed.success) return NextResponse.json({ error: { code: "invalid_request", message: "A current signed receipt is required" } }, { status: 400 });
    const deactivated = await deactivateInstallation(id, parsed.data);
    return NextResponse.json({ data: { deactivated }, meta: { apiVersion: "1" } }, { status: deactivated ? 200 : 404 });
  } catch (error) {
    return platformApiError(error);
  }
}
