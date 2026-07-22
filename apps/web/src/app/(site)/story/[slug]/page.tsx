import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdSlot } from "@/components/ad-slot";
import { JsonLd } from "@/components/json-ld";
import { NewsletterForm } from "@/components/newsletter-form";
import { StoryActions } from "@/components/story-actions";
import { StoryCard } from "@/components/story-card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { getPublishedStories, getStoryBySlug } from "@/lib/content";
import { formatStoryDate } from "@/lib/format";
import { getSiteOrigin } from "@/lib/origin";
import { isSearchIndexingEnabled, storyPageJsonLd } from "@/lib/seo";
import { getSiteConfiguration } from "@/lib/site-settings";
import { getStoryShareLinks, getStorySocialImageUrl } from "@/lib/story-sharing";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const [story, configuration] = await Promise.all([getStoryBySlug(slug), getSiteConfiguration()]);
  if (!story) return {};
  const title = story.seoTitle || story.headline;
  const description = story.seoDescription || story.dek;
  const canonical = story.canonicalUrl || `/story/${story.slug}`;
  const socialImage = getStorySocialImageUrl({ siteOrigin: getSiteOrigin(), slug: story.slug, updatedAt: story.updatedAt });
  const index = isSearchIndexingEnabled() && !story.noIndex;
  return {
    title,
    description,
    keywords: story.tags,
    authors: [{ name: story.author.name }],
    category: story.categoryLabel,
    alternates: { canonical },
    robots: {
      index,
      follow: index,
      googleBot: {
        index,
        follow: index,
        "max-image-preview": "large",
        "max-snippet": -1,
        "max-video-preview": -1,
      },
    },
    openGraph: {
      type: "article",
      locale: "en_US",
      siteName: configuration.publication.name,
      url: canonical,
      title,
      description,
      publishedTime: story.publishedAt,
      modifiedTime: story.updatedAt || story.publishedAt,
      authors: [story.author.name],
      section: story.categoryLabel,
      tags: story.tags,
      images: [{ url: socialImage, width: 1200, height: 630, type: "image/png", alt: story.imageAlt }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [{ url: socialImage, alt: story.imageAlt }],
    },
  };
}

export default async function StoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const story = await getStoryBySlug(slug);
  if (!story) notFound();
  const [relatedStories, configuration] = await Promise.all([
    getPublishedStories({ category: story.category, limit: 4 }),
    getSiteConfiguration(),
  ]);
  const related = relatedStories.filter((item) => item.slug !== story.slug).slice(0, 3);
  const shareLinks = getStoryShareLinks({
    canonicalUrl: story.canonicalUrl,
    headline: story.headline,
    siteOrigin: getSiteOrigin(),
    slug: story.slug,
    updatedAt: story.updatedAt,
  });

  return (
    <article>
      <JsonLd data={storyPageJsonLd(story, configuration.publication)} />
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
            <div><p className="text-sm font-bold text-brand-navy">By {story.author.name}</p><p className="text-xs text-muted-foreground">{story.author.role} · Published {formatStoryDate(story.publishedAt)}{story.updatedAt && story.updatedAt !== story.publishedAt ? ` · Updated ${formatStoryDate(story.updatedAt)}` : ""}</p></div>
          </div>
          <StoryActions {...shareLinks} headline={story.headline} />
        </div>
      </header>
      <figure className="container-news max-w-[76rem]">
        <div className="relative aspect-[16/9] overflow-hidden bg-muted"><Image src={story.image} alt={story.imageAlt} fill priority sizes="100vw" className="object-cover" /></div>
        <figcaption className="mt-2 text-xs text-muted-foreground">{story.imageAlt}</figcaption>
      </figure>
      <div className={`container-news grid gap-10 py-10 ${story.whyItMatters ? "max-w-[65rem] lg:grid-cols-[minmax(0,42rem)_1fr]" : "max-w-[42rem]"}`}>
        <div>
          <p className="mb-6 text-xs font-bold uppercase tracking-wider text-brand-blue">{story.location}</p>
          {story.whyItMatters ? <div className="mb-8 border-t-4 border-brand-yellow bg-brand-navy p-5 text-white lg:hidden"><p className="eyebrow text-brand-yellow">Why it matters</p><p className="mt-3 text-sm leading-6 text-white/72">{story.whyItMatters}</p></div> : null}
          <div className="space-y-6 text-[1.08rem] leading-[1.85] text-foreground/90">{story.body.map((paragraph, index) => <p key={index} className={index === 0 ? "first-letter:float-left first-letter:mr-2 first-letter:text-6xl first-letter:font-black first-letter:leading-[0.85] first-letter:text-brand-blue" : ""}>{paragraph}</p>)}</div>
          <div className="my-10"><AdSlot placement="articleInline" label="Advertisement" /></div>
          <div className="border-y py-6"><p className="eyebrow text-brand-blue">Tags</p><div className="mt-3 flex flex-wrap gap-2">{story.tags.map((tag) => <Badge key={tag} variant="secondary" className="rounded-full">{tag}</Badge>)}</div></div>
          {configuration.features.newsletters ? <section className="mt-10 bg-secondary p-6"><p className="eyebrow text-brand-blue">The Middlesex Morning</p><h2 className="mt-2 text-2xl font-black text-brand-navy">Understand your community before your first coffee.</h2><p className="mb-5 mt-2 text-sm text-muted-foreground">The most useful local stories, every weekday morning.</p><NewsletterForm /></section> : null}
        </div>
        {story.whyItMatters ? <aside className="hidden lg:block"><div className="sticky top-5 border-t-4 border-brand-yellow bg-brand-navy p-5 text-white"><p className="eyebrow text-brand-yellow">Why it matters</p><p className="mt-3 text-sm leading-6 text-white/72">{story.whyItMatters}</p></div></aside> : null}
      </div>
      {related.length > 0 && <section className="container-news border-t-4 border-brand-navy pt-5"><h2 className="mb-7 text-3xl font-black tracking-[-0.04em] text-brand-navy">More from {story.categoryLabel}</h2><div className="grid gap-7 md:grid-cols-3">{related.map((item) => <StoryCard key={item.id} story={item} />)}</div></section>}
    </article>
  );
}
