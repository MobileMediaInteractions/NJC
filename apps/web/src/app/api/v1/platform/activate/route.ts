import { NextResponse } from "next/server";
import { z } from "zod";
import { activateLicense } from "@/lib/platform-license-server";
import { applicationIdentitySchema, platformApiError } from "@/lib/platform-api";
import { enforcePlatformRateLimit } from "@/lib/platform-rate-limit";

export const runtime = "nodejs";

const schema = z.object({
  licenseKey: z.string().min(20).max(200),
  application: applicationIdentitySchema,
  pseudonymousDeviceId: z.string().min(16).max(500),
  idempotencyKey: z.string().min(16).max(200),
}).strict();

export async function POST(request: Request) {
  const limited = await enforcePlatformRateLimit(request, "activate");
  if (limited) return limited;
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: { code: "invalid_request", message: "Activation request is invalid", details: parsed.error.flatten() } }, { status: 400 });
  try {
    return NextResponse.json({ data: await activateLicense(parsed.data), meta: { apiVersion: "1" } }, { status: 201 });
  } catch (error) {
    return platformApiError(error);
  }
}
