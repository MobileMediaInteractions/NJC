import { desc, eq } from "drizzle-orm";
import { Award, Database, ShieldAlert } from "lucide-react";
import { getDb, hasDatabase } from "@harborline/backend/db";
import {
  twentyUnderTwentyPrograms,
  twentyUnderTwentySubmissions,
} from "@harborline/backend/schema";
import { StudioGate } from "@/components/studio/studio-gate";
import { StudioShell } from "@/components/studio/studio-shell";
import { TwentyUnderTwentyManager } from "@/components/studio/twenty-under-twenty-manager";
import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getStudioUser } from "@/lib/auth";
import { canManageTwentyUnderTwenty } from "@/lib/twenty-under-twenty";

export const dynamic = "force-dynamic";

export default async function TwentyUnderTwentyStudioPage() {
  const viewer = await getStudioUser();
  if (!viewer) return <StudioGate><></></StudioGate>;

  if (!canManageTwentyUnderTwenty(viewer.role)) {
    return (
      <StudioShell viewer={viewer}>
        <Card>
          <CardHeader>
            <CardTitle>20 Under 20 is restricted</CardTitle>
            <CardDescription>
              An editor or administrator role is required because applications
              contain private information about students, including minors.
            </CardDescription>
          </CardHeader>
        </Card>
      </StudioShell>
    );
  }

  let connected = hasDatabase();
  let programs: Array<typeof twentyUnderTwentyPrograms.$inferSelect> = [];
  let submissions: Array<typeof twentyUnderTwentySubmissions.$inferSelect> = [];
  if (connected) {
    try {
      programs = await getDb()
        .select()
        .from(twentyUnderTwentyPrograms)
        .orderBy(desc(twentyUnderTwentyPrograms.year));
      const current = programs[0];
      if (current) {
        submissions = await getDb()
          .select()
          .from(twentyUnderTwentySubmissions)
          .where(eq(twentyUnderTwentySubmissions.programId, current.id))
          .orderBy(desc(twentyUnderTwentySubmissions.submittedAt));
      }
    } catch (error) {
      console.error("20 Under 20 Studio lookup failed", error);
      connected = false;
    }
  }

  return (
    <StudioShell viewer={viewer}>
      <div className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-primary">Community programs</p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight">20 Under 20</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
              Control each annual program, open and close verified intake,
              review candidates, select the class, and publish only approved
              honoree profiles.
            </p>
          </div>
          <Badge variant={connected ? "secondary" : "outline"}>
            <Database /> {connected ? "Live database" : "Database not connected"}
          </Badge>
        </div>

        <div className="flex gap-3 rounded-lg border border-amber-400/40 bg-amber-400/10 p-4 text-sm">
          <ShieldAlert className="mt-0.5 size-5 shrink-0 text-amber-500" />
          <p>
            Student birth dates, contact details, guardian details and private
            review notes are confidential. Never copy them into public bios,
            exports, screenshots or audit metadata.
          </p>
        </div>

        {connected ? (
          <TwentyUnderTwentyManager
            initialProgram={programs[0] ?? null}
            previousPrograms={programs.slice(1).map((program) => ({
              id: program.id,
              year: program.year,
              status: program.status,
            }))}
            initialSubmissions={submissions}
            canConfigure={viewer.role === "admin"}
          />
        ) : (
          <Card>
            <CardHeader>
              <Award className="size-6 text-primary" />
              <CardTitle>Program controls need Postgres</CardTitle>
              <CardDescription>
                Apply the current database migrations before opening
                nominations or applications.
              </CardDescription>
            </CardHeader>
          </Card>
        )}
      </div>
    </StudioShell>
  );
}
