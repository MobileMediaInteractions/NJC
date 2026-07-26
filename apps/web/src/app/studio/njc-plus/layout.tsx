import { StudioGate } from "@/components/studio/studio-gate";
import { StudioShell } from "@/components/studio/studio-shell";
import { getStudioUser } from "@/lib/auth";

export default async function NjcPlusStudioLayout({ children }: { children: React.ReactNode }) {
  const viewer = await getStudioUser();
  if (!viewer) return <StudioGate><></></StudioGate>;
  return <StudioShell viewer={viewer}>{children}</StudioShell>;
}
