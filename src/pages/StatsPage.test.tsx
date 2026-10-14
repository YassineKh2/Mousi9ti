import assert from "node:assert/strict";
import { it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { StatsPage } from "./StatsPage";
import { SettingsContext } from "../contexts/SettingsContext";
import { AppSettings, Session, TaskTimeAttribution } from "../types";

const durationSeconds = 600;
const settings = (taskTagsColored = false) =>
  ({ taskTagsColored }) as AppSettings;

function renderWithAttribution(
  source: TaskTimeAttribution["source"],
  attributedDurationSeconds = 240,
  taskTagsColored = false,
) {
  const endTime = Date.now();
  const startTime = endTime - durationSeconds * 1000;
  const session: Session = {
    id: "session-1",
    date: new Date().toISOString().slice(0, 10),
    startTime,
    endTime,
    durationSeconds,
    focus: "Fretboard Theory & Metronome Technique",
    bpmsUsed: [],
    highestBpm: 120,
    scalesPracticed: [],
    exercisesOpened: [],
    completed: true,
  };
  const attribution: TaskTimeAttribution = {
    id: "attribution-1",
    sessionId: "task-session-1",
    ...(source === "manual" ? { practiceSessionId: session.id } : {}),
    taskId: "custom-task",
    durationSeconds: attributedDurationSeconds,
    startedAt: source === "manual" ? endTime + 1000 : startTime + 60000,
    endedAt: source === "manual" ? endTime + 1000 : startTime + 300000,
    source,
    createdAt: endTime,
    updatedAt: endTime,
  };
  const saved = new Map([
    ["mous9iti_custom_tags", JSON.stringify(["Solo"])],
    [
      "mous9iti_tasks",
      JSON.stringify([{ id: "custom-task", text: "@custom(Solo)" }]),
    ],
    ["Mousi9ti_task_time_attributions_v1", JSON.stringify([attribution])],
  ]);
  const originalStorage = globalThis.localStorage;
  globalThis.localStorage = {
    getItem: (key: string) => saved.get(key) ?? null,
    setItem: (key: string, value: string) => {
      saved.set(key, value);
    },
  } as Storage;
  try {
    return renderToStaticMarkup(
      <SettingsContext.Provider value={settings(taskTagsColored)}>
        <StatsPage
          sessions={[session]}
          streak={{
            currentStreak: 1,
            longestStreak: 1,
            lastVisitDate: session.date,
            graceDaysUsed: 0,
            history: [],
          }}
        />
      </SettingsContext.Provider>,
    );
  } finally {
    globalThis.localStorage = originalStorage;
  }
}

for (const source of ["automatic", "manual"] as const) {
  it(`counts ${source} custom time without adding it twice`, () => {
    const html = renderWithAttribution(source);
    const analytics = html.slice(0, html.indexOf("Practice Log"));
    const sources = html.slice(
      html.indexOf("Practice Sources"),
      html.indexOf("Trends"),
    );
    assert.doesNotMatch(html, /Practice Coach/);
    assert.doesNotMatch(html, /Practice Focus \/ Breakdown/);
    assert.doesNotMatch(
      analytics,
      /Fretboard Theory & Metronome Technique|Technique|Fretboard Theory|Metronome Technique/,
    );
    assert.match(html, /General practice/);
    assert.match(html, /Peak vs Average BPM/);
    assert.match(html, /Peak BPM/);
    assert.match(html, /Average BPM/);
    const trends = html.slice(html.indexOf("Trends"));
    assert.match(trends, /bg-\[var\(--color-primary\)\]"><\/i>Minutes/);
    assert.match(trends, /bg-\[var\(--color-secondary\)\]"><\/i>Sessions/);
    assert.match(sources, /Solo/);
    assert.match(sources, />40%</);
    assert.match(html, />10m</);
  });
}

it("renders custom tags gray in the Practice Log when gray tags are selected", () => {
  const html = renderWithAttribution("automatic", 240);
  const practiceLog = html.slice(
    html.indexOf('<table class="stats-practice-log-table'),
    html.indexOf("</table>"),
  );

  assert.match(
    practiceLog,
    /border-outline-variant\/40 bg-surface-container-high text-on-surface-variant[^"]*"/,
  );
  assert.match(
    practiceLog,
    /style="background-color:var\(--color-surface-container-high\)"/,
  );
  assert.match(practiceLog, /class="[^"]*shrink-0[^"]*"/);
  assert.match(practiceLog, />Solo<\/span>/);
  assert.doesNotMatch(practiceLog, /@custom\(Solo\)/);
});

it("renders custom tags in color in the Practice Log when colored tags are selected", () => {
  const html = renderWithAttribution("automatic", 240, true);
  const practiceLog = html.slice(
    html.indexOf('<table class="stats-practice-log-table'),
    html.indexOf("</table>"),
  );

  assert.match(
    practiceLog,
    /bg-teal-500\/20 text-teal-300 border border-teal-500\/40 hover:bg-teal-500\/25[^"]*task-tag-badge--custom[^"]*"/,
  );
  assert.match(practiceLog, /class="[^"]*shrink-0[^"]*"/);
  assert.match(practiceLog, />Solo<\/span>/);
});

it("hides practice sources that round to zero minutes", () => {
  const html = renderWithAttribution("automatic", 0);
  const sources = html.slice(
    html.indexOf("Practice Sources"),
    html.indexOf("Trends"),
  );

  assert.doesNotMatch(sources, /Solo/);
});

it("shows bottom empty states when the selected dates have no chart data", () => {
  const saved = new Map([
    ["mous9iti_custom_tags", JSON.stringify(["Solo"])],
  ]);
  const originalStorage = globalThis.localStorage;
  globalThis.localStorage = {
    getItem: (key: string) => saved.get(key) ?? null,
    setItem: (key: string, value: string) => {
      saved.set(key, value);
    },
  } as Storage;

  try {
    const html = renderToStaticMarkup(
      <SettingsContext.Provider value={settings()}>
        <StatsPage
          sessions={[]}
          streak={{
            currentStreak: 0,
            longestStreak: 0,
            lastVisitDate: new Date().toISOString().slice(0, 10),
            graceDaysUsed: 0,
            history: [],
          }}
        />
      </SettingsContext.Provider>,
    );
    const bpm = html.slice(
      html.indexOf("Peak vs Average BPM"),
      html.indexOf("Practice Sources"),
    );
    const sources = html.slice(
      html.indexOf("Practice Sources"),
      html.indexOf("Trends"),
    );
    const trends = html.slice(html.indexOf("Trends"));

    assert.match(bpm, /No BPM data for these dates/);
    assert.doesNotMatch(bpm, />\s*Peak BPM<|>\s*Average BPM</);
    assert.match(sources, /No practice data for these dates/);
    assert.match(trends, /No practice data for these dates/);
    assert.doesNotMatch(trends, />Minutes<\/span>|>Sessions<\/span>/);
    assert.doesNotMatch(
      sources,
      /Breakdown shows how much time was spent on each practice source/,
    );
    assert.doesNotMatch(sources, /Total Practice/);
  } finally {
    globalThis.localStorage = originalStorage;
  }
});

it("counts task completions and in-progress tasks once within the Monday-based week", () => {
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setHours(0, 0, 0, 0);
  weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7));
  const currentWeekTimestamp = weekStart.getTime() + 60_000;
  const oldTimestamp = currentWeekTimestamp - 7 * 86400000;
  const today = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("-");
  const saved = new Map([
    [
      "Mousi9ti_task_activities_v1",
      JSON.stringify([
        {
          id: "completed-start",
          taskId: "completed-task",
          taskText: "Completed",
          date: today,
          timestamp: currentWeekTimestamp,
          kind: "started",
          durationSeconds: 0,
          area: "Custom",
        },
        {
          id: "completed-done",
          taskId: "completed-task",
          taskText: "Completed",
          date: today,
          timestamp: currentWeekTimestamp + 1,
          kind: "completed",
          durationSeconds: 0,
          area: "Custom",
        },
        {
          id: "open-start",
          taskId: "open-task",
          taskText: "Still in progress",
          date: today,
          timestamp: currentWeekTimestamp + 2,
          kind: "started",
          durationSeconds: 0,
          area: "Custom",
        },
        {
          id: "old-completion",
          taskId: "old-task",
          taskText: "Previous week",
          date: today,
          timestamp: oldTimestamp,
          kind: "completed",
          durationSeconds: 0,
          area: "Custom",
        },
      ]),
    ],
  ]);
  const originalStorage = globalThis.localStorage;
  globalThis.localStorage = {
    getItem: (key: string) => saved.get(key) ?? null,
    setItem: (key: string, value: string) => {
      saved.set(key, value);
    },
  } as Storage;

  try {
    const html = renderToStaticMarkup(
      <SettingsContext.Provider value={settings()}>
        <StatsPage
          sessions={[]}
          streak={{
            currentStreak: 0,
            longestStreak: 0,
            lastVisitDate: today,
            graceDaysUsed: 0,
            history: [],
          }}
        />
      </SettingsContext.Provider>,
    );
    const completionHeading = html.indexOf("Task Completion");
    const completion = html.slice(
      html.lastIndexOf("<section", completionHeading),
      html.indexOf("</section>", completionHeading),
    );

    assert.match(completion, /<b>50%<\/b>/);
    assert.match(completion, />1<span class="ml-4 text-on-surface-variant">Completed<\/span>/);
    assert.match(completion, />1<span class="ml-4 text-on-surface-variant">In progress<\/span>/);
  } finally {
    globalThis.localStorage = originalStorage;
  }
});

it("paginates analytics and limits individual tasks to custom activities", () => {
  const timestamp = Date.now();
  const date = new Date(timestamp).toISOString().slice(0, 10);
  const customActivities = Array.from({ length: 9 }, (_, index) => ({
    id: `custom-${index + 1}`,
    taskId: `custom-task-${index + 1}`,
    taskText: `Custom task ${index + 1} @custom(Activity ${index + 1})`,
    date,
    timestamp: timestamp - index,
    kind: "completed",
    durationSeconds: (10 - index) * 60,
    area: "Custom",
    source: "custom",
    tags: ["custom"],
  }));
  const saved = new Map([
    [
      "Mousi9ti_task_activities_v1",
      JSON.stringify([
        ...customActivities,
        {
          id: "ordinary-task",
          taskId: "ordinary-task",
          taskText: "Standard scales",
          date,
          timestamp,
          kind: "completed",
          durationSeconds: 3600,
          area: "Scales",
          source: "task",
          tags: [],
        },
      ]),
    ],
  ]);
  const originalStorage = globalThis.localStorage;
  globalThis.localStorage = {
    getItem: (key: string) => saved.get(key) ?? null,
    setItem: (key: string, value: string) => {
      saved.set(key, value);
    },
  } as Storage;

  try {
    const html = renderToStaticMarkup(
      <SettingsContext.Provider value={settings()}>
        <StatsPage
          sessions={[]}
          streak={{
            currentStreak: 0,
            longestStreak: 0,
            lastVisitDate: date,
            graceDaysUsed: 0,
            history: [],
          }}
        />
      </SettingsContext.Provider>,
    );

    assert.doesNotMatch(html, /Practice Coach/);
    assert.doesNotMatch(html, /YOUR FOCUS/);
    assert.doesNotMatch(html, /PRACTICE HEALTH/);
    assert.doesNotMatch(html, /CUSTOM ACTIVITY LIST/);
  } finally {
    globalThis.localStorage = originalStorage;
  }
});
