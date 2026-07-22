import { eq } from "drizzle-orm";
import { FileText } from "lucide-react";
import { notFound } from "next/navigation";
import { getDb, hasDatabase } from "@harborline/backend/db";
import { pressReleases } from "@harborline/backend/schema";
import { PressReleaseEditor } from "@/components/studio/press-release-editor";
import { StudioGate } from "@/components/studio/studio-gate";
import { StudioShell } from "@/components/studio/studio-shell";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getStudioUser } from "@/lib/auth";
import { getEmployeeViewer } from "@/lib/employee-auth";
import { getSiteOrigin } from "@/lib/origin";
import { pressReleaseInput, type PressReleaseRecord } from "@/lib/press-release";
import { getSiteConfiguration } from "@/lib/site-settings";

export const dynamic = "force-dynamic";

export default async function EditPressReleasePage({ params }: { params: Promise<{ id: string }> }) {
  const studioUser = await getStudioUser();
  if (!studioUser) return <StudioGate><></></StudioGate>;
  const viewer = await getEmployeeViewer();
  if (!viewer?.capabilities.includes("tools:press")) return <StudioShell viewer={studioUser}><Card><CardHeader><FileText className="size-6 text-muted-foreground" /><CardTitle>Press-release access required</CardTitle><CardDescription>Your account cannot open official newsroom documents.</CardDescription></CardHeader></Card></StudioShell>;
  if (!hasDatabase()) return <StudioShell viewer={studioUser}><Card><CardHeader><CardTitle>Database connection required</CardTitle><CardDescription>Connect Postgres before editing saved press releases.</CardDescription></CardHeader></Card></StudioShell>;
  const { id } = await params;
  const [release] = await getDb().select().from(pressReleases).where(eq(pressReleases.id, id)).limit(1);
  if (!release) notFound();
  const normalized = pressReleaseInput.safeParse({ ...release, releaseAt: release.releaseAt?.toISOString() ?? "" });
  if (!normalized.success) notFound();
  const configuration = await getSiteConfiguration();
  return <StudioShell viewer={studioUser}><PressReleaseEditor initialRelease={{ ...release, ...normalized.data } as PressReleaseRecord} publication={configuration.publication} datelines={configuration.editorial.datelines} viewer={viewer} siteOrigin={getSiteOrigin()} /></StudioShell>;
}
