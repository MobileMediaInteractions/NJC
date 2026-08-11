import { asc, eq } from "drizzle-orm";
import { getDb } from "@harborline/backend/db";
import { pressKitMessages, pressKitPackages, pressKitRequests } from "@harborline/backend/schema";
import { NextResponse } from "next/server";
import { pressRequestProfileSchema } from "@/lib/press-kit-policy";
import { getAuthorizedPressRequest, isPressPortalEnabled, writePressAudit } from "@/lib/press-kit-server";
import { profileDbValues, serializePressRequest } from "@/lib/press-kit-workflow";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!(await isPressPortalEnabled())) return NextResponse.json({ error: { code: "service_disabled", message: "Custom press requests are temporarily paused." } }, { status: 503 });
  const { id } = await context.params;
  const row = await getAuthorizedPressRequest(request, id);
  if (!row) return NextResponse.json({ error: { code: "not_found", message: "Request not found." } }, { status: 404 });
  const [messages, packages] = await Promise.all([
    getDb().select({ id: pressKitMessages.id, role: pressKitMessages.role, content: pressKitMessages.content, createdAt: pressKitMessages.createdAt })
      .from(pressKitMessages).where(eq(pressKitMessages.requestId, id)).orderBy(asc(pressKitMessages.createdAt)),
    getDb().select({ id: pressKitPackages.id, status: pressKitPackages.status, filename: pressKitPackages.filename, size: pressKitPackages.size, expiresAt: pressKitPackages.expiresAt })
      .from(pressKitPackages).where(eq(pressKitPackages.requestId, id)).limit(1),
  ]);
  return NextResponse.json({ request: serializePressRequest(row), messages, package: packages[0] ?? null }, { headers: { "Cache-Control": "private, no-store" } });
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!(await isPressPortalEnabled())) return NextResponse.json({ error: { code: "service_disabled", message: "Custom press requests are temporarily paused." } }, { status: 503 });
  const { id } = await context.params;
  const row = await getAuthorizedPressRequest(request, id);
  if (!row) return NextResponse.json({ error: { code: "not_found", message: "Request not found." } }, { status: 404 });
  if (!["draft", "intake", "needs_information", "manual_review"].includes(row.status)) {
    return NextResponse.json({ error: { code: "request_locked", message: "This request can no longer be edited." } }, { status: 409 });
  }
  const parsed = pressRequestProfileSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: { code: "invalid_request", message: "Correct the highlighted request details.", details: parsed.error.flatten() } }, { status: 400 });
  const [updated] = await getDb().update(pressKitRequests).set({
    ...profileDbValues(parsed.data),
    status: "intake",
    aiInterpretation: null,
    decisionReasons: [],
    restrictions: [],
  }).where(eq(pressKitRequests.id, id)).returning();
  await writePressAudit({ request, requestId: id, actorType: "requester", action: "press_request_profile_confirmed" });
  return NextResponse.json({ request: serializePressRequest(updated), readyForReview: true }, { headers: { "Cache-Control": "private, no-store" } });
}
