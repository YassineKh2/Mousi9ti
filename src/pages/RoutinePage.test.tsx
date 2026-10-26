import assert from "node:assert/strict";
import { it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { RoutinePage } from "./RoutinePage";
import { SettingsContext } from "../contexts/SettingsContext";
import { AppSettings, PracticeTask, UserTimerPreferences } from "../types";

function renderRoutine(
  instrument: "guitar" | "piano",
  quickStartInstrument?: "guitar" | "piano" | "none",
  tasks: PracticeTask[] = [],
  savedSchedule?: string,
  timerPreferences?: UserTimerPreferences,
) {
  const originalStorage = globalThis.localStorage;
  const saved = new Map<string, string>();
  if (savedSchedule) saved.set("mous9iti_weekly_schedule", savedSchedule);
  globalThis.localStorage = {
    getItem: (key: string) => saved.get(key) ?? null,
    setItem: (key: string, value: string) => {
      saved.set(key, value);
    },
  } as Storage;
  try {
    return renderToStaticMarkup(
      <SettingsContext.Provider
        value={{ defaultInstrument: instrument } as AppSettings}
      >
        <RoutinePage
          practiceTasks={tasks}
          quickStartInstrument={quickStartInstrument}
          timerPreferences={timerPreferences}
        />
      </SettingsContext.Provider>,
    );
  } finally {
    globalThis.localStorage = originalStorage;
  }
}

it("keeps the full routine visible with task setup in the goals section", () => {
  const html = renderRoutine("guitar", undefined, [], undefined, {
    hasSeenDailyTasksOnboarding: false,
  } as UserTimerPreferences);
  assert.match(html, /data-tour="routine-schedule"/);
  assert.match(html, /data-tour="routine-days"/);
  assert.match(html, /data-tour="routine-goals"/);
  assert.match(html, /Start tasks/);
  assert.match(html, /Click Start tasks to complete your task setup/);
  assert.doesNotMatch(html, /placeholder="e.g. Practice/);
});

for (const instrument of ["guitar", "piano"] as const) {
  it(`does not seed ${instrument} tasks without an explicit quick-start choice`, () => {
    const empty = renderRoutine(instrument, "none");
    assert.equal(renderRoutine(instrument), empty);
    assert.notEqual(renderRoutine(instrument, instrument), empty);
  });
}

it("keeps custom tasks without adding a default routine", () => {
  const html = renderRoutine("guitar", undefined, [
    { id: "custom-task", text: "My personal practice goal", completed: false },
  ]);
  assert.match(html, /My personal practice goal/);
});

it("preserves a saved schedule when no quick-start choice is pending", () => {
  const schedule = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"].map(
    (day) => ({
      day,
      focusTheme: "Personal routine",
      goalDurationMins: 15,
      defaultBpm: 90,
      modules: [],
      tasks: [
        {
          id: `saved-${day}`,
          text: "My saved practice goal",
          completed: false,
        },
      ],
    }),
  );
  assert.match(
    renderRoutine("guitar", undefined, [], JSON.stringify(schedule)),
    /My saved practice goal/,
  );
});

it("reports zero percent when no weekly practice is completed", () => {
  const schedule = Array.from({ length: 7 }, (_, index) => ({
    day: ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"][index],
    focusTheme: "Personal routine",
    goalDurationMins: 30,
    defaultBpm: 90,
    modules: [],
    tasks: [{ id: `task-${index}`, text: "Practice", completed: false }],
  }));

  assert.match(
    renderRoutine("guitar", undefined, [], JSON.stringify(schedule)),
    /Completed<\/span><strong class="text-primary font-bold">0h 0m \(0%\)<\/strong>/,
  );
});

it("labels task-based completion as an estimate and uses a page section heading", () => {
  const html = renderRoutine("guitar");
  assert.match(
    html,
    /title="Estimated completion based on completed tasks and daily target durations, not recorded practice time\."/,
  );
  assert.match(html, /aria-label="Estimated completion: 0h 0m \(0%\)/);
  assert.match(html, /<h2[^>]*>.*?Weekly Schedule &amp; Cadence<\/h2>/s);
  assert.doesNotMatch(html, /<h1\b/);
});

it("reports the calculated percentage and handles a zero weekly target", () => {
  const halfComplete = Array.from({ length: 7 }, (_, index) => ({
    day: ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"][index],
    focusTheme: "Personal routine",
    goalDurationMins: 30,
    defaultBpm: 90,
    modules: [],
    tasks: [
      { id: `done-${index}`, text: "Done", completed: true },
      { id: `pending-${index}`, text: "Pending", completed: false },
    ],
  }));
  const zeroTarget = Array.from({ length: 7 }, (_, index) => ({
    day: ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"][index],
    focusTheme: "Personal routine",
    goalDurationMins: 0,
    defaultBpm: 90,
    modules: [],
    tasks: [],
  }));

  assert.match(
    renderRoutine("guitar", undefined, [], JSON.stringify(halfComplete)),
    /Completed<\/span><strong class="text-primary font-bold">1h 45m \(50%\)<\/strong>/,
  );
  assert.match(
    renderRoutine("guitar", undefined, [], JSON.stringify(zeroTarget)),
    /Completed<\/span><strong class="text-primary font-bold">0h 0m \(0%\)<\/strong>/,
  );
});
