import assert from "node:assert/strict";
import test from "node:test";
import {
  advanceCourierEasterEgg,
  courierEasterEggPhrase,
  initialCourierEasterEggState,
} from "../src/lib/courier-easter-egg";

test("desktop reveal requires the complete phrase, chord, and five marker taps", () => {
  let state = { ...initialCourierEasterEggState };
  let now = 1_000;

  for (const key of courierEasterEggPhrase) {
    ({ state } = advanceCourierEasterEgg(
      state,
      { kind: "key", key, altKey: false, shiftKey: false },
      now++,
    ));
  }
  assert.equal(state.phase, "phrase-armed");

  ({ state } = advanceCourierEasterEgg(
    state,
    { kind: "key", key: "9", altKey: true, shiftKey: true },
    now++,
  ));
  assert.equal(state.phase, "frequency-armed");

  for (let index = 0; index < 4; index += 1) {
    const result = advanceCourierEasterEgg(
      state,
      { kind: "marker", heldForMs: 50, pointerType: "mouse" },
      now++,
    );
    state = result.state;
    assert.equal(result.revealed, false);
  }

  const result = advanceCourierEasterEgg(
    state,
    { kind: "marker", heldForMs: 50, pointerType: "mouse" },
    now,
  );
  assert.equal(result.revealed, true);
  assert.deepEqual(result.state, initialCourierEasterEggState);
});

test("expired desktop stages fail closed", () => {
  let state = { ...initialCourierEasterEggState };
  let now = 2_000;

  for (const key of courierEasterEggPhrase) {
    ({ state } = advanceCourierEasterEgg(
      state,
      { kind: "key", key, altKey: false, shiftKey: false },
      now++,
    ));
  }

  const result = advanceCourierEasterEgg(
    state,
    { kind: "key", key: "9", altKey: true, shiftKey: true },
    now + 12_001,
  );
  assert.equal(result.revealed, false);
  assert.equal(result.state.phase, "listening");
});

test("touch reveal requires a deliberate hold followed by nine taps", () => {
  let result = advanceCourierEasterEgg(
    { ...initialCourierEasterEggState },
    { kind: "marker", heldForMs: 900, pointerType: "touch" },
    5_000,
  );
  assert.equal(result.state.phase, "touch-armed");

  for (let index = 0; index < 8; index += 1) {
    result = advanceCourierEasterEgg(
      result.state,
      { kind: "marker", heldForMs: 80, pointerType: "touch" },
      5_100 + index,
    );
    assert.equal(result.revealed, false);
  }

  result = advanceCourierEasterEgg(
    result.state,
    { kind: "marker", heldForMs: 80, pointerType: "touch" },
    5_200,
  );
  assert.equal(result.revealed, true);
});

