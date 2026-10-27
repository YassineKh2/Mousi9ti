import assert from "node:assert/strict";
import { it } from "node:test";
import { isPracticeDayComplete } from "./practiceDays";
import {
  getSavedStreak,
  getSavedTaskActivities,
  recordTaskActivity,
  setTaskCompletion,
} from "./storage";

it("requires all planned tasks for a completed practice day", () => {
  assert.equal(
    isPracticeDayComplete(["scale", "chords"], new Set(["scale"]), false),
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

it("does not treat general practice as completing unfinished planned tasks", () => {
  assert.equal(
    isPracticeDayComplete(["scale", "chords"], new Set(["scale"]), true),
    false,
  );
});

it("credits task starts only toward the streak and keeps completion separate", () => {
  const originalStorage = globalThis.localStorage;
  const saved = new Map<string, string>();
  globalThis.localStorage = {
    get length() {
      return saved.size;
    },
    clear: () => saved.clear(),
    getItem: (key: string) => saved.get(key) ?? null,
    key: (index: number) => Array.from(saved.keys())[index] ?? null,
    setItem: (key: string, value: string) => {
      saved.set(key, value);
    },
    removeItem: (key: string) => {
      saved.delete(key);
    },
  } as Storage;
  try {
    assert.equal(getSavedStreak().currentStreak, 0);
    recordTaskActivity({ id: "scale", text: "Practice scales" }, "started");
    assert.equal(getSavedStreak().currentStreak, 1);
    assert.equal(
      isPracticeDayComplete(["scale", "chords"], new Set(), false),
      false,
    );
    assert.equal(getSavedTaskActivities().length, 1);
    assert.equal(getSavedTaskActivities()[0].kind, "started");
    assert.equal(getSavedTaskActivities()[0].durationSeconds, 0);
    recordTaskActivity({ id: "scale", text: "Practice scales" }, "started");
    recordTaskActivity({ id: "chords", text: "Practice chords" }, "started");
    assert.equal(getSavedStreak().currentStreak, 1);
    assert.equal(
      getSavedTaskActivities().filter(
        (activity) => activity.kind === "completed",
      ).length,
      0,
    );
    setTaskCompletion({ id: "scale", text: "Practice scales" }, true);
    assert.equal(getSavedStreak().currentStreak, 1);
    assert.equal(
      isPracticeDayComplete(["scale", "chords"], new Set(["scale"]), false),
      false,
    );

    setTaskCompletion({ id: "chords", text: "Practice chords" }, true);
    assert.equal(getSavedStreak().currentStreak, 1);
    assert.equal(
      isPracticeDayComplete(
        ["scale", "chords"],
        new Set(["scale", "chords"]),
        false,
      ),
      true,
    );
  } finally {
    globalThis.localStorage = originalStorage;
  }
});

it("does not count unchecked tasks or a task that was only started", () => {
  assert.equal(
    isPracticeDayComplete(["scale", "chords"], new Set(), false),
    false,
  );
  assert.equal(
    isPracticeDayComplete(["scale"], new Set(["unrelated"]), false),
    false,
  );
});

it("counts a task-free day only when general time was recorded", () => {
  assert.equal(isPracticeDayComplete([], new Set(), false), false);
  assert.equal(isPracticeDayComplete([], new Set(), true), true);
});
