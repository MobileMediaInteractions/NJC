import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AdSlot } from "@/components/ad-slot";
import { StoryCard } from "@/components/story-card";
import { getCategoryLabel, getPublishedStories } from "@/lib/content";

const validCategories = ["local", "weather", "investigates", "sports", "culture"];

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  return { title: getCategoryLabel(slug) };
}

export default async function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!validCategories.includes(slug)) notFound();
  const stories = await getPublishedStories({ category: slug, limit: 30 });
  const label = getCategoryLabel(slug);

  return (
    <div className="container-news py-10">
      <header className="mb-9 border-b-4 border-brand-navy pb-5">
        <p className="eyebrow text-brand-blue">Harborline desk</p>
        <h1 className="mt-1 text-5xl font-black capitalize tracking-[-0.055em] text-brand-navy sm:text-6xl">{label}</h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">Reporting, context and useful information from across {label === "Local" ? "Harbor County" : `the ${label.toLowerCase()} desk`}.</p>
      </header>
      {stories.length ? (
        <>
          <div className="grid gap-8 lg:grid-cols-[1.45fr_0.55fr]">
            <StoryCard story={stories[0]} size="large" />
            <div className="space-y-6">{stories.slice(1, 4).map((story) => <StoryCard key={story.id} story={story} size="compact" className="border-b pb-6" />)}</div>
          </div>
          <div className="my-12"><AdSlot /></div>
          <div className="grid gap-x-6 gap-y-10 md:grid-cols-2 lg:grid-cols-3">{stories.slice(4).map((story) => <StoryCard key={story.id} story={story} />)}</div>
        </>
      ) : <p className="py-20 text-center text-muted-foreground">No stories are published in this section yet.</p>}
    </div>
  );
}
