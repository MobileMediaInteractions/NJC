import { useEffect, useRef } from "react";
import type { ImportConsoleLine } from "../model/protocol";

export function ImportConsole({ lines, running, onClear }: { lines: ImportConsoleLine[]; running: boolean; onClear: () => void }) {
  const tail = useRef<HTMLDivElement>(null);
  useEffect(() => { tail.current?.scrollIntoView({ block: "nearest" }); }, [lines]);

  return <section className="import-console" aria-label="Live import console"><header><span className={running ? "running" : "idle"}><i />{running ? "IMPORT RUNNING" : lines.length ? "IMPORT FINISHED" : "READY"}</span><small>Validator · translator · PANI compiler</small><button type="button" onClick={onClear} disabled={running || !lines.length}>Clear</button></header><div className="import-console-stream" role="log" aria-live="polite" aria-relevant="additions">{lines.length ? lines.map((line) => <article className={line.status} key={line.id}><time>{line.timestamp}</time><b>{line.phase.padEnd(9, " ")}</b><code>{line.message}</code></article>) : <p>Select <strong>Lottie → Import and Translate…</strong> or press <kbd>⌘⇧L</kbd> to start a live import job.</p>}<div ref={tail} /></div></section>;
}
