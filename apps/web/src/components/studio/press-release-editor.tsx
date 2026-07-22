"use client";

import { useState } from "react";
import { Archive, CheckCircle2, Download, Eye, Loader2, Save, ShieldAlert } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  parsePressReleaseKeyPoints,
  pressReleaseInput,
  pressReleaseTypeLabels,
  splitPressReleaseParagraphs,
  type PressReleaseDocumentType,
  type PressReleaseInput,
  type PressReleaseRecord,
  type PressReleaseStatus,
} from "@/lib/press-release";
import type { SiteConfiguration } from "@/lib/site-settings";

type EditorForm = Omit<PressReleaseInput, "keyPoints"> & { keyPointsText: string };
type FieldErrors = Record<string, string[] | undefined>;
type SaveState = "idle" | "saving" | "saved" | "error";

export function PressReleaseEditor({
  initialRelease,
  publication,
  datelines,
  viewer,
  siteOrigin,
}: {
  initialRelease?: PressReleaseRecord;
  publication: SiteConfiguration["publication"];
  datelines: string[];
  viewer: { name: string; email: string };
  siteOrigin: string;
}) {
  const router = useRouter();
  const [releaseId, setReleaseId] = useState(initialRelease?.id ?? null);
  const [form, setForm] = useState<EditorForm>(() => initialForm(initialRelease, publication, datelines, viewer, siteOrigin));
  const [state, setState] = useState<SaveState>("idle");
  const [message, setMessage] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const wordCount = form.body.trim() ? form.body.trim().split(/\s+/).length : 0;

  function update<Key extends keyof EditorForm>(key: Key, value: EditorForm[Key]) {
    setForm((current) => ({ ...current, [key]: value }));
    setState("idle");
  }

  async function save(nextStatus: PressReleaseStatus = form.status, download = false) {
    const nextPayload = { ...toPayload(form), status: nextStatus };
    const parsed = pressReleaseInput.safeParse(nextPayload);
    if (!parsed.success) {
      const errors = parsed.error.flatten().fieldErrors;
      setFieldErrors(errors);
      setState("error");
      setMessage(Object.values(errors).flat().find(Boolean) ?? "Review the highlighted press-release fields.");
      return null;
    }
    setState("saving");
    setMessage("");
    setFieldErrors({});
    try {
      const response = await fetch(releaseId ? `/api/v1/studio/press-releases/${encodeURIComponent(releaseId)}` : "/api/v1/studio/press-releases", {
        method: releaseId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      const result = await response.json().catch(() => null) as { data?: PressReleaseRecord; error?: { message?: string; details?: { fieldErrors?: FieldErrors } } } | null;
      if (!response.ok || !result?.data) {
        const errors = result?.error?.details?.fieldErrors ?? {};
        setFieldErrors(errors);
        throw new Error(Object.values(errors).flat().find(Boolean) ?? result?.error?.message ?? "The press release could not be saved.");
      }
      setReleaseId(result.data.id);
      setForm((current) => ({ ...current, status: result.data?.status ?? nextStatus }));
      setState("saved");
      setMessage(download ? "Saved. Your PDF download is starting." : nextStatus === "ready" ? "Marked ready for distribution." : "Draft saved to the newsroom.");
      if (!releaseId) router.replace(`/studio/press-releases/${result.data.id}`);
      else router.refresh();
      if (download) window.location.assign(`/api/v1/studio/press-releases/${encodeURIComponent(result.data.id)}/pdf`);
      return result.data;
    } catch (error) {
      setState("error");
      setMessage(error instanceof Error ? error.message : "The newsroom service could not be reached.");
      return null;
    }
  }

  async function archive() {
    if (!releaseId) return;
    setArchiving(true);
    setMessage("");
    try {
      const response = await fetch(`/api/v1/studio/press-releases/${encodeURIComponent(releaseId)}`, { method: "DELETE" });
      const result = await response.json().catch(() => null) as { error?: { message?: string } } | null;
      if (!response.ok) throw new Error(result?.error?.message ?? "The document could not be archived.");
      router.push("/studio/press-releases");
      router.refresh();
    } catch (error) {
      setState("error");
      setMessage(error instanceof Error ? error.message : "The newsroom service could not be reached.");
      setArchiveOpen(false);
    } finally {
      setArchiving(false);
    }
  }

  const errorFor = (field: string) => fieldErrors[field]?.[0];
  const datelineOptions = form.location && !datelines.includes(form.location) ? [form.location, ...datelines] : datelines;

  return (
    <div className="max-w-[92rem]">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/studio/press-releases" className="text-xs font-semibold text-primary hover:underline">Press releases</Link>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">{initialRelease ? "Edit newsroom document" : "Create newsroom document"}</h1>
          <p className="mt-1 text-sm text-muted-foreground">Compose, review and export a distribution-ready PDF using the Courier identity.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={form.status === "ready" ? "default" : form.status === "archived" ? "outline" : "secondary"} className="capitalize">{form.status}</Badge>
          {releaseId ? <Button variant="outline" onClick={() => void save(form.status, true)} disabled={state === "saving"}><Download /> Download PDF</Button> : null}
          <Button variant="outline" onClick={() => void save("draft")} disabled={state === "saving"}>{state === "saving" ? <Loader2 className="animate-spin" /> : <Save />} Save draft</Button>
          <Button onClick={() => void save("ready")} disabled={state === "saving"}><CheckCircle2 /> Mark ready</Button>
        </div>
      </div>

      {message ? <div role={state === "error" ? "alert" : "status"} className={`mb-5 flex items-center gap-2 rounded-lg border p-3 text-sm ${state === "error" ? "border-destructive/40 bg-destructive/10 text-destructive" : "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"}`}>{state === "error" ? <ShieldAlert className="size-4" /> : <CheckCircle2 className="size-4" />}{message}</div> : null}

      <Tabs defaultValue="editor" className="lg:hidden">
        <TabsList className="mb-4 w-full"><TabsTrigger value="editor" className="flex-1">Editor</TabsTrigger><TabsTrigger value="preview" className="flex-1"><Eye /> Preview</TabsTrigger></TabsList>
        <TabsContent value="editor"><EditorFields form={form} update={update} errorFor={errorFor} datelines={datelineOptions} wordCount={wordCount} publicationTimezone={publication.timezone} /></TabsContent>
        <TabsContent value="preview"><PressReleasePreview form={form} publication={publication} /></TabsContent>
      </Tabs>

      <div className="hidden gap-6 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(25rem,0.82fr)]">
        <EditorFields form={form} update={update} errorFor={errorFor} datelines={datelineOptions} wordCount={wordCount} publicationTimezone={publication.timezone} />
        <div><div className="sticky top-24"><div className="mb-3 flex items-center justify-between"><p className="text-sm font-semibold">Live document preview</p><p className="text-xs text-muted-foreground">US Letter · PDF-safe layout</p></div><PressReleasePreview form={form} publication={publication} /></div></div>
      </div>

      {releaseId ? <div className="mt-8 flex justify-end"><AlertDialog open={archiveOpen} onOpenChange={(open) => { if (!archiving) setArchiveOpen(open); }}><AlertDialogTrigger asChild><Button variant="ghost" className="text-muted-foreground"><Archive /> Archive document</Button></AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogMedia className="bg-amber-500/10 text-amber-400"><Archive /></AlertDialogMedia><AlertDialogTitle>Archive this document?</AlertDialogTitle><AlertDialogDescription>It will remain in the newsroom record and audit log, but move out of the active press-release list. Existing downloaded PDFs are not recalled.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel disabled={archiving}>Keep active</AlertDialogCancel><Button onClick={() => void archive()} disabled={archiving}>{archiving ? <><Loader2 className="animate-spin" /> Archiving</> : <><Archive /> Archive</>}</Button></AlertDialogFooter></AlertDialogContent></AlertDialog></div> : null}
    </div>
  );
}

function EditorFields({ form, update, errorFor, datelines, wordCount, publicationTimezone }: { form: EditorForm; update: <Key extends keyof EditorForm>(key: Key, value: EditorForm[Key]) => void; errorFor: (field: string) => string | undefined; datelines: string[]; wordCount: number; publicationTimezone: string }) {
  return <div className="space-y-6">
    <Card><CardHeader><CardTitle>Document setup</CardTitle><CardDescription>Choose the newsroom format and distribution timing.</CardDescription></CardHeader><CardContent className="grid gap-5 sm:grid-cols-2">
      <Field label="Document type" htmlFor="press-document-type"><Select value={form.documentType} onValueChange={(value) => update("documentType", value as PressReleaseDocumentType)}><SelectTrigger id="press-document-type"><SelectValue /></SelectTrigger><SelectContent>{Object.entries(pressReleaseTypeLabels).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select></Field>
      <Field label="Release timing" htmlFor="press-release-timing"><Select value={form.releaseTiming} onValueChange={(value) => update("releaseTiming", value as EditorForm["releaseTiming"])}><SelectTrigger id="press-release-timing"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="immediate">For immediate release</SelectItem><SelectItem value="embargoed">Embargoed</SelectItem></SelectContent></Select></Field>
      {form.releaseTiming === "embargoed" ? <Field label="Embargo date and time" htmlFor="press-release-at" error={errorFor("releaseAt")} className="sm:col-span-2"><Input id="press-release-at" type="datetime-local" value={form.releaseAt} onChange={(event) => update("releaseAt", event.target.value)} aria-invalid={Boolean(errorFor("releaseAt"))} /><p className="text-xs text-amber-300">Entered in your device timezone and printed in {publicationTimezone}. Confirm the distribution list before sending.</p></Field> : null}
      <Field label="Dateline" htmlFor="press-location" error={errorFor("location")}><Select value={form.location} onValueChange={(value) => update("location", value)}><SelectTrigger id="press-location" aria-invalid={Boolean(errorFor("location"))}><SelectValue /></SelectTrigger><SelectContent>{datelines.map((dateline) => <SelectItem key={dateline} value={dateline}>{dateline}</SelectItem>)}</SelectContent></Select></Field>
      <Field label="Workflow status" htmlFor="press-status"><Select value={form.status} onValueChange={(value) => update("status", value as PressReleaseStatus)}><SelectTrigger id="press-status"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="draft">Draft</SelectItem><SelectItem value="ready">Ready</SelectItem><SelectItem value="archived">Archived</SelectItem></SelectContent></Select></Field>
    </CardContent></Card>

    <Card><CardHeader><CardTitle>Release copy</CardTitle><CardDescription>Use clear, attributable language. Draft exports receive a visible watermark.</CardDescription></CardHeader><CardContent className="space-y-5">
      <Field label="Headline" htmlFor="press-headline" error={errorFor("headline")} count={`${form.headline.length}/240`}><Textarea id="press-headline" value={form.headline} onChange={(event) => update("headline", event.target.value)} className="min-h-24 text-xl font-semibold" maxLength={240} placeholder="A specific, publication-ready headline" aria-invalid={Boolean(errorFor("headline"))} /></Field>
      <Field label="Subheadline" htmlFor="press-subheadline" error={errorFor("subheadline")} count={`${form.subheadline.length}/320`}><Textarea id="press-subheadline" value={form.subheadline} onChange={(event) => update("subheadline", event.target.value)} maxLength={320} placeholder="Optional supporting line" /></Field>
      <Field label="Executive summary" htmlFor="press-summary" error={errorFor("summary")} count={`${form.summary.length}/1000`}><Textarea id="press-summary" value={form.summary} onChange={(event) => update("summary", event.target.value)} className="min-h-24" maxLength={1000} placeholder="Optional two- or three-sentence overview for editors and assignment desks" /></Field>
      <Separator />
      <Field label="Body" htmlFor="press-body" error={errorFor("body")} count={`${wordCount} words`}><Textarea id="press-body" value={form.body} onChange={(event) => update("body", event.target.value)} className="min-h-[30rem] resize-y leading-7" placeholder="Write the release here. Separate paragraphs with a blank line." aria-invalid={Boolean(errorFor("body"))} /></Field>
    </CardContent></Card>

    <Card><CardHeader><CardTitle>Supporting material</CardTitle><CardDescription>Optional structured details improve scanning without changing the core release.</CardDescription></CardHeader><CardContent className="space-y-5">
      <Field label="Featured quotation" htmlFor="press-quote" error={errorFor("quote")}><Textarea id="press-quote" value={form.quote} onChange={(event) => update("quote", event.target.value)} className="min-h-28" maxLength={2000} placeholder="Optional attributable quotation" /></Field>
      <Field label="Quote attribution" htmlFor="press-quote-attribution" error={errorFor("quoteAttribution")}><Input id="press-quote-attribution" value={form.quoteAttribution} onChange={(event) => update("quoteAttribution", event.target.value)} maxLength={200} placeholder="Name, title or organization" /></Field>
      <Field label="Key details" htmlFor="press-key-points" error={errorFor("keyPoints")}><Textarea id="press-key-points" value={form.keyPointsText} onChange={(event) => update("keyPointsText", event.target.value)} className="min-h-32" placeholder={"One detail per line\nDates, figures or event information"} /><p className="text-xs text-muted-foreground">Up to 12 points. Bullets are created automatically in the PDF.</p></Field>
      <Field label="Organization boilerplate" htmlFor="press-boilerplate" error={errorFor("boilerplate")}><Textarea id="press-boilerplate" value={form.boilerplate} onChange={(event) => update("boilerplate", event.target.value)} className="min-h-40" aria-invalid={Boolean(errorFor("boilerplate"))} /></Field>
    </CardContent></Card>

    <Card><CardHeader><CardTitle>Media contact</CardTitle><CardDescription>Printed in the final document so journalists can follow up.</CardDescription></CardHeader><CardContent className="grid gap-5 sm:grid-cols-2">
      <Field label="Contact name" htmlFor="press-contact-name" error={errorFor("contactName")}><Input id="press-contact-name" value={form.contactName} onChange={(event) => update("contactName", event.target.value)} /></Field>
      <Field label="Title or desk" htmlFor="press-contact-title" error={errorFor("contactTitle")}><Input id="press-contact-title" value={form.contactTitle} onChange={(event) => update("contactTitle", event.target.value)} /></Field>
      <Field label="Email" htmlFor="press-contact-email" error={errorFor("contactEmail")}><Input id="press-contact-email" type="email" value={form.contactEmail} onChange={(event) => update("contactEmail", event.target.value)} aria-invalid={Boolean(errorFor("contactEmail"))} /></Field>
      <Field label="Phone" htmlFor="press-contact-phone" error={errorFor("contactPhone")}><Input id="press-contact-phone" type="tel" value={form.contactPhone} onChange={(event) => update("contactPhone", event.target.value)} placeholder="Optional" /></Field>
      <Field label="Website" htmlFor="press-website" error={errorFor("websiteUrl")} className="sm:col-span-2"><Input id="press-website" type="url" value={form.websiteUrl} onChange={(event) => update("websiteUrl", event.target.value)} aria-invalid={Boolean(errorFor("websiteUrl"))} /></Field>
      <Field label="Internal notes" htmlFor="press-internal-notes" error={errorFor("internalNotes")} className="sm:col-span-2"><Textarea id="press-internal-notes" value={form.internalNotes} onChange={(event) => update("internalNotes", event.target.value)} className="min-h-28" placeholder="Approval, distribution or follow-up notes. Never included in the PDF." /><p className="text-xs text-muted-foreground">Private newsroom context only.</p></Field>
    </CardContent></Card>
  </div>;
}

function PressReleasePreview({ form, publication }: { form: EditorForm; publication: SiteConfiguration["publication"] }) {
  const paragraphs = splitPressReleaseParagraphs(form.body);
  const keyPoints = parsePressReleaseKeyPoints(form.keyPointsText);
  return <div className="relative mx-auto aspect-[8.5/11] w-full max-w-[44rem] overflow-hidden rounded-sm bg-white text-[#171b19] shadow-2xl ring-1 ring-black/20">
    {form.status === "draft" ? <div className="pointer-events-none absolute inset-0 z-10 grid place-items-center"><span className="-rotate-[32deg] text-7xl font-black tracking-widest text-brand-navy/[0.06]">DRAFT</span></div> : null}
    <div className="h-[10.5%] border-t-[5px] border-brand-yellow bg-[#071f31] px-[8.8%] py-[2.5%] text-white"><div className="flex items-center justify-between"><div className="flex items-center gap-3"><div className="grid size-10 place-items-center border-y-2 border-brand-yellow bg-brand-green font-serif text-base font-black">NJC</div><div><p className="text-sm font-black uppercase tracking-tight">{publication.shortName}</p><p className="text-[0.38rem] font-bold uppercase tracking-[0.24em] text-white/60">{publication.region}</p></div></div><p className="text-[0.42rem] font-bold uppercase tracking-widest text-brand-yellow">Media Relations</p></div></div>
    <div className="h-[84%] overflow-hidden px-[8.8%] py-[5.5%] font-serif">
      <p className="font-sans text-[0.42rem] font-black uppercase tracking-[0.16em] text-brand-yellow">{pressReleaseTypeLabels[form.documentType]}</p>
      <p className="mt-1 font-sans text-[0.44rem] font-black uppercase text-brand-navy">{form.releaseTiming === "immediate" ? "For immediate release" : `Embargoed until ${form.releaseAt ? new Date(form.releaseAt).toLocaleString() : "date required"}`}</p>
      <h2 className="mt-3 text-[clamp(1rem,2.25vw,1.55rem)] font-black leading-[1.05]">{form.headline || "Your press release headline"}</h2>
      {form.subheadline ? <p className="mt-2 text-[0.66rem] leading-4 text-black/55">{form.subheadline}</p> : null}
      <div className="my-3 h-px bg-brand-yellow" />
      {form.summary ? <p className="border-l-[3px] border-brand-yellow bg-[#edf5ef] p-2 text-[0.54rem] font-bold leading-4 text-brand-green">{form.summary}</p> : null}
      <div className="mt-3 space-y-2 text-[0.5rem] leading-[0.82rem]">{paragraphs.length ? paragraphs.slice(0, 7).map((paragraph, index) => <p key={`${index}-${paragraph.slice(0, 12)}`}>{index === 0 ? <strong>{form.location.toUpperCase()} - </strong> : null}{paragraph}</p>) : <p className="italic text-black/35">Your release copy will appear here.</p>}</div>
      {form.quote ? <blockquote className="mt-3 border-l-[3px] border-brand-yellow bg-[#edf5ef] p-2 text-[0.52rem] italic leading-[0.82rem]">“{form.quote}”<footer className="mt-1 font-sans text-[0.4rem] font-bold not-italic">— {form.quoteAttribution || "Attribution required"}</footer></blockquote> : null}
      {keyPoints.length ? <div className="mt-3"><p className="font-sans text-[0.4rem] font-black uppercase tracking-widest text-brand-yellow">Key details</p><ul className="mt-1 list-disc space-y-0.5 pl-4 text-[0.46rem] leading-3">{keyPoints.slice(0, 5).map((point) => <li key={point}>{point}</li>)}</ul></div> : null}
      <div className="mt-3"><p className="font-sans text-[0.4rem] font-black uppercase tracking-widest text-brand-yellow">About {publication.shortName}</p><p className="mt-1 text-[0.44rem] leading-3 text-black/55">{form.boilerplate}</p></div>
    </div>
    <div className="absolute inset-x-[8.8%] bottom-[2.5%] flex justify-between border-t pt-1 font-sans text-[0.34rem] text-black/40"><span>{publication.name} · {publication.city}, {publication.state}</span><span>PDF preview</span></div>
  </div>;
}

function Field({ label, htmlFor, error, count, className = "", children }: { label: string; htmlFor: string; error?: string; count?: string; className?: string; children: React.ReactNode }) {
  return <div className={`space-y-2 ${className}`}><div className="flex items-center justify-between gap-3"><Label htmlFor={htmlFor}>{label}</Label>{count ? <span className="text-xs text-muted-foreground">{count}</span> : null}</div>{children}{error ? <p className="text-xs text-destructive">{error}</p> : null}</div>;
}

function initialForm(initial: PressReleaseRecord | undefined, publication: SiteConfiguration["publication"], datelines: string[], viewer: { name: string; email: string }, siteOrigin: string): EditorForm {
  if (initial) return {
    ...initial,
    releaseAt: initial.releaseAt ? toLocalDateTime(initial.releaseAt) : "",
    keyPointsText: initial.keyPoints.join("\n"),
  };
  return {
    documentType: "press_release",
    status: "draft",
    headline: "",
    subheadline: "",
    summary: "",
    location: datelines[0] ?? publication.city,
    releaseTiming: "immediate",
    releaseAt: "",
    body: "",
    quote: "",
    quoteAttribution: "",
    keyPointsText: "",
    boilerplate: `${publication.name} is ${publication.description.charAt(0).toLocaleLowerCase()}${publication.description.slice(1)}`,
    contactName: viewer.name,
    contactTitle: "Media Relations",
    contactEmail: viewer.email,
    contactPhone: "",
    websiteUrl: siteOrigin,
    internalNotes: "",
  };
}

function toPayload(form: EditorForm): PressReleaseInput {
  return {
    ...form,
    releaseAt: form.releaseTiming === "embargoed" && form.releaseAt ? new Date(form.releaseAt).toISOString() : "",
    keyPoints: parsePressReleaseKeyPoints(form.keyPointsText),
  };
}

function toLocalDateTime(value: Date | string) {
  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}
