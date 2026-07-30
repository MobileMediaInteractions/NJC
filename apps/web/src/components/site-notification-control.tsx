"use client";

import { useCallback, useEffect, useState } from "react";
import { BellOff, BellRing, LoaderCircle, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

type PushConfiguration = {
  configured: boolean;
  enabled: boolean;
  subscribed: boolean;
  publicKey: string | null;
};

type PushState =
  | "loading"
  | "available"
  | "subscribed"
  | "unsupported"
  | "denied"
  | "unavailable";

function browserSupportsPush() {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

function vapidKey(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  const bytes = atob(padded);
  return Uint8Array.from(bytes, (character) => character.charCodeAt(0));
}

async function pushConfiguration() {
  const response = await fetch("/api/v1/push/subscriptions", {
    cache: "no-store",
  });
  const payload = (await response.json()) as {
    data?: PushConfiguration;
    error?: { message?: string };
  };
  if (!response.ok || !payload.data) {
    throw new Error(payload.error?.message ?? "Notification status is unavailable");
  }
  return payload.data;
}

async function getRegistration() {
  return navigator.serviceWorker.register("/njc-push-sw.js", {
    scope: "/",
  });
}

async function reportSubscription(subscription: PushSubscription) {
  const response = await fetch("/api/v1/push/subscriptions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(subscription.toJSON()),
  });
  const payload = (await response.json()) as {
    error?: { message?: string };
  };
  if (!response.ok) {
    throw new Error(payload.error?.message ?? "The browser could not be registered");
  }
}

export async function reconcileExistingPushSubscription() {
  if (!browserSupportsPush()) return;
  const registration = await navigator.serviceWorker.getRegistration("/");
  const subscription = await registration?.pushManager.getSubscription();
  if (subscription) await reportSubscription(subscription);
}

export function SiteNotificationControl() {
  const [state, setState] = useState<PushState>("loading");
  const [configuration, setConfiguration] =
    useState<PushConfiguration | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    if (!browserSupportsPush()) {
      setState("unsupported");
      return;
    }
    if (Notification.permission === "denied") {
      setState("denied");
      return;
    }
    try {
      const current = await pushConfiguration();
      setConfiguration(current);
      if (!current.configured || !current.enabled) {
        setState("unavailable");
        return;
      }
      const registration = await navigator.serviceWorker.getRegistration("/");
      const subscription = await registration?.pushManager.getSubscription();
      setState(subscription ? "subscribed" : "available");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Notification status is unavailable",
      );
      setState("unavailable");
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void refresh(), 0);
    return () => window.clearTimeout(timer);
  }, [refresh]);

  async function enable() {
    if (!configuration?.publicKey) return;
    setBusy(true);
    setMessage("");
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState(permission === "denied" ? "denied" : "available");
        return;
      }
      const registration = await getRegistration();
      const existing = await registration.pushManager.getSubscription();
      const subscription =
        existing ??
        (await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: vapidKey(configuration.publicKey),
        }));
      await reportSubscription(subscription);
      setState("subscribed");
      setMessage("Site notifications are enabled on this browser.");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Notifications could not be enabled",
      );
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true);
    setMessage("");
    try {
      const registration = await navigator.serviceWorker.getRegistration("/");
      const subscription = await registration?.pushManager.getSubscription();
      if (subscription) {
        const response = await fetch("/api/v1/push/subscriptions", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        });
        if (!response.ok) throw new Error("The subscription could not be disabled");
        await subscription.unsubscribe();
      }
      setState("available");
      setMessage("Site notifications are disabled on this browser.");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Notifications could not be disabled",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="border-t-4 border-brand-yellow bg-brand-navy p-8 text-white">
      <div className="flex items-start gap-4">
        <div className="grid size-11 shrink-0 place-items-center rounded-full bg-white/10 text-brand-yellow">
          {state === "denied" ? (
            <ShieldAlert />
          ) : state === "subscribed" ? (
            <BellRing />
          ) : (
            <BellOff />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-2xl font-black">Courier site notifications</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-white/68">
            Receive carefully selected local-news alerts on this browser. We
            never ask for notification permission until you choose to enable
            it, and you can turn it off here at any time.
          </p>

          <div className="mt-5">
            {state === "loading" ? (
              <p className="flex items-center gap-2 text-sm text-white/70" role="status">
                <LoaderCircle className="size-4 animate-spin" /> Checking this browser…
              </p>
            ) : state === "unsupported" ? (
              <p className="text-sm text-white/70">
                This browser does not support website notifications.
              </p>
            ) : state === "unavailable" ? (
              <p className="text-sm text-white/70">
                Site notifications are not active yet. Email briefings remain available below.
              </p>
            ) : state === "denied" ? (
              <p className="text-sm text-white/70">
                Notifications are blocked in your browser settings. Allow them
                for this site, then return here.
              </p>
            ) : state === "subscribed" ? (
              <Button
                type="button"
                variant="outline"
                className="border-white/40 bg-transparent text-white hover:bg-white/10 hover:text-white"
                disabled={busy}
                onClick={() => void disable()}
              >
                {busy ? <LoaderCircle className="animate-spin" /> : <BellOff />}
                Disable site notifications
              </Button>
            ) : (
              <Button
                type="button"
                className="bg-brand-yellow text-brand-navy hover:bg-white"
                disabled={busy}
                onClick={() => void enable()}
              >
                {busy ? <LoaderCircle className="animate-spin" /> : <BellRing />}
                Enable site notifications
              </Button>
            )}
          </div>

          {message ? (
            <p className="mt-4 text-sm text-white/75" role="status">
              {message}
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}
