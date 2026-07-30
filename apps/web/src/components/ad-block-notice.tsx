"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ShieldAlert, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { consentEventName, hasAdvertisingConsent } from "@/lib/analytics-consent";

const dismissalKey = "njc-ad-block-notice-dismissed-v1";

export function AdBlockNotice({
  enabled,
  promoEnabled,
  promoText,
  promoHref,
}: {
  enabled: boolean;
  promoEnabled: boolean;
  promoText: string;
  promoHref: string;
}) {
  const [blocked, setBlocked] = useState(false);

  useEffect(() => {
    if (!enabled || sessionStorage.getItem(dismissalKey) === "true") return;

    let timer = 0;
    const inspect = () => {
      if (!hasAdvertisingConsent(localStorage)) {
        setBlocked(false);
        return;
      }
      const bait = document.createElement("div");
      bait.className = "adsbox ad-banner ad-placement";
      bait.setAttribute("aria-hidden", "true");
      bait.style.cssText = "position:absolute;left:-10000px;top:-10000px;width:1px;height:1px;";
      document.body.appendChild(bait);
      timer = window.setTimeout(() => {
        const style = window.getComputedStyle(bait);
        const hidden = bait.offsetHeight === 0 || bait.clientHeight === 0 || style.display === "none" || style.visibility === "hidden";
        bait.remove();
        setBlocked(hidden);
      }, 250);
    };

    inspect();
    window.addEventListener(consentEventName, inspect);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener(consentEventName, inspect);
    };
  }, [enabled]);

  if (!blocked) return null;
  return (
    <aside className="fixed inset-x-3 bottom-3 z-[90] mx-auto max-w-2xl rounded-lg border border-brand-yellow/60 bg-brand-navy p-4 text-white shadow-2xl" aria-label="Advertising support notice">
      <div className="flex items-start gap-3">
        <ShieldAlert className="mt-0.5 size-5 shrink-0 text-brand-yellow" />
        <div className="min-w-0 flex-1">
          <p className="font-bold">It looks like advertising is being filtered</p>
          <p className="mt-1 text-sm leading-6 text-white/75">
            You can keep reading. Advertising helps fund independent local reporting; consider allowing ads for The New Jersey Courier.
          </p>
          {promoEnabled ? <Link href={promoHref} className="mt-2 inline-block text-sm font-bold text-brand-yellow underline">{promoText}</Link> : null}
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="shrink-0 text-white hover:bg-white/10 hover:text-white"
          aria-label="Dismiss advertising notice"
          onClick={() => {
            sessionStorage.setItem(dismissalKey, "true");
            setBlocked(false);
          }}
        >
          <X />
        </Button>
      </div>
    </aside>
  );
}
