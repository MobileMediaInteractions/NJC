"use client";

import { useRef, useState, type DragEvent } from "react";
import dynamic from "next/dynamic";
import { ArrowLeft, CalendarClock, CheckCircle2, CloudUpload, Columns3, Eye, FilePenLine, ImageIcon, Loader2, Save, Send, Trash2 } from "lucide-react";
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
import { EditableList } from "@/components/studio/editable-list";
import { StoryRichContent } from "@/components/story-rich-content";
import { validateStoryImage } from "@/lib/media-upload";
import { toLocalDateTimeInput } from "@/lib/local-datetime";
import { firstStoryError, storyInput, type StoryFieldErrors } from "@/lib/story-input";
import type { StoryBylineOption } from "@/lib/pseudonyms";
import { createPlainStoryRichTextDocument } from "@/lib/story-rich-text";
import { generateWhyItMatters, WHY_IT_MATTERS_MAX_CHARACTERS } from "@/lib/why-it-matters";
import type { StoryRichTextDocument } from "@harborline/contracts";

const RichStoryEditor = dynamic(
  () => import("@/components/studio/story-rich-editor").then((module) => module.StoryRichEditor),
  { ssr: false, loading: () => <div className="flex min-h-[38rem] items-center justify-center rounded-xl border"><Loader2 className="size-6 animate-spin text-muted-foreground" /><span className="ml-2 text-sm text-muted-foreground">Loading the visual editor…</span></div> },
);

const categories = [
  ["local", "Local News"], ["middlesex", "Middlesex County"], ["statehouse", "Statehouse Desk"], ["public-square", "Public Square"], ["opinion", "Garden State Forum"], ["sports", "Jersey Gridiron & Court"], ["jersey-laurels", "Jersey Laurels"], ["investigates", "Courier Watch"], ["weather", "Weather"], ["culture", "Arts & Culture"],
];

export interface StoryEditorInitialStory {
  id: string;
  headline: string;
  slug: string;
  dek: string;
  body: string[];
  richBody: StoryRichTextDocument | null;
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
  bylineMode: "account" | "pseudonym";
  status: "draft" | "review" | "scheduled" | "published";
  scheduledAt: string | null;
  isActive: boolean;
}

