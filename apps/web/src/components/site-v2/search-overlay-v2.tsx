"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  startTransition,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Hash,
  LoaderCircle,
  Newspaper,
  Search,
  UserRound,
  X,
} from "lucide-react";
import { Dialog as DialogPrimitive } from "radix-ui";
import type {
  PublicSearchSuggestion,
  PublicSearchSuggestionGroups,
} from "@/lib/public-search";

type SearchState = "idle" | "loading" | "ready" | "error";
type SuggestionGroupKey = keyof PublicSearchSuggestionGroups;

const GROUPS: ReadonlyArray<{
  key: SuggestionGroupKey;
  label: string;
}> = [
  { key: "topics", label: "Topics" },
  { key: "people", label: "People" },
  { key: "stories", label: "Stories" },
];

function emptyGroups(): PublicSearchSuggestionGroups {
  return { topics: [], people: [], stories: [] };
}

function isSuggestion(value: unknown): value is PublicSearchSuggestion {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  return (
    typeof item.id === "string" &&
    (item.kind === "topic" || item.kind === "person" || item.kind === "story") &&
    typeof item.title === "string" &&
    typeof item.description === "string" &&
    typeof item.href === "string" &&
    item.href.startsWith("/") &&
    !item.href.startsWith("//")
  );
}

function parseGroups(value: unknown): PublicSearchSuggestionGroups | null {
  if (!value || typeof value !== "object") return null;
  const payload = value as Record<string, unknown>;
  const groups = payload.data;
  if (!groups || typeof groups !== "object") return null;
  const candidate = groups as Record<string, unknown>;
  if (
    !Array.isArray(candidate.topics) ||
    !Array.isArray(candidate.people) ||
    !Array.isArray(candidate.stories)
  ) return null;
  if (
    !candidate.topics.every(isSuggestion) ||
    !candidate.people.every(isSuggestion) ||
    !candidate.stories.every(isSuggestion)
  ) return null;
  return {
    topics: candidate.topics,
    people: candidate.people,
    stories: candidate.stories,
  };
}

