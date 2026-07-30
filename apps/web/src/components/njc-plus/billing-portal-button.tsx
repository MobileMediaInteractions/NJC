"use client";

import { useState } from "react";
import { CreditCard, LoaderCircle } from "lucide-react";

export function BillingPortalButton() {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function openPortal() {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/v1/plus/billing-portal", {
        method: "POST",
      });
      const payload = (await response.json()) as {
        data?: { url?: string };
        error?: { message?: string };
      };
      if (!response.ok || !payload.data?.url) {
        throw new Error(payload.error?.message ?? "Billing management is unavailable");
      }
      window.location.assign(payload.data.url);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Billing management is unavailable",
      );
      setBusy(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        className="plus-checkout-button"
        disabled={busy}
        onClick={() => void openPortal()}
      >
        {busy ? <LoaderCircle className="animate-spin" /> : <CreditCard />}
        Manage billing, invoices and cancellation
      </button>
      {message ? (
        <p className="plus-checkout-error" role="alert">
          {message}
        </p>
      ) : null}
    </div>
  );
}
