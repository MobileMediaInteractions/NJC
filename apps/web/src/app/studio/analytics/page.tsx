import { AnalyticsWorkbench } from "@/components/studio/analytics-workbench";
import { StudioGate } from "@/components/studio/studio-gate";
import { StudioShell } from "@/components/studio/studio-shell";
import { getAudienceSummary } from "@/lib/audience";
import { getStudioUser } from "@/lib/auth";
import { getTrafficAnalyticsSummary } from "@/lib/traffic-analytics";

export default async function AnalyticsPage() {
  const viewer = await getStudioUser();
  if (!viewer) return <StudioGate><></></StudioGate>;

  const [traffic, audience] = await Promise.all([
    getTrafficAnalyticsSummary(),
    getAudienceSummary(),
  ]);

  return (
    <StudioShell viewer={viewer}>
      <AnalyticsWorkbench
        traffic={traffic}
        audience={audience}
        canExport={["admin", "editor"].includes(viewer.role)}
      />
    </StudioShell>
  );
}
