"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { MediaPlayerLabels, MediaPlayerProps, PlayerProgressEvent } from "./types.js";
import { activeTimelineSegment, composePlaybackTimeline, formatMediaTime } from "./timeline.js";

const defaultLabels: MediaPlayerLabels = {
  back: "Back 10 seconds",
  forward: "Forward 10 seconds",
  play: "Play",
  pause: "Pause",
  mute: "Mute",
  unmute: "Unmute",
  speed: "Playback speed",
  captions: "Captions",
  chapters: "Chapters",
  pictureInPicture: "Picture in picture",
  fullscreen: "Fullscreen",
  loading: "Loading player",
  originalAudio: "Original audio",
  privatePreview: "Private preview",
};

export function MediaPlayer({
  contentId,
  kind,
  src,
  title,
  poster,
  captionsUrl,
  initialPositionMs = 0,
  timelineSegments = [],
  platformIntro = null,
  previewNotice = null,
  branding,
  labels: suppliedLabels,
  persistIntervalMs = 10_000,
  onProgress,
  onEvent,
  className = "",
  style,
}: MediaPlayerProps) {
  const mediaRef = useRef<HTMLVideoElement | HTMLAudioElement>(null);
  const progressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const gapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingSeekMs = useRef<number | null>(null);
  const resumePlayback = useRef(false);
  const callbackRef = useRef({ contentId, onProgress, onEvent });
  const [phase, setPhase] = useState<"intro" | "gap" | "program">(() => platformIntro && initialPositionMs === 0 ? "intro" : "program");
  const phaseRef = useRef(phase);
  const [playing, setPlaying] = useState(false);
  const [ready, setReady] = useState(false);
  const [muted, setMuted] = useState(false);
  const [time, setTime] = useState(initialPositionMs / 1_000);
  const [duration, setDuration] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [captions, setCaptions] = useState(false);
  const [chaptersOpen, setChaptersOpen] = useState(false);
  const labels = { ...defaultLabels, ...suppliedLabels };
  const presentation = useMemo(() => composePlaybackTimeline({ contentSegments: timelineSegments, platformIntro }), [platformIntro, timelineSegments]);
  const chapters = useMemo(() => presentation.filter((segment) => segment.source === "content" && segment.segmentType === "chapter"), [presentation]);
  const offsetMs = platformIntro ? platformIntro.durationMs + platformIntro.blackGapMs : 0;
  const playbackTimeMs = phase === "intro" ? time * 1_000 : phase === "gap" ? platformIntro?.durationMs ?? 0 : offsetMs + time * 1_000;
  const activeSegment = activeTimelineSegment(presentation, playbackTimeMs);
  const mediaSrc = phase === "intro" && platformIntro ? platformIntro.src : src;

  callbackRef.current = { contentId, onProgress, onEvent };
  phaseRef.current = phase;

  function emitProgress(reason: PlayerProgressEvent["reason"]) {
    const media = mediaRef.current;
    const callback = callbackRef.current.onProgress;
    if (!media || phaseRef.current !== "program" || !callback || !Number.isFinite(media.duration)) return;
    void Promise.resolve(callback({
      contentId: callbackRef.current.contentId,
      positionMs: Math.round(media.currentTime * 1_000),
      durationMs: Math.round(media.duration * 1_000),
      completed: media.currentTime / media.duration > 0.95,
      reason,
    })).catch(() => undefined);
  }

  useEffect(() => () => {
    if (progressTimer.current) clearTimeout(progressTimer.current);
    if (gapTimer.current) clearTimeout(gapTimer.current);
    emitProgress("unmount");
  }, []);

  function changePhase(next: "intro" | "gap" | "program") {
    phaseRef.current = next;
    setPhase(next);
    callbackRef.current.onEvent?.({ type: "phase_change", phase: next });
  }

  function startProgram(positionMs = 0, autoplay = true) {
    if (gapTimer.current) clearTimeout(gapTimer.current);
    pendingSeekMs.current = positionMs;
    resumePlayback.current = autoplay;
    changePhase("program");
    setReady(false);
    setTime(positionMs / 1_000);
  }

  function finishIntro() {
    if (!platformIntro || platformIntro.blackGapMs === 0) return startProgram(0, true);
    changePhase("gap");
    setPlaying(false);
    gapTimer.current = setTimeout(() => startProgram(0, true), platformIntro.blackGapMs);
  }

  function scheduleProgress() {
    if (progressTimer.current || !onProgress) return;
    progressTimer.current = setTimeout(() => {
      progressTimer.current = null;
      emitProgress("interval");
    }, persistIntervalMs);
  }

  function togglePlay() {
    const media = mediaRef.current;
    if (!media) return;
    if (media.paused) void media.play();
    else media.pause();
  }

  function seek(delta: number) {
    const media = mediaRef.current;
    if (!media) return;
    media.currentTime = Math.max(0, Math.min(media.duration || 0, media.currentTime + delta));
  }

  function seekPresentation(nextMs: number) {
    if (platformIntro && nextMs < platformIntro.durationMs) {
      pendingSeekMs.current = nextMs;
      resumePlayback.current = playing;
      changePhase("intro");
      setReady(false);
      return;
    }
    startProgram(Math.max(0, nextMs - offsetMs), playing);
  }

  function skipActiveSegment() {
    if (!activeSegment) return;
    if (activeSegment.source === "platform") startProgram(0, true);
    else {
      const media = mediaRef.current;
      if (media) media.currentTime = activeSegment.endMs / 1_000;
      setTime(activeSegment.endMs / 1_000);
    }
    callbackRef.current.onEvent?.({ type: "segment_skipped", segment: activeSegment });
  }

  function selectChapter(segment: (typeof chapters)[number]) {
    startProgram(segment.startMs, playing);
    setChaptersOpen(false);
    callbackRef.current.onEvent?.({ type: "chapter_selected", segment });
  }

  function selectSpeed() {
    const choices = [1, 1.25, 1.5, 1.75, 2];
    const next = choices[(choices.indexOf(speed) + 1) % choices.length] ?? 1;
    if (mediaRef.current) mediaRef.current.playbackRate = next;
    setSpeed(next);
  }

  function toggleCaptions() {
    const media = mediaRef.current;
    if (!media?.textTracks[0]) return;
    const next = !captions;
    media.textTracks[0].mode = next ? "showing" : "hidden";
    setCaptions(next);
  }

  async function fullscreen() {
    const media = mediaRef.current;
    if (!media) return;
    if (document.fullscreenElement) await document.exitFullscreen();
    else await media.parentElement?.requestFullscreen();
  }

  async function pictureInPicture() {
    const video = mediaRef.current;
    if (!(video instanceof HTMLVideoElement) || !document.pictureInPictureEnabled) return;
    if (document.pictureInPictureElement) await document.exitPictureInPicture();
    else await video.requestPictureInPicture();
  }

  const mediaProps = {
    src: mediaSrc,
    preload: "metadata" as const,
    onLoadedMetadata: (event: React.SyntheticEvent<HTMLVideoElement | HTMLAudioElement>) => {
      const media = event.currentTarget;
      if (phase === "program") setDuration(media.duration);
      const requested = pendingSeekMs.current ?? (phase === "program" ? initialPositionMs : 0);
      if (requested > 0 && requested / 1_000 < media.duration) media.currentTime = requested / 1_000;
      media.playbackRate = speed;
      pendingSeekMs.current = null;
      setReady(true);
      if (resumePlayback.current) {
        resumePlayback.current = false;
        void media.play();
      }
    },
    onTimeUpdate: (event: React.SyntheticEvent<HTMLVideoElement | HTMLAudioElement>) => {
      setTime(event.currentTarget.currentTime);
      scheduleProgress();
    },
    onPlay: () => setPlaying(true),
    onPause: () => {
      setPlaying(false);
      emitProgress("pause");
    },
    onEnded: () => {
      if (phase === "intro") finishIntro();
      else {
        setPlaying(false);
        emitProgress("ended");
      }
    },
    onError: (event: React.SyntheticEvent<HTMLVideoElement | HTMLAudioElement>) => {
      callbackRef.current.onEvent?.({ type: "media_error", phase: phase === "intro" ? "intro" : "program", code: event.currentTarget.error?.code });
      if (phase === "intro") startProgram(0, false);
    },
    onVolumeChange: (event: React.SyntheticEvent<HTMLVideoElement | HTMLAudioElement>) => setMuted(event.currentTarget.muted || event.currentTarget.volume === 0),
  };

  return (
    <section className={`harbor-media-player ${kind === "audio" ? "harbor-media-player--audio" : ""} ${className}`.trim()} aria-label={`${title} ${kind} player`} style={style}>
      {kind === "video" ? (
        <video ref={mediaRef as React.RefObject<HTMLVideoElement>} poster={poster ?? undefined} playsInline {...mediaProps}>
          {phase === "program" && captionsUrl ? <track kind="captions" src={captionsUrl} srcLang="en" label="English" /> : null}
        </video>
      ) : <audio ref={mediaRef as React.RefObject<HTMLAudioElement>} {...mediaProps} />}
      {phase === "gap" ? <div className="harbor-media-gap" aria-label="Brief transition to program" /> : null}
      {previewNotice ? <div className="harbor-media-notice"><strong>{previewNotice.title || labels.privatePreview}</strong><span>{previewNotice.body}</span></div> : null}
      {activeSegment ? <button type="button" className="harbor-media-skip" onClick={skipActiveSegment}><Glyph value="≫" /> {activeSegment.viewerLabel || "Skip segment"}</button> : null}
      {!ready && phase !== "gap" ? <div className="harbor-media-loading"><span className="harbor-media-spinner" /> {labels.loading}</div> : null}
      {kind === "audio" ? <div className="harbor-media-audio-identity">{branding?.mark}<span>{branding?.title}</span><strong>{title}</strong><small>{branding?.subtitle || labels.originalAudio}</small></div> : null}
      {chaptersOpen ? <div className="harbor-media-chapters" role="dialog" aria-label={labels.chapters}><div><strong>{labels.chapters}</strong><button type="button" onClick={() => setChaptersOpen(false)} aria-label="Close chapters">×</button></div>{chapters.map((chapter) => <button type="button" key={chapter.id} onClick={() => selectChapter(chapter)}><span>{formatMediaTime(chapter.playbackStartMs)}</span>{chapter.viewerLabel || chapter.internalName || "Chapter"}</button>)}</div> : null}
      <div className="harbor-media-controls">
        <label className="harbor-media-scrubber"><span className="harbor-media-sr-only">Playback position</span><input type="range" min={0} max={Math.max(duration + offsetMs / 1_000, 1)} step={0.1} value={Math.min(playbackTimeMs / 1_000, duration + offsetMs / 1_000 || 0)} onChange={(event) => seekPresentation(Number(event.target.value) * 1_000)} /></label>
        <div>
          <Control label={labels.back} glyph="↶" onClick={() => seek(-10)} />
          <Control label={playing ? labels.pause : labels.play} glyph={playing ? "Ⅱ" : "▶"} onClick={togglePlay} primary />
          <Control label={labels.forward} glyph="↷" onClick={() => seek(10)} />
          <span className="harbor-media-time">{formatMediaTime(playbackTimeMs)} / {formatMediaTime(duration * 1_000 + offsetMs)}</span>
          <Control label={muted ? labels.unmute : labels.mute} glyph={muted ? "⌁" : "◖"} onClick={() => { if (mediaRef.current) mediaRef.current.muted = !mediaRef.current.muted; }} />
          <Control label={`${labels.speed} ${speed} times`} glyph={`${speed}×`} onClick={selectSpeed} text />
          {chapters.length ? <Control label={labels.chapters} glyph="☷" onClick={() => setChaptersOpen((value) => !value)} active={chaptersOpen} /> : null}
          {captionsUrl ? <Control label={labels.captions} glyph="CC" onClick={toggleCaptions} active={captions} text /> : null}
          {kind === "video" ? <Control label={labels.pictureInPicture} glyph="▣" onClick={() => void pictureInPicture()} /> : null}
          {kind === "video" ? <Control label={labels.fullscreen} glyph="⛶" onClick={() => void fullscreen()} /> : null}
        </div>
      </div>
    </section>
  );
}

function Control({ label, glyph, onClick, primary = false, active = false, text = false }: { label: string; glyph: string; onClick: () => void; primary?: boolean; active?: boolean; text?: boolean }) {
  return <button type="button" className={`${primary ? "harbor-media-control--primary" : ""} ${active ? "is-active" : ""}`.trim()} onClick={onClick} aria-label={label} aria-pressed={active || undefined}><Glyph value={glyph} text={text} /></button>;
}

function Glyph({ value, text = false }: { value: string; text?: boolean }) {
  return <span className={text ? "harbor-media-glyph harbor-media-glyph--text" : "harbor-media-glyph"} aria-hidden="true">{value}</span>;
}
