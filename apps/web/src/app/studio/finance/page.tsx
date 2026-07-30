import Link from "next/link";
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Banknote,
  Calculator,
  CircleDollarSign,
  CreditCard,
  FileDown,
  Landmark,
  ReceiptText,
  ShieldCheck,
  TrendingUp,
  WalletCards,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getEmployeeViewer } from "@/lib/employee-auth";
import { loadFinanceDashboard } from "@/lib/finance";

export default async function FinancePage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const viewer = await getEmployeeViewer();
  const { range } = await searchParams;
  const period = financeRange(range);
  const data = await loadFinanceDashboard({
    ...period,
    actorClerkId: viewer?.id,
  });
  const currency = data.settings.reportingCurrency;
  const summary = data.summary;
  const reservePolicyMissing = !data.configured.reservePolicy;

  return (
    <div className="space-y-7">
      <header className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-primary">
            Finance & revenue operations
          </p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">
            Financial control room
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
            Provider-settled revenue, fees, refunds, disputes, expenses,
            subscription health and configurable reserve planning. This is an
            operating ledger—not a filed tax return or replacement for a CPA.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href="/api/v1/studio/finance/export">
              <FileDown /> Export ledger
            </Link>
          </Button>
          <Button asChild>
            <Link href="/studio/finance/reconciliation">
              <ShieldCheck /> Reconcile
            </Link>
          </Button>
        </div>
      </header>

      <div className="flex flex-wrap gap-2" aria-label="Reporting period">
        {[
          ["30d", "30 days"],
          ["quarter", "Quarter"],
          ["ytd", "Year to date"],
          ["12m", "12 months"],
        ].map(([value, label]) => (
          <Button
            key={value}
            asChild
            size="sm"
            variant={(range ?? "ytd") === value ? "default" : "outline"}
          >
            <Link href={`/studio/finance?range=${value}`}>{label}</Link>
          </Button>
        ))}
        <span className="self-center text-xs text-muted-foreground">
          {period.start.toLocaleDateString()} – {new Date(period.end.getTime() - 1).toLocaleDateString()}
        </span>
      </div>

      {!data.configured.stripe || reservePolicyMissing ? (
        <Card className="border-amber-500/45 bg-amber-500/5">
          <CardHeader className="flex-row items-start gap-3">
            <AlertTriangle className="mt-0.5 size-5 text-amber-600" />
            <div>
              <CardTitle>Finance readiness requires attention</CardTitle>
              <CardDescription className="mt-1">
                {!data.configured.stripe
                  ? "Stripe credentials are not configured, so provider settlement data cannot synchronize. "
                  : ""}
                {reservePolicyMissing
                  ? "Tax and reserve rates remain unreviewed or zero. Ask the publication’s CPA to approve entity-specific rates before relying on reserve estimates."
                  : ""}
              </CardDescription>
            </div>
          </CardHeader>
        </Card>
      ) : null}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric
          icon={<CircleDollarSign />}
          label="Gross collected"
          value={money(summary.grossRevenueCents, currency)}
          detail={`Before ${money(summary.refundsCents, currency)} refunds`}
          tone="positive"
        />
        <Metric
          icon={<TrendingUp />}
          label="Net revenue"
          value={money(summary.netRevenueCents, currency)}
          detail={`After fees, tax collected and payment losses`}
          tone={summary.netRevenueCents >= 0 ? "positive" : "negative"}
        />
        <Metric
          icon={<Calculator />}
          label="Operating result"
          value={money(summary.operatingProfitCents, currency)}
          detail={`After ${money(summary.operatingExpensesCents, currency)} recorded operating expense`}
          tone={summary.operatingProfitCents >= 0 ? "positive" : "negative"}
        />
        <Metric
          icon={<Landmark />}
          label="Planned reserves"
          value={money(summary.reserves.totalPlannedReservesCents, currency)}
          detail={`${money(summary.reserves.unallocatedProfitAfterReservesCents, currency)} unallocated after targets`}
          tone="neutral"
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_.9fr]">
        <Card>
          <CardHeader>
            <CardTitle>Profit and loss bridge</CardTitle>
            <CardDescription>
              Signed ledger activity for the selected period. Payouts transfer
              cash and do not count as revenue or expense.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Bridge label="Gross revenue" value={summary.grossRevenueCents} currency={currency} positive />
            <Bridge label="Refunds" value={-summary.refundsCents} currency={currency} />
            <Bridge label="Disputes net of recoveries" value={-(summary.disputesCents - summary.disputeRecoveriesCents)} currency={currency} />
            <Bridge label="Payment processing and network fees" value={-summary.processingFeesCents} currency={currency} />
            <Bridge label="Tax collected and held outside revenue" value={-summary.taxCollectedCents} currency={currency} />
            <Bridge label="Operating expenses" value={-summary.operatingExpensesCents} currency={currency} />
            <div className="flex items-center justify-between border-t pt-4 text-base font-black">
              <span>Operating result</span>
              <span>{money(summary.operatingProfitCents, currency)}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>What to set aside</CardTitle>
            <CardDescription>
              Policy-driven planning amounts. Exact sales tax comes from the
              ledger; income, payroll and risk reserves use administrator-entered
              rates that should be approved by a tax professional.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Reserve label="Sales tax payable" value={summary.salesTaxPayableCents} currency={currency} exact />
            <Reserve label="Federal income tax estimate" value={summary.reserves.federalIncomeTaxReserveCents} currency={currency} />
            <Reserve label="New Jersey income tax estimate" value={summary.reserves.stateIncomeTaxReserveCents} currency={currency} />
            <Reserve label="Payroll tax estimate" value={summary.reserves.payrollTaxReserveCents} currency={currency} />
            <Reserve label="Refund and chargeback reserve" value={summary.reserves.chargebackReserveCents} currency={currency} />
            <Reserve label="Contingency reserve" value={summary.reserves.contingencyReserveCents} currency={currency} />
            <Reserve label="Operating reserve target" value={summary.reserves.operatingReserveTargetCents} currency={currency} />
            <Button asChild variant="outline" className="mt-2 w-full">
              <Link href="/studio/finance/settings">Review reserve policy</Link>
            </Button>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric icon={<WalletCards />} label="MRR" value={money(data.subscriptions.mrrCents, currency)} detail={`${data.subscriptions.active} active paid subscriptions`} tone="positive" />
        <Metric icon={<Banknote />} label="ARR run rate" value={money(data.subscriptions.arrCents, currency)} detail="MRR × 12, not recognized revenue" tone="neutral" />
        <Metric icon={<CreditCard />} label="Payment attention" value={data.subscriptions.pastDue.toLocaleString()} detail={`${data.subscriptions.trialing} trials · ${data.subscriptions.cancelAtPeriodEnd} canceling`} tone={data.subscriptions.pastDue ? "negative" : "positive"} />
        <Metric icon={<ReceiptText />} label="Processor payouts" value={money(summary.payoutsCents, currency)} detail="Transfers recorded in the selected period" tone="neutral" />
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Monthly operating trend</CardTitle>
            <CardDescription>Revenue, outflows and net Stripe/manual ledger movement.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {data.monthly.length ? (
              <div className="divide-y">
                {data.monthly.map((row) => (
                  <div key={row.month} className="grid grid-cols-[1fr_repeat(3,auto)] gap-4 px-6 py-3 text-sm">
                    <strong>{row.month}</strong>
                    <span className="text-emerald-700">{money(row.revenueCents, currency)}</span>
                    <span className="text-red-700">{money(-row.expensesCents, currency)}</span>
                    <span className="font-mono">{money(row.netCents, currency)}</span>
                  </div>
                ))}
              </div>
            ) : <Empty label="No posted ledger activity in this period." />}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Revenue concentration</CardTitle>
            <CardDescription>Gross receipts by operating line.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.revenueByCategory.length ? data.revenueByCategory.map((row) => {
              const share = summary.grossRevenueCents
                ? (row.amountCents / summary.grossRevenueCents) * 100
                : 0;
              return (
                <div key={row.category}>
                  <div className="flex justify-between text-sm">
                    <span className="capitalize">{row.category.replaceAll("_", " ")}</span>
                    <span className="font-mono">{money(row.amountCents, currency)} · {share.toFixed(1)}%</span>
                  </div>
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted">
                    <div className="h-full bg-primary" style={{ width: `${Math.min(100, share)}%` }} />
                  </div>
                </div>
              );
            }) : <Empty label="No revenue categories are populated." />}
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader className="flex-row items-center justify-between gap-4">
          <div>
            <CardTitle>Recent ledger evidence</CardTitle>
            <CardDescription>Latest provider and manually posted entries.</CardDescription>
          </div>
          <Button asChild size="sm" variant="outline">
            <Link href="/studio/finance/ledger">Open full ledger</Link>
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {data.ledger.length ? (
            <div className="divide-y">
              {data.ledger.slice(0, 12).map((entry) => (
                <div key={entry.id} className="grid gap-2 px-6 py-4 sm:grid-cols-[auto_1fr_auto] sm:items-center">
                  <Badge variant="outline" className="w-fit capitalize">{entry.entryKind.replaceAll("_", " ")}</Badge>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{entry.description}</p>
                    <p className="text-xs text-muted-foreground">{entry.occurredAt.toLocaleString()} · {entry.source}</p>
                  </div>
                  <strong className={entry.netAmountCents >= 0 ? "text-emerald-700" : "text-red-700"}>
                    {money(entry.netAmountCents, entry.currency)}
                  </strong>
                </div>
              ))}
            </div>
          ) : <Empty label="Synchronize Stripe or post the first supported manual entry." />}
        </CardContent>
      </Card>
    </div>
  );
}
function financeRange(range?: string) {
  const now = new Date();
  const end = new Date(now);
  if (range === "30d") return { start: new Date(now.getTime() - 30 * 86_400_000), end };
  if (range === "quarter") {
    const quarterMonth = Math.floor(now.getMonth() / 3) * 3;
    return { start: new Date(now.getFullYear(), quarterMonth, 1), end };
  }
  if (range === "12m") return { start: new Date(now.getFullYear() - 1, now.getMonth(), 1), end };
  return { start: new Date(now.getFullYear(), 0, 1), end };
}

