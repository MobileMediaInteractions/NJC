"use client";
import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useMemo, useRef, useState } from "react";
import { defaultSegmentLabel, formatMediaTime, validateTimeline } from "./timeline.js";
const defaultTypes = ["intro", "recap", "chapter", "credits", "custom"];
export function TimelineEditor({ segments, mediaUrl, durationMs, inheritedIntro, allowedTypes = defaultTypes, onChange, onSave, onDiscard, dirty = true, busy = false, statusMessage, readOnly = false, className = "" }) {
    const videoRef = useRef(null);
    const trackRef = useRef(null);
    const previewEndMs = useRef(null);
    const [selectedId, setSelectedId] = useState(null);
    const [timeMs, setTimeMs] = useState(0);
    const [measuredDurationMs, setMeasuredDurationMs] = useState(durationMs ?? 0);
    const [playing, setPlaying] = useState(false);
    const [zoom, setZoom] = useState(1);
    const selected = segments.find((segment) => segment.id === selectedId) ?? null;
    const duration = Math.max(measuredDurationMs || durationMs || 0, 1);
    const issues = useMemo(() => validateTimeline(segments, duration), [duration, segments]);
    const errors = issues.filter((issue) => issue.severity === "error");
    const warnings = issues.filter((issue) => issue.severity === "warning");
    function replace(next) {
        onChange(segments.map((segment) => segment.id === next.id ? next : segment));
    }
    function add(type) {
        const startMs = Math.min(timeMs, Math.max(0, duration - 1_000));
        const endMs = Math.min(duration, startMs + Math.min(30_000, Math.max(1_000, duration - startMs)));
        const next = {
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
    function seek(valueMs) {
        const next = Math.max(0, Math.min(duration, valueMs));
        setTimeMs(next);
        if (videoRef.current)
            videoRef.current.currentTime = next / 1_000;
    }
    function seekFromPointer(clientX) {
        const bounds = trackRef.current?.getBoundingClientRect();
        if (bounds)
            seek(((clientX - bounds.left) / bounds.width) * duration);
    }
    function beginResize(event, segment, edge) {
        if (readOnly)
            return;
        event.preventDefault();
        event.stopPropagation();
        setSelectedId(segment.id);
        const bounds = trackRef.current?.getBoundingClientRect();
        if (!bounds)
            return;
        const initialX = event.clientX;
        const initialValue = edge === "start" ? segment.startMs : segment.endMs;
        const move = (pointer) => {
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
    return (_jsxs("section", { className: `harbor-timeline-editor ${className}`.trim(), children: [_jsxs("header", { children: [_jsxs("div", { children: [_jsx("p", { children: "Playback composition" }), _jsx("h2", { children: "Source timeline" }), _jsx("span", { children: "Mark the program itself. Inherited presentation media is offset automatically." })] }), _jsxs("strong", { children: [segments.length, " segment", segments.length === 1 ? "" : "s"] })] }), inheritedIntro ? _jsxs("div", { className: "harbor-timeline-inherited", children: [_jsx("p", { children: "Inherited presentation" }), _jsxs("span", { children: [inheritedIntro.title, " \u00B7 ", formatMediaTime(inheritedIntro.durationMs)] }), _jsxs("span", { children: ["Black / silence \u00B7 ", (inheritedIntro.blackGapMs / 1_000).toFixed(1), "s"] }), _jsx("small", { children: "Read-only here. The host application owns the active platform ident." })] }) : null, mediaUrl ? _jsxs("div", { className: "harbor-timeline-preview", children: [_jsx("video", { ref: videoRef, src: mediaUrl, preload: "metadata", onLoadedMetadata: (event) => setMeasuredDurationMs(Math.round(event.currentTarget.duration * 1_000)), onTimeUpdate: (event) => { const next = Math.round(event.currentTarget.currentTime * 1_000); setTimeMs(next); if (previewEndMs.current !== null && next >= previewEndMs.current) {
                            previewEndMs.current = null;
                            event.currentTarget.pause();
                        } }, onPlay: () => setPlaying(true), onPause: () => setPlaying(false) }), _jsxs("div", { children: [_jsx("button", { type: "button", onClick: () => { const video = videoRef.current; if (!video)
                                    return; previewEndMs.current = null; if (video.paused)
                                    void video.play();
                                else
                                    video.pause(); }, "aria-label": playing ? "Pause preview" : "Play preview", children: playing ? "Ⅱ" : "▶" }), _jsxs("span", { children: [formatMediaTime(timeMs, true), " / ", formatMediaTime(duration, true)] }), _jsx("input", { "aria-label": "Timeline playhead", type: "range", min: 0, max: duration, step: 10, value: Math.min(timeMs, duration), onChange: (event) => seek(Number(event.target.value)) })] })] }) : _jsx("div", { className: "harbor-timeline-empty", children: "Attach a video source to unlock scrubbing and segment preview." }), _jsxs("div", { className: "harbor-timeline-track-heading", children: [_jsx("strong", { children: "Source timeline" }), _jsxs("label", { children: ["Zoom ", _jsx("input", { "aria-label": "Timeline zoom", type: "range", min: 1, max: 8, step: 1, value: zoom, onChange: (event) => setZoom(Number(event.target.value)) }), _jsxs("span", { children: [zoom, "\u00D7"] })] }), _jsx("time", { children: formatMediaTime(duration, true) })] }), _jsx("div", { className: "harbor-timeline-track-scroll", children: _jsxs("div", { ref: trackRef, className: "harbor-timeline-track", style: { width: `${zoom * 100}%` }, onPointerDown: (event) => seekFromPointer(event.clientX), children: [_jsx("span", { className: "harbor-timeline-playhead", style: { left: `${Math.min(100, timeMs / duration * 100)}%` } }), segments.map((segment) => _jsxs("div", { className: `harbor-timeline-segment harbor-timeline-segment--${segment.segmentType} ${selectedId === segment.id ? "is-selected" : ""}`, style: { left: `${segment.startMs / duration * 100}%`, width: `${Math.max(0.4, (segment.endMs - segment.startMs) / duration * 100)}%` }, children: [_jsx("button", { type: "button", onPointerDown: (event) => event.stopPropagation(), onClick: () => setSelectedId(segment.id), children: segment.internalName || titleCase(segment.segmentType) }), readOnly ? null : _jsxs(_Fragment, { children: [_jsx("button", { type: "button", "aria-label": `Drag start of ${segment.internalName || segment.segmentType}`, className: "harbor-timeline-handle harbor-timeline-handle--start", onPointerDown: (event) => beginResize(event, segment, "start") }), _jsx("button", { type: "button", "aria-label": `Drag end of ${segment.internalName || segment.segmentType}`, className: "harbor-timeline-handle harbor-timeline-handle--end", onPointerDown: (event) => beginResize(event, segment, "end") })] })] }, segment.id))] }) }), readOnly ? null : _jsx("div", { className: "harbor-timeline-add", children: allowedTypes.map((type) => _jsxs("button", { type: "button", onClick: () => add(type), disabled: !mediaUrl, children: ["+ ", titleCase(type)] }, type)) }), selected ? _jsx(SegmentInspector, { segment: selected, duration: duration, timeMs: timeMs, allowedTypes: allowedTypes, readOnly: readOnly, canPreview: Boolean(mediaUrl), onPatch: (patch) => replace({ ...selected, ...patch }), onPreview: () => { previewEndMs.current = selected.endMs; seek(selected.startMs); void videoRef.current?.play(); }, onDelete: () => { onChange(segments.filter((segment) => segment.id !== selected.id)); setSelectedId(null); } }) : null, warnings.length ? _jsxs("div", { className: "harbor-timeline-warning", children: [_jsx("strong", { children: "Overlap review" }), _jsx("span", { children: warnings.map((issue) => issue.message).join(" ") })] }) : null, errors.length ? _jsxs("div", { className: "harbor-timeline-errors", role: "alert", children: [_jsx("strong", { children: "Resolve before saving" }), errors.map((issue, index) => _jsx("span", { children: issue.message }, `${issue.segmentId}:${issue.field}:${index}`))] }) : null, _jsxs("footer", { children: [_jsx("p", { children: statusMessage || "Millisecond precision · host-controlled persistence" }), readOnly ? null : _jsxs("div", { children: [onDiscard ? _jsx("button", { type: "button", onClick: onDiscard, disabled: busy || !dirty, children: "Discard changes" }) : null, onSave ? _jsx("button", { type: "button", className: "harbor-timeline-save", onClick: () => void onSave(segments), disabled: busy || !dirty || errors.length > 0, children: busy ? "Saving…" : "Save timeline" }) : null] })] })] }));
}
function SegmentInspector({ segment, duration, timeMs, allowedTypes, readOnly, canPreview, onPatch, onPreview, onDelete }) {
    return _jsxs("div", { className: "harbor-timeline-inspector", children: [_jsx(Field, { label: "Type", children: _jsx("select", { value: segment.segmentType, disabled: readOnly, onChange: (event) => onPatch({ segmentType: event.target.value }), children: allowedTypes.map((type) => _jsx("option", { value: type, children: titleCase(type) }, type)) }) }), _jsx(Field, { label: "Internal name", children: _jsx("input", { value: segment.internalName ?? "", disabled: readOnly, onChange: (event) => onPatch({ internalName: event.target.value }) }) }), _jsx(TimeField, { label: "Start", value: segment.startMs, max: segment.endMs - 1, readOnly: readOnly, set: (value) => onPatch({ startMs: value }), usePlayhead: () => onPatch({ startMs: Math.min(timeMs, segment.endMs - 1) }) }), _jsx(TimeField, { label: "End", value: segment.endMs, min: segment.startMs + 1, max: duration, readOnly: readOnly, set: (value) => onPatch({ endMs: value }), usePlayhead: () => onPatch({ endMs: Math.max(timeMs, segment.startMs + 1) }) }), _jsx(Field, { label: "Viewer button label", children: _jsx("input", { value: segment.viewerLabel ?? "", disabled: readOnly || !segment.skippable || segment.segmentType !== "custom", onChange: (event) => onPatch({ viewerLabel: event.target.value }) }) }), _jsxs("label", { className: "harbor-timeline-toggle", children: [_jsxs("span", { children: [_jsx("strong", { children: "Skippable" }), _jsx("small", { children: "Show a contextual player action." })] }), _jsx("input", { type: "checkbox", checked: segment.skippable, disabled: readOnly || segment.segmentType === "chapter", onChange: (event) => onPatch({ skippable: event.target.checked }) })] }), _jsxs("div", { className: "harbor-timeline-inspector-actions", children: [_jsx("button", { type: "button", onClick: onPreview, disabled: !canPreview, children: "Preview segment" }), readOnly ? null : _jsx("button", { type: "button", className: "harbor-timeline-delete", onClick: onDelete, children: "Delete segment" })] })] });
}
function Field({ label, children }) {
    return _jsxs("label", { className: "harbor-timeline-field", children: [_jsx("span", { children: label }), children] });
}
function TimeField({ label, value, min = 0, max, readOnly, set, usePlayhead }) {
    return _jsxs(Field, { label: label, children: [_jsxs("div", { children: [_jsx("input", { type: "number", min: min, max: max, step: 10, value: value, disabled: readOnly, onChange: (event) => set(Math.max(min, Math.min(max, Number(event.target.value)))) }), _jsx("button", { type: "button", onClick: usePlayhead, disabled: readOnly, title: "Set to playhead", children: "\u25CE" })] }), _jsx("small", { children: formatMediaTime(value, true) })] });
}
function titleCase(value) {
    return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}
//# sourceMappingURL=timeline-editor.js.map