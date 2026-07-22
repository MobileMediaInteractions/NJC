import { count, eq } from "drizzle-orm";
import { getDb, hasDatabase } from "@harborline/backend/db";
import { newsTips } from "@harborline/backend/schema";
import { StudioShellClient } from "@/components/studio/studio-shell-client";
import { getEmployeeViewer } from "@/lib/employee-auth";
import { getEmployeeUnreadChatCount } from "@/lib/employee-chat";
import { canViewNewsTips } from "@/lib/newsroom-tips";
import type { StudioUser } from "@/lib/types";

export async function StudioShell({
  children,
  viewer,
}: {
  children: React.ReactNode;
  viewer: StudioUser;
}) {
  let newTipCount = 0;
  let unreadChatCount = 0;
  let chatEnabled = false;
  let pressEnabled = false;
  if (hasDatabase() && canViewNewsTips(viewer.role)) {
    try {
      const [result] = await getDb()
        .select({ value: count() })
        .from(newsTips)
        .where(eq(newsTips.status, "new"));
      newTipCount = Number(result?.value ?? 0);
    } catch (error) {
      console.error("Studio tip badge lookup failed", error);
    }
  }

  if (hasDatabase()) {
    try {
      const employeeViewer = await getEmployeeViewer();
      chatEnabled = Boolean(employeeViewer?.capabilities.includes("chat:read"));
      pressEnabled = Boolean(employeeViewer?.capabilities.includes("tools:press"));
      if (employeeViewer && chatEnabled) unreadChatCount = await getEmployeeUnreadChatCount(employeeViewer);
    } catch (error) {
      console.error("Studio chat badge lookup failed", error);
    }
  }

  return (
    <StudioShellClient viewer={viewer} newTipCount={newTipCount} unreadChatCount={unreadChatCount} chatEnabled={chatEnabled} pressEnabled={pressEnabled}>
      {children}
    </StudioShellClient>
  );
}
