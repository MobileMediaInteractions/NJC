import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb, hasDatabase } from "@harborline/backend/db";
import { apiKeys } from "@harborline/backend/schema";
import { writeApiAudit } from "@/lib/api-keys";
import { getAccountIdentity } from "@/lib/auth";

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  const identity = await getAccountIdentity();
  if (!identity) return NextResponse.json({ error: { code: "unauthorized", message: "A verified account is required" } }, { status: 401 });
  if (!hasDatabase()) return NextResponse.json({ error: { code: "service_not_configured", message: "Postgres is not configured" } }, { status: 503 });
  const { id } = await context.params;
  const [record] = await getDb().update(apiKeys).set({ revokedAt: new Date() }).where(and(eq(apiKeys.id, id), eq(apiKeys.ownerClerkId, identity.clerkId))).returning({ id: apiKeys.id });
  if (!record) return NextResponse.json({ error: { code: "not_found", message: "API key not found" } }, { status: 404 });
  await writeApiAudit({ apiKeyId: record.id, actorClerkId: identity.clerkId, event: "key.revoked", request });
  return NextResponse.json({ data: { id: record.id, revoked: true }, meta: { apiVersion: "1" } });
}
