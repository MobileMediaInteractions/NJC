"use client";

import Script from "next/script";
import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

declare global {
  interface Window {
    adsbygoogle?: Array<Record<string, unknown>>;
  }
}

export function GoogleAdSenseScript({ enabled, publisherId }: { enabled: boolean; publisherId: string }) {
  if (!enabled || !publisherId) return null;
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

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    try {
      window.adsbygoogle = window.adsbygoogle ?? [];
      window.adsbygoogle.push({});
    } catch (error) {
      console.error("Google AdSense unit initialization failed", error);
    }
  }, []);

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