export function SearchOverlayV2() {
  const router = useRouter();
  const reactId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [groups, setGroups] = useState<PublicSearchSuggestionGroups>(emptyGroups);
  const [searchState, setSearchState] = useState<SearchState>("idle");
  const [activeIndex, setActiveIndex] = useState(-1);
  const normalizedQuery = query.trim();
  const inputId = `${reactId}-search`;
  const listId = `${reactId}-suggestions`;
  const suggestions = useMemo(
    () => GROUPS.flatMap((group) => groups[group.key]),
    [groups],
  );

  useEffect(() => {
    function handleGlobalSearchShortcut(event: KeyboardEvent) {
      const target = event.target;
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement ||
        (target instanceof HTMLElement && target.isContentEditable)
      ) return;

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen(true);
      } else if (event.key === "/") {
        event.preventDefault();
        setOpen(true);
      }
    }

    window.addEventListener("keydown", handleGlobalSearchShortcut);
    return () => window.removeEventListener("keydown", handleGlobalSearchShortcut);
  }, []);

  useEffect(() => {
    if (!open || normalizedQuery.length < 2) return;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch(
          `/api/v1/search/suggestions?q=${encodeURIComponent(normalizedQuery)}&limit=5`,
          { credentials: "same-origin", signal: controller.signal },
        );
        const payload: unknown = await response.json();
        if (!response.ok) throw new Error("Suggestion request failed");
        const nextGroups = parseGroups(payload);
        if (!nextGroups) throw new Error("Suggestion response was invalid");
        startTransition(() => {
          setGroups(nextGroups);
          setActiveIndex(-1);
          setSearchState("ready");
        });
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setGroups(emptyGroups());
        setActiveIndex(-1);
        setSearchState("error");
      }
    }, 200);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [normalizedQuery, open]);

  useEffect(() => {
    if (activeIndex < 0) return;
    document
      .getElementById(`${reactId}-option-${activeIndex}`)
      ?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, reactId]);

  function updateQuery(value: string) {
    setQuery(value);
    setGroups(emptyGroups());
    setActiveIndex(-1);
    if (value.trim().length < 2) {
      setSearchState("idle");
    } else {
      setSearchState("loading");
    }
  }

  function selectSuggestion(suggestion: PublicSearchSuggestion) {
    setOpen(false);
    router.push(suggestion.href);
  }

  function handleInputKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((current) =>
        suggestions.length ? (current + 1) % suggestions.length : -1,
      );
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((current) =>
        suggestions.length
          ? (current <= 0 ? suggestions.length - 1 : current - 1)
          : -1,
      );
    } else if (event.key === "Enter" && activeIndex >= 0) {
      const activeSuggestion = suggestions[activeIndex];
      if (!activeSuggestion) return;
      event.preventDefault();
      selectSuggestion(activeSuggestion);
    }
  }

  return (
    <DialogPrimitive.Root
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) setActiveIndex(-1);
      }}
    >
      <DialogPrimitive.Trigger asChild>
        <button type="button" className="v2-icon-link" aria-label="Search">
          <Search />
        </button>
      </DialogPrimitive.Trigger>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="v2-search-overlay" />
        <DialogPrimitive.Content
          className="v2-search-dialog"
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            inputRef.current?.focus();
          }}
        >
          <DialogPrimitive.Title className="sr-only">Search The New Jersey Courier</DialogPrimitive.Title>
          <DialogPrimitive.Description className="sr-only">
            Search published reporting by story, topic or public byline.
          </DialogPrimitive.Description>

          <form
            action="/search"
            className="v2-search-dialog__form"
            onSubmit={(event) => {
              if (!normalizedQuery) event.preventDefault();
            }}
          >
            <Search aria-hidden="true" />
            <label htmlFor={inputId} className="sr-only">Search News</label>
            <input
              ref={inputRef}
              id={inputId}
              name="q"
              type="search"
              value={query}
              onChange={(event) => updateQuery(event.target.value)}
              onKeyDown={handleInputKeyDown}
              placeholder="Search News"
              autoComplete="off"
              maxLength={120}
              role="combobox"
              aria-autocomplete="list"
              aria-controls={listId}
              aria-expanded={normalizedQuery.length >= 2}
              aria-activedescendant={
                activeIndex >= 0 ? `${reactId}-option-${activeIndex}` : undefined
              }
            />
            <span className="v2-search-dialog__shortcut" aria-hidden="true">⌘K</span>
            <DialogPrimitive.Close asChild>
              <button type="button" aria-label="Close search"><X /></button>
            </DialogPrimitive.Close>
          </form>

          <div className="v2-search-dialog__status" role="status" aria-live="polite">
            {searchState === "loading" ? "Finding suggestions" : null}
            {searchState === "ready" && normalizedQuery.length >= 2
              ? `${suggestions.length} suggestion${suggestions.length === 1 ? "" : "s"}`
              : null}
            {searchState === "error" ? "Suggestions are unavailable. Full search still works." : null}
          </div>

          {normalizedQuery.length < 2 ? (
            <div className="v2-search-dialog__prompt">
              <p>Search stories, topics and public bylines.</p>
              <span>Type at least two characters for suggestions.</span>
            </div>
          ) : (
            <div className="v2-search-suggestions">
              <h2>Top Results</h2>
              {searchState === "loading" ? (
                <div className="v2-search-suggestions__loading" aria-hidden="true">
                  <LoaderCircle />
                </div>
              ) : null}
              {searchState === "ready" && suggestions.length === 0 ? (
                <p className="v2-search-suggestions__empty">
                  No quick matches. Press Return to search the full archive.
                </p>
              ) : null}
              <div
                id={listId}
                role="listbox"
                aria-label="Search suggestions"
                aria-busy={searchState === "loading"}
              >
                {GROUPS.map((group) => {
                  const items = groups[group.key];
                  if (!items.length) return null;
                  return (
                    <section key={group.key} role="group" aria-labelledby={`${reactId}-${group.key}`}>
                      <h3 id={`${reactId}-${group.key}`}>{group.label}</h3>
                      <div>
                      {items.map((suggestion) => {
                        const index = suggestions.findIndex((item) => item.id === suggestion.id);
                        const selected = index === activeIndex;
                        return (
                          <Link
                            key={suggestion.id}
                            id={`${reactId}-option-${index}`}
                            href={suggestion.href}
                            role="option"
                            aria-selected={selected}
                            className={selected ? "is-active" : undefined}
                            onFocus={() => setActiveIndex(index)}
                            onPointerEnter={() => setActiveIndex(index)}
                            onClick={() => setOpen(false)}
                          >
                            <SuggestionIcon kind={suggestion.kind} />
                            <span>
                              <strong>{suggestion.title}</strong>
                              <small>{suggestion.description}</small>
                            </span>
                            <i aria-hidden="true">↗</i>
                          </Link>
                        );
                      })}
                      </div>
                    </section>
                  );
                })}
              </div>
              <Link
                href={`/search?q=${encodeURIComponent(normalizedQuery)}`}
                className="v2-search-dialog__all"
                onClick={() => setOpen(false)}
              >
                Search all results for “{normalizedQuery}” <span aria-hidden="true">→</span>
              </Link>
            </div>
          )}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

function SuggestionIcon({ kind }: { kind: PublicSearchSuggestion["kind"] }) {
  if (kind === "topic") return <Hash aria-hidden="true" />;
  if (kind === "person") return <UserRound aria-hidden="true" />;
  return <Newspaper aria-hidden="true" />;
}
