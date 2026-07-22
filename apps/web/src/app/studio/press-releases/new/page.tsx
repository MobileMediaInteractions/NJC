import { FileText } from "lucide-react";
import { PressReleaseEditor } from "@/components/studio/press-release-editor";
import { StudioGate } from "@/components/studio/studio-gate";
import { StudioShell } from "@/components/studio/studio-shell";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getStudioUser } from "@/lib/auth";
import { getEmployeeViewer } from "@/lib/employee-auth";
import { getSiteOrigin } from "@/lib/origin";
import { getSiteConfiguration } from "@/lib/site-settings";

export default async function NewPressReleasePage() {
  const studioUser = await getStudioUser();
  if (!studioUser) return <StudioGate><></></StudioGate>;
  const viewer = await getEmployeeViewer();
  if (!viewer?.capabilities.includes("tools:press")) return <StudioShell viewer={studioUser}><Card><CardHeader><FileText className="size-6 text-muted-foreground" /><CardTitle>Press-release access required</CardTitle><CardDescription>Your account cannot create official newsroom documents.</CardDescription></CardHeader></Card></StudioShell>;
  const configuration = await getSiteConfiguration();
  return <StudioShell viewer={studioUser}><PressReleaseEditor publication={configuration.publication} datelines={configuration.editorial.datelines} viewer={viewer} siteOrigin={getSiteOrigin()} /></StudioShell>;
}
