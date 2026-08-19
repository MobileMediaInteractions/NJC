"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { MediaControlId, MediaPlayerFeatureConfig, MediaPlayerLabels, MediaPlayerProps, PlayerProgressEvent } from "./types.js";
import { activeTimelineSegment, composePlaybackTimeline, formatMediaTime } from "./timeline.js";

const defaultLabels: MediaPlayerLabels = {
  back: "Back 10 seconds", forward: "Forward 10 seconds", play: "Play", pause: "Pause", mute: "Mute", unmute: "Unmute", speed: "Playback speed", captions: "Captions", chapters: "Chapters", pictureInPicture: "Picture in picture", fullscreen: "Fullscreen", loading: "Loading player", originalAudio: "Original audio", privatePreview: "Private preview", closeChapters: "Close chapters", playbackPosition: "Playback position", skipSegment: "Skip segment", transitionToProgram: "Brief transition to program", chapterFallback: "Chapter",
};

const defaultFeatures: MediaPlayerFeatureConfig = {
  platformIntro: true, skipSegments: true, scrubber: true, seekBackward: true, playPause: true, seekForward: true, time: true, volume: true, playbackSpeed: true, chapters: true, captions: true, pictureInPicture: true, fullscreen: true, previewNotice: true, audioBranding: true, progressPersistence: true,
};

const defaultControlOrder: MediaControlId[] = ["seek-backward", "play-pause", "seek-forward", "time", "volume", "speed", "chapters", "captions", "picture-in-picture", "fullscreen"];

