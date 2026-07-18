import { useEffect } from "react";
import type { AnimationImportOutcome } from "../lib/desktop";

const labels = {
  fully_supported: "Validated",
  converted: "Converted",
  approximated: "Approximation",
  rasterized: "Rasterized",
  ignored_with_warning: "Omitted",
  unsupported_with_error: "Blocked",
} as const;

export function ImportReportDialog({ outcome, onClose }: { outcome: AnimationImportOutcome | null; onClose: () => void }) {
  useEffect(() => {
    if (!outcome) return;
    const handleKey = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose, outcome]);

  if (!outcome) return null;
  const blocked = outcome.report.some((item) => item.disposition === "unsupported_with_error");
  const lossless = outcome.report.some((item) => item.source === "editable source" && item.disposition === "converted");
  const summary = outcome.summary;
  return (
    <div className="dialog-backdrop" onMouseDown={onClose}>
      <section className="import-report-dialog" role="dialog" aria-modal="true" aria-labelledby="import-report-title" onMouseDown={(event) => event.stopPropagation()}>
        <header><span className={`dialog-mark ${blocked ? "blocked" : ""}`}>{blocked ? "!" : "IN"}</span><div><h2 id="import-report-title">{blocked ? "Translation stopped safely" : lossless ? "Lottie preserved as an editable project" : outcome.format === "lottie" ? "Lottie translated to editable PANI" : "Animation imported"}</h2><p>{outcome.sourceName}{outcome.file ? ` → ${outcome.file.path}` : " was not written to the workspace"}</p></div></header>
        {summary && <dl className="import-summary"><div><dt>Canvas</dt><dd>{summary.width} × {summary.height}</dd></div><div><dt>Timing</dt><dd>{summary.frameRate} FPS · {(summary.durationMs / 1_000).toFixed(2)}s</dd></div><div><dt>Layers</dt><dd>{summary.layers}</dd></div><div><dt>Editable objects</dt><dd>{summary.components}</dd></div><div><dt>Warnings</dt><dd>{summary.warnings}</dd></div><div><dt>Blocking errors</dt><dd>{summary.errors}</dd></div></dl>}
        <div className="import-report-list" aria-label="Compatibility report">{outcome.report.map((item, index) => <article className={item.disposition} key={`${item.source}-${index}`}><span>{labels[item.disposition]}</span><div><strong>{item.source}</strong><p>{item.message}</p></div></article>)}</div>
        <aside>{blocked ? "No partial project was created. Correct the structural or security issue shown above, then import again." : lossless ? "The complete validated Lottie JSON is embedded in one PANI component. It previews and exports with full Lottie rendering while keeping the original data intact; Studio does not pretend advanced After Effects structures are independently editable shapes." : "The generated .pani file is canonical source: every converted component and timeline can now be edited, saved, previewed, and exported in Studio."}</aside>
        <footer><button autoFocus className="primary" type="button" onClick={onClose}>{outcome.file ? "Open project" : "Close report"}</button></footer>
      </section>
    </div>
  );
}
