"use client";

import { useEffect, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import { consentEventName, hasAnalyticsConsent } from "@/lib/analytics-consent";

const installationKey = "harborline-audience-installation-v1";
const lastReportKey = "harborline-audience-last-report-v1";
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
  const enabled = useSyncExternalStore(
    subscribe,
    () => hasAnalyticsConsent(localStorage),
    () => false,
  );

  useEffect(() => {
    if (!enabled) return;
    const now = Date.now();
    const lastReport = Number(localStorage.getItem(lastReportKey) ?? 0);
    if (now - lastReport < reportIntervalMs) return;
    localStorage.setItem(lastReportKey, String(now));
    void fetch("/api/v1/audience/presence", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        installationId: getInstallationId(),
        platform: "web",
        source: "news-site",
        appVersion: process.env.NEXT_PUBLIC_APP_VERSION ?? "web",
      }),
      keepalive: true,
    }).catch(() => undefined);
  }, [enabled, pathname]);

  return null;
}
