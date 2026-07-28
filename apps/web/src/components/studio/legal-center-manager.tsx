"use client";

import { useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  FileCheck2,
  Loader2,
  Plus,
  Save,
  ShieldCheck,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";

type LegalSeverity = "informational" | "material" | "critical";
type LegalStatus = "draft" | "review" | "published";

interface SeverityPolicy {
  label: string;
  description: string;
  requirements: Array<{
    id: string;
    label: string;
    description: string;
  }>;
  independentApproval: boolean;
}

interface LegalEntryRecord {
  id: string;
  slug: string;
  title: string;
  summary: string;
  body: string[];
  severity: LegalSeverity;
  status: LegalStatus;
  sortOrder: number;
  verificationChecks: string[];
  submittedByClerkId: string | null;
  approvedByClerkId: string | null;
  publishedRevision: number;
  publishedSnapshot: {
    title: string;
    summary: string;
    body: string[];
    severity: LegalSeverity;
    revision: number;
    publishedAt: string;
  } | null;
  reviewRequestedAt: string | null;
  publishedAt: string | null;
  updatedAt: string;
}

const blankDraft = {
  title: "",
  slug: "",
  summary: "",
  body: "",
  severity: "informational" as LegalSeverity,
  sortOrder: "100",
};

export function LegalCenterManager({
  initialEntries,
  viewerId,
  policy,
}: {
  initialEntries: LegalEntryRecord[];
  viewerId: string;
  policy: Record<LegalSeverity, SeverityPolicy>;
}) {
  const [entries, setEntries] = useState(initialEntries);
  const [draft, setDraft] = useState(blankDraft);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  async function createEntry() {
    setCreating(true);
    setCreateError("");
    try {
      const response = await fetch("/api/v1/studio/legal", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: draft.title,
          slug: draft.slug,
          summary: draft.summary,
          body: paragraphs(draft.body),
          severity: draft.severity,
          sortOrder: Number(draft.sortOrder),
        }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.data) {
        setCreateError(
          payload?.error?.message ??
            `The legal draft could not be created (${response.status}).`,
        );
        return;
      }
      setEntries((current) => [...current, serializeEntry(payload.data)]);
      setDraft(blankDraft);
    } catch {
      setCreateError("The legal publishing service could not be reached.");
    } finally {
      setCreating(false);
    }
  }

  function replaceEntry(entry: LegalEntryRecord) {
    setEntries((current) =>
      current.map((candidate) =>
        candidate.id === entry.id ? entry : candidate,
      ),
    );
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-7">
      <div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary">Administrator only</Badge>
          <Badge variant="outline">Audited revisions</Badge>
        </div>
        <h1 className="mt-3 text-3xl font-bold tracking-tight">
          Legal center publishing
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
          Add notices to the public Legal and Trust Center without rewriting
          the fixed policy routes. Every change begins as a private draft.
          Verification requirements increase with legal severity, and critical
          language needs approval from a different administrator.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="size-5" /> New legal notice
          </CardTitle>
          <CardDescription>
            Creating this record does not make anything public.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-5 lg:grid-cols-2">
          <Field label="Title">
            <Input
              value={draft.title}
              maxLength={140}
              onChange={(event) => {
                const title = event.target.value;
                setDraft((current) => ({
                  ...current,
                  title,
                  slug: slugify(title),
                }));
              }}
              placeholder="Notice title"
            />
          </Field>
          <Field label="Stable identifier">
            <Input
              value={draft.slug}
              maxLength={120}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  slug: slugify(event.target.value),
                }))
              }
              placeholder="notice-identifier"
            />
          </Field>
          <Field label="Severity">
            <SeveritySelect
              value={draft.severity}
              policy={policy}
              onChange={(severity) =>
                setDraft((current) => ({ ...current, severity }))
              }
            />
          </Field>
          <Field label="Display order">
            <Input
              type="number"
              min={0}
              max={10_000}
              value={draft.sortOrder}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  sortOrder: event.target.value,
                }))
              }
            />
          </Field>
          <div className="lg:col-span-2">
            <Field label="Summary">
              <Textarea
                value={draft.summary}
                maxLength={360}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    summary: event.target.value,
                  }))
                }
                placeholder="A concise description of what readers need to know."
              />
            </Field>
          </div>
          <div className="lg:col-span-2">
            <Field label="Public language">
              <Textarea
                value={draft.body}
                rows={8}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    body: event.target.value,
                  }))
                }
                placeholder="Separate paragraphs with a blank line."
              />
            </Field>
          </div>
          {createError ? (
            <p
              role="alert"
              className="lg:col-span-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive"
            >
              {createError}
            </p>
          ) : null}
          <div className="lg:col-span-2">
            <Button onClick={() => void createEntry()} disabled={creating}>
              {creating ? <Loader2 className="animate-spin" /> : <Plus />}
              Create private draft
            </Button>
          </div>
        </CardContent>
      </Card>

      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-bold">Legal notice registry</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            A published snapshot remains public while a newer revision is
            drafted or reviewed.
          </p>
        </div>
        {entries.length ? (
          entries
            .toSorted(
              (left, right) =>
                left.sortOrder - right.sortOrder ||
                left.title.localeCompare(right.title),
            )
            .map((entry) => (
              <LegalEntryEditor
                key={entry.id}
                entry={entry}
                viewerId={viewerId}
                policy={policy}
                onChange={replaceEntry}
              />
            ))
        ) : (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center text-sm text-muted-foreground">
              No database-backed legal notices exist. The fixed privacy, terms,
              cookies, copyright and accessibility routes remain available.
            </CardContent>
          </Card>
        )}
      </section>
    </div>
  );
}

