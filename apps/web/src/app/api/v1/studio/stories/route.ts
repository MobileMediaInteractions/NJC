import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { getDb, hasDatabase } from "@harborline/backend/db";
import { stories, storyRevisions } from "@harborline/backend/schema";
import { getStudioUser } from "@/lib/auth";
import { storyInput } from "@/lib/story-input";

export async function POST(request: Request) {
  const viewer = await getStudioUser();
  if (!viewer) return NextResponse.json({ error: { code: "unauthorized", message: "Newsroom sign-in required" } }, { status: 401 });
  if (!hasDatabase()) return NextResponse.json({ error: { code: "service_not_configured", message: "Connect Neon Postgres before saving newsroom content" } }, { status: 503 });
  const parsed = storyInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    const details = parsed.error.flatten();
    console.warn("[studio:stories] validation failed", { userId: viewer.id, fields: Object.keys(details.fieldErrors) });
    return NextResponse.json({ error: { code: "invalid_request", message: "Check the highlighted story fields", details } }, { status: 400 });
  }
  if (parsed.data.status === "published" && !["admin", "editor", "producer"].includes(viewer.role)) return NextResponse.json({ error: { code: "forbidden", message: "Your role cannot publish stories" } }, { status: 403 });

  const [existing] = await getDb().select({ id: stories.id }).from(stories).where(eq(stories.slug, parsed.data.slug)).limit(1);
  if (existing) return NextResponse.json({ error: { code: "slug_conflict", message: "A story with this headline URL already exists. Change the headline before saving." } }, { status: 409 });

  const now = new Date();
  try {
    const [story] = await getDb().insert(stories).values({
      ...parsed.data,
      imageUrl: parsed.data.imageUrl || null,
      seoTitle: parsed.data.seoTitle || null,
      seoDescription: parsed.data.seoDescription || null,
      canonicalUrl: parsed.data.canonicalUrl || null,
      scheduledAt: parsed.data.scheduledAt ? new Date(parsed.data.scheduledAt) : null,
      publishedAt: parsed.data.status === "published" ? now : null,
      readingMinutes: Math.max(1, Math.ceil(parsed.data.body.join(" ").split(/\s+/).length / 220)),
      authorId: viewer.databaseId ?? null,
      authorSnapshot: { id: viewer.id, name: viewer.name, role: viewer.role, initials: viewer.name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase() },
    }).returning();
    await getDb().insert(storyRevisions).values({ storyId: story.id, version: 1, snapshot: story, note: "Initial newsroom save" });

    if (story.status === "published") {
      revalidatePath("/");
      revalidatePath("/latest");
      revalidatePath(`/category/${story.categorySlug}`);
      revalidatePath(`/story/${story.slug}`);
      revalidatePath("/api/v1/stories");
      revalidatePath("/feed.xml");
      revalidatePath("/sitemap.xml");
      revalidatePath("/news-sitemap.xml");
    }
    console.info("[studio:stories] saved", { storyId: story.id, status: story.status, authorId: viewer.id });
    return NextResponse.json({ data: story, meta: { apiVersion: "1" } }, { status: 201 });
  } catch (error) {
    console.error("[studio:stories] persistence failed", { status: parsed.data.status, userId: viewer.id, error });
    return NextResponse.json({ error: { code: "save_failed", message: "The story could not be saved. No publication was confirmed." } }, { status: 500 });
  }
}
