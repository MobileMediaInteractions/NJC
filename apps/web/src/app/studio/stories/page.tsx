import Link from "next/link";
import { desc } from "drizzle-orm";
import { Database, FilePlus2 } from "lucide-react";
import { getDb, hasDatabase } from "@harborline/backend/db";
import { stories } from "@harborline/backend/schema";
import { StudioGate } from "@/components/studio/studio-gate";
import { StudioShell } from "@/components/studio/studio-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getStudioUser } from "@/lib/auth";
import { siteConfig } from "@/lib/site";

export default async function StudioStoriesPage() {
  const viewer = await getStudioUser();
  if (!viewer) return <StudioGate><></></StudioGate>;

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
                <TableHeader><TableRow><TableHead>Headline</TableHead><TableHead>Section</TableHead><TableHead>Owner</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Updated</TableHead></TableRow></TableHeader>
                <TableBody>{rows.map((story) => {
                  const headline = story.status === "published" ? <Link href={`/story/${story.slug}`} className="font-medium hover:underline">{story.headline}</Link> : <span className="font-medium">{story.headline}</span>;
                  return <TableRow key={story.id}><TableCell>{headline}</TableCell><TableCell className="text-muted-foreground">{story.categoryLabel}</TableCell><TableCell>{story.authorSnapshot?.name ?? "Unassigned"}</TableCell><TableCell><Badge variant={story.status === "review" ? "default" : "secondary"} className="capitalize">{story.status}</Badge></TableCell><TableCell className="text-right text-xs text-muted-foreground">{formatUpdated(story.updatedAt)}</TableCell></TableRow>;
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
