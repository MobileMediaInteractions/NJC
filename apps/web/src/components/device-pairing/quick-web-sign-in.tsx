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

export function QuickWebSignIn() {
  const { isLoaded, isSignedIn } = useAuth();
  const { signIn } = useSignIn();
  const router = useRouter();
  const [pairing, setPairing] = useState<PairingRequest | null>(null);
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const exchanging = useRef(false);

  const begin = useCallback(async () => {
    setBusy(true);
    setNotice("");
    setPairing(null);
    exchanging.current = false;
    const response = await fetch("/api/v1/device-pairing", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ target: "web", deviceName: "Web browser" }),
    });
    const payload = await response.json();
    if (response.ok) setPairing(payload.data);
    else setNotice(payload.error?.message ?? "Quick sign-in is unavailable.");
    setBusy(false);
  }, []);

  useEffect(() => {
    if (!isLoaded || isSignedIn || pairing || busy || notice) return;
    const timer = window.setTimeout(() => void begin(), 0);
    return () => window.clearTimeout(timer);
  }, [begin, busy, isLoaded, isSignedIn, notice, pairing]);
  useEffect(() => {
    if (!pairing || isSignedIn) return;
    let active = true;
    const poll = async () => {
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
      if (!response.ok) {
        setNotice(payload.error?.message ?? "Could not check sign-in status.");
        return;
      }
      const result = payload.data as PairingPollResult;
      if (
        result.status === "approved" &&
        "ticket" in result &&
        !exchanging.current
      ) {
        exchanging.current = true;
        try {
          const attempted = await signIn.ticket({ ticket: result.ticket });
          if (attempted.error) throw attempted.error;
          const finalized = await signIn.finalize();
          if (finalized.error) throw finalized.error;
          router.replace("/");
          router.refresh();
        } catch (error) {
          setNotice(
            error instanceof Error
              ? error.message
              : "The browser could not finish signing in.",
          );
          exchanging.current = false;
        }
      } else if (["expired", "consumed", "denied"].includes(result.status))
        setNotice(
          "This code is no longer active. Create a new one to try again.",
        );
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
  }, [isSignedIn, pairing, router, signIn]);

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
            <div className="mx-auto w-fit rounded-xl border bg-white p-3">
              <Image
                src={pairing.qrImageUrl}
                alt="QR code for quick browser sign-in"
                width={260}
                height={260}
                unoptimized
                priority
              />
            </div>
            <p className="mt-5 text-xs font-black uppercase tracking-[0.2em] text-slate-500">
              Sync code
            </p>
            <p className="mt-2 font-mono text-4xl font-black tracking-[0.18em] text-brand-navy">
              {pairing.userCode}
            </p>
            <div className="mt-6 flex items-center justify-center gap-2 text-sm font-semibold text-brand-blue">
              <LoaderCircle className="size-4 animate-spin" /> Waiting for
              mobile approval
            </div>
            <p className="mt-3 text-xs text-slate-500">
              Expires in 10 minutes. Never approve a different code.
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
