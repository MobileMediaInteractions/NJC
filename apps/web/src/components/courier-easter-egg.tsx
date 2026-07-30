"use client";

import { useEffect, useRef, useState } from "react";
import { MoonStar, Newspaper, Sparkles } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  advanceCourierEasterEgg,
  initialCourierEasterEggState,
  type CourierEasterEggState,
} from "@/lib/courier-easter-egg";
import type { SiteConfiguration } from "@/lib/site-settings";

type EasterEggConfiguration = SiteConfiguration["easterEgg"];

export function CourierEasterEgg({
  configuration,
}: {
  configuration: EasterEggConfiguration;
}) {
  const [open, setOpen] = useState(false);
  const state = useRef<CourierEasterEggState>({
    ...initialCourierEasterEggState,
  });
  const pointerStartedAt = useRef(0);

  useEffect(() => {
    if (!configuration.enabled) return;

    function revealIfReady(
      event:
        | {
            kind: "key";
            key: string;
            altKey: boolean;
            shiftKey: boolean;
          }
        | {
            kind: "marker";
            heldForMs: number;
            pointerType: string;
          },
    ) {
      const result = advanceCourierEasterEgg(state.current, event, Date.now());
      state.current = result.state;
      if (result.revealed) setOpen(true);
    }

    function onKeyDown(event: KeyboardEvent) {
      const target = event.target;
      if (
        target instanceof HTMLElement &&
        (target.isContentEditable ||
          target.matches("input, textarea, select, [role='textbox']"))
      ) {
        return;
      }
      revealIfReady({
        kind: "key",
        key: event.key,
        altKey: event.altKey,
        shiftKey: event.shiftKey,
      });
    }

    function onPointerDown(event: PointerEvent) {
      if (!(event.target instanceof Element)) return;
      if (!event.target.closest("[data-courier-frequency='exit-9']")) return;
      pointerStartedAt.current = Date.now();
    }

    function onPointerUp(event: PointerEvent) {
      if (!(event.target instanceof Element)) return;
      if (!event.target.closest("[data-courier-frequency='exit-9']")) return;
      revealIfReady({
        kind: "marker",
        heldForMs: Math.max(0, Date.now() - pointerStartedAt.current),
        pointerType: event.pointerType,
      });
    }

    window.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("pointerup", onPointerUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("pointerup", onPointerUp);
    };
  }, [configuration.enabled]);

  if (!configuration.enabled) return null;

  return (
    <CourierEasterEggReveal
      configuration={configuration}
      open={open}
      onOpenChange={setOpen}
    />
  );
}

export function CourierEasterEggReveal({
  configuration,
  open,
  onOpenChange,
  preview = false,
}: {
  configuration: EasterEggConfiguration;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preview?: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="overflow-hidden border-[#c49545]/60 bg-[#071b16] p-0 text-[#f8f5ee] shadow-[0_0_100px_rgba(196,149,69,0.22)] sm:max-w-2xl">
        <div className="relative isolate overflow-hidden px-7 py-8 sm:px-11 sm:py-10">
          <div
            aria-hidden="true"
            className="absolute -right-24 -top-28 -z-10 size-80 rounded-full border border-[#c49545]/20 bg-[radial-gradient(circle,rgba(196,149,69,0.18),transparent_66%)]"
          />
          <div
            aria-hidden="true"
            className="absolute inset-0 -z-20 opacity-20 [background-image:linear-gradient(rgba(255,255,255,.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.05)_1px,transparent_1px)] [background-size:22px_22px]"
          />

          <DialogHeader className="text-left">
            <div className="flex items-center gap-3 text-[#d9ad62]">
              <MoonStar className="size-5" />
              <span className="text-[0.65rem] font-black uppercase tracking-[0.25em]">
                {preview ? "Studio preview" : "Unlisted late edition"} · Exit 9
              </span>
            </div>
            <DialogTitle className="font-editorial mt-5 text-4xl leading-none tracking-[-0.04em] text-[#f8f5ee] sm:text-6xl">
              {configuration.title}
            </DialogTitle>
            <DialogDescription className="mt-4 max-w-xl text-base leading-7 text-[#d9dfda]/75">
              {configuration.message}
            </DialogDescription>
          </DialogHeader>

          <div className="mt-8 border-y border-[#c49545]/30 py-6">
            <div className="grid gap-5 sm:grid-cols-[auto_1fr] sm:items-center">
              <div className="grid size-20 place-items-center rounded-full border border-[#c49545]/35 bg-[#c49545]/10 text-[#d9ad62]">
                <Newspaper className="size-9" />
              </div>
              <div>
                <p className="text-[0.62rem] font-black uppercase tracking-[0.2em] text-[#d9ad62]">
                  The presses remember
                </p>
                <p className="font-editorial mt-2 text-2xl leading-tight text-[#f8f5ee]">
                  You found the edition that was never printed.
                </p>
              </div>
            </div>
          </div>

          <p className="mt-6 flex items-center gap-2 text-xs text-[#d9dfda]/45">
            <Sparkles className="size-3.5 text-[#d9ad62]" />
            No achievement, tracking pixel, or prize—just a very well-hidden
            piece of the Garden State.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

