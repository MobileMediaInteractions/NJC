"use client";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useRef, useState } from "react";
import { activeTimelineSegment, composePlaybackTimeline, formatMediaTime } from "./timeline.js";
const defaultLabels = {
    back: "Back 10 seconds",
    forward: "Forward 10 seconds",
    play: "Play",
    pause: "Pause",
    mute: "Mute",
    unmute: "Unmute",
    speed: "Playback speed",
    captions: "Captions",
    chapters: "Chapters",
    pictureInPicture: "Picture in picture",
    fullscreen: "Fullscreen",
    loading: "Loading player",
    originalAudio: "Original audio",
    privatePreview: "Private preview",
};
export function MediaPlayer({ contentId, kind, src, title, poster, captionsUrl, initialPositionMs = 0, timelineSegments = [], platformIntro = null, previewNotice = null, branding, labels: suppliedLabels, persistIntervalMs = 10_000, onProgress, onEvent, className = "", style, }) {
    const mediaRef = useRef(null);
    const progressTimer = useRef(null);
    const gapTimer = useRef(null);
    const pendingSeekMs = useRef(null);
    const resumePlayback = useRef(false);
    const callbackRef = useRef({ contentId, onProgress, onEvent });
    const [phase, setPhase] = useState(() => platformIntro && initialPositionMs === 0 ? "intro" : "program");
    const phaseRef = useRef(phase);
    const [playing, setPlaying] = useState(false);
    const [ready, setReady] = useState(false);
    const [muted, setMuted] = useState(false);
    const [time, setTime] = useState(initialPositionMs / 1_000);
    const [duration, setDuration] = useState(0);
    const [speed, setSpeed] = useState(1);
    const [captions, setCaptions] = useState(false);
    const [chaptersOpen, setChaptersOpen] = useState(false);
    const labels = { ...defaultLabels, ...suppliedLabels };
    const presentation = useMemo(() => composePlaybackTimeline({ contentSegments: timelineSegments, platformIntro }), [platformIntro, timelineSegments]);
    const chapters = useMemo(() => presentation.filter((segment) => segment.source === "content" && segment.segmentType === "chapter"), [presentation]);
    const offsetMs = platformIntro ? platformIntro.durationMs + platformIntro.blackGapMs : 0;
    const playbackTimeMs = phase === "intro" ? time * 1_000 : phase === "gap" ? platformIntro?.durationMs ?? 0 : offsetMs + time * 1_000;
    const activeSegment = activeTimelineSegment(presentation, playbackTimeMs);
    const mediaSrc = phase === "intro" && platformIntro ? platformIntro.src : src;
    callbackRef.current = { contentId, onProgress, onEvent };
    phaseRef.current = phase;
    function emitProgress(reason) {
        const media = mediaRef.current;
        const callback = callbackRef.current.onProgress;
        if (!media || phaseRef.current !== "program" || !callback || !Number.isFinite(media.duration))
            return;
        void Promise.resolve(callback({
            contentId: callbackRef.current.contentId,
            positionMs: Math.round(media.currentTime * 1_000),
            durationMs: Math.round(media.duration * 1_000),
            completed: media.currentTime / media.duration > 0.95,
            reason,
        })).catch(() => undefined);
    }
    useEffect(() => () => {
        if (progressTimer.current)
            clearTimeout(progressTimer.current);
        if (gapTimer.current)
            clearTimeout(gapTimer.current);
        emitProgress("unmount");
    }, []);
    function changePhase(next) {
        phaseRef.current = next;
        setPhase(next);
        callbackRef.current.onEvent?.({ type: "phase_change", phase: next });
    }
    function startProgram(positionMs = 0, autoplay = true) {
        if (gapTimer.current)
            clearTimeout(gapTimer.current);
        pendingSeekMs.current = positionMs;
        resumePlayback.current = autoplay;
        changePhase("program");
        setReady(false);
        setTime(positionMs / 1_000);
    }
    function finishIntro() {
        if (!platformIntro || platformIntro.blackGapMs === 0)
            return startProgram(0, true);
        changePhase("gap");
        setPlaying(false);
        gapTimer.current = setTimeout(() => startProgram(0, true), platformIntro.blackGapMs);
    }
    function scheduleProgress() {
        if (progressTimer.current || !onProgress)
            return;
        progressTimer.current = setTimeout(() => {
            progressTimer.current = null;
            emitProgress("interval");
        }, persistIntervalMs);
    }
    function togglePlay() {
        const media = mediaRef.current;
        if (!media)
            return;
        if (media.paused)
            void media.play();
        else
            media.pause();
    }
    function seek(delta) {
        const media = mediaRef.current;
        if (!media)
            return;
        media.currentTime = Math.max(0, Math.min(media.duration || 0, media.currentTime + delta));
    }
    function seekPresentation(nextMs) {
        if (platformIntro && nextMs < platformIntro.durationMs) {
            pendingSeekMs.current = nextMs;
            resumePlayback.current = playing;
            changePhase("intro");
            setReady(false);
            return;
        }
        startProgram(Math.max(0, nextMs - offsetMs), playing);
    }
    function skipActiveSegment() {
        if (!activeSegment)
            return;
        if (activeSegment.source === "platform")
            startProgram(0, true);
        else {
            const media = mediaRef.current;
            if (media)
                media.currentTime = activeSegment.endMs / 1_000;
            setTime(activeSegment.endMs / 1_000);
        }
        callbackRef.current.onEvent?.({ type: "segment_skipped", segment: activeSegment });
    }
    function selectChapter(segment) {
        startProgram(segment.startMs, playing);
        setChaptersOpen(false);
        callbackRef.current.onEvent?.({ type: "chapter_selected", segment });
    }
    function selectSpeed() {
        const choices = [1, 1.25, 1.5, 1.75, 2];
        const next = choices[(choices.indexOf(speed) + 1) % choices.length] ?? 1;
        if (mediaRef.current)
            mediaRef.current.playbackRate = next;
        setSpeed(next);
    }
    function toggleCaptions() {
        const media = mediaRef.current;
        if (!media?.textTracks[0])
            return;
        const next = !captions;
        media.textTracks[0].mode = next ? "showing" : "hidden";
        setCaptions(next);
    }
    async function fullscreen() {
        const media = mediaRef.current;
        if (!media)
            return;
        if (document.fullscreenElement)
            await document.exitFullscreen();
        else
            await media.parentElement?.requestFullscreen();
    }
    async function pictureInPicture() {
        const video = mediaRef.current;
        if (!(video instanceof HTMLVideoElement) || !document.pictureInPictureEnabled)
            return;
        if (document.pictureInPictureElement)
            await document.exitPictureInPicture();
        else
            await video.requestPictureInPicture();
    }
    const mediaProps = {
        src: mediaSrc,
        preload: "metadata",
        onLoadedMetadata: (event) => {
            const media = event.currentTarget;
            if (phase === "program")
                setDuration(media.duration);
            const requested = pendingSeekMs.current ?? (phase === "program" ? initialPositionMs : 0);
            if (requested > 0 && requested / 1_000 < media.duration)
                media.currentTime = requested / 1_000;
            media.playbackRate = speed;
            pendingSeekMs.current = null;
            setReady(true);
            if (resumePlayback.current) {
                resumePlayback.current = false;
                void media.play();
            }
        },
        onTimeUpdate: (event) => {
            setTime(event.currentTarget.currentTime);
            scheduleProgress();
        },
        onPlay: () => setPlaying(true),
        onPause: () => {
            setPlaying(false);
            emitProgress("pause");
        },
        onEnded: () => {
            if (phase === "intro")
                finishIntro();
            else {
                setPlaying(false);
                emitProgress("ended");
            }
        },
        onError: (event) => {
            callbackRef.current.onEvent?.({ type: "media_error", phase: phase === "intro" ? "intro" : "program", code: event.currentTarget.error?.code });
            if (phase === "intro")
                startProgram(0, false);
        },
        onVolumeChange: (event) => setMuted(event.currentTarget.muted || event.currentTarget.volume === 0),
    };
    return (_jsxs("section", { className: `harbor-media-player ${kind === "audio" ? "harbor-media-player--audio" : ""} ${className}`.trim(), "aria-label": `${title} ${kind} player`, style: style, children: [kind === "video" ? (_jsx("video", { ref: mediaRef, poster: poster ?? undefined, playsInline: true, ...mediaProps, children: phase === "program" && captionsUrl ? _jsx("track", { kind: "captions", src: captionsUrl, srcLang: "en", label: "English" }) : null })) : _jsx("audio", { ref: mediaRef, ...mediaProps }), phase === "gap" ? _jsx("div", { className: "harbor-media-gap", "aria-label": "Brief transition to program" }) : null, previewNotice ? _jsxs("div", { className: "harbor-media-notice", children: [_jsx("strong", { children: previewNotice.title || labels.privatePreview }), _jsx("span", { children: previewNotice.body })] }) : null, activeSegment ? _jsxs("button", { type: "button", className: "harbor-media-skip", onClick: skipActiveSegment, children: [_jsx(Glyph, { value: "\u226B" }), " ", activeSegment.viewerLabel || "Skip segment"] }) : null, !ready && phase !== "gap" ? _jsxs("div", { className: "harbor-media-loading", children: [_jsx("span", { className: "harbor-media-spinner" }), " ", labels.loading] }) : null, kind === "audio" ? _jsxs("div", { className: "harbor-media-audio-identity", children: [branding?.mark, _jsx("span", { children: branding?.title }), _jsx("strong", { children: title }), _jsx("small", { children: branding?.subtitle || labels.originalAudio })] }) : null, chaptersOpen ? _jsxs("div", { className: "harbor-media-chapters", role: "dialog", "aria-label": labels.chapters, children: [_jsxs("div", { children: [_jsx("strong", { children: labels.chapters }), _jsx("button", { type: "button", onClick: () => setChaptersOpen(false), "aria-label": "Close chapters", children: "\u00D7" })] }), chapters.map((chapter) => _jsxs("button", { type: "button", onClick: () => selectChapter(chapter), children: [_jsx("span", { children: formatMediaTime(chapter.playbackStartMs) }), chapter.viewerLabel || chapter.internalName || "Chapter"] }, chapter.id))] }) : null, _jsxs("div", { className: "harbor-media-controls", children: [_jsxs("label", { className: "harbor-media-scrubber", children: [_jsx("span", { className: "harbor-media-sr-only", children: "Playback position" }), _jsx("input", { type: "range", min: 0, max: Math.max(duration + offsetMs / 1_000, 1), step: 0.1, value: Math.min(playbackTimeMs / 1_000, duration + offsetMs / 1_000 || 0), onChange: (event) => seekPresentation(Number(event.target.value) * 1_000) })] }), _jsxs("div", { children: [_jsx(Control, { label: labels.back, glyph: "\u21B6", onClick: () => seek(-10) }), _jsx(Control, { label: playing ? labels.pause : labels.play, glyph: playing ? "Ⅱ" : "▶", onClick: togglePlay, primary: true }), _jsx(Control, { label: labels.forward, glyph: "\u21B7", onClick: () => seek(10) }), _jsxs("span", { className: "harbor-media-time", children: [formatMediaTime(playbackTimeMs), " / ", formatMediaTime(duration * 1_000 + offsetMs)] }), _jsx(Control, { label: muted ? labels.unmute : labels.mute, glyph: muted ? "⌁" : "◖", onClick: () => { if (mediaRef.current)
                                    mediaRef.current.muted = !mediaRef.current.muted; } }), _jsx(Control, { label: `${labels.speed} ${speed} times`, glyph: `${speed}×`, onClick: selectSpeed, text: true }), chapters.length ? _jsx(Control, { label: labels.chapters, glyph: "\u2637", onClick: () => setChaptersOpen((value) => !value), active: chaptersOpen }) : null, captionsUrl ? _jsx(Control, { label: labels.captions, glyph: "CC", onClick: toggleCaptions, active: captions, text: true }) : null, kind === "video" ? _jsx(Control, { label: labels.pictureInPicture, glyph: "\u25A3", onClick: () => void pictureInPicture() }) : null, kind === "video" ? _jsx(Control, { label: labels.fullscreen, glyph: "\u26F6", onClick: () => void fullscreen() }) : null] })] })] }));
}
function Control({ label, glyph, onClick, primary = false, active = false, text = false }) {
    return _jsx("button", { type: "button", className: `${primary ? "harbor-media-control--primary" : ""} ${active ? "is-active" : ""}`.trim(), onClick: onClick, "aria-label": label, "aria-pressed": active || undefined, children: _jsx(Glyph, { value: glyph, text: text }) });
}
function Glyph({ value, text = false }) {
    return _jsx("span", { className: text ? "harbor-media-glyph harbor-media-glyph--text" : "harbor-media-glyph", "aria-hidden": "true", children: value });
}
//# sourceMappingURL=media-player.js.map