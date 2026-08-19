"use client";

import { useState } from "react";
import { MediaPlayer, TimelineEditor, type TimelineSegment } from "@harborline/media-player";
import styles from "./media-player-showcase.module.css";

const source = "/demo/harborline-player-demo.mp4";
const initialSegments: TimelineSegment[] = [
  { id: "cold-open", segmentType: "intro", startMs: 0, endMs: 4_000, internalName: "Cold open", viewerLabel: "Skip opening", skippable: true, sortOrder: 0 },
  { id: "chapter-one", segmentType: "chapter", startMs: 4_000, endMs: 17_000, internalName: "The first report", viewerLabel: "The first report", skippable: false, sortOrder: 1 },
  { id: "chapter-two", segmentType: "chapter", startMs: 17_000, endMs: 28_000, internalName: "Inside the newsroom", viewerLabel: "Inside the newsroom", skippable: false, sortOrder: 2 },
  { id: "credits", segmentType: "credits", startMs: 28_000, endMs: 32_000, internalName: "Credits", viewerLabel: null, skippable: false, sortOrder: 3 },
];

export function MediaPlayerShowcase() {
  const [segments, setSegments] = useState(initialSegments);
  return (
    <main className={styles.page}>
      <header className={styles.hero}>
        <p>HARBORLINE MEDIA SDK · VISUAL WORKBENCH</p>
        <h1>One media system.<br />Your product language.</h1>
        <span>The playback engine, visual timeline and transport adapters can be themed, rearranged, reduced or replaced without inheriting NJC presentation.</span>
      </header>

      <section className={styles.viewerSection} data-screenshot="viewer">
        <div className={styles.sectionIntro}><div><span>01 · VIEWER</span><h2>Editorial playback, re-skinned.</h2></div><p>This specimen uses a custom palette, control order, labels, spacing hooks and an injected release badge.</p></div>
        <div className={styles.viewerGrid}>
          <MediaPlayer
            contentId="sdk-workbench"
            kind="video"
            src={source}
            title="The Garden State, frame by frame"
            timelineSegments={segments}
            previewNotice={{ title: "SDK workbench", body: "Demonstration media only · no private content or credentials." }}
            branding={{ title: "HARBORLINE", subtitle: "Media systems" }}
            controlOrder={["play-pause", "seek-backward", "seek-forward", "time", "chapters", "volume", "speed", "fullscreen"]}
            playbackRates={[0.75, 1, 1.5, 2]}
            seekStepSeconds={5}
            labels={{ back: "Back 5 seconds", forward: "Forward 5 seconds" }}
            features={{ captions: false, pictureInPicture: false }}
            slots={{
              beforeControls: <span className={styles.releaseBadge}>RELEASE 0.2 · CUSTOM HOST</span>,
              loading: () => <div className={styles.programFrame}><span>FIELD NOTE 07</span><strong>The Garden State,<br />frame by frame.</strong><small>HARBORLINE ORIGINAL MEDIA</small></div>,
            }}
            classNames={{ root: styles.customPlayer }}
            style={{ "--harbor-media-accent": "#d9a441", "--harbor-media-panel": "#0b201d", "--harbor-media-radius": "18px" } as React.CSSProperties}
          />
          <aside className={styles.capabilityPanel}>
            <p>HOST DECIDES</p>
            {[
              ["Design", "Tokens · CSS hooks · component slots"],
              ["Features", "16 independent capability switches"],
              ["Controls", "Order · labels · rates · seek steps"],
              ["Transport", "NJC session · generic HTTP · callbacks"],
              ["Security", "Authorization remains server-side"],
            ].map(([title, detail]) => <div key={title}><strong>{title}</strong><span>{detail}</span></div>)}
          </aside>
        </div>
      </section>

      <section className={styles.editorSection} data-screenshot="timeline">
        <div className={styles.sectionIntro}><div><span>02 · EDITOR</span><h2>A timeline that belongs to the host.</h2></div><p>Controlled state, localized copy and feature gates let another product use the engine with its own workflow and authorization.</p></div>
        <TimelineEditor
          mediaUrl={source}
          durationMs={32_000}
          segments={segments}
          onChange={setSegments}
          onSave={() => undefined}
          onDiscard={() => setSegments(initialSegments)}
          statusMessage="Local workbench · no request leaves this browser"
          labels={{ eyebrow: "Composition lab", title: "Release timeline", save: "Apply markers" }}
          style={{ "--harbor-media-accent": "#73d6ba", "--harbor-media-panel": "#0d1716", "--harbor-media-panel-soft": "#142522" } as React.CSSProperties}
        />
      </section>

      <section className={styles.boundary}>
        <span>03 · DATA BOUNDARY</span><h2>Bring NJC, or bring your own backend.</h2><p>The package accepts callbacks and adapters. NJC+ uses same-origin Clerk sessions; public NJC API keys are restricted to trusted server code and are never treated as premium authorization.</p>
      </section>
    </main>
  );
}
