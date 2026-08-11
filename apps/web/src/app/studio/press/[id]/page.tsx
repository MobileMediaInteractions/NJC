import { StudioGate } from "@/components/studio/studio-gate";
import { PressRequestReview } from "@/components/studio/press-request-review";
import { StudioShell } from "@/components/studio/studio-shell";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getStudioUser } from "@/lib/auth";

export default async function PressRequestReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const viewer = await getStudioUser();
  if (!viewer) return <StudioGate><></></StudioGate>;
  if (!["admin", "editor", "producer"].includes(viewer.role)) return <StudioShell viewer={viewer}><Card><CardHeader><CardTitle>Press review is restricted</CardTitle><CardDescription>An administrator, editor, or producer role is required.</CardDescription></CardHeader></Card></StudioShell>;
  const { id } = await params;
  return <StudioShell viewer={viewer}><PressRequestReview requestId={id} /></StudioShell>;
}
