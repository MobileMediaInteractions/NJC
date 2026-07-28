"use client";

import { useState } from "react";
import { CheckCircle2, LoaderCircle, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function TwentyUnderTwentyForm({
  kind,
  year,
}: {
  kind: "educator_nomination" | "student_application";
  year: number;
}) {
  const educator = kind === "educator_nomination";
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [receipt, setReceipt] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    const form = new FormData(event.currentTarget);
    const value = (name: string) => String(form.get(name) ?? "").trim();
    const payload = {
      kind,
      studentFirstName: value("studentFirstName"),
      studentLastName: value("studentLastName"),
      studentEmail: value("studentEmail"),
      birthDate: value("birthDate"),
      school: value("school"),
      grade: value("grade"),
      city: value("city"),
      county: value("county"),
      educatorName: value("educatorName"),
      educatorEmail: value("educatorEmail"),
      educatorTitle: value("educatorTitle"),
      relationship: value("relationship"),
      communityImpact: value("communityImpact"),
      serviceSummary: value("serviceSummary"),
      futureGoals: value("futureGoals"),
      supportingLinks: value("supportingLinks").split(/\s+/).filter(Boolean),
      guardianName: value("guardianName"),
      guardianEmail: value("guardianEmail"),
      educatorAttested: educator ? form.get("attested") === "on" : false,
      applicantAttested: educator ? false : form.get("attested") === "on",
      publicationConsent: form.get("publicationConsent") === "on",
      website: value("website"),
    };

    try {
      const response = await fetch("/api/v1/20-under-20/submissions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error?.message ?? "The submission could not be received.");
      setReceipt(result.data.receiptCode);
      event.currentTarget.reset();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The submission could not be received.");
    } finally {
      setBusy(false);
    }
  }

  if (receipt) {
    return (
      <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-6" role="status">
        <CheckCircle2 className="size-8 text-emerald-600" />
        <h3 className="mt-4 text-2xl font-black text-brand-navy dark:text-foreground">Submission received</h3>
        <p className="mt-3 leading-7 text-muted-foreground">
          Save this receipt code. It confirms receipt but does not indicate
          eligibility, finalist status, or selection.
        </p>
        <code className="mt-4 block w-fit rounded bg-background px-4 py-3 font-bold">{receipt}</code>
      </div>
    );
  }

  return (
    <form className="space-y-8" onSubmit={(event) => void submit(event)}>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Student first name"><Input name="studentFirstName" required minLength={2} maxLength={80} /></Field>
        <Field label="Student last name"><Input name="studentLastName" required minLength={2} maxLength={80} /></Field>
        <Field label="Student email"><Input name="studentEmail" type="email" required /></Field>
        <Field label="Date of birth"><Input name="birthDate" type="date" required /></Field>
        <Field label="School"><Input name="school" required maxLength={180} /></Field>
        <Field label="Grade"><Input name="grade" required maxLength={30} placeholder="For example: 11" /></Field>
        <Field label="City"><Input name="city" required maxLength={100} /></Field>
        <Field label="County"><Input name="county" required maxLength={100} placeholder="For example: Middlesex" /></Field>
      </div>

      <div className="border-t pt-8">
        <h3 className="text-xl font-black text-brand-navy dark:text-foreground">
          {educator ? "Educator sponsor" : "Educator reference (optional)"}
        </h3>
        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <Field label="Educator name"><Input name="educatorName" required={educator} maxLength={120} /></Field>
          <Field label="Educator email"><Input name="educatorEmail" type="email" required={educator} /></Field>
          <Field label="Title / role"><Input name="educatorTitle" required={educator} maxLength={120} /></Field>
          <Field label="Relationship to student"><Input name="relationship" required={educator} minLength={educator ? 10 : undefined} maxLength={500} /></Field>
        </div>
      </div>

      <div className="space-y-5 border-t pt-8">
        <Field label="Community impact">
          <Textarea name="communityImpact" required minLength={50} maxLength={5_000} rows={7} placeholder="Describe the community need, the student’s role, and the demonstrated impact." />
        </Field>
        <Field label="Service and leadership">
          <Textarea name="serviceSummary" required minLength={50} maxLength={5_000} rows={7} placeholder="Describe sustained service, leadership, initiative, and collaboration." />
        </Field>
        <Field label="Future goals">
          <Textarea name="futureGoals" required minLength={30} maxLength={3_000} rows={5} placeholder="What does the student hope to contribute next?" />
        </Field>
        <Field label="Supporting links (optional, one URL per line)">
          <Textarea name="supportingLinks" rows={4} placeholder={"https://school.example/story\nhttps://organization.example/project"} />
        </Field>
      </div>

      <div className="grid gap-5 border-t pt-8 sm:grid-cols-2">
        <Field label="Parent or guardian name (required when the student is under 18)">
          <Input name="guardianName" maxLength={120} />
        </Field>
        <Field label="Parent or guardian email (required when the student is under 18)">
          <Input name="guardianEmail" type="email" />
        </Field>
      </div>

      <div className="space-y-4 rounded-xl border bg-muted/20 p-5">
        <label className="flex items-start gap-3 text-sm leading-6">
          <input className="mt-1 size-4" name="attested" type="checkbox" required />
          <span>
            I certify that the information is accurate and that I am authorized
            to submit it for the {year} program.
          </span>
        </label>
        <label className="flex items-start gap-3 text-sm leading-6">
          <input className="mt-1 size-4" name="publicationConsent" type="checkbox" required />
          <span>
            I consent to The New Jersey Courier contacting the listed people
            and, only if selected, publishing an editor-approved honoree profile.
          </span>
        </label>
        <p className="text-xs leading-5 text-muted-foreground">
          Do not submit Social Security numbers, student ID numbers, medical
          records, financial records, private academic records, or other
          unnecessary sensitive documents. Contact and birth-date information
          is restricted to the review team and is never included in the public profile.
        </p>
      </div>

      <div className="absolute -left-[10000px]" aria-hidden="true">
        <Label htmlFor={`${kind}-website`}>Website</Label>
        <Input id={`${kind}-website`} name="website" tabIndex={-1} autoComplete="off" />
      </div>

      <Button type="submit" size="lg" disabled={busy}>
        {busy ? <LoaderCircle className="animate-spin" /> : <Send />}
        Submit {educator ? "nomination" : "application"}
      </Button>
      {message ? <p className="text-sm text-destructive" role="alert">{message}</p> : null}
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-2"><Label>{label}</Label>{children}</div>;
}
