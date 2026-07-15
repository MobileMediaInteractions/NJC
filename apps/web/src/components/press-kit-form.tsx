"use client";

import { useState, type FormEvent } from "react";
import { CheckCircle2, Download, LoaderCircle, PackageOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { PressKitAssetGroup } from "@/lib/press-kit";

const choices: { id: PressKitAssetGroup; title: string; detail: string }[] = [
  { id: "logos", title: "Logos & app marks", detail: "Standard, inverse, icon and adaptive SVG artwork." },
  { id: "publication", title: "Publication background", detail: "Fact sheet, boilerplate, contact note and quick brand guide." },
  { id: "editorial", title: "Editorial illustration", detail: "High-resolution Garden State brand illustration with usage notes." },
];

export function PressKitForm() {
  const [groups, setGroups] = useState<PressKitAssetGroup[]>(["logos", "publication", "editorial"]);
  const [intendedUse, setIntendedUse] = useState("editorial");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ kind: "success" | "error"; message: string } | null>(null);

  function toggle(group: PressKitAssetGroup) {
    setGroups((current) => current.includes(group) ? current.filter((item) => item !== group) : [...current, group]);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!groups.length) {
      setNotice({ kind: "error", message: "Choose at least one asset group." });
      return;
    }

    const form = event.currentTarget;
    const data = new FormData(form);
    setBusy(true);
    setNotice(null);
    try {
      const response = await fetch("/api/v1/press-kit", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: data.get("name"),
          organization: data.get("organization"),
          email: data.get("email"),
          intendedUse,
          requestDetails: data.get("requestDetails"),
          assetGroups: groups,
          acceptsTerms: data.get("acceptsTerms") === "on",
          website: data.get("website"),
        }),
      });

      if (!response.ok) {
        const result = await response.json().catch(() => null) as { error?: { message?: string } } | null;
        throw new Error(result?.error?.message || "The press kit could not be generated.");
      }

      const blob = await response.blob();
      const disposition = response.headers.get("content-disposition") ?? "";
      const filename = disposition.match(/filename="([^"]+)"/)?.[1] ?? "new-jersey-courier-press-kit.zip";
      const href = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = href;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(href);
      const requestId = response.headers.get("x-press-kit-request-id");
      setNotice({ kind: "success", message: `Your ZIP is ready${requestId ? ` · Request ${requestId.slice(0, 8)}` : ""}.` });
    } catch (error) {
      setNotice({ kind: "error", message: error instanceof Error ? error.message : "The press kit could not be generated." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="border-brand-navy/15 shadow-sm">
      <CardHeader className="border-b bg-white/45">
        <div className="grid size-11 place-items-center rounded-full bg-brand-navy text-brand-yellow"><PackageOpen className="size-5" /></div>
        <CardTitle className="mt-2 text-2xl text-brand-navy">Build your press package</CardTitle>
        <CardDescription>Tell us who you represent and what you are preparing. The selected files are assembled immediately into one request-specific ZIP.</CardDescription>
      </CardHeader>
      <CardContent className="pt-6">
        <form onSubmit={submit} className="space-y-6">
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Your name" htmlFor="press-name"><Input id="press-name" name="name" autoComplete="name" minLength={2} maxLength={100} required /></Field>
            <Field label="Media organization" htmlFor="press-organization"><Input id="press-organization" name="organization" autoComplete="organization" minLength={2} maxLength={140} required /></Field>
            <Field label="Work email" htmlFor="press-email"><Input id="press-email" name="email" type="email" autoComplete="email" maxLength={254} required /></Field>
            <div className="space-y-2"><Label htmlFor="press-use">Intended use</Label><Select value={intendedUse} onValueChange={setIntendedUse}><SelectTrigger id="press-use" className="h-8 w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="editorial">Digital or print editorial</SelectItem><SelectItem value="broadcast">Television or broadcast</SelectItem><SelectItem value="podcast">Podcast or audio</SelectItem><SelectItem value="event">Event or conference</SelectItem><SelectItem value="research">Research or education</SelectItem><SelectItem value="other">Other media use</SelectItem></SelectContent></Select></div>
          </div>

          <Field label="What do you need?" htmlFor="press-details">
            <Textarea id="press-details" name="requestDetails" className="min-h-32 resize-y" minLength={10} maxLength={2_000} required placeholder="Describe the story, segment, deadline, image format, background information or interview context you need." />
          </Field>

          <fieldset>
            <legend className="text-sm font-semibold">Include in the ZIP</legend>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              {choices.map((choice) => {
                const selected = groups.includes(choice.id);
                return <label key={choice.id} className={`cursor-pointer rounded-md border p-4 transition-colors has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-ring/50 ${selected ? "border-brand-blue bg-brand-sky/70" : "bg-card hover:bg-muted/60"}`}><input type="checkbox" className="sr-only" checked={selected} onChange={() => toggle(choice.id)} /><span className="flex items-start gap-3"><span className={`mt-0.5 grid size-5 shrink-0 place-items-center rounded-sm border ${selected ? "border-brand-blue bg-brand-blue text-white" : "bg-background"}`}>{selected ? <CheckCircle2 className="size-3.5" /> : null}</span><span><span className="block text-sm font-bold text-brand-navy">{choice.title}</span><span className="mt-1 block text-xs leading-5 text-muted-foreground">{choice.detail}</span></span></span></label>;
              })}
            </div>
          </fieldset>

          <div className="absolute -left-[10000px]" aria-hidden="true"><Label htmlFor="press-website">Website</Label><Input id="press-website" name="website" tabIndex={-1} autoComplete="off" /></div>
          <label className="flex items-start gap-3 rounded-md border bg-muted/35 p-4 text-sm leading-6"><input name="acceptsTerms" type="checkbox" className="mt-1 size-4 accent-brand-navy" required /><span>I am requesting these assets for a legitimate media use and agree to the press-kit license included in the download. I will verify provisional launch details before publication.</span></label>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs leading-5 text-muted-foreground">Maximum three generated packages per connection per hour. Requests are recorded when the production database is connected.</p>
            <Button type="submit" size="lg" className="shrink-0" disabled={busy || !groups.length}>{busy ? <LoaderCircle className="animate-spin" /> : <Download />} {busy ? "Building ZIP…" : "Generate press kit"}</Button>
          </div>
          {notice ? <p role="status" className={`rounded-md p-3 text-sm ${notice.kind === "success" ? "bg-emerald-100 text-emerald-950" : "bg-red-100 text-red-950"}`}>{notice.message}</p> : null}
        </form>
      </CardContent>
    </Card>
  );
}

function Field({ label, htmlFor, children }: { label: string; htmlFor: string; children: React.ReactNode }) {
  return <div className="space-y-2"><Label htmlFor={htmlFor}>{label}</Label>{children}</div>;
}
