import { StaffProfileEditor } from "@/components/studio/staff-profile-editor";
import { StudioGate } from "@/components/studio/studio-gate";
import { StudioShell } from "@/components/studio/studio-shell";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getStudioUser } from "@/lib/auth";
import { getStaffProfileDraft } from "@/lib/staff-profiles";

export const dynamic = "force-dynamic";

export default async function StudioProfilePage() {
  const viewer = await getStudioUser();
  if (!viewer) return <StudioGate><></></StudioGate>;

  const profile = await getStaffProfileDraft(viewer.id).catch((error) => {
    console.error("Studio public profile lookup failed", {
      actorId: viewer.id,
      error,
    });
    return null;
  });

  return (
    <StudioShell viewer={viewer}>
      <div className="max-w-5xl">
        <h1 className="text-3xl font-bold tracking-tight">My profile</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage how you appear to Courier readers and on published bylines.
        </p>
        <div className="mt-7">
          {profile ? (
            <StaffProfileEditor initialProfile={profile} />
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Public profile unavailable</CardTitle>
                <CardDescription>
                  The newsroom database could not load your staff record. Your
                  existing public information has not been changed.
                </CardDescription>
              </CardHeader>
            </Card>
          )}
        </div>
      </div>
    </StudioShell>
  );
}
