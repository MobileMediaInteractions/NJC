import { and, count, desc, eq, gte, inArray } from "drizzle-orm";
import {
  Activity,
  ArrowRight,
  Database,
  FilePlus2,
  FileText,
  Library,
  Radio,
  Users,
} from "lucide-react";
import Link from "next/link";
import { getDb, hasDatabase } from "@harborline/backend/db";
import { stories } from "@harborline/backend/schema";
import { StudioGate } from "@/components/studio/studio-gate";
import { StudioShell } from "@/components/studio/studio-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
      <div className="space-y-6">
        <section className="overflow-hidden rounded-2xl bg-[#102f25] text-white shadow-sm ring-1 ring-black/10">
          <div className="flex flex-wrap items-start justify-between gap-5 px-5 py-6 sm:px-7">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-[#e0b45e]">
                {date}
              </p>
              <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
                Newsroom control room
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-white/62">
                One calm view of the work that needs attention, audience
                activity and the systems carrying today’s coverage.
              </p>
            </div>
            <div className="flex items-center gap-2 rounded-full border border-white/12 bg-white/7 px-3 py-1.5 text-xs font-semibold">
              <span
                className={`size-2 rounded-full ${
                  data.databaseConnected ? "bg-emerald-400" : "bg-amber-400"
                }`}
              />
              {data.databaseConnected
                ? "Production connected"
                : "Production needs attention"}
            </div>
          </div>
          <div className="grid border-t border-white/10 sm:grid-cols-2 xl:grid-cols-4">
            <ControlMetric
              icon={<FileText />}
              label="Published today"
              value={String(data.publishedToday)}
              detail="Publication timestamps"
            />
            <ControlMetric
              icon={<Activity />}
              label="Awaiting review"
              value={String(data.inReview)}
              detail="Editorial decisions due"
            />
            <ControlMetric
              icon={<Users />}
              label="Active in 24 hours"
              value={String(data.active24h)}
              detail="Consented installations"
            />
            <ControlMetric
              icon={<Radio />}
              label="Live desk"
              value={data.live.isLive ? "On air" : "Off air"}
              detail={data.live.isLive ? data.live.title : "No active stream"}
            />
          </div>
        </section>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(18rem,0.55fr)]">
          <Card className="gap-0 py-0">
            <CardHeader className="border-b py-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <CardTitle>Priority queue</CardTitle>
                  <CardDescription>
                    The latest real stories still moving through production.
                  </CardDescription>
                </div>
                <Badge variant="secondary">{data.queue.length} shown</Badge>
              </div>
            </CardHeader>
            <CardContent className="overflow-x-auto px-0">
              {data.queue.length ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="pl-5">Story</TableHead>
                      <TableHead>Owner</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="pr-5 text-right">
                        Updated
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.queue.map((story) => {
                      const owner =
                        story.authorSnapshot?.name ?? "Unassigned";
                      return (
                        <TableRow key={story.id}>
                          <TableCell className="pl-5">
                            <Link
                              href={`/studio/stories/${story.id}`}
                              className="max-w-sm font-medium hover:underline"
                            >
                              {story.headline}
                            </Link>
                            <p className="mt-0.5 text-xs text-muted-foreground">
                              {story.categoryLabel}
                            </p>
                          </TableCell>
                          <TableCell className="text-xs">{owner}</TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                story.status === "review"
                                  ? "default"
                                  : "secondary"
                              }
                              className="capitalize"
                            >
                              {story.status === "review"
                                ? "Submitted"
                                : story.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="pr-5 text-right text-xs text-muted-foreground">
                            {formatUpdated(story.updatedAt)}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              ) : (
                <EmptyQueue databaseConnected={data.databaseConnected} />
              )}
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Start work</CardTitle>
                <CardDescription>
                  Common newsroom actions, kept close without filling the
                  global navigation.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-2">
                <Button asChild className="justify-between">
                  <Link href="/studio/stories/new">
                    <span className="inline-flex items-center gap-2">
                      <FilePlus2 /> Create a story
                    </span>
                    <ArrowRight />
                  </Link>
                </Button>
                <Button asChild variant="outline" className="justify-between">
                  <Link href="/studio/stories">
                    <span className="inline-flex items-center gap-2">
                      <Activity /> Open editorial queue
                    </span>
                    <ArrowRight />
                  </Link>
                </Button>
                <Button asChild variant="outline" className="justify-between">
                  <Link href="/studio/media">
                    <span className="inline-flex items-center gap-2">
                      <Library /> Browse media
                    </span>
                    <ArrowRight />
                  </Link>
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Production services</CardTitle>
                <CardDescription>
                  Live readiness from configured infrastructure, never preview
                  values.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <ServiceStatus
                  icon={<Database />}
                  label="Neon Postgres"
                  ready={data.databaseConnected}
                />
                <ServiceStatus
                  icon={<Users />}
                  label="Audience measurement"
                  ready={data.databaseConnected}
                />
                <ServiceStatus
                  icon={<Radio />}
                  label="Live stream"
                  ready={Boolean(data.live.streamUrl)}
                />
              </CardContent>
            </Card>
          </div>
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

function ControlMetric({ icon, label, value, detail }: { icon: React.ReactNode; label: string; value: string; detail: string }) {
  return <div className="flex min-h-32 items-start gap-3 border-white/10 px-5 py-5 sm:border-r sm:last:border-r-0 xl:px-7"><span className="mt-0.5 rounded-md bg-white/8 p-2 text-[#e0b45e] [&_svg]:size-4">{icon}</span><div className="min-w-0"><p className="text-xs font-semibold text-white/52">{label}</p><p className="mt-1 truncate text-2xl font-bold tracking-tight">{value}</p><p className="mt-1 line-clamp-2 text-[0.68rem] text-white/42">{detail}</p></div></div>;
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
