import type { TimelineNode } from "@platform/runtime/animation";

const easingOptions = ["linear", "outCubic", "inCubic", "inOutCubic", "spring", "steps4"];

export function TimelinePanel({ timelines, selected, playhead, onSelect, onPlay, onSeek, onKeyframe }: {
  timelines: TimelineNode[];
  selected: string;
  playhead: number;
  onSelect: (timeline: string) => void;
  onPlay: (timeline: string) => void;
  onSeek: (timeMs: number) => void;
  onKeyframe: (target: string, index: number, field: "time" | "value" | "easing", value: number | string) => void;
}) {
  const timeline = timelines.find((item) => item.name === selected) ?? timelines[0];
  if (!timeline) return <div className="empty-panel">No timelines in this scene.</div>;
  return (
    <div className="timeline-panel">
      <div className="timeline-toolbar">
        <select value={timeline.name} onChange={(event) => onSelect(event.target.value)} aria-label="Timeline">
          {timelines.map((item) => <option key={item.name}>{item.name}</option>)}
        </select>
        <button onClick={() => onPlay(timeline.name)} aria-label="Play timeline">▶</button>
        <button onClick={() => onSeek(0)} aria-label="Go to beginning">|◀</button>
        <span className="timecode">{Math.round(playhead)} ms / {timeline.durationMs} ms</span>
        <span className="duration-pill">{timeline.tracks.length} tracks</span>
      </div>
      <div className="timeline-scroll">
        <div className="timeline-ruler" style={{ "--playhead": `${Math.min(100, playhead / timeline.durationMs * 100)}%` } as React.CSSProperties}>
          {[0, .25, .5, .75, 1].map((step) => <span key={step} style={{ left: `${step * 100}%` }}>{Math.round(timeline.durationMs * step)}</span>)}
          <button className="playhead" style={{ left: `${Math.min(100, playhead / timeline.durationMs * 100)}%` }} onKeyDown={(event) => {
            if (event.key === "ArrowRight") onSeek(Math.min(timeline.durationMs, playhead + 10));
            if (event.key === "ArrowLeft") onSeek(Math.max(0, playhead - 10));
          }} aria-label={`Playhead at ${Math.round(playhead)} milliseconds`} />
        </div>
        {timeline.tracks.map((track) => (
          <div className="track-row" key={track.target}>
            <div className="track-label"><span>◇</span>{track.target}</div>
            <div className="track-lane">
              <div className="track-line" />
              {track.keyframes.map((keyframe, index) => (
                <div className="keyframe-editor" key={`${keyframe.timeMs}-${index}`} style={{ left: `${keyframe.timeMs / timeline.durationMs * 100}%` }}>
                  <button className="keyframe" title={`${keyframe.timeMs}ms · ${keyframe.value} · ${keyframe.easing}`} aria-label={`Edit keyframe ${index + 1} on ${track.target}`}>◆</button>
                  <div className="keyframe-popover">
                    <label>Time <input type="number" value={keyframe.timeMs} onChange={(event) => onKeyframe(track.target, index, "time", Number(event.target.value))} /></label>
                    <label>Value <input type="number" value={keyframe.value} step="0.01" onChange={(event) => onKeyframe(track.target, index, "value", Number(event.target.value))} /></label>
                    <label>Ease <select value={keyframe.easing} onChange={(event) => onKeyframe(track.target, index, "easing", event.target.value)}>{easingOptions.map((ease) => <option key={ease}>{ease}</option>)}</select></label>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
