import { clerkClient } from "@clerk/nextjs/server";
import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@harborline/backend/db";
import { devicePairingRequests, deviceSessions } from "@harborline/backend/schema";
import {
  createDeviceAccessToken,
  isDevicePairingConfigured,
  safePairingHashEqual,
} from "@/lib/device-pairing";

export const runtime = "nodejs";
const inputSchema = z.object({ deviceSecret: z.string().min(40).max(120) });

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
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
          message: "A device secret is required",
        },
      },
      { status: 400 },
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
    !safePairingHashEqual(parsed.data.deviceSecret, pairing.deviceSecretHash)
  )
    return NextResponse.json(
      {
        error: {
          code: "pairing_not_found",
          message: "Pairing request not found",
        },
      },
      { status: 404 },
    );
  if (pairing.expiresAt <= new Date()) {
    if (pairing.status === "pending")
      await db
        .update(devicePairingRequests)
        .set({ status: "expired" })
        .where(eq(devicePairingRequests.id, id));
    return NextResponse.json(
      { data: { status: "expired" }, meta: { apiVersion: "1" } },
      { headers: { "Cache-Control": "no-store" } },
    );
  }
  if (pairing.status !== "approved")
    return NextResponse.json(
      {
        data: {
          status: pairing.status,
          expiresAt: pairing.expiresAt.toISOString(),
        },
        meta: { apiVersion: "1" },
      },
      { headers: { "Cache-Control": "no-store" } },
    );

  const [claimed] = await db
    .update(devicePairingRequests)
    .set({ status: "consumed", consumedAt: new Date() })
    .where(
      and(
        eq(devicePairingRequests.id, id),
        eq(devicePairingRequests.status, "approved"),
      ),
    )
    .returning();
  if (!claimed?.approvedByClerkId)
    return NextResponse.json(
      { data: { status: "consumed" }, meta: { apiVersion: "1" } },
      { headers: { "Cache-Control": "no-store" } },
    );

  try {
    if (claimed.target === "web") {
      const token = await (
        await clerkClient()
      ).signInTokens.createSignInToken({
        userId: claimed.approvedByClerkId,
        expiresInSeconds: 90,
      });
      return NextResponse.json(
        {
          data: {
            status: "approved",
            ticket: token.token,
            expiresAt: new Date(Date.now() + 90_000).toISOString(),
          },
          meta: { apiVersion: "1" },
        },
        { headers: { "Cache-Control": "no-store" } },
      );
    }
    const access = createDeviceAccessToken();
    const expiresAt = new Date(Date.now() + 90 * 24 * 60 * 60_000);
    await db.insert(deviceSessions).values({
      tokenHash: access.tokenHash,
      userClerkId: claimed.approvedByClerkId,
      displayName: claimed.approvedByName ?? "Harborline reader",
      platform: "tvos",
      deviceName: claimed.deviceName,
      expiresAt,
    });
    return NextResponse.json(
      {
        data: {
          status: "approved",
          accessToken: access.rawToken,
          account: {
            name: claimed.approvedByName ?? "Harborline reader",
            platform: "tvos",
          },
          expiresAt: expiresAt.toISOString(),
        },
        meta: { apiVersion: "1" },
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    await db
      .update(devicePairingRequests)
      .set({ status: "approved", consumedAt: null })
      .where(
        and(
          eq(devicePairingRequests.id, id),
          eq(devicePairingRequests.status, "consumed"),
        ),
      );
    console.error("Pairing exchange failed", error);
    return NextResponse.json(
      {
        error: {
          code: "exchange_failed",
          message: "The sign-in exchange could not be completed. Try again.",
        },
      },
      { status: 503 },
    );
  }
}
