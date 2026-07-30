"use client";

import Script from "next/script";
import { useEffect, useRef, useSyncExternalStore } from "react";
import {
  consentEventName,
  hasAdvertisingConsent,
} from "@/lib/analytics-consent";
import { cn } from "@/lib/utils";

declare global {
  interface Window {
    adsbygoogle?: Array<Record<string, unknown>>;
  }
}

function subscribeToConsent(callback: () => void) {
  window.addEventListener(consentEventName, callback);
  return () => window.removeEventListener(consentEventName, callback);
}

export function GoogleAdSenseScript({ enabled, publisherId }: { enabled: boolean; publisherId: string }) {
  const advertisingConsent = useSyncExternalStore(
    subscribeToConsent,
    () => hasAdvertisingConsent(localStorage),
    () => false,
  );
  if (!enabled || !publisherId || !advertisingConsent) return null;
  return <Script id="google-adsense" strategy="afterInteractive" async crossOrigin="anonymous" src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(publisherId)}`} />;
}

export function GoogleAdUnit({
  publisherId,
  slotId,
  format,
  className,
}: {
  publisherId: string;
  slotId: string;
  format: "auto" | "horizontal";
  className?: string;
}) {
  const initialized = useRef(false);
  const advertisingConsent = useSyncExternalStore(
    subscribeToConsent,
    () => hasAdvertisingConsent(localStorage),
    () => false,
  );

  useEffect(() => {
    if (!advertisingConsent) {
      initialized.current = false;
      return;
    }
    if (initialized.current) return;
    initialized.current = true;
    try {
      window.adsbygoogle = window.adsbygoogle ?? [];
      window.adsbygoogle.push({});
    } catch (error) {
      console.error("Google AdSense unit initialization failed", error);
    }
  }, [advertisingConsent]);

  if (!advertisingConsent) {
    return (
      <aside
        className={cn("min-h-28 bg-muted/20 px-2 py-3", className)}
        aria-label="Advertising placement awaiting privacy choice"
      >
        <p className="text-center text-[0.55rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Advertisement
        </p>
      </aside>
    );
  }

  return (
    <aside className={cn("bg-muted/20 px-2 py-3", className)} aria-label="Advertisement">
      <p className="mb-2 text-center text-[0.55rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Advertisement</p>
      <ins
        className="adsbygoogle block min-h-24"
        data-ad-client={publisherId}
        data-ad-slot={slotId}
        data-ad-format={format}
        data-full-width-responsive="true"
      />
    </aside>
  );
}
