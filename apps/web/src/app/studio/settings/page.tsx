import { SiteSettingsForm } from "@/components/studio/site-settings-form";
import { StudioGate } from "@/components/studio/studio-gate";
import { StudioShell } from "@/components/studio/studio-shell";
import { canManageSiteSettings, getStudioUser } from "@/lib/auth";
import { getSiteConfigurationRecord } from "@/lib/site-settings";

export default async function SettingsPage() {
  const viewer = await getStudioUser();
  if (!viewer) return <StudioGate><></></StudioGate>;
  const record = await getSiteConfigurationRecord();
  return <StudioShell viewer={viewer}><SiteSettingsForm initialConfiguration={record.configuration} canManage={canManageSiteSettings(viewer.role)} updatedAt={record.updatedAt?.toISOString() ?? null} /></StudioShell>;
}
