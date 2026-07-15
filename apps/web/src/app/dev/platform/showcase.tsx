"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type Frame = { timeMs: number; nodes: Array<{ id: string; kind: string; properties: Record<string, string | number | boolean> }> };

export function PlatformShowcase({ samples, packageBytes, sourceHash, canonicalSource, requiredFeatures }: { samples: Frame[]; packageBytes: number; sourceHash: string; canonicalSource: string; requiredFeatures: string[] }) {
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(true);
  useEffect(() => {
    if (!playing) return;
    const interval = window.setInterval(() => setIndex((value) => value >= samples.length - 1 ? 0 : value + 1), 100);
    return () => window.clearInterval(interval);
  }, [playing, samples.length]);
  const frame = samples[index] ?? samples[0];
  const nodes = useMemo(() => Object.fromEntries((frame?.nodes ?? []).map((node) => [node.id, node.properties])), [frame]);
  const styleFor = (id: string, applyTimelineY = false): React.CSSProperties => ({
    opacity: typeof nodes[id]?.opacity === "number" ? nodes[id].opacity : 1,
    transform: `translateY(${applyTimelineY && typeof nodes[id]?.y === "number" ? nodes[id].y : 0}px) scale(${typeof nodes[id]?.scale === "number" ? nodes[id].scale : 1})`,
  });
  return <main className="min-h-screen bg-[#0d1511] px-5 py-10 text-[#f5f0e6] sm:px-10">
    <div className="mx-auto max-w-6xl">
      <p className="font-mono text-xs font-bold uppercase tracking-[.18em] text-[#9cc5ad]">Development-only integration</p>
      <div className="mt-3 flex flex-wrap items-end justify-between gap-5"><div><h1 className="text-4xl font-black tracking-[-.05em] sm:text-6xl">Verified motion inside the newsroom app.</h1><p className="mt-4 max-w-2xl text-[#b5c6bd]">This route compiles the platform language on the server, verifies the FlatBuffers package, evaluates the deterministic runtime, and maps its output onto real host UI.</p></div><Link href="/" className="rounded-full border border-[#385246] px-5 py-2 text-sm">Back to Courier</Link></div>
      <section className="mt-10 grid gap-6 lg:grid-cols-[1.5fr_.8fr]">
        <div className="overflow-hidden rounded-3xl border border-[#344b40] bg-[#f8f4eb] p-6 text-[#152019] shadow-2xl sm:p-10">
          <div className="relative min-h-64 overflow-hidden rounded-2xl border border-[#d5cfc3] bg-white p-8">
            <div className="absolute left-6 top-6 h-32 w-2 rounded-full bg-[#c49545] transition-all" style={styleFor("rule")} />
            <p className="ml-7 text-xs font-black tracking-[.15em] text-[#a26f24] transition-all" style={styleFor("label")}>BREAKING · MIDDLESEX</p>
            <h2 className="ml-7 mt-6 max-w-xl text-3xl font-black leading-[.98] tracking-[-.05em] transition-all sm:text-5xl" style={styleFor("headline")}>Transit vote reshapes the Route 1 corridor</h2>
            <button className="ml-7 mt-8 rounded-full bg-[#173e32] px-5 py-3 text-sm font-bold text-white transition-all" style={styleFor("openButton", true)}>Open developing story</button>
          </div>
          <div className="mt-5 flex items-center gap-3"><button onClick={() => setPlaying((value) => !value)} className="rounded-full bg-[#173e32] px-5 py-2 text-sm font-bold text-white">{playing ? "Pause" : "Play"}</button><input aria-label="Animation frame" type="range" min="0" max={samples.length - 1} value={index} onChange={(event) => { setPlaying(false); setIndex(Number(event.target.value)); }} className="w-full accent-[#173e32]" /><span className="w-16 font-mono text-xs">{frame?.timeMs ?? 0}ms</span></div>
        </div>
        <aside className="rounded-3xl border border-[#344b40] bg-[#121e19] p-6">
          <h2 className="text-xl font-black">Package diagnostics</h2>
          <dl className="mt-5 space-y-4 text-sm"><div><dt className="text-[#7d998c]">Container</dt><dd>Verified PANI v1</dd></div><div><dt className="text-[#7d998c]">Package size</dt><dd>{packageBytes.toLocaleString()} bytes</dd></div><div><dt className="text-[#7d998c]">Source SHA-256</dt><dd className="break-all font-mono text-xs">{sourceHash}</dd></div><div><dt className="text-[#7d998c]">Entitled features</dt><dd>{requiredFeatures.join(", ")}</dd></div></dl>
          <details className="mt-6"><summary className="cursor-pointer text-sm font-bold text-[#9cc5ad]">Canonical source</summary><pre className="mt-3 max-h-80 overflow-auto whitespace-pre-wrap rounded-xl bg-black/30 p-4 text-[10px] text-[#c5d8cf]">{canonicalSource}</pre></details>
          <p className="mt-6 text-xs leading-5 text-[#789187]">Production builds return 404 for this showcase. Production entitlements must come from the signed licensing service.</p>
        </aside>
      </section>
    </div>
  </main>;
}
