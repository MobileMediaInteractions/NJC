import { useEffect, useState, type FormEvent } from "react";

export type AnimationExportKind = "source" | "package" | "mp4";

type TimelineOption = { name: string; durationMs: number };

const exportOptions: Array<{ id: AnimationExportKind; label: string; extension: string; description: string }> = [
  { id: "source", label: "Editable source", extension: ".pani", description: "Keep the animation readable and editable in Studio." },
  { id: "package", label: "Runtime package", extension: ".pani.bin", description: "Export the verified binary container for an app runtime." },
  { id: "mp4", label: "Rendered video", extension: ".mp4", description: "Render a timeline frame-by-frame and encode an H.264 video." },
];

export function ExportDialog({ open, busy, progress, initialKind, timelines, selectedTimeline, width, height, onClose, onExport }: {
  open: boolean;
  busy: boolean;
  progress: string | null;
  initialKind: AnimationExportKind;
  timelines: TimelineOption[];
  selectedTimeline: string;
  width: number;
  height: number;
  onClose: () => void;
  onExport: (kind: AnimationExportKind, timeline: string, fps: number) => void;
}) {
  const [kind, setKind] = useState<AnimationExportKind>(initialKind);
  const [timeline, setTimeline] = useState(() => timelines.some((item) => item.name === selectedTimeline) ? selectedTimeline : timelines[0]?.name ?? "");
  const [fps, setFps] = useState(30);

  useEffect(() => {
    if (!open) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !busy) onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [busy, onClose, open]);

  if (!open) return null;
  const submit = (event: FormEvent) => {
    event.preventDefault();
    onExport(kind, timeline, fps);
  };

  return (
    <div className="dialog-backdrop" onMouseDown={() => !busy && onClose()}>
      <form className="export-dialog" role="dialog" aria-modal="true" aria-labelledby="export-animation-title" onMouseDown={(event) => event.stopPropagation()} onSubmit={submit}>
        <header><span className="dialog-mark">OUT</span><div><h2 id="export-animation-title">Export animation</h2><p>Choose an editable, runtime, or fully rendered deliverable.</p></div></header>
        <fieldset className="export-kind-grid"><legend>Format</legend>{exportOptions.map((option) => <label className={kind === option.id ? "selected" : ""} key={option.id}><input type="radio" name="export-kind" value={option.id} checked={kind === option.id} onChange={() => setKind(option.id)} disabled={busy} /><span><strong>{option.label}<b>{option.extension}</b></strong><small>{option.description}</small></span></label>)}</fieldset>
        {kind === "mp4" && <div className="export-video-settings"><label>Timeline<select value={timeline} onChange={(event) => setTimeline(event.target.value)} disabled={busy}>{timelines.map((item) => <option value={item.name} key={item.name}>{item.name} · {(item.durationMs / 1_000).toFixed(1)}s</option>)}</select></label><label>Frame rate<select value={fps} onChange={(event) => setFps(Number(event.target.value))} disabled={busy}><option value={24}>24 FPS</option><option value={30}>30 FPS</option><option value={60}>60 FPS</option></select></label><span><strong>{width} × {height}</strong><small>Current preview orientation</small></span></div>}
        {progress && <div className="export-progress" role="status"><span className="export-progress-spinner" />{progress}</div>}
        <footer><button type="button" onClick={onClose} disabled={busy}>Cancel</button><button className="primary" type="submit" disabled={busy || kind === "mp4" && !timeline}>{busy ? "Exporting…" : `Export ${exportOptions.find((option) => option.id === kind)?.extension}`}</button></footer>
      </form>
    </div>
  );
}
