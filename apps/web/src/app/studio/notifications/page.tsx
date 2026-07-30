import { NotificationCampaignConsole } from "@/components/studio/notification-campaign-console";
import { StudioGate } from "@/components/studio/studio-gate";
import { StudioShell } from "@/components/studio/studio-shell";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getStudioUser } from "@/lib/auth";
import { getEmployeeViewer } from "@/lib/employee-auth";
import { getSiteConfiguration } from "@/lib/site-settings";

export default async function StudioNotificationsPage() {
  const viewer = await getStudioUser();
  if (!viewer) return <StudioGate><></></StudioGate>;
  const [employeeViewer, configuration] = await Promise.all([
    getEmployeeViewer(),
    getSiteConfiguration(),
  ]);
  if (!employeeViewer?.capabilities.includes("tools:alerts")) {
    return (
      <StudioShell viewer={viewer}>
        <Card>
          <CardHeader>
            <CardTitle>Notification access required</CardTitle>
            <CardDescription>
              The alert-tools capability is required to compose or review
              public notification campaigns.
            </CardDescription>
          </CardHeader>
        </Card>
      </StudioShell>
    );
  }
  return (
    <StudioShell viewer={viewer}>
      <NotificationCampaignConsole
        publicAlertsEnabled={configuration.features.alerts}
        canSearchAccounts={viewer.role === "admin"}
      />
    </StudioShell>
  );
}
