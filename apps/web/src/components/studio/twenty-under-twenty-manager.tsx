"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Award,
  CheckCircle2,
  LoaderCircle,
  Save,
  ShieldCheck,
  UsersRound,
} from "lucide-react";
import type {
  twentyUnderTwentyPrograms,
  twentyUnderTwentySubmissions,
} from "@harborline/backend/schema";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  programStatuses,
  submissionStatuses,
} from "@/lib/twenty-under-twenty";

type ProgramRecord = typeof twentyUnderTwentyPrograms.$inferSelect;
type SubmissionRecord = typeof twentyUnderTwentySubmissions.$inferSelect;

export function TwentyUnderTwentyManager({
  initialProgram,
  previousPrograms,
  initialSubmissions,
  canConfigure,
}: {
  initialProgram: ProgramRecord | null;
  previousPrograms: Array<{ id: string; year: number; status: string }>;
  initialSubmissions: SubmissionRecord[];
  canConfigure: boolean;
}) {
  const router = useRouter();
  const [program, setProgram] = useState(() => programForm(initialProgram));
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const counts = {
    all: initialSubmissions.length,
    nominations: initialSubmissions.filter((item) => item.kind === "educator_nomination").length,
    applications: initialSubmissions.filter((item) => item.kind === "student_application").length,
    finalists: initialSubmissions.filter((item) => ["finalist", "selected"].includes(item.status)).length,
    selected: initialSubmissions.filter((item) => item.status === "selected").length,
  };

  async function saveProgram() {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/v1/studio/20-under-20/programs", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...program,
          nominationOpensAt: toIso(program.nominationOpensAt),
          nominationClosesAt: toIso(program.nominationClosesAt),
          applicationOpensAt: toIso(program.applicationOpensAt),
          applicationClosesAt: toIso(program.applicationClosesAt),
          eventAt: toIso(program.eventAt),
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error?.message ?? "Program settings could not be saved.");
      setMessage("Program settings saved.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Program settings could not be saved.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <CardTitle>Annual program control</CardTitle>
              <CardDescription>
                The selected stage controls what the public page accepts. Dates
                provide a second server-side gate; both must permit intake.
              </CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">
                {previousPrograms.length
                  ? `${previousPrograms.length} prior program${previousPrograms.length === 1 ? "" : "s"} in the database`
                  : "First configured year"}
              </Badge>
              {canConfigure && initialProgram ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setProgram(programForm(null, initialProgram.year + 1))}
                >
                  Start next year
                </Button>
              ) : null}
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          <Field label="Program year">
            <Input
              type="number"
              min={2026}
              max={2200}
              value={program.year}
              disabled={!canConfigure}
              onChange={(event) => setProgram({ ...program, year: Number(event.target.value) })}
            />
          </Field>
          <Field label="Public stage">
            <Select
              value={program.status}
              disabled={!canConfigure}
              onValueChange={(status) => setProgram({ ...program, status })}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {programStatuses.map((status) => (
                  <SelectItem key={status} value={status}>
                    {status.replaceAll("_", " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Age limit">
            <Input
              type="number"
              min={13}
              max={25}
              value={program.ageLimit}
              disabled={!canConfigure}
              onChange={(event) => setProgram({ ...program, ageLimit: Number(event.target.value) })}
            />
          </Field>
          <Field label="Class size">
            <Input
              type="number"
              min={1}
              max={100}
              value={program.classSize}
              disabled={!canConfigure}
              onChange={(event) => setProgram({ ...program, classSize: Number(event.target.value) })}
            />
          </Field>
          <Field label="Public title" className="sm:col-span-2">
            <Input value={program.title} disabled={!canConfigure} onChange={(event) => setProgram({ ...program, title: event.target.value })} />
          </Field>
          <Field label="Eligibility summary" className="sm:col-span-2">
            <Input value={program.eligibilitySummary} disabled={!canConfigure} onChange={(event) => setProgram({ ...program, eligibilitySummary: event.target.value })} />
          </Field>
          <Field label="Program description" className="sm:col-span-2 xl:col-span-4">
            <Textarea rows={3} value={program.description} disabled={!canConfigure} onChange={(event) => setProgram({ ...program, description: event.target.value })} />
          </Field>
          <DateField label="Nominations open" value={program.nominationOpensAt} disabled={!canConfigure} onChange={(value) => setProgram({ ...program, nominationOpensAt: value })} />
          <DateField label="Nominations close" value={program.nominationClosesAt} disabled={!canConfigure} onChange={(value) => setProgram({ ...program, nominationClosesAt: value })} />
          <DateField label="Applications open" value={program.applicationOpensAt} disabled={!canConfigure} onChange={(value) => setProgram({ ...program, applicationOpensAt: value })} />
          <DateField label="Applications close" value={program.applicationClosesAt} disabled={!canConfigure} onChange={(value) => setProgram({ ...program, applicationClosesAt: value })} />
          <DateField label="Recognition event" value={program.eventAt} disabled={!canConfigure} onChange={(value) => setProgram({ ...program, eventAt: value })} />
          <Field label="Event location">
            <Input value={program.eventLocation ?? ""} disabled={!canConfigure} onChange={(event) => setProgram({ ...program, eventLocation: event.target.value || null })} />
          </Field>
          <Field label="Keynote speaker">
            <Input value={program.keynoteSpeaker ?? ""} disabled={!canConfigure} onChange={(event) => setProgram({ ...program, keynoteSpeaker: event.target.value || null })} />
          </Field>
          <div className="flex items-end">
            <Button className="w-full" disabled={!canConfigure || busy} onClick={() => void saveProgram()}>
              {busy ? <LoaderCircle className="animate-spin" /> : <Save />} {program.id ? "Save program" : "Create program"}
            </Button>
          </div>
          {message ? <p className="sm:col-span-2 xl:col-span-4 text-sm" role="status">{message}</p> : null}
          {!canConfigure ? (
            <p className="sm:col-span-2 xl:col-span-4 text-xs text-muted-foreground">
              Editors can review candidates. An administrator must change
              program dates, limits, event details and the public stage.
            </p>
          ) : null}
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="All submissions" value={counts.all} icon={<UsersRound />} />
        <Metric label="Educator nominations" value={counts.nominations} icon={<ShieldCheck />} />
        <Metric label="Student applications" value={counts.applications} icon={<Award />} />
        <Metric label="Selected class" value={`${counts.selected} / ${program.classSize}`} icon={<CheckCircle2 />} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Candidate review queue</CardTitle>
          <CardDescription>
            Eligibility decisions, scoring and notes remain private. A public
            profile is generated only when a selected candidate has consent and
            the reviewer explicitly turns on publication.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="all">
            <TabsList className="h-auto flex-wrap">
              <TabsTrigger value="all">All ({counts.all})</TabsTrigger>
              <TabsTrigger value="nominations">Nominations ({counts.nominations})</TabsTrigger>
              <TabsTrigger value="applications">Applications ({counts.applications})</TabsTrigger>
              <TabsTrigger value="finalists">Finalists ({counts.finalists})</TabsTrigger>
            </TabsList>
            <QueueTab value="all" rows={initialSubmissions} />
            <QueueTab value="nominations" rows={initialSubmissions.filter((item) => item.kind === "educator_nomination")} />
            <QueueTab value="applications" rows={initialSubmissions.filter((item) => item.kind === "student_application")} />
            <QueueTab value="finalists" rows={initialSubmissions.filter((item) => ["finalist", "selected"].includes(item.status))} />
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

function QueueTab({ value, rows }: { value: string; rows: SubmissionRecord[] }) {
  return (
    <TabsContent value={value} className="mt-5 space-y-3">
      {rows.map((submission) => <SubmissionReview key={submission.id} submission={submission} />)}
      {!rows.length ? <p className="py-12 text-center text-sm text-muted-foreground">No submissions in this view.</p> : null}
    </TabsContent>
  );
}

function SubmissionReview({ submission }: { submission: SubmissionRecord }) {
  const router = useRouter();
  const snapshot = submission.honoreeSnapshot;
  const [form, setForm] = useState({
    status: submission.status,
    reviewScore: submission.reviewScore,
    reviewRecommendation: submission.reviewRecommendation,
    privateReviewNotes: submission.privateReviewNotes,
    publish: Boolean(submission.publishedAt),
    publicBio: snapshot?.bio ?? "",
    publicQuote: snapshot?.quote ?? "",
    publicPhotoUrl: snapshot?.photoUrl ?? "",
  });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function save() {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch(`/api/v1/studio/20-under-20/submissions/${submission.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...form,
          reviewRecommendation: form.reviewRecommendation || null,
          privateReviewNotes: form.privateReviewNotes || null,
          publicBio: form.publicBio || null,
          publicQuote: form.publicQuote || null,
          publicPhotoUrl: form.publicPhotoUrl || null,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error?.message ?? "The review could not be saved.");
      setMessage("Review saved.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The review could not be saved.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <details className="rounded-lg border bg-muted/10">
      <summary className="cursor-pointer list-none p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-bold">{submission.studentFirstName} {submission.studentLastName}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {submission.school} · {submission.city}, {submission.county} County · {submission.kind.replaceAll("_", " ")}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={submission.status === "submitted" ? "destructive" : "secondary"}>{submission.status.replaceAll("_", " ")}</Badge>
            <code className="text-xs text-muted-foreground">{submission.receiptCode}</code>
          </div>
        </div>
      </summary>
      <div className="grid gap-5 border-t p-4 sm:grid-cols-2 sm:p-5">
        <div className="space-y-4 text-sm">
          <PrivateField label="Student email" value={submission.studentEmail} />
          <PrivateField label="Birth date" value={submission.birthDate} />
          <PrivateField label="Grade" value={submission.grade} />
          <PrivateField label="Educator / sponsor" value={[submission.educatorName, submission.educatorTitle, submission.educatorEmail].filter(Boolean).join(" · ") || "Not supplied"} />
          <PrivateField label="Guardian" value={[submission.guardianName, submission.guardianEmail].filter(Boolean).join(" · ") || "Not supplied"} />
          <Narrative label="Community impact" value={submission.communityImpact} />
          <Narrative label="Service" value={submission.serviceSummary} />
          <Narrative label="Future goals" value={submission.futureGoals} />
          {submission.supportingLinks.length ? (
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Supporting links</p>
              <ul className="mt-2 space-y-1">
                {submission.supportingLinks.map((link) => <li key={link}><a className="break-all text-primary hover:underline" href={link} target="_blank" rel="noreferrer">{link}</a></li>)}
              </ul>
            </div>
          ) : null}
        </div>
        <div className="space-y-4">
          <Field label="Workflow status">
            <Select value={form.status} onValueChange={(status) => setForm({ ...form, status })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{submissionStatuses.map((status) => <SelectItem key={status} value={status}>{status.replaceAll("_", " ")}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Panel score (0–100)">
            <Input type="number" min={0} max={100} value={form.reviewScore ?? ""} onChange={(event) => setForm({ ...form, reviewScore: event.target.value ? Number(event.target.value) : null })} />
          </Field>
          <Field label="Recommendation">
            <Input value={form.reviewRecommendation ?? ""} onChange={(event) => setForm({ ...form, reviewRecommendation: event.target.value || null })} />
          </Field>
          <Field label="Private panel notes">
            <Textarea rows={5} value={form.privateReviewNotes ?? ""} onChange={(event) => setForm({ ...form, privateReviewNotes: event.target.value || null })} />
          </Field>
          <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-4">
            <Label className="flex items-center justify-between gap-4">
              <span>
                <span className="block font-semibold">Publish honoree profile</span>
                <span className="mt-1 block text-xs font-normal text-muted-foreground">Requires Selected status, consent, and a public bio.</span>
              </span>
              <Switch checked={form.publish} onCheckedChange={(publish) => setForm({ ...form, publish })} />
            </Label>
            <div className="mt-4 space-y-4">
              <Field label="Approved public bio"><Textarea rows={5} value={form.publicBio} onChange={(event) => setForm({ ...form, publicBio: event.target.value })} /></Field>
              <Field label="Approved public quote"><Textarea rows={3} value={form.publicQuote} onChange={(event) => setForm({ ...form, publicQuote: event.target.value })} /></Field>
              <Field label="Approved photo URL"><Input type="url" value={form.publicPhotoUrl} onChange={(event) => setForm({ ...form, publicPhotoUrl: event.target.value })} /></Field>
            </div>
          </div>
          <Button className="w-full" disabled={busy} onClick={() => void save()}>
            {busy ? <LoaderCircle className="animate-spin" /> : <Save />} Save review
          </Button>
          {message ? <p className="text-sm" role="status">{message}</p> : null}
        </div>
      </div>
    </details>
  );
}

function Metric({ label, value, icon }: { label: string; value: number | string; icon: React.ReactNode }) {
  return <Card><CardContent className="flex items-center justify-between p-5"><div><p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{label}</p><p className="mt-2 text-3xl font-black">{value}</p></div><div className="text-primary [&_svg]:size-6">{icon}</div></CardContent></Card>;
}

function PrivateField({ label, value }: { label: string; value: string }) {
  return <p><span className="font-semibold">{label}:</span> <span className="text-muted-foreground">{value}</span></p>;
}

function Narrative({ label, value }: { label: string; value: string }) {
  return <div><p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{label}</p><p className="mt-2 whitespace-pre-wrap leading-6">{value}</p></div>;
}

function Field({ label, className = "", children }: { label: string; className?: string; children: React.ReactNode }) {
  return <div className={`space-y-2 ${className}`}><Label>{label}</Label>{children}</div>;
}

function DateField({ label, value, disabled, onChange }: { label: string; value: string; disabled: boolean; onChange: (value: string) => void }) {
  return <Field label={label}><Input type="datetime-local" value={value} disabled={disabled} onChange={(event) => onChange(event.target.value)} /></Field>;
}

function programForm(program: ProgramRecord | null, year = new Date().getFullYear()) {
  return {
    id: program?.id,
    year: program?.year ?? year,
    status: program?.status ?? "draft",
    title: program?.title ?? "20 Under 20",
    description: program?.description ?? "The New Jersey Courier honors exceptional high school students who serve their communities and lead with purpose.",
    eligibilitySummary: program?.eligibilitySummary ?? "New Jersey high school students under 20",
    ageLimit: program?.ageLimit ?? 20,
    classSize: program?.classSize ?? 20,
    nominationOpensAt: toLocal(program?.nominationOpensAt),
    nominationClosesAt: toLocal(program?.nominationClosesAt),
    applicationOpensAt: toLocal(program?.applicationOpensAt),
    applicationClosesAt: toLocal(program?.applicationClosesAt),
    eventAt: toLocal(program?.eventAt),
    eventLocation: program?.eventLocation ?? null,
    keynoteSpeaker: program?.keynoteSpeaker ?? null,
  };
}

function toLocal(value?: Date | null) {
  if (!value) return "";
  const shifted = new Date(value.getTime() - value.getTimezoneOffset() * 60_000);
  return shifted.toISOString().slice(0, 16);
}

function toIso(value: string) {
  return value ? new Date(value).toISOString() : null;
}
