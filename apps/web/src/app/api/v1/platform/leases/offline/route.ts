import { NextResponse } from "next/server";
import { z } from "zod";
import { refreshLease } from "@/lib/platform-license-server";
import { platformApiError } from "@/lib/platform-api";
import { signedReceiptSchema } from "@/lib/platform-api";
import { enforcePlatformRateLimit } from "@/lib/platform-rate-limit";

export const runtime = "nodejs";
const schema = z.object({ installationId: z.string().uuid(), receipt: signedReceiptSchema }).strict();

export async function POST(request: Request) {
  const limited = await enforcePlatformRateLimit(request, "lease");
  if (limited) return limited;
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: { code: "invalid_request", message: "Installation ID is invalid" } }, { status: 400 });
  try { return NextResponse.json({ data: await refreshLease(parsed.data.installationId, true, parsed.data.receipt), meta: { apiVersion: "1" } }); }
  catch (error) { return platformApiError(error); }
}
