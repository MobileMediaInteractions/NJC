"use client";

import { useEffect, useState } from "react";

type ReadingProgressState = {
  progress: number;
  visible: boolean;
};

export function ReadingProgress() {
  const [{ progress, visible }, setState] = useState<ReadingProgressState>({
    progress: 0,
    visible: false,
  });

  useEffect(() => {
    let frame = 0;

    function measure() {
      frame = 0;

      const startMarker = document.querySelector<HTMLElement>("[data-reading-progress-start]");
      const endMarker = document.querySelector<HTMLElement>("[data-reading-progress-end]");
      if (!startMarker || !endMarker) {
        return;
      }

      const articleStart = startMarker.getBoundingClientRect().top + window.scrollY;
      const articleEnd = endMarker.getBoundingClientRect().bottom + window.scrollY;
      const readableDistance = Math.max(1, articleEnd - articleStart - window.innerHeight);
      const nextProgress = Math.min(
        1,
        Math.max(0, (window.scrollY - articleStart) / readableDistance),
      );
      const nextVisible = window.scrollY > articleStart + 160 && nextProgress < 0.995;

      setState((current) => {
        if (
          Math.abs(current.progress - nextProgress) < 0.001
          && current.visible === nextVisible
        ) {
          return current;
        }
        return { progress: nextProgress, visible: nextVisible };
      });
    }

    function scheduleMeasure() {
      if (!frame) {
        frame = window.requestAnimationFrame(measure);
      }
    }

    scheduleMeasure();
    window.addEventListener("scroll", scheduleMeasure, { passive: true });
    window.addEventListener("resize", scheduleMeasure);
    return () => {
      window.removeEventListener("scroll", scheduleMeasure);
      window.removeEventListener("resize", scheduleMeasure);
      window.cancelAnimationFrame(frame);
    };
  }, []);

  return <div className={`v2-reading-progress ${visible ? "is-visible" : ""}`} aria-hidden="true"><span style={{ transform: `scaleX(${progress})` }} /></div>;
}
