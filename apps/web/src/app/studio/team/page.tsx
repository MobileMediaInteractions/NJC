import { asc } from "drizzle-orm";
import { ShieldCheck, UsersRound } from "lucide-react";
import { getDb, hasDatabase } from "@harborline/backend/db";
import { users } from "@harborline/backend/schema";
import { StudioGate } from "@/components/studio/studio-gate";
import { StudioShell } from "@/components/studio/studio-shell";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getStudioUser } from "@/lib/auth";

export default async function TeamPage() {
  const viewer = await getStudioUser();
  if (!viewer) return <StudioGate><></></StudioGate>;
  if (viewer.role !== "admin") {
    return <StudioShell viewer={viewer}><Card><CardHeader><CardTitle>Team management is restricted</CardTitle><CardDescription>An administrator role is required to view staff contact details and role assignments.</CardDescription></CardHeader></Card></StudioShell>;
  }

  let databaseConnected = hasDatabase();
  let team: Array<typeof users.$inferSelect> = [];
  if (databaseConnected) {
    try {
      team = await getDb().select().from(users).orderBy(asc(users.displayName));
    } catch (error) {
      console.error("Newsroom team lookup failed", error);
      databaseConnected = false;
    }
  }

  return (
    <StudioShell viewer={viewer}>
      <div>
        <div className="flex flex-wrap items-end justify-between gap-4"><div><h1 className="text-3xl font-bold tracking-tight">Team & roles</h1><p className="mt-1 text-sm text-muted-foreground">Staff accounts synchronized from authenticated Clerk sign-ins.</p></div><Badge variant={databaseConnected ? "secondary" : "outline"}>{databaseConnected ? "Live database" : "Database not connected"}</Badge></div>
        <Card className="mt-7">
          <CardHeader><CardTitle>Newsroom members</CardTitle><CardDescription>Create invitations and change public role metadata in Clerk. The database refreshes a member when that person signs in.</CardDescription></CardHeader>
          <CardContent>
            {team.length ? (
              <Table>
                <TableHeader><TableRow><TableHead>Member</TableHead><TableHead>Role</TableHead><TableHead>Publishing access</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                <TableBody>{team.map((member) => {
                  const initials = member.displayName.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase();
                  const canPublish = ["admin", "editor", "producer"].includes(member.role);
                  return <TableRow key={member.id}><TableCell><div className="flex items-center gap-3"><Avatar className="size-8"><AvatarFallback>{initials}</AvatarFallback></Avatar><div><p className="font-medium">{member.displayName}</p><p className="text-xs text-muted-foreground">{member.email}</p></div></div></TableCell><TableCell><Badge variant="secondary" className="capitalize">{member.role}</Badge></TableCell><TableCell>{canPublish ? <span className="flex items-center gap-1.5 text-sm text-emerald-400"><ShieldCheck className="size-4" /> Can publish</span> : <span className="text-sm text-muted-foreground">Submit for review</span>}</TableCell><TableCell><Badge variant={member.isActive ? "outline" : "destructive"}>{member.isActive ? "Active" : "Inactive"}</Badge></TableCell></TableRow>;
                })}</TableBody>
              </Table>
            ) : (
              <div className="grid min-h-64 place-items-center border border-dashed px-6 text-center"><div><UsersRound className="mx-auto size-8 text-muted-foreground" /><h2 className="mt-3 font-semibold">{databaseConnected ? "No synchronized staff accounts" : "Postgres is not connected"}</h2><p className="mt-1 text-sm text-muted-foreground">{databaseConnected ? "An approved Clerk user appears here after their first Studio sign-in." : "Connect Neon and apply migrations. No fictional staff are shown."}</p></div></div>
            )}
          </CardContent>
        </Card>
      </div>
    </StudioShell>
  );
}
