import { DomainControlCenter } from "@/components/studio/domain-control-center";
import { StudioGate } from "@/components/studio/studio-gate";
import { StudioShell } from "@/components/studio/studio-shell";
import { getStudioUser } from "@/lib/auth";
import { isDomainControlOperator } from "@/lib/domain-control";

export default async function StudioDomainsPage() {
  const viewer = await getStudioUser();
  if (!viewer) return <StudioGate><></></StudioGate>;
  return <StudioShell viewer={viewer}><DomainControlCenter canOperate={viewer.role === "admin" && isDomainControlOperator(viewer.id)} /></StudioShell>;
}
