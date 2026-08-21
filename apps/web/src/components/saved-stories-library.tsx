"use client";

import Image from "next/image";
import Link from "next/link";
import { Bookmark, Loader2, RotateCcw, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { formatStoryDate } from "@/lib/format";
import {
  parseSavedStorySummary,
  readSavedStoryPaths,
  SAVED_STORIES_CHANGE_EVENT,
  SAVED_STORIES_STORAGE_KEY,
  savedStorySlug,
  type SavedStorySummary,
  writeSavedStoryPaths,
} from "@/lib/saved-stories";

type SavedItem = { path: string; story: SavedStorySummary };
type LibraryState = {
  failed: number;
  invalid: number;
  items: SavedItem[];
  paths: string[];
  status: "loading" | "ready" | "storage-error";
  unavailable: string[];
};

const initialState: LibraryState = {
  failed: 0,
  invalid: 0,
  items: [],
  paths: [],
  status: "loading",
  unavailable: [],
};

export function SavedStoriesLibrary() {
  const [state, setState] = useState<LibraryState>(initialState);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;

    void Promise.resolve().then(async () => {
      let paths: string[];
      let invalid = 0;
      try {
        const raw = window.localStorage.getItem(SAVED_STORIES_STORAGE_KEY);
        let rawCount = 0;
        if (raw) {
          try {
            const parsed: unknown = JSON.parse(raw);
            rawCount = Array.isArray(parsed) ? parsed.length : 1;
          } catch {
            rawCount = 1;
          }
        }
        paths = readSavedStoryPaths(window.localStorage, window.location.origin);
        invalid = Math.max(0, rawCount - paths.length);
        writeSavedStoryPaths(window.localStorage, paths, window.location.origin);
      } catch {
        if (!cancelled) setState({ ...initialState, status: "storage-error" });
        return;
      }

      if (!paths.length) {
        if (!cancelled) setState({ ...initialState, invalid, paths, status: "ready" });
        return;
      }

      const results = await Promise.all(paths.map(async (path) => {
        const slug = savedStorySlug(path);
        if (!slug) return { kind: "unavailable" as const, path };
        try {
          const response = await fetch(`/api/v1/stories/${encodeURIComponent(slug)}`, {
            headers: { "X-NJC-Capabilities": "structured-story-notes-v1" },
            signal: controller.signal,
          });
          if (response.status === 404) return { kind: "unavailable" as const, path };
          if (!response.ok) return { kind: "failed" as const, path };
          const payload: unknown = await response.json();
          const story = parseSavedStorySummary(
            payload && typeof payload === "object" ? (payload as { data?: unknown }).data : null,
          );
          if (!story || story.slug !== slug) return { kind: "failed" as const, path };
          return { kind: "ready" as const, path, story };
        } catch (error) {
          if (error instanceof DOMException && error.name === "AbortError") {
            return { kind: "aborted" as const, path };
          }
          return { kind: "failed" as const, path };
        }
      }));

      if (cancelled) return;
      const items = results
        .filter((result): result is Extract<typeof result, { kind: "ready" }> => result.kind === "ready")
        .map((result) => ({ path: result.path, story: result.story }))
        .reverse();
      setState({
        failed: results.filter((result) => result.kind === "failed").length,
        invalid,
        items,
        paths,
        status: "ready",
        unavailable: results.filter((result) => result.kind === "unavailable").map((result) => result.path),
      });
    });

    function refreshFromStorage(event: Event) {
      if (event instanceof StorageEvent && event.key && event.key !== SAVED_STORIES_STORAGE_KEY) return;
      setState((current) => ({ ...current, status: "loading" }));
      setReload((current) => current + 1);
    }
    window.addEventListener("storage", refreshFromStorage);
    window.addEventListener(SAVED_STORIES_CHANGE_EVENT, refreshFromStorage);
    return () => {
      cancelled = true;
      controller.abort();
      window.removeEventListener("storage", refreshFromStorage);
      window.removeEventListener(SAVED_STORIES_CHANGE_EVENT, refreshFromStorage);
    };
  }, [reload]);

  function persist(paths: string[]) {
    try {
      const next = writeSavedStoryPaths(window.localStorage, paths, window.location.origin);
      setState((current) => ({
        ...current,
        items: current.items.filter((item) => next.includes(item.path)),
        paths: next,
        unavailable: current.unavailable.filter((path) => next.includes(path)),
      }));
      window.dispatchEvent(new Event(SAVED_STORIES_CHANGE_EVENT));
    } catch {
      setState((current) => ({ ...current, status: "storage-error" }));
    }
  }

  if (state.status === "loading") {
    return <div className="v2-saved-state" role="status"><Loader2 className="animate-spin" aria-hidden="true" /><p>Loading saved stories…</p></div>;
  }

  if (state.status === "storage-error") {
    return <div className="v2-saved-state" role="alert"><Bookmark aria-hidden="true" /><h2>Saved stories are unavailable</h2><p>This browser did not allow the Courier to read local saved-story storage.</p></div>;
  }

  if (!state.paths.length) {
    return <div className="v2-saved-state"><Bookmark aria-hidden="true" /><h2>No saved stories yet</h2><p>Use the bookmark button on an article to keep it in this browser.</p><Button asChild><Link href="/latest">Browse the latest reporting</Link></Button></div>;
  }

  return (
    <div>
      <div className="v2-saved-toolbar">
        <p>{state.paths.length} saved stor{state.paths.length === 1 ? "y" : "ies"} on this device</p>
        <Button type="button" variant="outline" size="sm" onClick={() => persist([])}><Trash2 /> Clear all</Button>
      </div>
      {state.invalid ? <p className="v2-saved-notice" role="status">{state.invalid} invalid saved entr{state.invalid === 1 ? "y was" : "ies were"} removed safely.</p> : null}
      {state.unavailable.length ? <div className="v2-saved-notice" role="status"><span>{state.unavailable.length} saved stor{state.unavailable.length === 1 ? "y is" : "ies are"} no longer publicly available.</span><Button type="button" variant="ghost" size="sm" onClick={() => persist(state.paths.filter((path) => !state.unavailable.includes(path)))}>Remove unavailable</Button></div> : null}
      {state.failed ? <div className="v2-saved-notice" role="alert"><span>{state.failed} saved stor{state.failed === 1 ? "y could" : "ies could"} not be loaded. Your bookmark{state.failed === 1 ? " was" : "s were"} kept.</span><Button type="button" variant="ghost" size="sm" onClick={() => { setState((current) => ({ ...current, status: "loading" })); setReload((current) => current + 1); }}><RotateCcw /> Retry</Button></div> : null}
      <div className="v2-saved-grid">
        {state.items.map(({ path, story }) => (
          <article className="v2-saved-card" key={path}>
            <Link href={path} className="v2-saved-card__media"><Image src={story.image} alt={story.imageAlt} fill sizes="(max-width: 767px) 36vw, 240px" /></Link>
            <div><p>{story.categoryLabel}</p><h2><Link href={path}>{story.headline}</Link></h2><span>{story.dek}</span><time dateTime={story.publishedAt}>{formatStoryDate(story.publishedAt)} · {story.readingMinutes} min read</time></div>
            <Button type="button" variant="ghost" size="icon" aria-label={`Remove ${story.headline} from saved stories`} title="Remove saved story" onClick={() => persist(state.paths.filter((savedPath) => savedPath !== path))}><Trash2 /></Button>
          </article>
        ))}
      </div>
    </div>
  );
}
