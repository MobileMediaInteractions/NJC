"use client";

import Script from "next/script";
import { useEffect, useRef, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import {
  consentEventName,
  hasAnalyticsConsent,
} from "@/lib/analytics-consent";

declare global {
  interface Window {
    dataLayer?: unknown[][];
    gtag?: (...args: unknown[]) => void;
  }
}

function subscribe(callback: () => void) {
  window.addEventListener(consentEventName, callback);
  return () => window.removeEventListener(consentEventName, callback);
}

function ensureGtag() {
  window.dataLayer = window.dataLayer ?? [];
  window.gtag = window.gtag ?? ((...args: unknown[]) => {
    window.dataLayer?.push(args);
  });
  return window.gtag;
}

export function GoogleAnalytics({
  enabled,
  measurementId,
}: {
  enabled: boolean;
  measurementId: string;
}) {
  const pathname = usePathname();
  const initializedMeasurementId = useRef<string | null>(null);
  const analyticsConsent = useSyncExternalStore(
    subscribe,
    () => hasAnalyticsConsent(localStorage),
    () => false,
  );

  useEffect(() => {
    if (!enabled || !measurementId) return;

    if (!analyticsConsent) {
      if (window.gtag) {
        window.gtag("consent", "update", {
          analytics_storage: "denied",
        });
      }
      return;
    }

    const gtag = ensureGtag();
    gtag("consent", "update", {
      analytics_storage: "granted",
      ad_storage: "denied",
      ad_user_data: "denied",
      ad_personalization: "denied",
    });

    if (initializedMeasurementId.current !== measurementId) {
      gtag("js", new Date());
      gtag("config", measurementId, {
        anonymize_ip: true,
        send_page_view: false,
      });
      initializedMeasurementId.current = measurementId;
    }

    gtag("event", "page_view", {
      page_location: `${window.location.origin}${pathname}`,
      page_path: pathname,
      page_title: document.title,
    });
  }, [analyticsConsent, enabled, measurementId, pathname]);

  if (!enabled || !measurementId || !analyticsConsent) return null;

  return (
    <Script
      id="google-analytics"
      strategy="afterInteractive"
      src={`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`}
    />
  );
}
