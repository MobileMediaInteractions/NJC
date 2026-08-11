import { getDb, hasDatabase } from "@harborline/backend/db";
import { pressKitRequests } from "@harborline/backend/schema";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getOptionalAccountId } from "@/lib/auth";
import { analyzePressConversation } from "@/lib/press-kit-ai";
import { sendPressKitEmail } from "@/lib/press-kit-email";
import { limitPressPortalRequest } from "@/lib/press-kit-rate-limit";
import {
  getPressAssetCatalog,
  issuePressAccessToken,
  isPressPortalEnabled,
  pressRequestIpHash,
  writePressAudit,
} from "@/lib/press-kit-server";
import {
  mergePressExtraction,
  profileDbValues,
  serializePressRequest,
  storePressConversationTurn,
} from "@/lib/press-kit-workflow";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const requestSchema = z.object({
  message: z.string().trim().min(10).max(4_000),
  website: z.string().max(0).optional(),
});

export async function POST(request: Request) {
  if (!(await isPressPortalEnabled())) return NextResponse.json({ error: { code: "service_disabled", message: "Custom press requests are temporarily paused." } }, { status: 503 });
  if (!hasDatabase()) {
    return NextResponse.json({ error: { code: "service_unavailable", message: "Press requests are temporarily unavailable." } }, { status: 503 });
  }
  if (Number(request.headers.get("content-length") ?? 0) > 12_000) {
    return NextResponse.json({ error: { code: "request_too_large", message: "The request is too large." } }, { status: 413 });
  }
  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: { code: "invalid_request", message: "Describe the project and the press materials you need.", details: parsed.error.flatten() } }, { status: 400 });
  }
  if (parsed.data.website) return NextResponse.json({ ok: true }, { status: 202 });

  const rate = await limitPressPortalRequest("create", pressRequestIpHash(request));
  if (!rate.success) {
    return NextResponse.json({ error: { code: "rate_limit_exceeded", message: "Too many new requests were started from this connection." } }, {
      status: 429,
      headers: { "Retry-After": String(Math.max(1, Math.ceil((rate.reset - Date.now()) / 1_000))) },
    });
  }

  try {
    const catalog = await getPressAssetCatalog();
    const extraction = await analyzePressConversation({
      message: parsed.data.message,
      current: {},
      history: [],
      assets: catalog,
    });
    const profile = mergePressExtraction({}, extraction);
    const access = issuePressAccessToken();
    const [row] = await getDb().insert(pressKitRequests).values({
      ...profileDbValues(profile),
      accessTokenHash: access.tokenHash,
      ownerClerkId: await getOptionalAccountId(),
      status: extraction.readyForReview ? "intake" : "needs_information",
      aiInterpretation: extraction as unknown as Record<string, unknown>,
    }).returning();
    await storePressConversationTurn({
      requestId: row.id,
      requesterMessage: parsed.data.message,
      extraction,
    });
    await writePressAudit({ request, requestId: row.id, actorType: "requester", action: "press_request_created", metadata: { aiProvider: extraction.provider } });
    if (row.email) await sendPressKitEmail({
      to: row.email,
      subject: `Press materials request ${row.id.slice(0, 8)} received`,
      text: `We opened your Press & Media request ${row.id}. Continue in the same browser to complete and confirm the brief. No materials are authorized until the policy evaluation or staff review is complete.`,
      eventId: `${row.id}-received`,
    });
    return NextResponse.json({
      request: serializePressRequest(row),
      accessToken: access.token,
      assistantMessage: extraction.assistantMessage,
      missingInformation: extraction.missingInformation,
      readyForReview: extraction.readyForReview,
    }, { status: 201, headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error("Press portal request creation failed", error instanceof Error ? error.message : "unknown_error");
    return NextResponse.json({ error: { code: "request_failed", message: "The Press Kit assistant could not start this request." } }, { status: 500 });
  }
}
