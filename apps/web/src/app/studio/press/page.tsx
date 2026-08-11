import { desc } from "drizzle-orm";
import Link from "next/link";
import { Archive, Bot, Inbox, PackageCheck, ShieldAlert } from "lucide-react";
import { getDb, hasDatabase } from "@harborline/backend/db";
import { pressKitRequests } from "@harborline/backend/schema";
import { PressAssetManager } from "@/components/studio/press-asset-manager";
import { StudioGate } from "@/components/studio/studio-gate";
import { StudioShell } from "@/components/studio/studio-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getStudioUser } from "@/lib/auth";
import { getPressAssetCatalog } from "@/lib/press-kit-server";

const activeStatuses = ["draft", "intake", "needs_information", "evaluating", "approved", "partially_approved", "manual_review", "package_generating"];
const completedStatuses = ["ready", "downloaded", "generated"];
const closedStatuses = ["denied", "expired", "revoked"];

export default async function PressRequestsPage() {
  const viewer = await getStudioUser();
  if (!viewer) return <StudioGate><></></StudioGate>;
  if (!["admin", "editor", "producer"].includes(viewer.role)) {
    return <StudioShell viewer={viewer}><Card><CardHeader><CardTitle>Press requests are restricted</CardTitle><CardDescription>An administrator, editor or producer role is required because requests contain media contact information.</CardDescription></CardHeader></Card></StudioShell>;
  }
  const [rows, catalog] = hasDatabase()
    ? await Promise.all([
        getDb().select().from(pressKitRequests).orderBy(desc(pressKitRequests.createdAt)).limit(200),
        getPressAssetCatalog({ includeInactive: true }),
      ])
    : [[], []];
  const manual = rows.filter((row) => row.status === "manual_review");

  return <StudioShell viewer={viewer}><div>
    <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-sm font-medium text-primary">Media relations</p><h1 className="mt-1 text-3xl font-bold tracking-tight">Press &amp; Media requests</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">Review policy-sensitive requests, issue request-specific authorization, inspect packages, and control the allowlisted press catalog.</p></div><Badge variant={hasDatabase() ? "secondary" : "outline"}>{hasDatabase() ? "Audited workflow live" : "Database not connected"}</Badge></div>
    <div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><Metric title="Open requests" value={rows.filter((row) => activeStatuses.includes(row.status)).length} detail="Intake through package generation" icon={<Inbox />} /><Metric title="Manual review" value={manual.length} detail="Needs a human decision" icon={<ShieldAlert />} /><Metric title="Ready packages" value={rows.filter((row) => completedStatuses.includes(row.status)).length} detail="Includes legacy instant kits" icon={<PackageCheck />} /><Metric title="Catalog assets" value={catalog.filter((asset) => asset.active).length} detail={`${catalog.filter((asset) => !asset.active).length} inactive`} icon={<Archive />} /></div>
    <Tabs defaultValue={manual.length ? "manual" : "active"} className="mt-7"><TabsList className="h-auto flex-wrap"><TabsTrigger value="manual">Manual review <Badge variant="secondary" className="ml-2">{manual.length}</Badge></TabsTrigger><TabsTrigger value="active">Active <Badge variant="secondary" className="ml-2">{rows.filter((row) => activeStatuses.includes(row.status)).length}</Badge></TabsTrigger><TabsTrigger value="completed">Completed <Badge variant="secondary" className="ml-2">{rows.filter((row) => completedStatuses.includes(row.status)).length}</Badge></TabsTrigger><TabsTrigger value="closed">Closed <Badge variant="secondary" className="ml-2">{rows.filter((row) => closedStatuses.includes(row.status)).length}</Badge></TabsTrigger><TabsTrigger value="assets">Asset catalog</TabsTrigger></TabsList>
      <TabsContent value="manual" className="mt-4"><RequestList rows={manual} /></TabsContent>
      <TabsContent value="active" className="mt-4"><RequestList rows={rows.filter((row) => activeStatuses.includes(row.status))} /></TabsContent>
      <TabsContent value="completed" className="mt-4"><RequestList rows={rows.filter((row) => completedStatuses.includes(row.status))} /></TabsContent>
      <TabsContent value="closed" className="mt-4"><RequestList rows={rows.filter((row) => closedStatuses.includes(row.status))} /></TabsContent>
      <TabsContent value="assets" className="mt-4"><PressAssetManager initialAssets={catalog} canManage={viewer.role === "admin"} /></TabsContent>
    </Tabs>
  </div></StudioShell>;
}

function Metric({ title, value, detail, icon }: { title: string; value: number; detail: string; icon: React.ReactNode }) { return <Card><CardContent className="flex items-start justify-between p-5"><div><p className="text-sm text-muted-foreground">{title}</p><p className="mt-2 text-3xl font-bold">{value}</p><p className="mt-1 text-xs text-muted-foreground">{detail}</p></div><span className="rounded-md bg-primary/10 p-2 text-primary [&_svg]:size-4">{icon}</span></CardContent></Card>; }
function RequestList({ rows }: { rows: (typeof pressKitRequests.$inferSelect)[] }) {
  if (!rows.length) return <Card><CardContent className="py-14 text-center"><Bot className="mx-auto size-8 text-muted-foreground" /><p className="mt-3 font-medium">Nothing in this queue</p><p className="mt-1 text-xs text-muted-foreground">Requests move here automatically as their lifecycle changes.</p></CardContent></Card>;
  return <div className="grid gap-3">{rows.map((row) => <Link key={row.id} href={`/studio/press/${row.id}`} className="group grid gap-4 rounded-xl border bg-card p-5 transition hover:border-primary/40 hover:bg-muted/20 lg:grid-cols-[1fr_1.4fr_auto] lg:items-center"><div><p className="font-semibold group-hover:text-primary">{row.name || "Intake in progress"}</p><p className="mt-1 text-xs text-muted-foreground">{row.organization || "Organization not confirmed"} · {row.email || "Email not confirmed"}</p></div><div><p className="line-clamp-1 text-sm">{row.projectName || row.requestDetails || "Request details are being gathered"}</p><p className="mt-1 text-xs capitalize text-muted-foreground">{row.usageClassification.replaceAll("_", " ")}</p></div><div className="lg:text-right"><Badge variant={row.status === "manual_review" ? "destructive" : "secondary"} className="capitalize">{row.status.replaceAll("_", " ")}</Badge><p className="mt-2 text-[11px] text-muted-foreground">{row.createdAt.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}</p></div></Link>)}</div>;
}
