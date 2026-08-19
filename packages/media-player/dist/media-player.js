"use client";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useRef, useState } from "react";
import { activeTimelineSegment, composePlaybackTimeline, formatMediaTime } from "./timeline.js";
const defaultLabels = {
    back: "Back 10 seconds", forward: "Forward 10 seconds", play: "Play", pause: "Pause", mute: "Mute", unmute: "Unmute", speed: "Playback speed", captions: "Captions", chapters: "Chapters", pictureInPicture: "Picture in picture", fullscreen: "Fullscreen", loading: "Loading player", originalAudio: "Original audio", privatePreview: "Private preview", closeChapters: "Close chapters", playbackPosition: "Playback position", skipSegment: "Skip segment", transitionToProgram: "Brief transition to program", chapterFallback: "Chapter",
};
const defaultFeatures = {
    platformIntro: true, skipSegments: true, scrubber: true, seekBackward: true, playPause: true, seekForward: true, time: true, volume: true, playbackSpeed: true, chapters: true, captions: true, pictureInPicture: true, fullscreen: true, previewNotice: true, audioBranding: true, progressPersistence: true,
};
const defaultControlOrder = ["seek-backward", "play-pause", "seek-forward", "time", "volume", "speed", "chapters", "captions", "picture-in-picture", "fullscreen"];
export function MediaPlayer({ contentId, kind, src, title, poster, captionsUrl, captionTracks, initialPositionMs = 0, timelineSegments = [], platformIntro = null, previewNotice = null, branding, labels: suppliedLabels, features: suppliedFeatures, controlOrder = defaultControlOrder, playbackRates = [1, 1.25, 1.5, 1.75, 2], seekStepSeconds = 10, classNames = {}, slots = {}, controlsAriaLabel = "Media controls", ariaLabel, preload = "metadata", crossOrigin, persistIntervalMs = 10_000, dataAdapter, onProgress, onEvent, className = "", style }) {
    const features = { ...defaultFeatures, ...suppliedFeatures };
    const labels = { ...defaultLabels, ...suppliedLabels };
    const effectiveIntro = features.platformIntro ? platformIntro : null;
    const progressCallback = onProgress ?? dataAdapter?.saveProgress;
    const mediaRef = useRef(null);
    const progressTimer = useRef(null);
    const gapTimer = useRef(null);
    const pendingSeekMs = useRef(null);
    const resumePlayback = useRef(false);
    const callbackRef = useRef({ contentId, progressCallback, onEvent });
    const [phase, setPhase] = useState(() => effectiveIntro && initialPositionMs === 0 ? "intro" : "program");
    const phaseRef = useRef(phase);
    const [playing, setPlaying] = useState(false);
    const [ready, setReady] = useState(false);
    const [muted, setMuted] = useState(false);
    const [time, setTime] = useState(initialPositionMs / 1_000);
    const [duration, setDuration] = useState(0);
    const [speed, setSpeed] = useState(playbackRates[0] ?? 1);
    const [captions, setCaptions] = useState(false);
    const [chaptersOpen, setChaptersOpen] = useState(false);
    const tracks = captionTracks?.length ? captionTracks : captionsUrl ? [{ src: captionsUrl, srcLang: "en", label: "English" }] : [];
    const presentation = useMemo(() => composePlaybackTimeline({ contentSegments: timelineSegments, platformIntro: effectiveIntro }), [effectiveIntro, timelineSegments]);
    const chapters = useMemo(() => presentation.filter((segment) => segment.source === "content" && segment.segmentType === "chapter"), [presentation]);
    const offsetMs = effectiveIntro ? effectiveIntro.durationMs + effectiveIntro.blackGapMs : 0;
    const playbackTimeMs = phase === "intro" ? time * 1_000 : phase === "gap" ? effectiveIntro?.durationMs ?? 0 : offsetMs + time * 1_000;
    const activeSegment = activeTimelineSegment(presentation, playbackTimeMs);
    const mediaSrc = phase === "intro" && effectiveIntro ? effectiveIntro.src : src;
    const slotContext = { title, phase, playing };
    callbackRef.current = { contentId, progressCallback, onEvent };
    phaseRef.current = phase;
    function emitProgress(reason) {
        const media = mediaRef.current;
        const callback = callbackRef.current.progressCallback;
        if (!features.progressPersistence || !media || phaseRef.current !== "program" || !callback || !Number.isFinite(media.duration))
            return;
        void Promise.resolve(callback({ contentId: callbackRef.current.contentId, positionMs: Math.round(media.currentTime * 1_000), durationMs: Math.round(media.duration * 1_000), completed: media.currentTime / media.duration > 0.95, reason })).catch(() => undefined);
    }
    useEffect(() => () => {
        if (progressTimer.current)
            clearTimeout(progressTimer.current);
        if (gapTimer.current)
            clearTimeout(gapTimer.current);
        emitProgress("unmount");
    }, []);
    function changePhase(next) { phaseRef.current = next; setPhase(next); callbackRef.current.onEvent?.({ type: "phase_change", phase: next }); }
    function startProgram(positionMs = 0, autoplay = true) { if (gapTimer.current)
        clearTimeout(gapTimer.current); pendingSeekMs.current = positionMs; resumePlayback.current = autoplay; changePhase("program"); setReady(false); setTime(positionMs / 1_000); }
    function finishIntro() { if (!effectiveIntro || effectiveIntro.blackGapMs === 0)
        return startProgram(0, true); changePhase("gap"); setPlaying(false); gapTimer.current = setTimeout(() => startProgram(0, true), effectiveIntro.blackGapMs); }
    function scheduleProgress() { if (progressTimer.current || !features.progressPersistence || !progressCallback)
        return; progressTimer.current = setTimeout(() => { progressTimer.current = null; emitProgress("interval"); }, persistIntervalMs); }
    function togglePlay() { const media = mediaRef.current; if (!media)
        return; if (media.paused)
        void media.play();
    else
        media.pause(); }
    function seek(delta) { const media = mediaRef.current; if (!media)
        return; media.currentTime = Math.max(0, Math.min(media.duration || 0, media.currentTime + delta)); }
    function seekPresentation(nextMs) { if (effectiveIntro && nextMs < effectiveIntro.durationMs) {
        pendingSeekMs.current = nextMs;
        resumePlayback.current = playing;
        changePhase("intro");
        setReady(false);
        return;
    } startProgram(Math.max(0, nextMs - offsetMs), playing); }
    function skipActiveSegment() { if (!activeSegment)
        return; if (activeSegment.source === "platform")
        startProgram(0, true);
    else {
        const media = mediaRef.current;
        if (media)
            media.currentTime = activeSegment.endMs / 1_000;
        setTime(activeSegment.endMs / 1_000);
    } callbackRef.current.onEvent?.({ type: "segment_skipped", segment: activeSegment }); }
    function selectChapter(segment) { startProgram(segment.startMs, playing); setChaptersOpen(false); callbackRef.current.onEvent?.({ type: "chapter_selected", segment }); }
    function selectSpeed() { const choices = playbackRates.length ? playbackRates : [1]; const next = choices[(choices.indexOf(speed) + 1) % choices.length] ?? choices[0] ?? 1; if (mediaRef.current)
        mediaRef.current.playbackRate = next; setSpeed(next); }
    function toggleCaptions() { const media = mediaRef.current; if (!media?.textTracks[0])
        return; const next = !captions; for (const track of media.textTracks)
        track.mode = next && track === media.textTracks[0] ? "showing" : "hidden"; setCaptions(next); }
    async function fullscreen() { const media = mediaRef.current; if (!media)
        return; if (document.fullscreenElement)
        await document.exitFullscreen();
    else
        await media.parentElement?.requestFullscreen(); }
    async function pictureInPicture() { const video = mediaRef.current; if (!(video instanceof HTMLVideoElement) || !document.pictureInPictureEnabled)
        return; if (document.pictureInPictureElement)
        await document.exitPictureInPicture();
    else
        await video.requestPictureInPicture(); }
    const mediaProps = {
        src: mediaSrc, preload, crossOrigin,
        onLoadedMetadata: (event) => { const media = event.currentTarget; if (phase === "program")
            setDuration(media.duration); const requested = pendingSeekMs.current ?? (phase === "program" ? initialPositionMs : 0); if (requested > 0 && requested / 1_000 < media.duration)
            media.currentTime = requested / 1_000; media.playbackRate = speed; pendingSeekMs.current = null; setReady(true); if (resumePlayback.current) {
            resumePlayback.current = false;
            void media.play();
        } },
        onTimeUpdate: (event) => { setTime(event.currentTarget.currentTime); scheduleProgress(); },
        onPlay: () => setPlaying(true),
        onPause: () => { setPlaying(false); emitProgress("pause"); },
        onEnded: () => { if (phase === "intro")
            finishIntro();
        else {
            setPlaying(false);
            emitProgress("ended");
        } },
        onError: (event) => { callbackRef.current.onEvent?.({ type: "media_error", phase: phase === "intro" ? "intro" : "program", code: event.currentTarget.error?.code }); if (phase === "intro")
            startProgram(0, false); },
        onVolumeChange: (event) => setMuted(event.currentTarget.muted || event.currentTarget.volume === 0),
    };
    function customControl(id, label, glyph, onPress, active = false, primary = false, text = false) {
        const defaultControl = _jsx(Control, { label: label, glyph: glyph, onClick: onPress, active: active, primary: primary, text: text });
        return _jsx("span", { className: `harbor-media-control-slot harbor-media-control-slot--${id}`, children: slots.control?.({ id, label, active, onPress, defaultControl }) ?? defaultControl }, id);
    }
    function renderControl(id) {
        if (id === "seek-backward")
            return features.seekBackward ? customControl(id, labels.back.replace("10", String(seekStepSeconds)), "↶", () => seek(-seekStepSeconds)) : null;
        if (id === "play-pause")
            return features.playPause ? customControl(id, playing ? labels.pause : labels.play, playing ? "Ⅱ" : "▶", togglePlay, false, true) : null;
        if (id === "seek-forward")
            return features.seekForward ? customControl(id, labels.forward.replace("10", String(seekStepSeconds)), "↷", () => seek(seekStepSeconds)) : null;
        if (id === "time")
            return features.time ? _jsxs("span", { className: `harbor-media-time ${classNames.time ?? ""}`.trim(), children: [formatMediaTime(playbackTimeMs), " / ", formatMediaTime(duration * 1_000 + offsetMs)] }, id) : null;
        if (id === "volume")
            return features.volume ? customControl(id, muted ? labels.unmute : labels.mute, muted ? "⌁" : "◖", () => { if (mediaRef.current)
                mediaRef.current.muted = !mediaRef.current.muted; }) : null;
        if (id === "speed")
            return features.playbackSpeed ? customControl(id, `${labels.speed} ${speed} times`, `${speed}×`, selectSpeed, false, false, true) : null;
        if (id === "chapters")
            return features.chapters && chapters.length ? customControl(id, labels.chapters, "☷", () => setChaptersOpen((value) => !value), chaptersOpen) : null;
        if (id === "captions")
            return features.captions && tracks.length ? customControl(id, labels.captions, "CC", toggleCaptions, captions, false, true) : null;
        if (id === "picture-in-picture")
            return features.pictureInPicture && kind === "video" ? customControl(id, labels.pictureInPicture, "▣", () => void pictureInPicture()) : null;
        if (id === "fullscreen")
            return features.fullscreen && kind === "video" ? customControl(id, labels.fullscreen, "⛶", () => void fullscreen()) : null;
        return null;
    }
    return (_jsxs("section", { className: `harbor-media-player ${kind === "audio" ? "harbor-media-player--audio" : ""} ${classNames.root ?? ""} ${className}`.trim(), "aria-label": ariaLabel ?? `${title} ${kind} player`, style: style, children: [kind === "video" ? _jsx("video", { className: classNames.media, ref: mediaRef, poster: poster ?? undefined, playsInline: true, ...mediaProps, children: phase === "program" ? tracks.map((track) => _jsx("track", { kind: "captions", src: track.src, srcLang: track.srcLang, label: track.label, default: track.default }, `${track.srcLang}:${track.src}`)) : null }) : _jsx("audio", { className: classNames.media, ref: mediaRef, ...mediaProps }), phase === "gap" ? _jsx("div", { className: `harbor-media-gap ${classNames.gap ?? ""}`.trim(), "aria-label": labels.transitionToProgram }) : null, previewNotice && features.previewNotice ? slots.previewNotice?.({ ...slotContext, notice: previewNotice }) ?? _jsxs("div", { className: `harbor-media-notice ${classNames.notice ?? ""}`.trim(), children: [_jsx("strong", { children: previewNotice.title || labels.privatePreview }), _jsx("span", { children: previewNotice.body })] }) : null, activeSegment && features.skipSegments ? slots.skipButton?.({ ...slotContext, segment: activeSegment, onSkip: skipActiveSegment }) ?? _jsxs("button", { type: "button", className: `harbor-media-skip ${classNames.skip ?? ""}`.trim(), onClick: skipActiveSegment, children: [_jsx(Glyph, { value: "\u226B" }), " ", activeSegment.viewerLabel || labels.skipSegment] }) : null, !ready && phase !== "gap" ? slots.loading?.(slotContext) ?? _jsxs("div", { className: `harbor-media-loading ${classNames.loading ?? ""}`.trim(), children: [_jsx("span", { className: "harbor-media-spinner" }), " ", labels.loading] }) : null, kind === "audio" && features.audioBranding ? slots.audioIdentity?.({ ...slotContext, branding }) ?? _jsxs("div", { className: `harbor-media-audio-identity ${classNames.audioIdentity ?? ""}`.trim(), children: [branding?.mark, _jsx("span", { children: branding?.title }), _jsx("strong", { children: title }), _jsx("small", { children: branding?.subtitle || labels.originalAudio })] }) : null, chaptersOpen && features.chapters ? _jsxs("div", { className: `harbor-media-chapters ${classNames.chapters ?? ""}`.trim(), role: "dialog", "aria-label": labels.chapters, children: [_jsxs("div", { children: [_jsx("strong", { children: labels.chapters }), _jsx("button", { type: "button", onClick: () => setChaptersOpen(false), "aria-label": labels.closeChapters, children: "\u00D7" })] }), chapters.map((chapter) => _jsxs("button", { type: "button", onClick: () => selectChapter(chapter), children: [_jsx("span", { children: formatMediaTime(chapter.playbackStartMs) }), chapter.viewerLabel || chapter.internalName || labels.chapterFallback] }, chapter.id))] }) : null, _jsxs("div", { className: `harbor-media-controls ${classNames.controls ?? ""}`.trim(), "aria-label": controlsAriaLabel, children: [slots.beforeControls, features.scrubber ? _jsxs("label", { className: `harbor-media-scrubber ${classNames.scrubber ?? ""}`.trim(), children: [_jsx("span", { className: "harbor-media-sr-only", children: labels.playbackPosition }), _jsx("input", { type: "range", min: 0, max: Math.max(duration + offsetMs / 1_000, 1), step: 0.1, value: Math.min(playbackTimeMs / 1_000, duration + offsetMs / 1_000 || 0), onChange: (event) => seekPresentation(Number(event.target.value) * 1_000) })] }) : null, _jsx("div", { className: classNames.controlRow, children: controlOrder.map(renderControl) }), slots.afterControls] })] }));
}
function Control({ label, glyph, onClick, primary = false, active = false, text = false }) {
    return _jsx("button", { type: "button", className: `${primary ? "harbor-media-control--primary" : ""} ${active ? "is-active" : ""}`.trim(), onClick: onClick, "aria-label": label, "aria-pressed": active || undefined, children: _jsx(Glyph, { value: glyph, text: text }) });
}
function Glyph({ value, text = false }) { return _jsx("span", { className: text ? "harbor-media-glyph harbor-media-glyph--text" : "harbor-media-glyph", "aria-hidden": "true", children: value }); }
//# sourceMappingURL=media-player.js.map