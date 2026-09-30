import assert from "node:assert/strict";
import { it } from "node:test";
import { isPracticeDayComplete } from "./practiceDays";

it("counts a task day only when every planned task is complete", () => {
  assert.equal(
    isPracticeDayComplete(["scale", "chords"], new Set(["scale"]), true),
    false,
  );
  assert.equal(
    isPracticeDayComplete(
      ["scale", "chords"],
      new Set(["scale", "chords"]),
      false,
    ),
    true,
  );
});

it("counts a task-free day only when general time was recorded", () => {
  assert.equal(isPracticeDayComplete([], new Set(), false), false);
  assert.equal(isPracticeDayComplete([], new Set(), true), true);
});
