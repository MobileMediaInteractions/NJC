import { desc } from "drizzle-orm";
import { Inbox, PackageCheck } from "lucide-react";
import { getDb, hasDatabase } from "@harborline/backend/db";
import { pressKitRequests } from "@harborline/backend/schema";
import { StudioGate } from "@/components/studio/studio-gate";
import { StudioShell } from "@/components/studio/studio-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getStudioUser } from "@/lib/auth";

export default async function PressRequestsPage() {
  const viewer = await getStudioUser();
  if (!viewer) return <StudioGate><></></StudioGate>;
  if (!["admin", "editor", "producer"].includes(viewer.role)) {
    return <StudioShell viewer={viewer}><Card><CardHeader><CardTitle>Press requests are restricted</CardTitle><CardDescription>An administrator, editor or producer role is required because requests contain media contact information.</CardDescription></CardHeader></Card></StudioShell>;
  }

  const rows = hasDatabase()
    ? await getDb().select().from(pressKitRequests).orderBy(desc(pressKitRequests.createdAt)).limit(100)
    : [];

  return (
    <StudioShell viewer={viewer}><div>
      <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-sm font-medium text-primary">Media relations</p><h1 className="mt-1 text-3xl font-bold tracking-tight">Press-kit requests</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">Review what journalists and producers requested, which assets they received, and the generation status.</p></div><Badge variant={hasDatabase() ? "secondary" : "outline"}>{hasDatabase() ? "Live database" : "Database not connected"}</Badge></div>
      <div className="mt-7 grid gap-4 sm:grid-cols-2"><Card><CardContent className="flex items-start justify-between p-5"><div><p className="text-sm text-muted-foreground">Recent requests</p><p className="mt-2 text-3xl font-bold">{rows.length}</p><p className="mt-1 text-xs text-muted-foreground">Newest 100 requests</p></div><span className="rounded-md bg-primary/10 p-2 text-primary"><Inbox className="size-4" /></span></CardContent></Card><Card><CardContent className="flex items-start justify-between p-5"><div><p className="text-sm text-muted-foreground">Packages generated</p><p className="mt-2 text-3xl font-bold">{rows.filter((row) => row.status === "generated").length}</p><p className="mt-1 text-xs text-muted-foreground">Completed downloads in this view</p></div><span className="rounded-md bg-primary/10 p-2 text-primary"><PackageCheck className="size-4" /></span></CardContent></Card></div>
      <Card className="mt-6"><CardHeader><CardTitle>Request log</CardTitle><CardDescription>Contact information is operational media-relations data. Use it only to fulfill or follow up on the stated request.</CardDescription></CardHeader><CardContent className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Requester</TableHead><TableHead>Use</TableHead><TableHead>Request</TableHead><TableHead>Package</TableHead><TableHead className="text-right">Generated</TableHead></TableRow></TableHeader><TableBody>{rows.map((row) => <TableRow key={row.id}><TableCell><p className="font-medium">{row.name}</p><p className="text-xs text-muted-foreground">{row.organization}</p><a className="text-xs text-primary hover:underline" href={`mailto:${row.email}`}>{row.email}</a></TableCell><TableCell className="capitalize">{row.intendedUse}</TableCell><TableCell><p className="max-w-lg line-clamp-2 text-sm" title={row.requestDetails}>{row.requestDetails}</p></TableCell><TableCell><Badge variant="secondary" className="capitalize">{row.status}</Badge><p className="mt-1 text-xs text-muted-foreground">{row.assetGroups.join(", ")} · {row.archiveBytes ? `${(row.archiveBytes / 1_000_000).toFixed(2)} MB` : "size unavailable"}</p></TableCell><TableCell className="text-right text-xs text-muted-foreground">{new Date(row.generatedAt ?? row.createdAt).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}</TableCell></TableRow>)}</TableBody></Table>{!rows.length ? <div className="py-12 text-center"><Inbox className="mx-auto size-8 text-muted-foreground" /><p className="mt-3 text-sm font-medium">No recorded press-kit requests</p><p className="mt-1 text-xs text-muted-foreground">Requests will appear after Postgres is connected and the migration is applied.</p></div> : null}</CardContent></Card>
    </div></StudioShell>
  );
}
