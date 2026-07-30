import { AnalyticsWorkbench } from "@/components/studio/analytics-workbench";
import { StudioGate } from "@/components/studio/studio-gate";
import { StudioShell } from "@/components/studio/studio-shell";
import { emptyAudienceSummary, getAudienceSummary } from "@/lib/audience";
import { getStudioUser } from "@/lib/auth";
import {
  emptyTrafficAnalyticsSummary,
  getTrafficAnalyticsSummary,
} from "@/lib/traffic-analytics";

export default async function AnalyticsPage() {
  const viewer = await getStudioUser();
  if (!viewer) return <StudioGate><></></StudioGate>;

  const [trafficResult, audienceResult] = await Promise.allSettled([
    getTrafficAnalyticsSummary(),
    getAudienceSummary(),
  ]);
  if (trafficResult.status === "rejected") {
    console.error("Studio traffic analytics summary failed", trafficResult.reason);
  }
  if (audienceResult.status === "rejected") {
    console.error("Studio audience summary failed", audienceResult.reason);
  }
  const traffic =
    trafficResult.status === "fulfilled"
      ? trafficResult.value
      : emptyTrafficAnalyticsSummary(
          "Traffic reporting is temporarily unavailable. The audience ledger remains accessible.",
        );
  const audience =
    audienceResult.status === "fulfilled"
      ? audienceResult.value
      : emptyAudienceSummary(
          "Audience and application-version reporting is temporarily unavailable. Traffic reporting remains accessible.",
        );

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
