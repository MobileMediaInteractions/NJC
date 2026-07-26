"use client";

import { useEffect, useRef, useState } from "react";
import { Captions, Expand, Gauge, LoaderCircle, Pause, PictureInPicture2, Play, RotateCcw, RotateCw, Volume2, VolumeX } from "lucide-react";

type Props = {
  contentId: string;
  kind: "video" | "audio";
  src: string;
  poster?: string | null;
  captionsUrl?: string | null;
  title: string;
  initialPositionMs?: number;
};

export function NjcPlusMediaPlayer({ contentId, kind, src, poster, captionsUrl, title, initialPositionMs = 0 }: Props) {
  const mediaRef = useRef<HTMLVideoElement | HTMLAudioElement>(null);
  const progressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [playing, setPlaying] = useState(false);
  const [ready, setReady] = useState(false);
  const [muted, setMuted] = useState(false);
  const [time, setTime] = useState(initialPositionMs / 1000);
  const [duration, setDuration] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [captions, setCaptions] = useState(false);

  function persist() {
    const media = mediaRef.current;
    if (!media || !Number.isFinite(media.duration)) return;
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
    persist();
  // Persisting on unmount intentionally reads the current media element.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
        src={src}
        poster={kind === "video" ? poster ?? undefined : undefined}
        preload="metadata"
        playsInline
        onLoadedMetadata={(event) => {
          const media = event.currentTarget;
          setDuration(media.duration);
          if (initialPositionMs > 0 && initialPositionMs / 1000 < media.duration - 10) media.currentTime = initialPositionMs / 1000;
          setReady(true);
        }}
        onTimeUpdate={(event) => { setTime(event.currentTarget.currentTime); schedulePersist(); }}
        onPlay={() => setPlaying(true)}
        onPause={() => { setPlaying(false); persist(); }}
        onEnded={() => { setPlaying(false); persist(); }}
        onVolumeChange={(event) => setMuted(event.currentTarget.muted || event.currentTarget.volume === 0)}
      >
        {captionsUrl ? <track kind="captions" src={captionsUrl} srcLang="en" label="English" /> : null}
      </Media>
      {!ready ? <div className="plus-player-loading"><LoaderCircle className="animate-spin" /> Loading player</div> : null}
      {kind === "audio" ? <div className="plus-audio-identity"><span>NJC+</span><strong>{title}</strong><small>Original audio</small></div> : null}
      <div className="plus-player-controls">
        <label className="plus-scrubber"><span className="sr-only">Playback position</span><input type="range" min={0} max={Math.max(duration, 1)} step={0.1} value={Math.min(time, duration || 0)} onChange={(event) => { const next = Number(event.target.value); if (mediaRef.current) mediaRef.current.currentTime = next; setTime(next); }} /></label>
        <div>
          <button onClick={() => seek(-10)} aria-label="Back 10 seconds"><RotateCcw /></button>
          <button onClick={togglePlay} className="plus-play" aria-label={playing ? "Pause" : "Play"}>{playing ? <Pause /> : <Play />}</button>
          <button onClick={() => seek(10)} aria-label="Forward 10 seconds"><RotateCw /></button>
          <span>{formatTime(time)} / {formatTime(duration)}</span>
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
