"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import { consentEventName, hasAnalyticsConsent } from "@/lib/analytics-consent";

const installationKey = "harborline-audience-installation-v1";
const lastReportKey = "harborline-audience-last-report-v1";
const lastPageViewKey = "njcourier-analytics-last-page-view-v1";
const trafficSessionKey = "njcourier-analytics-session-v1";
const reportIntervalMs = 15 * 60 * 1000;
const trafficSessionTimeoutMs = 30 * 60 * 1000;

type TrafficSession = {
  referrer: string;
  sourceHint: string;
  entrySent: boolean;
  lastSeenAt: number;
};

function subscribe(callback: () => void) {
  window.addEventListener(consentEventName, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(consentEventName, callback);
    window.removeEventListener("storage", callback);
  };
}

function getInstallationId() {
  const existing = localStorage.getItem(installationKey);
  if (existing) return existing;
  const created = crypto.randomUUID().replaceAll("-", "");
  localStorage.setItem(installationKey, created);
  return created;
}

function getTrafficSession(now: number): TrafficSession {
  try {
    const existing = JSON.parse(sessionStorage.getItem(trafficSessionKey) ?? "null") as TrafficSession | null;
    if (existing && now - existing.lastSeenAt < trafficSessionTimeoutMs) return existing;
  } catch {
    /* A blocked or malformed session store starts a privacy-safe new session. */
  }
  const query = new URLSearchParams(window.location.search);
  return {
    referrer: document.referrer.slice(0, 2048),
    sourceHint: (query.get("utm_source") ?? query.get("ref") ?? "").slice(0, 80),
    entrySent: false,
    lastSeenAt: now,
  };
}

export function AudienceTracker() {
  const pathname = usePathname();
  const trackedPath = useRef<string | null>(null);
  const enabled = useSyncExternalStore(
    subscribe,
    () => hasAnalyticsConsent(localStorage),
    () => false,
  );

  useEffect(() => {
    if (!enabled) return;
    const now = Date.now();
    const installationId = getInstallationId();
    if (trackedPath.current !== pathname) {
      trackedPath.current = pathname;
      const trafficSession = getTrafficSession(now);
      let recentlyTracked = false;
      try {
        const previous = JSON.parse(sessionStorage.getItem(lastPageViewKey) ?? "null") as { pathname?: string; at?: number } | null;
        recentlyTracked = previous?.pathname === pathname && now - (previous.at ?? 0) < 5_000;
        if (!recentlyTracked) sessionStorage.setItem(lastPageViewKey, JSON.stringify({ pathname, at: now }));
      } catch {
        /* A blocked session store should not disable consented analytics. */
      }
      if (!recentlyTracked) {
        const isEntry = !trafficSession.entrySent;
        trafficSession.entrySent = true;
        trafficSession.lastSeenAt = now;
        try {
          sessionStorage.setItem(trafficSessionKey, JSON.stringify(trafficSession));
        } catch {
          /* The request can still be sent when session storage is unavailable. */
        }
        void fetch("/api/v1/analytics/page-view", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            pathname,
            referrer: trafficSession.referrer,
            sourceHint: trafficSession.sourceHint,
            isEntry,
          }),
          keepalive: true,
        }).catch(() => undefined);
      } else {
        trafficSession.lastSeenAt = now;
        try {
          sessionStorage.setItem(trafficSessionKey, JSON.stringify(trafficSession));
        } catch {
          /* The next navigation can create a new session if storage is blocked. */
        }
      }
    }
    const lastReport = Number(localStorage.getItem(lastReportKey) ?? 0);
    if (now - lastReport < reportIntervalMs) return;
    localStorage.setItem(lastReportKey, String(now));
    void fetch("/api/v1/audience/presence", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        installationId,
        platform: "web",
        source: "news-site",
        appVersion: process.env.NEXT_PUBLIC_APP_VERSION ?? "web",
      }),
      keepalive: true,
    }).catch(() => undefined);
  }, [enabled, pathname]);

  return null;
}
