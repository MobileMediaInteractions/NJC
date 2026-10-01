import { desc } from "drizzle-orm";
import { CalendarDays, Database, ShieldAlert } from "lucide-react";
import { StudioGate } from "@/components/studio/studio-gate";
import { StudioShell } from "@/components/studio/studio-shell";
import { CommunityManager } from "@/components/studio/community-manager";
import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getDb, hasDatabase } from "@harborline/backend/db";
import { communityBulletins, communityEventSubmissions } from "@harborline/backend/schema";
import { getStudioUser } from "@/lib/auth";
import { canManageCommunity, canPublishCommunity } from "@/lib/community";
import { getSiteConfiguration } from "@/lib/site-settings";

export const dynamic = "force-dynamic";

export default async function StudioCommunityPage() {
  const viewer = await getStudioUser();
  if (!viewer) return <StudioGate><></></StudioGate>;
  if (!canManageCommunity(viewer.role)) {
    return <StudioShell viewer={viewer}><Card><CardHeader><CardTitle>Community desk is restricted</CardTitle><CardDescription>Reporter, producer, editor, or administrator access is required to review reader-submitted event information.</CardDescription></CardHeader></Card></StudioShell>;
  }
  const configuration = await getSiteConfiguration();
  if (!configuration.studio.modules.community) {
    return <StudioShell viewer={viewer}><Card><CardHeader><CardTitle>Community desk is disabled</CardTitle><CardDescription>Enable the Community bulletin workspace in Studio → Configuration to manage listings and suggestions.</CardDescription></CardHeader></Card></StudioShell>;
  }

  let connected = hasDatabase();
  let bulletins: Array<typeof communityBulletins.$inferSelect> = [];
  let submissions: Array<typeof communityEventSubmissions.$inferSelect> = [];
  if (connected) {
    try {
      [bulletins, submissions] = await Promise.all([
        getDb().select().from(communityBulletins).orderBy(desc(communityBulletins.updatedAt)).limit(200),
        getDb().select().from(communityEventSubmissions).orderBy(desc(communityEventSubmissions.createdAt)).limit(200),
      ]);
    } catch (error) {
      console.error("Studio community page lookup failed", error);
      connected = false;
    }
  }

  return <StudioShell viewer={viewer}>
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="flex items-center gap-2 text-sm font-medium text-primary"><CalendarDays className="size-4" /> Community desk</p><h1 className="mt-1 text-3xl font-bold tracking-tight">In the Community</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">Publish local events and review reader-submitted listings. Only published bulletins are visible on the public site.</p></div><div className="flex gap-2"><Badge variant="destructive">{submissions.filter((item) => item.status === "pending").length} pending</Badge><Badge variant={connected ? "secondary" : "outline"}><Database className="size-3.5" />{connected ? "Live database" : "Database not connected"}</Badge></div></div>
      <div className="flex gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm"><ShieldAlert className="mt-0.5 size-5 shrink-0 text-amber-600" /><p>Reader event suggestions are unverified. Verify time, location, source and any RSVP destination before publishing. Submitter contact information is newsroom-only.</p></div>
      {connected ? <CommunityManager initialBulletins={bulletins} initialSubmissions={submissions} canPublish={canPublishCommunity(viewer.role)} timezone={configuration.publication.timezone} /> : <Card><CardHeader><CardTitle>Community controls need Postgres</CardTitle><CardDescription>Apply the database migrations before managing community listings or receiving reader suggestions.</CardDescription></CardHeader></Card>}
    </div>
  </StudioShell>;
}
