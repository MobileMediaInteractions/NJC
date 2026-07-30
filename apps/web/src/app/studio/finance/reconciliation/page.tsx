import { FinanceReconciliationConsole } from "@/components/studio/finance-reconciliation-console";
import { getEmployeeViewer } from "@/lib/employee-auth";
import { loadFinanceDashboard } from "@/lib/finance";

export default async function FinanceReconciliationPage() {
  const viewer = await getEmployeeViewer();
  const end = new Date();
  const data = await loadFinanceDashboard({
    start: new Date(end.getFullYear() - 1, 0, 1),
    end,
    actorClerkId: viewer?.id,
  });
  return (
    <div className="space-y-7">
      <header>
        <p className="text-xs font-black uppercase tracking-[0.18em] text-primary">
          Financial controls
        </p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">
          Reconciliation and close
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
          Synchronize the processor evidence, freeze period snapshots and
          record independent review without erasing prior versions.
        </p>
      </header>
      <FinanceReconciliationConsole
        stripeConfigured={data.configured.stripe}
        events={data.reconciliation.recentEvents.map((event) => ({
          id: event.id,
          eventType: event.eventType,
          status: event.status,
          attempts: event.attemptCount,
          lastError: event.lastErrorCode,
          receivedAt: event.receivedAt.toISOString(),
          processedAt: event.processedAt?.toISOString() ?? null,
        }))}
        closes={data.reconciliation.closes.map((close) => ({
          id: close.id,
          periodType: close.periodType,
          periodStart: close.periodStart.toISOString(),
          periodEnd: close.periodEnd.toISOString(),
          version: close.version,
          status: close.status,
          reconciliationStatus: close.reconciliationStatus,
          notes: close.notes,
          closedByClerkId: close.closedByClerkId,
          reviewedByClerkId: close.reviewedByClerkId,
          reviewedAt: close.reviewedAt?.toISOString() ?? null,
        }))}
      />
    </div>
  );
}
