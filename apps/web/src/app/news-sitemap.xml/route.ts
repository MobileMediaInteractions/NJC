import { getPublishedStoryIndex } from "@/lib/content";
import { buildNewsSitemap } from "@/lib/news-sitemap";
import { getSiteOrigin } from "@/lib/origin";
import { getSiteConfiguration } from "@/lib/site-settings";

export const revalidate = 300;

export async function GET() {
  const origin = getSiteOrigin();
  const { publication } = await getSiteConfiguration();
  const twoDaysAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);
  const recentStories = await getPublishedStoryIndex({ limit: 1_000, since: twoDaysAgo });
  const [fallbackStory] = recentStories.length === 0
    ? await getPublishedStoryIndex({ limit: 1 })
    : [];
  const xml = buildNewsSitemap({
    origin,
    publicationName: publication.name,
    recentStories,
    fallbackStory,
  });

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, s-maxage=300, stale-while-revalidate=3600",
    },
  });
}
