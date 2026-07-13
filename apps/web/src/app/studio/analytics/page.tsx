import { Braces, Clock3, Link2, Monitor, Radio, Smartphone, Tv, Users } from "lucide-react";
import type { AudiencePlatform, AudiencePlatformMetric } from "@harborline/contracts";
import { StudioGate } from "@/components/studio/studio-gate";
import { StudioShell } from "@/components/studio/studio-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getAudienceSummary } from "@/lib/audience";
import { getStudioUser } from "@/lib/auth";

const number = new Intl.NumberFormat("en-US");
const icons: Record<AudiencePlatform, React.ReactNode> = {
  web: <Monitor />,
  ios: <Smartphone />,
  android: <Smartphone />,
  tvos: <Tv />,
  api: <Braces />,
};

export default async function AnalyticsPage() {
  const viewer = await getStudioUser();
  if (!viewer) return <StudioGate><></></StudioGate>;
  const summary = await getAudienceSummary();
  const maxActive = Math.max(1, ...summary.platforms.map((item) => item.active30d));

  return <StudioShell viewer={viewer}><div>
    <div className="flex flex-wrap items-start justify-between gap-4"><div><h1 className="text-3xl font-bold tracking-tight">Audience platforms</h1><p className="mt-1 text-sm text-muted-foreground">Unique installations and authenticated API consumers, separated by platform.</p></div><Badge variant={summary.database === "connected" ? "secondary" : "outline"}>{summary.database === "connected" ? "Live database" : "Database not connected"}</Badge></div>
    {summary.database !== "connected" ? <div className="mt-6 rounded-md border border-amber-400/30 bg-amber-400/10 p-4 text-sm text-amber-100">Platform totals begin after Postgres is connected and the latest migration is applied.</div> : null}
    <div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Metric icon={<Radio />} title="Tracked installations" value={summary.totals.trackedInstallations} detail="Web, mobile and Apple TV" />
      <Metric icon={<Clock3 />} title="Active in 24 hours" value={summary.totals.active24h} detail={`${number.format(summary.totals.active7d)} active in 7 days`} />
      <Metric icon={<Link2 />} title="Account links" value={summary.totals.knownAccountLinks} detail="May repeat across platforms" />
      <Metric icon={<Users />} title="API consumers" value={summary.totals.apiConsumers} detail="Developer accounts with keys" />
    </div>
    <div className="mt-6 grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
      <Card><CardHeader><CardTitle>Users by platform</CardTitle><CardDescription>An installation is one consented browser profile or app installation, not a guaranteed individual person.</CardDescription></CardHeader><CardContent><Table><TableHeader><TableRow><TableHead>Platform</TableHead><TableHead>Measure</TableHead><TableHead className="text-right">All time</TableHead><TableHead className="text-right">24 hours</TableHead><TableHead className="text-right">7 days</TableHead><TableHead className="text-right">30 days</TableHead><TableHead className="text-right">Accounts</TableHead></TableRow></TableHeader><TableBody>{summary.platforms.map((item) => <PlatformRow key={item.platform} item={item} />)}</TableBody></Table></CardContent></Card>
      <Card><CardHeader><CardTitle>Active mix</CardTitle><CardDescription>Relative 30-day activity by platform.</CardDescription></CardHeader><CardContent className="space-y-6">{summary.platforms.map((item) => <div key={item.platform}><div className="mb-2 flex items-center justify-between gap-4 text-sm"><div className="flex items-center gap-2 font-semibold text-foreground [&_svg]:size-4">{icons[item.platform]}{item.label}</div><span className="font-mono text-muted-foreground">{number.format(item.active30d)}</span></div><Progress value={(item.active30d / maxActive) * 100} /></div>)}</CardContent></Card>
    </div>
    <p className="mt-5 text-xs text-muted-foreground">Generated {new Date(summary.generatedAt).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}. Web totals include only visitors who allow analytics. Mobile users can disable anonymous measurement in Account → Privacy and support.</p>
  </div></StudioShell>;
}

function Metric({ icon, title, value, detail }: { icon: React.ReactNode; title: string; value: number; detail: string }) {
  return <Card><CardContent className="flex items-start justify-between p-5"><div><p className="text-sm text-muted-foreground">{title}</p><p className="mt-2 text-3xl font-bold">{number.format(value)}</p><p className="mt-1 text-xs text-muted-foreground">{detail}</p></div><span className="rounded-md bg-primary/10 p-2 text-primary [&_svg]:size-4">{icon}</span></CardContent></Card>;
}

function PlatformRow({ item }: { item: AudiencePlatformMetric }) {
  return <TableRow><TableCell><div className="flex items-center gap-2 font-semibold [&_svg]:size-4">{icons[item.platform]}{item.label}</div></TableCell><TableCell className="capitalize text-muted-foreground">{item.measurement}</TableCell><TableCell className="text-right font-mono">{number.format(item.allTime)}</TableCell><TableCell className="text-right font-mono">{number.format(item.active24h)}</TableCell><TableCell className="text-right font-mono">{number.format(item.active7d)}</TableCell><TableCell className="text-right font-mono">{number.format(item.active30d)}</TableCell><TableCell className="text-right font-mono">{number.format(item.knownAccounts)}</TableCell></TableRow>;
}
