"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import { consentEventName, consentStorageKey } from "@/lib/analytics-consent";

function subscribe(callback: () => void) {
  window.addEventListener(consentEventName, callback);
  return () => window.removeEventListener(consentEventName, callback);
}

export function CookieConsent() {
  const open = useSyncExternalStore(
    subscribe,
    () => !localStorage.getItem(consentStorageKey),
    () => false,
  );

  function save(value: "essential" | "analytics") {
    localStorage.setItem(
      consentStorageKey,
      JSON.stringify({ value, savedAt: new Date().toISOString() }),
    );
    window.dispatchEvent(new Event(consentEventName));
  }

  if (!open) return null;
  return (
    <aside
      aria-label="Cookie choices"
      className="fixed inset-x-3 bottom-3 z-[100] mx-auto max-w-3xl rounded-lg border bg-background p-4 shadow-2xl sm:p-5"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="flex-1">
          <p className="font-bold text-brand-navy">Your privacy choices</p>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            The New Jersey Courier uses essential storage for sign-in, security, saved
            preferences and consent. Optional audience measurement stays off
            unless you allow it.{" "}
            <Link href="/cookies" className="font-semibold text-primary underline">
              Cookie details
            </Link>
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <Button variant="outline" onClick={() => save("essential")}>
            Essential only
          </Button>
          <Button onClick={() => save("analytics")}>Allow analytics</Button>
        </div>
      </div>
    </aside>
  );
}
