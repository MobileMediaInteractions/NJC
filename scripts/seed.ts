import { getDb } from "../src/db";
import { categories, stories } from "../src/db/schema";
import { seedStories } from "../src/lib/seed";

async function seed() {
  const db = getDb();
  await db.insert(categories).values([
    { slug: "local", name: "Local", description: "Reporting across Harbor County", sortOrder: 1 },
    { slug: "weather", name: "Weather", description: "Forecasts, alerts and coastal conditions", sortOrder: 2 },
    { slug: "investigates", name: "Harborline Investigates", description: "Accountability and public records", sortOrder: 3 },
    { slug: "sports", name: "Sports", description: "Teams and athletes across the region", sortOrder: 4 },
    { slug: "culture", name: "Things to Do", description: "Food, arts, events and outdoors", sortOrder: 5 },
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
