"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Captions, Expand, FastForward, Gauge, LoaderCircle, Pause, PictureInPicture2, Play, RotateCcw, RotateCw, Volume2, VolumeX } from "lucide-react";
import { activeTimelineSegment, composePlaybackTimeline, type PlatformIntroPresentation } from "@/lib/njc-plus-timeline";
import type { PremiumTimelineSegmentInput } from "@/lib/njc-plus-contract";

type Props = {
  contentId: string;
  kind: "video" | "audio";
  src: string;
  poster?: string | null;
  captionsUrl?: string | null;
  title: string;
  initialPositionMs?: number;
  timelineSegments?: Array<PremiumTimelineSegmentInput & { id: string }>;
  platformIntro?: PlatformIntroPresentation | null;
  previewDisclaimer?: string | null;
};

export function NjcPlusMediaPlayer({ contentId, kind, src, poster, captionsUrl, title, initialPositionMs = 0, timelineSegments = [], platformIntro = null, previewDisclaimer = null }: Props) {
  const mediaRef = useRef<HTMLVideoElement | HTMLAudioElement>(null);
  const progressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const gapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingSeekMs = useRef<number | null>(null);
  const resumePlayback = useRef(false);
  const [phase, setPhase] = useState<"intro" | "gap" | "program">(() => platformIntro && initialPositionMs === 0 ? "intro" : "program");
  const phaseRef = useRef(phase);
  const [playing, setPlaying] = useState(false);
  const [ready, setReady] = useState(false);
  const [muted, setMuted] = useState(false);
  const [time, setTime] = useState(initialPositionMs / 1000);
  const [duration, setDuration] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [captions, setCaptions] = useState(false);
  const presentation = useMemo(() => composePlaybackTimeline({ contentSegments: timelineSegments, platformIntro }), [platformIntro, timelineSegments]);
  const offsetMs = platformIntro ? platformIntro.durationMs + platformIntro.blackGapMs : 0;
  const playbackTimeMs = phase === "intro" ? time * 1_000 : phase === "gap" ? platformIntro?.durationMs ?? 0 : offsetMs + time * 1_000;
  const activeSegment = activeTimelineSegment(presentation, playbackTimeMs);
  const mediaSrc = phase === "intro" && platformIntro ? platformIntro.src : src;

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  function persist() {
    const media = mediaRef.current;
    if (!media || phaseRef.current !== "program" || !Number.isFinite(media.duration)) return;
    void fetch("/api/v1/plus/progress", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contentId,
        positionMs: Math.round(media.currentTime * 1000),
        durationMs: Math.round(media.duration * 1000),
        completed: media.currentTime / media.duration > 0.95,
        devicePlatform: "web",
      }),
      keepalive: true,
    }).catch(() => undefined);
  }

  useEffect(() => () => {
    if (progressTimer.current) clearTimeout(progressTimer.current);
    if (gapTimer.current) clearTimeout(gapTimer.current);
    persist();
  // Persisting on unmount intentionally reads the current media element.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function startProgram(positionMs = 0, autoplay = true) {
    if (gapTimer.current) clearTimeout(gapTimer.current);
    pendingSeekMs.current = positionMs;
    resumePlayback.current = autoplay;
    setPhase("program");
    setReady(false);
    setTime(positionMs / 1_000);
  }

  function finishIntro() {
    if (!platformIntro || platformIntro.blackGapMs === 0) return startProgram(0, true);
    setPhase("gap");
    setPlaying(false);
    gapTimer.current = setTimeout(() => startProgram(0, true), platformIntro.blackGapMs);
  }

  function schedulePersist() {
    if (progressTimer.current) return;
    progressTimer.current = setTimeout(() => {
      progressTimer.current = null;
      persist();
    }, 10_000);
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
      setPhase("intro");
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

  const Media = kind === "video" ? "video" : "audio";
  return (
    <section className={`plus-player ${kind === "audio" ? "plus-player-audio" : ""}`} aria-label={`${title} ${kind} player`}>
      <Media
        ref={mediaRef as never}
        src={mediaSrc}
        poster={kind === "video" ? poster ?? undefined : undefined}
        preload="metadata"
        playsInline
        onLoadedMetadata={(event) => {
          const media = event.currentTarget;
          if (phase === "program") setDuration(media.duration);
          const requested = pendingSeekMs.current ?? (phase === "program" ? initialPositionMs : 0);
          if (requested > 0 && requested / 1000 < media.duration) media.currentTime = requested / 1000;
          pendingSeekMs.current = null;
          setReady(true);
          if (resumePlayback.current) { resumePlayback.current = false; void media.play(); }
        }}
        onTimeUpdate={(event) => { setTime(event.currentTarget.currentTime); schedulePersist(); }}
        onPlay={() => setPlaying(true)}
        onPause={() => { setPlaying(false); persist(); }}
        onEnded={() => { if (phase === "intro") finishIntro(); else { setPlaying(false); persist(); } }}
        onVolumeChange={(event) => setMuted(event.currentTarget.muted || event.currentTarget.volume === 0)}
      >
        {phase === "program" && captionsUrl ? <track kind="captions" src={captionsUrl} srcLang="en" label="English" /> : null}
      </Media>
      {phase === "gap" ? <div className="plus-player-black-gap" aria-label="Brief transition to program" /> : null}
      {previewDisclaimer ? <div className="plus-preview-watermark"><strong>Private Preview</strong><span>{previewDisclaimer}</span></div> : null}
      {activeSegment ? <button type="button" className="plus-skip-segment" onClick={skipActiveSegment}><FastForward /> {activeSegment.viewerLabel || "Skip Segment"}</button> : null}
      {!ready ? <div className="plus-player-loading"><LoaderCircle className="animate-spin" /> Loading player</div> : null}
      {kind === "audio" ? <div className="plus-audio-identity"><span>NJC+</span><strong>{title}</strong><small>Original audio</small></div> : null}
      <div className="plus-player-controls">
        <label className="plus-scrubber"><span className="sr-only">Playback position</span><input type="range" min={0} max={Math.max((duration * 1_000 + offsetMs) / 1_000, 1)} step={0.1} value={Math.min(playbackTimeMs / 1_000, (duration * 1_000 + offsetMs) / 1_000 || 0)} onChange={(event) => seekPresentation(Number(event.target.value) * 1_000)} /></label>
        <div>
          <button onClick={() => seek(-10)} aria-label="Back 10 seconds"><RotateCcw /></button>
          <button onClick={togglePlay} className="plus-play" aria-label={playing ? "Pause" : "Play"}>{playing ? <Pause /> : <Play />}</button>
          <button onClick={() => seek(10)} aria-label="Forward 10 seconds"><RotateCw /></button>
          <span>{formatTime(playbackTimeMs / 1_000)} / {formatTime(duration + offsetMs / 1_000)}</span>
          <button onClick={() => { if (mediaRef.current) mediaRef.current.muted = !mediaRef.current.muted; }} aria-label={muted ? "Unmute" : "Mute"}>{muted ? <VolumeX /> : <Volume2 />}</button>
          <button onClick={selectSpeed} aria-label={`Playback speed ${speed} times`}><Gauge /><b>{speed}×</b></button>
          {captionsUrl ? <button className={captions ? "is-active" : ""} onClick={toggleCaptions} aria-pressed={captions} aria-label="Captions"><Captions /></button> : null}
          {kind === "video" ? <button onClick={() => void pictureInPicture()} aria-label="Picture in picture"><PictureInPicture2 /></button> : null}
          {kind === "video" ? <button onClick={() => void fullscreen()} aria-label="Fullscreen"><Expand /></button> : null}
        </div>
      </div>
    </section>
  );
}

function formatTime(value: number) {
  if (!Number.isFinite(value)) return "0:00";
  const seconds = Math.floor(value % 60).toString().padStart(2, "0");
  const minutes = Math.floor((value / 60) % 60);
  const hours = Math.floor(value / 3600);
  return hours ? `${hours}:${minutes.toString().padStart(2, "0")}:${seconds}` : `${minutes}:${seconds}`;
}
