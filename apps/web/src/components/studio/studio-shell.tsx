import { count, eq } from "drizzle-orm";
import { getDb, hasDatabase } from "@harborline/backend/db";
import { newsTips } from "@harborline/backend/schema";
import { StudioShellClient } from "@/components/studio/studio-shell-client";
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

  return (
    <StudioShellClient viewer={viewer} newTipCount={newTipCount}>
      {children}
    </StudioShellClient>
  );
}
