import { FinanceLedgerConsole } from "@/components/studio/finance-ledger-console";
import { getEmployeeViewer } from "@/lib/employee-auth";
import { loadFinanceDashboard } from "@/lib/finance";

export default async function FinanceLedgerPage() {
  const viewer = await getEmployeeViewer();
  const end = new Date();
  const data = await loadFinanceDashboard({
    start: new Date(end.getFullYear() - 3, 0, 1),
    end,
    actorClerkId: viewer?.id,
  });
  return (
    <div className="space-y-7">
      <header>
        <p className="text-xs font-black uppercase tracking-[0.18em] text-primary">
          Finance evidence
        </p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">
          Immutable operating ledger
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
          Review processor settlements and record supported off-platform
          activity without silently rewriting financial history.
        </p>
      </header>
      <FinanceLedgerConsole
        entries={data.ledger.map((entry) => ({
          id: entry.id,
          source: entry.source,
          entryKind: entry.entryKind,
          revenueCategory: entry.revenueCategory,
          currency: entry.currency,
          grossAmountCents: entry.grossAmountCents,
          feeAmountCents: entry.feeAmountCents,
          taxAmountCents: entry.taxAmountCents,
          netAmountCents: entry.netAmountCents,
          status: entry.status,
          description: entry.description,
          counterparty: entry.counterparty,
          reversalOfId: entry.reversalOfId,
          occurredAt: entry.occurredAt.toISOString(),
        }))}
      />
    </div>
  );
}
