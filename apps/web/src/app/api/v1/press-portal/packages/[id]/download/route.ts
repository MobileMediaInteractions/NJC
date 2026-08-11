import { get } from "@vercel/blob";
import { eq, sql } from "drizzle-orm";
import { getDb } from "@harborline/backend/db";
import { pressKitPackages, pressKitRequests } from "@harborline/backend/schema";
import { NextResponse } from "next/server";
import { getPrivateBlobToken } from "@/lib/blob-storage";
import { limitPressPortalRequest } from "@/lib/press-kit-rate-limit";
import { isPressPortalEnabled, pressRequestIpHash, pressTokensEqual, writePressAudit } from "@/lib/press-kit-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!(await isPressPortalEnabled())) return NextResponse.json({ error: { code: "service_disabled", message: "Custom press requests are temporarily paused." } }, { status: 503 });
  const { id } = await context.params;
  const suppliedToken = request.headers.get("x-press-download-token")?.trim();
  const rate = await limitPressPortalRequest("download", `${pressRequestIpHash(request)}:${id}`);
  if (!rate.success) return NextResponse.json({ error: { code: "rate_limit_exceeded", message: "Too many download attempts." } }, { status: 429 });
  const [storedPackage] = await getDb().select().from(pressKitPackages).where(eq(pressKitPackages.id, id)).limit(1);
  if (!storedPackage || !suppliedToken || !pressTokensEqual(suppliedToken, storedPackage.downloadTokenHash)) {
    return NextResponse.json({ error: { code: "not_found", message: "Package not found." } }, { status: 404 });
  }
  if (storedPackage.revokedAt || storedPackage.status === "revoked") {
    return NextResponse.json({ error: { code: "package_revoked", message: "This package is no longer available." } }, { status: 410 });
  }
  if (storedPackage.expiresAt <= new Date() || storedPackage.status === "expired") {
    await getDb().update(pressKitPackages).set({ status: "expired", updatedAt: new Date() }).where(eq(pressKitPackages.id, id));
    await getDb().update(pressKitRequests).set({ status: "expired", updatedAt: new Date() }).where(eq(pressKitRequests.id, storedPackage.requestId));
    return NextResponse.json({ error: { code: "package_expired", message: "This download has expired." } }, { status: 410 });
  }
  if (storedPackage.status !== "ready" || !storedPackage.pathname || !storedPackage.filename) {
    return NextResponse.json({ error: { code: "package_unavailable", message: "This package is not ready." } }, { status: 409 });
  }
  const privateToken = getPrivateBlobToken();
  if (!privateToken) return NextResponse.json({ error: { code: "storage_unavailable", message: "Secure package storage is unavailable." } }, { status: 503 });
  const blob = await get(storedPackage.pathname, { access: "private", token: privateToken });
  if (!blob || blob.statusCode !== 200) return NextResponse.json({ error: { code: "package_unavailable", message: "The package file is unavailable." } }, { status: 404 });

  const now = new Date();
  await getDb().update(pressKitPackages).set({
    downloadCount: sql`${pressKitPackages.downloadCount} + 1`,
    lastDownloadedAt: now,
    updatedAt: now,
  }).where(eq(pressKitPackages.id, id));
  await getDb().update(pressKitRequests).set({ status: "downloaded", updatedAt: now })
    .where(eq(pressKitRequests.id, storedPackage.requestId));
  await writePressAudit({ request, requestId: storedPackage.requestId, actorType: "requester", action: "press_package_downloaded", metadata: { packageId: id } });
  const filename = storedPackage.filename.replace(/["\\\r\n]/g, "-");
  return new Response(blob.stream, {
    status: 200,
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store, max-age=0",
      ...(storedPackage.size ? { "Content-Length": String(storedPackage.size) } : {}),
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "no-referrer",
    },
  });
}
