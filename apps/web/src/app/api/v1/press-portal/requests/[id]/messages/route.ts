import { asc, eq } from "drizzle-orm";
import { getDb } from "@harborline/backend/db";
import { pressKitMessages, pressKitRequests } from "@harborline/backend/schema";
import { NextResponse } from "next/server";
import { z } from "zod";
import { analyzePressConversation } from "@/lib/press-kit-ai";
import { limitPressPortalRequest } from "@/lib/press-kit-rate-limit";
import { getAuthorizedPressRequest, getPressAssetCatalog, isPressPortalEnabled, pressRequestIpHash, writePressAudit } from "@/lib/press-kit-server";
import { mergePressExtraction, pressRequestToPartialProfile, profileDbValues, serializePressRequest, storePressConversationTurn } from "@/lib/press-kit-workflow";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const messageSchema = z.object({ message: z.string().trim().min(2).max(4_000) });

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!(await isPressPortalEnabled())) return NextResponse.json({ error: { code: "service_disabled", message: "Custom press requests are temporarily paused." } }, { status: 503 });
  const { id } = await context.params;
  const row = await getAuthorizedPressRequest(request, id);
  if (!row) return NextResponse.json({ error: { code: "not_found", message: "Request not found." } }, { status: 404 });
  if (!["draft", "intake", "needs_information"].includes(row.status)) {
    return NextResponse.json({ error: { code: "request_locked", message: "This request is already being evaluated or has been decided." } }, { status: 409 });
  }
  const parsed = messageSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: { code: "invalid_message", message: "Enter a short, relevant answer." } }, { status: 400 });
  const rate = await limitPressPortalRequest("message", `${pressRequestIpHash(request)}:${id}`);
  if (!rate.success) return NextResponse.json({ error: { code: "rate_limit_exceeded", message: "This request has received too many messages. Try again later." } }, { status: 429 });

  const historyRows = await getDb().select({ role: pressKitMessages.role, content: pressKitMessages.content })
    .from(pressKitMessages).where(eq(pressKitMessages.requestId, id)).orderBy(asc(pressKitMessages.createdAt));
  const catalog = await getPressAssetCatalog();
  const extraction = await analyzePressConversation({
    message: parsed.data.message,
    current: pressRequestToPartialProfile(row),
    history: historyRows.filter((item): item is { role: "requester" | "assistant"; content: string } => item.role === "requester" || item.role === "assistant"),
    assets: catalog,
  });
  const profile = mergePressExtraction(pressRequestToPartialProfile(row), extraction);
  const [updated] = await getDb().update(pressKitRequests).set({
    ...profileDbValues(profile),
    status: extraction.readyForReview ? "intake" : "needs_information",
    aiInterpretation: extraction as unknown as Record<string, unknown>,
  }).where(eq(pressKitRequests.id, id)).returning();
  await storePressConversationTurn({ requestId: id, requesterMessage: parsed.data.message, extraction });
  await writePressAudit({ request, requestId: id, actorType: "ai", action: "press_request_interpreted", metadata: { provider: extraction.provider, concerns: extraction.concerns } });
  return NextResponse.json({
    request: serializePressRequest(updated),
    assistantMessage: extraction.assistantMessage,
    missingInformation: extraction.missingInformation,
    readyForReview: extraction.readyForReview,
  }, { headers: { "Cache-Control": "private, no-store" } });
}
