"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type CompileResult = {
  package: string;
  bytes: number;
  sourceHash: string;
  canonicalSource: string;
  requiredFeatures: string[];
  scenes: Array<{ name: string; timelines: Array<{ name: string; durationMs: number }>; inputs: Array<{ name: string; type: string; defaultValue: { value: string | number | boolean } }> }>;
};
type RenderNode = { id: string; kind: string; properties: Record<string, string | number | boolean> };
type Frame = { timeMs: number; nodes: RenderNode[]; activeStateMachines: Record<string, string>; emittedEvents: string[] };

const presets = { phone: [390, 620], tablet: [768, 620], desktop: [1100, 620] } as const;

export function Playground({ initialSource }: { initialSource: string }) {
  const [source, setSource] = useState(initialSource);
  const [compiled, setCompiled] = useState<CompileResult | null>(null);
  const [frame, setFrame] = useState<Frame | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [reverse, setReverse] = useState(false);
  const [time, setTime] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [device, setDevice] = useState<keyof typeof presets>("desktop");
  const [theme, setTheme] = useState("#74f0c3");
  const [userName, setUserName] = useState("Developer");
  const [selectedTimeline, setSelectedTimeline] = useState("entrance");
  const startedAt = useRef(0);

  const selectedScene = compiled?.scenes[0];
  const duration = selectedScene?.timelines.find((item) => item.name === selectedTimeline)?.durationMs ?? 620;
  const viewport = presets[device];

  const evaluate = useCallback(async (targetTime: number, value = compiled) => {
    if (!value?.scenes[0]) return;
    const response = await fetch("/api/frame", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({
      package: value.package,
      scene: value.scenes[0].name,
      timeline: selectedTimeline,
      timeMs: Math.max(0, Math.min(duration, targetTime)),
      reducedMotion,
      inputs: { userName, count: 7, themeColor: theme },
    }) });
    const body = await response.json() as { frame?: Frame; error?: string };
    if (!response.ok || !body.frame) throw new Error(body.error ?? "Frame evaluation failed");
    setFrame(body.frame);
  }, [compiled, duration, reducedMotion, selectedTimeline, theme, userName]);

  const compile = useCallback(async () => {
    setBusy(true); setError(""); setPlaying(false);
    try {
      const response = await fetch("/api/compile", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ source }) });
      const body = await response.json() as CompileResult & { error?: string };
      if (!response.ok) throw new Error(body.error ?? "Compilation failed");
      setCompiled(body); setSelectedTimeline(body.scenes[0]?.timelines[0]?.name ?? "entrance"); setTime(0);
      await evaluate(0, body);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Compilation failed"); }
    finally { setBusy(false); }
  }, [evaluate, source]);

  useEffect(() => {
    if (!playing || !compiled) return;
    let cancelled = false;
    const interval = window.setInterval(() => {
      const elapsed = (performance.now() - startedAt.current) * speed;
      const next = reverse ? Math.max(0, duration - elapsed) : Math.min(duration, elapsed);
      setTime(next);
      void evaluate(next).catch((caught) => { if (!cancelled) { setError(caught instanceof Error ? caught.message : "Playback failed"); setPlaying(false); } });
      if ((!reverse && next >= duration) || (reverse && next <= 0)) setPlaying(false);
    }, 80);
    return () => { cancelled = true; window.clearInterval(interval); };
  }, [compiled, duration, evaluate, playing, reverse, speed]);

  const togglePlayback = () => {
    if (!compiled) return;
    if (!playing) {
      if ((!reverse && time >= duration) || (reverse && time <= 0)) setTime(reverse ? duration : 0);
      const origin = (!reverse && time >= duration) ? 0 : (reverse && time <= 0) ? duration : time;
      startedAt.current = performance.now() - (reverse ? duration - origin : origin) / speed;
    }
    setPlaying((value) => !value);
  };

  const renderedNodes = useMemo(() => frame?.nodes ?? [], [frame]);

  return <main>
    <header>
      <div><span className="eyebrow">Platform engineering</span><h1>Animation Playground</h1></div>
      <div className="pipeline"><span>source</span><i /> <span>FlatBuffers</span><i /> <span>verified runtime</span></div>
    </header>
    <section className="workspace">
      <div className="editor-pane">
        <div className="pane-bar"><strong>welcome.pani</strong><button className="primary" onClick={() => void compile()} disabled={busy}>{busy ? "Compiling…" : "Compile"}</button></div>
        <textarea aria-label="Animation source" spellCheck={false} value={source} onChange={(event) => setSource(event.target.value)} />
        <div className={`diagnostics ${error ? "has-error" : ""}`} role="status">
          {error || (compiled ? `Verified ${compiled.bytes.toLocaleString()} byte package · ${compiled.sourceHash.slice(0, 16)}…` : "Edit the source, then compile a deterministic package.")}
        </div>
      </div>
      <div className="preview-pane">
        <div className="pane-bar controls">
          <button onClick={togglePlayback} disabled={!compiled}>{playing ? "Pause" : "Play"}</button>
          <button onClick={() => { setReverse((value) => !value); setPlaying(false); }}>{reverse ? "Forward" : "Reverse"}</button>
          <select aria-label="Timeline" value={selectedTimeline} onChange={(event) => { setSelectedTimeline(event.target.value); setPlaying(false); setTime(0); }}>
            {selectedScene?.timelines.map((timeline) => <option key={timeline.name}>{timeline.name}</option>)}
          </select>
          <select aria-label="Speed" value={speed} onChange={(event) => setSpeed(Number(event.target.value))}><option value="0.5">0.5×</option><option value="1">1×</option><option value="2">2×</option></select>
        </div>
        <div className="stage-shell">
          <div className="stage" style={{ width: viewport[0], height: viewport[1], maxWidth: "100%" }}>
            {renderedNodes.map((node) => <PreviewNode key={node.id} node={node} />)}
          </div>
        </div>
        <input className="scrubber" aria-label="Animation time" type="range" min="0" max={duration} step="1" value={time} disabled={!compiled} onChange={(event) => { const value = Number(event.target.value); setPlaying(false); setTime(value); void evaluate(value).catch((caught) => setError(caught instanceof Error ? caught.message : "Seek failed")); }} />
        <div className="timecode"><span>{Math.round(time)} ms</span><span>{duration} ms</span></div>
      </div>
      <aside>
        <h2>Runtime inputs</h2>
        <label>Name<input value={userName} onChange={(event) => setUserName(event.target.value)} /></label>
        <label>Theme<input type="color" value={theme} onChange={(event) => setTheme(event.target.value)} /></label>
        <label className="check"><input type="checkbox" checked={reducedMotion} onChange={(event) => setReducedMotion(event.target.checked)} /> Reduced motion</label>
        <h2>Viewport</h2>
        <div className="segmented">{Object.keys(presets).map((name) => <button className={device === name ? "active" : ""} key={name} onClick={() => setDevice(name as keyof typeof presets)}>{name}</button>)}</div>
        <h2>Package</h2>
        <dl><dt>Features</dt><dd>{compiled?.requiredFeatures.join(", ") || "—"}</dd><dt>Scene</dt><dd>{selectedScene?.name || "—"}</dd><dt>State</dt><dd>{frame ? Object.values(frame.activeStateMachines).join(", ") || "stateless" : "—"}</dd></dl>
      </aside>
    </section>
  </main>;
}

function PreviewNode({ node }: { node: RenderNode }) {
  const p = node.properties;
  const style: React.CSSProperties = {
    left: typeof p.x === "number" ? p.x : 0,
    top: typeof p.y === "number" ? p.y : 0,
    width: typeof p.width === "number" ? p.width : undefined,
    height: typeof p.height === "number" ? p.height : undefined,
    opacity: typeof p.opacity === "number" ? p.opacity : 1,
    color: typeof p.color === "string" ? p.color : undefined,
    background: typeof p.fill === "string" ? p.fill : undefined,
    borderRadius: typeof p.cornerRadius === "number" ? p.cornerRadius : undefined,
    transform: `scale(${typeof p.scale === "number" ? p.scale : 1})`,
  };
  if (node.kind === "host") return <button className="preview-node host-node" style={style}>Continue</button>;
  if (node.kind === "path") return <div className="preview-node path-node" style={style} aria-label={node.id} />;
  return <div className={`preview-node ${node.kind}`} style={style}>{typeof p.text === "string" ? p.text : ""}</div>;
}
