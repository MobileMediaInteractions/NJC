import assert from "node:assert/strict";
import test from "node:test";
import {
  basisPoints,
  calculateFinanceSummary,
  financeSettingsInput,
  manualFinanceEntryInput,
} from "../src/lib/finance-model";

const occurredAt = new Date("2026-07-30T12:00:00.000Z");

test("finance summary separates revenue, tax liability, fees and operating expense", () => {
  const summary = calculateFinanceSummary(
    [
      entry("payment", "membership", 10_662, 362, 662, 9_638),
      entry("refund", "membership", -2_132, 0, -132, -2_000),
      entry("expense", "hosting", -800, 0, 0, -800),
      entry("tax_payment", "tax", -300, 0, 0, -300),
      entry("payout", "other", -7_000, 0, 0, -7_000),
    ],
    {
      federalIncomeTaxReserveBps: 2_000,
      stateIncomeTaxReserveBps: 900,
      payrollTaxReserveBps: 0,
      contingencyReserveBps: 200,
      chargebackReserveBps: 300,
      operatingReserveMonths: 3,
      monthlyOperatingBudgetCents: 1_000,
    },
  );

  assert.equal(summary.grossRevenueCents, 10_662);
  assert.equal(summary.refundsCents, 2_132);
  assert.equal(summary.processingFeesCents, 362);
  assert.equal(summary.salesTaxPayableCents, 230);
  assert.equal(summary.operatingExpensesCents, 800);
  assert.equal(summary.payoutsCents, 7_000);
  assert.equal(summary.netRevenueCents, 7_638);
  assert.equal(summary.operatingProfitCents, 6_838);
  assert.equal(summary.reserves.operatingReserveTargetCents, 3_000);
});

test("finance reserve estimates default to zero instead of inventing tax rates", () => {
  const summary = calculateFinanceSummary(
    [entry("income", "advertising", 50_000, 0, 0, 50_000)],
    {
      federalIncomeTaxReserveBps: 0,
      stateIncomeTaxReserveBps: 0,
      payrollTaxReserveBps: 0,
      contingencyReserveBps: 0,
      chargebackReserveBps: 0,
      operatingReserveMonths: 0,
      monthlyOperatingBudgetCents: 0,
    },
  );
  assert.equal(summary.reserves.totalPlannedReservesCents, 0);
  assert.equal(summary.reserves.unallocatedProfitAfterReservesCents, 50_000);
});

test("basis-point math preserves cents without floating point policy drift", () => {
  assert.equal(basisPoints(123_45, 725), 895);
});

test("manual ledger input requires exact confirmation and controlled categories", () => {
  const valid = manualFinanceEntryInput.safeParse({
    entryKind: "expense",
    category: "accounting",
    amountCents: 25_000,
    direction: "outflow",
    currency: "USD",
    description: "Quarterly bookkeeping review",
    counterparty: "CPA firm",
    occurredAt: "2026-07-30T12:00:00.000Z",
    confirmation: "POST TO LEDGER",
  });
  assert.equal(valid.success, true);
  assert.equal(
    manualFinanceEntryInput.safeParse({
      ...valid.data,
      category: "made_up_account",
      confirmation: "yes",
    }).success,
    false,
  );
});

test("reviewed finance settings reject impossible reserve percentages", () => {
  assert.equal(
    financeSettingsInput.safeParse({
      legalEntityName: "Courier LLC",
      reportingCurrency: "USD",
      fiscalYearStartMonth: 1,
      federalIncomeTaxReserveBps: 10_001,
      stateIncomeTaxReserveBps: 0,
      payrollTaxReserveBps: 0,
      contingencyReserveBps: 0,
      chargebackReserveBps: 0,
      operatingReserveMonths: 3,
      monthlyOperatingBudgetCents: 100_000,
      taxPolicyReviewed: true,
      notes: "",
    }).success,
    false,
  );
});

function entry(
  entryKind: string,
  revenueCategory: string,
  grossAmountCents: number,
  feeAmountCents: number,
  taxAmountCents: number,
  netAmountCents: number,
) {
  return {
    entryKind,
    revenueCategory,
    grossAmountCents,
    feeAmountCents,
    taxAmountCents,
    netAmountCents,
    status: "available",
    occurredAt,
  };
}
