import { FinanceSettingsForm } from "@/components/studio/finance-settings-form";
import { getEmployeeViewer } from "@/lib/employee-auth";
import { getFinanceSettings } from "@/lib/finance";

export default async function FinanceSettingsPage() {
  const viewer = await getEmployeeViewer();
  const settings = await getFinanceSettings(viewer?.id);
  return (
    <div className="space-y-7">
      <header>
        <p className="text-xs font-black uppercase tracking-[0.18em] text-primary">
          Finance governance
        </p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">
          Reporting and reserve policy
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
          Set the business reporting context and adviser-approved cash targets
          used by Studio’s financial control room.
        </p>
      </header>
      <FinanceSettingsForm
        initial={{
          legalEntityName: settings.legalEntityName,
          reportingCurrency: settings.reportingCurrency,
          fiscalYearStartMonth: settings.fiscalYearStartMonth,
          federalIncomeTaxReserveBps: settings.federalIncomeTaxReserveBps,
          stateIncomeTaxReserveBps: settings.stateIncomeTaxReserveBps,
          payrollTaxReserveBps: settings.payrollTaxReserveBps,
          contingencyReserveBps: settings.contingencyReserveBps,
          chargebackReserveBps: settings.chargebackReserveBps,
          operatingReserveMonths: settings.operatingReserveMonths,
          monthlyOperatingBudgetCents: settings.monthlyOperatingBudgetCents,
          targetMonthlyPageViews: settings.targetMonthlyPageViews,
          modeledAdvertisingRpmCents: settings.modeledAdvertisingRpmCents,
          targetPaidMembers: settings.targetPaidMembers,
          modeledMemberRevenueCents: settings.modeledMemberRevenueCents,
          monthlySponsorshipTargetCents:
            settings.monthlySponsorshipTargetCents,
          taxPolicyReviewedAt:
            settings.taxPolicyReviewedAt?.toISOString() ?? null,
          notes: settings.notes,
        }}
      />
    </div>
  );
}
