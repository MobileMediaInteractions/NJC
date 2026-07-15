import type { Metadata } from "next";
import { Search } from "lucide-react";
import { StoryCard } from "@/components/story-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getPublishedStories } from "@/lib/content";

export const metadata: Metadata = {
  title: "Search",
  robots: { index: false, follow: true },
};

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = "" } = await searchParams;
  const stories = q ? await getPublishedStories({ query: q, limit: 50 }) : [];
  return (
    <div className="container-news max-w-5xl py-12"><p className="eyebrow text-brand-blue">The New Jersey Courier archive</p><h1 className="mt-2 text-5xl font-black tracking-[-0.055em] text-brand-navy">Search local news</h1><form className="mt-7 flex gap-2" action="/search"><label htmlFor="q" className="sr-only">Search terms</label><Input id="q" name="q" defaultValue={q} className="h-12 bg-card text-base" placeholder="Try “transit,” “schools” or your town" /><Button type="submit" className="h-12 bg-brand-blue"><Search /> Search</Button></form>{q && <div className="mt-10"><p className="mb-6 text-sm text-muted-foreground">{stories.length} result{stories.length === 1 ? "" : "s"} for <strong className="text-foreground">“{q}”</strong></p><div className="space-y-6">{stories.map((story) => <StoryCard key={story.id} story={story} size="horizontal" />)}{stories.length === 0 && <p className="border-y py-12 text-center text-muted-foreground">No matching stories. Try a broader search.</p>}</div></div>}</div>
  );
}
