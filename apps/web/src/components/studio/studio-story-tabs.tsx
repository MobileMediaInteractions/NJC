"use client";

import { ExternalLink, Eye, FilePenLine, FileSearch, Inbox } from "lucide-react";
import Link from "next/link";
import { StoryDeleteButton } from "@/components/studio/story-delete-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { countStoriesByQueueTab, storyMatchesQueueTab, storyQueueTabs, type StoryQueueTab } from "@/lib/story-queue";
import type { StoryStatus } from "@/lib/types";

export interface StudioStoryRow {
  id: string;
  slug: string;
  headline: string;
  categoryLabel: string;
  ownerName: string;
  status: StoryStatus;
  isActive: boolean;
  views: number;
  views7d: number;
  updatedLabel: string;
  canEdit: boolean;
}

export function StudioStoryTabs({ rows, canDelete, canReview }: { rows: StudioStoryRow[]; canDelete: boolean; canReview: boolean }) {
  const counts = countStoriesByQueueTab(rows);

  return (
    <Tabs defaultValue="active" className="mt-7">
      <div className="rounded-xl border bg-muted/30 p-1">
        <TabsList className="grid h-auto w-full grid-cols-2 gap-1 bg-transparent p-0 sm:grid-cols-3 xl:grid-cols-6">
          {storyQueueTabs.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value} className="h-10 min-w-0 px-2">
              {tab.label}
              <Badge variant="secondary" className="min-w-6 justify-center rounded-full px-1.5 text-[0.65rem]">{counts[tab.value]}</Badge>
            </TabsTrigger>
          ))}
        </TabsList>
      </div>
      {storyQueueTabs.map((tab) => {
        const stories = rows.filter((story) => storyMatchesQueueTab(story, tab.value));
        return (
          <TabsContent key={tab.value} value={tab.value} className="pt-4">
            <StoryQueueCard tab={tab.value} label={tab.label} rows={stories} canDelete={canDelete} canReview={canReview} />
          </TabsContent>
        );
      })}
    </Tabs>
  );
}

function StoryQueueCard({ tab, label, rows, canDelete, canReview }: { tab: StoryQueueTab; label: string; rows: StudioStoryRow[]; canDelete: boolean; canReview: boolean }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{label} stories</CardTitle>
        <CardDescription>{queueDescription(tab, rows.length)}</CardDescription>
      </CardHeader>
      <CardContent className={rows.length ? "px-0" : undefined}>
        {rows.length ? <StoryList rows={rows} canDelete={canDelete} canReview={canReview} /> : <EmptyQueue tab={tab} />}
      </CardContent>
    </Card>
  );
}

function StoryList({ rows, canDelete, canReview }: { rows: StudioStoryRow[]; canDelete: boolean; canReview: boolean }) {
  return (
    <div className="border-t">
      {rows.map((story) => {
        const reviewAction = story.status === "review" && canReview;
        const editAction =
          story.canEdit &&
          (story.status === "draft" ||
            story.status === "review" ||
            story.status === "scheduled" ||
            (story.status === "published" && story.isActive));
        const href = reviewAction ? `/studio/stories/${story.id}` : editAction ? `/studio/stories/${story.id}/edit` : `/studio/stories/${story.id}`;
        const label = reviewAction ? "Review" : editAction ? "Edit" : "Open";
        return (
          <article key={story.id} className="grid gap-4 border-b px-4 py-4 last:border-b-0 lg:grid-cols-[minmax(0,1fr)_minmax(8rem,auto)_minmax(9rem,auto)_auto] lg:items-center">
            <div className="min-w-0">
              <Link href={href} className="font-medium leading-snug text-balance hover:underline">{story.headline}</Link>
              <p className="mt-1 text-xs text-muted-foreground">
                {story.categoryLabel} <span aria-hidden="true">·</span> {story.ownerName} <span aria-hidden="true">·</span> Updated {story.updatedLabel}
              </p>
            </div>
            <div className="flex flex-wrap gap-1 lg:justify-start">
              <StoryStatusBadge status={story.status} />
              {story.status === "published" ? <Badge variant={story.isActive ? "default" : "outline"}>{story.isActive ? "Active" : "Final"}</Badge> : null}
            </div>
            <div className="flex items-center gap-2" aria-label={`${story.views} verified lifetime views; ${story.views7d} in the last seven days`}>
              <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground"><Eye className="size-4" /></span>
              <div>
                <p className="font-mono text-sm font-semibold tabular-nums">{numberFormat.format(story.views)}</p>
                <p className="text-[0.7rem] text-muted-foreground">{numberFormat.format(story.views7d)} in 7 days</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-1 lg:justify-end">
              <Button variant={reviewAction ? "default" : "ghost"} size="sm" asChild><Link href={href}>{editAction && !reviewAction ? <FilePenLine /> : <FileSearch />} {label}</Link></Button>
              {story.status === "published" ? <Button variant="ghost" size="icon-sm" asChild><Link href={`/story/${story.slug}`} aria-label={`View ${story.headline} live`}><ExternalLink /></Link></Button> : null}
              {canDelete ? <StoryDeleteButton id={story.id} headline={story.headline} published={story.status === "published"} /> : null}
            </div>
          </article>
        );
      })}
    </div>
  );
}

function StoryStatusBadge({ status }: { status: StoryStatus }) {
  const variant = status === "review" ? "default" : status === "published" ? "secondary" : "outline";
  return <Badge variant={variant} className="capitalize">{status === "review" ? "submitted" : status}</Badge>;
}

function EmptyQueue({ tab }: { tab: StoryQueueTab }) {
  return (
    <div className="grid min-h-56 place-items-center rounded-lg border border-dashed px-6 text-center">
      <div><Inbox className="mx-auto size-8 text-muted-foreground" /><h2 className="mt-3 font-semibold">No {tab} stories</h2><p className="mt-1 text-sm text-muted-foreground">Stories appear here automatically as they move through the editorial workflow.</p></div>
    </div>
  );
}

function queueDescription(tab: StoryQueueTab, count: number) {
  const noun = count === 1 ? "story" : "stories";
  if (tab === "drafts") return `${count} ${noun} still being written or assigned.`;
  if (tab === "submitted") return `${count} ${noun} waiting for editorial review.`;
  if (tab === "scheduled") return `${count} ${noun} queued for automatic publication.`;
  if (tab === "complete") return `${count} published ${noun} available to readers.`;
  if (tab === "archived") return `${count} ${noun} retained outside the active workflow.`;
  return `${count} ${noun} still moving through the desk or published as an active story.`;
}

const numberFormat = new Intl.NumberFormat("en-US");
