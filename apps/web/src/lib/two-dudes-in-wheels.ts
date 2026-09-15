import { z } from "zod";

const deliverableUrl = z.string().trim().refine((value) => {
  if (value.startsWith("/") && !value.startsWith("//")) return true;
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}, "Use a local asset path or a complete HTTPS URL");

const timedCue = z.object({
  id: z.string().trim().regex(/^[a-z0-9][a-z0-9-]{1,79}$/),
  startMs: z.number().int().min(0),
  endMs: z.number().int().positive(),
});

export const twoDudesVisualCueSchema = timedCue.extend({
  imageUrl: deliverableUrl,
  alt: z.string().trim().min(10).max(240),
  caption: z.string().trim().min(3).max(240),
  perspective: z.enum(["driver", "passenger", "both", "road"]),
  focalPoint: z.object({ x: z.number().min(0).max(100), y: z.number().min(0).max(100) }).default({ x: 50, y: 50 }),
});

export const twoDudesTranscriptCueSchema = timedCue.extend({
  speaker: z.enum(["driver", "passenger", "narrator"]),
  text: z.string().trim().min(1).max(1_200),
});

export const twoDudesChapterSchema = z.object({
  id: z.string().trim().regex(/^[a-z0-9][a-z0-9-]{1,79}$/),
  startMs: z.number().int().min(0),
  title: z.string().trim().min(2).max(100),
});

export const twoDudesEpisodeSchema = z.object({
  id: z.uuid(),
  slug: z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  episodeNumber: z.number().int().positive(),
  title: z.string().trim().min(5).max(160),
  description: z.string().trim().min(20).max(600),
  audioUrl: deliverableUrl,
  durationMs: z.number().int().min(30_000).max(8 * 60 * 60 * 1_000),
  publishedAt: z.iso.datetime(),
  car: z.object({
    year: z.number().int().min(1886).max(2200),
    make: z.string().trim().min(1).max(80),
    model: z.string().trim().min(1).max(120),
    trim: z.string().trim().max(120).optional(),
  }),
  waveform: z.array(z.number().min(0.05).max(1)).min(32).max(192).optional(),
  visualCues: z.array(twoDudesVisualCueSchema).max(120).default([]),
  transcript: z.array(twoDudesTranscriptCueSchema).max(2_000).default([]),
  chapters: z.array(twoDudesChapterSchema).max(40).default([]),
}).superRefine((episode, context) => {
  const ids = new Set<string>();
  const ranges = [...episode.visualCues, ...episode.transcript];
  for (const cue of ranges) {
    if (cue.endMs <= cue.startMs) {
      context.addIssue({ code: "custom", message: `${cue.id} must end after it starts` });
    }
    if (cue.endMs > episode.durationMs) {
      context.addIssue({ code: "custom", message: `${cue.id} exceeds the episode duration` });
    }
    if (ids.has(cue.id)) {
      context.addIssue({ code: "custom", message: `Duplicate cue ID: ${cue.id}` });
    }
    ids.add(cue.id);
  }
  for (const chapter of episode.chapters) {
    if (chapter.startMs >= episode.durationMs) {
      context.addIssue({ code: "custom", message: `${chapter.id} starts after the episode ends` });
    }
    if (ids.has(chapter.id)) {
      context.addIssue({ code: "custom", message: `Duplicate cue ID: ${chapter.id}` });
    }
    ids.add(chapter.id);
  }
});

export type TwoDudesEpisode = z.infer<typeof twoDudesEpisodeSchema>;
export type TwoDudesVisualCue = z.infer<typeof twoDudesVisualCueSchema>;
export type TwoDudesTranscriptCue = z.infer<typeof twoDudesTranscriptCueSchema>;

export const twoDudesInWheelsSeries = {
  title: "Two Dudes in Wheels",
  slug: "two-dudes-in-wheels",
  status: "in-production" as const,
  eyebrow: "An NJC original podcast",
  description:
    "One car, two seats, and the details most reviews leave behind. The driver studies how it moves; the passenger judges how it actually feels to live with.",
  hosts: [
    { role: "Driver", focus: "Performance, controls, road manners and confidence behind the wheel." },
    { role: "Passenger", focus: "Comfort, access, visibility, space and the experience from the other seat." },
  ],
  episodes: [] as TwoDudesEpisode[],
};

export function findEpisodeMoment<T extends { startMs: number; endMs: number }>(
  cues: T[],
  positionMs: number,
) {
  return cues.find((cue) => positionMs >= cue.startMs && positionMs < cue.endMs) ?? null;
}

export function buildPodcastWaveform(seed: string, count = 72) {
  let state = Array.from(seed).reduce(
    (value, character) => Math.imul(value ^ character.charCodeAt(0), 16_777_619),
    2_166_136_261,
  ) >>> 0;
  return Array.from({ length: count }, (_, index) => {
    state = (Math.imul(state ^ (index + 1), 1_664_525) + 1_013_904_223) >>> 0;
    const energy = 0.2 + (state / 0xffffffff) * 0.8;
    const contour = 0.72 + Math.sin(index * 0.43) * 0.18;
    return Math.max(0.08, Math.min(1, Number((energy * contour).toFixed(3))));
  });
}
