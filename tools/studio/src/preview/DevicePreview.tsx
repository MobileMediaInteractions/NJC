import { AnimationRuntime, type RenderFrame } from "@platform/runtime/animation";
import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { LottieSurface } from "../components/LottieSurface";
import type { DeviceProfile, ThemeMode } from "../model/protocol";

export type PreviewHandle = {
  play: (timeline: string) => void;
  seek: (timeMs: number) => void;
  send: (machine: string, event: string) => boolean;
  setInput: (name: string, value: string | number | boolean) => void;
  pause: () => void;
  resume: () => void;
  reverse: () => void;
};

type Props = {
  packageBytes: Uint8Array | null;
  sceneName: string;
  selectedId: string | null;
  device: DeviceProfile;
  orientation: "portrait" | "landscape";
  theme: ThemeMode;
  reducedMotion: boolean;
  onSelect: (id: string) => void;
  onFrame: (frame: RenderFrame, evaluationMs: number) => void;
  onEvent: (event: string) => void;
};

function cssValue(value: unknown, fallback = 0) {
  return typeof value === "number" ? value : fallback;
}

export const DevicePreview = forwardRef<PreviewHandle, Props>(function DevicePreview({ packageBytes, sceneName, selectedId, device, orientation, theme, reducedMotion, onSelect, onFrame, onEvent }, ref) {
  const runtimeRef = useRef<AnimationRuntime | null>(null);
  const [frame, setFrame] = useState<RenderFrame | null>(null);
  const [paused, setPaused] = useState(false);
  const dimensions = useMemo(() => orientation === "portrait" ? { width: device.width, height: device.height } : { width: device.height, height: device.width }, [device, orientation]);

  useEffect(() => {
    if (!packageBytes) { runtimeRef.current = null; setFrame(null); return; }
    try {
      const runtime = new AnimationRuntime(packageBytes, { scene: sceneName, reducedMotion, rendererName: "studio-dom-hybrid" });
      runtimeRef.current = runtime;
      const firstTimeline = runtime.scene.timelines[0]?.name;
      if (firstTimeline) runtime.play(firstTimeline);
      const unsubscribe = runtime.onEvent(onEvent);
      setFrame(runtime.tick());
      return () => { unsubscribe(); };
    } catch {
      runtimeRef.current = null;
      setFrame(null);
    }
  }, [packageBytes, sceneName, reducedMotion, onEvent]);

  useEffect(() => {
    let animationFrame = 0;
    const tick = () => {
      const runtime = runtimeRef.current;
      if (runtime) {
        const next = runtime.tick();
        setFrame(next);
        onFrame(next, runtime.diagnostics.lastEvaluationMs);
      }
      animationFrame = requestAnimationFrame(tick);
    };
    animationFrame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animationFrame);
  }, [onFrame]);

  useImperativeHandle(ref, () => ({
    play(timeline) { runtimeRef.current?.play(timeline); setPaused(false); },
    seek(timeMs) { const next = runtimeRef.current?.seek(timeMs); if (next) setFrame(next); },
    send(machine, event) { return runtimeRef.current?.send(machine, event) ?? false; },
    setInput(name, value) { runtimeRef.current?.setInput(name, value); },
    pause() { runtimeRef.current?.pause(); setPaused(true); },
    resume() { runtimeRef.current?.resume(); setPaused(false); },
    reverse() { runtimeRef.current?.reverse(); },
  }), []);

  const fitScale = Math.min(0.62, 510 / dimensions.height, 350 / dimensions.width);
  return (
    <section className="device-preview" aria-label="Integrated virtual device preview">
      <div className="preview-head">
        <span><i className="live-dot" /> Virtual preview</span>
        <div className="preview-actions">
          <button onClick={() => paused ? runtimeRef.current?.resume() : runtimeRef.current?.pause()} aria-label={paused ? "Resume preview" : "Pause preview"}>{paused ? "▶" : "Ⅱ"}</button>
          <button onClick={() => runtimeRef.current?.reverse()} aria-label="Reverse preview">↶</button>
        </div>
      </div>
      <div className={`device-stage ${theme}`}>
        <div
          className="device-shell"
          style={{ width: dimensions.width * fitScale + 18, height: dimensions.height * fitScale + 18, borderRadius: device.radius * fitScale + 10 }}
        >
          <div
            className="device-screen"
            style={{ width: dimensions.width, height: dimensions.height, borderRadius: device.radius, transform: `scale(${fitScale})`, transformOrigin: "top left" }}
            dir="ltr"
          >
            <div className="system-bar" style={{ height: device.safeTop }}><span>9:41</span><span>● ◒ ▰</span></div>
            {frame?.nodes.map((node) => {
              const props = node.properties;
              const common: React.CSSProperties = {
                position: "absolute",
                left: cssValue(props.x),
                top: cssValue(props.y) + device.safeTop,
                width: typeof props.width === "number" ? props.width : node.kind === "text" ? 330 : 80,
                height: typeof props.height === "number" ? props.height : node.kind === "text" ? "auto" : 80,
                opacity: typeof props.opacity === "number" ? props.opacity : 1,
                transform: `scale(${cssValue(props.scale, 1)}) rotate(${cssValue(props.rotation)}deg)`,
                transformOrigin: "center",
                borderRadius: cssValue(props.cornerRadius),
              };
              if (node.kind === "text") {
                common.color = String(props.color ?? (theme === "dark" ? "#f5f2eb" : "#17231f"));
                common.fontSize = cssValue(props.fontSize, 28);
                common.fontWeight = String(props.fontWeight ?? "600");
              }
              if (node.kind === "rect") common.background = String(props.fill ?? "#d7ded9");
              if (node.kind === "host") common.background = String(props.fill ?? "#172f28");
              return (
                <button
                  type="button"
                  key={node.id}
                  className={`render-node ${node.kind} ${selectedId === node.id ? "selected" : ""}`}
                  style={common}
                  onClick={() => onSelect(node.id)}
                  aria-label={`Select ${node.id}`}
                >
                  {node.kind === "text" && <span>{String(props.text ?? node.id)}</span>}
                  {node.kind === "host" && <span>Continue <b>→</b></span>}
                  {node.kind === "path" && (
                    <svg viewBox={`0 0 ${cssValue(props.width, 320)} ${cssValue(props.height, 140)}`} aria-hidden="true"><path d={String(props.path ?? "")} fill={props.pathMode === "stroke" ? "none" : String(props.fill ?? "#2d6a55")} stroke={props.pathMode === "stroke" ? String(props.fill ?? "#2d6a55") : "none"} strokeWidth={cssValue(props.strokeWidth, 1)} strokeLinecap="round" /></svg>
                  )}
                  {node.kind === "image" && <img src={String(props.source ?? "")} alt="" draggable={false} />}
                  {node.kind === "lottie" && <LottieSurface encodedData={String(props.lottieData ?? "")} timeMs={frame.timeMs} frameRate={cssValue(props.lottieFrameRate, 30)} label={`Lottie animation ${node.id}`} />}
                </button>
              );
            })}
            <div className="safe-area-guide" style={{ top: device.safeTop }} aria-hidden="true" />
          </div>
        </div>
      </div>
      <div className="preview-foot"><span>{device.label}</span><span>{dimensions.width} × {dimensions.height} · {device.density}×</span><span>{reducedMotion ? "Reduced motion" : "Full motion"}</span></div>
    </section>
  );
});
