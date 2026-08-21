import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AdSlot } from "@/components/ad-slot";
import { JsonLd } from "@/components/json-ld";
import { StoryCard } from "@/components/story-card";
import { StoryCardV2 } from "@/components/site-v2/story-card-v2";
import { getCategoryLabel, getPublishedStories } from "@/lib/content";
import { categoryPageJsonLd } from "@/lib/seo";
import { getSiteConfiguration } from "@/lib/site-settings";
import { getResolvedSiteDesign } from "@/lib/site-design";

const validCategories = [
  "middlesex",
  "statehouse",
  "public-square",
  "opinion",
  "sports",
  "jersey-laurels",
  "investigates",
  "weather",
];

const categoryDescriptions: Record<string, string> = {
  middlesex: "Town-by-town reporting across Middlesex County’s 25 municipalities.",
  statehouse: "Trenton decisions, legislative accountability and the consequences that reach Middlesex County.",
  "public-square": "Transparent reader polling, civic questions and published methodology.",
  opinion: "Clearly labeled commentary from New Jersey residents and community leaders.",
  sports: "Passionate coverage of New Jersey high-school teams, tournaments and athletes.",
  "jersey-laurels": "Reader-nominated recognition for the people and organizations strengthening local life.",
  investigates: "Public records, accountability and practical service journalism.",
  weather: "Local forecasts, alerts and municipality-level impact guidance.",
};

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  if (!validCategories.includes(slug)) return {};
  const title = getCategoryLabel(slug);
  const description = categoryDescriptions[slug];
  return {
    title,
    description,
    alternates: { canonical: `/category/${slug}` },
    openGraph: { type: "website", url: `/category/${slug}`, title, description },
  };
}

export default async function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!validCategories.includes(slug)) notFound();
  const [stories, configuration] = await Promise.all([
    getPublishedStories({ category: slug, limit: 30 }),
    getSiteConfiguration(),
  ]);
  const label = getCategoryLabel(slug);
  const design = await getResolvedSiteDesign(configuration);

  if (design === "v2") {
    const [lead, ...rest] = stories;
    return (
      <div className="v2-section-page v2-page-width">
        <JsonLd data={categoryPageJsonLd(slug, label, categoryDescriptions[slug], configuration.publication)} />
        <header className="v2-section-page__header"><p>{configuration.publication.shortName} desk</p><h1>{label}</h1><span>{categoryDescriptions[slug]}</span></header>
        {lead ? <><StoryCardV2 story={lead} variant="standard" /><div className="v2-section-page__grid">{rest.slice(0, 12).map((story, index) => <StoryCardV2 key={story.id} story={story} variant={index > 5 ? "compact" : "standard"} />)}</div><div className="v2-section-ad"><AdSlot placement="sectionInline" /></div></> : <p className="v2-empty-message">No stories are published in this section yet.</p>}
      </div>
    );
  }

  return (
    <div className="container-news py-10">
      <JsonLd data={categoryPageJsonLd(slug, label, categoryDescriptions[slug], configuration.publication)} />
      <header className="mb-9 border-b-4 border-brand-navy pb-5">
        <p className="eyebrow text-brand-blue">{configuration.publication.shortName} desk</p>
        <h1 className="mt-1 text-5xl font-black capitalize tracking-[-0.055em] text-brand-navy sm:text-6xl">{label}</h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">{categoryDescriptions[slug]}</p>
      </header>
      {stories.length ? (
        <>
          <div className="grid gap-8 lg:grid-cols-[1.45fr_0.55fr]">
            <StoryCard story={stories[0]} size="large" />
            <div className="space-y-6">{stories.slice(1, 4).map((story) => <StoryCard key={story.id} story={story} size="compact" className="border-b pb-6" />)}</div>
          </div>
          <div className="my-12"><AdSlot placement="sectionInline" /></div>
          <div className="grid gap-x-6 gap-y-10 md:grid-cols-2 lg:grid-cols-3">{stories.slice(4).map((story) => <StoryCard key={story.id} story={story} />)}</div>
        </>
      ) : <p className="py-20 text-center text-muted-foreground">No stories are published in this section yet.</p>}
    </div>
  );
}
