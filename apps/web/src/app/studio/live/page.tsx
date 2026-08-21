import { Database } from "lucide-react";
import { StudioGate } from "@/components/studio/studio-gate";
import { LiveDeskManager } from "@/components/studio/live-desk-manager";
import { StudioShell } from "@/components/studio/studio-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { hasDatabase } from "@harborline/backend/db";
import { getStudioUser } from "@/lib/auth";
import {
  canPublishLiveCoverage,
  canWriteLiveCoverage,
  getStudioLiveEvents,
} from "@/lib/live-coverage";

export const dynamic = "force-dynamic";

export default async function StudioLiveDeskPage() {
  const viewer = await getStudioUser();
  if (!viewer) return <StudioGate><></></StudioGate>;
  if (!canWriteLiveCoverage(viewer.role)) {
    return <StudioShell viewer={viewer}><Card><CardHeader><CardTitle>Live Desk is restricted</CardTitle><CardDescription>A reporter, producer, editor or administrator role is required to prepare continuous public coverage.</CardDescription></CardHeader></Card></StudioShell>;
  }
  if (!hasDatabase()) {
    return <StudioShell viewer={viewer}><Card><CardContent className="grid min-h-80 place-items-center text-center"><div><Database className="mx-auto size-9 text-muted-foreground" /><h1 className="mt-4 text-2xl font-bold">Postgres is not connected</h1><p className="mt-2 text-sm text-muted-foreground">Live Desk is fail-closed until its durable timeline and audit records can be stored.</p></div></CardContent></Card></StudioShell>;
  }
  let bundles = [] as Awaited<ReturnType<typeof getStudioLiveEvents>>;
  try {
    bundles = await getStudioLiveEvents();
  } catch (error) {
    console.error("Studio Live Desk lookup failed", error);
  }
  return <StudioShell viewer={viewer}><LiveDeskManager initialBundles={bundles} canPublish={canPublishLiveCoverage(viewer.role)} /></StudioShell>;
}
