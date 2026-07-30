import { and, asc, gte, lt } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb, hasDatabase } from "@harborline/backend/db";
import { financialLedgerEntries } from "@harborline/backend/schema";
import { requireEmployeeCapability, writeEmployeeAudit } from "@/lib/employee-auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const viewer = await requireEmployeeCapability("tools:finance");
  if (!viewer) {
    return NextResponse.json(
      { error: { code: "forbidden", message: "Finance permission is required" } },
      { status: 403 },
    );
  }
  if (!hasDatabase()) {
    return NextResponse.json(
      { error: { code: "service_not_configured", message: "Postgres is required" } },
      { status: 503 },
    );
  }
  const url = new URL(request.url);
  const end = parseDate(url.searchParams.get("end")) ?? new Date();
  const start =
    parseDate(url.searchParams.get("start")) ??
    new Date(end.getTime() - 365 * 86_400_000);
  const entries = await getDb()
    .select()
    .from(financialLedgerEntries)
    .where(
      and(
        gte(financialLedgerEntries.occurredAt, start),
        lt(financialLedgerEntries.occurredAt, end),
      ),
    )
    .orderBy(asc(financialLedgerEntries.occurredAt))
    .limit(50_000);
  const header = [
    "entry_id",
    "occurred_at",
    "available_on",
    "source",
    "entry_kind",
    "category",
    "status",
    "currency",
    "gross_amount_minor",
    "fee_amount_minor",
    "tax_amount_minor",
    "net_amount_minor",
    "description",
    "counterparty",
    "provider_object_id",
    "provider_balance_transaction_id",
    "provider_payout_id",
    "reversal_of_id",
    "created_by",
    "created_at",
  ];
  const rows = entries.map((entry) => [
    entry.id,
    entry.occurredAt.toISOString(),
    entry.availableOn?.toISOString() ?? "",
    entry.source,
    entry.entryKind,
    entry.revenueCategory,
    entry.status,
    entry.currency,
    entry.grossAmountCents,
    entry.feeAmountCents,
    entry.taxAmountCents,
    entry.netAmountCents,
    entry.description,
    entry.counterparty ?? "",
    entry.providerObjectId ?? "",
    entry.providerBalanceTransactionId ?? "",
    entry.providerPayoutId ?? "",
    entry.reversalOfId ?? "",
    entry.createdByClerkId,
    entry.createdAt.toISOString(),
  ]);
  const csv = [header, ...rows]
    .map((row) => row.map(csvCell).join(","))
    .join("\r\n");
  await writeEmployeeAudit(
    request,
    viewer,
    "finance.ledger.exported",
    { type: "financial_ledger_export", id: `${start.toISOString()}:${end.toISOString()}` },
    { start: start.toISOString(), end: end.toISOString(), entryCount: entries.length },
  );
  const filename = `njc-finance-ledger-${start.toISOString().slice(0, 10)}-${end
    .toISOString()
    .slice(0, 10)}.csv`;
  return new NextResponse(csv, {
    headers: {
      "Cache-Control": "private, no-store",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Type": "text/csv; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}
function parseDate(value: string | null) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function csvCell(value: unknown) {
  const text = String(value ?? "");
  return `"${text.replaceAll('"', '""')}"`;
}
