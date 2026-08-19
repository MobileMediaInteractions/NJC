"use client";

import { useMemo, useRef, useState } from "react";
import type { TimelineEditorFeatureConfig, TimelineEditorLabels, TimelineEditorProps, TimelineSegment, TimelineSegmentType } from "./types.js";
import { defaultSegmentLabel, formatMediaTime, validateTimeline } from "./timeline.js";

const defaultTypes: TimelineSegmentType[] = ["intro", "recap", "chapter", "credits", "custom"];
const defaultLabels: TimelineEditorLabels = { eyebrow: "Playback composition", title: "Source timeline", description: "Mark the program itself. Inherited presentation media is offset automatically.", inheritedPresentation: "Inherited presentation", inheritedHelp: "Read-only here. The host application owns the active platform ident.", emptyPreview: "Attach a video source to unlock scrubbing and segment preview.", sourceTimeline: "Source timeline", zoom: "Zoom", overlapReview: "Overlap review", resolveBeforeSaving: "Resolve before saving", idleStatus: "Millisecond precision · host-controlled persistence", discard: "Discard changes", save: "Save timeline", saving: "Saving…" };
const defaultFeatures: TimelineEditorFeatureConfig = { header: true, inheritedIntro: true, mediaPreview: true, zoom: true, addControls: true, inspector: true, validation: true, actions: true };