function LegalEntryEditor({
  entry,
  viewerId,
  policy,
  onChange,
}: {
  entry: LegalEntryRecord;
  viewerId: string;
  policy: Record<LegalSeverity, SeverityPolicy>;
  onChange: (entry: LegalEntryRecord) => void;
}) {
  const [form, setForm] = useState(() => ({
    title: entry.title,
    slug: entry.slug,
    summary: entry.summary,
    body: entry.body.join("\n\n"),
    severity: entry.severity,
    sortOrder: String(entry.sortOrder),
  }));
  const [checks, setChecks] = useState<string[]>(entry.verificationChecks);
  const [confirmation, setConfirmation] = useState("");
  const [returnReason, setReturnReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const requirements = policy[form.severity].requirements;
  const allChecksComplete = requirements.every((requirement) =>
    checks.includes(requirement.id),
  );
  const hasUnsavedChanges =
    form.title !== entry.title ||
    form.slug !== entry.slug ||
    form.summary !== entry.summary ||
    form.body !== entry.body.join("\n\n") ||
    form.severity !== entry.severity ||
    Number(form.sortOrder) !== entry.sortOrder;
  const requiredPhrase =
    entry.status === "review"
      ? `APPROVE LEGAL ${entry.slug.toUpperCase()}`
      : `PUBLISH LEGAL ${entry.slug.toUpperCase()}`;
  const isOwnCriticalReview =
    entry.status === "review" && entry.submittedByClerkId === viewerId;

  async function saveDraft() {
    await mutate("PUT", {
      title: form.title,
      slug: form.slug,
      summary: form.summary,
      body: paragraphs(form.body),
      severity: form.severity,
      sortOrder: Number(form.sortOrder),
      expectedUpdatedAt: entry.updatedAt,
    });
  }

  async function verify() {
    await mutate("PATCH", {
      action: entry.status === "review" ? "approve" : "submit",
      checks,
      confirmation,
      expectedUpdatedAt: entry.updatedAt,
    });
  }

  async function returnToDraft() {
    await mutate("PATCH", {
      action: "return_to_draft",
      reason: returnReason,
      expectedUpdatedAt: entry.updatedAt,
    });
  }

  async function mutate(method: "PUT" | "PATCH", body: Record<string, unknown>) {
    setBusy(true);
    setMessage("");
    setError("");
    try {
      const response = await fetch(
        `/api/v1/studio/legal/${encodeURIComponent(entry.id)}`,
        {
          method,
          headers: { "content-type": "application/json" },
          body: JSON.stringify(body),
        },
      );
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.data) {
        setError(
          payload?.error?.message ??
            `The legal action could not be completed (${response.status}).`,
        );
        return;
      }
      const next = serializeEntry(payload.data);
      onChange(next);
      if (method === "PUT") {
        setForm({
          title: next.title,
          slug: next.slug,
          summary: next.summary,
          body: next.body.join("\n\n"),
          severity: next.severity,
          sortOrder: String(next.sortOrder),
        });
      }
      setChecks(next.verificationChecks);
      setConfirmation("");
      setReturnReason("");
      setMessage(
        method === "PUT"
          ? "Private draft saved. Prior public language was not changed."
          : next.status === "review"
            ? "Critical language submitted for independent administrator approval."
            : next.status === "published"
              ? `Legal revision ${next.publishedRevision} is now public.`
              : "Legal entry returned to draft.",
      );
    } catch {
      setError("The legal publishing service could not be reached.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card id={`legal-${entry.slug}`}>
      <CardHeader>
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="capitalize">{entry.status}</Badge>
              <SeverityBadge severity={entry.severity} />
              {entry.publishedSnapshot ? (
                <Badge variant="outline">
                  Public revision {entry.publishedRevision}
                </Badge>
              ) : null}
            </div>
            <CardTitle className="mt-3">{entry.title}</CardTitle>
            <CardDescription className="mt-1">
              /legal#{entry.slug} · Updated{" "}
              {new Intl.DateTimeFormat("en-US", {
                dateStyle: "medium",
                timeStyle: "short",
              }).format(new Date(entry.updatedAt))}
            </CardDescription>
          </div>
          <div className="text-left text-xs leading-5 text-muted-foreground md:text-right">
            <p>{policy[entry.severity].requirements.length} required checks</p>
            <p>
              {policy[entry.severity].independentApproval
                ? "Separate administrator approval required"
                : "Verified administrator publication"}
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {entry.status !== "review" ? (
          <div className="grid gap-5 lg:grid-cols-2">
            <Field label="Title">
              <Input
                value={form.title}
                maxLength={140}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    title: event.target.value,
                  }))
                }
              />
            </Field>
            <Field label="Stable identifier">
              <Input
                value={form.slug}
                maxLength={120}
                disabled={Boolean(entry.publishedSnapshot)}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    slug: slugify(event.target.value),
                  }))
                }
              />
            </Field>
            <Field label="Severity">
              <SeveritySelect
                value={form.severity}
                policy={policy}
                onChange={(severity) => {
                  setForm((current) => ({ ...current, severity }));
                  setChecks([]);
                  setConfirmation("");
                }}
              />
            </Field>
            <Field label="Display order">
              <Input
                type="number"
                min={0}
                max={10_000}
                value={form.sortOrder}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    sortOrder: event.target.value,
                  }))
                }
              />
            </Field>
            <div className="lg:col-span-2">
              <Field label="Summary">
                <Textarea
                  value={form.summary}
                  maxLength={360}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      summary: event.target.value,
                    }))
                  }
                />
              </Field>
            </div>
            <div className="lg:col-span-2">
              <Field label="Public language">
                <Textarea
                  value={form.body}
                  rows={8}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      body: event.target.value,
                    }))
                  }
                />
              </Field>
            </div>
            <div className="lg:col-span-2">
              <Button
                variant="outline"
                onClick={() => void saveDraft()}
                disabled={busy || !hasUnsavedChanges}
              >
                {busy ? <Loader2 className="animate-spin" /> : <Save />}
                Save private draft
              </Button>
            </div>
          </div>
        ) : (
          <div className="rounded-lg border bg-muted/25 p-5">
            <p className="font-semibold">Language locked during review</p>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              Return this entry to Draft before changing its title, severity,
              order or public language. The currently published snapshot, if
              any, remains unchanged until approval.
            </p>
          </div>
        )}

        <Separator />

        {entry.status === "review" ? (
          <div className="space-y-5">
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4">
              <p className="flex items-center gap-2 font-semibold text-amber-500">
                <AlertTriangle className="size-4" />
                Critical legal review
              </p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                The submitting administrator completed all six checks. A
                different administrator must inspect the language and approve
                the immutable public revision.
              </p>
            </div>
            {isOwnCriticalReview ? (
              <p className="text-sm font-semibold text-amber-500">
                You submitted this revision and cannot approve it yourself.
              </p>
            ) : (
              <ConfirmationField
                phrase={requiredPhrase}
                value={confirmation}
                onChange={setConfirmation}
              />
            )}
            <div className="flex flex-wrap gap-3">
              {!isOwnCriticalReview ? (
                <Button
                  onClick={() => void verify()}
                  disabled={busy || confirmation !== requiredPhrase}
                >
                  {busy ? (
                    <Loader2 className="animate-spin" />
                  ) : (
                    <ShieldCheck />
                  )}
                  Approve and publish
                </Button>
              ) : null}
            </div>
            <Field label="Reason for returning to draft">
              <Textarea
                value={returnReason}
                maxLength={500}
                onChange={(event) => setReturnReason(event.target.value)}
                placeholder="Explain what must be corrected before another review."
              />
            </Field>
            <Button
              variant="outline"
              onClick={() => void returnToDraft()}
              disabled={busy || returnReason.trim().length < 10}
            >
              Return to draft
            </Button>
          </div>
        ) : entry.status === "published" && !hasUnsavedChanges ? (
          <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4">
            <p className="flex items-center gap-2 font-semibold text-emerald-400">
              <CheckCircle2 className="size-4" />
              Revision {entry.publishedRevision} is verified and public
            </p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Change the language or severity above, then save it as a private
              draft before a new verification cycle can begin.
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            {hasUnsavedChanges ? (
              <p className="rounded-md bg-amber-500/10 p-3 text-sm font-semibold text-amber-500">
                Save these changes as a private draft before completing
                verification.
              </p>
            ) : null}
            <div>
              <p className="flex items-center gap-2 font-semibold">
                <FileCheck2 className="size-4" />
                {policy[form.severity].requirements.length}-step verification
              </p>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                {policy[form.severity].description} Saving any edit clears this
                verification record.
              </p>
            </div>
            <div className="grid gap-3">
              {requirements.map((requirement) => {
                const checked = checks.includes(requirement.id);
                return (
                  <label
                    key={requirement.id}
                    className="flex cursor-pointer items-start gap-3 rounded-lg border p-4"
                  >
                    <input
                      type="checkbox"
                      className="mt-1 size-4 accent-primary"
                      checked={checked}
                      onChange={(event) =>
                        setChecks((current) =>
                          event.target.checked
                            ? [...new Set([...current, requirement.id])]
                            : current.filter((id) => id !== requirement.id),
                        )
                      }
                    />
                    <span>
                      <span className="block text-sm font-semibold">
                        {requirement.label}
                      </span>
                      <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                        {requirement.description}
                      </span>
                    </span>
                  </label>
                );
              })}
            </div>
            <ConfirmationField
              phrase={requiredPhrase}
              value={confirmation}
              onChange={setConfirmation}
            />
            <Button
              onClick={() => void verify()}
              disabled={
                busy ||
                hasUnsavedChanges ||
                !allChecksComplete ||
                confirmation !== requiredPhrase
              }
            >
              {busy ? (
                <Loader2 className="animate-spin" />
              ) : policy[form.severity].independentApproval ? (
                <ShieldCheck />
              ) : (
                <CheckCircle2 />
              )}
              {policy[form.severity].independentApproval
                ? "Submit for independent approval"
                : "Verify and publish"}
            </Button>
          </div>
        )}

        {message ? (
          <p
            role="status"
            className="rounded-md bg-emerald-500/10 p-3 text-sm text-emerald-400"
          >
            {message}
          </p>
        ) : null}
        {error ? (
          <p
            role="alert"
            className="rounded-md bg-destructive/10 p-3 text-sm text-destructive"
          >
            {error}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}

function SeveritySelect({
  value,
  policy,
  onChange,
}: {
  value: LegalSeverity;
  policy: Record<LegalSeverity, SeverityPolicy>;
  onChange: (value: LegalSeverity) => void;
}) {
  return (
    <Select value={value} onValueChange={(next) => onChange(next as LegalSeverity)}>
      <SelectTrigger>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {(
          Object.entries(policy) as Array<[LegalSeverity, SeverityPolicy]>
        ).map(([severity, definition]) => (
          <SelectItem key={severity} value={severity}>
            {definition.label} · {definition.requirements.length} checks
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function SeverityBadge({ severity }: { severity: LegalSeverity }) {
  return (
    <Badge
      variant={severity === "critical" ? "destructive" : "secondary"}
      className="capitalize"
    >
      {severity}
    </Badge>
  );
}

function ConfirmationField({
  phrase,
  value,
  onChange,
}: {
  phrase: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <Field label="Exact publication confirmation">
      <p className="mb-2 text-xs leading-5 text-muted-foreground">
        Enter <strong className="select-all text-foreground">{phrase}</strong>
      </p>
      <Input
        value={value}
        autoComplete="off"
        spellCheck={false}
        onChange={(event) => onChange(event.target.value)}
      />
    </Field>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function paragraphs(value: string) {
  return value
    .split(/\n\n+/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function serializeEntry(value: Record<string, unknown>): LegalEntryRecord {
  return {
    ...(value as unknown as LegalEntryRecord),
    updatedAt: new Date(value.updatedAt as string).toISOString(),
    publishedAt: value.publishedAt
      ? new Date(value.publishedAt as string).toISOString()
      : null,
    reviewRequestedAt: value.reviewRequestedAt
      ? new Date(value.reviewRequestedAt as string).toISOString()
      : null,
  };
}
