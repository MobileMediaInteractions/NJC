import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { RefreshCw, WifiOff } from "lucide-react";

export const metadata: Metadata = {
  title: "Offline",
  robots: { index: false, follow: false },
};

export default function OfflinePage() {
  return (
    <main className="grid min-h-dvh place-items-center bg-brand-navy px-6 py-[max(2rem,env(safe-area-inset-top))] text-white">
      <section className="w-full max-w-md text-center">
        <Image
          src="/assets/brand/v1/wordmark-inverse.svg"
          alt="The New Jersey Courier"
          width={420}
          height={104}
          priority
          className="mx-auto h-auto w-72"
        />
        <div className="mx-auto mt-12 grid size-16 place-items-center rounded-2xl bg-white/10 text-brand-yellow">
          <WifiOff className="size-8" />
        </div>
        <p className="mt-7 text-xs font-black uppercase tracking-[0.2em] text-brand-yellow">
          Connection paused
        </p>
        <h1 className="font-editorial mt-3 text-4xl font-semibold tracking-tight">
          The Courier is still with you.
        </h1>
        <p className="mt-4 text-base leading-7 text-white/70">
          This page has not been saved on this device yet. Reconnect to load it,
          or return to coverage you opened earlier.
        </p>
        <div className="mt-8 grid gap-3">
          <Link
            href="/"
            className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-brand-yellow px-5 font-bold text-brand-navy"
          >
            <RefreshCw className="size-4" /> Try the front page again
          </Link>
          <Link
            href="/latest"
            className="flex min-h-12 items-center justify-center rounded-xl border border-white/25 px-5 font-bold text-white"
          >
            Open saved local coverage
          </Link>
        </div>
      </section>
    </main>
  );
}
