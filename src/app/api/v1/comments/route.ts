import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb, hasDatabase } from "@/db";
import { comments } from "@/db/schema";

const commentSchema = z.object({
  storyId: z.uuid(),
  authorName: z.string().min(2).max(80),
  authorEmail: z.email(),
  body: z.string().min(3).max(2000),
});

export async function POST(request: Request) {
  const parsed = commentSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: { code: "invalid_request", message: "Check the comment fields", details: parsed.error.flatten() } }, { status: 400 });
  if (!hasDatabase()) return NextResponse.json({ error: { code: "service_not_configured", message: "Comments require DATABASE_URL" } }, { status: 503 });
  const [comment] = await getDb().insert(comments).values(parsed.data).returning({ id: comments.id, status: comments.status, createdAt: comments.createdAt });
  return NextResponse.json({ data: comment, meta: { apiVersion: "1", moderation: "pending" } }, { status: 201 });
}
