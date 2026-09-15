import { z } from "zod";
import { assetUrl } from "@/lib/assets";
import { twoDudesEpisodeSchema, type TwoDudesEpisode } from "@/lib/two-dudes-in-wheels";

export const NJMOTION_MAGIC = "NJC-MOTIONDECK/1";
export const NJMOTION_EXTENSION = ".njmotion";

const identifier = z.string().trim().regex(/^[a-z0-9][a-z0-9-]{1,79}$/);
const cdnRelativePath = z.string().trim().refine((value) => {
  if (!value.startsWith("/") || value.startsWith("//")) return false;
  if (value.includes("..") || value.includes("\\") || value.includes("?") || value.includes("#")) return false;
  return /^\/[a-zA-Z0-9][a-zA-Z0-9/_\.\-]*$/.test(value);
}, "Use a clean CDN-relative asset path");

const httpsAssetSource = z.string().trim().refine((value) => {
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}, "Remote assets must use HTTPS");

const assetSource = z.union([
  cdnRelativePath,
  httpsAssetSource,
]);

const njMotionAssetSchema = z.object({
  id: identifier,
  kind: z.enum(["audio", "image"]),
  src: assetSource,
  mimeType: z.string().trim().regex(/^(audio|image)\/[a-z0-9.+-]+$/i),
  checksumSha256: z.string().trim().regex(/^[a-f0-9]{64}$/).optional(),
  width: z.number().int().positive().max(16_384).optional(),
  height: z.number().int().positive().max(16_384).optional(),
});

const timedCue = z.object({
  id: identifier,
  start: z.number().int().min(0),
  end: z.number().int().positive(),
});

const njMotionDocumentSchema = z.object({
  format: z.literal("com.thejerseycourier.motiondeck"),
  version: z.literal(1),
  timebase: z.literal(1_000),
  episode: z.object({
    id: z.uuid(),
    slug: z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    number: z.number().int().positive(),
    title: z.string().trim().min(5).max(160),
    description: z.string().trim().min(20).max(600),
    publishedAt: z.iso.datetime(),
    duration: z.number().int().min(30_000).max(8 * 60 * 60 * 1_000),
    audioAssetId: identifier,
    car: z.object({
      year: z.number().int().min(1886).max(2200),
      make: z.string().trim().min(1).max(80),
      model: z.string().trim().min(1).max(120),
      trim: z.string().trim().max(120).optional(),
    }),
  }),
  assets: z.array(njMotionAssetSchema).min(1).max(240),
  timeline: z.object({
    waveform: z.array(z.number().min(0.05).max(1)).min(32).max(192).optional(),
    visuals: z.array(timedCue.extend({
      assetId: identifier,
      alt: z.string().trim().min(10).max(240),
      caption: z.string().trim().min(3).max(240),
      perspective: z.enum(["driver", "passenger", "both", "road"]),
      focalPoint: z.object({ x: z.number().min(0).max(100), y: z.number().min(0).max(100) }).default({ x: 50, y: 50 }),
      placement: z.enum(["full", "left-panel", "right-panel", "inset"]).default("full"),
      fit: z.enum(["cover", "contain"]).default("cover"),
      entrance: z.enum(["crossfade", "slide-left", "slide-right", "zoom", "reveal"]).default("crossfade"),
      pan: z.enum(["none", "left-to-right", "right-to-left", "push-in", "pull-out"]).default("none"),
    })).max(120).default([]),
    scenes: z.array(timedCue.extend({
      scene: z.enum(["road", "cockpit", "passenger", "detail", "verdict"]),
      perspective: z.enum(["driver", "passenger", "both", "road"]),
      motion: z.enum(["calm", "drive", "sport"]),
      transition: z.enum(["crossfade", "dashboard", "road-wipe"]),
      title: z.string().trim().min(2).max(90),
      eyebrow: z.string().trim().min(2).max(50).optional(),
      callouts: z.array(z.object({
        label: z.string().trim().min(1).max(40),
        value: z.string().trim().min(1).max(70),
      })).max(3).default([]),
    })).max(240).default([]),
    transcript: z.array(timedCue.extend({
      speaker: z.enum(["driver", "passenger", "narrator"]),
      text: z.string().trim().min(1).max(1_200),
    })).max(2_000).default([]),
    chapters: z.array(z.object({
      id: identifier,
      start: z.number().int().min(0),
      title: z.string().trim().min(2).max(100),
    })).max(40).default([]),
  }),
}).superRefine((document, context) => {
  const assets = new Map<string, z.infer<typeof njMotionAssetSchema>>();
  for (const asset of document.assets) {
    if (assets.has(asset.id)) {
      context.addIssue({ code: "custom", path: ["assets"], message: `Duplicate asset ID: ${asset.id}` });
    }
    if (!asset.mimeType.toLowerCase().startsWith(`${asset.kind}/`)) {
      context.addIssue({ code: "custom", path: ["assets", asset.id, "mimeType"], message: `${asset.id} MIME type does not match its kind` });
    }
    if (asset.kind === "image" && (!asset.width || !asset.height)) {
      context.addIssue({ code: "custom", path: ["assets", asset.id], message: `${asset.id} must declare image dimensions` });
    }
    assets.set(asset.id, asset);
  }

  const audio = assets.get(document.episode.audioAssetId);
  if (!audio || audio.kind !== "audio") {
    context.addIssue({ code: "custom", path: ["episode", "audioAssetId"], message: "The episode must reference a catalogued audio asset" });
  }

  const cueIds = new Set<string>();
  const timedTracks = [document.timeline.visuals, document.timeline.scenes, document.timeline.transcript];
  for (const track of timedTracks) {
    for (const cue of track) {
      if (cueIds.has(cue.id)) context.addIssue({ code: "custom", path: ["timeline"], message: `Duplicate cue ID: ${cue.id}` });
      if (cue.end <= cue.start) context.addIssue({ code: "custom", path: ["timeline", cue.id], message: `${cue.id} must end after it starts` });
      if (cue.end > document.episode.duration) context.addIssue({ code: "custom", path: ["timeline", cue.id], message: `${cue.id} exceeds the episode duration` });
      cueIds.add(cue.id);
    }
  }
  for (const visual of document.timeline.visuals) {
    const asset = assets.get(visual.assetId);
    if (!asset || asset.kind !== "image") {
      context.addIssue({ code: "custom", path: ["timeline", "visuals", visual.id, "assetId"], message: `${visual.id} must reference a catalogued image asset` });
    }
  }
  for (const chapter of document.timeline.chapters) {
    if (cueIds.has(chapter.id)) context.addIssue({ code: "custom", path: ["timeline", "chapters"], message: `Duplicate cue ID: ${chapter.id}` });
    if (chapter.start >= document.episode.duration) context.addIssue({ code: "custom", path: ["timeline", "chapters", chapter.id], message: `${chapter.id} starts after the episode ends` });
    cueIds.add(chapter.id);
  }
});

