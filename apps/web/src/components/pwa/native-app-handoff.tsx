"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, Newspaper, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  consentEventName,
  readConsentChoice,
} from "@/lib/analytics-consent";
import {
  detectReaderNativePlatform,
  readerNativeDeepLink,
  type ReaderNativePlatform,
} from "@/lib/native-app-handoff";
import type { SiteConfiguration } from "@/lib/site-settings";

const dismissalKey = "njc:reader-app-handoff-dismissed:v1";

function isStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function readDismissed() {
  try {
    return window.sessionStorage.getItem(dismissalKey) === "true";
  } catch {
    return false;
  }
}

function saveDismissed() {
  try {
    window.sessionStorage.setItem(dismissalKey, "true");
  } catch {
    // A blocked session store must not break ordinary website navigation.
  }
}

export function NativeAppHandoff({
  configuration,
}: {
  configuration: SiteConfiguration["nativeApps"];
}) {
  const [platform, setPlatform] = useState<ReaderNativePlatform | null>(null);
  const [visible, setVisible] = useState(false);
  const [openFailed, setOpenFailed] = useState(false);
  const fallbackTimer = useRef<number | null>(null);

  useEffect(() => {
    if (!configuration.handoffPromptEnabled || process.env.NODE_ENV !== "production") return;

    const detectedPlatform = detectReaderNativePlatform(window.navigator.userAgent);
    if (!detectedPlatform || isStandalone() || readDismissed()) return;

    const inspectConsent = () => {
      const shouldShow = Boolean(readConsentChoice(window.localStorage)) && !readDismissed();
      const timer = window.setTimeout(() => {
        setPlatform(detectedPlatform);
        setVisible(shouldShow);
      }, shouldShow ? 700 : 0);
      return () => window.clearTimeout(timer);
    };
    let cancelTimer = inspectConsent();
    const onConsent = () => {
      cancelTimer?.();
      cancelTimer = inspectConsent();
    };
    window.addEventListener(consentEventName, onConsent);
    return () => {
      cancelTimer?.();
      window.removeEventListener(consentEventName, onConsent);
      if (fallbackTimer.current !== null) window.clearTimeout(fallbackTimer.current);
    };
  }, [configuration.handoffPromptEnabled]);

  function dismiss() {
    saveDismissed();
    setVisible(false);
  }

  function openApp() {
    setOpenFailed(false);
    window.location.assign(
      readerNativeDeepLink(window.location.pathname, window.location.search),
    );
    if (fallbackTimer.current !== null) window.clearTimeout(fallbackTimer.current);
    fallbackTimer.current = window.setTimeout(() => {
      if (document.visibilityState === "visible") setOpenFailed(true);
    }, 1_500);
  }

  if (!visible || !platform) return null;
  const storeUrl = platform === "ios"
    ? configuration.iosStoreUrl
    : configuration.androidStoreUrl;

  return (
    <aside
      aria-label="Open the NJ Courier reader app"
      className="fixed inset-x-3 bottom-[calc(1rem+env(safe-area-inset-bottom))] z-[96] mx-auto max-w-lg rounded-2xl border bg-background p-4 shadow-2xl sm:p-5"
    >
      <div className="flex items-start gap-3">
        <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-brand-navy text-white">
          <Newspaper className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-black text-brand-navy dark:text-foreground">Read this in the NJ Courier app</p>
          <p className="mt-1 text-sm leading-5 text-muted-foreground">
            If the app is installed, open this page there. You can always continue on the website.
          </p>
        </div>
        <Button type="button" variant="ghost" size="icon" onClick={dismiss} aria-label="Continue on the website">
          <X />
        </Button>
      </div>

      {openFailed ? (
        <p className="mt-3 rounded-lg bg-secondary px-3 py-2 text-xs leading-5 text-muted-foreground" role="status">
          The app did not open. {storeUrl ? "You can install it from the official store or keep reading here." : "Its official store listing is not configured yet, so keep reading here."}
        </p>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        <Button type="button" onClick={openApp}>Open app</Button>
        {openFailed && storeUrl ? (
          <Button asChild variant="outline">
            <a href={storeUrl} rel="noopener noreferrer">Official store <ArrowUpRight /></a>
          </Button>
        ) : null}
        <Button type="button" variant="ghost" onClick={dismiss}>Continue on site</Button>
      </div>
    </aside>
  );
}
