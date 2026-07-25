import type { PublishedStoryIndexEntry } from "@/lib/content";

function escapeXml(value: string) {
  return value.replace(/[<>&"']/g, (character) => ({
    "<": "&lt;",
    ">": "&gt;",
    "&": "&amp;",
    '"': "&quot;",
    "'": "&apos;",
  })[character] as string);
}

export function buildNewsSitemap({
  origin,
  publicationName,
  recentStories,
  fallbackStory,
}: {
  origin: string;
  publicationName: string;
  recentStories: PublishedStoryIndexEntry[];
  fallbackStory?: PublishedStoryIndexEntry;
}) {
  const newsUrls = recentStories.map((story) => `
  <url>
    <loc>${escapeXml(`${origin}/story/${story.slug}`)}</loc>
    <news:news>
      <news:publication>
        <news:name>${escapeXml(publicationName)}</news:name>
        <news:language>en</news:language>
      </news:publication>
      <news:publication_date>${escapeXml(story.publishedAt)}</news:publication_date>
      <news:title>${escapeXml(story.headline)}</news:title>
    </news:news>
  </url>`);

  // Google News metadata may only cover the prior two days. A standard URL
  // entry keeps the sitemap valid between publishing cycles without falsely
  // presenting an older article as current news.
  const urls = newsUrls.length > 0
    ? newsUrls
    : [`
  <url>
    <loc>${escapeXml(fallbackStory ? `${origin}/story/${fallbackStory.slug}` : origin)}</loc>
  </url>`];

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">${urls.join("")}
</urlset>`;
}
