import Link from "next/link";
import {
  Braces,
  Clock3,
  Eye,
  Link2,
  Monitor,
  Newspaper,
  PieChart,
  Radio,
  Smartphone,
  TrendingUp,
  Trophy,
  Tv,
  Users,
} from "lucide-react";
import type { AudiencePlatform, AudiencePlatformMetric } from "@harborline/contracts";
import { StudioGate } from "@/components/studio/studio-gate";
import { StudioShell } from "@/components/studio/studio-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getAudienceSummary } from "@/lib/audience";
import { getStudioUser } from "@/lib/auth";
import {
  getTrafficAnalyticsSummary,
  type AnalyticsArchive,
  type AnalyticsPeriod,
  type StoryTrafficMetric,
} from "@/lib/traffic-analytics";

const number = new Intl.NumberFormat("en-US");
const compactNumber = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 });
const wheelColors = ["#d5a13b", "#4f8cae", "#71b79f", "#c97171", "#9077c5", "#637083"];
const icons: Record<AudiencePlatform, React.ReactNode> = {
  web: <Monitor />,
  ios: <Smartphone />,
  android: <Smartphone />,
  tvos: <Tv />,
  androidtv: <Tv />,
  roku: <Tv />,
  api: <Braces />,
};

export default async function AnalyticsPage() {
  const viewer = await getStudioUser();
  if (!viewer) return <StudioGate><></></StudioGate>;
  const [traffic, audience] = await Promise.all([getTrafficAnalyticsSummary(), getAudienceSummary()]);
  const maxActive = Math.max(1, ...audience.platforms.map((item) => item.active30d));

  return <StudioShell viewer={viewer}><div>
    <div className="flex flex-wrap items-start justify-between gap-4"><div><h1 className="text-3xl font-bold tracking-tight">Audience and story traffic</h1><p className="mt-1 text-sm text-muted-foreground">First-party page views, article performance, platform activity and durable reporting archives.</p></div><Badge variant={traffic.database === "connected" ? "secondary" : "outline"}>{traffic.database === "connected" ? "Live database" : "Database not connected"}</Badge></div>
    {traffic.database !== "connected" ? <div className="mt-6 rounded-md border border-amber-400/30 bg-amber-400/10 p-4 text-sm text-amber-100">Traffic totals begin after Postgres is connected and the latest migration is applied.</div> : null}

    <section className="mt-7" aria-labelledby="traffic-overview"><div className="flex items-center gap-2"><Eye className="size-5 text-primary" /><h2 id="traffic-overview" className="text-xl font-bold">Traffic overview</h2></div>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric icon={<Eye />} title="Total site views" value={traffic.totals.siteViews} detail={`${number.format(traffic.totals.views30d)} in the last 30 days`} />
        <Metric icon={<Newspaper />} title="Total story views" value={traffic.totals.storyViews} detail="All published article traffic" />
        <Metric icon={<TrendingUp />} title="Views this week" value={traffic.totals.views7d} detail="Rolling seven-day total" />
        <Card><CardContent className="flex min-h-32 items-start justify-between p-5"><div className="min-w-0"><p className="text-sm text-muted-foreground">Most-read story</p>{traffic.topStory ? <><Link href={`/story/${traffic.topStory.slug}`} className="mt-2 block line-clamp-2 font-bold leading-5 hover:text-primary">{traffic.topStory.headline}</Link><p className="mt-2 font-mono text-sm text-muted-foreground">{number.format(traffic.topStory.views)} views</p></> : <p className="mt-2 text-2xl font-bold">No views yet</p>}</div><span className="ml-3 rounded-md bg-primary/10 p-2 text-primary"><Trophy className="size-4" /></span></CardContent></Card>
      </div>
    </section>

    <div className="mt-6 grid gap-6 xl:grid-cols-[0.78fr_1.22fr]">
      <Card><CardHeader><CardTitle className="flex items-center gap-2"><PieChart className="size-4 text-primary" /> Article traffic wheel</CardTitle><CardDescription>All-time share for the five most-read stories.</CardDescription></CardHeader><CardContent><StoryTrafficWheel stories={traffic.stories} total={traffic.totals.storyViews} /></CardContent></Card>
      <Card><CardHeader><CardTitle className="flex items-center gap-2"><TrendingUp className="size-4 text-primary" /> Daily site views</CardTitle><CardDescription>All public pages over the last 30 publication days.</CardDescription></CardHeader><CardContent><DailyBarChart rows={traffic.daily} /></CardContent></Card>
    </div>

    <Card className="mt-6"><CardHeader><CardTitle>Every story by total views</CardTitle><CardDescription>Every published or archived article, including zero-view stories, ordered by lifetime readership.</CardDescription></CardHeader><CardContent className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Story</TableHead><TableHead className="text-right">All time</TableHead><TableHead className="text-right">7 days</TableHead><TableHead className="text-right">30 days</TableHead><TableHead className="text-right">Share</TableHead></TableRow></TableHeader><TableBody>{traffic.stories.map((story) => <StoryTrafficRow key={story.slug} story={story} total={traffic.totals.storyViews} />)}</TableBody></Table>{traffic.stories.length === 0 ? <EmptyTraffic label="No published stories are available yet." /> : null}</CardContent></Card>

    <Card className="mt-6"><CardHeader><CardTitle>Reporting archive</CardTitle><CardDescription>Completed weekly, monthly and yearly snapshots are generated during the existing daily newsroom maintenance job. Each snapshot retains every page and story total for portable backup and historical comparison.</CardDescription></CardHeader><CardContent><Tabs defaultValue="week"><TabsList><TabsTrigger value="week">Weekly</TabsTrigger><TabsTrigger value="month">Monthly</TabsTrigger><TabsTrigger value="year">Yearly</TabsTrigger></TabsList>{(["week", "month", "year"] as const).map((period) => <TabsContent key={period} value={period} className="mt-4"><ArchiveTable period={period} rows={traffic.archives[period]} /></TabsContent>)}</Tabs></CardContent></Card>

    <section className="mt-10" aria-labelledby="platform-audience"><div className="flex items-center gap-2"><Users className="size-5 text-primary" /><h2 id="platform-audience" className="text-xl font-bold">Audience platforms</h2></div><p className="mt-1 text-sm text-muted-foreground">Unique installations and authenticated API consumers, separated by platform.</p>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric icon={<Radio />} title="Tracked installations" value={audience.totals.trackedInstallations} detail="Web, mobile and television apps" />
        <Metric icon={<Clock3 />} title="Active in 24 hours" value={audience.totals.active24h} detail={`${number.format(audience.totals.active7d)} active in 7 days`} />
        <Metric icon={<Link2 />} title="Account links" value={audience.totals.knownAccountLinks} detail="May repeat across platforms" />
        <Metric icon={<Users />} title="API consumers" value={audience.totals.apiConsumers} detail="Developer accounts with keys" />
      </div>
      <div className="mt-6 grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
        <Card><CardHeader><CardTitle>Users by platform</CardTitle><CardDescription>An installation is one consented browser profile or app installation, not a guaranteed individual person.</CardDescription></CardHeader><CardContent><Table><TableHeader><TableRow><TableHead>Platform</TableHead><TableHead>Measure</TableHead><TableHead className="text-right">All time</TableHead><TableHead className="text-right">24 hours</TableHead><TableHead className="text-right">7 days</TableHead><TableHead className="text-right">30 days</TableHead><TableHead className="text-right">Accounts</TableHead></TableRow></TableHeader><TableBody>{audience.platforms.map((item) => <PlatformRow key={item.platform} item={item} />)}</TableBody></Table></CardContent></Card>
        <Card><CardHeader><CardTitle>Active mix</CardTitle><CardDescription>Relative 30-day activity by platform.</CardDescription></CardHeader><CardContent className="space-y-6">{audience.platforms.map((item) => <div key={item.platform}><div className="mb-2 flex items-center justify-between gap-4 text-sm"><div className="flex items-center gap-2 font-semibold text-foreground [&_svg]:size-4">{icons[item.platform]}{item.label}</div><span className="font-mono text-muted-foreground">{number.format(item.active30d)}</span></div><Progress value={(item.active30d / maxActive) * 100} /></div>)}</CardContent></Card>
      </div>
    </section>
    <p className="mt-5 text-xs text-muted-foreground">Generated {new Date(traffic.generatedAt).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}. Site traffic and web installation totals include only visitors who allow analytics. Automated social and search crawlers are excluded.</p>
  </div></StudioShell>;
}

