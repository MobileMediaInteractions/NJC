"use client";

import { useState } from "react";
import { upload } from "@vercel/blob/client";
import { Archive, BookImage, BookOpen, FileUp, Loader2, Plus, Save, Send, Trash2 } from "lucide-react";
import type { mediaAssets, studioMagazines } from "@harborline/backend/schema";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { MagazineFlipbook } from "@/components/studio/magazine-flipbook";
import type { StudioMagazinePage } from "@harborline/backend/schema";
import { MAX_BOOKWRIGHT_PDF_BYTES } from "@/lib/mag-engine";

type Issue = typeof studioMagazines.$inferSelect;
type ImageAsset = Pick<typeof mediaAssets.$inferSelect, "id" | "filename" | "blobUrl" | "altText">;

export function MagEngineManager({ initialIssues, images }: { initialIssues: Issue[]; images: ImageAsset[] }) {
  const [issues, setIssues] = useState(initialIssues);
  const [selectedId, setSelectedId] = useState(initialIssues[0]?.id ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [preview, setPreview] = useState<{ issueId: string; revision: number; title: string; pages: StudioMagazinePage[]; documentUrl?: string } | null>(null);
  const [previewRevision, setPreviewRevision] = useState(0);
  const selected = issues.find((issue) => issue.id === selectedId) ?? null;

  function openPreview(issue: Issue) {
    const revision = previewRevision + 1;
    setPreviewRevision(revision);
    setPreview({
      issueId: issue.id,
      revision,
      title: issue.title,
      pages: issue.pages.map((page) => ({ ...page })),
      documentUrl: issue.sourceKind === "bookwright-pdf" ? `/api/v1/studio/mag-engine/${issue.id}/document` : undefined,
    });
  }

  async function createBlank() {
    const title = window.prompt("Magazine title");
    if (!title?.trim()) return;
    setBusy(true); setError(""); setMessage("");
    try {
      const response = await fetch("/api/v1/studio/mag-engine", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ title, description: "", pages: [newPage("Cover story")] }) });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error?.message ?? "The new issue could not be created.");
      setIssues((current) => [payload.data as Issue, ...current]);
      setSelectedId(payload.data.id);
      setMessage("Blank magazine created. Edit its pages and save when ready.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not create the magazine."); }
    finally { setBusy(false); }
  }

  async function importBookwright(file: File | undefined) {
    if (!file) return;
    if (file.type !== "application/pdf" || !file.name.toLowerCase().endsWith(".pdf")) { setError("Choose the PDF export from Blurb BookWright."); return; }
    if (file.size > MAX_BOOKWRIGHT_PDF_BYTES) { setError("The PDF is larger than the 2 GB upload limit."); return; }
    const title = window.prompt("Issue title", file.name.replace(/\.pdf$/i, ""));
    if (!title?.trim()) return;
    setBusy(true); setError(""); setMessage("Uploading privately…");
    try {
      const safeFilename = file.name.replace(/[^A-Za-z0-9._-]/g, "_").slice(-180) || "bookwright-export.pdf";
      const result = await upload(`mag-engine/${crypto.randomUUID()}-${safeFilename}`, file, { access: "private", handleUploadUrl: "/api/v1/studio/mag-engine/upload", clientPayload: JSON.stringify({ filename: safeFilename }) });
      const response = await fetch("/api/v1/studio/mag-engine", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ title, description: "Imported from a Blurb BookWright PDF export.", sourcePathname: result.pathname }) });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error?.message ?? "The BookWright PDF was uploaded but the issue record could not be created.");
      setIssues((current) => [payload.data as Issue, ...current]);
      setSelectedId(payload.data.id);
      setMessage("BookWright PDF imported to private Studio storage. Open preview to check the page turn and verify the print export has no unwanted marks.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "The PDF could not be imported."); }
    finally { setBusy(false); }
  }

  function updateSelected(update: (issue: Issue) => Issue) {
    if (!selected) return;
    setIssues((current) => current.map((issue) => issue.id === selected.id ? update(issue) : issue));
  }

  async function saveIssue(nextStatus = selected?.status ?? "draft") {
    if (!selected) return;
    setBusy(true); setError(""); setMessage("");
    try {
      const response = await fetch(`/api/v1/studio/mag-engine/${selected.id}`, { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ title: selected.title, description: selected.description, pages: selected.pages, status: nextStatus }) });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error?.message ?? "The issue could not be saved.");
      setIssues((current) => current.map((issue) => issue.id === selected.id ? payload.data as Issue : issue));
      setMessage(nextStatus === "review" ? "Saved and sent to editorial review." : nextStatus === "approved" ? "Issue approved in Studio." : "Magazine saved.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "The issue could not be saved."); }
    finally { setBusy(false); }
  }

  function addPage() {
    updateSelected((issue) => ({ ...issue, pages: [...issue.pages, newPage()] }));
  }

  function updatePage(pageId: string, patch: Partial<StudioMagazinePage>) {
    updateSelected((issue) => ({ ...issue, pages: issue.pages.map((page) => page.id === pageId ? { ...page, ...patch } : page), pageCount: issue.pages.length }));
  }

  function removePage(pageId: string) {
    updateSelected((issue) => ({ ...issue, pages: issue.pages.filter((page) => page.id !== pageId), pageCount: Math.max(0, issue.pages.length - 1) }));
  }

  return <div className="mag-engine space-y-5">
    <header className="mag-engine-hero rounded-2xl p-6 sm:p-8">
      <div className="flex flex-wrap items-end justify-between gap-5"><div className="max-w-2xl"><p className="text-xs font-bold uppercase tracking-[.2em] text-emerald-800 dark:text-emerald-200">Studio publishing tool</p><h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">MagEngine</h1><p className="mt-3 text-sm leading-6 text-muted-foreground">Design editorial pages or privately import a Blurb BookWright PDF. Preview each issue with StPageFlip before it moves through newsroom review.</p></div><div className="flex flex-wrap gap-2"><Button onClick={() => void createBlank()} disabled={busy}><Plus /> New magazine</Button><label className="inline-flex h-9 cursor-pointer items-center justify-center gap-2 rounded-md border border-input bg-background px-4 text-sm font-medium shadow-xs hover:bg-accent"><FileUp className="size-4" /> Import BookWright PDF<input className="sr-only" type="file" accept="application/pdf,.pdf" disabled={busy} onChange={(event) => { void importBookwright(event.target.files?.[0]); event.currentTarget.value = ""; }} /></label></div></div>
    </header>
    {error ? <div role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-800 dark:text-red-100">{error}</div> : null}
    {message ? <div role="status" className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm">{message}</div> : null}
    <div className="grid gap-5 xl:grid-cols-[18rem_minmax(0,1fr)]">
      <Card className="h-fit"><CardHeader><CardTitle>Magazine shelf</CardTitle><CardDescription>{issues.length} issue{issues.length === 1 ? "" : "s"} · drafts remain private</CardDescription></CardHeader><CardContent className="space-y-2">{issues.length ? issues.map((issue) => <button key={issue.id} type="button" onClick={() => setSelectedId(issue.id)} className={`w-full rounded-lg border p-3 text-left transition ${issue.id === selectedId ? "border-emerald-700 bg-emerald-900/5 dark:bg-emerald-100/10" : "border-border hover:bg-muted/40"}`}><span className="flex items-center justify-between gap-2"><span className="truncate text-sm font-semibold">{issue.title}</span><Badge variant={issue.status === "approved" ? "default" : "secondary"} className="capitalize">{issue.status}</Badge></span><span className="mt-1 block text-xs text-muted-foreground">{issue.sourceKind === "bookwright-pdf" ? "BookWright PDF" : `${issue.pageCount} authored pages`}</span></button>) : <div className="rounded-xl border border-dashed p-5 text-center"><BookImage className="mx-auto size-7 text-muted-foreground" /><p className="mt-2 text-sm font-semibold">Your shelf is empty</p><p className="mt-1 text-xs leading-5 text-muted-foreground">Create an issue or import a BookWright PDF.</p></div>}</CardContent></Card>
      {selected ? <div className="space-y-5">
        <Card><CardHeader><div className="flex flex-wrap items-start justify-between gap-3"><div><CardTitle className="flex items-center gap-2"><BookOpen className="size-5" /> Issue workspace</CardTitle><CardDescription>{selected.sourceKind === "bookwright-pdf" ? "Source PDF is private; only authorized Studio users can preview it." : "Compose pages with reusable newsroom images and text."}</CardDescription></div><Badge variant="outline" className="capitalize">{selected.sourceKind === "bookwright-pdf" ? "Blurb BookWright" : "Original issue"}</Badge></div></CardHeader><CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2"><Field label="Magazine title"><Input value={selected.title} onChange={(e) => updateSelected((issue) => ({ ...issue, title: e.target.value }))} maxLength={140} /></Field><Field label="Issue description"><Input value={selected.description} onChange={(e) => updateSelected((issue) => ({ ...issue, description: e.target.value }))} maxLength={1_000} /></Field></div>
          <div className="flex flex-wrap gap-2"><Button variant="outline" onClick={() => void saveIssue("draft")} disabled={busy}><Save /> Save draft</Button><Button variant="outline" onClick={() => void saveIssue("review")} disabled={busy}><Send /> Send to review</Button>{selected.status === "review" ? <Button onClick={() => void saveIssue("approved")} disabled={busy}>Approve issue</Button> : null}{selected.status !== "archived" ? <Button variant="ghost" onClick={() => void saveIssue("archived")} disabled={busy}><Archive /> Archive</Button> : null}{busy ? <span className="inline-flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" /> Working…</span> : null}</div>
        </CardContent></Card>
        <div className="flex flex-wrap items-center gap-2"><Button variant="outline" onClick={() => openPreview(selected)}><BookOpen /> {preview?.issueId === selected.id ? "Refresh page-turn preview" : "Open page-turn preview"}</Button><span className="text-xs text-muted-foreground">Preview updates when you request it; typing in a page will not restart a large PDF render.</span></div>
        {preview?.issueId === selected.id ? <MagazineFlipbook key={`${preview.issueId}-${preview.revision}`} title={preview.title} pages={preview.pages} imageAssets={images} documentUrl={preview.documentUrl} /> : null}
        {selected.sourceKind === "bookwright-pdf" ? <>
          <Card><CardContent className="flex min-h-40 items-center justify-center p-6 text-center"><div><BookOpen className="mx-auto size-8 text-muted-foreground" /><p className="mt-3 font-semibold">Imported BookWright edition</p><p className="mt-1 text-sm text-muted-foreground">The original PDF is preserved privately. Open the page-turn preview above to inspect it.</p></div></CardContent></Card>
        </> : <>
          <Card><CardHeader><div className="flex flex-wrap items-center justify-between gap-3"><div><CardTitle>Page composition</CardTitle><CardDescription>Plain text is kept structured; images come from the approved media library.</CardDescription></div><Button variant="outline" onClick={addPage}><Plus /> Add page</Button></div></CardHeader><CardContent className="space-y-3">{selected.pages.map((page, index) => <section key={page.id} className="grid gap-3 rounded-xl border p-4 md:grid-cols-[minmax(0,1fr)_14rem_auto]"><div className="space-y-3"><Field label={`Page ${index + 1} kicker`}><Input value={page.kicker} onChange={(e) => updatePage(page.id, { kicker: e.target.value })} maxLength={80} /></Field><Field label="Page title"><Input value={page.title} onChange={(e) => updatePage(page.id, { title: e.target.value })} maxLength={180} /></Field><Field label="Story copy"><Textarea rows={5} value={page.body} onChange={(e) => updatePage(page.id, { body: e.target.value })} maxLength={8_000} /></Field></div><div className="space-y-3"><Field label="Image from media library"><select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={page.imageAssetId ?? ""} onChange={(e) => updatePage(page.id, { imageAssetId: e.target.value || undefined })}><option value="">No image</option>{images.map((image) => <option key={image.id} value={image.id}>{image.filename}</option>)}</select></Field>{page.imageAssetId ? <p className="text-xs text-muted-foreground">{images.find((image) => image.id === page.imageAssetId)?.altText || "Add alternative text in the media library for accessibility."}</p> : <p className="text-xs text-muted-foreground">Upload images in Media Library; choose a public newsroom image here.</p>}</div><Button variant="ghost" size="icon" onClick={() => removePage(page.id)} aria-label={`Remove page ${index + 1}`} disabled={selected.pages.length <= 1}><Trash2 /></Button></section>)}{!selected.pages.length ? <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">No pages yet. Add your first page.</p> : null}</CardContent></Card>
        </>}
      </div> : <Card className="grid min-h-80 place-items-center"><CardContent className="text-center"><BookImage className="mx-auto size-9 text-muted-foreground" /><p className="mt-3 text-lg font-semibold">Choose an issue to work on</p><p className="mt-1 text-sm text-muted-foreground">Import an export from Blurb BookWright or start a fresh editorial layout.</p></CardContent></Card>}
    </div>
  </div>;
}

function newPage(title = "") { return { id: crypto.randomUUID(), kicker: "", title, body: "" }; }
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="block space-y-2"><span className="text-sm font-medium">{label}</span>{children}</label>; }
