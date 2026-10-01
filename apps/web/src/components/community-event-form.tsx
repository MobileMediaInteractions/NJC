"use client";

import { useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { communityCategories } from "@/lib/community";

export function CommunityEventForm() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const value = (name: string) => String(form.get(name) ?? "").trim();
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/v1/community/submissions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: value("title"),
          category: value("category"),
          description: value("description"),
          startsAt: toIsoDateTime(value("startsAt")),
          venue: value("venue"),
          city: value("city"),
          organizer: value("organizer"),
          externalUrl: value("externalUrl"),
          submitterName: value("submitterName"),
          submitterEmail: value("submitterEmail"),
          website: value("website"),
        }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error?.message ?? "Your event could not be submitted.");
      formElement.reset();
      setSubmitted(true);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Your event could not be submitted.");
    } finally {
      setBusy(false);
    }
  }

  if (submitted) {
    return <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-6 text-emerald-950 dark:text-emerald-100" role="status"><CheckCircle2 className="size-7" /><h3 className="mt-3 text-xl font-bold">Thanks for the tip.</h3><p className="mt-2 text-sm leading-6">The community desk will review it. Nothing appears on the bulletin until an editor approves and publishes it.</p><Button className="mt-4" variant="outline" onClick={() => setSubmitted(false)}>Submit another event</Button></div>;
  }

  return (
    <form className="space-y-5" onSubmit={(event) => void submit(event)}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Event name"><Input name="title" required minLength={5} maxLength={160} /></Field>
        <Field label="Type of event"><select name="category" defaultValue="community" className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" required>{communityCategories.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></Field>
        <Field label="Date and time (your local time, if scheduled)"><Input name="startsAt" type="datetime-local" /></Field>
        <Field label="Organizer (optional)"><Input name="organizer" maxLength={160} /></Field>
        <Field label="Venue (optional)"><Input name="venue" maxLength={180} /></Field>
        <Field label="City / town (optional)"><Input name="city" maxLength={100} /></Field>
        <Field label="Event or RSVP link (optional)"><Input name="externalUrl" type="url" placeholder="https://" /></Field>
      </div>
      <Field label="Tell us about it"><Textarea name="description" required minLength={30} maxLength={4_000} rows={5} placeholder="What is happening, who is welcome, and why should local residents know?" /></Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Your name"><Input name="submitterName" required minLength={2} maxLength={120} autoComplete="name" /></Field>
        <Field label="Email for follow-up"><Input name="submitterEmail" type="email" required autoComplete="email" maxLength={254} /></Field>
      </div>
      <div className="absolute -left-[10000px]" aria-hidden="true"><label htmlFor="community-website">Website</label><Input id="community-website" name="website" tabIndex={-1} autoComplete="off" /></div>
      <p className="text-xs leading-5 text-muted-foreground">Your contact details are sent to the newsroom for review and will not appear publicly. Submission is not a guarantee of publication. Please submit only information you have permission to share.</p>
      <Button type="submit" disabled={busy}>{busy ? <Loader2 className="animate-spin" /> : null}{busy ? "Sending…" : "Send to the community desk"}</Button>
      {error ? <p className="text-sm text-destructive" role="alert">{error}</p> : null}
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block space-y-2"><span className="text-sm font-medium">{label}</span>{children}</label>;
}

function toIsoDateTime(value: string) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toISOString();
}
