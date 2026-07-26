import { NjcPlusModeration } from "@/components/studio/njc-plus-moderation";
import { NjcPlusStudioHeading } from "@/components/studio/njc-plus-nav";
import { getStudioUser } from "@/lib/auth";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function NjcPlusCommentsPage() {
  const viewer = await getStudioUser();
  if (!viewer || !["admin", "editor", "producer"].includes(viewer.role)) {
    return <Card><CardHeader><CardTitle>Moderation is restricted</CardTitle><CardDescription>An editor, producer or administrator role is required.</CardDescription></CardHeader></Card>;
  }
  return <><NjcPlusStudioHeading eyebrow="Audience safety" title="Comments & reports" description="Approve conversations, resolve reports and retain a reasoned audit trail. Global and per-content controls remain off until explicitly enabled." /><NjcPlusModeration /></>;
}
