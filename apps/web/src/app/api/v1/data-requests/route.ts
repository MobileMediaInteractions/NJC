import { createHash, randomBytes } from "node:crypto";
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb, hasDatabase } from "@harborline/backend/db";
import { dataRequests } from "@harborline/backend/schema";
import { isClerkConfigured } from "@/lib/auth";

const input = z.object({
  email: z.email().max(320),
  requestType: z.enum(["access", "deletion", "correction", "opt-out"]),
  jurisdiction: z.string().trim().max(100).optional(),
});

export async function POST(request: Request) {
  if (!hasDatabase()) return NextResponse.json({ error: { code: "service_not_configured", message: "Privacy-request storage is not connected yet. Please try again after the service is configured." } }, { status: 503 });
  const parsed = input.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: { code: "invalid_request", message: "Enter a valid email address and request type." } }, { status: 400 });
  const userId = isClerkConfigured() ? (await auth()).userId : null;
  const verificationToken = randomBytes(32).toString("base64url");
  const [record] = await getDb().insert(dataRequests).values({
    clerkId: userId,
    email: parsed.data.email.toLowerCase(),
    requestType: parsed.data.requestType,
    jurisdiction: parsed.data.jurisdiction || null,
    verificationTokenHash: createHash("sha256").update(verificationToken).digest("hex"),
  }).returning({ id: dataRequests.id, createdAt: dataRequests.createdAt });
  return NextResponse.json({ data: record, meta: { apiVersion: "1", identityVerificationRequired: true } }, { status: 201 });
}
