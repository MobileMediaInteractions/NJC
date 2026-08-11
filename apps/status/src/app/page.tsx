import { StatusDashboard } from "@/components/status-dashboard";
import { buildStatusPayload } from "@/lib/status-monitor";

export const dynamic = "force-dynamic";

export default async function StatusPage() {
  const initialStatus = await buildStatusPayload();
  return <StatusDashboard initialStatus={initialStatus} />;
}
