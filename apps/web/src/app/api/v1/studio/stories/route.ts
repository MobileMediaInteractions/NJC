import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb, hasDatabase } from "@harborline/backend/db";
import { stories, storyRevisions } from "@harborline/backend/schema";
import { getStudioUser } from "@/lib/auth";

const storyInput = z.object({
  headline: z.string().min(8).max(180),
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  dek: z.string().min(10).max(320),
  body: z.array(z.string().min(1)).min(1),
  categorySlug: z.enum(["local", "middlesex", "statehouse", "public-square", "opinion", "sports", "jersey-laurels", "investigates", "weather", "culture"]),
  categoryLabel: z.string().min(2).max(80),
  location: z.string().min(2).max(80),
  imageUrl: z.url().optional().or(z.literal("")),
  imageAlt: z.string().max(240).optional(),
  tags: z.array(z.string().max(40)).max(12).default([]),
  seoTitle: z.string().max(70).optional().or(z.literal("")),
  seoDescription: z.string().max(180).optional().or(z.literal("")),
  canonicalUrl: z.url().optional().or(z.literal("")),
  noIndex: z.boolean().default(false),
  isBreaking: z.boolean().default(false),
  status: z.enum(["draft", "review", "scheduled", "published"]),
  scheduledAt: z.iso.datetime().optional().or(z.literal("")),
});

export async function POST(request: Request) {
  const viewer = await getStudioUser();
  if (!viewer) return NextResponse.json({ error: { code: "unauthorized", message: "Newsroom sign-in required" } }, { status: 401 });
  if (!hasDatabase()) return NextResponse.json({ error: { code: "service_not_configured", message: "Connect Neon Postgres before saving newsroom content" } }, { status: 503 });
  const parsed = storyInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: { code: "invalid_request", message: "Check required story fields", details: parsed.error.flatten() } }, { status: 400 });
  if (parsed.data.status === "published" && !["admin", "editor", "producer"].includes(viewer.role)) return NextResponse.json({ error: { code: "forbidden", message: "Your role cannot publish stories" } }, { status: 403 });

  const now = new Date();
  const [story] = await getDb().insert(stories).values({
    ...parsed.data,
    imageUrl: parsed.data.imageUrl || null,
    seoTitle: parsed.data.seoTitle || null,
    seoDescription: parsed.data.seoDescription || null,
    canonicalUrl: parsed.data.canonicalUrl || null,
    scheduledAt: parsed.data.scheduledAt ? new Date(parsed.data.scheduledAt) : null,
    publishedAt: parsed.data.status === "published" ? now : null,
    readingMinutes: Math.max(1, Math.ceil(parsed.data.body.join(" ").split(/\s+/).length / 220)),
    authorSnapshot: { id: viewer.id, name: viewer.name, role: viewer.role, initials: viewer.name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase() },
  }).returning();
  await getDb().insert(storyRevisions).values({ storyId: story.id, version: 1, snapshot: story, note: "Initial newsroom save" });
  return NextResponse.json({ data: story, meta: { apiVersion: "1" } }, { status: 201 });
}