function Metric({ icon, title, value, detail }: { icon: React.ReactNode; title: string; value: number; detail: string }) {
  return <Card><CardContent className="flex min-h-32 items-start justify-between p-5"><div><p className="text-sm text-muted-foreground">{title}</p><p className="mt-2 text-3xl font-bold">{number.format(value)}</p><p className="mt-1 text-xs text-muted-foreground">{detail}</p></div><span className="rounded-md bg-primary/10 p-2 text-primary [&_svg]:size-4">{icon}</span></CardContent></Card>;
}

function StoryTrafficWheel({ stories, total }: { stories: StoryTrafficMetric[]; total: number }) {
  const leading = stories.filter((story) => story.views > 0).slice(0, 5);
  const leadingTotal = leading.reduce((sum, story) => sum + story.views, 0);
  const slices = [
    ...leading.map((story) => ({ label: story.headline, views: story.views })),
    ...(total > leadingTotal ? [{ label: "All other stories", views: total - leadingTotal }] : []),
  ];
  let offset = 0;
  return <div className="grid items-center gap-6 sm:grid-cols-[11rem_1fr]">
    <div className="relative mx-auto size-44"><svg viewBox="0 0 120 120" className="size-full -rotate-90" role="img" aria-label={`Article traffic distribution across ${stories.length} stories`}><circle cx="60" cy="60" r="44" fill="none" stroke="currentColor" strokeWidth="17" className="text-muted/40" />{slices.map((slice, index) => { const percentage = total ? (slice.views / total) * 100 : 0; const currentOffset = offset; offset += percentage; return <circle key={`${slice.label}-${index}`} cx="60" cy="60" r="44" pathLength="100" fill="none" stroke={wheelColors[index]} strokeWidth="17" strokeDasharray={`${percentage} ${100 - percentage}`} strokeDashoffset={-currentOffset} />; })}</svg><div className="absolute inset-0 grid place-content-center text-center"><strong className="text-2xl">{compactNumber.format(total)}</strong><span className="text-[0.65rem] font-bold uppercase tracking-wider text-muted-foreground">story views</span></div></div>
    <div className="space-y-3">{slices.map((slice, index) => <div key={`${slice.label}-legend`} className="flex items-start justify-between gap-3 text-xs"><span className="flex min-w-0 items-start gap-2"><span className="mt-1 size-2.5 shrink-0 rounded-full" style={{ backgroundColor: wheelColors[index] }} /><span className="line-clamp-2">{slice.label}</span></span><span className="shrink-0 font-mono text-muted-foreground">{number.format(slice.views)}</span></div>)}{!slices.length ? <p className="text-sm text-muted-foreground">The wheel will populate after readers open published stories.</p> : null}</div>
  </div>;
}

