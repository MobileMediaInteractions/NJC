import { and, eq, gte, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@harborline/backend/db";
import { devicePairingRequests } from "@harborline/backend/schema";
import {
  createPairingCredentials,
  isDevicePairingConfigured,
  pairingHash,
  requesterAddress,
} from "@/lib/device-pairing";

export const runtime = "nodejs";

const inputSchema = z.object({
  target: z.enum(["tv", "androidtv", "roku", "web"]),
  deviceName: z.string().trim().min(1).max(80),
});

export async function POST(request: Request) {
  const parsed = inputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json(
      {
        error: {
          code: "invalid_request",
          message: "Choose a supported target and device name",
        },
      },
      { status: 400 },
    );
  if (!isDevicePairingConfigured())
    return NextResponse.json(
      {
        error: {
          code: "service_not_configured",
          message: "Device pairing requires Postgres and DEVICE_PAIRING_PEPPER",
        },
      },
      { status: 503 },
    );

  const db = getDb();
  const requesterIpHash = pairingHash(requesterAddress(request));
  const tenMinutesAgo = new Date(Date.now() - 10 * 60_000);
  const [recent] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(devicePairingRequests)
    .where(
      and(
        eq(devicePairingRequests.requesterIpHash, requesterIpHash),
        gte(devicePairingRequests.createdAt, tenMinutesAgo),
      ),
    );
  if ((recent?.count ?? 0) >= 8)
    return NextResponse.json(
      {
        error: {
          code: "rate_limit_exceeded",
          message: "Too many pairing requests. Try again in a few minutes.",
        },
      },
      { status: 429, headers: { "Retry-After": "600" } },
    );

  const credentials = createPairingCredentials();
  const expiresAt = new Date(Date.now() + 10 * 60_000);
  const [created] = await db
    .insert(devicePairingRequests)
    .values({
      target: parsed.data.target,
      deviceName: parsed.data.deviceName,
      deviceSecretHash: credentials.deviceSecretHash,
      userCodeHash: credentials.userCodeHash,
      requesterIpHash,
      expiresAt,
    })
    .returning({ id: devicePairingRequests.id });

  const origin = process.env.NEXT_PUBLIC_SITE_URL
    ? new URL(process.env.NEXT_PUBLIC_SITE_URL).origin
    : new URL(request.url).origin;
  const verificationBase = `${origin}/login/tv`;
  const verificationUri = ["androidtv", "roku"].includes(parsed.data.target)
    ? `${verificationBase}?target=${parsed.data.target}`
    : verificationBase;
  const verificationUriComplete = `${verificationBase}?session=${created.id}&code=${encodeURIComponent(credentials.userCode)}&target=${parsed.data.target}`;
  const qrValue =
    parsed.data.target === "web"
      ? `harborline://pair?session=${created.id}&code=${encodeURIComponent(credentials.userCode)}&target=web`
      : verificationUriComplete;
  return NextResponse.json(
    {
      data: {
        id: created.id,
        target: parsed.data.target,
        deviceSecret: credentials.deviceSecret,
        userCode: credentials.userCode,
        verificationUri,
        verificationUriComplete,
        qrImageUrl: `${origin}/api/v1/device-pairing/qr?value=${encodeURIComponent(qrValue)}`,
        expiresAt: expiresAt.toISOString(),
        pollIntervalSeconds: 2,
      },
      meta: { apiVersion: "1" },
    },
    { status: 201, headers: { "Cache-Control": "no-store" } },
  );
}
