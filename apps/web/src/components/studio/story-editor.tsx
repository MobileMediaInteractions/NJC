"use client";

import { useEffect, useMemo, useRef, useState, type DragEvent } from "react";
import dynamic from "next/dynamic";
import { ArrowLeft, CalendarClock, CheckCircle2, CloudUpload, Columns3, Eye, FilePenLine, ImageIcon, Loader2, Save, Send, Sparkles, Trash2 } from "lucide-react";
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
import { StoryPublicNote } from "@/components/story-public-note";
import { validateStoryImage } from "@/lib/media-upload";
import { toLocalDateTimeInput } from "@/lib/local-datetime";
import { firstStoryError, storyInput, type StoryFieldErrors } from "@/lib/story-input";
import type { StoryBylineOption } from "@/lib/pseudonyms";
import { createPlainStoryRichTextDocument } from "@/lib/story-rich-text";
import { generateWhyItMatters, WHY_IT_MATTERS_MAX_CHARACTERS } from "@/lib/why-it-matters";
import { isStoryNoteType, STORY_NOTE_MAX_CHARACTERS, storyNoteTypes } from "@/lib/story-notes";
import type { StoryNoteType, StoryRichTextDocument } from "@harborline/contracts";

const RichStoryEditor = dynamic(
  () => import("@/components/studio/story-rich-editor").then((module) => module.StoryRichEditor),
  { ssr: false, loading: () => <div className="flex min-h-[38rem] items-center justify-center rounded-xl border"><Loader2 className="size-6 animate-spin text-muted-foreground" /><span className="ml-2 text-sm text-muted-foreground">Loading the visual editor…</span></div> },
);

const categories = [
  ["local", "Local News"], ["middlesex", "Middlesex County"], ["statehouse", "Statehouse Desk"], ["public-square", "Public Square"], ["opinion", "Garden State Forum"], ["sports", "Jersey Gridiron & Court"], ["jersey-laurels", "Jersey Laurels"], ["investigates", "Courier Watch"], ["weather", "Weather"], ["culture", "Arts & Culture"],
];

type StoryEditorDraftState = {
  headline: string;
  slug: string;
  dek: string;
  body: string;
  richBody: StoryRichTextDocument;
  includeWhyItMatters: boolean;
  includePublicNote: boolean;
  publicNoteType: StoryNoteType;
  publicNote: string;
  category: string;
  location: string;
  tags: string[];
  seoTitle: string;
  seoDescription: string;
  canonicalUrl: string;
  noIndex: boolean;
  breaking: boolean;
  schedulePlanned: boolean;
  scheduledAt: string;
  bylineMode: "account" | "pseudonym";
  imageUrl: string;
  imageAlt: string;
  imageAssetId: string | null;
  imageKind: "editorial" | "ai_placeholder";
};

type StoryEditorRecovery = {
  baseline: string;
  savedAt: string;
  draft: StoryEditorDraftState;
};

export interface StoryEditorInitialStory {
  id: string;
  headline: string;
  slug: string;
  dek: string;
  body: string[];
  richBody: StoryRichTextDocument | null;
  whyItMatters: string | null;
  publicNoteType: StoryNoteType | null;
  publicNote: string | null;
  categorySlug: string;
  location: string;
  imageUrl: string | null;
  imageAlt: string | null;
  imageAssetId: string | null;
  imageKind: "editorial" | "ai_placeholder";
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
  updatedAt: string;
}

