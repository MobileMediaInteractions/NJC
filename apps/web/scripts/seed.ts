import { getDb } from "@harborline/backend/db";
import { categories, stories } from "@harborline/backend/schema";
import { seedStories } from "../src/lib/seed";

async function seed() {
  const db = getDb();
  await db.insert(categories).values([
    { slug: "middlesex", name: "Middlesex County", description: "Town-by-town reporting across all 25 municipalities", sortOrder: 1 },
    { slug: "statehouse", name: "Statehouse Desk", description: "Trenton decisions and their local consequences", sortOrder: 2 },
    { slug: "public-square", name: "Public Square", description: "Civic engagement and transparent reader polling", sortOrder: 3 },
    { slug: "opinion", name: "Garden State Forum", description: "Clearly labeled local opinion and op-eds", sortOrder: 4 },
    { slug: "sports", name: "Jersey Gridiron & Court", description: "New Jersey high-school sports", sortOrder: 5 },
    { slug: "jersey-laurels", name: "Jersey Laurels", description: "Reader-nominated community recognition", sortOrder: 6 },
    { slug: "investigates", name: "Courier Watch", description: "Accountability, public records and service journalism", sortOrder: 7 },
    { slug: "weather", name: "Weather", description: "Local forecasts and alerts", sortOrder: 8 },
  ]).onConflictDoNothing();
  for (const story of seedStories) {
    await db.insert(stories).values({
      slug: story.slug,
      headline: story.headline,
      dek: story.dek,
      body: story.body,
      categorySlug: story.category,
      categoryLabel: story.categoryLabel,
      location: story.location,
      status: "published",
      authorSnapshot: story.author,
      imageUrl: story.image,
      imageAlt: story.imageAlt,
      tags: story.tags,
      readingMinutes: story.readingMinutes,
      isBreaking: story.isBreaking ?? false,
      isLive: story.isLive ?? false,
      isExclusive: story.isExclusive ?? false,
      isDeveloping: story.isDeveloping ?? false,
      publishedAt: new Date(story.publishedAt),
    }).onConflictDoNothing();
  }
  console.log(`Seeded ${seedStories.length} stories.`);
}

seed().catch((error) => {
  console.error(error);
  process.exit(1);
});
