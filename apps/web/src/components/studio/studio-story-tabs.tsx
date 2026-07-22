"use client";

import { ExternalLink, FilePenLine, FileSearch, Inbox } from "lucide-react";
import Link from "next/link";
import { StoryDeleteButton } from "@/components/studio/story-delete-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
  updatedLabel: string;
  canEdit: boolean;
}

export function StudioStoryTabs({ rows, canDelete, canReview }: { rows: StudioStoryRow[]; canDelete: boolean; canReview: boolean }) {
  const counts = countStoriesByQueueTab(rows.map((story) => story.status));

  return (
    <Tabs defaultValue="all" className="mt-7">
      <div className="overflow-x-auto border-b pb-px">
        <TabsList variant="line" className="h-auto min-w-max justify-start gap-3 px-1">
          {storyQueueTabs.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value} className="h-11 px-3">
              {tab.label}
              <Badge variant="secondary" className="min-w-6 justify-center rounded-full px-1.5 text-[0.65rem]">{counts[tab.value]}</Badge>
            </TabsTrigger>
          ))}
        </TabsList>
      </div>
      {storyQueueTabs.map((tab) => {
        const stories = rows.filter((story) => storyMatchesQueueTab(story.status, tab.value));
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
      <CardContent>
        {rows.length ? <StoryTable rows={rows} canDelete={canDelete} canReview={canReview} /> : <EmptyQueue tab={tab} />}
      </CardContent>
    </Card>
  );
}

function StoryTable({ rows, canDelete, canReview }: { rows: StudioStoryRow[]; canDelete: boolean; canReview: boolean }) {
  return (
    <Table>
      <TableHeader><TableRow><TableHead>Headline</TableHead><TableHead>Section</TableHead><TableHead>Owner</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Updated</TableHead><TableHead className="text-right"><span className="sr-only">Actions</span></TableHead></TableRow></TableHeader>
      <TableBody>{rows.map((story) => {
        const reviewAction = story.status === "review" && canReview;
        const editAction = story.canEdit && (story.status === "draft" || story.status === "review");
        const href = reviewAction ? `/studio/stories/${story.id}` : editAction ? `/studio/stories/${story.id}/edit` : `/studio/stories/${story.id}`;
        const label = reviewAction ? "Review" : editAction ? "Edit" : "Open";
        return (
          <TableRow key={story.id}>
            <TableCell className="max-w-80 whitespace-normal"><Link href={href} className="font-medium hover:underline">{story.headline}</Link></TableCell>
            <TableCell className="text-muted-foreground">{story.categoryLabel}</TableCell>
            <TableCell>{story.ownerName}</TableCell>
            <TableCell><StoryStatusBadge status={story.status} /></TableCell>
            <TableCell className="text-right text-xs text-muted-foreground">{story.updatedLabel}</TableCell>
            <TableCell><div className="flex justify-end gap-1"><Button variant={reviewAction ? "default" : "ghost"} size="sm" asChild><Link href={href}>{editAction && !reviewAction ? <FilePenLine /> : <FileSearch />} {label}</Link></Button>{story.status === "published" ? <Button variant="ghost" size="icon-sm" asChild><Link href={`/story/${story.slug}`} aria-label={`View ${story.headline} live`}><ExternalLink /></Link></Button> : null}{canDelete ? <StoryDeleteButton id={story.id} headline={story.headline} published={story.status === "published"} /> : null}</div></TableCell>
          </TableRow>
        );
      })}</TableBody>
    </Table>
  );
}

function StoryStatusBadge({ status }: { status: StoryStatus }) {
  const variant = status === "review" ? "default" : status === "published" ? "secondary" : "outline";
  return <Badge variant={variant} className="capitalize">{status === "review" ? "submitted" : status}</Badge>;
}

function EmptyQueue({ tab }: { tab: StoryQueueTab }) {
  return (
    <div className="grid min-h-56 place-items-center rounded-lg border border-dashed px-6 text-center">
      <div><Inbox className="mx-auto size-8 text-muted-foreground" /><h2 className="mt-3 font-semibold">No {tab === "all" ? "newsroom" : tab} stories</h2><p className="mt-1 text-sm text-muted-foreground">Stories appear here automatically as they move through the editorial workflow.</p></div>
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
  return `${count} ${noun} across the complete newsroom workflow.`;
}
