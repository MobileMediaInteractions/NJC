import { eq } from "drizzle-orm";
import { CalendarClock, ImageIcon, Search, UserRound } from "lucide-react";
import Image from "next/image";
import { notFound } from "next/navigation";
import { z } from "zod";
import { getDb, hasDatabase } from "@harborline/backend/db";
import { stories } from "@harborline/backend/schema";
import { StudioGate } from "@/components/studio/studio-gate";
import { StoryReviewActions } from "@/components/studio/story-review-actions";
import { StudioShell } from "@/components/studio/studio-shell";
import { StoryTimestampEditor } from "@/components/studio/story-timestamp-editor";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { getStudioUser } from "@/lib/auth";
import { getSiteConfiguration } from "@/lib/site-settings";
import { canPublishStory } from "@/lib/story-workflow";

const storyId = z.uuid();

export default async function StudioStoryReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const viewer = await getStudioUser();
  if (!viewer) return <StudioGate><></></StudioGate>;

  const parsedId = storyId.safeParse((await params).id);
  if (!parsedId.success) notFound();

  if (!hasDatabase()) return <StudioShell viewer={viewer}><ServiceUnavailable /></StudioShell>;

  let story: typeof stories.$inferSelect | undefined;
  try {
    [story] = await getDb().select().from(stories).where(eq(stories.id, parsedId.data)).limit(1);
  } catch (error) {
    console.error("Studio story review lookup failed", { storyId: parsedId.data, error });
    return <StudioShell viewer={viewer}><ServiceUnavailable /></StudioShell>;
  }
  if (!story) notFound();
  const canPublish = canPublishStory(viewer.role);
  const configuration = await getSiteConfiguration();

  return (
    <StudioShell viewer={viewer}>
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-start">
          <div className="max-w-3xl">
            <div className="flex flex-wrap items-center gap-2"><Badge className="capitalize">{story.status}</Badge><span className="text-sm text-muted-foreground">{story.categoryLabel}</span></div>
            <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">{story.headline}</h1>
            <p className="mt-3 text-lg leading-7 text-muted-foreground">{story.dek}</p>
          </div>
          <StoryReviewActions id={story.id} slug={story.slug} headline={story.headline} status={story.status} canPublish={canPublish} canSubmitReview={canPublish || story.authorSnapshot?.id === viewer.id} />
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <Card>
            <CardHeader><CardTitle>Editorial preview</CardTitle><CardDescription>Review the complete copy and lead image before changing its status.</CardDescription></CardHeader>
            <CardContent>
              {story.imageUrl ? <figure className="mb-7"><div className="relative aspect-video overflow-hidden rounded-md bg-muted"><Image src={story.imageUrl} alt={story.imageAlt ?? ""} fill priority sizes="(max-width: 1024px) 100vw, 760px" className="object-cover" /></div>{story.imageAlt ? <figcaption className="mt-2 text-xs text-muted-foreground">{story.imageAlt}</figcaption> : null}</figure> : <div className="mb-7 grid min-h-40 place-items-center rounded-md border border-dashed text-muted-foreground"><div className="text-center"><ImageIcon className="mx-auto size-6" /><p className="mt-2 text-sm">No lead image</p></div></div>}
              <article className="space-y-5 text-[1.05rem] leading-8">{story.body.map((paragraph, index) => <p key={`${story.id}-${index}`}>{paragraph}</p>)}</article>
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card><CardHeader><CardTitle className="text-base">Story details</CardTitle></CardHeader><CardContent className="space-y-4 text-sm">
              <Detail icon={<UserRound />} label="Owner" value={story.authorSnapshot?.name ?? "Unassigned"} />
              <Detail icon={<CalendarClock />} label="Updated" value={formatDate(story.updatedAt)} />
              <Separator />
              <div><p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Dateline</p><p className="mt-1">{story.location}</p></div>
              <div><p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Tags</p><div className="mt-2 flex flex-wrap gap-1.5">{story.tags.length ? story.tags.map((tag) => <Badge key={tag} variant="secondary">{tag}</Badge>) : <span className="text-muted-foreground">No tags</span>}</div></div>
            </CardContent></Card>
            {story.status === "published" && story.publishedAt && canPublish ? <StoryTimestampEditor id={story.id} publishedAt={story.publishedAt.toISOString()} updatedAt={story.updatedAt.toISOString()} publicationTimezone={configuration.publication.timezone} /> : null}
            <Card><CardHeader><CardTitle className="flex items-center gap-2 text-base"><Search className="size-4" /> Search appearance</CardTitle></CardHeader><CardContent className="space-y-4 text-sm"><div><p className="font-medium">{story.seoTitle || story.headline}</p><p className="mt-1 leading-6 text-muted-foreground">{story.seoDescription || story.dek}</p></div><p className="break-all text-xs text-emerald-400">/story/{story.slug}</p>{story.noIndex ? <Badge variant="destructive">Excluded from search</Badge> : <Badge variant="secondary">Indexable</Badge>}</CardContent></Card>
          </div>
        </div>
      </div>
    </StudioShell>
  );
}

function Detail({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return <div className="flex gap-3"><span className="mt-0.5 text-muted-foreground [&>svg]:size-4">{icon}</span><div><p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p><p className="mt-1">{value}</p></div></div>;
}

function ServiceUnavailable() {
  return <Card><CardHeader><CardTitle>Story review unavailable</CardTitle><CardDescription>The production database could not be reached. No editorial action was taken.</CardDescription></CardHeader></Card>;
}

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: "America/New_York" }).format(value);
}
