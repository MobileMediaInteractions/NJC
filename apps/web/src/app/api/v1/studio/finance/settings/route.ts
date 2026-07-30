import { NextResponse } from "next/server";
import { getDb, hasDatabase } from "@harborline/backend/db";
import { financialSettings } from "@harborline/backend/schema";
import { requireEmployeeCapability, writeEmployeeAudit } from "@/lib/employee-auth";
import { financeSettingsInput } from "@/lib/finance-model";
import { getFinanceSettings } from "@/lib/finance";

export const dynamic = "force-dynamic";

export async function GET() {
  const viewer = await requireEmployeeCapability("tools:finance");
  if (!viewer) return error("forbidden", "Finance permission is required", 403);
  return NextResponse.json(
    { data: await getFinanceSettings(viewer.id), meta: { apiVersion: "1" } },
    { headers: privateHeaders() },
  );
}

export async function PATCH(request: Request) {
  const viewer = await requireEmployeeCapability("tools:finance");
  if (!viewer) return error("forbidden", "Finance permission is required", 403);
  if (!hasDatabase()) return error("service_not_configured", "Postgres is required", 503);
  const parsed = financeSettingsInput.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: {
          code: "invalid_request",
          message: "Review the reserve and reporting policy",
          details: parsed.error.flatten(),
        },
      },
      { status: 400, headers: privateHeaders() },
    );
  }

  const value = parsed.data;
  const now = new Date();
  const [settings] = await getDb()
    .insert(financialSettings)
    .values({
      singletonKey: "primary",
      legalEntityName: value.legalEntityName,
      reportingCurrency: value.reportingCurrency,
      fiscalYearStartMonth: value.fiscalYearStartMonth,
      federalIncomeTaxReserveBps: value.federalIncomeTaxReserveBps,
      stateIncomeTaxReserveBps: value.stateIncomeTaxReserveBps,
      payrollTaxReserveBps: value.payrollTaxReserveBps,
      contingencyReserveBps: value.contingencyReserveBps,
      chargebackReserveBps: value.chargebackReserveBps,
      operatingReserveMonths: value.operatingReserveMonths,
      monthlyOperatingBudgetCents: value.monthlyOperatingBudgetCents,
      targetMonthlyPageViews: value.targetMonthlyPageViews,
      modeledAdvertisingRpmCents: value.modeledAdvertisingRpmCents,
      targetPaidMembers: value.targetPaidMembers,
      modeledMemberRevenueCents: value.modeledMemberRevenueCents,
      monthlySponsorshipTargetCents: value.monthlySponsorshipTargetCents,
      taxPolicyReviewedAt: value.taxPolicyReviewed ? now : null,
      taxPolicyReviewedBy: value.taxPolicyReviewed ? viewer.id : null,
      notes: value.notes,
      updatedByClerkId: viewer.id,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: financialSettings.singletonKey,
      set: {
        legalEntityName: value.legalEntityName,
        reportingCurrency: value.reportingCurrency,
        fiscalYearStartMonth: value.fiscalYearStartMonth,
        federalIncomeTaxReserveBps: value.federalIncomeTaxReserveBps,
        stateIncomeTaxReserveBps: value.stateIncomeTaxReserveBps,
        payrollTaxReserveBps: value.payrollTaxReserveBps,
        contingencyReserveBps: value.contingencyReserveBps,
        chargebackReserveBps: value.chargebackReserveBps,
        operatingReserveMonths: value.operatingReserveMonths,
        monthlyOperatingBudgetCents: value.monthlyOperatingBudgetCents,
        targetMonthlyPageViews: value.targetMonthlyPageViews,
        modeledAdvertisingRpmCents: value.modeledAdvertisingRpmCents,
        targetPaidMembers: value.targetPaidMembers,
        modeledMemberRevenueCents: value.modeledMemberRevenueCents,
        monthlySponsorshipTargetCents: value.monthlySponsorshipTargetCents,
        taxPolicyReviewedAt: value.taxPolicyReviewed ? now : null,
        taxPolicyReviewedBy: value.taxPolicyReviewed ? viewer.id : null,
        notes: value.notes,
        updatedByClerkId: viewer.id,
        updatedAt: now,
      },
    })
    .returning();

  await writeEmployeeAudit(
    request,
    viewer,
    "finance.reserve_policy.updated",
    { type: "financial_settings", id: settings.id },
    {
      reportingCurrency: settings.reportingCurrency,
      fiscalYearStartMonth: settings.fiscalYearStartMonth,
      taxPolicyReviewed: Boolean(settings.taxPolicyReviewedAt),
    },
  );
  return NextResponse.json(
    { data: settings, meta: { apiVersion: "1" } },
    { headers: privateHeaders() },
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
