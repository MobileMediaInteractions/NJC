import { and, desc, eq, isNotNull, sql } from "drizzle-orm";
import { Database, FilePlus2 } from "lucide-react";
import Link from "next/link";
import { getDb, hasDatabase } from "@harborline/backend/db";
import { analyticsDailyViews, stories } from "@harborline/backend/schema";
import { StudioGate } from "@/components/studio/studio-gate";
import { StudioShell } from "@/components/studio/studio-shell";
import { StudioStoryTabs, type StudioStoryRow } from "@/components/studio/studio-story-tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { canDeleteStory, getStudioUser } from "@/lib/auth";
import { siteConfig } from "@/lib/site";
import { canPublishStory } from "@/lib/story-workflow";
import { publicationDay } from "@/lib/traffic-analytics";

export default async function StudioStoriesPage() {
  const viewer = await getStudioUser();
  if (!viewer) return <StudioGate><></></StudioGate>;
  const showDeleteActions = canDeleteStory(viewer.role);
  const showReviewActions = canPublishStory(viewer.role);

  let databaseConnected = hasDatabase();
  let rows: Array<typeof stories.$inferSelect> = [];
  let viewRows: Array<{ storySlug: string | null; views: number; views7d: number }> = [];
  if (databaseConnected) {
    const now = new Date();
    const sevenDayStart = new Date(now);
    sevenDayStart.setDate(sevenDayStart.getDate() - 6);
    const verifiedTraffic = and(
      eq(analyticsDailyViews.calculationVersion, 2),
      eq(analyticsDailyViews.qualityStatus, "verified"),
      eq(analyticsDailyViews.environment, "production"),
      isNotNull(analyticsDailyViews.storySlug),
    );
    const db = getDb();
    const [storiesResult, viewsResult] = await Promise.allSettled([
      db.select().from(stories).orderBy(desc(stories.updatedAt)).limit(200),
      db
        .select({
          storySlug: analyticsDailyViews.storySlug,
          views: sql<number>`coalesce(sum(${analyticsDailyViews.views}), 0)::int`,
          views7d: sql<number>`coalesce(sum(${analyticsDailyViews.views}) filter (where ${analyticsDailyViews.day} >= ${publicationDay(sevenDayStart)}), 0)::int`,
        })
        .from(analyticsDailyViews)
        .where(verifiedTraffic)
        .groupBy(analyticsDailyViews.storySlug),
    ]);

    if (storiesResult.status === "fulfilled") {
      rows = storiesResult.value;
    } else {
      console.error("Studio stories lookup failed", storiesResult.reason);
      databaseConnected = false;
    }
    if (viewsResult.status === "fulfilled") {
      viewRows = viewsResult.value;
    } else {
      console.error("Studio story view lookup failed", viewsResult.reason);
    }
  }

  const viewsBySlug = new Map(viewRows.map((row) => [row.storySlug, row]));

  const storyRows: StudioStoryRow[] = rows.map((story) => ({
    id: story.id,
    slug: story.slug,
    headline: story.headline,
    categoryLabel: story.categoryLabel,
    ownerName: story.authorSnapshot?.name ?? "Unassigned",
    status: story.status,
    isActive: story.isActive,
    views: Math.max(0, Number(viewsBySlug.get(story.slug)?.views ?? 0)),
    views7d: Math.max(0, Number(viewsBySlug.get(story.slug)?.views7d ?? 0)),
    updatedLabel: formatUpdated(story.updatedAt),
    canEdit:
      story.status === "published"
        ? story.isActive &&
          (showReviewActions ||
            Boolean(viewer.databaseId && story.authorId === viewer.databaseId))
        : showReviewActions ||
          Boolean(viewer.databaseId && story.authorId === viewer.databaseId),
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