function money(cents: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(cents / 100);
}

function Metric({ icon, label, value, detail, tone }: { icon: React.ReactNode; label: string; value: string; detail: string; tone: "positive" | "negative" | "neutral" }) {
  return <Card><CardContent className="p-5"><span className={tone === "positive" ? "text-emerald-600 [&_svg]:size-5" : tone === "negative" ? "text-red-600 [&_svg]:size-5" : "text-primary [&_svg]:size-5"}>{icon}</span><p className="mt-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">{label}</p><p className="mt-1 text-2xl font-black">{value}</p><p className="mt-1 text-xs leading-5 text-muted-foreground">{detail}</p></CardContent></Card>;
}
function Bridge({ label, value, currency, positive = false }: { label: string; value: number; currency: string; positive?: boolean }) {
  return <div className="flex items-center justify-between text-sm"><span className="flex items-center gap-2">{positive ? <ArrowUpRight className="size-4 text-emerald-600" /> : <ArrowDownRight className="size-4 text-red-600" />}{label}</span><span className="font-mono">{money(value, currency)}</span></div>;
}
function Reserve({ label, value, currency, exact = false }: { label: string; value: number; currency: string; exact?: boolean }) {
  return <div className="flex items-center justify-between gap-4 text-sm"><span>{label}{exact ? <Badge variant="secondary" className="ml-2">ledger liability</Badge> : null}</span><strong>{money(value, currency)}</strong></div>;
}
function Empty({ label }: { label: string }) {
  return <p className="px-6 py-12 text-center text-sm text-muted-foreground">{label}</p>;
}
