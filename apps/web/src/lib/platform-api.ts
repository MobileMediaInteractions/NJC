import { NextResponse } from "next/server";
import { z } from "zod";
import { PlatformLicenseError } from "@/lib/platform-license-server";

export const applicationIdentitySchema = z.object({
  applicationId: z.string().uuid(),
  platform: z.enum(["web", "ios", "android", "tvos", "androidtv", "roku", "node"]),
  environment: z.enum(["development", "preview", "staging", "production"]),
  buildId: z.string().min(1).max(200),
  bundleOrPackageId: z.string().min(1).max(300).optional(),
  signingIdentity: z.string().min(1).max(500).optional(),
  host: z.string().min(1).max(300).optional(),
}).strict();

export const signedReceiptSchema = z.object({
  keyId: z.string().min(1).max(200),
  algorithm: z.literal("Ed25519"),
  payload: z.string().min(1).max(100_000),
  signature: z.string().min(1).max(2_000),
}).strict();

export function platformApiError(error: unknown) {
  if (error instanceof PlatformLicenseError) {
    return NextResponse.json({ error: { code: error.code, message: error.message } }, { status: error.status });
  }
  console.error(error);
  return NextResponse.json({ error: { code: "internal_error", message: "Licensing request failed" } }, { status: 500 });
}