export function StoryEditor({
  datelines,
  publicationTimezone,
  bylineOptions,
  pseudonymsEnabled,
  richStoryEditorEnabled,
  richStoryEditorDefaultMode,
  aiImagePlaceholdersEnabled,
  aiImageProviderConfigured,
  initialStory,
}: {
  datelines: string[];
  publicationTimezone: string;
  bylineOptions: StoryBylineOption[];
  pseudonymsEnabled: boolean;
  richStoryEditorEnabled: boolean;
  richStoryEditorDefaultMode: "write" | "split" | "preview";
  aiImagePlaceholdersEnabled: boolean;
  aiImageProviderConfigured: boolean;
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
  const [includePublicNote, setIncludePublicNote] = useState(Boolean(initialStory?.publicNote));
  const [publicNoteType, setPublicNoteType] = useState<StoryNoteType>(initialStory?.publicNoteType ?? "editors_note");
  const [publicNote, setPublicNote] = useState(initialStory?.publicNote ?? "");
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
  const [imageAssetId, setImageAssetId] = useState<string | null>(initialStory?.imageAssetId ?? null);
  const [imageKind, setImageKind] = useState<"editorial" | "ai_placeholder">(initialStory?.imageKind ?? "editorial");
  const [imageName, setImageName] = useState(initialStory?.imageUrl ? initialStory.imageKind === "ai_placeholder" ? "Temporary AI illustration" : "Current lead image" : "");
  const [uploadState, setUploadState] = useState<"idle" | "uploading" | "uploaded" | "error">("idle");
  const [uploadMessage, setUploadMessage] = useState("");
  const [isDraggingImage, setIsDraggingImage] = useState(false);
  const [generationState, setGenerationState] = useState<"idle" | "generating" | "generated" | "error">("idle");
  const [visualDirection, setVisualDirection] = useState("");
  const [generationMessage, setGenerationMessage] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [message, setMessage] = useState("");
  const [fieldErrors, setFieldErrors] = useState<StoryFieldErrors>({});
  const [recovery, setRecovery] = useState<StoryEditorRecovery | null>(null);
  const [localSaveTime, setLocalSaveTime] = useState<string | null>(null);
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
  const recoveryKey = `njc:story-recovery:${initialStory?.id ?? "new"}`;
  const baseline = initialStory?.updatedAt ?? "new";
  const draftState = useMemo<StoryEditorDraftState>(() => ({
    headline, slug, dek, body, richBody, includeWhyItMatters, includePublicNote, publicNoteType, publicNote, category,
    location, tags, seoTitle, seoDescription, canonicalUrl, noIndex, breaking,
    schedulePlanned, scheduledAt, bylineMode, imageUrl, imageAlt, imageAssetId,
    imageKind,
  }), [
    headline, slug, dek, body, richBody, includeWhyItMatters, includePublicNote, publicNoteType, publicNote, category,
    location, tags, seoTitle, seoDescription, canonicalUrl, noIndex, breaking,
    schedulePlanned, scheduledAt, bylineMode, imageUrl, imageAlt, imageAssetId,
    imageKind,
  ]);
  const serializedDraft = useMemo(() => JSON.stringify(draftState), [draftState]);
  const [initialDraft] = useState(() => serializedDraft);
  const isDirty = serializedDraft !== initialDraft;

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!isDirty) return;
      event.preventDefault();
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(recoveryKey);
      if (!stored) return;
      const parsed: unknown = JSON.parse(stored);
      if (
        isStoryEditorRecovery(parsed) &&
        parsed.baseline === baseline &&
        parsed.draft &&
        JSON.stringify(parsed.draft) !== initialDraft
      ) {
        window.setTimeout(() => setRecovery(parsed), 0);
      }
    } catch {
      window.localStorage.removeItem(recoveryKey);
    }
  }, [baseline, initialDraft, recoveryKey]);

  useEffect(() => {
    if (!isDirty) return;
    const timeout = window.setTimeout(() => {
      const savedAt = new Date().toISOString();
      window.localStorage.setItem(
        recoveryKey,
        JSON.stringify({ baseline, savedAt, draft: draftState } satisfies StoryEditorRecovery),
      );
      setLocalSaveTime(savedAt);
    }, 1_200);
    return () => window.clearTimeout(timeout);
  }, [baseline, draftState, isDirty, recoveryKey]);

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
    const input = { headline, slug, dek, body: bodyParagraphs, richBody: richStoryEditorEnabled ? richBody : null, includeWhyItMatters, includePublicNote, publicNoteType, publicNote, categorySlug: category, categoryLabel, location, imageUrl, imageAlt, imageAssetId, imageKind, tags, seoTitle, seoDescription, canonicalUrl, noIndex, bylineMode, status, isBreaking: breaking, scheduledAt: parsedScheduledAt?.toISOString() ?? "", publishedAt: "", publishedAtRiskAcknowledged: false, publishedAtChangeReason: "" };
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
        window.localStorage.removeItem(recoveryKey);
        const liveRevision = initialStory?.status === "published";
        setMessage(
          payload?.meta?.unchanged
            ? "No editorial changes were found, so no revision was created."
            : liveRevision
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
      setImageAssetId(payload.data.id ?? null);
      setImageKind("editorial");
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

  async function generatePlaceholder() {
    const categoryLabel = categories.find(([value]) => value === category)?.[1] ?? "Middlesex County";
    const context = { headline, dek, body: bodyParagraphs, location, categoryLabel, visualDirection, storyId: initialStory?.id };
    if (headline.trim().length < 8 || dek.trim().length < 10 || bodyParagraphs.length === 0) {
      setGenerationState("error");
      setGenerationMessage("Add a headline, summary and at least one story paragraph first.");
      return;
    }
    setGenerationState("generating");
    setGenerationMessage("Creating a temporary editorial illustration from the current story…");
    try {
      const response = await fetch("/api/v1/studio/media/generate-placeholder", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(context),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.data?.url || !payload?.data?.id) {
        setGenerationState("error");
        setGenerationMessage(payload?.error?.message ?? `The placeholder could not be generated (${response.status}).`);
        return;
      }
      setImageUrl(payload.data.url);
      setImageAssetId(payload.data.id);
      setImageKind("ai_placeholder");
      setImageAlt(payload.data.altText ?? `AI-generated editorial illustration for “${headline}”.`);
      setImageName(payload.data.filename ?? "Temporary AI illustration");
      setGenerationState("generated");
      setGenerationMessage("Temporary illustration generated. Replace it with approved editorial media before publication.");
      setUploadMessage("");
      setFieldErrors((current) => ({ ...current, imageUrl: undefined, imageAlt: undefined }));
    } catch {
      setGenerationState("error");
      setGenerationMessage("The image-generation service could not be reached. No placeholder was attached.");
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
    setImageAssetId(null);
    setImageKind("editorial");
    setImageName("");
    setUploadState("idle");
    setUploadMessage("");
    setGenerationState("idle");
    setGenerationMessage("");
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

  function restoreRecovery() {
    if (!recovery) return;
    const draft = recovery.draft;
    setHeadline(draft.headline); setSlug(draft.slug); setDek(draft.dek);
    setBody(draft.body); setRichBody(draft.richBody);
    setIncludeWhyItMatters(draft.includeWhyItMatters);
    setIncludePublicNote(draft.includePublicNote ?? false);
    setPublicNoteType(draft.publicNoteType ?? "editors_note");
    setPublicNote(draft.publicNote ?? "");
    setCategory(draft.category); setLocation(draft.location); setTags(draft.tags);
    setSeoTitle(draft.seoTitle); setSeoDescription(draft.seoDescription);
    setCanonicalUrl(draft.canonicalUrl); setNoIndex(draft.noIndex);
    setBreaking(draft.breaking); setSchedulePlanned(draft.schedulePlanned);
    setScheduledAt(draft.scheduledAt); setBylineMode(draft.bylineMode);
    setImageUrl(draft.imageUrl); setImageAlt(draft.imageAlt);
    setImageAssetId(draft.imageAssetId); setImageKind(draft.imageKind);
    setRecovery(null);
    setMessage("Unsaved browser recovery restored. Review it, then save a meaningful revision.");
  }

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center"><div><Button variant="ghost" size="sm" asChild className="mb-2 -ml-3 text-muted-foreground"><Link href="/studio/stories"><ArrowLeft /> All stories</Link></Button><div className="flex flex-wrap items-center gap-3"><h1 className="text-3xl font-bold tracking-tight">{initialStory?.status === "published" ? "Propose live-story update" : initialStory ? "Edit story" : "Create story"}</h1><Badge variant={isDirty ? "secondary" : "outline"}>{isDirty ? "Unsaved changes" : "Saved"}</Badge></div><p className="mt-1 text-sm text-muted-foreground">{initialStory?.status === "published" ? "The live article stays unchanged until a different publisher approves this comparison." : initialStory ? initialStory.status !== "draft" ? "Any pre-publication change returns this story to Draft so it can be reviewed again." : "Continue writing or submit this saved draft for editorial review." : "Every story starts as a draft. Save it first, then submit it for review."}</p>{localSaveTime && isDirty ? <p className="mt-1 text-xs text-muted-foreground">Browser recovery saved {new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit", second: "2-digit" }).format(new Date(localSaveTime))}. It is temporary and is not a newsroom revision.</p> : null}</div><div className="flex flex-wrap gap-2"><Button variant="outline" onClick={() => save("draft")} disabled={state === "saving" || uploadState === "uploading" || generationState === "generating"}>{state === "saving" ? <Loader2 className="animate-spin" /> : <Save />} {initialStory?.status === "published" ? "Review and submit update" : initialStory && initialStory.status !== "draft" ? "Save changes as draft" : "Save draft"}</Button>{initialStory?.status === "draft" ? <Button onClick={() => save("review")} disabled={state === "saving" || uploadState === "uploading" || generationState === "generating"}>{state === "saving" ? <Loader2 className="animate-spin" /> : <Send />} Send to review</Button> : null}</div></div>
      {recovery ? <div className="mb-5 flex flex-col justify-between gap-3 rounded-lg border border-amber-500/40 bg-amber-500/5 p-4 sm:flex-row sm:items-center"><div><p className="font-semibold">Unsaved browser recovery found</p><p className="mt-1 text-xs text-muted-foreground">Saved {new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(new Date(recovery.savedAt))}. Restoring does not create a permanent revision until you save.</p></div><div className="flex gap-2"><Button type="button" size="sm" onClick={restoreRecovery}>Restore</Button><Button type="button" size="sm" variant="ghost" onClick={() => { window.localStorage.removeItem(recoveryKey); setRecovery(null); }}>Discard</Button></div></div> : null}
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
                  <div className="flex rounded-lg border p-1" role="tablist" aria-label="Story editing mode">
                    <Button type="button" size="sm" variant={visualEditing ? "secondary" : "ghost"} role="tab" aria-selected={visualEditing} onClick={() => setVisualEditing(true)}>Visual</Button>
                    <Button type="button" size="sm" variant={!visualEditing ? "secondary" : "ghost"} role="tab" aria-selected={!visualEditing} onClick={() => setVisualEditing(false)}>Text</Button>
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
                  <div className="space-y-2">
                    <p className="rounded-lg border border-blue-500/25 bg-blue-500/5 px-3 py-2 text-xs leading-5 text-muted-foreground">
                      Text mode edits the portable paragraph source used by apps and older stories. Switching modes alone preserves rich formatting; typing here intentionally rebuilds the article as plain paragraphs.
                    </p>
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
                  </div>
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
                  imageKind={imageKind}
                  byline={selectedByline?.name ?? "Courier Newsroom"}
                  document={richBody}
                  paragraphs={bodyParagraphs}
                  whyItMatters={generatedWhyItMatters}
                  publicNoteType={includePublicNote ? publicNoteType : null}
                  publicNote={includePublicNote ? publicNote : ""}
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
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Public story note</CardTitle>
              <CardDescription>Add a clearly labeled note that readers will see with the article.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <Label htmlFor="include-public-note">Include a note</Label>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">The note is reviewed, versioned and published as part of the story.</p>
                </div>
                <Switch id="include-public-note" checked={includePublicNote} onCheckedChange={setIncludePublicNote} />
              </div>
              {includePublicNote ? (
                <div className="space-y-4 border-t pt-4">
                  <div className="space-y-2">
                    <Label htmlFor="public-note-type">Note type</Label>
                    <Select value={publicNoteType} onValueChange={(value) => { if (isStoryNoteType(value)) setPublicNoteType(value); }}>
                      <SelectTrigger id="public-note-type"><SelectValue /></SelectTrigger>
                      <SelectContent>{storyNoteTypes.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent>
                    </Select>
                    <p className="text-xs leading-5 text-muted-foreground">{storyNoteTypes.find((option) => option.value === publicNoteType)?.description}</p>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between gap-3"><Label htmlFor="publicNote">Note <span className="text-destructive">*</span></Label><span className="text-xs text-muted-foreground">{publicNote.length}/{STORY_NOTE_MAX_CHARACTERS}</span></div>
                    <Textarea id="publicNote" value={publicNote} onChange={(event) => setPublicNote(event.target.value)} maxLength={STORY_NOTE_MAX_CHARACTERS} rows={6} placeholder="Explain the editorial context readers need to understand." aria-invalid={Boolean(fieldError("publicNote"))} />
                    {fieldError("publicNote") ? <p className="text-xs text-destructive">{fieldError("publicNote")}</p> : null}
                  </div>
                  <StoryPublicNote type={publicNoteType}>{publicNote || "Your public note preview will appear here."}</StoryPublicNote>
                  {publicNoteType === "update_note" ? <p className="text-xs leading-5 text-amber-500">An update note explains a meaningful change; it does not replace the newsroom&apos;s correction and revision requirements.</p> : null}
                </div>
              ) : null}
            </CardContent>
          </Card>
          <Card><CardHeader><CardTitle className="text-base">Search appearance</CardTitle><CardDescription>Defaults are generated from the story. Override only when the search result needs clearer wording.</CardDescription></CardHeader><CardContent className="space-y-4"><div className="space-y-2"><div className="flex justify-between"><Label htmlFor="seo-title">SEO title</Label><span className="text-xs text-muted-foreground">{seoTitle.length}/70</span></div><Input id="seo-title" value={seoTitle} onChange={(event) => setSeoTitle(event.target.value)} maxLength={70} placeholder={headline || "Uses headline by default"} /></div><div className="space-y-2"><div className="flex justify-between"><Label htmlFor="seo-description">Search description</Label><span className="text-xs text-muted-foreground">{seoDescription.length}/180</span></div><Textarea id="seo-description" value={seoDescription} onChange={(event) => setSeoDescription(event.target.value)} maxLength={180} placeholder={dek || "Uses summary by default"} /></div><div className="space-y-2"><Label htmlFor="canonical-url">Canonical URL</Label><Input id="canonical-url" type="url" value={canonicalUrl} onChange={(event) => setCanonicalUrl(event.target.value)} placeholder="Leave blank for this story URL" aria-invalid={Boolean(fieldError("canonicalUrl"))} />{fieldError("canonicalUrl") && <p className="text-xs text-destructive">{fieldError("canonicalUrl")}</p>}</div><Separator /><div className="flex items-center justify-between gap-4"><div><Label htmlFor="no-index">Exclude from search</Label><p className="mt-1 text-xs text-muted-foreground">Adds noindex and removes the story from sitemaps.</p></div><Switch id="no-index" checked={noIndex} onCheckedChange={setNoIndex} /></div></CardContent></Card>
          <Card><CardHeader><CardTitle className="text-base">Lead media</CardTitle><CardDescription>Upload approved media, or generate a temporary story-aware illustration for layout and review.</CardDescription></CardHeader><CardContent className="space-y-4">
            <input ref={fileInputRef} id="image-upload" type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadImage(file); }} disabled={uploadState === "uploading"} />
            {imageUrl ? <div className="space-y-4"><div className="relative aspect-video overflow-hidden rounded-md border bg-muted"><Image src={imageUrl} alt={imageAlt || "Lead image preview"} fill sizes="320px" className="object-cover" />{imageKind === "ai_placeholder" ? <div className="absolute inset-x-0 bottom-0 bg-amber-950/90 px-3 py-2 text-[0.68rem] font-bold uppercase tracking-wider text-amber-100">Temporary AI illustration · publication blocked</div> : null}</div><div className="flex items-center justify-between gap-3"><div className="min-w-0"><p className="truncate text-sm font-medium">{imageName}</p><p className={imageKind === "ai_placeholder" ? "text-xs font-medium text-amber-500" : "text-xs text-muted-foreground"}>{imageKind === "ai_placeholder" ? "Replace before approval or publication" : "Ready to use"}</p></div><div className="flex flex-wrap justify-end gap-2">{imageKind === "ai_placeholder" && aiImagePlaceholdersEnabled && aiImageProviderConfigured ? <Button type="button" size="sm" variant="outline" onClick={() => void generatePlaceholder()} disabled={generationState === "generating" || uploadState === "uploading"}>{generationState === "generating" ? <Loader2 className="animate-spin" /> : <Sparkles />} Regenerate</Button> : null}<Button type="button" size="sm" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={uploadState === "uploading" || generationState === "generating"}><CloudUpload /> Replace</Button><Button type="button" size="icon-sm" variant="ghost" onClick={removeImage} disabled={uploadState === "uploading" || generationState === "generating"} aria-label="Remove image"><Trash2 /></Button></div></div><div className="space-y-2"><Label htmlFor="image-alt">Image description <span className="text-destructive">*</span></Label><Textarea id="image-alt" value={imageAlt} onChange={(event) => setImageAlt(event.target.value)} maxLength={240} placeholder="Describe what is visible for readers using screen readers" aria-invalid={Boolean(fieldError("imageAlt"))} />{fieldError("imageAlt") ? <p className="text-xs text-destructive">{fieldError("imageAlt")}</p> : <p className="text-xs text-muted-foreground">Describe people, place and relevant action; do not repeat the headline.</p>}</div></div> : <button type="button" onClick={() => fileInputRef.current?.click()} onDragEnter={(event) => { event.preventDefault(); setIsDraggingImage(true); }} onDragOver={(event) => { event.preventDefault(); event.dataTransfer.dropEffect = "copy"; setIsDraggingImage(true); }} onDragLeave={(event) => { event.preventDefault(); setIsDraggingImage(false); }} onDrop={handleImageDrop} disabled={uploadState === "uploading" || generationState === "generating"} className={`flex min-h-36 w-full flex-col items-center justify-center rounded-md border border-dashed text-center transition-colors disabled:cursor-wait disabled:opacity-70 ${isDraggingImage ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground hover:border-primary hover:text-primary"}`}>{uploadState === "uploading" ? <Loader2 className="size-6 animate-spin" /> : <ImageIcon className="size-6" />}<span className="mt-2 text-sm font-medium">{uploadState === "uploading" ? "Uploading image…" : isDraggingImage ? "Drop image to upload" : "Choose or drop an image"}</span><span className="mt-1 text-xs">JPEG, PNG or WebP up to 4 MB</span></button>}
            {uploadMessage ? <p className={`text-xs ${uploadState === "error" ? "text-destructive" : "text-muted-foreground"}`} role="status">{uploadMessage}</p> : null}
            {aiImagePlaceholdersEnabled ? <div className="space-y-3 rounded-lg border bg-muted/20 p-4"><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-semibold">Temporary AI illustration</p><p className="mt-1 text-xs leading-5 text-muted-foreground">Studio builds the prompt from the headline, summary and article. Add visual direction only when the automatic context needs guidance.</p></div><Sparkles className="mt-0.5 size-4 shrink-0 text-primary" /></div><Textarea value={visualDirection} onChange={(event) => setVisualDirection(event.target.value)} maxLength={400} placeholder="Optional: Focus on the town hall exterior at dusk; no people in the foreground." aria-label="Optional visual direction for the generated placeholder" /><Button type="button" className="w-full" variant="secondary" disabled={generationState === "generating" || uploadState === "uploading" || !aiImageProviderConfigured} onClick={() => void generatePlaceholder()}>{generationState === "generating" ? <Loader2 className="animate-spin" /> : <Sparkles />} {imageKind === "ai_placeholder" ? "Generate another version" : "Generate from story"}</Button>{!aiImageProviderConfigured ? <p className="text-xs font-medium text-amber-500">An administrator must connect the free Workers AI provider before generation is available.</p> : null}{generationMessage ? <p className={`text-xs leading-5 ${generationState === "error" ? "text-destructive" : imageKind === "ai_placeholder" ? "text-amber-500" : "text-muted-foreground"}`} role="status">{generationMessage}</p> : null}<p className="text-[0.7rem] leading-5 text-muted-foreground">Generated imagery is provenance-tracked, rate-limited and blocked from approval, scheduling and publication until an editor uploads real media or removes it.</p></div> : null}
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

function isStoryEditorRecovery(value: unknown): value is StoryEditorRecovery {
  if (!value || typeof value !== "object") return false;
  const recovery = value as Partial<StoryEditorRecovery>;
  const draft = recovery.draft as Partial<StoryEditorDraftState> | undefined;
  return Boolean(
    typeof recovery.baseline === "string" &&
    typeof recovery.savedAt === "string" &&
    draft &&
    typeof draft.headline === "string" &&
    typeof draft.slug === "string" &&
    typeof draft.dek === "string" &&
    typeof draft.body === "string" &&
    draft.richBody &&
    typeof draft.includeWhyItMatters === "boolean" &&
    (draft.includePublicNote === undefined || typeof draft.includePublicNote === "boolean") &&
    (draft.publicNoteType === undefined || isStoryNoteType(draft.publicNoteType)) &&
    (draft.publicNote === undefined || typeof draft.publicNote === "string") &&
    typeof draft.category === "string" &&
    typeof draft.location === "string" &&
    Array.isArray(draft.tags) &&
    typeof draft.seoTitle === "string" &&
    typeof draft.seoDescription === "string" &&
    typeof draft.canonicalUrl === "string" &&
    typeof draft.noIndex === "boolean" &&
    typeof draft.breaking === "boolean" &&
    typeof draft.schedulePlanned === "boolean" &&
    typeof draft.scheduledAt === "string" &&
    (draft.bylineMode === "account" || draft.bylineMode === "pseudonym") &&
    typeof draft.imageUrl === "string" &&
    typeof draft.imageAlt === "string" &&
    (draft.imageAssetId === null || typeof draft.imageAssetId === "string") &&
    (draft.imageKind === "editorial" || draft.imageKind === "ai_placeholder")
  );
}

function ArticlePreview({
  headline,
  dek,
  categoryLabel,
  location,
  imageUrl,
  imageAlt,
  imageKind,
  byline,
  document,
  paragraphs,
  whyItMatters,
  publicNoteType,
  publicNote,
}: {
  headline: string;
  dek: string;
  categoryLabel: string;
  location: string;
  imageUrl: string;
  imageAlt: string;
  imageKind: "editorial" | "ai_placeholder";
  byline: string;
  document: StoryRichTextDocument | null;
  paragraphs: string[];
  whyItMatters: string;
  publicNoteType: StoryNoteType | null;
  publicNote: string;
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
            {imageKind === "ai_placeholder" ? <div className="absolute inset-x-0 bottom-0 bg-[#142d27]/90 px-4 py-2 text-[0.62rem] font-black uppercase tracking-[0.14em] text-[#f5c66d]">Temporary AI illustration · not publishable</div> : null}
          </div>
        ) : (
          <div className="mx-6 flex aspect-video items-center justify-center border border-dashed border-[#c7c4ba] bg-[#f1efe8] text-xs text-[#737c78] sm:mx-9">Lead image preview</div>
        )}
        <div className="px-6 py-8 sm:px-9">
          {publicNoteType && publicNote.trim() ? <StoryPublicNote type={publicNoteType} className="mb-7">{publicNote}</StoryPublicNote> : null}
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
