import { getPublishedStories } from "@/lib/content";
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
  const stories = (await getPublishedStories({ limit: 50 })).filter((story) => !story.noIndex && !story.canonicalUrl);
  const items = stories.map((story) => {
    const url = `${origin}/story/${story.slug}`;
    return `
    <item>
      <title>${escapeXml(story.headline)}</title>
      <link>${escapeXml(url)}</link>
      <guid isPermaLink="true">${escapeXml(url)}</guid>
      <description>${escapeXml(story.dek)}</description>
      <dc:creator>${escapeXml(story.author.name)}</dc:creator>
      <category>${escapeXml(story.categoryLabel)}</category>
      <pubDate>${new Date(story.publishedAt).toUTCString()}</pubDate>
    </item>`;
  }).join("");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/">
  <channel>
    <title>${escapeXml(siteConfig.name)}</title>
    <link>${escapeXml(origin)}</link>
    <description>${escapeXml(siteConfig.description)}</description>
    <language>en-us</language>
    <atom:link href="${escapeXml(`${origin}/feed.xml`)}" rel="self" type="application/rss+xml" />${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, s-maxage=300, stale-while-revalidate=3600",
    },
  });
}
