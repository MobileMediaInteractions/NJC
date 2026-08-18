"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Clock3, LoaderCircle, Pause, Play, Plus, Save, Scissors, Trash2, Undo2, ZoomIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { defaultSegmentLabel } from "@/lib/njc-plus-timeline";
import type { PremiumTimelineSegmentInput } from "@/lib/njc-plus-contract";

type Segment = PremiumTimelineSegmentInput & { id: string };
const colors = { intro: "bg-sky-500", recap: "bg-violet-500", credits: "bg-amber-500", custom: "bg-emerald-500" } as const;

export function NjcPlusTimelineEditor({ contentId, mediaUrl, durationMs, inheritedIntro }: {
  contentId: string;
  mediaUrl: string | null;
  durationMs: number | null;
  inheritedIntro?: { title: string; durationMs: number; blackGapMs: number } | null;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const previewEndMs = useRef<number | null>(null);
  const [segments, setSegments] = useState<Segment[]>([]);
  const [savedSegments, setSavedSegments] = useState<Segment[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [timeMs, setTimeMs] = useState(0);
  const [actualDurationMs, setActualDurationMs] = useState(durationMs ?? 0);
  const [playing, setPlaying] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [busy, setBusy] = useState(true);
  const [message, setMessage] = useState("");
  const selected = segments.find((segment) => segment.id === selectedId) ?? null;
  const duration = Math.max(actualDurationMs, 1);
  const overlaps = useMemo(() => segments.flatMap((segment, index) => segments.slice(index + 1).filter((candidate) => segment.startMs < candidate.endMs && candidate.startMs < segment.endMs).map((candidate) => `${segment.internalName || segment.segmentType} overlaps ${candidate.internalName || candidate.segmentType}`)), [segments]);
  const changed = useMemo(() => JSON.stringify(segments) !== JSON.stringify(savedSegments), [savedSegments, segments]);

  useEffect(() => {
    const controller = new AbortController();
    void fetch(`/api/v1/studio/njc-plus/content/${contentId}/timeline`, { signal: controller.signal, cache: "no-store" })
      .then((response) => response.json())
      .then((payload: { data?: Segment[] }) => { const records = payload.data ?? []; setSegments(records); setSavedSegments(records); })
      .catch((error) => { if (!(error instanceof DOMException && error.name === "AbortError")) setMessage("Timeline could not be loaded."); })
      .finally(() => setBusy(false));
    return () => controller.abort();
  }, [contentId]);

  function add(type: Segment["segmentType"]) {
    const startMs = Math.min(timeMs, Math.max(0, duration - 1_000));
    const endMs = Math.min(duration, startMs + Math.min(30_000, Math.max(1_000, duration - startMs)));
    const segment: Segment = { id: crypto.randomUUID(), segmentType: type, startMs, endMs, internalName: type === "custom" ? "Custom segment" : type[0]!.toUpperCase() + type.slice(1), viewerLabel: type === "credits" ? null : defaultSegmentLabel(type), skippable: type !== "credits", sortOrder: segments.length };
    setSegments((current) => [...current, segment]);
    setSelectedId(segment.id);
  }
  function patch<K extends keyof Segment>(key: K, value: Segment[K]) { setSegments((current) => current.map((segment) => segment.id === selectedId ? { ...segment, [key]: value } : segment)); }
  function seek(valueMs: number) { const next = Math.max(0, Math.min(duration, valueMs)); setTimeMs(next); if (videoRef.current) videoRef.current.currentTime = next / 1000; }
  function seekFromPointer(clientX: number) { const bounds = trackRef.current?.getBoundingClientRect(); if (bounds) seek(((clientX - bounds.left) / bounds.width) * duration); }
  function beginResize(event: React.PointerEvent, segment: Segment, edge: "start" | "end") {
    event.preventDefault(); event.stopPropagation(); setSelectedId(segment.id);
    const bounds = trackRef.current?.getBoundingClientRect();
    if (!bounds) return;
    const initialX = event.clientX;
    const initialValue = edge === "start" ? segment.startMs : segment.endMs;
    const move = (pointer: PointerEvent) => {
      const deltaMs = (pointer.clientX - initialX) / bounds.width * duration;
      setSegments((current) => current.map((item) => {
        if (item.id !== segment.id) return item;
        const value = Math.round((initialValue + deltaMs) / 10) * 10;
        return edge === "start"
          ? { ...item, startMs: Math.max(0, Math.min(item.endMs - 1, value)) }
          : { ...item, endMs: Math.max(item.startMs + 1, Math.min(duration, value)) };
      }));
    };
    const stop = () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", stop); };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", stop, { once: true });
  }
  async function save() {
    setBusy(true); setMessage("");
    const response = await fetch(`/api/v1/studio/njc-plus/content/${contentId}/timeline`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ segments }) });
    const payload = await response.json() as { data?: Segment[]; error?: { message?: string } };
    if (response.ok) { const records = payload.data ?? []; setSegments(records); setSavedSegments(records); setSelectedId(null); setMessage("Source timeline saved and playback offsets will be calculated automatically."); }
    else setMessage(payload.error?.message || "Timeline could not be saved.");
    setBusy(false);
  }

  return <Card><CardHeader><CardTitle className="flex items-center gap-2"><Scissors className="size-5" /> Playback timeline</CardTitle><CardDescription>Mark the source program only. Inherited platform media is composed before it automatically, so staff never calculate offsets.</CardDescription></CardHeader><CardContent className="space-y-5">
    {inheritedIntro ? <div className="rounded-lg border border-dashed bg-muted/25 p-4"><p className="text-xs font-black uppercase tracking-wider text-primary">Inherited presentation</p><div className="mt-2 flex flex-wrap gap-2 text-sm"><span className="rounded bg-sky-500/15 px-3 py-1 font-semibold">{inheritedIntro.title} · {formatTime(inheritedIntro.durationMs)}</span><span className="rounded bg-black px-3 py-1 text-white">Black / silence · {(inheritedIntro.blackGapMs / 1_000).toFixed(1)}s</span></div><p className="mt-2 text-xs text-muted-foreground">Read-only here. Manage the active ident in Platform intros.</p></div> : null}
    {mediaUrl ? <div className="overflow-hidden rounded-lg bg-black"><video ref={videoRef} src={mediaUrl} className="aspect-video w-full object-contain" preload="metadata" onLoadedMetadata={(event) => setActualDurationMs(Math.round(event.currentTarget.duration * 1_000))} onTimeUpdate={(event) => { const next = Math.round(event.currentTarget.currentTime * 1_000); setTimeMs(next); if (previewEndMs.current !== null && next >= previewEndMs.current) { previewEndMs.current = null; event.currentTarget.pause(); } }} onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} /><div className="flex items-center gap-3 border-t border-white/10 p-3 text-white"><Button type="button" size="icon" variant="secondary" onClick={() => { const video = videoRef.current; if (!video) return; previewEndMs.current = null; if (video.paused) void video.play(); else video.pause(); }}>{playing ? <Pause /> : <Play />}</Button><span className="font-mono text-sm">{formatTime(timeMs)} / {formatTime(duration)}</span><input aria-label="Timeline playhead" className="flex-1 accent-white" type="range" min={0} max={duration} step={10} value={Math.min(timeMs, duration)} onChange={(event) => seek(Number(event.target.value))} /></div></div> : <div className="grid min-h-40 place-items-center rounded-lg border border-dashed text-sm text-muted-foreground">Attach a video asset to unlock scrubbing and segment preview.</div>}
    <div className="space-y-2"><div className="flex flex-wrap items-center justify-between gap-3"><p className="text-sm font-semibold">Source timeline</p><label className="flex items-center gap-2 text-xs text-muted-foreground"><ZoomIn className="size-4" /> Zoom <input aria-label="Timeline zoom" type="range" min={1} max={8} step={1} value={zoom} onChange={(event) => setZoom(Number(event.target.value))} /><span className="w-6 font-mono">{zoom}×</span></label><span className="font-mono text-xs text-muted-foreground">{formatTime(duration)}</span></div><div className="overflow-x-auto rounded-lg border"><div ref={trackRef} className="relative h-24 cursor-crosshair bg-muted/30" style={{ width: `${zoom * 100}%` }} onPointerDown={(event) => seekFromPointer(event.clientX)}><span className="pointer-events-none absolute inset-y-0 z-20 w-px bg-foreground" style={{ left: `${Math.min(100, timeMs / duration * 100)}%` }} />{segments.map((segment) => <div key={segment.id} className={cn("absolute top-5 h-12 min-w-1 rounded shadow", colors[segment.segmentType], selectedId === segment.id && "ring-2 ring-white ring-offset-2")} style={{ left: `${segment.startMs / duration * 100}%`, width: `${Math.max(.4, (segment.endMs - segment.startMs) / duration * 100)}%` }}><button type="button" className="h-full w-full overflow-hidden px-3 text-left text-[.65rem] font-bold text-white" onPointerDown={(event) => event.stopPropagation()} onClick={() => setSelectedId(segment.id)}>{segment.internalName || segment.segmentType}</button><button type="button" aria-label={`Drag start of ${segment.internalName || segment.segmentType}`} className="absolute inset-y-0 -left-1.5 w-3 cursor-ew-resize rounded bg-white/90 shadow" onPointerDown={(event) => beginResize(event, segment, "start")} /><button type="button" aria-label={`Drag end of ${segment.internalName || segment.segmentType}`} className="absolute inset-y-0 -right-1.5 w-3 cursor-ew-resize rounded bg-white/90 shadow" onPointerDown={(event) => beginResize(event, segment, "end")} /></div>)}</div></div></div>
    <div className="flex flex-wrap gap-2">{(["intro", "recap", "credits", "custom"] as const).map((type) => <Button type="button" key={type} variant="outline" onClick={() => add(type)} disabled={!mediaUrl}><Plus /> {type[0]!.toUpperCase() + type.slice(1)}</Button>)}</div>
    {selected ? <div className="grid gap-4 rounded-lg border p-4 md:grid-cols-2"><Field label="Type"><Select value={selected.segmentType} onValueChange={(value) => patch("segmentType", value as Segment["segmentType"])}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{(["intro", "recap", "credits", "custom"] as const).map((type) => <SelectItem key={type} value={type} className="capitalize">{type}</SelectItem>)}</SelectContent></Select></Field><Field label="Internal name"><Input value={selected.internalName ?? ""} onChange={(event) => patch("internalName", event.target.value)} /></Field><TimeField label="Start" value={selected.startMs} max={selected.endMs - 1} set={(value) => patch("startMs", value)} usePlayhead={() => patch("startMs", Math.min(timeMs, selected.endMs - 1))} /><TimeField label="End" value={selected.endMs} min={selected.startMs + 1} max={duration} set={(value) => patch("endMs", value)} usePlayhead={() => patch("endMs", Math.max(timeMs, selected.startMs + 1))} /><Field label="Viewer button label"><Input value={selected.viewerLabel ?? ""} disabled={!selected.skippable || selected.segmentType !== "custom"} onChange={(event) => patch("viewerLabel", event.target.value)} /></Field><Label className="flex items-center justify-between rounded-md border p-3"><span><strong className="block">Skippable</strong><small className="text-muted-foreground">Show a contextual player action.</small></span><Switch checked={selected.skippable} onCheckedChange={(value) => patch("skippable", value)} /></Label><div className="flex gap-2 md:col-span-2"><Button type="button" variant="outline" onClick={() => { previewEndMs.current = selected.endMs; seek(selected.startMs); void videoRef.current?.play(); }}><Play /> Preview segment</Button><Button type="button" variant="ghost" className="text-destructive" onClick={() => { setSegments((current) => current.filter((segment) => segment.id !== selected.id)); setSelectedId(null); }}><Trash2 /> Delete segment</Button></div></div> : null}
    {overlaps.length ? <div className="rounded-md bg-amber-500/10 p-3 text-xs text-amber-900 dark:text-amber-200"><strong>Overlap review:</strong> {overlaps.join("; ")}. Overlaps are allowed because some editorial markers may legitimately coexist.</div> : null}
    <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-xs text-muted-foreground">{segments.length} segment{segments.length === 1 ? "" : "s"} · millisecond precision</p><div className="flex gap-2"><Button type="button" variant="outline" onClick={() => { setSegments(savedSegments); setSelectedId(null); }} disabled={busy || !changed}><Undo2 /> Discard changes</Button><Button type="button" onClick={() => void save()} disabled={busy || !changed}>{busy ? <LoaderCircle className="animate-spin" /> : <Save />} Save timeline</Button></div></div>{message ? <p role="status" className="rounded-md border p-3 text-sm">{message}</p> : null}
  </CardContent></Card>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <Label className="space-y-2"><span>{label}</span>{children}</Label>; }
function TimeField({ label, value, min = 0, max, set, usePlayhead }: { label: string; value: number; min?: number; max: number; set: (value: number) => void; usePlayhead: () => void }) { return <Field label={label}><div className="flex gap-2"><Input type="number" min={min} max={max} step={10} value={value} onChange={(event) => set(Math.max(min, Math.min(max, Number(event.target.value))))} className="font-mono" /><Button type="button" variant="outline" onClick={usePlayhead} title="Set to playhead"><Clock3 /></Button></div><span className="text-xs font-normal text-muted-foreground">{formatTime(value)}</span></Field>; }
function formatTime(value: number) { const ms = Math.max(0, Math.round(value)); const seconds = Math.floor(ms / 1_000); const remainder = String(ms % 1_000).padStart(3, "0"); const minutes = Math.floor(seconds / 60); return `${Math.floor(minutes / 60) ? `${Math.floor(minutes / 60)}:` : ""}${String(minutes % 60).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}.${remainder}`; }
