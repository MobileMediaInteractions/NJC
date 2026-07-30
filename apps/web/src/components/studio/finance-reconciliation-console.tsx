"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, RefreshCw, ShieldAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type ProviderEvent = {
  id: string;
  eventType: string;
  status: string;
  attempts: number;
  lastError: string | null;
  receivedAt: string;
  processedAt: string | null;
};

type PeriodClose = {
  id: string;
  periodType: string;
  periodStart: string;
  periodEnd: string;
  version: number;
  status: string;
  reconciliationStatus: string;
  notes: string;
  closedByClerkId: string;
  reviewedByClerkId: string | null;
  reviewedAt: string | null;
};

export function FinanceReconciliationConsole({
  events,
  closes,
  stripeConfigured,
}: {
  events: ProviderEvent[];
  closes: PeriodClose[];
  stripeConfigured: boolean;
}) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();

  function command(body: Record<string, unknown>) {
    setMessage("");
    startTransition(async () => {
      const response = await fetch("/api/v1/studio/finance/reconciliation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        setMessage(payload?.error?.message ?? "The finance operation failed.");
        return;
      }
      setMessage("The finance operation completed and was audited.");
      router.refresh();
    });
  }

  function sync(form: FormData) {
    command({
      action: "sync_stripe",
      lookbackDays: Number(form.get("lookbackDays")),
      confirmation: String(form.get("confirmation")),
    });
  }

  function close(form: FormData) {
    command({
      action: "close_period",
      periodType: String(form.get("periodType")),
      periodStart: new Date(`${String(form.get("periodStart"))}T00:00:00`).toISOString(),
      periodEnd: new Date(`${String(form.get("periodEnd"))}T00:00:00`).toISOString(),
      notes: String(form.get("notes")),
      confirmation: String(form.get("confirmation")),
    });
  }

  function review(form: FormData) {
    command({
      action: "review_close",
      closeId: String(form.get("closeId")),
      reconciliationStatus: String(form.get("reconciliationStatus")),
      notes: String(form.get("notes")),
      confirmation: String(form.get("confirmation")),
    });
  }

  return (
    <div className="space-y-6">
      <section className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Stripe settlement synchronization</CardTitle>
            <CardDescription>
              Imports Stripe balance transactions with provider IDs, reporting
              categories, fees and availability. Re-running is idempotent.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action={sync} className="space-y-4">
              <Field label="Lookback">
                <select name="lookbackDays" className={selectClass} defaultValue="365">
                  <option value="30">Previous 30 days</option>
                  <option value="90">Previous 90 days</option>
                  <option value="365">Previous year</option>
                  <option value="730">Previous two years</option>
                  <option value="3650">Maximum — ten years</option>
                </select>
              </Field>
              <Field label='Exact confirmation: “SYNC STRIPE”'>
                <Input name="confirmation" autoComplete="off" required />
              </Field>
              <Button className="w-full" disabled={pending || !stripeConfigured}>
                <RefreshCw /> {pending ? "Working…" : "Synchronize provider ledger"}
              </Button>
              {!stripeConfigured ? (
                <p className="text-sm text-destructive">
                  Stripe credentials are not configured in this environment.
                </p>
              ) : null}
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Close a completed period</CardTitle>
            <CardDescription>
              Freezes a versioned summary. Re-closing the same range supersedes
              the previous snapshot without deleting it.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action={close} className="grid gap-4 sm:grid-cols-2">
              <Field label="Period type">
                <select name="periodType" className={selectClass} defaultValue="month">
                  <option value="month">Month</option>
                  <option value="quarter">Quarter</option>
                  <option value="year">Year</option>
                </select>
              </Field>
              <Field label="First day">
                <Input name="periodStart" type="date" required />
              </Field>
              <Field label="First day after the period">
                <Input name="periodEnd" type="date" required />
              </Field>
              <Field label='Exact confirmation: “CLOSE PERIOD”'>
                <Input name="confirmation" autoComplete="off" required />
              </Field>
              <Field label="Close notes" className="sm:col-span-2">
                <Textarea name="notes" rows={3} placeholder="Evidence reviewed and exceptions outstanding" />
              </Field>
              <Button className="sm:col-span-2" disabled={pending}>
                <CheckCircle2 /> Close versioned period
              </Button>
            </form>
          </CardContent>
        </Card>
      </section>

      <p className="text-sm text-muted-foreground" role="status">{message}</p>

      <Card>
        <CardHeader>
          <CardTitle>Period-close register</CardTitle>
          <CardDescription>
            A different finance-authorized account must review each close.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {closes.map((close) => (
            <article key={close.id} className="rounded-lg border p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <strong className="capitalize">{close.periodType} close · v{close.version}</strong>
                    <Badge variant={close.reconciliationStatus === "reviewed" ? "default" : "outline"} className="capitalize">
                      {close.reconciliationStatus}
                    </Badge>
                    {close.status !== "closed" ? <Badge variant="secondary">{close.status}</Badge> : null}
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {new Date(close.periodStart).toLocaleDateString()} – {new Date(close.periodEnd).toLocaleDateString()}
                  </p>
                </div>
                {close.status === "closed" && close.reconciliationStatus === "unreviewed" ? (
                  <form action={review} className="grid min-w-[300px] gap-2">
                    <input type="hidden" name="closeId" value={close.id} />
                    <select name="reconciliationStatus" className={selectClass} defaultValue="reviewed">
                      <option value="reviewed">Reviewed — no exception</option>
                      <option value="exception">Exception requires action</option>
                    </select>
                    <Input name="notes" minLength={5} required placeholder="Reviewer evidence or exception" />
                    <Input name="confirmation" required placeholder="Type REVIEW CLOSE" />
                    <Button size="sm" variant="outline" disabled={pending}>
                      <ShieldAlert /> Record independent review
                    </Button>
                  </form>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    {close.reviewedAt
                      ? `Reviewed ${new Date(close.reviewedAt).toLocaleString()}`
                      : "Retained as historical evidence"}
                  </p>
                )}
              </div>
            </article>
          ))}
          {!closes.length ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              No accounting periods have been closed.
            </p>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Webhook processing register</CardTitle>
          <CardDescription>
            Duplicate protection and failures for signed Stripe events.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y">
            {events.map((event) => (
              <div key={event.id} className="grid gap-2 px-6 py-4 sm:grid-cols-[1fr_auto_auto] sm:items-center">
                <div>
                  <strong className="text-sm">{event.eventType}</strong>
                  <p className="text-xs text-muted-foreground">
                    Received {new Date(event.receivedAt).toLocaleString()} · {event.attempts} attempt{event.attempts === 1 ? "" : "s"}
                  </p>
                  {event.lastError ? <p className="mt-1 text-xs text-destructive">{event.lastError}</p> : null}
                </div>
                <Badge variant={event.status === "failed" ? "destructive" : "outline"} className="capitalize">{event.status}</Badge>
                <span className="text-xs text-muted-foreground">{event.processedAt ? new Date(event.processedAt).toLocaleString() : "Pending"}</span>
              </div>
            ))}
            {!events.length ? <p className="px-6 py-12 text-center text-sm text-muted-foreground">No Stripe webhook events are recorded.</p> : null}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Field({ label, className, children }: { label: string; className?: string; children: React.ReactNode }) {
  return <Label className={`block ${className ?? ""}`}><span className="mb-2 block">{label}</span>{children}</Label>;
}

const selectClass = "h-10 w-full rounded-md border bg-background px-3 text-sm";
