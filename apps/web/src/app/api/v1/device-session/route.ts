import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@harborline/backend/db";
import { deviceSessions } from "@harborline/backend/schema";
import { authenticateDeviceRequest } from "@/lib/device-pairing";
import { getAccountReleaseChannel } from "@/lib/release-channel";

export async function GET(request: Request) {
  const session = await authenticateDeviceRequest(request);
  if (!session) return NextResponse.json({ error: { code: "unauthorized", message: "Device session is invalid or expired" } }, { status: 401 });
  const releaseChannel = await getAccountReleaseChannel(session.userClerkId);
  return NextResponse.json(
    { data: { name: session.displayName, platform: session.platform, releaseChannel, expiresAt: session.expiresAt.toISOString() }, meta: { apiVersion: "1" } },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function DELETE(request: Request) {
  const session = await authenticateDeviceRequest(request);
  if (!session) return NextResponse.json({ error: { code: "unauthorized", message: "Device session is invalid or expired" } }, { status: 401 });
  await getDb().update(deviceSessions).set({ revokedAt: new Date() }).where(eq(deviceSessions.id, session.id));
  return new Response(null, { status: 204 });
}
