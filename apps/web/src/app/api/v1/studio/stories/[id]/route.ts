import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb, hasDatabase } from "@harborline/backend/db";
import { stories } from "@harborline/backend/schema";
import { writeApiAudit } from "@/lib/api-keys";
import { canDeleteStory, getStudioUser } from "@/lib/auth";

const storyId = z.uuid();

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const viewer = await getStudioUser();
  if (!viewer)
    return NextResponse.json(
      { error: { code: "unauthorized", message: "Newsroom sign-in required" } },
      { status: 401 },
    );
  if (!canDeleteStory(viewer.role))
    return NextResponse.json(
      { error: { code: "forbidden", message: "Only administrators and editors can delete stories" } },
      { status: 403 },
    );
  if (!hasDatabase())
    return NextResponse.json(
      { error: { code: "service_not_configured", message: "Postgres is not configured" } },
      { status: 503 },
    );

  const parsedId = storyId.safeParse((await context.params).id);
  if (!parsedId.success)
    return NextResponse.json(
      { error: { code: "invalid_request", message: "A valid story ID is required" } },
      { status: 400 },
    );

  try {
    const [deleted] = await getDb()
      .delete(stories)
      .where(eq(stories.id, parsedId.data))
      .returning({
        id: stories.id,
        slug: stories.slug,
        headline: stories.headline,
        status: stories.status,
        categorySlug: stories.categorySlug,
      });
    if (!deleted)
      return NextResponse.json(
        { error: { code: "not_found", message: "Story not found" } },
        { status: 404 },
      );

    await writeApiAudit({
      actorClerkId: viewer.id,
      event: "story.deleted",
      request,
      metadata: {
        storyId: deleted.id,
        slug: deleted.slug,
        headline: deleted.headline,
        status: deleted.status,
      },
    });

    revalidatePath("/");
    revalidatePath("/latest");
    revalidatePath("/studio/stories");
    revalidatePath(`/category/${deleted.categorySlug}`);
    revalidatePath(`/story/${deleted.slug}`);
    revalidatePath("/api/v1/stories");
    revalidatePath("/feed.xml");
    revalidatePath("/sitemap.xml");
    revalidatePath("/news-sitemap.xml");
    console.info("[studio:stories] deleted", {
      storyId: deleted.id,
      status: deleted.status,
      actorId: viewer.id,
    });
    return NextResponse.json({
      data: { id: deleted.id, deleted: true },
      meta: { apiVersion: "1" },
    });
  } catch (error) {
    console.error("[studio:stories] deletion failed", {
      storyId: parsedId.data,
      actorId: viewer.id,
      error,
    });
    return NextResponse.json(
      { error: { code: "delete_failed", message: "The story could not be deleted" } },
      { status: 500 },
    );
  }
}
