"use client";
import { useState } from "react";
import { ArrowRight, LoaderCircle } from "lucide-react";

export function CheckoutButton({ tierId, offerId }: { tierId: string; offerId?: string }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function start() {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/v1/plus/checkout", { method: "POST", headers: { "Content-Type": "application/json", "Idempotency-Key": crypto.randomUUID() }, body: JSON.stringify({ tierId, offerId }) });
      const payload = await response.json() as { data?: { url?: string }; error?: { message?: string } };
      if (!response.ok || !payload.data?.url) throw new Error(payload.error?.message || "Checkout is unavailable");
      window.location.assign(payload.data.url);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Checkout is unavailable");
      setBusy(false);
    }
  }
  return <><button className="plus-checkout-button" onClick={() => void start()} disabled={busy}>{busy ? <LoaderCircle className="animate-spin" /> : <>Choose access <ArrowRight /></>}</button>{message ? <p className="plus-checkout-error" role="alert">{message}</p> : null}</>;
}
