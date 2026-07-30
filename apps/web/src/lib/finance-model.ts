import { z } from "zod";

export const financeEntryKinds = [
  "payment",
  "refund",
  "dispute",
  "dispute_reversal",
  "fee",
  "payout",
  "tax_payment",
  "expense",
  "income",
  "adjustment",
  "reversal",
] as const;

export const financeCategories = [
  "membership",
  "advertising",
  "sponsorship",
  "events",
  "awards",
  "directory",
  "syndication",
  "payroll",
  "contractors",
  "technology",
  "hosting",
  "insurance",
  "legal",
  "accounting",
  "marketing",
  "travel",
  "equipment",
  "office",
  "tax",
  "other",
] as const;

export type FinanceEntryKind = (typeof financeEntryKinds)[number];
export type FinanceCategory = (typeof financeCategories)[number];

export type FinancePolicy = {
  federalIncomeTaxReserveBps: number;
  stateIncomeTaxReserveBps: number;
  payrollTaxReserveBps: number;
  contingencyReserveBps: number;
  chargebackReserveBps: number;
  operatingReserveMonths: number;
  monthlyOperatingBudgetCents: number;
};

export type FinanceEntry = {
  entryKind: FinanceEntryKind | string;
  revenueCategory: FinanceCategory | string;
  grossAmountCents: number;
  feeAmountCents: number;
  taxAmountCents: number;
  netAmountCents: number;
  status: string;
  occurredAt: Date;
};

export const financeSettingsInput = z.object({
  legalEntityName: z.string().trim().max(180),
  reportingCurrency: z.string().trim().length(3).transform((value) => value.toLowerCase()),
  fiscalYearStartMonth: z.number().int().min(1).max(12),
  federalIncomeTaxReserveBps: z.number().int().min(0).max(10_000),
  stateIncomeTaxReserveBps: z.number().int().min(0).max(10_000),
  payrollTaxReserveBps: z.number().int().min(0).max(10_000),
  contingencyReserveBps: z.number().int().min(0).max(10_000),
  chargebackReserveBps: z.number().int().min(0).max(10_000),
  operatingReserveMonths: z.number().int().min(0).max(36),
  monthlyOperatingBudgetCents: z.number().int().min(0).max(1_000_000_000),
  targetMonthlyPageViews: z.number().int().min(0).max(1_000_000_000),
  modeledAdvertisingRpmCents: z.number().int().min(0).max(1_000_000),
  targetPaidMembers: z.number().int().min(0).max(10_000_000),
  modeledMemberRevenueCents: z.number().int().min(0).max(100_000_000),
  monthlySponsorshipTargetCents: z.number().int().min(0).max(100_000_000_000),
  taxPolicyReviewed: z.boolean(),
  notes: z.string().trim().max(5_000),
});

export function calculateRevenueOpportunity({
  actualGrossRevenueCents,
  periodDays,
  views30d,
  currentMembershipMrrCents,
  targetMonthlyPageViews,
  modeledAdvertisingRpmCents,
  targetPaidMembers,
  modeledMemberRevenueCents,
  monthlySponsorshipTargetCents,
}: {
  actualGrossRevenueCents: number;
  periodDays: number;
  views30d: number;
  currentMembershipMrrCents: number;
  targetMonthlyPageViews: number;
  modeledAdvertisingRpmCents: number;
  targetPaidMembers: number;
  modeledMemberRevenueCents: number;
  monthlySponsorshipTargetCents: number;
}) {
  const normalizedDays = Math.max(1, periodDays);
  const actualMonthlyRunRateCents = Math.round(
    (Math.max(0, actualGrossRevenueCents) / normalizedDays) * 30.4375,
  );
  const currentTrafficAdPotentialCents = Math.round(
    (Math.max(0, views30d) / 1_000) *
      Math.max(0, modeledAdvertisingRpmCents),
  );
  const targetAdvertisingCents = Math.round(
    (Math.max(0, targetMonthlyPageViews) / 1_000) *
      Math.max(0, modeledAdvertisingRpmCents),
  );
  const targetMembershipCents =
    Math.max(0, targetPaidMembers) * Math.max(0, modeledMemberRevenueCents);
  const targetMonthlyRevenueCents =
    targetAdvertisingCents +
    targetMembershipCents +
    Math.max(0, monthlySponsorshipTargetCents);

  return {
    actualMonthlyRunRateCents,
    currentTrafficAdPotentialCents,
    currentMembershipMrrCents: Math.max(0, currentMembershipMrrCents),
    targetAdvertisingCents,
    targetMembershipCents,
    monthlySponsorshipTargetCents: Math.max(
      0,
      monthlySponsorshipTargetCents,
    ),
    targetMonthlyRevenueCents,
    opportunityGapCents: Math.max(
      0,
      targetMonthlyRevenueCents - actualMonthlyRunRateCents,
    ),
    progressPercent: targetMonthlyRevenueCents
      ? Math.min(
          100,
          (actualMonthlyRunRateCents / targetMonthlyRevenueCents) * 100,
        )
      : 0,
  };
}

export const manualFinanceEntryInput = z.object({
  entryKind: z.enum(["expense", "income", "tax_payment", "adjustment"]),
  category: z.enum(financeCategories),
  amountCents: z.number().int().positive().max(1_000_000_000),
  direction: z.enum(["inflow", "outflow"]),
  currency: z.string().trim().length(3).transform((value) => value.toLowerCase()),
  description: z.string().trim().min(3).max(500),
  counterparty: z.string().trim().max(180).optional().default(""),
  occurredAt: z.iso.datetime(),
  confirmation: z.literal("POST TO LEDGER"),
});

