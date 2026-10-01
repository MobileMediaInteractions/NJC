import { asc, desc, ilike, isNull, eq, and } from "drizzle-orm";
import { getDb, hasDatabase } from "@harborline/backend/db";
import { mediaAssets, studioMagazines } from "@harborline/backend/schema";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StudioShell } from "@/components/studio/studio-shell";
import { MagEngineManager } from "@/components/studio/mag-engine-manager";
import { getStudioUser } from "@/lib/auth";
import { canUseMagEngine } from "@/lib/mag-engine";
import { getSiteConfiguration } from "@/lib/site-settings";

export const dynamic = "force-dynamic";

export default async function MagEnginePage() {
  const viewer = await getStudioUser();
  if (!viewer) return null;
  if (!canUseMagEngine(viewer.role)) return <StudioShell viewer={viewer}><Card><CardHeader><CardTitle>MagEngine access required</CardTitle><CardDescription>Editor, producer or administrator access is required to create newsroom magazines.</CardDescription></CardHeader></Card></StudioShell>;
  const configuration = await getSiteConfiguration();
  if (!configuration.studio.modules.magEngine) return <StudioShell viewer={viewer}><Card><CardHeader><CardTitle>MagEngine is disabled</CardTitle><CardDescription>An administrator can enable it in Studio → Configuration.</CardDescription></CardHeader></Card></StudioShell>;
  if (!hasDatabase()) return <StudioShell viewer={viewer}><Card><CardContent className="grid min-h-80 place-items-center text-center"><div><h1 className="text-2xl font-bold">Magazine database unavailable</h1><p className="mt-2 text-sm text-muted-foreground">MagEngine is fail-closed until magazine records can be stored in Postgres.</p></div></CardContent></Card></StudioShell>;
  const [issues, images] = await Promise.all([
    getDb().select().from(studioMagazines).orderBy(desc(studioMagazines.updatedAt)).limit(200),
    getDb().select({ id: mediaAssets.id, filename: mediaAssets.filename, blobUrl: mediaAssets.blobUrl, altText: mediaAssets.altText }).from(mediaAssets).where(and(ilike(mediaAssets.mimeType, "image/%"), eq(mediaAssets.visibility, "public"), isNull(mediaAssets.deletedAt))).orderBy(asc(mediaAssets.filename)).limit(500),
  ]);
  return <StudioShell viewer={viewer}><MagEngineManager initialIssues={issues} images={images} /></StudioShell>;
}
