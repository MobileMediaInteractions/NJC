import Image from "next/image";
import Link from "next/link";
import { Play } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { timeAgo } from "@/lib/format";
import type { Story } from "@/lib/types";

export function StoryCard({
  story,
  size = "standard",
  className,
}: {
  story: Story;
  size?: "compact" | "standard" | "large" | "horizontal";
  className?: string;
}) {
  if (size === "horizontal") {
    return (
      <article
        className={cn(
          "grid grid-cols-[8rem_1fr] gap-4 border-b pb-5",
          className,
        )}
      >
        <Link
          href={`/story/${story.slug}`}
          className="relative aspect-[4/3] overflow-hidden bg-muted"
        >
          <Image
            src={story.image}
            alt={story.imageAlt}
            fill
            sizes="160px"
            className="object-cover transition-transform duration-500 hover:scale-[1.03]"
          />
        </Link>
        <StoryCopy story={story} compact />
      </article>
    );
  }

  return (
    <article className={cn("group", className)}>
      {size !== "compact" && (
        <Link
          href={`/story/${story.slug}`}
          className={cn(
            "relative mb-4 block overflow-hidden bg-muted",
            size === "large" ? "aspect-[16/9]" : "aspect-[4/3]",
          )}
        >
          <Image
            src={story.image}
            alt={story.imageAlt}
            fill
            sizes={
              size === "large"
                ? "(max-width: 768px) 100vw, 62vw"
                : "(max-width: 768px) 100vw, 33vw"
            }
            className="object-cover transition-transform duration-500 group-hover:scale-[1.025]"
            priority={size === "large"}
          />
          {story.isLive && (
            <span className="absolute bottom-3 left-3 inline-flex items-center gap-1.5 bg-brand-red px-2.5 py-1 text-[0.65rem] font-bold uppercase tracking-widest text-white">
              <span className="size-1.5 animate-pulse rounded-full bg-white" />{" "}
              Live
            </span>
          )}
          {story.videoUrl && (
            <span className="absolute bottom-3 right-3 grid size-9 place-items-center rounded-full bg-white text-brand-navy shadow-md">
              <Play className="size-4 fill-current" />
            </span>
          )}
        </Link>
      )}
      <StoryCopy
        story={story}
        compact={size === "compact"}
        large={size === "large"}
      />
    </article>
  );
}

function StoryCopy({
  story,
  compact = false,
  large = false,
}: {
  story: Story;
  compact?: boolean;
  large?: boolean;
}) {
  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span className="eyebrow text-brand-blue">{story.categoryLabel}</span>
        {story.isExclusive && (
          <Badge className="rounded-none bg-brand-yellow text-brand-navy hover:bg-brand-yellow">
            Exclusive
          </Badge>
        )}
        {story.isBreaking && (
          <Badge className="rounded-none bg-brand-red text-white hover:bg-brand-red">
            Breaking
          </Badge>
        )}
      </div>
      <h2
        className={cn(
          "headline-balance font-black leading-[1.04] tracking-[-0.04em] text-brand-navy",
          large
            ? "text-3xl sm:text-4xl lg:text-[3.15rem]"
            : compact
              ? "text-xl"
              : "text-[1.7rem]",
        )}
      >
        <Link
          href={`/story/${story.slug}`}
          className="decoration-brand-yellow decoration-[3px] underline-offset-4 hover:underline"
        >
          {story.headline}
        </Link>
      </h2>
      {!compact && (
        <p
          className={cn(
            "mt-3 text-muted-foreground",
            large
              ? "max-w-2xl text-base leading-7 sm:text-lg"
              : "line-clamp-2 text-sm leading-6",
          )}
        >
          {story.dek}
        </p>
      )}
      <p className="mt-3 text-[0.7rem] font-medium text-muted-foreground">
        {story.location} · {timeAgo(story.publishedAt)}
      </p>
    </div>
  );
}
