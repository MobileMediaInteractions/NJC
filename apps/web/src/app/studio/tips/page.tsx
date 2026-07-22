import { count, desc, eq } from "drizzle-orm";
import { Inbox, ShieldAlert } from "lucide-react";
import { getDb, hasDatabase } from "@harborline/backend/db";
import { newsTips } from "@harborline/backend/schema";
import { StudioGate } from "@/components/studio/studio-gate";
import { StudioShell } from "@/components/studio/studio-shell";
import { TipStatusControl } from "@/components/studio/tip-status-control";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getStudioUser } from "@/lib/auth";
import { canViewNewsTips, type TipStatus } from "@/lib/newsroom-tips";
import { siteConfig } from "@/lib/site";

export default async function StudioTipsPage() {
  const viewer = await getStudioUser();
  if (!viewer) return <StudioGate><></></StudioGate>;
  if (!canViewNewsTips(viewer.role)) {
    return (
      <StudioShell viewer={viewer}>
        <Card>
          <CardHeader>
            <CardTitle>News tips are restricted</CardTitle>
            <CardDescription>
              A reporter, producer, editor or administrator role is required
              because submissions may contain source identities and sensitive
              reporting information.
            </CardDescription>
          </CardHeader>
        </Card>
      </StudioShell>
    );
  }

  let databaseConnected = hasDatabase();
  let rows: Array<typeof newsTips.$inferSelect> = [];
  let newCount = 0;
  if (databaseConnected) {
    try {
      const [tipRows, [summary]] = await Promise.all([
        getDb().select().from(newsTips).orderBy(desc(newsTips.createdAt)).limit(200),
        getDb().select({ value: count() }).from(newsTips).where(eq(newsTips.status, "new")),
      ]);
      rows = tipRows;
      newCount = Number(summary?.value ?? 0);
    } catch (error) {
      console.error("Studio news tips page lookup failed", error);
      databaseConnected = false;
    }
  }

  return (
    <StudioShell viewer={viewer}>
      <div className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-primary">Assignment desk</p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight">News tips</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
              Review reader-submitted leads from the production database. Treat
              names, contact details and allegations as sensitive source material.
            </p>
          </div>
          <div className="flex gap-2">
            <Badge variant="destructive">{newCount} new</Badge>
            <Badge variant={databaseConnected ? "secondary" : "outline"}>
              {databaseConnected ? "Live database" : "Database not connected"}
            </Badge>
          </div>
        </div>

        <div className="flex gap-3 rounded-lg border border-amber-400/40 bg-amber-400/10 p-4 text-sm">
          <ShieldAlert className="mt-0.5 size-5 shrink-0 text-amber-400" />
          <p>
            A submitted tip is a lead, not verified fact. Independently confirm
            claims before publication and limit access to source information.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Submission queue</CardTitle>
            <CardDescription>
              Newest 200 submissions. Change a tip to Reviewing when assigned and
              Closed when no further badge attention is needed.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {rows.map((tip) => (
              <article
                key={tip.id}
                className="rounded-lg border bg-muted/15 p-4 sm:p-5"
              >
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={tip.status === "new" ? "destructive" : "secondary"} className="capitalize">
                        {tip.status}
                      </Badge>
                      <time className="text-xs text-muted-foreground">
                        {formatTipDate(tip.createdAt)}
                      </time>
                    </div>
                    <h2 className="mt-3 text-lg font-bold">{tip.subject}</h2>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
                      {tip.body}
                    </p>
                    <div className="mt-4 flex flex-wrap gap-x-5 gap-y-1 text-xs">
                      <span>
                        <span className="text-muted-foreground">Source:</span>{" "}
                        {tip.name || "Anonymous"}
                      </span>
                      {tip.email ? (
                        <a className="text-primary hover:underline" href={`mailto:${tip.email}`}>
                          {tip.email}
                        </a>
                      ) : (
                        <span className="text-muted-foreground">No reply address</span>
                      )}
                    </div>
                  </div>
                  <TipStatusControl
                    id={tip.id}
                    initialStatus={tip.status as TipStatus}
                  />
                </div>
              </article>
            ))}
            {!rows.length ? (
              <div className="py-14 text-center">
                <Inbox className="mx-auto size-8 text-muted-foreground" />
                <p className="mt-3 text-sm font-medium">
                  {databaseConnected ? "No news tips submitted" : "Postgres is not connected"}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {databaseConnected
                    ? "New website submissions will appear here immediately."
                    : "Connect the production database before accepting or reviewing tips."}
                </p>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </StudioShell>
  );
}

function formatTipDate(value: Date) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: siteConfig.timezone,
  }).format(value);
}
