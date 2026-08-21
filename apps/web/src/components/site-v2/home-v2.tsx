import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Mail } from "lucide-react";
import { AdSlot } from "@/components/ad-slot";
import { LiveCoverageCard } from "@/components/live-coverage-card";
import { NewsletterForm } from "@/components/newsletter-form";
import { timeAgo } from "@/lib/format";
import type { SiteConfiguration, V2HomepageModuleKey } from "@/lib/site-settings";
import type { LiveCoverageEvent, Story } from "@harborline/contracts";

export function HomeV2({
  stories,
  configuration,
  liveEvent,
  date,
}: {
  stories: Story[];
  configuration: SiteConfiguration;
  liveEvent?: LiveCoverageEvent;
  date: string;
}) {
  const [lead] = stories;
  const secondary = stories.slice(1, 3);
  // The chronological rail is intentionally independent from editorial hero
  // placement: a lead story is still one of the newsroom's newest reports.
  const latest = stories.slice(0, 6);
  const sectionStories = stories.slice(9);
  const modules = configuration.presentation.v2.homepageModules;

  return (
    <div className="v2-home">
      <section className="v2-today-heading">
        <p>{date}</p>
        <h1>Today</h1>
        <span>The reporting shaping New Jersey right now.</span>
      </section>

      {modules.map((module) => (
        <HomeModule
          key={module}
          module={module}
          lead={lead}
          secondary={secondary}
          latest={latest}
          sectionStories={sectionStories}
          liveEvent={liveEvent}
          configuration={configuration}
        />
      ))}

      <div className="v2-page-width v2-home-ad"><AdSlot placement="homepageLeaderboard" size="leaderboard" /></div>
    </div>
  );
}

function HomeModule({ module, lead, secondary, latest, sectionStories, liveEvent, configuration }: {
  module: V2HomepageModuleKey;
  lead?: Story;
  secondary: Story[];
  latest: Story[];
  sectionStories: Story[];
  liveEvent?: LiveCoverageEvent;
  configuration: SiteConfiguration;
}) {
  if (module === "live") return liveEvent ? <section className="v2-page-width v2-live-module"><LiveCoverageCard event={liveEvent} featured /></section> : null;
  if (module === "lead") return lead ? <LeadStory story={lead} /> : <EmptyV2Homepage />;
  if (module === "secondary") return secondary.length ? <SecondaryStories stories={secondary} /> : null;
  if (module === "latest") return latest.length ? <LatestRail stories={latest} /> : null;
  if (module === "sections") return sectionStories.length ? <TopicSections stories={sectionStories} /> : null;
  if (module === "newsletter") return configuration.features.newsletters ? <NewsletterModule /> : null;
  return null;
}

function LeadStory({ story }: { story: Story }) {
  return (
    <section className="v2-lead v2-page-width">
      <Link href={`/story/${story.slug}`} className="v2-lead__media" tabIndex={-1} aria-hidden="true">
        <Image src={story.image} alt="" fill priority sizes="(max-width: 767px) 100vw, (max-width: 1279px) 58vw, 780px" />
      </Link>
      <div className="v2-lead__copy">
        <StoryLabel story={story} />
        <h2><Link href={`/story/${story.slug}`}>{story.headline}</Link></h2>
        <p>{story.dek}</p>
        <StoryTime story={story} />
      </div>
    </section>
  );
}

function SecondaryStories({ stories }: { stories: Story[] }) {
  return (
    <section className="v2-page-width v2-secondary-stories" aria-label="More top stories">
      {stories.map((story, index) => (
        <article key={story.id} className={index === 0 ? "v2-feature-story" : "v2-feature-story v2-feature-story--reverse"}>
          <Link href={`/story/${story.slug}`} className="v2-feature-story__media" tabIndex={-1} aria-hidden="true">
            <Image src={story.image} alt="" fill sizes="(max-width: 767px) 100vw, 48vw" />
          </Link>
          <div><StoryLabel story={story} /><h2><Link href={`/story/${story.slug}`}>{story.headline}</Link></h2><p>{story.dek}</p><StoryTime story={story} /></div>
        </article>
      ))}
    </section>
  );
}

function LatestRail({ stories }: { stories: Story[] }) {
  return (
    <section className="v2-page-width v2-latest">
      <SectionTitle title="Latest" href="/latest" />
      <ol>{stories.map((story) => <li key={story.id}><time dateTime={story.publishedAt}>{new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(new Date(story.publishedAt))}</time><Link href={`/story/${story.slug}`}>{story.headline}</Link><span>{story.categoryLabel}</span></li>)}</ol>
    </section>
  );
}

function TopicSections({ stories }: { stories: Story[] }) {
  const grouped = new Map<string, Story[]>();
  for (const story of stories) {
    const group = grouped.get(story.category) ?? [];
    if (group.length < 4) group.push(story);
    grouped.set(story.category, group);
  }
  return <div className="v2-topic-stack">{[...grouped.entries()].slice(0, 4).map(([category, items]) => <TopicSection key={category} category={category} stories={items} />)}</div>;
}

function TopicSection({ category, stories }: { category: string; stories: Story[] }) {
  const [feature, ...compact] = stories;
  if (!feature) return null;
  return (
    <section className={`v2-page-width v2-topic v2-topic--${category}`}>
      <SectionTitle title={feature.categoryLabel} href={`/category/${category}`} />
      <div className="v2-topic__grid">
        <article className="v2-topic__feature"><Link href={`/story/${feature.slug}`} className="v2-topic__media" tabIndex={-1} aria-hidden="true"><Image src={feature.image} alt="" fill sizes="(max-width: 767px) 100vw, 60vw" /></Link><StoryLabel story={feature} /><h2><Link href={`/story/${feature.slug}`}>{feature.headline}</Link></h2><p>{feature.dek}</p><StoryTime story={feature} /></article>
        <div className="v2-topic__compact">{compact.map((story) => <article key={story.id}><StoryLabel story={story} /><h3><Link href={`/story/${story.slug}`}>{story.headline}</Link></h3><StoryTime story={story} /></article>)}</div>
      </div>
    </section>
  );
}

function NewsletterModule() {
  return (
    <section className="v2-newsletter">
      <div><p className="v2-kicker"><Mail /> The Middlesex Morning</p><h2>A concise briefing of what matters, before the day gets noisy.</h2><p>Independent local reporting delivered every weekday. Breaking alerts remain separate.</p></div>
      <NewsletterForm />
    </section>
  );
}

function SectionTitle({ title, href }: { title: string; href: string }) {
  return <header className="v2-section-title"><h2>{title}</h2><Link href={href}>See all <ArrowRight /></Link></header>;
}

function StoryLabel({ story }: { story: Story }) {
  return <p className={`v2-story-label ${story.isBreaking ? "v2-story-label--breaking" : story.isLive ? "v2-story-label--live" : ""}`}>{story.isLive ? <i aria-hidden="true" /> : null}{story.isBreaking ? "Breaking · " : ""}{story.categoryLabel}{story.isExclusive ? " · Exclusive" : ""}</p>;
}

function StoryTime({ story }: { story: Story }) {
  return <p className="v2-story-time"><time dateTime={story.publishedAt}>{timeAgo(story.publishedAt)}</time> · {story.readingMinutes} min read</p>;
}

function EmptyV2Homepage() {
  return <section className="v2-empty v2-page-width"><p>Newsroom ready</p><h2>The first verified story will appear here.</h2><span>No sample reporting is used. Publishing remains controlled through Studio.</span><Link href="/studio">Open Studio <ArrowRight /></Link></section>;
}
