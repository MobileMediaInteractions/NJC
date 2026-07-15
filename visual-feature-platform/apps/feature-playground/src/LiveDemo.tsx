import { useMemo, useState } from "react";
import { compileFeature } from "@visual-feature/compiler";
import { createLiveInformationFeature } from "@visual-feature/model/examples";

export function LiveDemo() {
  const feature = useMemo(createLiveInformationFeature, []); const compiled = useMemo(() => compileFeature(feature), [feature]); const [score, setScore] = useState(42); const [connected, setConnected] = useState(true);
  return <section className="live-demo"><div><p className="eyebrow">SIMULATED CONNECTOR · SAME RUNTIME CONTRACT</p><h2>Live Garden State pulse</h2><strong className="score">{score}</strong><p className={connected ? "connection" : "connection stale"}>{connected ? "● Connected" : "● Reconnecting · last value retained"}</p><div className="live-video"><span>LIVE</span><b>Simulated broadcast source</b><small>Adapter compatibility: web fixture</small></div></div><aside><button onClick={() => setScore((value) => value + 1)}>Inject score update</button><button onClick={() => setConnected((value) => !value)}>{connected ? "Inject disconnect" : "Reconnect"}</button><p>{compiled.packageBytes.length.toLocaleString()} verified package bytes</p><p>10 events/sec policy · 10s stale threshold · exponential reconnect</p></aside></section>;
}
