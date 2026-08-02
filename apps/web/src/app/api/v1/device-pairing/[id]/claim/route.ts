import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@harborline/backend/db";
import { devicePairingRequests } from "@harborline/backend/schema";
import { getAccountIdentity } from "@/lib/auth";
import {
  isDevicePairingConfigured,
  normalizeUserCode,
  pairingProcessingLifetimeSeconds,
  pairingRequestExpired,
  safePairingHashEqual,
} from "@/lib/device-pairing";

export const runtime = "nodejs";

const inputSchema = z.object({
  code: z.string().min(6).max(12),
  target: z.enum(["tv", "androidtv", "roku", "web"]),
  claimNonce: z.string().min(48).max(120),
});

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const identity = await getAccountIdentity().catch(() => null);
  if (!identity)
    return NextResponse.json(
      { error: { code: "unauthorized", message: "Sign in before scanning another device" } },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  if (!isDevicePairingConfigured())
    return NextResponse.json(
      { error: { code: "service_not_configured", message: "Device pairing is not configured" } },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );

  const parsed = inputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json(
      { error: { code: "invalid_request", message: "This QR sign-in request is invalid" } },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );

  const { id } = await context.params;
  const db = getDb();
  const [pairing] = await db
    .select()
    .from(devicePairingRequests)
    .where(eq(devicePairingRequests.id, id))
    .limit(1);
  const valid =
    pairing &&
    pairing.target === parsed.data.target &&
    safePairingHashEqual(normalizeUserCode(parsed.data.code), pairing.userCodeHash) &&
    safePairingHashEqual(parsed.data.claimNonce, pairing.claimNonceHash);
  if (!valid)
    return NextResponse.json(
      { error: { code: "pairing_not_found", message: "This QR sign-in request is unavailable" } },
      { status: 404, headers: { "Cache-Control": "no-store" } },
    );
  if (pairing.status !== "pending" || pairingRequestExpired(pairing)) {
    if (pairing.status === "pending")
      await db
        .update(devicePairingRequests)
        .set({ status: "expired" })
        .where(and(eq(devicePairingRequests.id, id), eq(devicePairingRequests.status, "pending")));
    return NextResponse.json(
      { error: { code: "pairing_unavailable", message: "This QR code expired or is already being processed" } },
      { status: 409, headers: { "Cache-Control": "no-store" } },
    );
  }

  const now = new Date();
  const processingExpiresAt = new Date(
    now.getTime() + pairingProcessingLifetimeSeconds * 1_000,
  );
  const [claimed] = await db
    .update(devicePairingRequests)
    .set({
      status: "processing",
      claimedByClerkId: identity.clerkId,
      claimedByName: identity.name,
      scanStartedAt: now,
      processingExpiresAt,
    })
    .where(
      and(
        eq(devicePairingRequests.id, id),
        eq(devicePairingRequests.status, "pending"),
      ),
    )
    .returning({ id: devicePairingRequests.id });
  if (!claimed)
    return NextResponse.json(
      { error: { code: "pairing_conflict", message: "Another scan is already being processed" } },
      { status: 409, headers: { "Cache-Control": "no-store" } },
    );

  return NextResponse.json(
    {
      data: {
        status: "processing",
        target: pairing.target,
        expiresAt: processingExpiresAt.toISOString(),
      },
      meta: { apiVersion: "1" },
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
