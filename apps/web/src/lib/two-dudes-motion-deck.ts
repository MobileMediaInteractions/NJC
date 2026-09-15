import {
  findEpisodeMoment,
  type TwoDudesAnimationCue,
  type TwoDudesEpisode,
  type TwoDudesTranscriptCue,
  type TwoDudesVisualCue,
} from "./two-dudes-in-wheels";

export type MotionDeckFrame = {
  cue: TwoDudesAnimationCue;
  cueProgress: number;
  episodeProgress: number;
  visual: TwoDudesVisualCue | null;
  transcript: TwoDudesTranscriptCue | null;
};

export function buildMotionDeckFrame(
  episode: TwoDudesEpisode,
  positionMs: number,
): MotionDeckFrame {
  const boundedPosition = Math.max(0, Math.min(positionMs, episode.durationMs));
  const transcript = findEpisodeMoment(episode.transcript, boundedPosition);
  const configuredCue = findEpisodeMoment(episode.animationCues, boundedPosition);
  const cue = configuredCue ?? createFallbackCue(episode, transcript);
  const cueDuration = Math.max(cue.endMs - cue.startMs, 1);

  return {
    cue,
    cueProgress: clamp((boundedPosition - cue.startMs) / cueDuration),
    episodeProgress: clamp(boundedPosition / episode.durationMs),
    visual: findEpisodeMoment(episode.visualCues, boundedPosition),
    transcript,
  };
}

function createFallbackCue(
  episode: TwoDudesEpisode,
  transcript: TwoDudesTranscriptCue | null,
): TwoDudesAnimationCue {
  const perspective = transcript?.speaker === "driver"
    ? "driver"
    : transcript?.speaker === "passenger"
      ? "passenger"
      : "both";
  return {
    id: "motion-deck-fallback",
    startMs: 0,
    endMs: episode.durationMs,
    scene: perspective === "passenger" ? "passenger" : perspective === "driver" ? "cockpit" : "road",
    perspective,
    motion: "drive",
    transition: "crossfade",
    title: `${episode.car.year} ${episode.car.make} ${episode.car.model}`,
    eyebrow: "Two seats · one drive",
    callouts: [],
  };
}

function clamp(value: number) {
  return Math.max(0, Math.min(value, 1));
}
