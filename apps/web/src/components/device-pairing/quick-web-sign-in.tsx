"use client";

import { useAuth, useSignIn } from "@clerk/nextjs";
import type { PairingRequest, PairingPollResult } from "@harborline/contracts";
import {
  CheckCircle2,
  LoaderCircle,
  QrCode,
  RefreshCw,
  ShieldCheck,
  Smartphone,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

type PairingPhase = "waiting" | "processing" | "success";

export function QuickWebSignIn({ returnTo = "/" }: { returnTo?: string }) {
  const { isLoaded, isSignedIn } = useAuth();
  const { signIn } = useSignIn();
  const router = useRouter();
  const [pairing, setPairing] = useState<PairingRequest | null>(null);
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [phase, setPhase] = useState<PairingPhase>("waiting");
  const [secondsRemaining, setSecondsRemaining] = useState(60);
  const [successSeconds, setSuccessSeconds] = useState(5);
  const exchanging = useRef(false);

  const begin = useCallback(async () => {
    setBusy(true);
    setNotice("");
    setPairing(null);
    setPhase("waiting");
    setSuccessSeconds(5);
    exchanging.current = false;
    try {
      const response = await fetch("/api/v1/device-pairing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target: "web", deviceName: "Web browser" }),
      });
      const payload = await response.json();
      if (!response.ok)
        throw new Error(payload.error?.message ?? "Quick sign-in is unavailable.");
      setPairing(payload.data);
      setSecondsRemaining(
        Math.max(
          0,
          Math.ceil(
            (new Date(payload.data.expiresAt).getTime() - Date.now()) / 1_000,
          ),
        ),
      );
    } catch (error) {
      setNotice(
        error instanceof Error
          ? error.message
          : "Quick sign-in is unavailable.",
      );
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    if (!isLoaded || isSignedIn || pairing || busy || notice) return;
    const timer = window.setTimeout(() => void begin(), 0);
    return () => window.clearTimeout(timer);
  }, [begin, busy, isLoaded, isSignedIn, notice, pairing]);
  useEffect(() => {
    if (!pairing || phase === "success") return;
    const update = () => {
      const seconds = Math.max(
        0,
        Math.ceil((new Date(pairing.expiresAt).getTime() - Date.now()) / 1_000),
      );
      setSecondsRemaining(seconds);
      if (seconds === 0 && phase === "waiting" && !busy) void begin();
    };
    update();
    const timer = window.setInterval(update, 1_000);
    return () => window.clearInterval(timer);
  }, [begin, busy, pairing, phase]);
  useEffect(() => {
    if (!pairing || isSignedIn) return;
    let active = true;
    const poll = async () => {
      try {
        const response = await fetch(
          `/api/v1/device-pairing/${pairing.id}/poll`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ deviceSecret: pairing.deviceSecret }),
          },
        );
        const payload = await response.json();
        if (!active) return;
        if (!response.ok)
          throw new Error(
            payload.error?.message ?? "Could not check sign-in status.",
          );
        const result = payload.data as PairingPollResult;
        if (result.status === "processing") {
          setPhase("processing");
          setPairing((current) =>
            current ? { ...current, expiresAt: result.expiresAt } : current,
          );
          return;
        }
        if (
          result.status === "approved" &&
          "ticket" in result &&
          !exchanging.current
        ) {
          exchanging.current = true;
          const attempted = await signIn.ticket({ ticket: result.ticket });
          if (attempted.error) throw attempted.error;
          const finalized = await signIn.finalize();
          if (finalized.error) throw finalized.error;
          setPhase("success");
        } else if (result.status === "expired") {
          void begin();
        } else if (["consumed", "denied"].includes(result.status)) {
          setNotice(
            "This request is no longer active. Create a new one to try again.",
          );
          setPairing(null);
        }
      } catch (error) {
        if (!active) return;
        setNotice(
          error instanceof Error
            ? error.message
            : "Could not check sign-in status.",
        );
        setPairing(null);
        exchanging.current = false;
      }
    };
    const timer = window.setInterval(
      () => void poll(),
      pairing.pollIntervalSeconds * 1000,
    );
    void poll();
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [begin, isSignedIn, pairing, signIn]);

  useEffect(() => {
    if (phase !== "success") return;
    const interval = window.setInterval(
      () => setSuccessSeconds((current) => Math.max(0, current - 1)),
      1_000,
    );
    const redirectTimer = window.setTimeout(() => {
      router.replace(returnTo);
      router.refresh();
    }, 5_000);
    return () => {
      window.clearInterval(interval);
      window.clearTimeout(redirectTimer);
    };
  }, [phase, returnTo, router]);

  if (phase === "success")
    return (
      <section className="fixed inset-0 z-50 grid place-items-center bg-brand-navy px-6 text-center text-white">
        <div>
          <div className="mx-auto grid size-24 place-items-center rounded-full bg-emerald-400/15 text-emerald-300">
            <CheckCircle2 className="size-12" />
          </div>
          <h1 className="mt-7 text-4xl font-black sm:text-5xl">Authenticated</h1>
          <p className="mt-4 text-lg text-white/70">
            Returning to where you left off in {successSeconds}…
          </p>
        </div>
      </section>
    );

  if (isLoaded && isSignedIn)
    return (
      <section className="mx-auto grid max-w-2xl place-items-center px-6 pb-20 pt-16 text-center">
        <div className="grid size-20 place-items-center rounded-full bg-emerald-400/15 text-emerald-300">
          <CheckCircle2 className="size-10" />
        </div>
        <h1 className="mt-7 text-4xl font-black">You’re already signed in</h1>
        <p className="mt-4 text-white/70">
          This browser already has an active Courier account.
        </p>
        <Button asChild className="mt-7 bg-brand-yellow text-brand-navy">
          <Link href="/">Return to The New Jersey Courier</Link>
        </Button>
      </section>
    );

  return (
    <section className="mx-auto grid w-full max-w-6xl gap-10 px-6 pb-20 pt-8 lg:grid-cols-[1fr_0.9fr] lg:items-center">
      <div>
        <div className="flex items-center gap-3 text-brand-yellow">
          <Smartphone className="size-8" />
          <QrCode className="size-8" />
        </div>
        <p className="mt-7 text-xs font-black uppercase tracking-[0.22em] text-brand-yellow">
          Quick browser sign-in
        </p>
        <h1 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">
          Scan. Match. Approve.
        </h1>
        <ol className="mt-7 space-y-4 text-lg text-white/75">
          <li>
            <strong className="text-white">1.</strong> Open Account in the
            The New Jersey Courier mobile app.
          </li>
          <li>
            <strong className="text-white">2.</strong> Choose “Scan quick
            sign-in QR” and scan this screen.
          </li>
          <li>
            <strong className="text-white">3.</strong> Confirm that both devices
            show the same sync code.
          </li>
        </ol>
        <div className="mt-8 flex gap-3 rounded-xl border border-white/15 bg-white/5 p-4 text-sm leading-6 text-white/70">
          <ShieldCheck className="mt-0.5 size-5 shrink-0 text-emerald-300" />
          <p>
            The QR cannot sign anyone in by itself. Approval requires an already
            authenticated mobile app and this matching code.
          </p>
        </div>
      </div>
      <div className="rounded-2xl bg-white p-6 text-center text-slate-950 shadow-2xl sm:p-9">
        {pairing ? (
          <>
            <div className="relative mx-auto w-fit overflow-hidden rounded-xl border bg-white p-3">
              <Image
                src={pairing.qrImageUrl}
                alt="QR code for quick browser sign-in"
                width={260}
                height={260}
                className={phase === "processing" ? "blur-md opacity-35" : undefined}
                unoptimized
                priority
              />
              {phase === "processing" ? (
                <div
                  className="absolute inset-0 grid place-items-center"
                  role="status"
                  aria-label="Authentication is processing"
                >
                  <LoaderCircle className="size-12 animate-spin text-brand-blue" />
                </div>
              ) : null}
            </div>
            <p className="mt-5 text-xs font-black uppercase tracking-[0.2em] text-slate-500">
              Sync code
            </p>
            <p className="mt-2 font-mono text-4xl font-black tracking-[0.18em] text-brand-navy">
              {pairing.userCode}
            </p>
            <div className="mt-6 flex items-center justify-center gap-2 text-sm font-semibold text-brand-blue">
              <LoaderCircle className="size-4 animate-spin" />{" "}
              {phase === "processing"
                ? "Secure scan received — processing"
                : "Waiting for mobile approval"}
            </div>
            <p className="mt-3 text-xs text-slate-500">
              {phase === "processing"
                ? "Code rotation is frozen while this secured scan is verified."
                : `New code in ${secondsRemaining}s. Never approve a different code.`}
            </p>
          </>
        ) : (
          <div className="grid min-h-80 place-items-center">
            <div>
              {busy ? (
                <LoaderCircle className="mx-auto size-8 animate-spin text-brand-blue" />
              ) : (
                <QrCode className="mx-auto size-10 text-brand-blue" />
              )}
              <p className="mt-4 text-sm text-slate-600">
                {notice || "Preparing a secure sign-in code…"}
              </p>
              {notice ? (
                <Button className="mt-5" onClick={() => void begin()}>
                  <RefreshCw /> Try again
                </Button>
              ) : null}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
