export const courierEasterEggPhrase = "exit nine keeps the presses awake";
export const courierEasterEggLocation =
  "Public footer → the newsroom desk and city line";

const phraseWindowMs = 12_000;
const frequencyWindowMs = 5_000;
const touchWindowMs = 6_000;
const minimumTouchHoldMs = 800;
const maximumTouchHoldMs = 1_300;
const desktopTapTarget = 5;
const touchTapTarget = 9;

export type CourierEasterEggState = {
  buffer: string;
  phase: "listening" | "phrase-armed" | "frequency-armed" | "touch-armed";
  expiresAt: number;
  taps: number;
};

export type CourierEasterEggEvent =
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
    };

export const initialCourierEasterEggState: CourierEasterEggState = {
  buffer: "",
  phase: "listening",
  expiresAt: 0,
  taps: 0,
};

export function advanceCourierEasterEgg(
  current: CourierEasterEggState,
  event: CourierEasterEggEvent,
  now: number,
) {
  const state =
    current.phase !== "listening" && now > current.expiresAt
      ? { ...initialCourierEasterEggState }
      : current;

  if (event.kind === "key") {
    if (
      state.phase === "phrase-armed" &&
      event.altKey &&
      event.shiftKey &&
      event.key === "9"
    ) {
      return {
        state: {
          ...initialCourierEasterEggState,
          phase: "frequency-armed" as const,
          expiresAt: now + frequencyWindowMs,
        },
        revealed: false,
      };
    }

    if (event.key.length !== 1 || event.altKey) {
      return { state, revealed: false };
    }

    const buffer = `${state.buffer}${event.key.toLocaleLowerCase()}`.slice(
      -courierEasterEggPhrase.length,
    );
    if (buffer === courierEasterEggPhrase) {
      return {
        state: {
          buffer: "",
          phase: "phrase-armed" as const,
          expiresAt: now + phraseWindowMs,
          taps: 0,
        },
        revealed: false,
      };
    }

    return {
      state: { ...state, buffer },
      revealed: false,
    };
  }

  const isTouch = event.pointerType === "touch";
  const isTouchHold =
    isTouch &&
    event.heldForMs >= minimumTouchHoldMs &&
    event.heldForMs <= maximumTouchHoldMs;

  if (isTouchHold) {
    return {
      state: {
        ...initialCourierEasterEggState,
        phase: "touch-armed" as const,
        expiresAt: now + touchWindowMs,
      },
      revealed: false,
    };
  }

  if (state.phase === "frequency-armed" && !isTouch) {
    const taps = state.taps + 1;
    return taps >= desktopTapTarget
      ? { state: { ...initialCourierEasterEggState }, revealed: true }
      : { state: { ...state, taps }, revealed: false };
  }

  if (
    state.phase === "touch-armed" &&
    isTouch &&
    event.heldForMs < minimumTouchHoldMs
  ) {
    const taps = state.taps + 1;
    return taps >= touchTapTarget
      ? { state: { ...initialCourierEasterEggState }, revealed: true }
      : { state: { ...state, taps }, revealed: false };
  }

  return { state, revealed: false };
}
