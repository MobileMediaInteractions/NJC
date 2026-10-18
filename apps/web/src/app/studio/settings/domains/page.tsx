import { DomainControlCenter } from "@/components/studio/domain-control-center";
import { StudioGate } from "@/components/studio/studio-gate";
import { StudioShell } from "@/components/studio/studio-shell";
import { notFound } from "next/navigation";
import { getEmployeeViewer } from "@/lib/employee-auth";
import { isDomainControlOperator } from "@/lib/domain-control";

export default async function StudioDomainsPage() {
  const viewer = await getEmployeeViewer();
  if (!viewer) return <StudioGate><></></StudioGate>;
  if (!await isDomainControlOperator(viewer)) notFound();
  return <StudioShell viewer={viewer}><DomainControlCenter canOperate /></StudioShell>;
}
