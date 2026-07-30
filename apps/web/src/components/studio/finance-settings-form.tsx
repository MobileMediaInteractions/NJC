"use client";

import { useState, useTransition } from "react";
import { AlertTriangle, Save } from "lucide-react";
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
