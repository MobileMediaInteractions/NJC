import { count, eq } from "drizzle-orm";
import { getDb, hasDatabase } from "@harborline/backend/db";
import { newsTips } from "@harborline/backend/schema";
import { StudioShellClient } from "@/components/studio/studio-shell-client";
import { getEmployeeViewer } from "@/lib/employee-auth";
import { getEmployeeUnreadChatCount } from "@/lib/employee-chat";
import { canViewNewsTips } from "@/lib/newsroom-tips";
import { getSiteConfiguration } from "@/lib/site-settings";
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
  let alertsEnabled = ["admin", "editor", "producer"].includes(viewer.role);
  let financeEnabled = false;
  const configurationPromise = getSiteConfiguration();
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

  try {
    const employeeViewer = await getEmployeeViewer();
    chatEnabled = Boolean(employeeViewer?.capabilities.includes("chat:read"));
    pressEnabled = Boolean(employeeViewer?.capabilities.includes("tools:press"));
    alertsEnabled = Boolean(employeeViewer?.capabilities.includes("tools:alerts"));
    financeEnabled = Boolean(employeeViewer?.capabilities.includes("tools:finance"));
    if (hasDatabase() && employeeViewer && chatEnabled) {
      unreadChatCount = await getEmployeeUnreadChatCount(employeeViewer);
    }
  } catch (error) {
    console.error("Studio capability lookup failed", error);
  }

  const configuration = await configurationPromise;

  return (
    <StudioShellClient
      viewer={viewer}
      newTipCount={newTipCount}
      unreadChatCount={unreadChatCount}
      chatEnabled={chatEnabled}
      pressEnabled={pressEnabled}
      alertsEnabled={alertsEnabled}
      financeEnabled={financeEnabled}
      studioConfiguration={configuration.studio}
    >
      {children}
    </StudioShellClient>
  );
}
