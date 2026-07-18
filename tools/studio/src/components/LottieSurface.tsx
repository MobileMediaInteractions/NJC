import lottie, { type AnimationItem } from "lottie-web/build/player/lottie_light";
import { useEffect, useMemo, useRef } from "react";
import { decodeEmbeddedLottie } from "../lib/lottie-data";

type LottieSurfaceProps = {
  encodedData: string;
  timeMs: number;
  frameRate: number;
  label: string;
};

export function LottieSurface({ encodedData, timeMs, frameRate, label }: LottieSurfaceProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<AnimationItem | null>(null);
  const animationData = useMemo(() => decodeEmbeddedLottie(encodedData), [encodedData]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !animationData) return;
    const animation = lottie.loadAnimation({
      container,
      renderer: "svg",
      loop: false,
      autoplay: false,
      animationData,
      rendererSettings: { preserveAspectRatio: "xMidYMid meet", progressiveLoad: false, focusable: false },
    });
    animationRef.current = animation;
    return () => {
      animationRef.current = null;
      animation.destroy();
      container.replaceChildren();
    };
  }, [animationData]);

  useEffect(() => {
    animationRef.current?.goToAndStop(Math.max(0, timeMs) * frameRate / 1_000, true);
  }, [frameRate, timeMs]);

  return <div ref={containerRef} className="lottie-surface" role="img" aria-label={animationData ? label : `${label} could not be decoded`} />;
}