export function MediaPlayer({ contentId, kind, src, title, poster, captionsUrl, captionTracks, initialPositionMs = 0, timelineSegments = [], platformIntro = null, previewNotice = null, branding, labels: suppliedLabels, features: suppliedFeatures, controlOrder = defaultControlOrder, playbackRates = [1, 1.25, 1.5, 1.75, 2], seekStepSeconds = 10, classNames = {}, slots = {}, controlsAriaLabel = "Media controls", ariaLabel, preload = "metadata", crossOrigin, persistIntervalMs = 10_000, dataAdapter, onProgress, onEvent, className = "", style }: MediaPlayerProps) {
  const features = { ...defaultFeatures, ...suppliedFeatures };
  const labels = { ...defaultLabels, ...suppliedLabels };
  const effectiveIntro = features.platformIntro ? platformIntro : null;
  const progressCallback = onProgress ?? dataAdapter?.saveProgress;
  const mediaRef = useRef<HTMLVideoElement | HTMLAudioElement>(null);
  const progressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const gapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingSeekMs = useRef<number | null>(null);
  const resumePlayback = useRef(false);
  const callbackRef = useRef({ contentId, progressCallback, onEvent });
  const [phase, setPhase] = useState<"intro" | "gap" | "program">(() => effectiveIntro && initialPositionMs === 0 ? "intro" : "program");
  const phaseRef = useRef(phase);
  const [playing, setPlaying] = useState(false);
  const [ready, setReady] = useState(false);
  const [muted, setMuted] = useState(false);
  const [time, setTime] = useState(initialPositionMs / 1_000);
  const [duration, setDuration] = useState(0);
  const [speed, setSpeed] = useState(playbackRates[0] ?? 1);
  const [captions, setCaptions] = useState(false);
  const [chaptersOpen, setChaptersOpen] = useState(false);
  const tracks = captionTracks?.length ? captionTracks : captionsUrl ? [{ src: captionsUrl, srcLang: "en", label: "English" }] : [];
  const presentation = useMemo(() => composePlaybackTimeline({ contentSegments: timelineSegments, platformIntro: effectiveIntro }), [effectiveIntro, timelineSegments]);
  const chapters = useMemo(() => presentation.filter((segment) => segment.source === "content" && segment.segmentType === "chapter"), [presentation]);
  const offsetMs = effectiveIntro ? effectiveIntro.durationMs + effectiveIntro.blackGapMs : 0;
  const playbackTimeMs = phase === "intro" ? time * 1_000 : phase === "gap" ? effectiveIntro?.durationMs ?? 0 : offsetMs + time * 1_000;
  const activeSegment = activeTimelineSegment(presentation, playbackTimeMs);
  const mediaSrc = phase === "intro" && effectiveIntro ? effectiveIntro.src : src;
  const slotContext = { title, phase, playing };

  callbackRef.current = { contentId, progressCallback, onEvent };
  phaseRef.current = phase;

  function emitProgress(reason: PlayerProgressEvent["reason"]) {
    const media = mediaRef.current;
    const callback = callbackRef.current.progressCallback;
    if (!features.progressPersistence || !media || phaseRef.current !== "program" || !callback || !Number.isFinite(media.duration)) return;
    void Promise.resolve(callback({ contentId: callbackRef.current.contentId, positionMs: Math.round(media.currentTime * 1_000), durationMs: Math.round(media.duration * 1_000), completed: media.currentTime / media.duration > 0.95, reason })).catch(() => undefined);
  }

  useEffect(() => () => {
    if (progressTimer.current) clearTimeout(progressTimer.current);
    if (gapTimer.current) clearTimeout(gapTimer.current);
    emitProgress("unmount");
  }, []);

  function changePhase(next: "intro" | "gap" | "program") { phaseRef.current = next; setPhase(next); callbackRef.current.onEvent?.({ type: "phase_change", phase: next }); }
  function startProgram(positionMs = 0, autoplay = true) { if (gapTimer.current) clearTimeout(gapTimer.current); pendingSeekMs.current = positionMs; resumePlayback.current = autoplay; changePhase("program"); setReady(false); setTime(positionMs / 1_000); }
  function finishIntro() { if (!effectiveIntro || effectiveIntro.blackGapMs === 0) return startProgram(0, true); changePhase("gap"); setPlaying(false); gapTimer.current = setTimeout(() => startProgram(0, true), effectiveIntro.blackGapMs); }
  function scheduleProgress() { if (progressTimer.current || !features.progressPersistence || !progressCallback) return; progressTimer.current = setTimeout(() => { progressTimer.current = null; emitProgress("interval"); }, persistIntervalMs); }
  function togglePlay() { const media = mediaRef.current; if (!media) return; if (media.paused) void media.play(); else media.pause(); }
  function seek(delta: number) { const media = mediaRef.current; if (!media) return; media.currentTime = Math.max(0, Math.min(media.duration || 0, media.currentTime + delta)); }
  function seekPresentation(nextMs: number) { if (effectiveIntro && nextMs < effectiveIntro.durationMs) { pendingSeekMs.current = nextMs; resumePlayback.current = playing; changePhase("intro"); setReady(false); return; } startProgram(Math.max(0, nextMs - offsetMs), playing); }
  function skipActiveSegment() { if (!activeSegment) return; if (activeSegment.source === "platform") startProgram(0, true); else { const media = mediaRef.current; if (media) media.currentTime = activeSegment.endMs / 1_000; setTime(activeSegment.endMs / 1_000); } callbackRef.current.onEvent?.({ type: "segment_skipped", segment: activeSegment }); }
  function selectChapter(segment: (typeof chapters)[number]) { startProgram(segment.startMs, playing); setChaptersOpen(false); callbackRef.current.onEvent?.({ type: "chapter_selected", segment }); }
  function selectSpeed() { const choices = playbackRates.length ? playbackRates : [1]; const next = choices[(choices.indexOf(speed) + 1) % choices.length] ?? choices[0] ?? 1; if (mediaRef.current) mediaRef.current.playbackRate = next; setSpeed(next); }
  function toggleCaptions() { const media = mediaRef.current; if (!media?.textTracks[0]) return; const next = !captions; for (const track of media.textTracks) track.mode = next && track === media.textTracks[0] ? "showing" : "hidden"; setCaptions(next); }
  async function fullscreen() { const media = mediaRef.current; if (!media) return; if (document.fullscreenElement) await document.exitFullscreen(); else await media.parentElement?.requestFullscreen(); }
  async function pictureInPicture() { const video = mediaRef.current; if (!(video instanceof HTMLVideoElement) || !document.pictureInPictureEnabled) return; if (document.pictureInPictureElement) await document.exitPictureInPicture(); else await video.requestPictureInPicture(); }

  const mediaProps = {
    src: mediaSrc, preload, crossOrigin,
    onLoadedMetadata: (event: React.SyntheticEvent<HTMLVideoElement | HTMLAudioElement>) => { const media = event.currentTarget; if (phase === "program") setDuration(media.duration); const requested = pendingSeekMs.current ?? (phase === "program" ? initialPositionMs : 0); if (requested > 0 && requested / 1_000 < media.duration) media.currentTime = requested / 1_000; media.playbackRate = speed; pendingSeekMs.current = null; setReady(true); if (resumePlayback.current) { resumePlayback.current = false; void media.play(); } },
    onTimeUpdate: (event: React.SyntheticEvent<HTMLVideoElement | HTMLAudioElement>) => { setTime(event.currentTarget.currentTime); scheduleProgress(); },
    onPlay: () => setPlaying(true),
    onPause: () => { setPlaying(false); emitProgress("pause"); },
    onEnded: () => { if (phase === "intro") finishIntro(); else { setPlaying(false); emitProgress("ended"); } },
    onError: (event: React.SyntheticEvent<HTMLVideoElement | HTMLAudioElement>) => { callbackRef.current.onEvent?.({ type: "media_error", phase: phase === "intro" ? "intro" : "program", code: event.currentTarget.error?.code }); if (phase === "intro") startProgram(0, false); },
    onVolumeChange: (event: React.SyntheticEvent<HTMLVideoElement | HTMLAudioElement>) => setMuted(event.currentTarget.muted || event.currentTarget.volume === 0),
  };

  function customControl(id: MediaControlId, label: string, glyph: string, onPress: () => void, active = false, primary = false, text = false) {
    const defaultControl = <Control label={label} glyph={glyph} onClick={onPress} active={active} primary={primary} text={text} />;
    return <span className={`harbor-media-control-slot harbor-media-control-slot--${id}`} key={id}>{slots.control?.({ id, label, active, onPress, defaultControl }) ?? defaultControl}</span>;
  }

  function renderControl(id: MediaControlId) {
    if (id === "seek-backward") return features.seekBackward ? customControl(id, labels.back.replace("10", String(seekStepSeconds)), "↶", () => seek(-seekStepSeconds)) : null;
    if (id === "play-pause") return features.playPause ? customControl(id, playing ? labels.pause : labels.play, playing ? "Ⅱ" : "▶", togglePlay, false, true) : null;
    if (id === "seek-forward") return features.seekForward ? customControl(id, labels.forward.replace("10", String(seekStepSeconds)), "↷", () => seek(seekStepSeconds)) : null;
    if (id === "time") return features.time ? <span key={id} className={`harbor-media-time ${classNames.time ?? ""}`.trim()}>{formatMediaTime(playbackTimeMs)} / {formatMediaTime(duration * 1_000 + offsetMs)}</span> : null;
    if (id === "volume") return features.volume ? customControl(id, muted ? labels.unmute : labels.mute, muted ? "⌁" : "◖", () => { if (mediaRef.current) mediaRef.current.muted = !mediaRef.current.muted; }) : null;
    if (id === "speed") return features.playbackSpeed ? customControl(id, `${labels.speed} ${speed} times`, `${speed}×`, selectSpeed, false, false, true) : null;
    if (id === "chapters") return features.chapters && chapters.length ? customControl(id, labels.chapters, "☷", () => setChaptersOpen((value) => !value), chaptersOpen) : null;
    if (id === "captions") return features.captions && tracks.length ? customControl(id, labels.captions, "CC", toggleCaptions, captions, false, true) : null;
    if (id === "picture-in-picture") return features.pictureInPicture && kind === "video" ? customControl(id, labels.pictureInPicture, "▣", () => void pictureInPicture()) : null;
    if (id === "fullscreen") return features.fullscreen && kind === "video" ? customControl(id, labels.fullscreen, "⛶", () => void fullscreen()) : null;
    return null;
  }

  return (
    <section className={`harbor-media-player ${kind === "audio" ? "harbor-media-player--audio" : ""} ${classNames.root ?? ""} ${className}`.trim()} aria-label={ariaLabel ?? `${title} ${kind} player`} style={style}>
      {kind === "video" ? <video className={classNames.media} ref={mediaRef as React.RefObject<HTMLVideoElement>} poster={poster ?? undefined} playsInline {...mediaProps}>{phase === "program" ? tracks.map((track) => <track key={`${track.srcLang}:${track.src}`} kind="captions" src={track.src} srcLang={track.srcLang} label={track.label} default={track.default} />) : null}</video> : <audio className={classNames.media} ref={mediaRef as React.RefObject<HTMLAudioElement>} {...mediaProps} />}
      {phase === "gap" ? <div className={`harbor-media-gap ${classNames.gap ?? ""}`.trim()} aria-label={labels.transitionToProgram} /> : null}
      {previewNotice && features.previewNotice ? slots.previewNotice?.({ ...slotContext, notice: previewNotice }) ?? <div className={`harbor-media-notice ${classNames.notice ?? ""}`.trim()}><strong>{previewNotice.title || labels.privatePreview}</strong><span>{previewNotice.body}</span></div> : null}
      {activeSegment && features.skipSegments ? slots.skipButton?.({ ...slotContext, segment: activeSegment, onSkip: skipActiveSegment }) ?? <button type="button" className={`harbor-media-skip ${classNames.skip ?? ""}`.trim()} onClick={skipActiveSegment}><Glyph value="≫" /> {activeSegment.viewerLabel || labels.skipSegment}</button> : null}
      {!ready && phase !== "gap" ? slots.loading?.(slotContext) ?? <div className={`harbor-media-loading ${classNames.loading ?? ""}`.trim()}><span className="harbor-media-spinner" /> {labels.loading}</div> : null}
      {kind === "audio" && features.audioBranding ? slots.audioIdentity?.({ ...slotContext, branding }) ?? <div className={`harbor-media-audio-identity ${classNames.audioIdentity ?? ""}`.trim()}>{branding?.mark}<span>{branding?.title}</span><strong>{title}</strong><small>{branding?.subtitle || labels.originalAudio}</small></div> : null}
      {chaptersOpen && features.chapters ? <div className={`harbor-media-chapters ${classNames.chapters ?? ""}`.trim()} role="dialog" aria-label={labels.chapters}><div><strong>{labels.chapters}</strong><button type="button" onClick={() => setChaptersOpen(false)} aria-label={labels.closeChapters}>×</button></div>{chapters.map((chapter) => <button type="button" key={chapter.id} onClick={() => selectChapter(chapter)}><span>{formatMediaTime(chapter.playbackStartMs)}</span>{chapter.viewerLabel || chapter.internalName || labels.chapterFallback}</button>)}</div> : null}
      <div className={`harbor-media-controls ${classNames.controls ?? ""}`.trim()} aria-label={controlsAriaLabel}>{slots.beforeControls}{features.scrubber ? <label className={`harbor-media-scrubber ${classNames.scrubber ?? ""}`.trim()}><span className="harbor-media-sr-only">{labels.playbackPosition}</span><input type="range" min={0} max={Math.max(duration + offsetMs / 1_000, 1)} step={0.1} value={Math.min(playbackTimeMs / 1_000, duration + offsetMs / 1_000 || 0)} onChange={(event) => seekPresentation(Number(event.target.value) * 1_000)} /></label> : null}<div className={classNames.controlRow}>{controlOrder.map(renderControl)}</div>{slots.afterControls}</div>
    </section>
  );
}

function Control({ label, glyph, onClick, primary = false, active = false, text = false }: { label: string; glyph: string; onClick: () => void; primary?: boolean; active?: boolean; text?: boolean }) {
  return <button type="button" className={`${primary ? "harbor-media-control--primary" : ""} ${active ? "is-active" : ""}`.trim()} onClick={onClick} aria-label={label} aria-pressed={active || undefined}><Glyph value={glyph} text={text} /></button>;
}

function Glyph({ value, text = false }: { value: string; text?: boolean }) { return <span className={text ? "harbor-media-glyph harbor-media-glyph--text" : "harbor-media-glyph"} aria-hidden="true">{value}</span>; }
