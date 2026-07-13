import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb, hasDatabase } from "@harborline/backend/db";
import { newsTips } from "@harborline/backend/schema";

const tipSchema = z.object({
  name: z.string().max(100).optional().or(z.literal("")),
  email: z.email().optional().or(z.literal("")),
  subject: z.string().min(4).max(180),
  body: z.string().min(10).max(10_000),
});

export async function POST(request: Request) {
  const parsed = tipSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: { code: "invalid_request", message: "Check the required tip fields", details: parsed.error.flatten() } }, { status: 400 });
  if (!hasDatabase()) return NextResponse.json({ error: { code: "service_not_configured", message: "News tip intake requires DATABASE_URL" } }, { status: 503 });
  const [tip] = await getDb().insert(newsTips).values({ name: parsed.data.name || null, email: parsed.data.email || null, subject: parsed.data.subject, body: parsed.data.body }).returning({ id: newsTips.id, createdAt: newsTips.createdAt });
  return NextResponse.json({ data: tip, meta: { apiVersion: "1", status: "received" } }, { status: 201 });
}
