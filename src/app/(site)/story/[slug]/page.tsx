import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Bookmark, ExternalLink, Link2, Mail, MessageCircle, Share2 } from "lucide-react";
import { AdSlot } from "@/components/ad-slot";
import { NewsletterForm } from "@/components/newsletter-form";
import { StoryCard } from "@/components/story-card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getPublishedStories, getStoryBySlug } from "@/lib/content";
import { formatStoryDate } from "@/lib/format";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const story = await getStoryBySlug(slug);
  if (!story) return {};
  return { title: story.headline, description: story.dek, openGraph: { type: "article", title: story.headline, description: story.dek, images: [story.image] } };
}

export default async function StoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const story = await getStoryBySlug(slug);
  if (!story) notFound();
  const related = (await getPublishedStories({ category: story.category, limit: 4 })).filter((item) => item.slug !== story.slug).slice(0, 3);

  return (
    <article>
      <header className="container-news max-w-[70rem] py-10 lg:pt-14">
        <div className="flex flex-wrap items-center gap-2">
          <Link href={`/category/${story.category}`} className="eyebrow text-brand-blue hover:underline">{story.categoryLabel}</Link>
          {story.isBreaking && <Badge className="rounded-none bg-brand-red">Breaking</Badge>}
          {story.isExclusive && <Badge className="rounded-none bg-brand-yellow text-brand-navy">Exclusive</Badge>}
          {story.isDeveloping && <Badge variant="outline" className="rounded-none border-brand-blue text-brand-blue">Developing</Badge>}
        </div>
        <h1 className="headline-balance mt-4 max-w-5xl text-4xl font-black leading-[0.98] tracking-[-0.055em] text-brand-navy sm:text-6xl lg:text-7xl">{story.headline}</h1>
        <p className="mt-6 max-w-3xl text-lg leading-8 text-muted-foreground sm:text-xl">{story.dek}</p>
        <div className="mt-7 flex flex-col gap-5 border-t pt-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="size-11"><AvatarImage src={story.author.avatar} /><AvatarFallback className="bg-brand-navy font-bold text-white">{story.author.initials}</AvatarFallback></Avatar>
            <div><p className="text-sm font-bold text-brand-navy">By {story.author.name}</p><p className="text-xs text-muted-foreground">{story.author.role} · {formatStoryDate(story.publishedAt)}</p></div>
          </div>
          <div className="flex items-center gap-1">
            {[
              { label: "Share", icon: Share2 },
              { label: "Save", icon: Bookmark },
              { label: "Email", icon: Mail },
              { label: "Open share options", icon: ExternalLink },
              { label: "Copy link", icon: Link2 },
            ].map(({ label, icon: Icon }) => <Button key={label} variant="outline" size="icon" aria-label={label}><Icon className="size-4" /></Button>)}
          </div>
        </div>
      </header>
      <figure className="container-news max-w-[76rem]">
        <div className="relative aspect-[16/9] overflow-hidden bg-muted"><Image src={story.image} alt={story.imageAlt} fill priority sizes="100vw" className="object-cover" /></div>
        <figcaption className="mt-2 text-xs text-muted-foreground">{story.imageAlt}. Harborline file photo.</figcaption>
      </figure>
      <div className="container-news grid max-w-[70rem] gap-10 py-10 lg:grid-cols-[4.25rem_minmax(0,42rem)_1fr]">
        <aside className="hidden lg:block"><div className="sticky top-4 flex flex-col gap-2"><Button variant="outline" size="icon" aria-label="Open comments"><MessageCircle /></Button><span className="text-center text-[0.65rem] text-muted-foreground">12</span></div></aside>
        <div>
          <p className="mb-6 text-xs font-bold uppercase tracking-wider text-brand-blue">{story.location}</p>
          <div className="space-y-6 text-[1.08rem] leading-[1.85] text-foreground/90">{story.body.map((paragraph, index) => <p key={index} className={index === 0 ? "first-letter:float-left first-letter:mr-2 first-letter:text-6xl first-letter:font-black first-letter:leading-[0.85] first-letter:text-brand-blue" : ""}>{paragraph}</p>)}</div>
          <div className="my-10"><AdSlot label="Article advertisement" /></div>
          <div className="border-y py-6"><p className="eyebrow text-brand-blue">Tags</p><div className="mt-3 flex flex-wrap gap-2">{story.tags.map((tag) => <Badge key={tag} variant="secondary" className="rounded-full">{tag}</Badge>)}</div></div>
          <section className="mt-10 bg-brand-sky/60 p-6"><p className="eyebrow text-brand-blue">The Daily Current</p><h2 className="mt-2 text-2xl font-black text-brand-navy">Understand your community before your first coffee.</h2><p className="mb-5 mt-2 text-sm text-muted-foreground">The most useful local stories, every weekday morning.</p><NewsletterForm /></section>
        </div>
        <aside className="hidden lg:block"><div className="sticky top-5 border-t-4 border-brand-yellow bg-brand-navy p-5 text-white"><p className="eyebrow text-brand-yellow">Why it matters</p><p className="mt-3 text-sm leading-6 text-white/72">This reporting tracks decisions that affect public money, neighborhood safety and access to the working waterfront.</p></div></aside>
      </div>
      {related.length > 0 && <section className="container-news border-t-4 border-brand-navy pt-5"><h2 className="mb-7 text-3xl font-black tracking-[-0.04em] text-brand-navy">More from {story.categoryLabel}</h2><div className="grid gap-7 md:grid-cols-3">{related.map((item) => <StoryCard key={item.id} story={item} />)}</div></section>}
    </article>
  );
}
