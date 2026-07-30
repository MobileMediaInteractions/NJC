import { and, desc, eq, gte, lt } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb, hasDatabase } from "@harborline/backend/db";
import {
  financialLedgerEntries,
  financialPeriodCloses,
  financialProviderEvents,
} from "@harborline/backend/schema";
import { requireEmployeeCapability, writeEmployeeAudit } from "@/lib/employee-auth";
import { calculateFinanceSummary } from "@/lib/finance-model";
import {
  getFinanceSettings,
  syncStripeBalanceTransactions,
} from "@/lib/finance";

export const dynamic = "force-dynamic";

const commandInput = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("sync_stripe"),
    lookbackDays: z.number().int().min(1).max(3_650).default(365),
    confirmation: z.literal("SYNC STRIPE"),
  }),
  z.object({
    action: z.literal("close_period"),
    periodType: z.enum(["month", "quarter", "year"]),
    periodStart: z.iso.datetime(),
    periodEnd: z.iso.datetime(),
    notes: z.string().trim().max(2_000).default(""),
    confirmation: z.literal("CLOSE PERIOD"),
  }),
  z.object({
    action: z.literal("review_close"),
    closeId: z.uuid(),
    reconciliationStatus: z.enum(["reviewed", "exception"]),
    notes: z.string().trim().min(5).max(2_000),
    confirmation: z.literal("REVIEW CLOSE"),
  }),
]);

export async function GET() {
  const viewer = await requireEmployeeCapability("tools:finance");
  if (!viewer) return error("forbidden", "Finance permission is required", 403);
  if (!hasDatabase()) {
    return NextResponse.json(
      {
        data: { events: [], closes: [] },
        meta: { apiVersion: "1", database: false },
      },
      { headers: privateHeaders() },
    );
  }
  const [events, closes] = await Promise.all([
    getDb()
      .select()
      .from(financialProviderEvents)
      .orderBy(desc(financialProviderEvents.receivedAt))
      .limit(250),
    getDb()
      .select()
      .from(financialPeriodCloses)
      .orderBy(desc(financialPeriodCloses.periodEnd))
      .limit(100),
  ]);
  return NextResponse.json(
    { data: { events, closes }, meta: { apiVersion: "1" } },
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
          message: "Review the reconciliation command and confirmation",
          details: parsed.error.flatten(),
        },
      },
      { status: 400, headers: privateHeaders() },
    );
  }

  if (parsed.data.action === "sync_stripe") {
    try {
      const data = await syncStripeBalanceTransactions({
        lookbackDays: parsed.data.lookbackDays,
      });
      await writeEmployeeAudit(
        request,
        viewer,
        "finance.stripe_balance.synced",
        { type: "stripe_balance", id: data.syncedAt.toISOString() },
        data,
      );
      return NextResponse.json(
        { data, meta: { apiVersion: "1" } },
        { headers: privateHeaders() },
      );
    } catch (syncError) {
      console.error("Stripe finance sync failed", { actorId: viewer.id, syncError });
      return error(
        "stripe_sync_failed",
        "Stripe balance activity could not be synchronized",
        502,
      );
    }
  }

  if (parsed.data.action === "review_close") {
    const [close] = await getDb()
      .select()
      .from(financialPeriodCloses)
      .where(eq(financialPeriodCloses.id, parsed.data.closeId))
      .limit(1);
    if (!close) return error("not_found", "Period close not found", 404);
    if (close.closedByClerkId === viewer.id) {
      return error(
        "separation_of_duties",
        "A different finance-authorized account must review this close",
        409,
      );
    }
    const [reviewed] = await getDb()
      .update(financialPeriodCloses)
      .set({
        reconciliationStatus: parsed.data.reconciliationStatus,
        notes: parsed.data.notes,
        reviewedByClerkId: viewer.id,
        reviewedAt: new Date(),
      })
      .where(eq(financialPeriodCloses.id, close.id))
      .returning();
    await writeEmployeeAudit(
      request,
      viewer,
      "finance.period_close.reviewed",
      { type: "financial_period_close", id: close.id },
      { reconciliationStatus: parsed.data.reconciliationStatus },
    );
    return NextResponse.json(
      { data: reviewed, meta: { apiVersion: "1" } },
      { headers: privateHeaders() },
    );
  }

  const closeCommand = parsed.data;
  const start = new Date(closeCommand.periodStart);
  const end = new Date(closeCommand.periodEnd);
  if (end <= start || end > new Date()) {
    return error(
      "invalid_period",
      "A close must cover a completed period with an end after its start",
      400,
    );
  }
  const [entries, settings, previousRows] = await Promise.all([
    getDb()
      .select()
      .from(financialLedgerEntries)
      .where(
        and(
          gte(financialLedgerEntries.occurredAt, start),
          lt(financialLedgerEntries.occurredAt, end),
        ),
      ),
    getFinanceSettings(viewer.id),
    getDb()
      .select()
      .from(financialPeriodCloses)
      .where(
        and(
          eq(financialPeriodCloses.periodType, closeCommand.periodType),
          eq(financialPeriodCloses.periodStart, start),
          eq(financialPeriodCloses.periodEnd, end),
          eq(financialPeriodCloses.status, "closed"),
        ),
      )
      .orderBy(desc(financialPeriodCloses.version))
      .limit(1),
  ]);
  const previous = previousRows[0];
  const summary = calculateFinanceSummary(entries, settings);
  const [closed] = await getDb().transaction(async (tx) => {
    if (previous) {
      await tx
        .update(financialPeriodCloses)
        .set({ status: "superseded" })
        .where(eq(financialPeriodCloses.id, previous.id));
    }
    return tx
      .insert(financialPeriodCloses)
      .values({
        periodType: closeCommand.periodType,
        periodStart: start,
        periodEnd: end,
        version: (previous?.version ?? 0) + 1,
        status: "closed",
        snapshot: {
          summary,
          entryCount: entries.length,
          reportingCurrency: settings.reportingCurrency,
          reservePolicyReviewedAt: settings.taxPolicyReviewedAt?.toISOString() ?? null,
        },
        reconciliationStatus: "unreviewed",
        notes: closeCommand.notes,
        supersedesId: previous?.id ?? null,
        closedByClerkId: viewer.id,
      })
      .returning();
  });
  await writeEmployeeAudit(
    request,
    viewer,
    "finance.period.closed",
    { type: "financial_period_close", id: closed.id },
    {
      periodType: closed.periodType,
      periodStart: start.toISOString(),
      periodEnd: end.toISOString(),
      version: closed.version,
      entryCount: entries.length,
    },
  );
  return NextResponse.json(
    { data: closed, meta: { apiVersion: "1" } },
    { status: 201, headers: privateHeaders() },
  );
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
