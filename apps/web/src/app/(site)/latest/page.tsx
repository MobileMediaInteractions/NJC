import type { Metadata } from "next";
import { SectionHeading } from "@/components/section-heading";
import { StoryCard } from "@/components/story-card";
import { getPublishedStories } from "@/lib/content";

export const metadata: Metadata = {
  title: "Latest Middlesex County and New Jersey News",
  description: "The latest local reporting from Middlesex County and New Jersey, updated throughout the day by The New Jersey Courier.",
  alternates: { canonical: "/latest" },
  openGraph: {
    type: "website",
    url: "/latest",
    title: "Latest Middlesex County and New Jersey News",
    description: "The latest local reporting from Middlesex County and New Jersey, updated throughout the day.",
  },
};

export default async function LatestPage() {
  const stories = await getPublishedStories({ limit: 40 });
  return (
    <div className="container-news py-10">
      <SectionHeading title="Latest news" kicker="Updated throughout the day" />
      <div className="grid gap-10 lg:grid-cols-[1fr_18rem]">
        <div className="space-y-6">{stories.length ? stories.map((story) => <StoryCard key={story.id} story={story} size="horizontal" />) : <div className="border-y py-16 text-center"><h2 className="text-xl font-black text-brand-navy">No verified stories have been published yet.</h2><p className="mt-2 text-sm text-muted-foreground">The newsroom will publish reporting here when it is ready.</p></div>}</div>
        <aside className="h-fit border-t-4 border-brand-yellow bg-brand-navy p-6 text-white lg:sticky lg:top-5">
          <p className="eyebrow text-brand-yellow">News tip?</p>
          <h2 className="mt-2 text-2xl font-bold">Tell the local desk what’s happening.</h2>
          <p className="mt-3 text-sm leading-6 text-white/65">Send photos, video or a confidential note to our editors.</p>
          <a href="/tips" className="mt-5 inline-block text-sm font-bold underline decoration-brand-yellow decoration-2 underline-offset-4">Submit a tip</a>
        </aside>
      </div>
    </div>
  );
}
