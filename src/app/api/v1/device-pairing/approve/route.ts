import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/db";
import { devicePairingRequests } from "@/db/schema";
import { getAccountIdentity } from "@/lib/auth";
import {
  isDevicePairingConfigured,
  normalizeUserCode,
  pairingApprovalAllowed,
  pairingHash,
  recordPairingApprovalAttempt,
  safePairingHashEqual,
} from "@/lib/device-pairing";

const inputSchema = z.object({
  code: z.string().min(6).max(12),
  target: z.enum(["tv", "web"]),
});

export async function POST(request: Request) {
  const identity = await getAccountIdentity().catch(() => null);
  if (!identity)
    return NextResponse.json(
      {
        error: {
          code: "unauthorized",
          message: "Sign in with a verified account before approving a device",
        },
      },
      { status: 401 },
    );
  if (!isDevicePairingConfigured())
    return NextResponse.json(
      {
        error: {
          code: "service_not_configured",
          message: "Device pairing is not configured",
        },
      },
      { status: 503 },
    );
  const parsed = inputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json(
      {
        error: {
          code: "invalid_request",
          message: "Enter the matching sync code",
        },
      },
      { status: 400 },
    );
  const normalizedCode = normalizeUserCode(parsed.data.code);
  const db = getDb();
  if (!(await pairingApprovalAllowed(identity.clerkId)))
    return NextResponse.json(
      {
        error: {
          code: "rate_limit_exceeded",
          message: "Too many approval attempts. Try again in ten minutes.",
        },
      },
      { status: 429, headers: { "Retry-After": "600" } },
    );
  const [pairing] = await db
    .select()
    .from(devicePairingRequests)
    .where(
      and(
        eq(devicePairingRequests.userCodeHash, pairingHash(normalizedCode)),
        eq(devicePairingRequests.target, parsed.data.target),
        eq(devicePairingRequests.status, "pending"),
      ),
    )
    .limit(1);
  if (!pairing || !safePairingHashEqual(normalizedCode, pairing.userCodeHash)) {
    await recordPairingApprovalAttempt(identity.clerkId, request, false);
    return NextResponse.json(
      {
        error: {
          code: "code_mismatch",
          message: "No active device has that sync code",
        },
      },
      { status: 404 },
    );
  }
  await recordPairingApprovalAttempt(identity.clerkId, request, true);
  if (pairing.expiresAt <= new Date())
    return NextResponse.json(
      {
        error: {
          code: "pairing_expired",
          message: "That sync code expired. Start again on the other device.",
        },
      },
      { status: 409 },
    );
  if (pairing.approvalAttempts >= 5)
    return NextResponse.json(
      {
        error: {
          code: "pairing_locked",
          message: "That pairing request is locked",
        },
      },
      { status: 429 },
    );
  const [approved] = await db
    .update(devicePairingRequests)
    .set({
      status: "approved",
      approvedByClerkId: identity.clerkId,
      approvedByName: identity.name,
      approvedAt: new Date(),
    })
    .where(
      and(
        eq(devicePairingRequests.id, pairing.id),
        eq(devicePairingRequests.status, "pending"),
      ),
    )
    .returning({ id: devicePairingRequests.id });
  if (!approved)
    return NextResponse.json(
      {
        error: {
          code: "pairing_unavailable",
          message: "That pairing request was already handled",
        },
      },
      { status: 409 },
    );
  return NextResponse.json({
    data: { approved: true, target: pairing.target },
    meta: { apiVersion: "1" },
  });
}
