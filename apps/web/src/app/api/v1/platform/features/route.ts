import { NextResponse } from "next/server";
import { z } from "zod";
import { validateReceipt } from "@/lib/platform-license-server";
import { applicationIdentitySchema, platformApiError, signedReceiptSchema } from "@/lib/platform-api";
import { enforcePlatformRateLimit } from "@/lib/platform-rate-limit";

export const runtime = "nodejs";
const schema = z.object({ receipt: signedReceiptSchema, application: applicationIdentitySchema, productId: z.string().uuid() }).strict();

export async function POST(request: Request) {
  const limited = await enforcePlatformRateLimit(request, "validate");
  if (limited) return limited;
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: { code: "invalid_request", message: "Feature request is invalid" } }, { status: 400 });
  try {
    const validation = await validateReceipt(parsed.data.receipt, parsed.data.application, parsed.data.productId);
    if (!validation.ok) return NextResponse.json({ error: { code: validation.code, message: validation.message } }, { status: 403 });
    return NextResponse.json({ data: { features: validation.claims.entitledFeatures, usageLimits: validation.claims.usageLimits, leaseExpiresAt: validation.claims.leaseExpiresAt }, meta: { apiVersion: "1" } });
  } catch (error) {
    return platformApiError(error);
  }
}
