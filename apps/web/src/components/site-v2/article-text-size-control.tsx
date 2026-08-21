"use client";

import { useEffect, useRef, useState } from "react";
import { ALargeSmall } from "lucide-react";

type ReaderTextSize = "compact" | "standard" | "large";

const storageKey = "njc:article-text-size";
const sizes: ReaderTextSize[] = ["standard", "large", "compact"];

function isReaderTextSize(value: string | null): value is ReaderTextSize {
  return value === "compact" || value === "standard" || value === "large";
}

function labelFor(size: ReaderTextSize) {
  return size === "compact" ? "Compact" : size === "large" ? "Large" : "Standard";
}

export function ArticleTextSizeControl() {
  const [size, setSize] = useState<ReaderTextSize>("standard");
  const containerRef = useRef<HTMLDivElement>(null);

  function apply(next: ReaderTextSize) {
    const article = containerRef.current?.closest<HTMLElement>(".v2-article");
    if (next === "standard") delete article?.dataset.textSize;
    else if (article) article.dataset.textSize = next;
    setSize(next);
    try {
      window.localStorage.setItem(storageKey, next);
    } catch {
      // The preference remains active for this page when storage is unavailable.
    }
  }

  useEffect(() => {
    let stored: string | null = null;
    try {
      stored = window.localStorage.getItem(storageKey);
    } catch {
      // Private browsing can make local storage unavailable.
    }
    const initialSize = isReaderTextSize(stored) ? stored : "standard";
    const article = containerRef.current?.closest<HTMLElement>(".v2-article");
    if (initialSize === "standard") delete article?.dataset.textSize;
    else if (article) article.dataset.textSize = initialSize;
    const animationFrame = requestAnimationFrame(() => setSize(initialSize));
    return () => cancelAnimationFrame(animationFrame);
  }, []);

  const nextSize = sizes[(sizes.indexOf(size) + 1) % sizes.length]!;

  return (
    <div ref={containerRef} className="v2-article-reader-tools">
      <button
        type="button"
        onClick={() => apply(nextSize)}
        aria-label={`Article text size: ${labelFor(size)}. Change to ${labelFor(nextSize)}.`}
        title={`Text size: ${labelFor(size)}`}
      >
        <ALargeSmall aria-hidden="true" />
        <span className="sr-only" aria-live="polite">{labelFor(size)} article text</span>
      </button>
    </div>
  );
}
