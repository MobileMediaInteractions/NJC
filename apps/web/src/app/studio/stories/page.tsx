import Link from "next/link";
import { desc } from "drizzle-orm";
import { Database, ExternalLink, FilePlus2, FileSearch } from "lucide-react";
import { getDb, hasDatabase } from "@harborline/backend/db";
import { stories } from "@harborline/backend/schema";
import { StudioGate } from "@/components/studio/studio-gate";
import { StudioShell } from "@/components/studio/studio-shell";
import { StoryDeleteButton } from "@/components/studio/story-delete-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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

  return (
    <StudioShell viewer={viewer}>
      <div>
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div><h1 className="text-3xl font-bold tracking-tight">Stories</h1><p className="mt-1 text-sm text-muted-foreground">Manage reporting from the production database.</p></div>
          <Button asChild><Link href="/studio/stories/new"><FilePlus2 /> New story</Link></Button>
        </div>

        <Card className="mt-7">
          <CardHeader className="flex-row items-start justify-between gap-4">
            <div><CardTitle>Newsroom stories</CardTitle><CardDescription>Up to 200 records, most recently updated first.</CardDescription></div>
            <Badge variant={databaseConnected ? "secondary" : "outline"}>{databaseConnected ? "Live database" : "Database not connected"}</Badge>
          </CardHeader>
          <CardContent>
            {rows.length ? (
              <Table>
                <TableHeader><TableRow><TableHead>Headline</TableHead><TableHead>Section</TableHead><TableHead>Owner</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Updated</TableHead><TableHead className="text-right"><span className="sr-only">Actions</span></TableHead></TableRow></TableHeader>
                <TableBody>{rows.map((story) => {
                  const actionLabel = story.status === "review" && showReviewActions ? "Review" : "Open";
                  return <TableRow key={story.id}><TableCell><Link href={`/studio/stories/${story.id}`} className="font-medium hover:underline">{story.headline}</Link></TableCell><TableCell className="text-muted-foreground">{story.categoryLabel}</TableCell><TableCell>{story.authorSnapshot?.name ?? "Unassigned"}</TableCell><TableCell><Badge variant={story.status === "review" ? "default" : "secondary"} className="capitalize">{story.status}</Badge></TableCell><TableCell className="text-right text-xs text-muted-foreground">{formatUpdated(story.updatedAt)}</TableCell><TableCell><div className="flex justify-end gap-1"><Button variant={story.status === "review" && showReviewActions ? "default" : "ghost"} size="sm" asChild><Link href={`/studio/stories/${story.id}`}><FileSearch /> {actionLabel}</Link></Button>{story.status === "published" ? <Button variant="ghost" size="icon-sm" asChild><Link href={`/story/${story.slug}`} aria-label={`View ${story.headline} live`}><ExternalLink /></Link></Button> : null}{showDeleteActions ? <StoryDeleteButton id={story.id} headline={story.headline} published={story.status === "published"} /> : null}</div></TableCell></TableRow>;
                })}</TableBody>
              </Table>
            ) : (
              <div className="grid min-h-64 place-items-center border border-dashed px-6 text-center">
                <div><Database className="mx-auto size-8 text-muted-foreground" /><h2 className="mt-3 font-semibold">{databaseConnected ? "No newsroom stories yet" : "Postgres is not connected"}</h2><p className="mt-1 text-sm text-muted-foreground">{databaseConnected ? "Create the first verified story when reporting is ready." : "Connect Neon and apply migrations. No sample stories are shown."}</p></div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </StudioShell>
  );
}

function formatUpdated(value: Date) {
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: siteConfig.timezone }).format(value);
}
