import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@harborline/backend/db";
import { devicePairingRequests } from "@harborline/backend/schema";
import { getAccountIdentity } from "@/lib/auth";
import {
  isDevicePairingConfigured,
  pairingRequestExpired,
  safePairingHashEqual,
} from "@/lib/device-pairing";

export const runtime = "nodejs";

const inputSchema = z.object({ claimNonce: z.string().min(48).max(120) });

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const identity = await getAccountIdentity().catch(() => null);
  if (!identity)
    return NextResponse.json(
      { error: { code: "unauthorized", message: "Sign in before changing this request" } },
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
      { error: { code: "invalid_request", message: "This denial request is invalid" } },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );

  const { id } = await context.params;
  const db = getDb();
  const [pairing] = await db
    .select()
    .from(devicePairingRequests)
    .where(eq(devicePairingRequests.id, id))
    .limit(1);
  if (
    !pairing ||
    pairing.status !== "processing" ||
    pairingRequestExpired(pairing) ||
    pairing.claimedByClerkId !== identity.clerkId ||
    !safePairingHashEqual(parsed.data.claimNonce, pairing.claimNonceHash)
  )
    return NextResponse.json(
      { error: { code: "pairing_unavailable", message: "This request can no longer be denied" } },
      { status: 409, headers: { "Cache-Control": "no-store" } },
    );

  const [denied] = await db
    .update(devicePairingRequests)
    .set({ status: "denied" })
    .where(
      and(
        eq(devicePairingRequests.id, id),
        eq(devicePairingRequests.status, "processing"),
        eq(devicePairingRequests.claimedByClerkId, identity.clerkId),
      ),
    )
    .returning({ id: devicePairingRequests.id });
  if (!denied)
    return NextResponse.json(
      { error: { code: "pairing_conflict", message: "This request changed before it could be denied" } },
      { status: 409, headers: { "Cache-Control": "no-store" } },
    );
  return NextResponse.json(
    { data: { status: "denied" }, meta: { apiVersion: "1" } },
    { headers: { "Cache-Control": "no-store" } },
  );
}