export function TimelineEditor({ segments, mediaUrl, durationMs, inheritedIntro, allowedTypes = defaultTypes, onChange, onSave, onDiscard, dirty = true, busy = false, statusMessage, readOnly = false, className = "", classNames = {}, labels: suppliedLabels, features: suppliedFeatures, style }: TimelineEditorProps) {
  const labels = { ...defaultLabels, ...suppliedLabels };
  const features = { ...defaultFeatures, ...suppliedFeatures };
  const videoRef = useRef<HTMLVideoElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const previewEndMs = useRef<number | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [timeMs, setTimeMs] = useState(0);
  const [measuredDurationMs, setMeasuredDurationMs] = useState(durationMs ?? 0);
  const [playing, setPlaying] = useState(false);
  const [zoom, setZoom] = useState(1);
  const selected = segments.find((segment) => segment.id === selectedId) ?? null;
  const duration = Math.max(measuredDurationMs || durationMs || 0, 1);
  const issues = useMemo(() => validateTimeline(segments, duration), [duration, segments]);
  const errors = issues.filter((issue) => issue.severity === "error");
  const warnings = issues.filter((issue) => issue.severity === "warning");

  function replace(next: TimelineSegment) {
    onChange(segments.map((segment) => segment.id === next.id ? next : segment));
  }

  function add(type: TimelineSegmentType) {
    const startMs = Math.min(timeMs, Math.max(0, duration - 1_000));
    const endMs = Math.min(duration, startMs + Math.min(30_000, Math.max(1_000, duration - startMs)));
    const next: TimelineSegment = {
      id: crypto.randomUUID(),
      segmentType: type,
      startMs,
      endMs,
      internalName: type === "custom" ? "Custom segment" : titleCase(type),
      viewerLabel: type === "credits" || type === "chapter" ? null : defaultSegmentLabel(type),
      skippable: type !== "credits" && type !== "chapter",
      sortOrder: segments.length,
    };
    onChange([...segments, next]);
    setSelectedId(next.id);
  }

  function seek(valueMs: number) {
    const next = Math.max(0, Math.min(duration, valueMs));
    setTimeMs(next);
    if (videoRef.current) videoRef.current.currentTime = next / 1_000;
  }

  function seekFromPointer(clientX: number) {
    const bounds = trackRef.current?.getBoundingClientRect();
    if (bounds) seek(((clientX - bounds.left) / bounds.width) * duration);
  }

  function beginResize(event: React.PointerEvent, segment: TimelineSegment, edge: "start" | "end") {
    if (readOnly) return;
    event.preventDefault();
    event.stopPropagation();
    setSelectedId(segment.id);
    const bounds = trackRef.current?.getBoundingClientRect();
    if (!bounds) return;
    const initialX = event.clientX;
    const initialValue = edge === "start" ? segment.startMs : segment.endMs;
    const move = (pointer: PointerEvent) => {
      const deltaMs = (pointer.clientX - initialX) / bounds.width * duration;
      const value = Math.round((initialValue + deltaMs) / 10) * 10;
      replace(edge === "start"
        ? { ...segment, startMs: Math.max(0, Math.min(segment.endMs - 1, value)) }
        : { ...segment, endMs: Math.max(segment.startMs + 1, Math.min(duration, value)) });
    };
    const stop = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", stop);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", stop, { once: true });
  }

  return (
    <section className={`harbor-timeline-editor ${classNames.root ?? ""} ${className}`.trim()} style={style}>
      {features.header ? <header className={classNames.header}><div><p>{labels.eyebrow}</p><h2>{labels.title}</h2><span>{labels.description}</span></div><strong>{segments.length} segment{segments.length === 1 ? "" : "s"}</strong></header> : null}
      {inheritedIntro && features.inheritedIntro ? <div className={`harbor-timeline-inherited ${classNames.inherited ?? ""}`.trim()}><p>{labels.inheritedPresentation}</p><span>{inheritedIntro.title} · {formatMediaTime(inheritedIntro.durationMs)}</span><span>Black / silence · {(inheritedIntro.blackGapMs / 1_000).toFixed(1)}s</span><small>{labels.inheritedHelp}</small></div> : null}
      {features.mediaPreview ? mediaUrl ? <div className={`harbor-timeline-preview ${classNames.preview ?? ""}`.trim()}><video ref={videoRef} src={mediaUrl} preload="metadata" onLoadedMetadata={(event) => setMeasuredDurationMs(Math.round(event.currentTarget.duration * 1_000))} onTimeUpdate={(event) => { const next = Math.round(event.currentTarget.currentTime * 1_000); setTimeMs(next); if (previewEndMs.current !== null && next >= previewEndMs.current) { previewEndMs.current = null; event.currentTarget.pause(); } }} onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} /><div><button type="button" onClick={() => { const video = videoRef.current; if (!video) return; previewEndMs.current = null; if (video.paused) void video.play(); else video.pause(); }} aria-label={playing ? "Pause preview" : "Play preview"}>{playing ? "Ⅱ" : "▶"}</button><span>{formatMediaTime(timeMs, true)} / {formatMediaTime(duration, true)}</span><input aria-label="Timeline playhead" type="range" min={0} max={duration} step={10} value={Math.min(timeMs, duration)} onChange={(event) => seek(Number(event.target.value))} /></div></div> : <div className={`harbor-timeline-empty ${classNames.emptyPreview ?? ""}`.trim()}>{labels.emptyPreview}</div> : null}
      <div className={`harbor-timeline-track-heading ${classNames.trackHeading ?? ""}`.trim()}><strong>{labels.sourceTimeline}</strong>{features.zoom ? <label>{labels.zoom} <input aria-label="Timeline zoom" type="range" min={1} max={8} step={1} value={zoom} onChange={(event) => setZoom(Number(event.target.value))} /><span>{zoom}×</span></label> : null}<time>{formatMediaTime(duration, true)}</time></div>
      <div className={`harbor-timeline-track-scroll ${classNames.trackScroll ?? ""}`.trim()}><div ref={trackRef} className={`harbor-timeline-track ${classNames.track ?? ""}`.trim()} style={{ width: `${zoom * 100}%` }} onPointerDown={(event) => seekFromPointer(event.clientX)}><span className="harbor-timeline-playhead" style={{ left: `${Math.min(100, timeMs / duration * 100)}%` }} />{segments.map((segment) => <div key={segment.id} className={`harbor-timeline-segment harbor-timeline-segment--${segment.segmentType} ${selectedId === segment.id ? "is-selected" : ""}`} style={{ left: `${segment.startMs / duration * 100}%`, width: `${Math.max(0.4, (segment.endMs - segment.startMs) / duration * 100)}%` }}><button type="button" onPointerDown={(event) => event.stopPropagation()} onClick={() => setSelectedId(segment.id)}>{segment.internalName || titleCase(segment.segmentType)}</button>{readOnly ? null : <><button type="button" aria-label={`Drag start of ${segment.internalName || segment.segmentType}`} className="harbor-timeline-handle harbor-timeline-handle--start" onPointerDown={(event) => beginResize(event, segment, "start")} /><button type="button" aria-label={`Drag end of ${segment.internalName || segment.segmentType}`} className="harbor-timeline-handle harbor-timeline-handle--end" onPointerDown={(event) => beginResize(event, segment, "end")} /></>}</div>)}</div></div>
      {readOnly || !features.addControls ? null : <div className={`harbor-timeline-add ${classNames.addControls ?? ""}`.trim()}>{allowedTypes.map((type) => <button type="button" key={type} onClick={() => add(type)} disabled={!mediaUrl}>+ {titleCase(type)}</button>)}</div>}
      {selected && features.inspector ? <div className={classNames.inspector}><SegmentInspector segment={selected} duration={duration} timeMs={timeMs} allowedTypes={allowedTypes} readOnly={readOnly} canPreview={Boolean(mediaUrl)} onPatch={(patch) => replace({ ...selected, ...patch })} onPreview={() => { previewEndMs.current = selected.endMs; seek(selected.startMs); void videoRef.current?.play(); }} onDelete={() => { onChange(segments.filter((segment) => segment.id !== selected.id)); setSelectedId(null); }} /></div> : null}
      {features.validation && warnings.length ? <div className="harbor-timeline-warning"><strong>{labels.overlapReview}</strong><span>{warnings.map((issue) => issue.message).join(" ")}</span></div> : null}
      {features.validation && errors.length ? <div className="harbor-timeline-errors" role="alert"><strong>{labels.resolveBeforeSaving}</strong>{errors.map((issue, index) => <span key={`${issue.segmentId}:${issue.field}:${index}`}>{issue.message}</span>)}</div> : null}
      {features.actions ? <footer className={classNames.footer}><p>{statusMessage || labels.idleStatus}</p>{readOnly ? null : <div>{onDiscard ? <button type="button" onClick={onDiscard} disabled={busy || !dirty}>{labels.discard}</button> : null}{onSave ? <button type="button" className="harbor-timeline-save" onClick={() => void onSave(segments)} disabled={busy || !dirty || errors.length > 0}>{busy ? labels.saving : labels.save}</button> : null}</div>}</footer> : null}
    </section>
  );
}

