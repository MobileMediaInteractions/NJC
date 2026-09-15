import Image from "next/image";
import { useRef, type CSSProperties, type PointerEvent as ReactPointerEvent } from "react";
import { podcastAssets } from "@/lib/assets";
import type { MotionDeckFrame } from "@/lib/two-dudes-motion-deck";
import type { TwoDudesEpisode } from "@/lib/two-dudes-in-wheels";
import styles from "./two-dudes-motion-deck.module.css";

export function TwoDudesMotionDeck({
  frame,
  car,
  playing,
}: {
  frame: MotionDeckFrame;
  car: TwoDudesEpisode["car"];
  playing: boolean;
}) {
  const stageRef = useRef<HTMLDivElement>(null);
  const motionStyle = {
    "--cue-progress": frame.cueProgress,
    "--episode-progress": frame.episodeProgress,
  } as CSSProperties;

  function moveLight(event: ReactPointerEvent<HTMLDivElement>) {
    const stage = stageRef.current;
    if (!stage) return;
    const bounds = stage.getBoundingClientRect();
    const x = (event.clientX - bounds.left) / bounds.width;
    const y = (event.clientY - bounds.top) / bounds.height;
    stage.style.setProperty("--pointer-x", `${x * 100}%`);
    stage.style.setProperty("--pointer-y", `${y * 100}%`);
    stage.style.setProperty("--photo-x", `${(0.5 - x) * 12}px`);
    stage.style.setProperty("--photo-y", `${(0.5 - y) * 12}px`);
  }

  function resetLight() {
    stageRef.current?.style.setProperty("--pointer-x", "68%");
    stageRef.current?.style.setProperty("--pointer-y", "24%");
    stageRef.current?.style.setProperty("--photo-x", "0px");
    stageRef.current?.style.setProperty("--photo-y", "0px");
  }

  return (
    <div
      ref={stageRef}
      className={`${styles.engine} ${playing ? styles.playing : ""}`}
      data-scene={frame.cue.scene}
      data-motion={frame.cue.motion}
      data-transition={frame.cue.transition}
      onPointerMove={moveLight}
      onPointerLeave={resetLight}
      style={motionStyle}
      role="group"
      aria-label={`Animated ${perspectiveLabel(frame.cue.perspective)} scene synchronized to the podcast`}
    >
      <div className={styles.ambient} aria-hidden="true"><i /><i /><i /></div>
      {frame.visual ? (
        <figure key={frame.visual.id} className={styles.photoLayer}>
          <Image
            src={frame.visual.imageUrl}
            alt={frame.visual.alt}
            fill
            priority={frame.visual.startMs === 0}
            sizes="(max-width: 900px) 100vw, 62vw"
            style={{ objectPosition: `${frame.visual.focalPoint.x}% ${frame.visual.focalPoint.y}%` }}
          />
          <figcaption>
            <span>{perspectiveLabel(frame.visual.perspective)}</span>
            {frame.visual.caption}
          </figcaption>
        </figure>
      ) : (
        <ProceduralCarScene perspective={frame.cue.perspective} />
      )}

      <div key={frame.cue.id} className={styles.sceneCopy}>
        <span>{frame.cue.eyebrow ?? perspectiveLabel(frame.cue.perspective)}</span>
        <strong>{frame.cue.title}</strong>
        <small>{car.year} {car.make} {car.model}{car.trim ? ` · ${car.trim}` : ""}</small>
      </div>

      {frame.cue.callouts.length ? (
        <div className={styles.callouts} aria-label="Current discussion details">
          {frame.cue.callouts.map((callout) => (
            <div key={`${callout.label}:${callout.value}`}><span>{callout.label}</span><strong>{callout.value}</strong></div>
          ))}
        </div>
      ) : null}

      <div className={styles.engineBadge}>
        <Image src={podcastAssets.twoDudesInWheelsPlaceholderLogo} alt="" width={52} height={52} />
        <span>Courier MotionDeck <b>01</b></span>
      </div>
      <div className={styles.timeline} aria-hidden="true"><i /></div>
    </div>
  );
}

function ProceduralCarScene({ perspective }: { perspective: MotionDeckFrame["cue"]["perspective"] }) {
  return (
    <div className={styles.procedural} data-perspective={perspective} aria-hidden="true">
      <div className={styles.horizon}><i /><i /><i /><i /></div>
      <div className={styles.road}><i /><i /><i /><i /></div>
      <div className={styles.carRig}>
        <svg viewBox="0 0 820 360">
          <path className={styles.carBody} d="M89 254c20-72 64-114 135-127l116-22c61-12 116-8 175 9l128 38c45 13 80 45 101 88l10 22H75l14-8Z" />
          <path className={styles.glass} d="m257 140 99-20c48-9 91-6 138 7l82 24-319-11Z" />
          <path className={styles.signal} d="M107 231h62M656 231h66" />
          <circle cx="232" cy="270" r="58" />
          <circle cx="626" cy="270" r="58" />
        </svg>
        <div className={styles.scanLine} />
      </div>
      <div className={styles.cabinMap}>
        <span className={styles.driverSeat}>Driver</span>
        <span className={styles.passengerSeat}>Passenger</span>
      </div>
    </div>
  );
}

function perspectiveLabel(value: MotionDeckFrame["cue"]["perspective"]) {
  return value === "driver" ? "Driver view" : value === "passenger" ? "Passenger view" : value === "both" ? "Both seats" : "Road context";
}
