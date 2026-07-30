import { StudioGate } from "@/components/studio/studio-gate";
import { StudioShell } from "@/components/studio/studio-shell";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getStudioUser } from "@/lib/auth";
import { getEmployeeViewer } from "@/lib/employee-auth";

export default async function FinanceStudioLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const viewer = await getStudioUser();
  if (!viewer) return <StudioGate><></></StudioGate>;
  const employeeViewer = await getEmployeeViewer();
  if (!employeeViewer?.capabilities.includes("tools:finance")) {
    return (
      <StudioShell viewer={viewer}>
        <Card>
          <CardHeader>
            <CardTitle>Finance workspace restricted</CardTitle>
            <CardDescription>
              A finance capability is required. Financial records are never
              exposed merely because an account can enter Studio.
            </CardDescription>
          </CardHeader>
        </Card>
      </StudioShell>
    );
  }
  return <StudioShell viewer={viewer}>{children}</StudioShell>;
}
