import { eq } from "drizzle-orm";
import { getDb } from "@harborline/backend/db";
import { pressKitPackages } from "@harborline/backend/schema";
import { NextResponse } from "next/server";
import { getAuthorizedPressRequest, isPressPortalEnabled, issuePressAccessToken, writePressAudit } from "@/lib/press-kit-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!(await isPressPortalEnabled())) return NextResponse.json({ error: { code: "service_disabled", message: "Custom press requests are temporarily paused." } }, { status: 503 });
  const { id } = await context.params;
  const pressRequest = await getAuthorizedPressRequest(request, id);
  if (!pressRequest) return NextResponse.json({ error: { code: "not_found", message: "Request not found." } }, { status: 404 });
  const [storedPackage] = await getDb().select().from(pressKitPackages).where(eq(pressKitPackages.requestId, id)).limit(1);
  if (!storedPackage || storedPackage.status !== "ready" || storedPackage.revokedAt || storedPackage.expiresAt <= new Date()) {
    return NextResponse.json({ error: { code: "package_unavailable", message: "This package is not available for download." } }, { status: 410 });
  }
  const access = issuePressAccessToken();
  await getDb().update(pressKitPackages).set({ downloadTokenHash: access.tokenHash, updatedAt: new Date() })
    .where(eq(pressKitPackages.id, storedPackage.id));
  await writePressAudit({ request, requestId: id, actorType: "requester", action: "press_package_access_rotated", metadata: { packageId: storedPackage.id } });
  return NextResponse.json({
    package: {
      id: storedPackage.id,
      filename: storedPackage.filename,
      size: storedPackage.size,
      expiresAt: storedPackage.expiresAt.toISOString(),
      downloadUrl: `/api/v1/press-portal/packages/${storedPackage.id}/download`,
      downloadToken: access.token,
    },
  }, { headers: { "Cache-Control": "private, no-store" } });
}
