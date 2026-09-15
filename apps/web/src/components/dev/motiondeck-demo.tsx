"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, Braces, FileAudio, ImageIcon, ShieldCheck } from "lucide-react";
import { TwoDudesPlayer } from "@/components/podcasts/two-dudes-player";
import { podcastAssets } from "@/lib/assets";
import { NjMotionError, parseAndCompileNjMotion } from "@/lib/njmotion";
import type { TwoDudesEpisode } from "@/lib/two-dudes-in-wheels";
import styles from "./motiondeck-demo.module.css";

type LoadState =
  | { status: "loading" }
  | { status: "ready"; episode: TwoDudesEpisode }
  | { status: "error"; message: string };

export function MotionDeckDemo() {
  const [state, setState] = useState<LoadState>({ status: "loading" });

  useEffect(() => {
    const controller = new AbortController();
    async function loadTimeline() {
      try {
        const response = await fetch(podcastAssets.twoDudesInWheelsDemoTimeline, {
          signal: controller.signal,
          headers: { Accept: "application/vnd.njc.motiondeck, text/plain" },
        });
        if (!response.ok) throw new Error(`Timeline request failed (${response.status}).`);
        const episode = parseAndCompileNjMotion(await response.text());
        setState({ status: "ready", episode });
      } catch (error) {
        if (controller.signal.aborted) return;
        const detail = error instanceof NjMotionError && error.issues.length
          ? `${error.message} ${error.issues[0]}`
          : error instanceof Error ? error.message : "The demonstration timeline could not be loaded.";
        setState({ status: "error", message: detail });
      }
    }
    void loadTimeline();
    return () => controller.abort();
  }, []);

  return (
    <main className={styles.page}>
      <nav className={styles.nav} aria-label="Workbench navigation">
        <Link href="/podcasts/two-dudes-in-wheels"><ArrowLeft /> Series home</Link>
        <a href={podcastAssets.twoDudesInWheelsDemoTimeline} download>Open .njmotion source <Braces /></a>
      </nav>

      <header className={styles.hero}>
        <div>
          <p>COURIER MOTIONDECK · SYSTEM WORKBENCH</p>
          <h1>Timecoded pictures.<br /><span>Not a disguised video.</span></h1>
        </div>
        <p className={styles.heroCopy}>This local demonstration loads a real <code>.njmotion</code> document, validates every asset reference and composes three visual scenes against one audio clock.</p>
      </header>

      <section className={styles.notice} aria-label="Demonstration disclosure">
        <ShieldCheck />
        <div><strong>Synthetic demonstration media only</strong><span>The vehicle, audio, captions and commentary below are original fixtures for testing. They are not a published review or measured vehicle claim.</span></div>
      </section>

      {state.status === "loading" ? (
        <section className={styles.loading} aria-live="polite"><span /><strong>Validating motiondeck-demo.njmotion…</strong></section>
      ) : state.status === "error" ? (
        <section className={styles.error} role="alert"><strong>The NJMotion document could not be rendered.</strong><span>{state.message}</span></section>
      ) : (
        <TwoDudesPlayer episode={state.episode} />
      )}

      <section className={styles.formatGrid} aria-label="NJMotion format summary">
        <article><Braces /><span>01 · FORMAT</span><h2>One portable timeline</h2><p>A magic header, fixed 1,000-tick timebase and validated versioned payload make the file identifiable before its contents are trusted.</p></article>
        <article><ImageIcon /><span>02 · VISUALS</span><h2>Placed by intent</h2><p>Each image is referenced by catalog ID, then given a bounded position, fit, focal point, entrance and pan—never arbitrary CSS.</p></article>
        <article><FileAudio /><span>03 · CLOCK</span><h2>Audio stays primary</h2><p>Scenes, transcript and chapters follow the audio clock. Audio-only mode removes the canvas without changing playback.</p></article>
      </section>
    </main>
  );
}
