import { desc, eq, ne } from "drizzle-orm";
import { Download, FilePlus2, FileText, Newspaper } from "lucide-react";
import Link from "next/link";
import { getDb, hasDatabase } from "@harborline/backend/db";
import { pressReleases } from "@harborline/backend/schema";
import { StudioGate } from "@/components/studio/studio-gate";
import { StudioShell } from "@/components/studio/studio-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getStudioUser } from "@/lib/auth";
import { getEmployeeViewer } from "@/lib/employee-auth";
import { pressReleaseTypeLabels } from "@/lib/press-release";

export const dynamic = "force-dynamic";

export default async function PressReleasesPage() {
  const studioUser = await getStudioUser();
  if (!studioUser) return <StudioGate><></></StudioGate>;
  const viewer = await getEmployeeViewer();
  if (!viewer?.capabilities.includes("tools:press")) return <StudioShell viewer={studioUser}><AccessRequired /></StudioShell>;
  const rows = hasDatabase() ? await getDb().select().from(pressReleases).where(ne(pressReleases.status, "archived")).orderBy(desc(pressReleases.updatedAt)).limit(200) : [];
  const archived = hasDatabase() ? await getDb().select().from(pressReleases).where(eq(pressReleases.status, "archived")).orderBy(desc(pressReleases.updatedAt)).limit(200) : [];
  const drafts = rows.filter((row) => row.status === "draft");
  const ready = rows.filter((row) => row.status === "ready");
  return <StudioShell viewer={studioUser}><div>
    <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-sm font-medium text-primary">Media relations</p><h1 className="mt-1 text-3xl font-bold tracking-tight">Press releases</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">Create press releases, media advisories and official statements, then export branded, distribution-ready PDFs.</p></div><Button asChild><Link href="/studio/press-releases/new"><FilePlus2 /> New document</Link></Button></div>
    <div className="mt-7 grid gap-4 sm:grid-cols-3"><Metric label="Active documents" value={rows.length} detail="Drafts and ready releases" /><Metric label="Ready" value={ready.length} detail="Cleared for distribution" /><Metric label="PDF exports" value={rows.reduce((sum, row) => sum + row.exportCount, 0)} detail="Across active documents" /></div>
    <Tabs defaultValue="active" className="mt-7"><TabsList><TabsTrigger value="active">All active <Badge variant="secondary">{rows.length}</Badge></TabsTrigger><TabsTrigger value="draft">Drafts <Badge variant="secondary">{drafts.length}</Badge></TabsTrigger><TabsTrigger value="ready">Ready <Badge variant="secondary">{ready.length}</Badge></TabsTrigger><TabsTrigger value="archived">Archived <Badge variant="secondary">{archived.length}</Badge></TabsTrigger></TabsList><TabsContent value="active" className="mt-4"><DocumentGrid rows={rows} /></TabsContent><TabsContent value="draft" className="mt-4"><DocumentGrid rows={drafts} /></TabsContent><TabsContent value="ready" className="mt-4"><DocumentGrid rows={ready} /></TabsContent><TabsContent value="archived" className="mt-4"><DocumentGrid rows={archived} /></TabsContent></Tabs>
  </div></StudioShell>;
}

function DocumentGrid({ rows }: { rows: Array<typeof pressReleases.$inferSelect> }) {
  if (!rows.length) return <Card className="border-dashed"><CardContent className="py-14 text-center"><Newspaper className="mx-auto size-8 text-muted-foreground" /><p className="mt-3 text-sm font-semibold">No documents in this view</p><p className="mt-1 text-xs text-muted-foreground">Create a document or choose another workflow tab.</p></CardContent></Card>;
  return <div className="grid gap-4 xl:grid-cols-2">{rows.map((row) => <Link key={row.id} href={`/studio/press-releases/${row.id}`} className="group rounded-xl border bg-card p-5 transition-colors hover:border-primary/60"><div className="flex items-start gap-4"><span className="rounded-lg bg-primary/10 p-2.5 text-primary"><FileText className="size-5" /></span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><Badge variant={row.status === "ready" ? "default" : row.status === "archived" ? "outline" : "secondary"} className="capitalize">{row.status}</Badge><span className="text-[0.65rem] font-bold uppercase tracking-wider text-muted-foreground">{pressReleaseTypeLabels[row.documentType as keyof typeof pressReleaseTypeLabels] ?? "Newsroom document"}</span></div><h2 className="mt-2 line-clamp-2 font-bold leading-6 group-hover:text-primary">{row.headline}</h2><p className="mt-2 line-clamp-2 text-xs leading-5 text-muted-foreground">{row.subheadline || row.summary || "No supporting summary"}</p><div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-[0.68rem] text-muted-foreground"><span>Updated {new Date(row.updatedAt).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}</span><span className="inline-flex items-center gap-1"><Download className="size-3" /> {row.exportCount} exports</span></div></div></div></Link>)}</div>;
}

function Metric({ label, value, detail }: { label: string; value: number; detail: string }) {
  return <Card><CardContent className="p-5"><p className="text-sm text-muted-foreground">{label}</p><p className="mt-2 text-3xl font-bold">{value}</p><p className="mt-1 text-xs text-muted-foreground">{detail}</p></CardContent></Card>;
}

function AccessRequired() {
  return <Card><CardHeader><FileText className="size-6 text-muted-foreground" /><CardTitle>Press-release access required</CardTitle><CardDescription>An editor, producer, administrator or specifically approved employee account is required to author official newsroom documents.</CardDescription></CardHeader></Card>;
}
