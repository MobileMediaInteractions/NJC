import Image from "next/image";
import Link from "next/link";
import { CheckCircle2, Clock3, FileText, MapPin } from "lucide-react";
import { AdSlot } from "@/components/ad-slot";
import { NewsletterForm } from "@/components/newsletter-form";
import { StoryActions } from "@/components/story-actions";
import { StoryCardV2 } from "@/components/site-v2/story-card-v2";
import { ReadingProgress } from "@/components/site-v2/reading-progress";
import { ArticleTextSizeControl } from "@/components/site-v2/article-text-size-control";
import { StoryPublicNote } from "@/components/story-public-note";
import { StoryRichContent } from "@/components/story-rich-content";
import { formatStoryDate } from "@/lib/format";
import type { SiteConfiguration } from "@/lib/site-settings";
import type { Story } from "@harborline/contracts";

type ShareLinks = {
  articleUrl: string;
  emailUrl: string;
  shareUrl: string;
  xUrl: string;
};

export function StoryV2({ story, related, configuration, authorProfile, shareLinks }: {
  story: Story;
  related: Story[];
  configuration: SiteConfiguration;
  authorProfile?: { slug: string; avatarUrl?: string | null };
  shareLinks: ShareLinks;
}) {
  const publicAuthors = story.authors?.length ? story.authors : [story.author];
  const hasUpdate = Boolean(story.updatedAt && story.updatedAt !== story.publishedAt);

  return (
    <article className="v2-article">
      {configuration.presentation.v2.showReadingProgress ? <ReadingProgress /> : null}
      <header className="v2-article-header" data-reading-progress-start>
        <div className="v2-article-labels">
          <Link href={`/category/${story.category}`}>{story.categoryLabel}</Link>
          {story.isBreaking ? <span className="is-breaking">Breaking</span> : null}
          {story.isLive ? <span className="is-live"><i aria-hidden="true" /> Live</span> : null}
          {story.isExclusive ? <span>Exclusive</span> : null}
          {story.isDeveloping ? <span>Developing</span> : null}
        </div>
        <h1>{story.headline}</h1>
        <p className="v2-article-deck">{story.dek}</p>
        <div className="v2-article-byline">
          <div>
            <p>By {publicAuthors.map((author, index) => <span key={author.id}>{index ? index === publicAuthors.length - 1 ? " and " : ", " : ""}{index === 0 && authorProfile ? <Link href={`/author/${authorProfile.slug}`} rel="author">{author.name}</Link> : author.name}</span>)}</p>
            <p>
              {story.location ? <>Reporting from {story.location}<br /></> : null}
              Published <time dateTime={story.publishedAt}>{formatStoryDate(story.publishedAt)}</time>
              {hasUpdate ? <> · Updated <time dateTime={story.updatedAt!}>{formatStoryDate(story.updatedAt!)}</time></> : null}
              {` · ${story.readingMinutes} min read`}
            </p>
          </div>
          <StoryActions {...shareLinks} headline={story.headline} compact />
        </div>
      </header>

      <figure className="v2-article-hero">
        <div><Image src={story.image} alt={story.imageAlt} fill priority sizes="(max-width: 767px) 100vw, 1180px" /></div>
      </figure>

      <div className="v2-article-reading-shell" data-reading-progress-end>
        <ArticleTextSizeControl />
        <div className="v2-article-copy">
          {story.publicNoteType && story.publicNote ? <StoryPublicNote type={story.publicNoteType} className="v2-article-note">{story.publicNote}</StoryPublicNote> : null}
          {story.whyItMatters ? <aside className="v2-fact-box"><p>Why it matters</p><span>{story.whyItMatters}</span></aside> : null}
          <StoryRichContent document={story.richBody} fallback={story.body} className="v2-rich-copy" />
          <div className="v2-inline-ad"><AdSlot placement="articleInline" label="Advertisement" /></div>
          {story.tags.length ? <div className="v2-article-tags"><p>Topics</p><div>{story.tags.map((tag) => <Link href={`/search?q=${encodeURIComponent(tag)}`} key={tag}>{tag}</Link>)}</div></div> : null}
          {configuration.features.newsletters ? <section className="v2-article-newsletter"><p>The Middlesex Morning</p><h2>Understand your community before your first coffee.</h2><span>The most useful local stories, every weekday morning.</span><NewsletterForm /></section> : null}
        </div>
      </div>

      {configuration.presentation.v2.showArticleTrustPanel ? <StoryTrustPanel story={story} hasUpdate={hasUpdate} /> : null}

      {related.length ? <section className="v2-related v2-page-width"><header><h2>More on this story</h2><Link href={`/category/${story.category}`}>More from {story.categoryLabel} →</Link></header><div>{related.map((item) => <StoryCardV2 key={item.id} story={item} variant="standard" />)}</div></section> : null}
    </article>
  );
}

function StoryTrustPanel({ story, hasUpdate }: { story: Story; hasUpdate: boolean }) {
  return (
    <section className="v2-trust-panel v2-page-width" aria-labelledby="about-this-story">
      <header><p>Transparency</p><h2 id="about-this-story">About this story</h2><span>How this report was produced and maintained.</span></header>
      <dl>
        <div><dt><FileText /> Reporting</dt><dd>{(story.authors?.length ? story.authors : [story.author]).map((author) => author.name).join(", ")}</dd></div>
        {story.location ? <div><dt><MapPin /> Dateline</dt><dd>{story.location}</dd></div> : null}
        <div><dt><Clock3 /> Published</dt><dd><time dateTime={story.publishedAt}>{formatStoryDate(story.publishedAt)}</time>{hasUpdate ? <><br />Last updated <time dateTime={story.updatedAt!}>{formatStoryDate(story.updatedAt!)}</time></> : null}</dd></div>
        <div><dt><CheckCircle2 /> Updates</dt><dd>{story.publicNoteType === "update_note" ? "See the labeled update note above the report." : "No labeled update note is attached to this public version."}</dd></div>
      </dl>
    </section>
  );
}
