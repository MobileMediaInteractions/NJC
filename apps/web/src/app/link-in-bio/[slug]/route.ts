import { and, eq, gt, isNull, lte, or, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb, hasDatabase } from "@harborline/backend/db";
import { linkInBioEntries, stories } from "@harborline/backend/schema";
import { buildLinkInBioStoryDestination } from "@/lib/link-in-bio";
import { getSiteConfiguration } from "@/lib/site-settings";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  const url = new URL(request.url);
  if (!isLinksHost(url.hostname)) return new NextResponse(null, { status: 404 });
  const configuration = await getSiteConfiguration();
  if (!configuration.features.linkInBio || !hasDatabase()) {
    return NextResponse.redirect("https://www.thejerseycourier.com", 307);
  }
  const { slug } = await context.params;
  const now = new Date();
  const [entry] = await getDb()
    .select({ id: linkInBioEntries.id, storySlug: stories.slug })
    .from(linkInBioEntries)
    .innerJoin(stories, eq(linkInBioEntries.storyId, stories.id))
    .where(
      and(
        eq(linkInBioEntries.slug, slug),
        eq(linkInBioEntries.isVisible, true),
        eq(stories.status, "published"),
        lte(stories.publishedAt, now),
        or(isNull(linkInBioEntries.startsAt), lte(linkInBioEntries.startsAt, now)),
        or(isNull(linkInBioEntries.endsAt), gt(linkInBioEntries.endsAt, now)),
      ),
    )
    .limit(1);
  if (!entry) return NextResponse.redirect("https://links.thejerseycourier.com", 307);

  try {
    await getDb()
      .update(linkInBioEntries)
      .set({
        clickCount: sql`${linkInBioEntries.clickCount} + 1`,
        lastClickedAt: now,
      })
      .where(eq(linkInBioEntries.id, entry.id));
  } catch (error) {
    console.error("Link in Bio click count could not be recorded", error);
  }

  return NextResponse.redirect(
    buildLinkInBioStoryDestination(
      entry.storySlug,
      url.searchParams.get("source"),
    ),
    307,
  );
}

function isLinksHost(hostname: string) {
  return hostname === "links.thejerseycourier.com" ||
    hostname === "localhost" ||
    hostname === "127.0.0.1";
}