function DailyBarChart({ rows }: { rows: Array<{ day: string; views: number }> }) {
  const max = Math.max(1, ...rows.map((row) => row.views));
  return <div><div className="flex h-56 items-end gap-1.5 border-b border-l px-2 pt-4" role="img" aria-label="Bar graph of daily site views over the last 30 days">{rows.map((row) => <div key={row.day} className="group relative flex h-full min-w-0 flex-1 items-end"><div className="w-full rounded-t-sm bg-primary/75 transition-colors hover:bg-primary" style={{ height: row.views ? `${Math.max(4, (row.views / max) * 100)}%` : "2px" }}><span className="sr-only">{row.day}: {row.views} views</span></div><div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 hidden -translate-x-1/2 whitespace-nowrap rounded bg-popover px-2 py-1 text-[0.65rem] shadow group-hover:block">{formatDay(row.day)} · {number.format(row.views)} views</div></div>)}</div><div className="mt-2 flex justify-between text-[0.65rem] text-muted-foreground"><span>{formatDay(rows[0]?.day)}</span><span>{formatDay(rows[Math.floor(rows.length / 2)]?.day)}</span><span>{formatDay(rows.at(-1)?.day)}</span></div></div>;
}

function StoryTrafficRow({ story, total }: { story: StoryTrafficMetric; total: number }) {
  return <TableRow><TableCell><Link href={`/story/${story.slug}`} className="font-semibold hover:text-primary">{story.headline}</Link><p className="mt-1 font-mono text-[0.65rem] text-muted-foreground">/story/{story.slug}</p></TableCell><TableCell className="text-right font-mono font-semibold">{number.format(story.views)}</TableCell><TableCell className="text-right font-mono">{number.format(story.views7d)}</TableCell><TableCell className="text-right font-mono">{number.format(story.views30d)}</TableCell><TableCell className="text-right font-mono">{total ? `${((story.views / total) * 100).toFixed(1)}%` : "0%"}</TableCell></TableRow>;
}

function ArchiveTable({ period, rows }: { period: AnalyticsPeriod; rows: AnalyticsArchive[] }) {
  if (!rows.length) return <EmptyTraffic label={`The first completed ${period} will be archived by daily maintenance.`} />;
  return <div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Reporting period</TableHead><TableHead className="text-right">Site views</TableHead><TableHead className="text-right">Story views</TableHead><TableHead>Most read</TableHead><TableHead className="text-right">Archived</TableHead></TableRow></TableHeader><TableBody>{rows.map((row) => { const storyTotal = row.storyViews.reduce((sum, story) => sum + story.views, 0); const leader = row.storyViews[0]; return <TableRow key={row.id}><TableCell className="font-semibold">{formatDay(row.periodStart)} – {formatDay(row.periodEnd)}</TableCell><TableCell className="text-right font-mono">{number.format(row.totalViews)}</TableCell><TableCell className="text-right font-mono">{number.format(storyTotal)}</TableCell><TableCell>{leader ? <><p className="line-clamp-1 font-medium">{leader.headline}</p><p className="text-xs text-muted-foreground">{number.format(leader.views)} views</p></> : <span className="text-muted-foreground">No story traffic</span>}</TableCell><TableCell className="text-right text-xs text-muted-foreground">{new Date(row.generatedAt).toLocaleDateString("en-US", { dateStyle: "medium" })}</TableCell></TableRow>; })}</TableBody></Table></div>;
}

function EmptyTraffic({ label }: { label: string }) {
  return <div className="py-10 text-center text-sm text-muted-foreground">{label}</div>;
}

function formatDay(value: string | undefined) {
  if (!value) return "—";
  return new Date(`${value}T12:00:00.000Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function PlatformRow({ item }: { item: AudiencePlatformMetric }) {
  return <TableRow><TableCell><div className="flex items-center gap-2 font-semibold [&_svg]:size-4">{icons[item.platform]}{item.label}</div></TableCell><TableCell className="capitalize text-muted-foreground">{item.measurement}</TableCell><TableCell className="text-right font-mono">{number.format(item.allTime)}</TableCell><TableCell className="text-right font-mono">{number.format(item.active24h)}</TableCell><TableCell className="text-right font-mono">{number.format(item.active7d)}</TableCell><TableCell className="text-right font-mono">{number.format(item.active30d)}</TableCell><TableCell className="text-right font-mono">{number.format(item.knownAccounts)}</TableCell></TableRow>;
}
