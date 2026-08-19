export function defaultSegmentLabel(type) {
    if (type === "intro")
        return "Skip Intro";
    if (type === "recap")
        return "Skip Recap";
    if (type === "credits")
        return "Skip Credits";
    if (type === "chapter")
        return "Go to Chapter";
    return "Skip Segment";
}
export function composePlaybackTimeline(input) {
    const offsetMs = input.platformIntro ? input.platformIntro.durationMs + input.platformIntro.blackGapMs : 0;
    const generated = input.platformIntro
        ? [{
                id: `platform:${input.platformIntro.id}`,
                segmentType: "intro",
                startMs: 0,
                endMs: input.platformIntro.durationMs,
                internalName: input.platformIntro.title,
                viewerLabel: "Skip Intro",
                skippable: true,
                sortOrder: -1,
                source: "platform",
                playbackStartMs: 0,
                playbackEndMs: input.platformIntro.durationMs,
                skipToMs: offsetMs,
            }]
        : [];
    return [...generated, ...input.contentSegments.map((segment) => ({
            ...segment,
            viewerLabel: segment.skippable ? segment.viewerLabel || defaultSegmentLabel(segment.segmentType) : segment.viewerLabel,
            source: "content",
            playbackStartMs: segment.startMs + offsetMs,
            playbackEndMs: segment.endMs + offsetMs,
            skipToMs: segment.endMs + offsetMs,
        }))].sort((a, b) => a.playbackStartMs - b.playbackStartMs || a.sortOrder - b.sortOrder);
}
export function activeTimelineSegment(segments, playbackPositionMs) {
    return segments.find((segment) => segment.skippable && playbackPositionMs >= segment.playbackStartMs && playbackPositionMs < segment.playbackEndMs) ?? null;
}
export function sourcePositionToPlaybackMs(sourcePositionMs, intro) {
    return sourcePositionMs + (intro ? intro.durationMs + intro.blackGapMs : 0);
}
export function playbackPositionToSourceMs(playbackPositionMs, intro) {
    return Math.max(0, playbackPositionMs - (intro ? intro.durationMs + intro.blackGapMs : 0));
}
export function validateTimeline(segments, durationMs) {
    const issues = [];
    for (const segment of segments) {
        if (!Number.isInteger(segment.startMs) || segment.startMs < 0)
            issues.push({ segmentId: segment.id, field: "startMs", message: "Start must be a positive whole number of milliseconds.", severity: "error" });
        if (!Number.isInteger(segment.endMs) || segment.endMs <= segment.startMs)
            issues.push({ segmentId: segment.id, field: "endMs", message: "End must be after start.", severity: "error" });
        if (durationMs && segment.endMs > durationMs)
            issues.push({ segmentId: segment.id, field: "endMs", message: "Segment extends beyond the source duration.", severity: "error" });
        if (segment.segmentType === "custom" && !segment.internalName?.trim())
            issues.push({ segmentId: segment.id, field: "internalName", message: "Custom segments require an internal name.", severity: "error" });
        if (segment.skippable && segment.segmentType === "custom" && !segment.viewerLabel?.trim())
            issues.push({ segmentId: segment.id, field: "viewerLabel", message: "Skippable custom segments require a viewer label.", severity: "error" });
    }
    segments.forEach((segment, index) => {
        for (const candidate of segments.slice(index + 1)) {
            if (segment.startMs < candidate.endMs && candidate.startMs < segment.endMs) {
                issues.push({ segmentId: segment.id, field: "overlap", message: `${segment.internalName || segment.segmentType} overlaps ${candidate.internalName || candidate.segmentType}.`, severity: "warning" });
            }
        }
    });
    return issues;
}
export function formatMediaTime(valueMs, includeMilliseconds = false) {
    if (!Number.isFinite(valueMs))
        return includeMilliseconds ? "00:00.000" : "0:00";
    const milliseconds = Math.max(0, Math.round(valueMs));
    const totalSeconds = Math.floor(milliseconds / 1_000);
    const seconds = String(totalSeconds % 60).padStart(2, "0");
    const minutes = Math.floor((totalSeconds / 60) % 60);
    const hours = Math.floor(totalSeconds / 3_600);
    const base = hours ? `${hours}:${String(minutes).padStart(2, "0")}:${seconds}` : `${minutes}:${seconds}`;
    return includeMilliseconds ? `${hours ? base : base.padStart(5, "0")}.${String(milliseconds % 1_000).padStart(3, "0")}` : base;
}
//# sourceMappingURL=timeline.js.map