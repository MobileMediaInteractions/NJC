import { MessageCircleMore } from "lucide-react";
import { StudioChat } from "@/components/studio/studio-chat";
import { StudioGate } from "@/components/studio/studio-gate";
import { StudioShell } from "@/components/studio/studio-shell";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getStudioUser } from "@/lib/auth";
import { getEmployeeViewer } from "@/lib/employee-auth";

export const dynamic = "force-dynamic";

export default async function StudioChatPage({ searchParams }: { searchParams: Promise<{ channel?: string }> }) {
  const viewer = await getStudioUser();
  if (!viewer) return <StudioGate><></></StudioGate>;
  const employeeViewer = await getEmployeeViewer();
  if (!employeeViewer?.capabilities.includes("chat:read")) {
    return <StudioShell viewer={viewer}><Card><CardHeader><MessageCircleMore className="size-6 text-muted-foreground" /><CardTitle>Team chat access required</CardTitle><CardDescription>Your account does not currently have permission to read internal newsroom conversations.</CardDescription></CardHeader></Card></StudioShell>;
  }
  const { channel } = await searchParams;
  return <StudioShell viewer={viewer}><StudioChat viewer={employeeViewer} initialChannelId={channel ?? null} /></StudioShell>;
}