export function StoryEditor({
  datelines,
  publicationTimezone,
  bylineOptions,
  pseudonymsEnabled,
  richStoryEditorEnabled,
  richStoryEditorDefaultMode,
  initialStory,
}: {
  datelines: string[];
  publicationTimezone: string;
  bylineOptions: StoryBylineOption[];
  pseudonymsEnabled: boolean;
  richStoryEditorEnabled: boolean;
  richStoryEditorDefaultMode: "write" | "split" | "preview";
  initialStory?: StoryEditorInitialStory;
}) {
  const [headline, setHeadline] = useState(initialStory?.headline ?? "");
  const [slug, setSlug] = useState(initialStory?.slug ?? "");
  const [dek, setDek] = useState(initialStory?.dek ?? "");
  const [body, setBody] = useState(initialStory?.body.join("\n\n") ?? "");
  const [richBody, setRichBody] = useState<StoryRichTextDocument>(() =>
    initialStory?.richBody ?? createPlainStoryRichTextDocument(initialStory?.body ?? []),
  );
  const [visualEditing, setVisualEditing] = useState(richStoryEditorEnabled);
  const [composerMode, setComposerMode] = useState<"write" | "split" | "preview">(
    richStoryEditorDefaultMode,
  );
  const [includeWhyItMatters, setIncludeWhyItMatters] = useState(Boolean(initialStory?.whyItMatters));
  const [category, setCategory] = useState(initialStory?.categorySlug ?? "middlesex");
  const [location, setLocation] = useState(initialStory?.location ?? datelines[0] ?? "New Brunswick");
  const [tags, setTags] = useState(initialStory?.tags ?? []);
  const [seoTitle, setSeoTitle] = useState(initialStory?.seoTitle ?? "");
  const [seoDescription, setSeoDescription] = useState(initialStory?.seoDescription ?? "");
  const [canonicalUrl, setCanonicalUrl] = useState(initialStory?.canonicalUrl ?? "");
  const [noIndex, setNoIndex] = useState(initialStory?.noIndex ?? false);
  const [breaking, setBreaking] = useState(initialStory?.isBreaking ?? false);
  const [schedulePlanned, setSchedulePlanned] = useState(
    Boolean(initialStory?.scheduledAt),
  );
  const [scheduledAt, setScheduledAt] = useState(() =>
    toLocalDateTimeInput(initialStory?.scheduledAt),
  );
  const [bylineMode, setBylineMode] = useState<"account" | "pseudonym">(
    initialStory?.bylineMode ?? "account",
  );
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
  const accountByline = bylineOptions.find((option) => option.mode === "account");
  const pseudonymByline = bylineOptions.find((option) => option.mode === "pseudonym");
  const selectedByline =
    bylineOptions.find((option) => option.mode === bylineMode) ?? accountByline;

  async function save(status: "draft" | "review") {
    const categoryLabel = categories.find(([value]) => value === category)?.[1] ?? "Middlesex County";
    const parsedScheduledAt =
      schedulePlanned && scheduledAt ? new Date(scheduledAt) : null;
    if (
      schedulePlanned &&
      (!parsedScheduledAt || Number.isNaN(parsedScheduledAt.getTime()))
    ) {
      const errors = {
        scheduledAt: ["Choose a valid planned publication date and time."],
      };
      setFieldErrors(errors);
      setState("error");
      setMessage(firstStoryError(errors));
      focusFirstInvalidField(errors);
      return;
    }
    const input = { headline, slug, dek, body: bodyParagraphs, richBody: richStoryEditorEnabled ? richBody : null, includeWhyItMatters, categorySlug: category, categoryLabel, location, imageUrl, imageAlt, tags, seoTitle, seoDescription, canonicalUrl, noIndex, bylineMode, status, isBreaking: breaking, scheduledAt: parsedScheduledAt?.toISOString() ?? "", publishedAt: "", publishedAtRiskAcknowledged: false, publishedAtChangeReason: "" };
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
        const liveRevision = initialStory?.status === "published";
        setMessage(
          liveRevision
            ? "Update submitted for independent approval."
            : status === "review"
              ? "Story submitted for review."
              : initialStory
                ? "Draft updated in the newsroom."
                : "Draft created in the newsroom.",
        );
        window.location.assign(
          status === "review" || liveRevision
            ? `/studio/stories/${payload.data.id}`
            : "/studio/stories",
        );
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
    const ids: Record<string, string> = { slug: "headline", categorySlug: "category", canonicalUrl: "canonical-url", imageUrl: "image-upload", imageAlt: "image-alt", scheduledAt: "planned-publication-at" };
    requestAnimationFrame(() => document.getElementById(ids[firstField] ?? firstField)?.focus());
  }

  function fieldError(name: string) {
    return fieldErrors[name]?.[0];
  }

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center"><div><Button variant="ghost" size="sm" asChild className="mb-2 -ml-3 text-muted-foreground"><Link href="/studio/stories"><ArrowLeft /> All stories</Link></Button><h1 className="text-3xl font-bold tracking-tight">{initialStory?.status === "published" ? "Propose live-story update" : initialStory ? "Edit story" : "Create story"}</h1><p className="mt-1 text-sm text-muted-foreground">{initialStory?.status === "published" ? "The live article stays unchanged until a different publisher approves this comparison." : initialStory ? initialStory.status !== "draft" ? "Any pre-publication change returns this story to Draft so it can be reviewed again." : "Continue writing or submit this saved draft for editorial review." : "Every story starts as a draft. Save it first, then submit it for review."}</p></div><div className="flex flex-wrap gap-2"><Button variant="outline" onClick={() => save("draft")} disabled={state === "saving" || uploadState === "uploading"}>{state === "saving" ? <Loader2 className="animate-spin" /> : <Save />} {initialStory?.status === "published" ? "Submit update for approval" : initialStory && initialStory.status !== "draft" ? "Save changes as draft" : "Save draft"}</Button>{initialStory?.status === "draft" ? <Button onClick={() => save("review")} disabled={state === "saving" || uploadState === "uploading"}>{state === "saving" ? <Loader2 className="animate-spin" /> : <Send />} Send to review</Button> : null}</div></div>
      {message && <div className={`mb-5 flex items-center gap-2 rounded-md border p-3 text-sm ${state === "error" ? "border-destructive/30 bg-destructive/10 text-destructive" : "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"}`}><CheckCircle2 className="size-4" />{message}</div>}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <Card><CardHeader><CardTitle>Story</CardTitle><CardDescription>Required fields are checked before the story enters review.</CardDescription></CardHeader><CardContent className="space-y-6">
          <div className="space-y-2"><div className="flex justify-between"><Label htmlFor="headline">Headline <span className="text-destructive">*</span></Label><span className="text-xs text-muted-foreground">{headline.length}/180</span></div><Textarea id="headline" value={headline} onChange={(e) => { const value = e.target.value; setHeadline(value); if (initialStory?.status !== "published") setSlug(value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")); }} placeholder="Write a clear, specific local headline" className="min-h-24 resize-none text-xl font-semibold" maxLength={180} aria-invalid={Boolean(fieldError("headline") || fieldError("slug"))} /><p className="text-xs text-muted-foreground">/{slug || "story-slug"}{initialStory?.status === "published" ? " · URL locked after publication" : ""}</p>{(fieldError("headline") || fieldError("slug")) && <p className="text-xs text-destructive">{fieldError("headline") || fieldError("slug")}</p>}</div>
          <div className="space-y-2"><div className="flex justify-between"><Label htmlFor="dek">Summary <span className="text-destructive">*</span></Label><span className="text-xs text-muted-foreground">{dek.length}/320</span></div><Textarea id="dek" value={dek} onChange={(e) => setDek(e.target.value)} placeholder="One or two sentences explaining what happened and why it matters" maxLength={320} aria-invalid={Boolean(fieldError("dek"))} />{fieldError("dek") && <p className="text-xs text-destructive">{fieldError("dek")}</p>}</div>
          <Separator />
          <div className="space-y-3">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <Label htmlFor="body">Story body <span className="text-destructive">*</span></Label>
                <p className="mt-1 text-xs text-muted-foreground">Format the article and compare it with the reader presentation in real time.</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {richStoryEditorEnabled ? (
                  <div className="flex items-center gap-2 rounded-lg border px-3 py-2">
                    <Label htmlFor="visual-editor" className="text-xs">Visual editor</Label>
                    <Switch
                      id="visual-editor"
                      checked={visualEditing}
                      onCheckedChange={setVisualEditing}
                    />
                  </div>
                ) : <Badge variant="outline">Visual editor disabled by configuration</Badge>}
                <ComposerModeButton mode="write" current={composerMode} onSelect={setComposerMode} icon={<FilePenLine />} label="Write" />
                <ComposerModeButton mode="split" current={composerMode} onSelect={setComposerMode} icon={<Columns3 />} label="Split" />
                <ComposerModeButton mode="preview" current={composerMode} onSelect={setComposerMode} icon={<Eye />} label="Preview" />
              </div>
            </div>
            <div className={composerMode === "split" ? "grid gap-4 xl:grid-cols-2" : ""}>
              {composerMode !== "preview" ? (
                visualEditing && richStoryEditorEnabled ? (
                  <RichStoryEditor
                    initialDocument={richBody}
                    invalid={Boolean(fieldError("body"))}
                    onChange={({ document, paragraphs }) => {
                      setRichBody(document);
                      setBody(paragraphs.join("\n\n"));
                    }}
                  />
                ) : (
                  <Textarea
                    id="body"
                    value={body}
                    onChange={(event) => {
                      const value = event.target.value;
                      setBody(value);
                      setRichBody(createPlainStoryRichTextDocument(value.split(/\n\n+/).map((item) => item.trim()).filter(Boolean)));
                    }}
                    placeholder="Write the story here. Separate paragraphs with a blank line."
                    className="min-h-[38rem] resize-y leading-7"
                    aria-invalid={Boolean(fieldError("body"))}
                  />
                )
              ) : null}
              {composerMode !== "write" ? (
                <ArticlePreview
                  headline={headline}
                  dek={dek}
                  categoryLabel={categories.find(([value]) => value === category)?.[1] ?? "Middlesex County"}
                  location={location}
                  imageUrl={imageUrl}
                  imageAlt={imageAlt}
                  byline={selectedByline?.name ?? "Courier Newsroom"}
                  document={visualEditing ? richBody : null}
                  paragraphs={bodyParagraphs}
                  whyItMatters={generatedWhyItMatters}
                />
              ) : null}
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
              <span>{wordCount} words · about {Math.max(1, Math.ceil(wordCount / 220))} min read</span>
              <span>The reader preview updates as you type. Use Save draft to persist changes to the newsroom.</span>
            </div>
            {fieldError("body") && <p className="text-xs text-destructive">{fieldError("body")}</p>}
          </div>
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
              <div className="space-y-2"><Label>Tags</Label><EditableList values={tags} onChange={setTags} placeholder="Add a reporting topic" addLabel="Add tag" maxItems={20} /></div>
              <Separator />
              <div className="space-y-3">
                <div>
                  <div className="flex items-center justify-between gap-3">
                    <Label>Public byline</Label>
                    <Link
                      href="/studio/profile"
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs font-semibold text-primary underline underline-offset-2"
                    >
                      Manage pseudonym
                    </Link>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Readers will see <strong>By {selectedByline?.name ?? "Courier Newsroom"}</strong>.
                  </p>
                </div>
                {pseudonymByline ? (
                  <div className="flex items-start justify-between gap-4 rounded-md border p-3">
                    <div>
                      <Label htmlFor="use-pseudonym">Use saved pseudonym</Label>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Publish as {pseudonymByline.name}. The real account remains
                        the internal story owner.
                      </p>
                      {!pseudonymByline.available ? (
                        <p className="mt-1 text-xs font-semibold text-amber-500">
                          This pseudonym is currently unavailable.
                        </p>
                      ) : null}
                      {!pseudonymsEnabled ? (
                        <p className="mt-1 text-xs font-semibold text-amber-500">
                          Pseudonyms are disabled in Studio Configuration.
                        </p>
                      ) : null}
                    </div>
                    <Switch
                      id="use-pseudonym"
                      checked={bylineMode === "pseudonym"}
                      disabled={
                        initialStory?.status === "published" ||
                        !pseudonymsEnabled ||
                        !pseudonymByline.available
                      }
                      onCheckedChange={(checked) =>
                        setBylineMode(checked ? "pseudonym" : "account")
                      }
                    />
                  </div>
                ) : (
                  <p className="rounded-md border border-dashed p-3 text-xs text-muted-foreground">
                    No pseudonym is saved for this story owner. Save this draft,
                    then add one in{" "}
                    <Link
                      href="/studio/profile"
                      target="_blank"
                      rel="noreferrer"
                      className="font-semibold underline"
                    >
                      My profile
                    </Link>.
                  </p>
                )}
              </div>
              {initialStory?.status === "published" ? (
                <p className="rounded-md border bg-muted/40 p-3 text-xs leading-5 text-muted-foreground">
                  The public byline and story URL are immutable after
                  publication. Copy, context, media and search presentation may
                  still be proposed while this story is active.
                </p>
              ) : null}
              <Separator />
              <div className="flex items-center justify-between"><div><Label htmlFor="breaking">Breaking news</Label><p className="mt-1 text-xs text-muted-foreground">Adds urgent public treatment.</p></div><Switch id="breaking" checked={breaking} onCheckedChange={setBreaking} /></div>
              {initialStory?.status !== "published" ? <><Separator />
              <div className="flex items-start justify-between gap-4">
                <div><Label htmlFor="plan-publication">Plan publication</Label><p className="mt-1 text-xs leading-5 text-muted-foreground">Choose an intended time while drafting. The clock remains inactive until editorial review confirms the schedule.</p></div>
                <Switch id="plan-publication" checked={schedulePlanned} onCheckedChange={(checked) => { setSchedulePlanned(checked); if (!checked) setScheduledAt(""); }} />
              </div>
              {schedulePlanned ? (
                <div className="space-y-2 rounded-lg border bg-muted/25 p-4">
                  <Label htmlFor="planned-publication-at">Planned date and time</Label>
                  <Input id="planned-publication-at" type="datetime-local" value={scheduledAt} onChange={(event) => setScheduledAt(event.target.value)} aria-invalid={Boolean(fieldError("scheduledAt"))} />
                  {fieldError("scheduledAt") ? <p className="text-xs text-destructive">{fieldError("scheduledAt")}</p> : null}
                  <p className="text-xs leading-5 text-muted-foreground"><CalendarClock className="mr-1 inline size-3.5" /> Entered in your device timezone. Courier publishes in {publicationTimezone}. A Draft or Review story never auto-publishes, even if this time passes; an authorized publisher must activate or replace the schedule after review.</p>
                </div>
              ) : null}</> : null}
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
          <Card><CardContent className="p-5"><div className="flex items-center justify-between"><span className="text-sm font-medium">Workflow</span><Badge variant="secondary" className="capitalize">{initialStory?.status ?? "draft"}</Badge></div><div className="mt-4 flex flex-wrap items-center gap-2 text-[0.7rem] text-muted-foreground"><span className="size-2 rounded-full bg-primary" /> Draft <span>→</span> Review <span>→</span> <span>Scheduled <em>(optional)</em></span> <span>→</span> Published</div></CardContent></Card>
        </div>
      </div>
    </div>
  );
}

function ComposerModeButton({
  mode,
  current,
  onSelect,
  icon,
  label,
}: {
  mode: "write" | "split" | "preview";
  current: "write" | "split" | "preview";
  onSelect: (mode: "write" | "split" | "preview") => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <Button
      type="button"
      size="sm"
      variant={current === mode ? "secondary" : "outline"}
      aria-pressed={current === mode}
      onClick={() => onSelect(mode)}
    >
      {icon} {label}
    </Button>
  );
}

function ArticlePreview({
  headline,
  dek,
  categoryLabel,
  location,
  imageUrl,
  imageAlt,
  byline,
  document,
  paragraphs,
  whyItMatters,
}: {
  headline: string;
  dek: string;
  categoryLabel: string;
  location: string;
  imageUrl: string;
  imageAlt: string;
  byline: string;
  document: StoryRichTextDocument | null;
  paragraphs: string[];
  whyItMatters: string;
}) {
  return (
    <aside className="min-h-[38rem] overflow-hidden rounded-xl border bg-[#fbfaf6] text-[#142d27] shadow-sm" aria-label="Live reader preview">
      <div className="flex items-center justify-between border-b border-[#d8d5cc] px-5 py-3">
        <span className="text-[0.68rem] font-black uppercase tracking-[0.18em] text-[#39705e]">Live reader preview</span>
        <span className="text-[0.65rem] font-semibold uppercase tracking-widest text-[#6c7773]">Desktop article</span>
      </div>
      <div className="max-h-[58rem] overflow-y-auto overscroll-contain">
        <header className="px-6 py-7 sm:px-9">
          <p className="text-[0.65rem] font-black uppercase tracking-[0.16em] text-[#39705e]">{categoryLabel}</p>
          <h2 className="mt-3 text-3xl font-black leading-[1.02] tracking-[-0.045em]">{headline || "Your headline will appear here"}</h2>
          <p className="mt-4 text-sm leading-6 text-[#5d6965]">{dek || "The article summary will appear here as you write."}</p>
          <div className="mt-5 border-t border-[#d8d5cc] pt-4 text-xs">
            <strong>By {byline}</strong>
            <span className="mt-1 block text-[#6c7773]">Preview · {location}</span>
          </div>
        </header>
        {imageUrl ? (
          <div className="relative aspect-video bg-[#e9e7df]">
            <Image src={imageUrl} alt={imageAlt || "Lead image preview"} fill sizes="640px" className="object-cover" />
          </div>
        ) : (
          <div className="mx-6 flex aspect-video items-center justify-center border border-dashed border-[#c7c4ba] bg-[#f1efe8] text-xs text-[#737c78] sm:mx-9">Lead image preview</div>
        )}
        <div className="px-6 py-8 sm:px-9">
          {whyItMatters ? (
            <div className="mb-7 border-t-4 border-[#d39a38] bg-[#173e32] p-4 text-white">
              <p className="text-[0.62rem] font-black uppercase tracking-[0.18em] text-[#e0ad50]">Why it matters</p>
              <p className="mt-2 text-sm leading-6 text-white/75">{whyItMatters}</p>
            </div>
          ) : null}
          <StoryRichContent
            document={document}
            fallback={paragraphs.length ? paragraphs : ["Start writing to see the published article take shape."]}
            className="text-[1rem] leading-8"
          />
        </div>
      </div>
    </aside>
  );
}
