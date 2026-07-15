import { getPublishedStoryIndex } from "@/lib/content";
import { getSiteOrigin } from "@/lib/origin";
import { siteConfig } from "@/lib/site";

export const revalidate = 300;

function escapeXml(value: string) {
  return value.replace(/[<>&"']/g, (character) => ({
    "<": "&lt;",
    ">": "&gt;",
    "&": "&amp;",
    '"': "&quot;",
    "'": "&apos;",
  })[character] as string);
}

export async function GET() {
  const origin = getSiteOrigin();
  const twoDaysAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);
  const stories = await getPublishedStoryIndex({ limit: 1_000, since: twoDaysAgo });
  const urls = stories.map((story) => `
  <url>
    <loc>${escapeXml(`${origin}/story/${story.slug}`)}</loc>
    <news:news>
      <news:publication>
        <news:name>${escapeXml(siteConfig.name)}</news:name>
        <news:language>en</news:language>
      </news:publication>
      <news:publication_date>${escapeXml(story.publishedAt)}</news:publication_date>
      <news:title>${escapeXml(story.headline)}</news:title>
    </news:news>
  </url>`).join("");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">${urls}
</urlset>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, s-maxage=300, stale-while-revalidate=3600",
    },
  });
}
