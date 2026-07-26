import { desc } from "drizzle-orm";
import { getDb, hasDatabase } from "@harborline/backend/db";
import { premiumAuditLogs } from "@harborline/backend/schema";
import { NjcPlusStudioHeading } from "@/components/studio/njc-plus-nav";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { getStudioUser } from "@/lib/auth";

export default async function NjcPlusAuditPage() {
  const viewer = await getStudioUser();
  if (!viewer || !["admin", "editor"].includes(viewer.role)) {
    return <Card><CardContent className="p-6"><h1 className="font-semibold">Audit history is restricted</h1><p className="mt-1 text-sm text-muted-foreground">Administrator or editor access is required.</p></CardContent></Card>;
  }
  const logs = hasDatabase()
    ? await getDb().select().from(premiumAuditLogs).orderBy(desc(premiumAuditLogs.createdAt)).limit(500)
    : [];
  return <><NjcPlusStudioHeading eyebrow="Accountability" title="NJC+ audit history" description="An append-only operational record of publishing, access, commerce, credits, flags and moderation actions." /><Card><CardContent className="p-0">{logs.length ? <div className="divide-y">{logs.map((log) => <article className="grid gap-3 p-5 lg:grid-cols-[1fr_auto] lg:items-center" key={log.id}><div><div className="flex flex-wrap items-center gap-2"><Badge variant="outline">{log.targetType}</Badge><strong>{log.action}</strong></div><p className="mt-2 font-mono text-xs text-muted-foreground">{log.targetId}</p>{log.reason ? <p className="mt-2 text-sm">{log.reason}</p> : null}</div><div className="text-right text-xs text-muted-foreground"><p className="font-mono">{log.actorClerkId}</p><time dateTime={log.createdAt.toISOString()}>{log.createdAt.toLocaleString()}</time></div></article>)}</div> : <div className="py-20 text-center"><p className="font-semibold">No NJC+ audit events yet</p><p className="mt-1 text-sm text-muted-foreground">Events appear when authorized users operate the platform.</p></div>}</CardContent></Card></>;
}
