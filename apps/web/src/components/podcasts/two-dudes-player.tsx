"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { Gauge, Pause, Play, RotateCcw, RotateCw, Share2, Volume2 } from "lucide-react";
import {
  buildPodcastWaveform,
  findEpisodeMoment,
  type TwoDudesEpisode,
} from "@/lib/two-dudes-in-wheels";
import styles from "./two-dudes-player.module.css";

export function TwoDudesPlayer({ episode }: { episode: TwoDudesEpisode }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [positionMs, setPositionMs] = useState(0);
  const [durationMs, setDurationMs] = useState(episode.durationMs);
  const [speed, setSpeed] = useState(1);
  const [muted, setMuted] = useState(false);
  const [message, setMessage] = useState("");
  const waveform = useMemo(
    () => episode.waveform ?? buildPodcastWaveform(`${episode.id}:${episode.title}`),
    [episode.id, episode.title, episode.waveform],
  );
  const progress = durationMs > 0 ? Math.min(positionMs / durationMs, 1) : 0;
  const activeVisual = findEpisodeMoment(episode.visualCues, positionMs);
  const activeTranscript = findEpisodeMoment(episode.transcript, positionMs);

  useEffect(() => {
    if (!("mediaSession" in navigator)) return;
    navigator.mediaSession.metadata = new MediaMetadata({
      title: episode.title,
      artist: "Two Dudes in Wheels",
      album: "The New Jersey Courier",
      artwork: episode.visualCues[0]
        ? [{ src: episode.visualCues[0].imageUrl, sizes: "1200x675" }]
        : undefined,
    });
    const seek = (offset: number) => {
      const audio = audioRef.current;
      if (!audio) return;
      audio.currentTime = Math.max(0, Math.min(audio.duration || 0, audio.currentTime + offset));
    };
    const actions: MediaSessionAction[] = ["play", "pause", "seekbackward", "seekforward"];
    navigator.mediaSession.setActionHandler("play", () => void audioRef.current?.play());
    navigator.mediaSession.setActionHandler("pause", () => audioRef.current?.pause());
    navigator.mediaSession.setActionHandler("seekbackward", () => seek(-15));
    navigator.mediaSession.setActionHandler("seekforward", () => seek(15));
    return () => {
      for (const action of actions) {
        try {
          navigator.mediaSession.setActionHandler(action, null);
        } catch {
          // Some browsers expose Media Session without supporting every action.
        }
      }
    };
  }, [episode.title, episode.visualCues]);

  function seekTo(nextMs: number) {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = Math.max(0, Math.min(durationMs, nextMs)) / 1_000;
    setPositionMs(audio.currentTime * 1_000);
  }

  async function togglePlayback() {
    const audio = audioRef.current;
    if (!audio) return;
    setMessage("");
    try {
      if (audio.paused) await audio.play();
      else audio.pause();
    } catch {
      setMessage("Playback could not start. Check the connection and try again.");
    }
  }

  function cycleSpeed() {
    const rates = [1, 1.25, 1.5, 2];
    const next = rates[(rates.indexOf(speed) + 1) % rates.length] ?? 1;
    if (audioRef.current) audioRef.current.playbackRate = next;
    setSpeed(next);
  }

  async function shareEpisode() {
    const url = window.location.href;
    const data = { title: episode.title, text: `Listen to ${episode.title} from Two Dudes in Wheels.`, url };
    if (navigator.share) {
      await navigator.share(data).catch(() => undefined);
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      setMessage("Episode link copied.");
    } catch {
      setMessage("Copy failed. Use your browser address bar to copy the episode link.");
    }
  }

  return (
    <section className={styles.player} aria-label={`${episode.title} podcast player`}>
      <audio
        ref={audioRef}
        src={episode.audioUrl}
        preload="metadata"
        onLoadedMetadata={(event) => {
          const measured = Number.isFinite(event.currentTarget.duration)
            ? event.currentTarget.duration * 1_000
            : episode.durationMs;
          setDurationMs(measured);
        }}
        onTimeUpdate={(event) => {
          const next = event.currentTarget.currentTime * 1_000;
          setPositionMs(next);
          if ("mediaSession" in navigator && Number.isFinite(event.currentTarget.duration) && event.currentTarget.duration > 0) {
            try {
              navigator.mediaSession.setPositionState({
                duration: event.currentTarget.duration,
                playbackRate: event.currentTarget.playbackRate,
                position: Math.min(event.currentTarget.currentTime, event.currentTarget.duration),
              });
            } catch {
              // Playback continues even when the host OS rejects position updates.
            }
          }
        }}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
        onVolumeChange={(event) => setMuted(event.currentTarget.muted || event.currentTarget.volume === 0)}
      />

      <div className={styles.stage}>
        {activeVisual ? (
          <figure key={activeVisual.id} className={styles.visualCue}>
            <Image
              src={activeVisual.imageUrl}
              alt={activeVisual.alt}
              fill
              priority={activeVisual === episode.visualCues[0]}
              sizes="(max-width: 900px) 100vw, 62vw"
              style={{ objectPosition: `${activeVisual.focalPoint.x}% ${activeVisual.focalPoint.y}%` }}
              className={styles.carImage}
            />
            <figcaption><span>{perspectiveLabel(activeVisual.perspective)}</span>{activeVisual.caption}</figcaption>
          </figure>
        ) : (
          <RoadStage playing={playing} car={`${episode.car.year} ${episode.car.make} ${episode.car.model}`} />
        )}
        <div className={styles.stageIdentity}>
          <span>Two Dudes</span>
          <strong>in Wheels</strong>
          <small>{episode.car.year} {episode.car.make} {episode.car.model}{episode.car.trim ? ` · ${episode.car.trim}` : ""}</small>
        </div>
      </div>

      <div className={styles.console}>
        <div className={styles.episodeHeading}>
          <div><span>Episode {episode.episodeNumber}</span><h2>{episode.title}</h2></div>
          <button type="button" onClick={() => void shareEpisode()} aria-label="Share this episode"><Share2 /></button>
        </div>

        <div className={`${styles.waveform} ${playing ? styles.isPlaying : ""}`} aria-hidden="true">
          {waveform.map((height, index) => (
            <i
              key={`${index}:${height}`}
              className={index / waveform.length <= progress ? styles.playedBar : undefined}
              style={{ "--wave-height": height, "--wave-delay": `${(index % 9) * -73}ms` } as CSSProperties}
            />
          ))}
        </div>
        <label className={styles.scrubber}>
          <span className="sr-only">Episode position</span>
          <input type="range" min={0} max={Math.max(durationMs, 1)} step={500} value={Math.min(positionMs, durationMs)} onChange={(event) => seekTo(Number(event.target.value))} />
        </label>
        <div className={styles.timeRow}><span>{formatTime(positionMs)}</span><span>-{formatTime(Math.max(durationMs - positionMs, 0))}</span></div>

        <div className={styles.controls}>
          <button type="button" onClick={() => seekTo(positionMs - 15_000)} aria-label="Go back 15 seconds"><RotateCcw /><span>15</span></button>
          <button type="button" className={styles.playButton} onClick={() => void togglePlayback()} aria-label={playing ? "Pause episode" : "Play episode"}>{playing ? <Pause /> : <Play />}</button>
          <button type="button" onClick={() => seekTo(positionMs + 15_000)} aria-label="Go forward 15 seconds"><RotateCw /><span>15</span></button>
          <button type="button" onClick={cycleSpeed} aria-label={`Playback speed ${speed} times`}><Gauge /><span>{speed}×</span></button>
          <button type="button" onClick={() => { if (audioRef.current) audioRef.current.muted = !audioRef.current.muted; }} aria-label={muted ? "Unmute episode" : "Mute episode"}><Volume2 /><span>{muted ? "Off" : "On"}</span></button>
        </div>
        {message ? <p className={styles.playerMessage} role="status">{message}</p> : null}

        <div className={styles.nowTalking} aria-live="polite">
          <span>{activeTranscript ? speakerLabel(activeTranscript.speaker) : "On the road"}</span>
          <p>{activeTranscript?.text ?? "Timed imagery and the accessible transcript will follow the conversation as the episode plays."}</p>
        </div>

        {episode.chapters.length ? <div className={styles.chapters}><h3>Chapters</h3>{episode.chapters.map((chapter) => <button type="button" key={chapter.id} onClick={() => seekTo(chapter.startMs)}><span>{formatTime(chapter.startMs)}</span>{chapter.title}</button>)}</div> : null}
        {episode.transcript.length ? <details className={styles.transcript}><summary>Read the full transcript</summary><div>{episode.transcript.map((cue) => <button type="button" key={cue.id} className={cue === activeTranscript ? styles.activeTranscript : undefined} onClick={() => seekTo(cue.startMs)}><span>{formatTime(cue.startMs)} · {speakerLabel(cue.speaker)}</span>{cue.text}</button>)}</div></details> : null}
      </div>
    </section>
  );
}

