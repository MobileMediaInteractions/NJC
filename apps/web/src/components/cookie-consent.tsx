"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import {
  consentEventName,
  consentOpenEventName,
  consentStorageKey,
  readConsentChoice,
  type ConsentChoice,
} from "@/lib/analytics-consent";

function subscribe(callback: () => void) {
  window.addEventListener(consentEventName, callback);
  window.addEventListener(consentOpenEventName, callback);
  return () => {
    window.removeEventListener(consentEventName, callback);
    window.removeEventListener(consentOpenEventName, callback);
  };
}

export function CookieConsent() {
  const open = useSyncExternalStore(
    subscribe,
    () => !localStorage.getItem(consentStorageKey),
    () => false,
  );

  function save(value: ConsentChoice) {
    const previous = readConsentChoice(localStorage);
    localStorage.setItem(
      consentStorageKey,
      JSON.stringify({ value, savedAt: new Date().toISOString() }),
    );
    window.dispatchEvent(new Event(consentEventName));
    if (previous === "analytics_ads" && value !== "analytics_ads") {
      window.location.reload();
    }
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
            Essential storage supports sign-in, security and preferences. Audience
            measurement and advertising cookies stay off unless you choose them.{" "}
            <Link href="/cookies" className="font-semibold text-primary underline">
              Cookie details
            </Link>
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2 sm:max-w-sm sm:justify-end">
          <Button variant="outline" onClick={() => save("essential")}>
            Essential only
          </Button>
          <Button onClick={() => save("analytics")}>Allow analytics</Button>
          <Button onClick={() => save("analytics_ads")}>Allow analytics & ads</Button>
        </div>
      </div>
    </aside>
  );
}

export function PrivacyChoicesButton({ className }: { className?: string }) {
  function reopen() {
    localStorage.removeItem(consentStorageKey);
    window.dispatchEvent(new Event(consentOpenEventName));
  }

  return (
    <Button
      type="button"
      variant="link"
      className={className}
      onClick={reopen}
    >
      Change privacy choices
    </Button>
  );
}
