import Image from "next/image";
import Link from "next/link";
import { timeAgo } from "@/lib/format";
import type { Story } from "@harborline/contracts";

export function StoryCardV2({ story, variant = "standard" }: { story: Story; variant?: "standard" | "compact" | "horizontal" }) {
  if (variant === "compact") {
    return <article className="v2-card v2-card--compact"><p>{story.categoryLabel}</p><h2><Link href={`/story/${story.slug}`}>{story.headline}</Link></h2><time dateTime={story.publishedAt}>{timeAgo(story.publishedAt)}</time></article>;
  }
  return (
    <article className={`v2-card ${variant === "horizontal" ? "v2-card--horizontal" : ""}`}>
      <Link href={`/story/${story.slug}`} className="v2-card__media" tabIndex={-1} aria-hidden="true"><Image src={story.image} alt="" fill sizes={variant === "horizontal" ? "180px" : "(max-width: 767px) 100vw, 33vw"} /></Link>
      <div><p>{story.isBreaking ? "Breaking · " : ""}{story.categoryLabel}</p><h2><Link href={`/story/${story.slug}`}>{story.headline}</Link></h2>{variant !== "horizontal" ? <span className="v2-card__deck">{story.dek}</span> : null}<span className="v2-card__time"><time dateTime={story.publishedAt}>{timeAgo(story.publishedAt)}</time> · {story.readingMinutes} min read</span></div>
    </article>
  );
}
