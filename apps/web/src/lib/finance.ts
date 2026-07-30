import "server-only";

import { and, desc, eq, gte, lt } from "drizzle-orm";
import {
  financialLedgerEntries,
  financialPeriodCloses,
  financialProviderEvents,
  financialSettings,
  premiumSubscriptions,
  premiumTiers,
} from "@harborline/backend/schema";
import { getDb, hasDatabase } from "@harborline/backend/db";
import {
  calculateFinanceSummary,
  financeCategories,
  monthKey,
  type FinanceEntryKind,
  type FinancePolicy,
} from "@/lib/finance-model";
import { getStripe, hasStripe } from "@/lib/stripe";

export const defaultFinancePolicy: FinancePolicy = {
  federalIncomeTaxReserveBps: 0,
  stateIncomeTaxReserveBps: 0,
  payrollTaxReserveBps: 0,
  contingencyReserveBps: 0,
  chargebackReserveBps: 0,
  operatingReserveMonths: 0,
  monthlyOperatingBudgetCents: 0,
};

export type FinanceSettingsRecord = typeof financialSettings.$inferSelect;
export type FinanceLedgerRecord = typeof financialLedgerEntries.$inferSelect;

export function financeSettingsDefaults(
  actorClerkId = "system:unconfigured",
): FinanceSettingsRecord {
  const now = new Date();
  return {
    id: "00000000-0000-0000-0000-000000000000",
    singletonKey: "primary",
    legalEntityName: "",
    reportingCurrency: "usd",
    fiscalYearStartMonth: 1,
    ...defaultFinancePolicy,
    taxPolicyReviewedAt: null,
    taxPolicyReviewedBy: null,
    notes: "",
    updatedByClerkId: actorClerkId,
    createdAt: now,
    updatedAt: now,
  };
}

export async function getFinanceSettings(actorClerkId?: string) {
  if (!hasDatabase()) return financeSettingsDefaults(actorClerkId);
  const [settings] = await getDb()
    .select()
    .from(financialSettings)
    .where(eq(financialSettings.singletonKey, "primary"))
    .limit(1);
  return settings ?? financeSettingsDefaults(actorClerkId);
}

export async function loadFinanceDashboard({
  start,
  end,
  actorClerkId,
}: {
  start: Date;
  end: Date;
  actorClerkId?: string;
}) {
  const settings = await getFinanceSettings(actorClerkId);
  if (!hasDatabase()) {
    return emptyDashboard(settings, start, end);
  }

  const db = getDb();
  const [entries, subscriptions, recentEvents, closes] = await Promise.all([
    db
      .select()
      .from(financialLedgerEntries)
      .where(
        and(
          gte(financialLedgerEntries.occurredAt, start),
          lt(financialLedgerEntries.occurredAt, end),
        ),
      )
      .orderBy(desc(financialLedgerEntries.occurredAt)),
    db
      .select({
        id: premiumSubscriptions.id,
        status: premiumSubscriptions.status,
        cancelAtPeriodEnd: premiumSubscriptions.cancelAtPeriodEnd,
        cancelledAt: premiumSubscriptions.cancelledAt,
        priceCents: premiumTiers.priceCents,
        interval: premiumTiers.interval,
      })
      .from(premiumSubscriptions)
      .innerJoin(premiumTiers, eq(premiumSubscriptions.tierId, premiumTiers.id)),
    db
      .select()
      .from(financialProviderEvents)
      .orderBy(desc(financialProviderEvents.receivedAt))
      .limit(100),
    db
      .select()
      .from(financialPeriodCloses)
      .orderBy(desc(financialPeriodCloses.periodEnd))
      .limit(24),
  ]);

  const summary = calculateFinanceSummary(entries, settings);
  const active = subscriptions.filter((subscription) =>
    ["active", "trialing"].includes(subscription.status),
  );
  const mrrCents = active
    .filter((subscription) => subscription.status === "active")
    .reduce(
      (total, subscription) =>
        total +
        monthlyEquivalent(subscription.priceCents, subscription.interval),
      0,
    );
  const monthly = new Map<
    string,
    { month: string; revenueCents: number; expensesCents: number; netCents: number }
  >();
  const categories = new Map<string, number>();
  for (const entry of entries) {
    const month = monthKey(entry.occurredAt);
    const row = monthly.get(month) ?? {
      month,
      revenueCents: 0,
      expensesCents: 0,
      netCents: 0,
    };
    if (["payment", "income"].includes(entry.entryKind)) {
      row.revenueCents += Math.max(0, entry.grossAmountCents);
      categories.set(
        entry.revenueCategory,
        (categories.get(entry.revenueCategory) ?? 0) +
          Math.max(0, entry.grossAmountCents),
      );
    }
    if (["expense", "refund", "dispute", "fee"].includes(entry.entryKind)) {
      row.expensesCents += Math.abs(entry.netAmountCents || entry.grossAmountCents);
    }
    row.netCents += entry.netAmountCents;
    monthly.set(month, row);
  }

  return {
    configured: {
      database: true,
      stripe: hasStripe(),
      reservePolicy:
        Boolean(settings.taxPolicyReviewedAt) &&
        (settings.federalIncomeTaxReserveBps > 0 ||
          settings.stateIncomeTaxReserveBps > 0 ||
          settings.payrollTaxReserveBps > 0),
    },
    period: { start, end },
    settings,
    summary,
    subscriptions: {
      active: active.filter((item) => item.status === "active").length,
      trialing: active.filter((item) => item.status === "trialing").length,
      pastDue: subscriptions.filter((item) =>
        ["past_due", "unpaid", "incomplete"].includes(item.status),
      ).length,
      cancelAtPeriodEnd: active.filter((item) => item.cancelAtPeriodEnd).length,
      canceledInPeriod: subscriptions.filter(
        (item) =>
          item.cancelledAt &&
          item.cancelledAt >= start &&
          item.cancelledAt < end,
      ).length,
      mrrCents,
      arrCents: mrrCents * 12,
    },
    monthly: [...monthly.values()].sort((a, b) =>
      a.month.localeCompare(b.month),
    ),
    revenueByCategory: [...categories.entries()]
      .map(([category, amountCents]) => ({ category, amountCents }))
      .sort((a, b) => b.amountCents - a.amountCents),
    ledger: entries.slice(0, 250),
    reconciliation: {
      recentEvents,
      failedEvents: recentEvents.filter((event) => event.status === "failed")
        .length,
      unreviewedCloses: closes.filter(
        (close) => close.reconciliationStatus === "unreviewed",
      ).length,
      closes,
    },
  };
}

