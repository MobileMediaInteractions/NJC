"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import { consentEventName, hasAnalyticsConsent } from "@/lib/analytics-consent";

const installationKey = "harborline-audience-installation-v1";
const lastReportKey = "harborline-audience-last-report-v1";
const lastPageViewKey = "njcourier-analytics-last-page-view-v1";
const reportIntervalMs = 15 * 60 * 1000;

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
      let recentlyTracked = false;
      try {
        const previous = JSON.parse(sessionStorage.getItem(lastPageViewKey) ?? "null") as { pathname?: string; at?: number } | null;
        recentlyTracked = previous?.pathname === pathname && now - (previous.at ?? 0) < 5_000;
        if (!recentlyTracked) sessionStorage.setItem(lastPageViewKey, JSON.stringify({ pathname, at: now }));
      } catch {
        /* A blocked session store should not disable consented analytics. */
      }
      if (!recentlyTracked) {
        void fetch("/api/v1/analytics/page-view", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pathname }),
          keepalive: true,
        }).catch(() => undefined);
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