function RoadStage({ playing, car }: { playing: boolean; car: string }) {
  return <div className={`${styles.roadStage} ${playing ? styles.roadStageMoving : ""}`} role="img" aria-label={`Animated road scene for the ${car}`}><div className={styles.skyGlow} /><div className={styles.road}><i /><i /><i /></div><svg viewBox="0 0 760 300" aria-hidden="true"><path d="M131 205c14-48 43-78 93-87l96-19c50-10 85-9 134 4l105 28c34 9 59 31 74 60l10 20-33 8H151l-36-6 16-8Z" /><path d="m250 126 74-15c41-8 73-7 114 3l73 20-261-8Z" /><circle cx="235" cy="217" r="46" /><circle cx="552" cy="217" r="46" /></svg></div>;
}

function formatTime(valueMs: number) {
  const seconds = Math.max(0, Math.floor(valueMs / 1_000));
  const hours = Math.floor(seconds / 3_600);
  const minutes = Math.floor((seconds % 3_600) / 60);
  const remainder = seconds % 60;
  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`
    : `${minutes}:${String(remainder).padStart(2, "0")}`;
}

function perspectiveLabel(value: TwoDudesEpisode["visualCues"][number]["perspective"]) {
  return value === "driver" ? "Driver view" : value === "passenger" ? "Passenger view" : value === "both" ? "Both seats" : "Road context";
}

function speakerLabel(value: TwoDudesEpisode["transcript"][number]["speaker"]) {
  return value === "driver" ? "Driver" : value === "passenger" ? "Passenger" : "NJC";
}