export async function syncStripeBalanceTransactions({
  lookbackDays = 365,
  maxTransactions = 1_000,
}: {
  lookbackDays?: number;
  maxTransactions?: number;
} = {}) {
  if (!hasStripe()) throw new Error("Stripe is not configured");
  if (!hasDatabase()) throw new Error("Postgres is not configured");
  const gteSeconds = Math.floor(
    (Date.now() - Math.min(3_650, Math.max(1, lookbackDays)) * 86_400_000) /
      1_000,
  );
  const iterator = getStripe().balanceTransactions.list({
    created: { gte: gteSeconds },
    limit: 100,
  });
  let examined = 0;
  let inserted = 0;
  let updated = 0;

  for await (const transaction of iterator) {
    if (examined >= maxTransactions) break;
    examined += 1;
    const entryKind = stripeReportingCategoryToEntryKind(
      transaction.reporting_category,
    );
    const providerObjectId =
      typeof transaction.source === "string"
        ? transaction.source
        : transaction.source?.id ?? null;
    const metadata = {
      reportingCategory: transaction.reporting_category,
      providerType: transaction.type,
      exchangeRate: transaction.exchange_rate,
    };
    const [created] = await getDb()
      .insert(financialLedgerEntries)
      .values({
        source: "stripe",
        entryKind,
        revenueCategory: entryKind === "payment" ? "membership" : "other",
        currency: transaction.currency,
        grossAmountCents: transaction.amount,
        feeAmountCents: transaction.fee,
        taxAmountCents: 0,
        netAmountCents: transaction.net,
        status: transaction.status === "available" ? "available" : "pending",
        description:
          transaction.description ??
          `Stripe ${transaction.reporting_category.replaceAll("_", " ")}`,
        providerObjectId,
        providerBalanceTransactionId: transaction.id,
        idempotencyKey: `stripe:balance:${transaction.id}`,
        availableOn: new Date(transaction.available_on * 1_000),
        occurredAt: new Date(transaction.created * 1_000),
        createdByClerkId: "system:stripe-balance-sync",
        metadata,
      })
      .onConflictDoNothing()
      .returning({ id: financialLedgerEntries.id });
    if (created) {
      inserted += 1;
    } else {
      const changed = await getDb()
        .update(financialLedgerEntries)
        .set({
          status:
            transaction.status === "available" ? "available" : "pending",
          availableOn: new Date(transaction.available_on * 1_000),
        })
        .where(
          eq(
            financialLedgerEntries.providerBalanceTransactionId,
            transaction.id,
          ),
        )
        .returning({ id: financialLedgerEntries.id });
      if (changed.length) updated += 1;
    }
  }
  return { examined, inserted, updated, syncedAt: new Date() };
}

function stripeReportingCategoryToEntryKind(
  category: string,
): FinanceEntryKind {
  if (category === "charge") return "payment";
  if (category.includes("refund")) return "refund";
  if (category === "dispute") return "dispute";
  if (category === "dispute_reversal") return "dispute_reversal";
  if (category === "payout") return "payout";
  if (
    category === "fee" ||
    category === "network_cost" ||
    category === "contribution"
  )
    return "fee";
  return "adjustment";
}

function monthlyEquivalent(priceCents: number, interval: string) {
  if (interval === "year") return Math.round(priceCents / 12);
  if (interval === "week") return Math.round((priceCents * 52) / 12);
  if (interval === "day") return Math.round((priceCents * 365) / 12);
  if (interval === "one_time") return 0;
  return priceCents;
}

function emptyDashboard(
  settings: FinanceSettingsRecord,
  start: Date,
  end: Date,
) {
  return {
    configured: { database: false, stripe: hasStripe(), reservePolicy: false },
    period: { start, end },
    settings,
    summary: calculateFinanceSummary([], settings),
    subscriptions: {
      active: 0,
      trialing: 0,
      pastDue: 0,
      cancelAtPeriodEnd: 0,
      canceledInPeriod: 0,
      mrrCents: 0,
      arrCents: 0,
    },
    monthly: [],
    revenueByCategory: financeCategories.map((category) => ({
      category,
      amountCents: 0,
    })),
    ledger: [],
    reconciliation: {
      recentEvents: [],
      failedEvents: 0,
      unreviewedCloses: 0,
      closes: [],
    },
  };
}
