"use client";

import { useAuth, useUser } from "@clerk/nextjs";
import { CheckCircle2, KeyRound, ShieldAlert, Tv } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function formatUserCode(value: string) {
  const normalized = value
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 6);
  return normalized.length > 3
    ? `${normalized.slice(0, 3)}-${normalized.slice(3)}`
    : normalized;
}

export function TvPairingApproval({
  initialSession,
  initialCode,
  initialClaimNonce,
  initialTarget,
}: {
  initialSession: string;
  initialCode: string;
  initialClaimNonce: string;
  initialTarget: "tv" | "androidtv" | "roku";
}) {
  const { isLoaded, isSignedIn } = useAuth();
  const { user } = useUser();
  const [code, setCode] = useState(formatUserCode(initialCode));
  const [busy, setBusy] = useState(false);
  const [claimed, setClaimed] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [approved, setApproved] = useState(false);
  const [denied, setDenied] = useState(false);
  const [notice, setNotice] = useState("");
  const claimStarted = useRef(false);
  const deviceLabel =
    initialTarget === "roku"
      ? "Roku"
      : initialTarget === "androidtv"
        ? "Android TV"
        : "Apple TV";
  const signInUrl = useMemo(
    () =>
      `/sign-in?redirect_url=${encodeURIComponent(`/login/tv?${new URLSearchParams({ ...(initialSession ? { session: initialSession } : {}), ...(code ? { code } : {}), ...(initialClaimNonce ? { nonce: initialClaimNonce } : {}), target: initialTarget })}`)}`,
    [code, initialClaimNonce, initialSession, initialTarget],
  );

  useEffect(() => {
    if (
      !isLoaded ||
      !isSignedIn ||
      !initialSession ||
      !initialClaimNonce ||
      !code ||
      claimStarted.current
    )
      return;
    claimStarted.current = true;
    setClaiming(true);
    void fetch(
      `/api/v1/device-pairing/${encodeURIComponent(initialSession)}/claim`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          target: initialTarget,
          claimNonce: initialClaimNonce,
        }),
      },
    )
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok)
          throw new Error(
            payload.error?.message ?? "This QR sign-in request is unavailable.",
          );
        setClaimed(true);
        setNotice("");
      })
      .catch((error: unknown) => {
        setNotice(
          error instanceof Error
            ? error.message
            : "This QR sign-in request is unavailable.",
        );
      })
      .finally(() => setClaiming(false));
  }, [code, initialClaimNonce, initialSession, initialTarget, isLoaded, isSignedIn]);

  async function approve() {
    setBusy(true);
    setNotice("");
    try {
      const path = initialSession
        ? `/api/v1/device-pairing/${encodeURIComponent(initialSession)}/approve`
        : "/api/v1/device-pairing/approve";
      const response = await fetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          target: initialTarget,
          ...(initialClaimNonce ? { claimNonce: initialClaimNonce } : {}),
        }),
      });
      const payload = await response.json();
      if (response.ok) setApproved(true);
      else
        setNotice(
          payload.error?.message ?? `This ${deviceLabel} could not be approved.`,
        );
    } catch {
      setNotice(
        `This ${deviceLabel} could not be approved. Check your connection and try again.`,
      );
    } finally {
      setBusy(false);
    }
  }

  async function deny() {
    if (!initialSession || !initialClaimNonce) return;
    setBusy(true);
    setNotice("");
    try {
      const response = await fetch(
        `/api/v1/device-pairing/${encodeURIComponent(initialSession)}/deny`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ claimNonce: initialClaimNonce }),
        },
      );
      const payload = await response.json();
      if (response.ok) setDenied(true);
      else setNotice(payload.error?.message ?? "The request could not be denied.");
    } catch {
      setNotice("The request could not be denied. It will expire safely.");
    } finally {
      setBusy(false);
    }
  }

  if (denied)
    return (
      <section className="mx-auto grid max-w-2xl place-items-center px-6 pb-20 pt-16 text-center">
        <div className="grid size-20 place-items-center rounded-full bg-amber-400/15 text-amber-300">
          <ShieldAlert className="size-10" />
        </div>
        <h1 className="mt-7 text-4xl font-black tracking-tight">Connection denied</h1>
        <p className="mt-4 max-w-lg text-lg leading-8 text-white/70">
          This single-use request can no longer connect a device. You may close this page.
        </p>
      </section>
    );

  if (approved)
    return (
      <section className="mx-auto grid max-w-2xl place-items-center px-6 pb-20 pt-16 text-center">
        <div className="grid size-20 place-items-center rounded-full bg-emerald-400/15 text-emerald-300">
          <CheckCircle2 className="size-10" />
        </div>
        <h1 className="mt-7 text-4xl font-black tracking-tight">
          {deviceLabel} connected
        </h1>
        <p className="mt-4 max-w-lg text-lg leading-8 text-white/70">
          The television can now finish signing in as{" "}
          {user?.fullName ??
            user?.primaryEmailAddress?.emailAddress ??
            "your account"}
          . You may close this page.
        </p>
      </section>
    );

  return (
    <section className="mx-auto grid w-full max-w-6xl gap-10 px-6 pb-20 pt-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
      <div>
        <div className="grid size-14 place-items-center rounded-2xl bg-brand-yellow text-brand-navy">
          <Tv className="size-7" />
        </div>
        <p className="mt-7 text-xs font-black uppercase tracking-[0.22em] text-brand-yellow">
          {deviceLabel} activation
        </p>
        <h1 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">
          Match the code before you connect.
        </h1>
        <p className="mt-5 max-w-xl text-lg leading-8 text-white/70">
          Only approve when the code below exactly matches the one on your
          television. The New Jersey Courier never sends your password through the QR code.
        </p>
        <div className="mt-8 flex items-start gap-3 rounded-xl border border-amber-300/25 bg-amber-300/10 p-4 text-sm leading-6 text-amber-50">
          <ShieldAlert className="mt-0.5 size-5 shrink-0 text-brand-yellow" />
          <p>
            If the codes differ—or you did not start this request—do not approve
            it. Let the request expire.
          </p>
        </div>
      </div>
      <div className="rounded-2xl border border-white/15 bg-white p-6 text-slate-950 shadow-2xl sm:p-9">
        <div className="flex items-center gap-3 text-brand-navy">
          <KeyRound className="size-6" />
          <h2 className="text-xl font-black">Television sync code</h2>
        </div>
        <label
          htmlFor="tv-sync-code"
          className="mt-7 block text-sm font-bold text-slate-700"
        >
          Code shown on {deviceLabel}
        </label>
        <Input
          id="tv-sync-code"
          value={code}
          onChange={(event) => setCode(formatUserCode(event.target.value))}
          className="mt-2 h-16 text-center font-mono text-3xl font-black tracking-[0.2em] uppercase"
          placeholder="ABC-234"
          maxLength={7}
          autoComplete="one-time-code"
        />
        {!isLoaded ? (
          <p className="mt-6 text-sm text-slate-500">Checking your account…</p>
        ) : isSignedIn ? (
          <>
            <Button
              className="mt-6 h-12 w-full bg-brand-blue text-base font-black"
              disabled={
                busy ||
                claiming ||
                code.length !== 7 ||
                Boolean(initialSession && initialClaimNonce && !claimed)
              }
              onClick={() => void approve()}
            >
              {claiming
                ? "Securing scanned request…"
                : busy
                  ? "Verifying…"
                  : `The codes match — connect ${deviceLabel}`}
            </Button>
            {claimed ? (
              <Button
                variant="outline"
                className="mt-3 h-11 w-full"
                disabled={busy}
                onClick={() => void deny()}
              >
                These codes do not match — deny
              </Button>
            ) : null}
            <p className="mt-4 text-center text-xs text-slate-500">
              Approving as {user?.primaryEmailAddress?.emailAddress}
            </p>
          </>
        ) : (
          <>
            <Button
              asChild
              className="mt-6 h-12 w-full bg-brand-blue text-base font-black"
            >
              <Link href={signInUrl}>Sign in to verify this code</Link>
            </Button>
            <p className="mt-4 text-center text-xs text-slate-500">
              A verified Courier account is required.
            </p>
          </>
        )}
        {notice ? (
          <p
            role="alert"
            className="mt-4 rounded-lg bg-red-50 p-3 text-sm font-medium text-red-800"
          >
            {notice}
          </p>
        ) : null}
      </div>
    </section>
  );
}
