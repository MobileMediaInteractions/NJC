"use client";

import { useRef, useState, type DragEvent } from "react";
import { AlertTriangle, ArrowLeft, CheckCircle2, CloudUpload, Eye, ImageIcon, Loader2, Save, Send, Sparkles, Trash2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { validateStoryImage } from "@/lib/media-upload";
import { firstStoryError, storyInput, type StoryFieldErrors } from "@/lib/story-input";
import { generateWhyItMatters, WHY_IT_MATTERS_MAX_CHARACTERS } from "@/lib/why-it-matters";

const categories = [
  ["local", "Local News"], ["middlesex", "Middlesex County"], ["statehouse", "Statehouse Desk"], ["public-square", "Public Square"], ["opinion", "Garden State Forum"], ["sports", "Jersey Gridiron & Court"], ["jersey-laurels", "Jersey Laurels"], ["investigates", "Courier Watch"], ["weather", "Weather"], ["culture", "Arts & Culture"],
];

export interface StoryEditorInitialStory {
  id: string;
  headline: string;
  slug: string;
  dek: string;
  body: string[];
  whyItMatters: string | null;
  categorySlug: string;
  location: string;
  imageUrl: string | null;
  imageAlt: string | null;
  tags: string[];
  seoTitle: string | null;
  seoDescription: string | null;
  canonicalUrl: string | null;
  noIndex: boolean;
  isBreaking: boolean;
  status: "draft" | "review";
}

export function StoryEditor({
  datelines,
  canPublish,
  publicationTimezone,
  initialStory,
}: {
  datelines: string[];
  canPublish: boolean;
  publicationTimezone: string;
  initialStory?: StoryEditorInitialStory;
}) {
  const [headline, setHeadline] = useState(initialStory?.headline ?? "");
  const [slug, setSlug] = useState(initialStory?.slug ?? "");
  const [dek, setDek] = useState(initialStory?.dek ?? "");
  const [body, setBody] = useState(initialStory?.body.join("\n\n") ?? "");
  const [includeWhyItMatters, setIncludeWhyItMatters] = useState(Boolean(initialStory?.whyItMatters));
  const [category, setCategory] = useState(initialStory?.categorySlug ?? "middlesex");
  const [location, setLocation] = useState(initialStory?.location ?? datelines[0] ?? "New Brunswick");
  const [tags, setTags] = useState(initialStory?.tags.join(", ") ?? "");
  const [seoTitle, setSeoTitle] = useState(initialStory?.seoTitle ?? "");
  const [seoDescription, setSeoDescription] = useState(initialStory?.seoDescription ?? "");
  const [canonicalUrl, setCanonicalUrl] = useState(initialStory?.canonicalUrl ?? "");
  const [noIndex, setNoIndex] = useState(initialStory?.noIndex ?? false);
  const [breaking, setBreaking] = useState(initialStory?.isBreaking ?? false);
  const [useCustomPublishedAt, setUseCustomPublishedAt] = useState(false);
  const [publishedAt, setPublishedAt] = useState("");
  const [publishedAtRiskAcknowledged, setPublishedAtRiskAcknowledged] = useState(false);
  const [publishedAtChangeReason, setPublishedAtChangeReason] = useState("");
  const [imageUrl, setImageUrl] = useState(initialStory?.imageUrl ?? "");
  const [imageAlt, setImageAlt] = useState(initialStory?.imageAlt ?? "");
  const [imageName, setImageName] = useState(initialStory?.imageUrl ? "Current lead image" : "");
  const [uploadState, setUploadState] = useState<"idle" | "uploading" | "uploaded" | "error">("idle");
  const [uploadMessage, setUploadMessage] = useState("");
  const [isDraggingImage, setIsDraggingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [message, setMessage] = useState("");
  const [fieldErrors, setFieldErrors] = useState<StoryFieldErrors>({});
  const datelineOptions = location && !datelines.includes(location) ? [location, ...datelines] : datelines;
  const bodyParagraphs = body.split(/\n\n+/).map((item) => item.trim()).filter(Boolean);
  const generatedWhyItMatters = includeWhyItMatters
    ? generateWhyItMatters({ headline, dek, body: bodyParagraphs })
    : "";
  const wordCount = body.trim() ? body.trim().split(/\s+/).length : 0;

  async function save(status: "draft" | "review" | "published") {
    const categoryLabel = categories.find(([value]) => value === category)?.[1] ?? "Middlesex County";
    if (status === "published" && useCustomPublishedAt && !publishedAt) {
      const errors = { publishedAt: ["Choose the custom posted date and time."] };
      setFieldErrors(errors);
      setState("error");
      setMessage(firstStoryError(errors));
      focusFirstInvalidField(errors);
      return;
    }
    const parsedPublishedAt = publishedAt ? new Date(publishedAt) : null;
    if (status === "published" && useCustomPublishedAt && (!parsedPublishedAt || Number.isNaN(parsedPublishedAt.getTime()))) {
      const errors = { publishedAt: ["Enter a valid posted date and time."] };
      setFieldErrors(errors);
      setState("error");
      setMessage(firstStoryError(errors));
      focusFirstInvalidField(errors);
      return;
    }
    const input = { headline, slug, dek, body: bodyParagraphs, includeWhyItMatters, categorySlug: category, categoryLabel, location, imageUrl, imageAlt, tags: tags.split(",").map((item) => item.trim()).filter(Boolean), seoTitle, seoDescription, canonicalUrl, noIndex, status, isBreaking: breaking, publishedAt: status === "published" && useCustomPublishedAt ? parsedPublishedAt?.toISOString() ?? "" : "", publishedAtRiskAcknowledged: status === "published" && useCustomPublishedAt ? publishedAtRiskAcknowledged : false, publishedAtChangeReason: status === "published" && useCustomPublishedAt ? publishedAtChangeReason : "" };
    const validation = storyInput.safeParse(input);
    if (!validation.success) {
      const errors = validation.error.flatten().fieldErrors;
      setFieldErrors(errors);
      setState("error");
      setMessage(firstStoryError(errors));
      focusFirstInvalidField(errors);
      return;
    }

    setState("saving"); setMessage(""); setFieldErrors({});
    try {
      const response = await fetch(initialStory ? `/api/v1/studio/stories/${encodeURIComponent(initialStory.id)}` : "/api/v1/studio/stories", { method: initialStory ? "PUT" : "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(validation.data) });
      const payload = await response.json().catch(() => null);
      if (response.ok && payload?.data?.slug) {
        setState("saved");
        setMessage(status === "published" ? "Published successfully. Opening the live story…" : initialStory ? "Draft updated in the newsroom." : "Story saved to the newsroom.");
        window.location.assign(status === "published" ? `/story/${payload.data.slug}` : "/studio/stories");
      } else {
        const responseErrors = payload?.error?.details?.fieldErrors as StoryFieldErrors | undefined;
        if (responseErrors) {
          setFieldErrors(responseErrors);
          focusFirstInvalidField(responseErrors);
        }
        setState("error");
        setMessage(responseErrors ? firstStoryError(responseErrors) : (payload?.error?.message ?? `Could not save the story (${response.status}).`));
      }
    } catch {
      setState("error");
      setMessage("The newsroom service could not be reached.");
    }
  }

  async function uploadImage(file: File) {
    const validationError = validateStoryImage(file);
    if (validationError) {
      setUploadState("error");
      setUploadMessage(validationError);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setUploadState("uploading");
    setUploadMessage(`Uploading ${file.name}…`);
    const formData = new FormData();
    formData.set("file", file);

    try {
      const response = await fetch("/api/v1/studio/media", { method: "POST", body: formData });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.data?.url) {
        setUploadState("error");
        setUploadMessage(payload?.error?.message ?? `The image could not be uploaded (${response.status}).`);
        return;
      }

      setImageUrl(payload.data.url);
      setImageAlt("");
      setImageName(file.name);
      setUploadState("uploaded");
      setUploadMessage("Image uploaded. Add descriptive alt text before publishing.");
      setFieldErrors((current) => ({ ...current, imageUrl: undefined }));
      requestAnimationFrame(() => document.getElementById("image-alt")?.focus());
    } catch {
      setUploadState("error");
      setUploadMessage("The media service could not be reached. Please try again.");
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function handleImageDrop(event: DragEvent<HTMLButtonElement>) {
    event.preventDefault();
    setIsDraggingImage(false);
    const file = event.dataTransfer.files?.[0];
    if (file) void uploadImage(file);
  }

  function removeImage() {
    setImageUrl("");
    setImageAlt("");
    setImageName("");
    setUploadState("idle");
    setUploadMessage("");
    setFieldErrors((current) => ({ ...current, imageUrl: undefined, imageAlt: undefined }));
  }

  function focusFirstInvalidField(errors: StoryFieldErrors) {
    const firstField = Object.keys(errors).find((key) => errors[key]?.length);
    if (!firstField) return;
    const ids: Record<string, string> = { slug: "headline", categorySlug: "category", canonicalUrl: "canonical-url", imageUrl: "image-upload", imageAlt: "image-alt", publishedAt: "published-at", publishedAtRiskAcknowledged: "published-at-risk", publishedAtChangeReason: "published-at-reason" };
    requestAnimationFrame(() => document.getElementById(ids[firstField] ?? firstField)?.focus());
  }

  function fieldError(name: string) {
    return fieldErrors[name]?.[0];
  }

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center"><div><Button variant="ghost" size="sm" asChild className="mb-2 -ml-3 text-muted-foreground"><Link href="/studio/stories"><ArrowLeft /> All stories</Link></Button><h1 className="text-3xl font-bold tracking-tight">{initialStory ? "Edit story" : "Create story"}</h1><p className="mt-1 text-sm text-muted-foreground">{initialStory ? "Continue writing, save another draft, or submit the updated story for review." : "Draft, collaborate, review and publish from one workspace."}</p></div><div className="flex flex-wrap gap-2"><Button variant="outline"><Eye /> Preview</Button><Button variant="outline" onClick={() => save("draft")} disabled={state === "saving" || uploadState === "uploading"}><Save /> Save draft</Button><Button onClick={() => save("review")} disabled={state === "saving" || uploadState === "uploading"}>{state === "saving" ? <Loader2 className="animate-spin" /> : <Send />} Send to review</Button></div></div>
      {message && <div className={`mb-5 flex items-center gap-2 rounded-md border p-3 text-sm ${state === "error" ? "border-destructive/30 bg-destructive/10 text-destructive" : "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"}`}><CheckCircle2 className="size-4" />{message}</div>}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <Card><CardHeader><CardTitle>Story</CardTitle><CardDescription>Required fields are checked before the story enters review.</CardDescription></CardHeader><CardContent className="space-y-6">
          <div className="space-y-2"><div className="flex justify-between"><Label htmlFor="headline">Headline <span className="text-destructive">*</span></Label><span className="text-xs text-muted-foreground">{headline.length}/180</span></div><Textarea id="headline" value={headline} onChange={(e) => { const value = e.target.value; setHeadline(value); setSlug(value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")); }} placeholder="Write a clear, specific local headline" className="min-h-24 resize-none text-xl font-semibold" maxLength={180} aria-invalid={Boolean(fieldError("headline") || fieldError("slug"))} /><p className="text-xs text-muted-foreground">/{slug || "story-slug"}</p>{(fieldError("headline") || fieldError("slug")) && <p className="text-xs text-destructive">{fieldError("headline") || fieldError("slug")}</p>}</div>
          <div className="space-y-2"><div className="flex justify-between"><Label htmlFor="dek">Summary <span className="text-destructive">*</span></Label><span className="text-xs text-muted-foreground">{dek.length}/320</span></div><Textarea id="dek" value={dek} onChange={(e) => setDek(e.target.value)} placeholder="One or two sentences explaining what happened and why it matters" maxLength={320} aria-invalid={Boolean(fieldError("dek"))} />{fieldError("dek") && <p className="text-xs text-destructive">{fieldError("dek")}</p>}</div>
          <Separator />
          <div className="space-y-2"><div className="flex items-center justify-between"><Label htmlFor="body">Story body <span className="text-destructive">*</span></Label><Button variant="ghost" size="sm" className="text-primary"><Sparkles /> Suggest structure</Button></div><Textarea id="body" value={body} onChange={(e) => setBody(e.target.value)} placeholder="Write the story here. Separate paragraphs with a blank line." className="min-h-[34rem] resize-y leading-7" aria-invalid={Boolean(fieldError("body"))} /><p className="text-xs text-muted-foreground">{wordCount} words · about {Math.max(1, Math.ceil(wordCount / 220))} min read</p>{fieldError("body") && <p className="text-xs text-destructive">{fieldError("body")}</p>}</div>
        </CardContent></Card>
        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle className="text-base">Publishing</CardTitle></CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2"><Label>Section</Label><Select value={category} onValueChange={setCategory}><SelectTrigger id="category"><SelectValue /></SelectTrigger><SelectContent>{categories.map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-2">
                <Label htmlFor="location">Dateline <span className="text-destructive">*</span></Label>
                <Select value={location} onValueChange={setLocation}>
                  <SelectTrigger id="location" aria-invalid={Boolean(fieldError("location"))}><SelectValue placeholder="Choose a dateline" /></SelectTrigger>
                  <SelectContent>{datelineOptions.map((dateline) => <SelectItem key={dateline} value={dateline}>{dateline}</SelectItem>)}</SelectContent>
                </Select>
                {fieldError("location") && <p className="text-xs text-destructive">{fieldError("location")}</p>}
                <p className="text-xs text-muted-foreground">Edit approved choices in Studio Settings → Editorial.</p>
              </div>
              <div className="space-y-2"><Label htmlFor="tags">Tags</Label><Input id="tags" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="housing, city hall" /></div>
              <Separator />
              <div className="flex items-center justify-between"><div><Label htmlFor="breaking">Breaking news</Label><p className="mt-1 text-xs text-muted-foreground">Adds urgent public treatment.</p></div><Switch id="breaking" checked={breaking} onCheckedChange={setBreaking} /></div>
              {canPublish ? (
                <>
                  <Separator />
                  <div className="flex items-center justify-between gap-4">
                    <div><Label htmlFor="custom-published-at">Custom posted time</Label><p className="mt-1 text-xs text-muted-foreground">Normally the publish action records the current time.</p></div>
                    <Switch id="custom-published-at" checked={useCustomPublishedAt} onCheckedChange={(checked) => { setUseCustomPublishedAt(checked); if (!checked) { setPublishedAt(""); setPublishedAtRiskAcknowledged(false); setPublishedAtChangeReason(""); } }} />
                  </div>
                  {useCustomPublishedAt ? (
                    <div className="space-y-4 rounded-lg border-2 border-destructive/60 bg-destructive/10 p-4">
                      <div className="flex gap-3"><AlertTriangle className="mt-0.5 size-5 shrink-0 text-destructive" /><div><p className="font-bold text-destructive">Changing the posted time carries reporting risk</p><p className="mt-1 text-xs leading-5 text-muted-foreground">Backdating can mislead readers, alter feeds and search ordering, and complicate corrections or legal records. Use only for a documented editorial reason. Future times must use scheduling.</p></div></div>
                      <div className="space-y-2"><Label htmlFor="published-at">Displayed posted date and time</Label><Input id="published-at" type="datetime-local" value={publishedAt} onChange={(event) => setPublishedAt(event.target.value)} aria-invalid={Boolean(fieldError("publishedAt"))} /><p className="text-xs text-muted-foreground">Entered in your device timezone; publication timezone is {publicationTimezone}.</p>{fieldError("publishedAt") ? <p className="text-xs text-destructive">{fieldError("publishedAt")}</p> : null}</div>
                      <div className="space-y-2"><Label htmlFor="published-at-reason">Required editorial reason</Label><Textarea id="published-at-reason" value={publishedAtChangeReason} onChange={(event) => setPublishedAtChangeReason(event.target.value)} minLength={10} maxLength={500} placeholder="Explain the archival, migration or correction reason." aria-invalid={Boolean(fieldError("publishedAtChangeReason"))} />{fieldError("publishedAtChangeReason") ? <p className="text-xs text-destructive">{fieldError("publishedAtChangeReason")}</p> : null}</div>
                      <label id="published-at-risk" className="flex cursor-pointer items-start gap-3 text-xs leading-5"><input type="checkbox" checked={publishedAtRiskAcknowledged} onChange={(event) => setPublishedAtRiskAcknowledged(event.target.checked)} className="mt-1 size-4 accent-red-600" /><span>I understand this changes the public record and accept responsibility for documenting why it is necessary.</span></label>
                      {fieldError("publishedAtRiskAcknowledged") ? <p className="text-xs text-destructive">{fieldError("publishedAtRiskAcknowledged")}</p> : null}
                    </div>
                  ) : null}
                  <Button className="w-full" onClick={() => save("published")} disabled={state === "saving" || uploadState === "uploading"}>{state === "saving" ? <><Loader2 className="animate-spin" /> Publishing…</> : "Publish now"}</Button>
                </>
              ) : <p className="rounded-md border bg-muted/30 p-3 text-xs text-muted-foreground">Your role can draft and submit stories for review. A publisher sets the public posted time.</p>}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-base">Reader context</CardTitle><CardDescription>Optional context generated only from this story&apos;s verified copy.</CardDescription></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between gap-4"><div><Label htmlFor="why-it-matters">Why it matters</Label><p className="mt-1 text-xs text-muted-foreground">Adds the contextual callout beside the article.</p></div><Switch id="why-it-matters" checked={includeWhyItMatters} onCheckedChange={setIncludeWhyItMatters} /></div>
              {includeWhyItMatters ? <div className="border-t-4 border-brand-yellow bg-brand-navy p-4 text-white"><div className="flex items-center justify-between gap-3"><p className="eyebrow text-brand-yellow">Why it matters</p><span className="text-[0.65rem] text-white/50">{generatedWhyItMatters.length}/{WHY_IT_MATTERS_MAX_CHARACTERS}</span></div><p className="mt-3 text-sm leading-6 text-white/72">{generatedWhyItMatters || "Finish the summary and article copy to generate this callout."}</p></div> : null}
              <p className="text-xs leading-5 text-muted-foreground">The server regenerates the final wording on every save, caps it at {WHY_IT_MATTERS_MAX_CHARACTERS} characters and never invents information outside the article.</p>
            </CardContent>
          </Card>
          <Card><CardHeader><CardTitle className="text-base">Search appearance</CardTitle><CardDescription>Defaults are generated from the story. Override only when the search result needs clearer wording.</CardDescription></CardHeader><CardContent className="space-y-4"><div className="space-y-2"><div className="flex justify-between"><Label htmlFor="seo-title">SEO title</Label><span className="text-xs text-muted-foreground">{seoTitle.length}/70</span></div><Input id="seo-title" value={seoTitle} onChange={(event) => setSeoTitle(event.target.value)} maxLength={70} placeholder={headline || "Uses headline by default"} /></div><div className="space-y-2"><div className="flex justify-between"><Label htmlFor="seo-description">Search description</Label><span className="text-xs text-muted-foreground">{seoDescription.length}/180</span></div><Textarea id="seo-description" value={seoDescription} onChange={(event) => setSeoDescription(event.target.value)} maxLength={180} placeholder={dek || "Uses summary by default"} /></div><div className="space-y-2"><Label htmlFor="canonical-url">Canonical URL</Label><Input id="canonical-url" type="url" value={canonicalUrl} onChange={(event) => setCanonicalUrl(event.target.value)} placeholder="Leave blank for this story URL" aria-invalid={Boolean(fieldError("canonicalUrl"))} />{fieldError("canonicalUrl") && <p className="text-xs text-destructive">{fieldError("canonicalUrl")}</p>}</div><Separator /><div className="flex items-center justify-between gap-4"><div><Label htmlFor="no-index">Exclude from search</Label><p className="mt-1 text-xs text-muted-foreground">Adds noindex and removes the story from sitemaps.</p></div><Switch id="no-index" checked={noIndex} onCheckedChange={setNoIndex} /></div></CardContent></Card>
          <Card><CardHeader><CardTitle className="text-base">Lead media</CardTitle><CardDescription>JPEG, PNG or WebP up to 4 MB.</CardDescription></CardHeader><CardContent className="space-y-4">
            <input ref={fileInputRef} id="image-upload" type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadImage(file); }} disabled={uploadState === "uploading"} />
            {imageUrl ? <div className="space-y-4"><div className="relative aspect-video overflow-hidden rounded-md border bg-muted"><Image src={imageUrl} alt={imageAlt || "Uploaded lead image preview"} fill sizes="320px" className="object-cover" /></div><div className="flex items-center justify-between gap-3"><div className="min-w-0"><p className="truncate text-sm font-medium">{imageName}</p><p className="text-xs text-muted-foreground">Ready to use</p></div><div className="flex gap-2"><Button type="button" size="sm" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={uploadState === "uploading"}><CloudUpload /> Replace</Button><Button type="button" size="icon-sm" variant="ghost" onClick={removeImage} disabled={uploadState === "uploading"} aria-label="Remove image"><Trash2 /></Button></div></div><div className="space-y-2"><Label htmlFor="image-alt">Image description <span className="text-destructive">*</span></Label><Textarea id="image-alt" value={imageAlt} onChange={(event) => setImageAlt(event.target.value)} maxLength={240} placeholder="Describe what is visible for readers using screen readers" aria-invalid={Boolean(fieldError("imageAlt"))} />{fieldError("imageAlt") ? <p className="text-xs text-destructive">{fieldError("imageAlt")}</p> : <p className="text-xs text-muted-foreground">Describe people, place and relevant action; do not repeat the headline.</p>}</div></div> : <button type="button" onClick={() => fileInputRef.current?.click()} onDragEnter={(event) => { event.preventDefault(); setIsDraggingImage(true); }} onDragOver={(event) => { event.preventDefault(); event.dataTransfer.dropEffect = "copy"; setIsDraggingImage(true); }} onDragLeave={(event) => { event.preventDefault(); setIsDraggingImage(false); }} onDrop={handleImageDrop} disabled={uploadState === "uploading"} className={`flex min-h-36 w-full flex-col items-center justify-center rounded-md border border-dashed text-center transition-colors disabled:cursor-wait disabled:opacity-70 ${isDraggingImage ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground hover:border-primary hover:text-primary"}`}>{uploadState === "uploading" ? <Loader2 className="size-6 animate-spin" /> : <ImageIcon className="size-6" />}<span className="mt-2 text-sm font-medium">{uploadState === "uploading" ? "Uploading image…" : isDraggingImage ? "Drop image to upload" : "Choose or drop an image"}</span><span className="mt-1 text-xs">Select a file from this device</span></button>}
            {uploadMessage ? <p className={`text-xs ${uploadState === "error" ? "text-destructive" : "text-muted-foreground"}`} role="status">{uploadMessage}</p> : null}
          </CardContent></Card>
          <Card><CardContent className="p-5"><div className="flex items-center justify-between"><span className="text-sm font-medium">Workflow</span><Badge variant="secondary" className="capitalize">{initialStory?.status ?? "draft"}</Badge></div><div className="mt-4 flex items-center gap-2 text-[0.7rem] text-muted-foreground"><span className="size-2 rounded-full bg-primary" /> Draft <span>→</span> Review <span>→</span> Scheduled <span>→</span> Published</div></CardContent></Card>
        </div>
      </div>
    </div>
  );
}
