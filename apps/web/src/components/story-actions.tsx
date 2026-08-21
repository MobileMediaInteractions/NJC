"use client";

import { useEffect, useRef, useState } from "react";
import { Bookmark, ExternalLink, Link2, Mail, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  normalizeSavedStoryPath,
  readSavedStoryPaths,
  SAVED_STORIES_CHANGE_EVENT,
  writeSavedStoryPaths,
} from "@/lib/saved-stories";

type StoryActionsProps = {
  articleUrl: string;
  compact?: boolean;
  emailUrl: string;
  headline: string;
  shareUrl: string;
  xUrl: string;
};

function getSavedStoryUrls() {
  try {
    return readSavedStoryPaths(window.localStorage, window.location.origin);
  } catch {
    return [];
  }
}

function currentStoryPath(articleUrl: string) {
  return normalizeSavedStoryPath(window.location.pathname, window.location.origin)
    ?? normalizeSavedStoryPath(articleUrl, window.location.origin);
}

async function copyToClipboard(value: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }

  const field = document.createElement("textarea");
  field.value = value;
  field.setAttribute("readonly", "");
  field.style.position = "fixed";
  field.style.opacity = "0";
  document.body.appendChild(field);
  let copied = false;
  try {
    field.select();
    copied = document.execCommand("copy");
  } finally {
    field.remove();
  }
  if (!copied) throw new Error("Clipboard access is unavailable");
}

export function StoryActions({ articleUrl, compact = false, emailUrl, headline, shareUrl, xUrl }: StoryActionsProps) {
  const [isSaved, setIsSaved] = useState(false);
  const [notice, setNotice] = useState("");
  const noticeTimer = useRef<number | null>(null);

  useEffect(() => {
    const syncSavedState = () => {
      const path = currentStoryPath(articleUrl);
      setIsSaved(Boolean(path && getSavedStoryUrls().includes(path)));
    };
    syncSavedState();
    window.addEventListener("storage", syncSavedState);
    window.addEventListener(SAVED_STORIES_CHANGE_EVENT, syncSavedState);
    return () => {
      window.removeEventListener("storage", syncSavedState);
      window.removeEventListener(SAVED_STORIES_CHANGE_EVENT, syncSavedState);
    };
  }, [articleUrl]);

  useEffect(() => () => {
    if (noticeTimer.current) window.clearTimeout(noticeTimer.current);
  }, []);

  function showNotice(message: string) {
    setNotice(message);
    if (noticeTimer.current) window.clearTimeout(noticeTimer.current);
    noticeTimer.current = window.setTimeout(() => setNotice(""), 3_000);
  }

  function toggleSaved() {
    try {
      const path = currentStoryPath(articleUrl);
      if (!path) {
        showNotice("This article does not have a valid local story address.");
        return;
      }
      const saved = getSavedStoryUrls();
      const nextSaved = writeSavedStoryPaths(
        window.localStorage,
        saved.includes(path) ? saved.filter((url) => url !== path) : [...saved, path],
        window.location.origin,
      );
      const nextState = nextSaved.includes(path);
      setIsSaved(nextState);
      window.dispatchEvent(new Event(SAVED_STORIES_CHANGE_EVENT));
      showNotice(nextState ? "Article saved on this device." : "Article removed from saved stories.");
    } catch {
      showNotice("This browser could not save the article.");
    }
  }

  async function openShareOptions() {
    if (navigator.share) {
      try {
        await navigator.share({ title: headline, text: headline, url: shareUrl });
        showNotice("Article shared.");
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        showNotice("Share options could not be opened.");
      }
      return;
    }

    try {
      await copyToClipboard(shareUrl);
      showNotice("Share options are unavailable, so the link was copied.");
    } catch {
      showNotice("Share options are unavailable in this browser.");
    }
  }

  async function copyLink() {
    try {
      await copyToClipboard(shareUrl);
      showNotice("Article link copied.");
    } catch {
      showNotice("The article link could not be copied.");
    }
  }

  if (compact) {
    return (
      <div className="flex flex-col items-start gap-2 sm:items-end">
        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon" type="button" aria-label={isSaved ? "Remove this article from saved stories" : "Save this article"} aria-pressed={isSaved} title={isSaved ? "Remove saved article" : "Save article"} onClick={toggleSaved}>
            <Bookmark className={isSaved ? "size-4 fill-current" : "size-4"} />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" type="button" aria-label="Share this article" title="Share article">
                <Share2 className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuLabel>Share article</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <a href={xUrl} target="_blank" rel="noopener noreferrer"><Share2 /> Share on X</a>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <a href={emailUrl}><Mail /> Email article</a>
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={(event) => { event.preventDefault(); void openShareOptions(); }}>
                <ExternalLink /> Device share options
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={(event) => { event.preventDefault(); void copyLink(); }}>
                <Link2 /> Copy link
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <p className="min-h-4 text-xs font-medium text-brand-blue" role="status" aria-live="polite">{notice}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-start gap-2 sm:items-end">
      <div className="flex items-center gap-1">
        <Button asChild variant="outline" size="icon">
          <a href={xUrl} target="_blank" rel="noopener noreferrer" aria-label="Share this article on X" title="Share on X">
            <Share2 className="size-4" />
          </a>
        </Button>
        <Button variant="outline" size="icon" type="button" aria-label={isSaved ? "Remove this article from saved stories" : "Save this article"} aria-pressed={isSaved} title={isSaved ? "Remove saved article" : "Save article"} onClick={toggleSaved}>
          <Bookmark className={isSaved ? "size-4 fill-current" : "size-4"} />
        </Button>
        <Button asChild variant="outline" size="icon">
          <a href={emailUrl} aria-label="Email this article" title="Email article">
            <Mail className="size-4" />
          </a>
        </Button>
        <Button variant="outline" size="icon" type="button" aria-label="Open device share options" title="More share options" onClick={() => void openShareOptions()}>
          <ExternalLink className="size-4" />
        </Button>
        <Button variant="outline" size="icon" type="button" aria-label="Copy article link" title="Copy article link" onClick={() => void copyLink()}>
          <Link2 className="size-4" />
        </Button>
      </div>
      <p className="min-h-4 text-xs font-medium text-brand-blue" role="status" aria-live="polite">{notice}</p>
    </div>
  );
}
