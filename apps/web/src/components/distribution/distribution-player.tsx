"use client";

import { useEffect, useRef, useState } from "react";
import {
  Captions,
  Expand,
  Gauge,
  Pause,
  Play,
  RotateCcw,
  RotateCw,
  Volume2,
  VolumeX,
} from "lucide-react";

export function DistributionPlayer({
  fileId,
  kind,
  title,
  initialPositionMs,
}: {
  fileId: string;
  kind: "video" | "audio";
  title: string;
  initialPositionMs: number;
}) {
  const mediaRef = useRef<HTMLVideoElement | HTMLAudioElement>(null);
  const lastSave = useRef(0);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [time, setTime] = useState(initialPositionMs / 1000);
  const [duration, setDuration] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [error, setError] = useState("");
  const source = `/api/v1/distribution/files/${fileId}/content`;

  function persist() {
    const media = mediaRef.current;
    if (!media || !Number.isFinite(media.duration)) return;
    void fetch("/api/v1/distribution/progress", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      keepalive: true,
      body: JSON.stringify({
        fileId,
        positionMs: Math.round(media.currentTime * 1000),
        durationMs: Math.round(media.duration * 1000),
        completed: media.currentTime / media.duration >= 0.95,
      }),
    }).catch(() => undefined);
  }

  useEffect(() => () => persist(), []); // eslint-disable-line react-hooks/exhaustive-deps

  function seek(delta: number) {
    const media = mediaRef.current;
    if (!media) return;
    media.currentTime = Math.max(
      0,
      Math.min(media.duration || 0, media.currentTime + delta),
    );
  }

  function cycleSpeed() {
    const values = [1, 1.25, 1.5, 1.75, 2];
    const next = values[(values.indexOf(speed) + 1) % values.length] ?? 1;
    if (mediaRef.current) mediaRef.current.playbackRate = next;
    setSpeed(next);
  }

  const Media = kind === "video" ? "video" : "audio";
  return (
    <section
      className={`distribution-player ${kind === "audio" ? "is-audio" : ""}`}
      aria-label={`${title} player`}
      onKeyDown={(event) => {
        if (event.key === " ") {
          event.preventDefault();
          const media = mediaRef.current;
          if (media?.paused) void media.play();
          else media?.pause();
        } else if (event.key === "ArrowLeft") seek(-10);
        else if (event.key === "ArrowRight") seek(10);
      }}
      tabIndex={0}
    >
      <Media
        ref={mediaRef as never}
        src={source}
        preload="metadata"
        playsInline
        onLoadedMetadata={(event) => {
          setDuration(event.currentTarget.duration);
          if (
            initialPositionMs > 0 &&
            initialPositionMs / 1000 < event.currentTarget.duration - 5
          ) {
            event.currentTarget.currentTime = initialPositionMs / 1000;
          }
        }}
        onPlay={() => setPlaying(true)}
        onPause={() => {
          setPlaying(false);
          persist();
        }}
        onEnded={() => {
          setPlaying(false);
          persist();
        }}
        onError={() =>
          setError("Playback could not start. Access may have expired or this codec is unsupported.")
        }
        onTimeUpdate={(event) => {
          setTime(event.currentTarget.currentTime);
          if (Date.now() - lastSave.current > 10_000) {
            lastSave.current = Date.now();
            persist();
          }
        }}
        onVolumeChange={(event) =>
          setMuted(event.currentTarget.muted || event.currentTarget.volume === 0)
        }
      />
      {kind === "audio" ? (
        <div className="distribution-audio-art">
          <span>NJC DISTRIBUTION</span>
          <h2>{title}</h2>
          <div aria-hidden="true">
            {Array.from({ length: 38 }, (_, index) => (
              <i key={index} style={{ height: `${25 + ((index * 37) % 70)}%` }} />
            ))}
          </div>
        </div>
      ) : null}
      {error ? <p className="distribution-player-error">{error}</p> : null}
      <div className="distribution-player-controls">
        <input
          type="range"
          min={0}
          max={Math.max(duration, 1)}
          step={0.1}
          value={Math.min(time, duration || 0)}
          aria-label="Playback position"
          onChange={(event) => {
            const value = Number(event.target.value);
            if (mediaRef.current) mediaRef.current.currentTime = value;
            setTime(value);
          }}
        />
        <div>
          <button onClick={() => seek(-10)} aria-label="Back 10 seconds">
            <RotateCcw />
          </button>
          <button
            className="primary"
            onClick={() => {
              const media = mediaRef.current;
              if (media?.paused) void media.play();
              else media?.pause();
            }}
            aria-label={playing ? "Pause" : "Play"}
          >
            {playing ? <Pause /> : <Play />}
          </button>
          <button onClick={() => seek(10)} aria-label="Forward 10 seconds">
            <RotateCw />
          </button>
          <span>
            {formatTime(time)} / {formatTime(duration)}
          </span>
          <button
            onClick={() => {
              if (mediaRef.current)
                mediaRef.current.muted = !mediaRef.current.muted;
            }}
            aria-label={muted ? "Unmute" : "Mute"}
          >
            {muted ? <VolumeX /> : <Volume2 />}
          </button>
          <button onClick={cycleSpeed} aria-label={`Playback speed ${speed}`}>
            <Gauge /> {speed}×
          </button>
          <button disabled aria-label="Captions unavailable">
            <Captions />
          </button>
          {kind === "video" ? (
            <button
              onClick={() =>
                void mediaRef.current?.parentElement?.requestFullscreen()
              }
              aria-label="Fullscreen"
            >
              <Expand />
            </button>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function formatTime(value: number) {
  if (!Number.isFinite(value)) return "0:00";
  const seconds = Math.floor(value % 60)
    .toString()
    .padStart(2, "0");
  const minutes = Math.floor((value / 60) % 60);
  const hours = Math.floor(value / 3600);
  return hours
    ? `${hours}:${minutes.toString().padStart(2, "0")}:${seconds}`
    : `${minutes}:${seconds}`;
}
