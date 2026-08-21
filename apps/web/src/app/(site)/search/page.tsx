import type { Metadata } from "next";
import { Search } from "lucide-react";
import { StoryCard } from "@/components/story-card";
import { StoryCardV2 } from "@/components/site-v2/story-card-v2";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getPublishedStories } from "@/lib/content";
import { publicSearchPageQuerySchema } from "@/lib/public-search";
import { getSiteConfiguration } from "@/lib/site-settings";
import { getResolvedSiteDesign } from "@/lib/site-design";

export const metadata: Metadata = {
  title: "Search",
  robots: { index: false, follow: true },
};

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q: rawQuery = "" } = await searchParams;
  const parsedQuery = publicSearchPageQuerySchema.safeParse(rawQuery);
  const q = parsedQuery.success ? parsedQuery.data : "";
  const [stories, configuration] = await Promise.all([q ? getPublishedStories({ query: q, excludeNoIndex: true, limit: 50 }) : Promise.resolve([]), getSiteConfiguration()]);
  const design = await getResolvedSiteDesign(configuration);
  if (design === "v2") {
    return <div className="v2-search-page v2-page-width"><header><h1>Search</h1></header><form action="/search"><label htmlFor="v2-search-q">Search news</label><div><Search /><input id="v2-search-q" name="q" defaultValue={q} autoFocus placeholder="Stories, people, places and topics" /><Button type="submit">Search</Button></div><p><kbd>⌘</kbd><kbd>K</kbd> opens search from anywhere.</p></form>{q ? <section><header><h2>Results for “{q}”</h2><span>{stories.length} result{stories.length === 1 ? "" : "s"}</span></header><div>{stories.length ? stories.map((story) => <StoryCardV2 key={story.id} story={story} variant="horizontal" />) : <p className="v2-empty-message">No matching stories. Try a broader search.</p>}</div></section> : <section className="v2-search-empty"><h2>Find the reporting you need.</h2><p>Search by town, public official, school, issue, team or author.</p></section>}</div>;
  }
  return (
    <div className="container-news max-w-5xl py-12"><p className="eyebrow text-brand-blue">The New Jersey Courier archive</p><h1 className="mt-2 text-5xl font-black tracking-[-0.055em] text-brand-navy">Search local news</h1><form className="mt-7 flex gap-2" action="/search"><label htmlFor="q" className="sr-only">Search terms</label><Input id="q" name="q" defaultValue={q} className="h-12 bg-card text-base" placeholder="Try “transit,” “schools” or your town" /><Button type="submit" className="h-12 bg-brand-blue"><Search /> Search</Button></form>{q && <div className="mt-10"><p className="mb-6 text-sm text-muted-foreground">{stories.length} result{stories.length === 1 ? "" : "s"} for <strong className="text-foreground">“{q}”</strong></p><div className="space-y-6">{stories.map((story) => <StoryCard key={story.id} story={story} size="horizontal" />)}{stories.length === 0 && <p className="border-y py-12 text-center text-muted-foreground">No matching stories. Try a broader search.</p>}</div></div>}</div>
  );
}
