"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, RotateCcw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { financeCategories } from "@/lib/finance-model";

export type FinanceLedgerItem = {
  id: string;
  source: string;
  entryKind: string;
  revenueCategory: string;
  currency: string;
  grossAmountCents: number;
  feeAmountCents: number;
  taxAmountCents: number;
  netAmountCents: number;
  status: string;
  description: string;
  counterparty: string | null;
  reversalOfId: string | null;
  occurredAt: string;
};

export function FinanceLedgerConsole({
  entries,
}: {
  entries: FinanceLedgerItem[];
}) {
  const router = useRouter();
  const [filter, setFilter] = useState("all");
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();
  const filtered = useMemo(
    () =>
      filter === "all"
        ? entries
        : entries.filter((entry) => entry.entryKind === filter),
    [entries, filter],
  );

  function post(form: FormData) {
    setMessage("");
    const entryKind = String(form.get("entryKind"));
    startTransition(async () => {
      const response = await fetch("/api/v1/studio/finance/ledger", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": crypto.randomUUID(),
        },
        body: JSON.stringify({
          action: "post",
          entryKind,
          category: String(form.get("category")),
          amountCents: Math.round(Number(form.get("amount")) * 100),
          direction:
            entryKind === "expense" || entryKind === "tax_payment"
              ? "outflow"
              : String(form.get("direction")),
          currency: "usd",
          description: String(form.get("description")),
          counterparty: String(form.get("counterparty")),
          occurredAt: new Date(String(form.get("occurredAt"))).toISOString(),
          confirmation: String(form.get("confirmation")),
        }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        setMessage(payload?.error?.message ?? "The ledger entry failed.");
        return;
      }
      setMessage("The immutable ledger entry was posted.");
      router.refresh();
    });
  }

  function reverse(form: FormData) {
    setMessage("");
    startTransition(async () => {
      const response = await fetch("/api/v1/studio/finance/ledger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "reverse",
          entryId: String(form.get("entryId")),
          reason: String(form.get("reason")),
          confirmation: String(form.get("confirmation")),
        }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        setMessage(payload?.error?.message ?? "The reversal failed.");
        return;
      }
      setMessage("A linked reversal was added. The original remains intact.");
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Post a supported manual entry</CardTitle>
          <CardDescription>
            Processor activity comes from Stripe. Use this form for operating
            expenses, non-Stripe income, tax payments and documented
            adjustments. Entries cannot be edited or deleted.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={post} className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <LedgerField label="Entry type">
              <select name="entryKind" className={selectClass} defaultValue="expense">
                <option value="expense">Operating expense</option>
                <option value="income">Non-Stripe income</option>
                <option value="tax_payment">Tax payment</option>
                <option value="adjustment">Documented adjustment</option>
              </select>
            </LedgerField>
            <LedgerField label="Account category">
              <select name="category" className={selectClass} defaultValue="technology">
                {financeCategories.map((category) => (
                  <option key={category} value={category}>
                    {category.replaceAll("_", " ")}
                  </option>
                ))}
              </select>
            </LedgerField>
            <LedgerField label="Direction">
              <select name="direction" className={selectClass} defaultValue="outflow">
                <option value="outflow">Cash out</option>
                <option value="inflow">Cash in</option>
              </select>
            </LedgerField>
            <LedgerField label="Amount (USD)">
              <Input name="amount" type="number" min="0.01" step="0.01" required />
            </LedgerField>
            <LedgerField label="Transaction date and time">
              <Input
                name="occurredAt"
                type="datetime-local"
                defaultValue={localDateTime()}
                required
              />
            </LedgerField>
            <LedgerField label="Counterparty">
              <Input name="counterparty" placeholder="Vendor, client or agency" />
            </LedgerField>
            <LedgerField label="Description" className="md:col-span-2">
              <Input name="description" minLength={3} required placeholder="Business purpose and evidence reference" />
            </LedgerField>
            <LedgerField label='Exact confirmation: “POST TO LEDGER”' className="md:col-span-2">
              <Input name="confirmation" autoComplete="off" required />
            </LedgerField>
            <div className="flex items-end md:col-span-2">
              <Button className="w-full" disabled={pending}>
                <Plus /> {pending ? "Posting…" : "Post immutable entry"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {["all", "payment", "income", "expense", "refund", "dispute", "fee", "payout", "tax_payment", "adjustment"].map((kind) => (
            <Button
              type="button"
              size="sm"
              variant={filter === kind ? "default" : "outline"}
              key={kind}
              onClick={() => setFilter(kind)}
            >
              {kind.replaceAll("_", " ")}
            </Button>
          ))}
        </div>
        <p className="text-sm text-muted-foreground" role="status">{message}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>General ledger</CardTitle>
          <CardDescription>
            Provider and manual evidence in reverse chronological order. Use a
            linked reversal to correct a posted record.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px] text-left text-sm">
              <thead className="border-y bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-5 py-3">When</th>
                  <th className="px-5 py-3">Type / account</th>
                  <th className="px-5 py-3">Evidence</th>
                  <th className="px-5 py-3">Gross</th>
                  <th className="px-5 py-3">Fees</th>
                  <th className="px-5 py-3">Tax</th>
                  <th className="px-5 py-3">Net</th>
                  <th className="px-5 py-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filtered.map((entry) => (
                  <tr key={entry.id}>
                    <td className="whitespace-nowrap px-5 py-4">
                      {new Date(entry.occurredAt).toLocaleString()}
                      <span className="block text-xs text-muted-foreground">{entry.source} · {entry.status}</span>
                    </td>
                    <td className="px-5 py-4">
                      <Badge variant="outline" className="capitalize">{entry.entryKind.replaceAll("_", " ")}</Badge>
                      <span className="mt-1 block capitalize text-xs text-muted-foreground">{entry.revenueCategory.replaceAll("_", " ")}</span>
                    </td>
                    <td className="max-w-sm px-5 py-4">
                      <strong className="block">{entry.description}</strong>
                      {entry.counterparty ? <span className="text-xs text-muted-foreground">{entry.counterparty}</span> : null}
                    </td>
                    <MoneyCell value={entry.grossAmountCents} currency={entry.currency} />
                    <MoneyCell value={-Math.abs(entry.feeAmountCents)} currency={entry.currency} />
                    <MoneyCell value={entry.taxAmountCents} currency={entry.currency} />
                    <MoneyCell value={entry.netAmountCents} currency={entry.currency} strong />
                    <td className="px-5 py-4">
                      {entry.entryKind !== "reversal" && !entry.reversalOfId ? (
                        <ReverseDialog entry={entry} action={reverse} pending={pending} />
                      ) : <span className="text-xs text-muted-foreground">Linked correction</span>}
                    </td>
                  </tr>
                ))}
                {!filtered.length ? (
                  <tr><td colSpan={8} className="px-6 py-16 text-center text-muted-foreground">No ledger entries match this view.</td></tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ReverseDialog({
  entry,
  action,
  pending,
}: {
  entry: FinanceLedgerItem;
  action: (form: FormData) => void;
  pending: boolean;
}) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline"><RotateCcw /> Reverse</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Post a correcting reversal?</DialogTitle>
          <DialogDescription>
            The original {money(entry.netAmountCents, entry.currency)} entry
            remains in the audit trail. A new equal and opposite entry will be
            linked to it.
          </DialogDescription>
        </DialogHeader>
        <form action={action} className="space-y-4">
          <input type="hidden" name="entryId" value={entry.id} />
          <LedgerField label="Correction reason">
            <Textarea name="reason" minLength={10} required />
          </LedgerField>
          <LedgerField label='Exact confirmation: “REVERSE ENTRY”'>
            <Input name="confirmation" autoComplete="off" required />
          </LedgerField>
          <Button variant="destructive" className="w-full" disabled={pending}>
            Post linked reversal
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function MoneyCell({ value, currency, strong = false }: { value: number; currency: string; strong?: boolean }) {
  return <td className={`whitespace-nowrap px-5 py-4 font-mono ${strong ? "font-bold" : ""} ${value < 0 ? "text-red-700" : value > 0 ? "text-emerald-700" : ""}`}>{money(value, currency)}</td>;
}

function LedgerField({ label, className, children }: { label: string; className?: string; children: React.ReactNode }) {
  return <Label className={`block ${className ?? ""}`}><span className="mb-2 block">{label}</span>{children}</Label>;
}

function money(cents: number, currency: string) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: currency.toUpperCase() }).format(cents / 100);
}

function localDateTime() {
  const date = new Date();
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 16);
}

const selectClass =
  "h-10 w-full rounded-md border bg-background px-3 text-sm capitalize";
