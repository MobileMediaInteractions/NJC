import { and, desc, eq, gte, lt } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb, hasDatabase } from "@harborline/backend/db";
import { financialLedgerEntries } from "@harborline/backend/schema";
import { requireEmployeeCapability, writeEmployeeAudit } from "@/lib/employee-auth";
import {
  financeReversalInput,
  manualFinanceEntryInput,
} from "@/lib/finance-model";

export const dynamic = "force-dynamic";

const commandInput = z.discriminatedUnion("action", [
  manualFinanceEntryInput.extend({ action: z.literal("post") }),
  financeReversalInput.extend({ action: z.literal("reverse") }),
]);

export async function GET(request: Request) {
  const viewer = await requireEmployeeCapability("tools:finance");
  if (!viewer) return error("forbidden", "Finance permission is required", 403);
  if (!hasDatabase()) {
    return NextResponse.json(
      { data: [], meta: { apiVersion: "1", database: false } },
      { headers: privateHeaders() },
    );
  }
  const url = new URL(request.url);
  const end = parseDate(url.searchParams.get("end")) ?? new Date();
  const start =
    parseDate(url.searchParams.get("start")) ??
    new Date(end.getTime() - 365 * 86_400_000);
  const limit = Math.min(
    1_000,
    Math.max(1, Number(url.searchParams.get("limit") ?? 500)),
  );
  const data = await getDb()
    .select()
    .from(financialLedgerEntries)
    .where(
      and(
        gte(financialLedgerEntries.occurredAt, start),
        lt(financialLedgerEntries.occurredAt, end),
      ),
    )
    .orderBy(desc(financialLedgerEntries.occurredAt))
    .limit(limit);
  return NextResponse.json(
    { data, meta: { apiVersion: "1", start, end } },
    { headers: privateHeaders() },
  );
}
export async function POST(request: Request) {
  const viewer = await requireEmployeeCapability("tools:finance");
  if (!viewer) return error("forbidden", "Finance permission is required", 403);
  if (!hasDatabase()) return error("service_not_configured", "Postgres is required", 503);
  const parsed = commandInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: {
          code: "invalid_request",
          message: "Review the ledger command and confirmation",
          details: parsed.error.flatten(),
        },
      },
      { status: 400, headers: privateHeaders() },
    );
  }

  if (parsed.data.action === "reverse") {
    return reverseEntry(request, viewer, parsed.data);
  }

  const idempotency = request.headers.get("idempotency-key")?.trim();
  if (!idempotency || idempotency.length > 200) {
    return error(
      "idempotency_required",
      "A unique Idempotency-Key is required",
      400,
    );
  }
  const value = parsed.data;
  const sign =
    value.entryKind === "expense" || value.entryKind === "tax_payment"
      ? -1
      : value.direction === "outflow"
        ? -1
        : 1;
  const [entry] = await getDb()
    .insert(financialLedgerEntries)
    .values({
      source: "manual",
      entryKind: value.entryKind,
      revenueCategory: value.category,
      currency: value.currency,
      grossAmountCents: sign * value.amountCents,
      feeAmountCents: 0,
      taxAmountCents: 0,
      netAmountCents: sign * value.amountCents,
      status: "posted",
      description: value.description,
      counterparty: value.counterparty || null,
      idempotencyKey: `manual:${idempotency}`,
      occurredAt: new Date(value.occurredAt),
      createdByClerkId: viewer.id,
      metadata: { direction: value.direction },
    })
    .onConflictDoNothing()
    .returning();
  if (!entry) {
    return error(
      "duplicate_request",
      "This ledger request has already been recorded",
      409,
    );
  }
  await writeEmployeeAudit(
    request,
    viewer,
    "finance.ledger.posted",
    { type: "financial_ledger_entry", id: entry.id },
    {
      entryKind: entry.entryKind,
      category: entry.revenueCategory,
      amountCents: entry.netAmountCents,
      currency: entry.currency,
    },
  );
  return NextResponse.json(
    { data: entry, meta: { apiVersion: "1" } },
    { status: 201, headers: privateHeaders() },
  );
}

async function reverseEntry(
  request: Request,
  viewer: NonNullable<Awaited<ReturnType<typeof requireEmployeeCapability>>>,
  value: z.infer<typeof financeReversalInput> & { action: "reverse" },
) {
  const [original] = await getDb()
    .select()
    .from(financialLedgerEntries)
    .where(eq(financialLedgerEntries.id, value.entryId))
    .limit(1);
  if (!original) return error("not_found", "Ledger entry not found", 404);
  if (original.entryKind === "reversal") {
    return error("invalid_reversal", "A reversal cannot be reversed directly", 409);
  }
  const [entry] = await getDb()
    .insert(financialLedgerEntries)
    .values({
      source: "manual",
      entryKind: "reversal",
      revenueCategory: original.revenueCategory,
      currency: original.currency,
      grossAmountCents: -original.grossAmountCents,
      feeAmountCents: -original.feeAmountCents,
      taxAmountCents: -original.taxAmountCents,
      netAmountCents: -original.netAmountCents,
      status: "posted",
      description: `Reversal: ${value.reason}`,
      counterparty: original.counterparty,
      userClerkId: original.userClerkId,
      idempotencyKey: `manual:reversal:${original.id}`,
      reversalOfId: original.id,
      occurredAt: new Date(),
      createdByClerkId: viewer.id,
      metadata: { originalEntryKind: original.entryKind },
    })
    .onConflictDoNothing()
    .returning();
  if (!entry) {
    return error("already_reversed", "This ledger entry already has a reversal", 409);
  }
  await writeEmployeeAudit(
    request,
    viewer,
    "finance.ledger.reversed",
    { type: "financial_ledger_entry", id: entry.id },
    { reversalOfId: original.id, reason: value.reason },
  );
  return NextResponse.json(
    { data: entry, meta: { apiVersion: "1" } },
    { status: 201, headers: privateHeaders() },
  );
}

function parseDate(value: string | null) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function privateHeaders() {
  return new Headers({
    "Cache-Control": "private, no-store",
    "X-Robots-Tag": "noindex, nofollow",
  });
}

function error(code: string, message: string, status: number) {
  return NextResponse.json(
    { error: { code, message } },
    { status, headers: privateHeaders() },
  );
}