export type NjMotionDocument = z.infer<typeof njMotionDocumentSchema>;

export class NjMotionError extends Error {
  constructor(message: string, readonly issues: string[] = []) {
    super(message);
    this.name = "NjMotionError";
  }
}

export function parseNjMotion(source: string): NjMotionDocument {
  const normalized = source.replace(/^\uFEFF/, "");
  const lineBreak = normalized.indexOf("\n");
  const header = (lineBreak === -1 ? normalized : normalized.slice(0, lineBreak)).trimEnd();
  if (header !== NJMOTION_MAGIC) {
    throw new NjMotionError(`Invalid MotionDeck header. Expected ${NJMOTION_MAGIC}.`);
  }

  const body = lineBreak === -1 ? "" : normalized.slice(lineBreak + 1).trim();
  let value: unknown;
  try {
    value = JSON.parse(body);
  } catch {
    throw new NjMotionError("The MotionDeck payload is not valid JSON.");
  }
  const result = njMotionDocumentSchema.safeParse(value);
  if (!result.success) {
    const issues = result.error.issues.map((issue) => `${issue.path.join(".") || "document"}: ${issue.message}`);
    throw new NjMotionError("The MotionDeck document failed validation.", issues);
  }
  return result.data;
}

export function compileNjMotion(document: NjMotionDocument): TwoDudesEpisode {
  const assets = new Map(document.assets.map((asset) => [asset.id, asset]));
  const audio = assets.get(document.episode.audioAssetId);
  if (!audio) throw new NjMotionError("The compiled episode has no audio asset.");

  return twoDudesEpisodeSchema.parse({
    id: document.episode.id,
    slug: document.episode.slug,
    episodeNumber: document.episode.number,
    title: document.episode.title,
    description: document.episode.description,
    audioUrl: resolveAssetSource(audio.src),
    durationMs: document.episode.duration,
    publishedAt: document.episode.publishedAt,
    car: document.episode.car,
    waveform: document.timeline.waveform,
    visualCues: document.timeline.visuals.map((cue) => {
      const asset = assets.get(cue.assetId);
      if (!asset) throw new NjMotionError(`Missing asset ${cue.assetId}.`);
      return {
        id: cue.id,
        startMs: cue.start,
        endMs: cue.end,
        imageUrl: resolveAssetSource(asset.src),
        alt: cue.alt,
        caption: cue.caption,
        perspective: cue.perspective,
        focalPoint: cue.focalPoint,
        placement: cue.placement,
        fit: cue.fit,
        entrance: cue.entrance,
        pan: cue.pan,
      };
    }),
    animationCues: document.timeline.scenes.map((cue) => ({
      id: cue.id,
      startMs: cue.start,
      endMs: cue.end,
      scene: cue.scene,
      perspective: cue.perspective,
      motion: cue.motion,
      transition: cue.transition,
      title: cue.title,
      eyebrow: cue.eyebrow,
      callouts: cue.callouts,
    })),
    transcript: document.timeline.transcript.map((cue) => ({
      id: cue.id,
      startMs: cue.start,
      endMs: cue.end,
      speaker: cue.speaker,
      text: cue.text,
    })),
    chapters: document.timeline.chapters.map((chapter) => ({
      id: chapter.id,
      startMs: chapter.start,
      title: chapter.title,
    })),
  });
}

export function parseAndCompileNjMotion(source: string) {
  return compileNjMotion(parseNjMotion(source));
}

function resolveAssetSource(source: string) {
  return source.startsWith("/") ? assetUrl(source) : source;
}
