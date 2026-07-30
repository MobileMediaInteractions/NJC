"use client";

import { useState, useTransition } from "react";
import { AlertTriangle, ExternalLink, Save, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

type FinanceSettingsValue = {
  legalEntityName: string;
  reportingCurrency: string;
  fiscalYearStartMonth: number;
  federalIncomeTaxReserveBps: number;
  stateIncomeTaxReserveBps: number;
  payrollTaxReserveBps: number;
  contingencyReserveBps: number;
  chargebackReserveBps: number;
  operatingReserveMonths: number;
  monthlyOperatingBudgetCents: number;
  targetMonthlyPageViews: number;
  modeledAdvertisingRpmCents: number;
  targetPaidMembers: number;
  modeledMemberRevenueCents: number;
  monthlySponsorshipTargetCents: number;
  taxPolicyReviewedAt: string | null;
  notes: string;
};

export function FinanceSettingsForm({
  initial,
}: {
  initial: FinanceSettingsValue;
}) {
  const [value, setValue] = useState(initial);
  const [reviewed, setReviewed] = useState(Boolean(initial.taxPolicyReviewedAt));
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();

  function save() {
    setMessage("");
    startTransition(async () => {
      const response = await fetch("/api/v1/studio/finance/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...value,
          taxPolicyReviewed: reviewed,
        }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        setMessage(
          payload?.error?.message ?? "The finance policy could not be saved.",
        );
        return;
      }
      setMessage("Finance and reserve policy saved with an audit record.");
    });
  }

  function applyNewJerseyStarter() {
    setValue((current) => ({
      ...current,
      legalEntityName:
        current.legalEntityName ||
        "The New Jersey Courier — working reporting identity (legal entity unverified)",
      federalIncomeTaxReserveBps: 0,
      stateIncomeTaxReserveBps: 0,
      payrollTaxReserveBps: 0,
      contingencyReserveBps: 500,
      chargebackReserveBps: 200,
      operatingReserveMonths: 3,
      targetMonthlyPageViews: current.targetMonthlyPageViews || 100_000,
      modeledAdvertisingRpmCents:
        current.modeledAdvertisingRpmCents || 800,
      targetPaidMembers: current.targetPaidMembers || 250,
      modeledMemberRevenueCents:
        current.modeledMemberRevenueCents || 999,
      notes:
        "UNREVIEWED NEW JERSEY STARTER POLICY\n" +
        "Confirm the registered legal entity, federal tax classification, NJ-REG status, employer status and whether each NJC+ offering qualifies as an exempt newspaper or periodical before entering tax reserve rates. New Jersey corporation tax rates vary by entity and taxable income; payroll withholding and employer contributions vary by workforce facts. Publication exemptions do not automatically cover every premium product, event, advertisement or service.\n" +
        "Official references: NJ Division of Revenue business registration; NJ Division of Taxation corporation filing responsibilities; NJ ANJ-21 newspapers and periodicals; NJ employer payroll tax; IRS business taxes and estimated taxes.",
    }));
    setReviewed(false);
    setMessage(
      "Unreviewed New Jersey starter assumptions loaded. Review and save only after confirming the legal entity.",
    );
  }

  return (
    <div className="space-y-6">
      <Card className="border-amber-500/45 bg-amber-500/5">
        <CardHeader className="flex-row items-start gap-3">
          <AlertTriangle className="mt-0.5 size-5 text-amber-600" />
          <div>
            <CardTitle>Planning policy—not tax advice</CardTitle>
            <CardDescription className="mt-1 leading-6">
              These rates create internal cash-reserve targets. They do not
              calculate a return, determine filing status, or replace advice
              based on the Courier’s legal entity, payroll and registrations.
              Keep “professionally reviewed” off until a qualified adviser has
              approved the values.
            </CardDescription>
          </div>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader className="flex-row items-start justify-between gap-5">
          <div>
            <CardTitle>New Jersey newsroom starter</CardTitle>
            <CardDescription className="mt-1 leading-6">
              Loads a clearly unverified reporting identity, operating-risk
              reserves and an official-source checklist. Entity-dependent
              income and payroll tax rates remain zero until a qualified
              adviser confirms them.
            </CardDescription>
          </div>
          <Button type="button" variant="outline" onClick={applyNewJerseyStarter}>
            <Sparkles /> Apply starter
          </Button>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm md:grid-cols-2">
          <SourceLink
            href="https://www.nj.gov/treasury/revenue/gettingregistered.shtml"
            label="NJ business formation and NJ-REG"
          />
          <SourceLink
            href="https://www.nj.gov/treasury/taxation/ot4.shtml"
            label="NJ corporation filing responsibilities"
          />
          <SourceLink
            href="https://www.nj.gov/treasury/taxation/pdf/pubs/sales/anj21.pdf"
            label="NJ newspaper and periodical sales-tax guidance"
          />
          <SourceLink
            href="https://nj.gov/treasury/taxation/businesses/payroll/index.shtml"
            label="NJ employer payroll tax"
          />
          <SourceLink
            href="https://www.irs.gov/businesses/business-taxes"
            label="IRS business-tax categories"
          />
          <SourceLink
            href="https://www.irs.gov/businesses/small-businesses-self-employed/estimated-taxes"
            label="IRS estimated-tax guidance"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Reporting identity</CardTitle>
          <CardDescription>
            The legal and fiscal context shown on internal finance reports.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-5 md:grid-cols-3">
          <Field label="Legal entity name" className="md:col-span-2">
            <Input
              value={value.legalEntityName}
              onChange={(event) =>
                setValue({ ...value, legalEntityName: event.target.value })
              }
              placeholder="Enter the registered business name"
            />
          </Field>
          <Field label="Reporting currency">
            <select
              className="h-10 w-full rounded-md border bg-background px-3 text-sm"
              value={value.reportingCurrency}
              onChange={(event) =>
                setValue({ ...value, reportingCurrency: event.target.value })
              }
            >
              <option value="usd">USD — US dollar</option>
            </select>
          </Field>
          <Field label="Fiscal year begins">
            <select
              className="h-10 w-full rounded-md border bg-background px-3 text-sm"
              value={value.fiscalYearStartMonth}
              onChange={(event) =>
                setValue({
                  ...value,
                  fiscalYearStartMonth: Number(event.target.value),
                })
              }
            >
              {[
                "January",
                "February",
                "March",
                "April",
                "May",
                "June",
                "July",
                "August",
                "September",
                "October",
                "November",
                "December",
              ].map((month, index) => (
                <option key={month} value={index + 1}>
                  {month}
                </option>
              ))}
            </select>
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Revenue opportunity assumptions</CardTitle>
          <CardDescription>
            Planning inputs for the Finance comparison. These are scenarios,
            not promises or recognized revenue.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          <Field label="Target monthly page views">
            <Input
              type="number"
              min="0"
              step="1000"
              value={value.targetMonthlyPageViews}
              onChange={(event) =>
                setValue({
                  ...value,
                  targetMonthlyPageViews: Number(event.target.value || 0),
                })
              }
            />
          </Field>
          <Field label="Modeled advertising RPM">
            <Input
              type="number"
              min="0"
              step="0.01"
              value={(value.modeledAdvertisingRpmCents / 100).toString()}
              onChange={(event) =>
                setValue({
                  ...value,
                  modeledAdvertisingRpmCents: Math.round(
                    Number(event.target.value || 0) * 100,
                  ),
                })
              }
            />
          </Field>
          <Field label="Target paid members">
            <Input
              type="number"
              min="0"
              step="1"
              value={value.targetPaidMembers}
              onChange={(event) =>
                setValue({
                  ...value,
                  targetPaidMembers: Number(event.target.value || 0),
                })
              }
            />
          </Field>
          <Field label="Modeled monthly revenue per member">
            <Input
              type="number"
              min="0"
              step="0.01"
              value={(value.modeledMemberRevenueCents / 100).toString()}
              onChange={(event) =>
                setValue({
                  ...value,
                  modeledMemberRevenueCents: Math.round(
                    Number(event.target.value || 0) * 100,
                  ),
                })
              }
            />
          </Field>
          <Field label="Monthly sponsorship target">
            <Input
              type="number"
              min="0"
              step="0.01"
              value={(value.monthlySponsorshipTargetCents / 100).toString()}
              onChange={(event) =>
                setValue({
                  ...value,
                  monthlySponsorshipTargetCents: Math.round(
                    Number(event.target.value || 0) * 100,
                  ),
                })
              }
            />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Cash set-aside policy</CardTitle>
          <CardDescription>
            Percentage fields are stored precisely as basis points. Zero means
            no estimate will be presented for that line.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          <RateField label="Federal income-tax reserve" field="federalIncomeTaxReserveBps" value={value} setValue={setValue} />
          <RateField label="New Jersey income-tax reserve" field="stateIncomeTaxReserveBps" value={value} setValue={setValue} />
          <RateField label="Payroll-tax reserve" field="payrollTaxReserveBps" value={value} setValue={setValue} />
          <RateField label="Refund and chargeback reserve" field="chargebackReserveBps" value={value} setValue={setValue} />
          <RateField label="Contingency reserve" field="contingencyReserveBps" value={value} setValue={setValue} />
          <Field label="Monthly operating budget">
            <Input
              type="number"
              min="0"
              step="0.01"
              value={(value.monthlyOperatingBudgetCents / 100).toString()}
              onChange={(event) =>
                setValue({
                  ...value,
                  monthlyOperatingBudgetCents: Math.round(
                    Number(event.target.value || 0) * 100,
                  ),
                })
              }
            />
          </Field>
          <Field label="Operating reserve target">
            <select
              className="h-10 w-full rounded-md border bg-background px-3 text-sm"
              value={value.operatingReserveMonths}
              onChange={(event) =>
                setValue({
                  ...value,
                  operatingReserveMonths: Number(event.target.value),
                })
              }
            >
              {[0, 1, 2, 3, 4, 5, 6, 9, 12, 18, 24].map((months) => (
                <option key={months} value={months}>
                  {months === 0 ? "Not configured" : `${months} months`}
                </option>
              ))}
            </select>
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Review evidence</CardTitle>
          <CardDescription>
            Record policy context without placing tax IDs, bank details,
            credentials or other secrets in this field.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <Textarea
            rows={5}
            value={value.notes}
            onChange={(event) => setValue({ ...value, notes: event.target.value })}
            placeholder="Policy owner, review cadence and approved assumptions"
          />
          <div className="flex items-center justify-between gap-5 rounded-lg border p-4">
            <div>
              <Label htmlFor="finance-reviewed">
                Professionally reviewed policy
              </Label>
              <p className="mt-1 text-xs text-muted-foreground">
                Saving while enabled records the current Studio account and
                time as the reviewer.
              </p>
            </div>
            <Switch
              id="finance-reviewed"
              checked={reviewed}
              onCheckedChange={setReviewed}
            />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p
              className={`text-sm ${message.includes("could not") ? "text-destructive" : "text-muted-foreground"}`}
              role="status"
            >
              {message}
            </p>
            <Button type="button" onClick={save} disabled={pending}>
              <Save />
              {pending ? "Saving…" : "Save finance policy"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function SourceLink({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="flex items-center justify-between gap-3 rounded-lg border p-3 font-medium transition-colors hover:bg-muted"
    >
      {label}
      <ExternalLink className="size-4 shrink-0 text-muted-foreground" />
    </a>
  );
}

function Field({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Label className={`block ${className ?? ""}`}>
      <span className="mb-2 block">{label}</span>
      {children}
    </Label>
  );
}

function RateField({
  label,
  field,
  value,
  setValue,
}: {
  label: string;
  field:
    | "federalIncomeTaxReserveBps"
    | "stateIncomeTaxReserveBps"
    | "payrollTaxReserveBps"
    | "contingencyReserveBps"
    | "chargebackReserveBps";
  value: FinanceSettingsValue;
  setValue: (value: FinanceSettingsValue) => void;
}) {
  return (
    <Field label={label}>
      <div className="relative">
        <Input
          type="number"
          min="0"
          max="100"
          step="0.01"
          className="pr-9"
          value={(value[field] / 100).toString()}
          onChange={(event) =>
            setValue({
              ...value,
              [field]: Math.round(Number(event.target.value || 0) * 100),
            })
          }
        />
        <span className="pointer-events-none absolute right-3 top-2.5 text-sm text-muted-foreground">
          %
        </span>
      </div>
    </Field>
  );
}
