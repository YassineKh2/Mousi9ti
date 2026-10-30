import assert from "node:assert/strict";
import { it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  getTaskDurationMenuOptions,
  mergeRoutineTasks,
  RoutinePage,
} from "./RoutinePage";
import { SettingsContext } from "../contexts/SettingsContext";
import { AppSettings, PracticeTask, UserTimerPreferences } from "../types";

for (const [duration, label] of [
  ["forever", "No limit"],
  ["week", "This week"],
  ["month", "This month"],
  ["year", "This year"],
] as const) {
  it(`selects the existing ${duration} option for the configured default without duplicating it`, () => {
    const options = getTaskDurationMenuOptions(duration, label);
    assert.equal(options.length, 5);
    assert.deepEqual(
      options.filter((option) => option.label === label),
      [{ value: "default", label }],
    );
    assert.equal(
      options.filter((option) => option.value === "default").length,
      1,
    );
    assert.ok(options.some((option) => option.value === "custom"));
  });
}

it("keeps a separate configured custom duration alongside the custom editor", () => {
  const options = getTaskDurationMenuOptions("custom", "6 months");
  assert.equal(options.length, 6);
  assert.deepEqual(options[0], { value: "default", label: "6 months" });
  assert.ok(options.some((option) => option.value === "custom"));
});

it("keeps existing-task duration menus independent of the creation default", () => {
  const options = getTaskDurationMenuOptions();
  assert.equal(options.length, 5);
  assert.equal(
    options.some((option) => option.value === "default"),
    false,
  );
  assert.ok(options.some((option) => option.value === "forever"));
});

it("does not let stale daily tasks undo finite to forever to finite duration edits", () => {
  const createdAt = new Date(2026, 4, 21).getTime();
  const staleTask = {
    id: `t-${createdAt}`,
    text: "Practice",
    completed: false,
    createdAt,
    startsAt: createdAt,
    expiresAt: new Date(2026, 5, 18).getTime(),
    duration: "custom" as const,
  };
  const changedAt = new Date(2026, 5, 1).getTime();
  const history = [{ startsAt: createdAt, expiresAt: changedAt }];
  const foreverTask = {
    ...staleTask,
    startsAt: changedAt,
    expiresAt: undefined,
    duration: "forever" as const,
    visibilityHistory: history,
    hiddenDates: ["2026-06-02"],
    completedByDate: { "2026-05-21": true },
  };
  const dailyUpdate = {
    ...staleTask,
    text: "Practice scales",
    completed: true,
    completedByDate: { "2026-06-01": true },
  };
  const [merged] = mergeRoutineTasks([foreverTask], [dailyUpdate]);
  assert.equal(merged.expiresAt, undefined);
  assert.equal(merged.duration, "forever");
  assert.equal(merged.createdAt, createdAt);
  assert.equal(merged.startsAt, changedAt);
  assert.deepEqual(merged.visibilityHistory, history);
  assert.deepEqual(merged.hiddenDates, ["2026-06-02"]);
  assert.equal(merged.text, "Practice scales");
  assert.deepEqual(merged.completedByDate, {
    "2026-05-21": true,
    "2026-06-01": true,
  });

  const finiteTask = {
    ...foreverTask,
    duration: "week" as const,
    startsAt: new Date(2026, 5, 8).getTime(),
    expiresAt: new Date(2026, 5, 15).getTime(),
  };
  const [finiteMerged] = mergeRoutineTasks([finiteTask], [merged]);
  assert.equal(finiteMerged.duration, "week");
  assert.equal(finiteMerged.startsAt, finiteTask.startsAt);
  assert.equal(finiteMerged.expiresAt, finiteTask.expiresAt);
});

it("keeps new daily tasks and scheduled tasks that have no daily copy", () => {
  const stored = { id: "scheduled", text: "Scheduled", completed: false };
  const added = { id: "new", text: "New", completed: false };
  assert.deepEqual(mergeRoutineTasks([stored], [added]), [stored, added]);
});

for (const duration of ["week", "month", "year"] as const) {
  it(`labels ${duration} duration options using this-period wording`, () => {
    const tasks = [
      { id: "renewal", text: "Practice", completed: false, duration },
    ];
    const html = renderRoutine("guitar", undefined, tasks);
    assert.ok(html.includes(`aria-label="Task duration: This ${duration}"`));
  });
}

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

it("shows the creation date rather than the updated duration start", () => {
  const today = new Date();
  const createdAt = new Date(
    today.getFullYear(),
    today.getMonth() - 2,
    1,
  ).getTime();
  const startsAt = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  ).getTime();
  const expiresAt = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate() + 28,
  ).getTime();
  const formatDate = (timestamp: number) =>
    new Date(timestamp).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  const html = renderRoutine("guitar", undefined, [
    {
      id: `t-${createdAt}`,
      text: "Extended practice task",
      completed: false,
      createdAt,
      startsAt,
      expiresAt,
    },
  ]);

  assert.ok(
    html.includes(`${formatDate(createdAt)} - ${formatDate(expiresAt - 1)}`),
  );
  assert.equal(
    html.includes(`${formatDate(startsAt)} - ${formatDate(expiresAt - 1)}`),
    false,
  );
});

it("provides a named submit control for adding tasks after choosing a duration", () => {
  const html = renderRoutine("guitar", undefined, [
    { id: "custom-task", text: "My personal practice goal", completed: false },
  ]);
  assert.match(html, /<button type="submit" aria-label="Add task"/);
});

it("exposes task completion controls with names and pressed state", () => {
  const todayIndex = (new Date().getDay() + 6) % 7;
  const schedule = Array.from({ length: 7 }, (_, index) => ({
    day: ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"][index],
    focusTheme: "Personal routine",
    goalDurationMins: 30,
    defaultBpm: 90,
    modules: [],
    tasks:
      index === todayIndex
        ? [
            {
              id: "task-incomplete",
              text: "Practice scales",
              completed: false,
            },
            {
              id: "task-complete",
              text: "Practice arpeggios",
              completed: true,
            },
          ]
        : [],
  }));
  const html = renderRoutine("guitar", undefined, [], JSON.stringify(schedule));

  assert.match(html, /aria-label="Mark task complete: Practice scales"/);
  assert.match(html, /aria-label="Mark task incomplete: Practice arpeggios"/);
  assert.match(html, /aria-pressed="false"/);
  assert.match(html, /aria-pressed="true"/);
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
