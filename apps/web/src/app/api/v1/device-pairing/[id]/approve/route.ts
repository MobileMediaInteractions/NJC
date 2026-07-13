import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@harborline/backend/db";
import { devicePairingRequests } from "@harborline/backend/schema";
import { getAccountIdentity } from "@/lib/auth";
import {
  isDevicePairingConfigured,
  normalizeUserCode,
  pairingApprovalAllowed,
  recordPairingApprovalAttempt,
  safePairingHashEqual,
} from "@/lib/device-pairing";

const inputSchema = z.object({
  code: z.string().min(6).max(12),
  target: z.enum(["tv", "web"]),
});

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
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

  const { id } = await context.params;
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
    .where(eq(devicePairingRequests.id, id))
    .limit(1);
  if (!pairing || pairing.target !== parsed.data.target)
    return NextResponse.json(
      {
        error: {
          code: "pairing_not_found",
          message: "This pairing request is unavailable",
        },
      },
      { status: 404 },
    );
  if (pairing.expiresAt <= new Date() || pairing.status !== "pending")
    return NextResponse.json(
      {
        error: {
          code: "pairing_unavailable",
          message: "This pairing request is expired or already used",
        },
      },
      { status: 409 },
    );
  if (pairing.approvalAttempts >= 5)
    return NextResponse.json(
      {
        error: {
          code: "pairing_locked",
          message:
            "Too many incorrect code attempts. Start again on the other device.",
        },
      },
      { status: 429 },
    );
  const codeMatches = safePairingHashEqual(
    normalizeUserCode(parsed.data.code),
    pairing.userCodeHash,
  );
  if (!codeMatches) {
    await recordPairingApprovalAttempt(identity.clerkId, request, false);
    await db
      .update(devicePairingRequests)
      .set({ approvalAttempts: pairing.approvalAttempts + 1 })
      .where(
        and(
          eq(devicePairingRequests.id, id),
          eq(devicePairingRequests.status, "pending"),
        ),
      );
    return NextResponse.json(
      {
        error: {
          code: "code_mismatch",
          message: "The sync codes do not match. Do not approve this device.",
        },
      },
      { status: 400 },
    );
  }
  await recordPairingApprovalAttempt(identity.clerkId, request, true);
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
        eq(devicePairingRequests.id, id),
        eq(devicePairingRequests.status, "pending"),
      ),
    )
    .returning({ id: devicePairingRequests.id });
  if (!approved)
    return NextResponse.json(
      {
        error: {
          code: "pairing_unavailable",
          message: "This pairing request was already handled",
        },
      },
      { status: 409 },
    );
  return NextResponse.json({
    data: { approved: true, target: pairing.target },
    meta: { apiVersion: "1" },
  });
}
