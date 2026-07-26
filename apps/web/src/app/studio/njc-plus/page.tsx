import { count, desc, eq, inArray } from "drizzle-orm";
import Link from "next/link";
import { Activity, CircleDollarSign, Database, FileVideo2, Flag, Radio, ShieldCheck } from "lucide-react";
import { getDb, hasDatabase } from "@harborline/backend/db";
import { premiumContent, premiumEntitlements, premiumSubscriptions } from "@harborline/backend/schema";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { NjcPlusStudioHeading } from "@/components/studio/njc-plus-nav";
import { getNjcPlusFlags } from "@/lib/feature-flags";

export default async function NjcPlusOverview() {
  const flags = await getNjcPlusFlags();
  const parent = flags[0];
  const metrics = await loadMetrics();
  return <><NjcPlusStudioHeading eyebrow="Premium control room" title="NJC+" description="A separate editorial network with one release boundary. Build, review and preview here while every public surface remains fail-closed." />
    <div className="mb-6 flex flex-wrap items-center gap-3 rounded-lg border border-primary/25 bg-primary/5 p-4"><Flag className="size-5 text-primary" /><strong>Public release</strong><Badge variant={parent.effective ? "default" : "outline"}>{parent.effective ? "Enabled" : "Hidden by default"}</Badge><span className="text-xs text-muted-foreground">{flags.filter((flag) => flag.effective).length - (parent.effective ? 1 : 0)} of {flags.length - 1} child capabilities effective</span><Link href="/studio/njc-plus/flags" className="ml-auto text-xs font-bold text-primary hover:underline">Manage release controls</Link></div>
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <Metric icon={<FileVideo2 />} label="Premium content" value={metrics.total} detail={`${metrics.published} published · ${metrics.review} in review`} />
      <Metric icon={<Radio />} label="Live productions" value={metrics.live} detail="Published or prepared live desks" />
      <Metric icon={<ShieldCheck />} label="Active access" value={metrics.entitlements} detail="Current grants and subscriptions" />
      <Metric icon={<CircleDollarSign />} label="Paid accounts" value={metrics.subscriptions} detail="Active or trialing provider records" />
    </div>
    <div className="mt-6 grid gap-6 lg:grid-cols-[1.4fr_.6fr]"><Card><CardHeader><CardTitle>Production queue</CardTitle><CardDescription>The latest real NJC+ records across every format.</CardDescription></CardHeader><CardContent>{metrics.recent.length ? <div className="divide-y">{metrics.recent.map((item) => <Link key={item.id} href={`/studio/njc-plus/content/${item.id}`} className="grid grid-cols-[1fr_auto] gap-4 py-3 hover:text-primary"><div><p className="font-semibold">{item.title}</p><p className="text-xs capitalize text-muted-foreground">{item.kind.replaceAll("_", " ")} · {item.status}</p></div><span className="text-xs text-muted-foreground">{item.updatedAt.toLocaleDateString()}</span></Link>)}</div> : <Empty />}</CardContent></Card><Card><CardHeader><CardTitle>System boundary</CardTitle><CardDescription>Production services used by the platform.</CardDescription></CardHeader><CardContent className="space-y-4"><Status icon={<Database />} label="Neon Postgres" ready={hasDatabase()} /><Status icon={<Activity />} label="Studio control plane" ready /><Status icon={<Flag />} label="Public beta gate" ready /></CardContent></Card></div>
  </>;
}
async function loadMetrics() {
  if (!hasDatabase()) return { total: 0, published: 0, review: 0, live: 0, entitlements: 0, subscriptions: 0, recent: [] as Array<typeof premiumContent.$inferSelect> };
  const db = getDb();
  const [[total], [published], [review], [live], [entitlements], [subscriptions], recent] = await Promise.all([
    db.select({ value: count() }).from(premiumContent),
    db.select({ value: count() }).from(premiumContent).where(eq(premiumContent.status, "published")),
    db.select({ value: count() }).from(premiumContent).where(eq(premiumContent.status, "review")),
    db.select({ value: count() }).from(premiumContent).where(eq(premiumContent.isLive, true)),
    db.select({ value: count() }).from(premiumEntitlements).where(eq(premiumEntitlements.status, "active")),
    db.select({ value: count() }).from(premiumSubscriptions).where(inArray(premiumSubscriptions.status, ["active", "trialing"])),
    db.select().from(premiumContent).orderBy(desc(premiumContent.updatedAt)).limit(12),
  ]);
  return { total: Number(total?.value ?? 0), published: Number(published?.value ?? 0), review: Number(review?.value ?? 0), live: Number(live?.value ?? 0), entitlements: Number(entitlements?.value ?? 0), subscriptions: Number(subscriptions?.value ?? 0), recent };
}
function Metric({ icon, label, value, detail }: { icon: React.ReactNode; label: string; value: number; detail: string }) { return <Card><CardContent className="p-5"><span className="text-primary [&_svg]:size-5">{icon}</span><p className="mt-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">{label}</p><p className="mt-1 text-3xl font-bold">{value.toLocaleString()}</p><p className="mt-1 text-xs text-muted-foreground">{detail}</p></CardContent></Card>; }
function Status({ icon, label, ready }: { icon: React.ReactNode; label: string; ready: boolean }) { return <div className="flex items-center justify-between border-b pb-3 last:border-0"><span className="flex items-center gap-2 text-sm [&_svg]:size-4">{icon}{label}</span><Badge variant={ready ? "secondary" : "outline"}>{ready ? "Ready" : "Not configured"}</Badge></div>; }
function Empty() { return <div className="py-12 text-center"><p className="font-semibold">No NJC+ content yet</p><p className="mt-1 text-xs text-muted-foreground">Create the first real production; no demo records are inserted.</p><Link href="/studio/njc-plus/content/new" className="mt-4 inline-block text-sm font-bold text-primary">Create content</Link></div>; }