export const financeReversalInput = z.object({
  entryId: z.uuid(),
  reason: z.string().trim().min(10).max(500),
  confirmation: z.literal("REVERSE ENTRY"),
});

export function calculateFinanceSummary(
  entries: readonly FinanceEntry[],
  policy: FinancePolicy,
) {
  const posted = entries.filter((entry) =>
    ["posted", "available"].includes(entry.status),
  );
  let grossRevenueCents = 0;
  let refundsCents = 0;
  let disputesCents = 0;
  let disputeRecoveriesCents = 0;
  let processingFeesCents = 0;
  let operatingExpensesCents = 0;
  let payrollExpenseCents = 0;
  let taxCollectedCents = 0;
  let taxPaidCents = 0;
  let adjustmentsCents = 0;
  let payoutsCents = 0;

  for (const entry of posted) {
    if (entry.entryKind === "payment" || entry.entryKind === "income") {
      grossRevenueCents += Math.max(0, entry.grossAmountCents);
      processingFeesCents += Math.max(0, entry.feeAmountCents);
      taxCollectedCents += Math.max(0, entry.taxAmountCents);
    } else if (entry.entryKind === "refund") {
      refundsCents += Math.abs(Math.min(0, entry.grossAmountCents || entry.netAmountCents));
      processingFeesCents += entry.feeAmountCents;
      taxCollectedCents += Math.min(0, entry.taxAmountCents);
    } else if (entry.entryKind === "dispute") {
      disputesCents += Math.abs(Math.min(0, entry.netAmountCents || entry.grossAmountCents));
    } else if (entry.entryKind === "dispute_reversal") {
      disputeRecoveriesCents += Math.max(0, entry.netAmountCents);
    } else if (entry.entryKind === "fee") {
      processingFeesCents += Math.abs(entry.netAmountCents || entry.grossAmountCents);
    } else if (entry.entryKind === "expense") {
      const expense = Math.abs(entry.netAmountCents || entry.grossAmountCents);
      operatingExpensesCents += expense;
      if (entry.revenueCategory === "payroll") payrollExpenseCents += expense;
    } else if (entry.entryKind === "tax_payment") {
      taxPaidCents += Math.abs(entry.netAmountCents || entry.grossAmountCents);
    } else if (entry.entryKind === "payout") {
      payoutsCents += Math.abs(entry.netAmountCents || entry.grossAmountCents);
    } else if (entry.entryKind === "adjustment" || entry.entryKind === "reversal") {
      adjustmentsCents += entry.netAmountCents;
    }
  }

  const salesTaxPayableCents = Math.max(0, taxCollectedCents - taxPaidCents);
  const netRevenueCents =
    grossRevenueCents -
    refundsCents -
    disputesCents +
    disputeRecoveriesCents -
    Math.max(0, processingFeesCents) -
    Math.max(0, taxCollectedCents) +
    adjustmentsCents;
  const operatingProfitCents = netRevenueCents - operatingExpensesCents;
  const positiveProfit = Math.max(0, operatingProfitCents);
  const federalIncomeTaxReserveCents = basisPoints(
    positiveProfit,
    policy.federalIncomeTaxReserveBps,
  );
  const stateIncomeTaxReserveCents = basisPoints(
    positiveProfit,
    policy.stateIncomeTaxReserveBps,
  );
  const payrollTaxReserveCents = basisPoints(
    payrollExpenseCents,
    policy.payrollTaxReserveBps,
  );
  const contingencyReserveCents = basisPoints(
    grossRevenueCents,
    policy.contingencyReserveBps,
  );
  const chargebackReserveCents = basisPoints(
    grossRevenueCents,
    policy.chargebackReserveBps,
  );
  const operatingReserveTargetCents =
    policy.monthlyOperatingBudgetCents * policy.operatingReserveMonths;
  const totalPlannedReservesCents =
    salesTaxPayableCents +
    federalIncomeTaxReserveCents +
    stateIncomeTaxReserveCents +
    payrollTaxReserveCents +
    contingencyReserveCents +
    chargebackReserveCents +
    operatingReserveTargetCents;

  return {
    grossRevenueCents,
    refundsCents,
    disputesCents,
    disputeRecoveriesCents,
    processingFeesCents: Math.max(0, processingFeesCents),
    operatingExpensesCents,
    payrollExpenseCents,
    taxCollectedCents: Math.max(0, taxCollectedCents),
    taxPaidCents,
    salesTaxPayableCents,
    netRevenueCents,
    operatingProfitCents,
    payoutsCents,
    reserves: {
      federalIncomeTaxReserveCents,
      stateIncomeTaxReserveCents,
      payrollTaxReserveCents,
      contingencyReserveCents,
      chargebackReserveCents,
      operatingReserveTargetCents,
      totalPlannedReservesCents,
      unallocatedProfitAfterReservesCents: Math.max(
        0,
        operatingProfitCents - totalPlannedReservesCents,
      ),
    },
  };
}

export function basisPoints(amountCents: number, rateBps: number) {
  return Math.round((amountCents * rateBps) / 10_000);
}

export function monthKey(date: Date, timeZone = "America/New_York") {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
  }).formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  return `${year}-${month}`;
}
