import { and, count, desc, eq, gte, inArray } from "drizzle-orm";
import { Activity, Database, FileText, Radio, Users } from "lucide-react";
import Link from "next/link";
import { getDb, hasDatabase } from "@harborline/backend/db";
import { stories } from "@harborline/backend/schema";
import { StudioGate } from "@/components/studio/studio-gate";
import { StudioShell } from "@/components/studio/studio-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getAudienceSummary } from "@/lib/audience";
import { getStudioUser } from "@/lib/auth";
import { getLiveSnapshot } from "@/lib/live";
import { siteConfig } from "@/lib/site";

type QueueRow = Pick<typeof stories.$inferSelect, "id" | "headline" | "categoryLabel" | "status" | "authorSnapshot" | "updatedAt">;

export default async function StudioDashboard() {
  const viewer = await getStudioUser();
  if (!viewer) return <StudioGate><></></StudioGate>;

  const data = await getDashboardData();
  const date = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: siteConfig.timezone,
  }).format(new Date());

  return (
    <StudioShell viewer={viewer}>
      <div>
        <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-primary">{date}</p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight">Newsroom overview</h1>
            <p className="mt-1 text-sm text-muted-foreground">Current publishing and audience activity for the Middlesex County desk.</p>
          </div>
          <Badge variant={data.databaseConnected ? "secondary" : "outline"}>{data.databaseConnected ? "Live database" : "Database not connected"}</Badge>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard icon={<FileText />} label="Published today" value={String(data.publishedToday)} detail="Database publication timestamps" />
          <MetricCard icon={<Activity />} label="In review" value={String(data.inReview)} detail="Stories awaiting editorial action" />
          <MetricCard icon={<Users />} label="Active in 24 hours" value={String(data.active24h)} detail="Consented installations across platforms" />
          <MetricCard icon={<Radio />} label="Live status" value={data.live.isLive ? "On air" : "Off air"} detail={data.live.isLive ? data.live.title : "No active stream"} />
        </div>

        <div className="mt-6 grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-4">
                <div><CardTitle>Newsroom queue</CardTitle><CardDescription>Real stories currently awaiting work or publication.</CardDescription></div>
                <Badge variant="secondary">{data.queue.length} shown</Badge>
              </div>
            </CardHeader>
            <CardContent>
              {data.queue.length ? (
                <Table>
                  <TableHeader><TableRow><TableHead>Story</TableHead><TableHead>Owner</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Updated</TableHead></TableRow></TableHeader>
                  <TableBody>{data.queue.map((story) => {
                    const owner = story.authorSnapshot?.name ?? "Unassigned";
                    return <TableRow key={story.id}><TableCell><Link href={`/studio/stories/${story.id}`} className="max-w-sm font-medium hover:underline">{story.headline}</Link><p className="mt-0.5 text-xs text-muted-foreground">{story.categoryLabel}</p></TableCell><TableCell className="text-xs">{owner}</TableCell><TableCell><Badge variant={story.status === "review" ? "default" : "secondary"} className="capitalize">{story.status}</Badge></TableCell><TableCell className="text-right text-xs text-muted-foreground">{formatUpdated(story.updatedAt)}</TableCell></TableRow>;
                  })}</TableBody>
                </Table>
              ) : (
                <EmptyQueue databaseConnected={data.databaseConnected} />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Production services</CardTitle><CardDescription>Live readiness from configured infrastructure, not preview values.</CardDescription></CardHeader>
            <CardContent className="space-y-4 text-sm">
              <ServiceStatus icon={<Database />} label="Neon Postgres" ready={data.databaseConnected} />
              <ServiceStatus icon={<Users />} label="Audience measurement" ready={data.databaseConnected} />
              <ServiceStatus icon={<Radio />} label="Live stream" ready={Boolean(data.live.streamUrl)} />
            </CardContent>
          </Card>
        </div>
      </div>
    </StudioShell>
  );
}

async function getDashboardData() {
  const live = await getLiveSnapshot();
  if (!hasDatabase()) return { databaseConnected: false, publishedToday: 0, inReview: 0, active24h: 0, queue: [] as QueueRow[], live };

  try {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const db = getDb();
    const [[published], [review], queue, audience] = await Promise.all([
      db.select({ value: count() }).from(stories).where(and(eq(stories.status, "published"), gte(stories.publishedAt, startOfDay))),
      db.select({ value: count() }).from(stories).where(eq(stories.status, "review")),
      db.select({ id: stories.id, headline: stories.headline, categoryLabel: stories.categoryLabel, status: stories.status, authorSnapshot: stories.authorSnapshot, updatedAt: stories.updatedAt }).from(stories).where(inArray(stories.status, ["idea", "assigned", "draft", "review", "scheduled"])).orderBy(desc(stories.updatedAt)).limit(12),
      getAudienceSummary(),
    ]);
    return { databaseConnected: true, publishedToday: published?.value ?? 0, inReview: review?.value ?? 0, active24h: audience.totals.active24h, queue, live };
  } catch (error) {
    console.error("Studio dashboard lookup failed", error);
    return { databaseConnected: false, publishedToday: 0, inReview: 0, active24h: 0, queue: [] as QueueRow[], live };
  }
}

function MetricCard({ icon, label, value, detail }: { icon: React.ReactNode; label: string; value: string; detail: string }) {
  return <Card><CardContent className="p-5"><div className="flex items-start justify-between"><div><p className="text-sm text-muted-foreground">{label}</p><p className="mt-2 text-3xl font-bold tracking-tight">{value}</p><p className="mt-1 text-xs text-muted-foreground">{detail}</p></div><span className="rounded-md bg-primary/10 p-2 text-primary [&_svg]:size-4">{icon}</span></div></CardContent></Card>;
}

function ServiceStatus({ icon, label, ready }: { icon: React.ReactNode; label: string; ready: boolean }) {
  return <div className="flex items-center justify-between gap-4 border-b pb-4 last:border-0 last:pb-0"><span className="flex items-center gap-2 text-muted-foreground [&_svg]:size-4">{icon}{label}</span><Badge variant={ready ? "secondary" : "outline"}>{ready ? "Ready" : "Not configured"}</Badge></div>;
}

function EmptyQueue({ databaseConnected }: { databaseConnected: boolean }) {
  return <div className="py-12 text-center"><p className="font-medium">{databaseConnected ? "No stories in the editorial queue" : "Connect Postgres to load the editorial queue"}</p><p className="mt-1 text-xs text-muted-foreground">{databaseConnected ? "Create a story when reporting is ready." : "No sample assignments are substituted."}</p></div>;
}

function formatUpdated(value: Date) {
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: siteConfig.timezone }).format(value);
}
