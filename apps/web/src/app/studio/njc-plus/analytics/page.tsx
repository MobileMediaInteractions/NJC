import { count, desc, like, sql } from "drizzle-orm";
import { Activity, CheckCircle2, Eye, Play } from "lucide-react";
import { getDb, hasDatabase } from "@harborline/backend/db";
import {
  analyticsDailyViews,
  premiumContent,
  premiumPlaybackProgress,
} from "@harborline/backend/schema";
import { NjcPlusStudioHeading } from "@/components/studio/njc-plus-nav";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function NjcPlusAnalyticsPage() {
  const metrics = await loadMetrics();
  return <><NjcPlusStudioHeading eyebrow="Premium intelligence" title="NJC+ analytics" description="First-party NJC+ traffic and authenticated playback progress. No demo events or third-party audience profiles are created." />
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Metric icon={<Eye />} label="NJC+ page views" value={metrics.views} detail="All consented /plus routes" />
      <Metric icon={<Play />} label="Playback records" value={metrics.plays} detail="Signed-in watch and listen progress" />
      <Metric icon={<CheckCircle2 />} label="Completed media" value={metrics.completions} detail="Progress greater than the completion threshold" />
      <Metric icon={<Activity />} label="Active productions" value={metrics.content} detail="All non-archived NJC+ records" />
    </div>
    <Card className="mt-6"><CardHeader><CardTitle>Most engaged programming</CardTitle><CardDescription>Ranked by unique account/content progress records. Page traffic continues to appear in the shared Studio analytics archive.</CardDescription></CardHeader><CardContent className="p-0">{metrics.top.length ? <div className="divide-y">{metrics.top.map((item, index) => <div className="grid grid-cols-[2rem_1fr_auto] gap-3 p-5" key={item.id}><span className="font-mono text-muted-foreground">{index + 1}</span><div><strong>{item.title}</strong><p className="mt-1 text-xs capitalize text-muted-foreground">{item.kind.replaceAll("_", " ")} · /plus/{item.slug}</p></div><span className="font-mono">{Number(item.plays).toLocaleString()} plays</span></div>)}</div> : <div className="py-20 text-center"><p className="font-semibold">No playback activity yet</p><p className="mt-1 text-sm text-muted-foreground">Metrics begin only after the parent release flag is enabled and signed-in members play real content.</p></div>}</CardContent></Card>
  </>;
}

async function loadMetrics() {
  if (!hasDatabase()) return { views: 0, plays: 0, completions: 0, content: 0, top: [] as Array<{ id: string; title: string; slug: string; kind: string; plays: number }> };
  const db = getDb();
  const [[viewRow], [playRow], [completionRow], [contentRow], top] = await Promise.all([
    db.select({ value: sql<number>`coalesce(sum(${analyticsDailyViews.views}), 0)::int` }).from(analyticsDailyViews).where(like(analyticsDailyViews.pathname, "/plus%")),
    db.select({ value: count() }).from(premiumPlaybackProgress),
    db.select({ value: count() }).from(premiumPlaybackProgress).where(sql`${premiumPlaybackProgress.completed} = true`),
    db.select({ value: count() }).from(premiumContent).where(sql`${premiumContent.status} <> 'archived'`),
    db.select({
      id: premiumContent.id,
      title: premiumContent.title,
      slug: premiumContent.slug,
      kind: premiumContent.kind,
      plays: count(premiumPlaybackProgress.id),
    }).from(premiumContent)
      .leftJoin(premiumPlaybackProgress, sql`${premiumPlaybackProgress.contentId} = ${premiumContent.id}`)
      .groupBy(premiumContent.id, premiumContent.title, premiumContent.slug, premiumContent.kind)
      .orderBy(desc(count(premiumPlaybackProgress.id)))
      .limit(50),
  ]);
  return {
    views: Number(viewRow?.value ?? 0),
    plays: Number(playRow?.value ?? 0),
    completions: Number(completionRow?.value ?? 0),
    content: Number(contentRow?.value ?? 0),
    top: top.filter((item) => Number(item.plays) > 0).map((item) => ({ ...item, plays: Number(item.plays) })),
  };
}

function Metric({ icon, label, value, detail }: { icon: React.ReactNode; label: string; value: number; detail: string }) {
  return <Card><CardContent className="p-5"><span className="text-primary [&_svg]:size-5">{icon}</span><p className="mt-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">{label}</p><p className="mt-1 text-3xl font-bold">{value.toLocaleString()}</p><p className="mt-1 text-xs text-muted-foreground">{detail}</p></CardContent></Card>;
}
