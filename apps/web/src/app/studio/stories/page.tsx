import { desc } from "drizzle-orm";
import { Database, FilePlus2 } from "lucide-react";
import Link from "next/link";
import { getDb, hasDatabase } from "@harborline/backend/db";
import { stories } from "@harborline/backend/schema";
import { StudioGate } from "@/components/studio/studio-gate";
import { StudioShell } from "@/components/studio/studio-shell";
import { StudioStoryTabs, type StudioStoryRow } from "@/components/studio/studio-story-tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { canDeleteStory, getStudioUser } from "@/lib/auth";
import { siteConfig } from "@/lib/site";
import { canPublishStory } from "@/lib/story-workflow";

export default async function StudioStoriesPage() {
  const viewer = await getStudioUser();
  if (!viewer) return <StudioGate><></></StudioGate>;
  const showDeleteActions = canDeleteStory(viewer.role);
  const showReviewActions = canPublishStory(viewer.role);

  let databaseConnected = hasDatabase();
  let rows: Array<typeof stories.$inferSelect> = [];
  if (databaseConnected) {
    try {
      rows = await getDb().select().from(stories).orderBy(desc(stories.updatedAt)).limit(200);
    } catch (error) {
      console.error("Studio stories lookup failed", error);
      databaseConnected = false;
    }
  }

  const storyRows: StudioStoryRow[] = rows.map((story) => ({
    id: story.id,
    slug: story.slug,
    headline: story.headline,
    categoryLabel: story.categoryLabel,
    ownerName: story.authorSnapshot?.name ?? "Unassigned",
    status: story.status,
    updatedLabel: formatUpdated(story.updatedAt),
    canEdit: showReviewActions || story.authorSnapshot?.id === viewer.id,
  }));

  return (
    <StudioShell viewer={viewer}>
      <div>
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <div className="flex flex-wrap items-center gap-3"><h1 className="text-3xl font-bold tracking-tight">Stories</h1><Badge variant={databaseConnected ? "secondary" : "outline"}>{databaseConnected ? "Live database" : "Database not connected"}</Badge></div>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">Move reporting from working draft to editorial review, scheduled publication and the completed archive.</p>
          </div>
          <Button asChild><Link href="/studio/stories/new"><FilePlus2 /> New story</Link></Button>
        </div>

        {databaseConnected ? (
          <StudioStoryTabs rows={storyRows} canDelete={showDeleteActions} canReview={showReviewActions} />
        ) : (
          <Card className="mt-7"><CardContent><div className="grid min-h-64 place-items-center border border-dashed px-6 text-center"><div><Database className="mx-auto size-8 text-muted-foreground" /><h2 className="mt-3 font-semibold">Postgres is not connected</h2><p className="mt-1 text-sm text-muted-foreground">Reconnect the production database before opening or saving newsroom stories. No sample records are shown.</p></div></div></CardContent></Card>
        )}
      </div>
    </StudioShell>
  );
}

function formatUpdated(value: Date) {
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: siteConfig.timezone }).format(value);
}
