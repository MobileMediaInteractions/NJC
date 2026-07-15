import { getDb, hasDatabase } from "@harborline/backend/db";
import { pressKitRequests } from "@harborline/backend/schema";
import { NextResponse } from "next/server";
import { createPressKitArchive, pressKitRequestSchema } from "@/lib/press-kit";
import { limitPressKitRequest } from "@/lib/press-kit-rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const maxRequestBytes = 16_000;
const maxArchiveBytes = 4_250_000;

function requesterAddress(request: Request) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";
}

export async function POST(request: Request) {
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > maxRequestBytes) {
    return NextResponse.json({ error: { code: "request_too_large", message: "The press-kit request is too large." } }, { status: 413 });
  }

  const parsed = pressKitRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "invalid_request", message: "Complete every required field and choose at least one asset group.", details: parsed.error.flatten() } },
      { status: 400 },
    );
  }

  const rate = await limitPressKitRequest(requesterAddress(request));
  const rateHeaders = new Headers({
    "X-RateLimit-Limit": String(rate.limit),
    "X-RateLimit-Remaining": String(rate.remaining),
    "X-RateLimit-Reset": String(rate.reset),
    "X-RateLimit-Policy": rate.durable ? "upstash" : "instance-local",
  });
  if (!rate.success) {
    rateHeaders.set("Retry-After", String(Math.max(1, Math.ceil((rate.reset - Date.now()) / 1_000))));
    return NextResponse.json(
      { error: { code: "rate_limit_exceeded", message: "This connection has generated three press kits in the last hour. Try again after the limit resets." } },
      { status: 429, headers: rateHeaders },
    );
  }

  try {
    const archive = await createPressKitArchive(parsed.data);
    if (archive.buffer.byteLength > maxArchiveBytes) {
      return NextResponse.json(
        { error: { code: "archive_too_large", message: "This selection exceeds the hosted download limit. Choose fewer asset groups or contact the newsroom." } },
        { status: 413, headers: rateHeaders },
      );
    }

    if (hasDatabase()) {
      await getDb().insert(pressKitRequests).values({
        id: archive.requestId,
        name: parsed.data.name,
        organization: parsed.data.organization,
        email: parsed.data.email,
        intendedUse: parsed.data.intendedUse,
        requestDetails: parsed.data.requestDetails,
        assetGroups: parsed.data.assetGroups,
        status: "generated",
        archiveBytes: archive.buffer.byteLength,
        generatedAt: new Date(archive.generatedAt),
      }).catch((error) => console.error("Press-kit request audit insert failed", error));
    }

    const filename = `new-jersey-courier-press-kit-${archive.requestId.slice(0, 8)}.zip`;
    rateHeaders.set("Content-Type", "application/zip");
    rateHeaders.set("Content-Disposition", `attachment; filename="${filename}"`);
    rateHeaders.set("Content-Length", String(archive.buffer.byteLength));
    rateHeaders.set("Cache-Control", "private, no-store");
    rateHeaders.set("X-Content-Type-Options", "nosniff");
    rateHeaders.set("X-Press-Kit-Request-Id", archive.requestId);
    return new Response(new Uint8Array(archive.buffer), { status: 200, headers: rateHeaders });
  } catch (error) {
    console.error("Press-kit generation failed", error);
    return NextResponse.json(
      { error: { code: "generation_failed", message: "The package could not be assembled. Try again or contact the newsroom." } },
      { status: 500, headers: rateHeaders },
    );
  }
}