function SegmentInspector({ segment, duration, timeMs, allowedTypes, readOnly, canPreview, onPatch, onPreview, onDelete }: { segment: TimelineSegment; duration: number; timeMs: number; allowedTypes: TimelineSegmentType[]; readOnly: boolean; canPreview: boolean; onPatch: (patch: Partial<TimelineSegment>) => void; onPreview: () => void; onDelete: () => void }) {
  return <div className="harbor-timeline-inspector"><Field label="Type"><select value={segment.segmentType} disabled={readOnly} onChange={(event) => onPatch({ segmentType: event.target.value as TimelineSegmentType })}>{allowedTypes.map((type) => <option key={type} value={type}>{titleCase(type)}</option>)}</select></Field><Field label="Internal name"><input value={segment.internalName ?? ""} disabled={readOnly} onChange={(event) => onPatch({ internalName: event.target.value })} /></Field><TimeField label="Start" value={segment.startMs} max={segment.endMs - 1} readOnly={readOnly} set={(value) => onPatch({ startMs: value })} usePlayhead={() => onPatch({ startMs: Math.min(timeMs, segment.endMs - 1) })} /><TimeField label="End" value={segment.endMs} min={segment.startMs + 1} max={duration} readOnly={readOnly} set={(value) => onPatch({ endMs: value })} usePlayhead={() => onPatch({ endMs: Math.max(timeMs, segment.startMs + 1) })} /><Field label="Viewer button label"><input value={segment.viewerLabel ?? ""} disabled={readOnly || !segment.skippable || segment.segmentType !== "custom"} onChange={(event) => onPatch({ viewerLabel: event.target.value })} /></Field><label className="harbor-timeline-toggle"><span><strong>Skippable</strong><small>Show a contextual player action.</small></span><input type="checkbox" checked={segment.skippable} disabled={readOnly || segment.segmentType === "chapter"} onChange={(event) => onPatch({ skippable: event.target.checked })} /></label><div className="harbor-timeline-inspector-actions"><button type="button" onClick={onPreview} disabled={!canPreview}>Preview segment</button>{readOnly ? null : <button type="button" className="harbor-timeline-delete" onClick={onDelete}>Delete segment</button>}</div></div>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="harbor-timeline-field"><span>{label}</span>{children}</label>;
}

function TimeField({ label, value, min = 0, max, readOnly, set, usePlayhead }: { label: string; value: number; min?: number; max: number; readOnly: boolean; set: (value: number) => void; usePlayhead: () => void }) {
  return <Field label={label}><div><input type="number" min={min} max={max} step={10} value={value} disabled={readOnly} onChange={(event) => set(Math.max(min, Math.min(max, Number(event.target.value))))} /><button type="button" onClick={usePlayhead} disabled={readOnly} title="Set to playhead">◎</button></div><small>{formatMediaTime(value, true)}</small></Field>;
}

function titleCase(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}
