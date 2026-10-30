import assert from "node:assert/strict";
import { it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  StatsPage,
  countStatisticsActivities,
  filterStatisticsRecords,
  getDefaultStatisticsScope,
  getStatisticsPracticeDates,
  getStatisticsStreak,
} from "./StatsPage";
import { SettingsContext } from "../contexts/SettingsContext";
import {
  AppSettings,
  PracticeTask,
  Session,
  TaskActivity,
  TaskTimeAttribution,
} from "../types";

const durationSeconds = 600;
it("keeps bass statistics distinct from guitar and piano", () => {
  const records = [{ instrument: "bass" }, { instrument: "guitar" }, { instrument: "piano" }];
  assert.deepEqual(filterStatisticsRecords(records, "bass"), [records[0]]);
  assert.deepEqual(filterStatisticsRecords(records, "guitar"), [records[1]]);
  assert.equal(getDefaultStatisticsScope("bass"), "bass");
  assert.equal(filterStatisticsRecords(records, "all").length, 3);
});
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
  const saved = new Map([["mous9iti_custom_tags", JSON.stringify(["Solo"])]]);
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
    assert.match(
      completion,
      />1<span class="ml-4 text-on-surface-variant">Completed<\/span>/,
    );
    assert.match(
      completion,
      />1<span class="ml-4 text-on-surface-variant">In progress<\/span>/,
    );
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

it("defaults only to a valid saved instrument, never to all or an invalid value", () => {
  assert.equal(getDefaultStatisticsScope("piano"), "piano");
  for (const value of ["guitar", "all", "violin", "", undefined, null, 1]) {
    assert.equal(getDefaultStatisticsScope(value), "guitar");
  }
});

it("scopes every record category without mutating dates, order, or legacy records", () => {
  for (const category of [
    "sessions",
    "practice",
    "tasks",
    "attributions",
    "today tasks",
    "schedule tasks",
  ]) {
    const records = [
      { id: `${category}-guitar`, instrument: "guitar", date: "2026-03-08" },
      { id: `${category}-piano`, instrument: "piano", date: "2026-03-09" },
      { id: `${category}-legacy`, date: "2026-03-10" },
    ];
    const before = JSON.stringify(records);
    assert.deepEqual(filterStatisticsRecords(records, "guitar"), [
      records[0],
      records[2],
    ]);
    assert.deepEqual(filterStatisticsRecords(records, "piano"), [records[1]]);
    assert.deepEqual(filterStatisticsRecords(records, "all"), records);
    assert.equal(filterStatisticsRecords(records, "piano")[0], records[1]);
    assert.equal(JSON.stringify(records), before);
  }
});

const scopedTask = (
  instrument: "guitar" | "piano",
  id = "shared",
): PracticeTask & { instrument: "guitar" | "piano" } => ({
  id,
  instrument,
  text: "Scheduled practice",
  completed: false,
});
const scopedCompletion = (
  instrument: "guitar" | "piano",
  date: string,
): TaskActivity & { instrument: "guitar" | "piano" } => ({
  id: `${instrument}-${date}`,
  instrument,
  taskId: "shared",
  taskText: "Scheduled practice",
  date,
  timestamp: Date.parse(`${date}T12:00:00`),
  kind: "completed",
  durationSeconds: 60,
  area: "Scales",
});

it("requires both instruments' same-ID planned tasks in all scope but only scoped tasks individually", () => {
  const today = "2026-10-30";
  const tasks = [scopedTask("guitar"), scopedTask("piano")];
  const events = [scopedCompletion("guitar", today)];
  assert.deepEqual(
    getStatisticsPracticeDates([], events, tasks, new Map(), today),
    [],
  );
  assert.deepEqual(
    getStatisticsPracticeDates(
      [],
      events,
      filterStatisticsRecords(tasks, "guitar"),
      new Map(),
      today,
    ),
    [today],
  );
  assert.deepEqual(
    getStatisticsPracticeDates(
      [],
      [...events, scopedCompletion("piano", today)],
      tasks,
      new Map(),
      today,
    ),
    [today],
  );
});

it("filters recurring schedules before completion and preserves task date visibility", () => {
  const date = "2026-10-29";
  const today = "2026-10-30";
  const tasks = [
    scopedTask("guitar"),
    scopedTask("piano"),
    { ...scopedTask("guitar", "hidden"), hiddenDates: [date] },
    {
      ...scopedTask("guitar", "future"),
      startsAt: Date.parse("2026-11-01T00:00:00"),
    },
  ];
  const events = [scopedCompletion("guitar", date)];
  const schedule = new Map([["THU", filterStatisticsRecords(tasks, "guitar")]]);
  assert.deepEqual(
    getStatisticsPracticeDates([], events, null, schedule, today),
    [date],
  );
  assert.deepEqual(
    getStatisticsPracticeDates(
      [],
      events,
      null,
      new Map([["THU", tasks]]),
      today,
    ),
    [],
  );
});

it("keeps explicit empty schedules and only uses positive general sessions as the no-task fallback", () => {
  const today = "2026-10-30";
  const events = [scopedCompletion("guitar", today)];
  assert.deepEqual(
    getStatisticsPracticeDates([], events, [], new Map(), today),
    [],
  );
  assert.deepEqual(
    getStatisticsPracticeDates([], events, null, new Map(), today),
    [today],
  );
  for (const source of ["Custom", "Metronome", "Timer"]) {
    assert.deepEqual(
      getStatisticsPracticeDates(
        [{ date: today, source, durationSeconds: 60 }],
        [],
        [],
        new Map(),
        today,
      ),
      [],
    );
  }
  assert.deepEqual(
    getStatisticsPracticeDates(
      [{ date: today, source: "Session", durationSeconds: 60 }],
      [],
      [],
      new Map(),
      today,
    ),
    [today],
  );
});

it("recomputes combined streaks from distinct calendar dates with two missed days of grace", () => {
  const guitar = ["2026-10-23", "2026-10-27"];
  const piano = ["2026-10-25", "2026-10-27", "2026-10-29"];
  assert.deepEqual(getStatisticsStreak(guitar, "2026-10-30"), {
    currentStreak: 1,
    longestStreak: 1,
  });
  assert.deepEqual(getStatisticsStreak(piano, "2026-10-30"), {
    currentStreak: 3,
    longestStreak: 3,
  });
  assert.deepEqual(getStatisticsStreak([...guitar, ...piano], "2026-10-30"), {
    currentStreak: 4,
    longestStreak: 4,
  });
  assert.deepEqual(getStatisticsStreak(piano, "2026-11-02"), {
    currentStreak: 0,
    longestStreak: 3,
  });
});

it("keeps streak calendar arithmetic stable across DST, ignores future dates, and retains longest history", () => {
  assert.deepEqual(
    getStatisticsStreak(
      ["2026-03-07", "2026-03-08", "2026-03-09", "2026-03-09", "2026-04-01"],
      "2026-03-09",
    ),
    { currentStreak: 3, longestStreak: 3 },
  );
  assert.deepEqual(getStatisticsStreak([], "2026-03-09"), {
    currentStreak: 0,
    longestStreak: 0,
  });
});

it("deduplicates within instruments but never suppresses overlapping cross-instrument time in all scope", () => {
  type ActivityRecord = Parameters<typeof countStatisticsActivities>[0][number];
  const record = (overrides: Partial<ActivityRecord>): ActivityRecord => ({
    id: "shared-session",
    instrument: "guitar",
    date: "2026-10-30",
    startTime: 1000000,
    durationSeconds: 600,
    countedDurationSeconds: 600,
    source: "Session",
    area: "Scales",
    tags: [],
    ...overrides,
  });
  const guitarSession = record({});
  const guitarTask = record({
    id: "task",
    source: "Task",
    durationSeconds: 60,
    startTime: 1060000,
  });
  const pianoMetronome = record({
    id: "piano",
    instrument: "piano",
    source: "Metronome",
    durationSeconds: 60,
  });
  const guitarSegment = record({
    id: "segment",
    source: "Custom",
    practiceSessionId: "shared-session",
    durationSeconds: 240,
    countedDurationSeconds: 240,
  });
  const pianoSegment = record({
    id: "segment",
    instrument: "piano",
    source: "Custom",
    practiceSessionId: "shared-session",
    durationSeconds: 120,
    countedDurationSeconds: 120,
  });
  const pianoSession = record({ instrument: "piano" });
  const sum = (records: ActivityRecord[]) =>
    records.reduce(
      (total, activity) => total + activity.countedDurationSeconds,
      0,
    );

  const withoutPianoSession = countStatisticsActivities(
    [guitarSession, guitarTask, pianoMetronome, guitarSegment],
    [guitarSession],
    [guitarTask],
    [guitarSegment],
  );
  assert.deepEqual(
    withoutPianoSession.map((activity) => activity.countedDurationSeconds),
    [360, 0, 60, 240],
  );
  assert.equal(sum(withoutPianoSession), 660);

  const records = [
    guitarSession,
    pianoSession,
    guitarTask,
    pianoMetronome,
    guitarSegment,
    pianoSegment,
  ];
  const combined = countStatisticsActivities(
    records,
    [guitarSession, pianoSession],
    [guitarTask],
    [guitarSegment, pianoSegment],
  );
  assert.deepEqual(
    combined.map((activity) => activity.countedDurationSeconds),
    [360, 480, 0, 0, 240, 120],
  );
  assert.equal(sum(combined), 1200);
  assert.equal(
    guitarSession.countedDurationSeconds,
    600,
    "raw records must remain unchanged",
  );
});

function renderInstrumentFixture(defaultInstrument: string) {
  const now = new Date();
  const date = now.toISOString().slice(0, 10);
  const startTime = now.getTime() - 600_000;
  const instruments = ["guitar", "piano"] as const;
  const sessions = instruments.map((instrument) => ({
    id: `${instrument}-session`,
    instrument,
    date,
    startTime,
    endTime: now.getTime(),
    durationSeconds: 600,
    focus: `${instrument} session`,
    bpmsUsed: [100, 120],
    highestBpm: 120,
    scalesPracticed: [],
    exercisesOpened: [],
    completed: true,
  }));
  const saved = new Map([
    ["Mousi9ti_settings_v1", JSON.stringify({ defaultInstrument })],
    [
      "mous9iti_tasks",
      JSON.stringify(
        instruments.map((instrument) => ({
          ...scopedTask(instrument),
          text: `@custom(${instrument} custom)`,
        })),
      ),
    ],
    [
      "mous9iti_weekly_schedule",
      JSON.stringify([
        {
          day: ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"][now.getDay()],
          tasks: instruments.map((instrument) => scopedTask(instrument)),
        },
      ]),
    ],
    [
      "Mousi9ti_task_activities_v1",
      JSON.stringify(
        instruments.flatMap((instrument) => [
          {
            ...scopedCompletion(instrument, date),
            id: `${instrument}-start`,
            kind: "started",
            timestamp: startTime,
            durationSeconds: 0,
          },
          {
            ...scopedCompletion(instrument, date),
            timestamp: startTime + 1,
            plannedDurationSeconds: instrument === "piano" ? 120 : 5400,
          },
        ]),
      ),
    ],
    [
      "Mousi9ti_practice_activities_v1",
      JSON.stringify(
        instruments.map((instrument) => ({
          id: `${instrument}-practice`,
          instrument,
          date,
          startTime: startTime - 300_000,
          endTime: startTime,
          durationSeconds: instrument === "piano" ? 120 : 3600,
          source: "metronome",
          area: `${instrument} rhythm`,
          tags: [],
          bpm: instrument === "piano" ? 80 : 200,
        })),
      ),
    ],
    [
      "Mousi9ti_task_time_attributions_v1",
      JSON.stringify(
        instruments.map((instrument) => ({
          id: `${instrument}-attribution`,
          instrument,
          taskId: "shared",
          sessionId: "task-session",
          practiceSessionId: `${instrument}-session`,
          durationSeconds: 240,
          startedAt: startTime + 60_000,
          endedAt: startTime + 300_000,
          source: "automatic",
          createdAt: startTime,
          updatedAt: startTime,
        })),
      ),
    ],
  ]);
  const originalStorage = globalThis.localStorage;
  let writes = 0;
  globalThis.localStorage = {
    length: saved.size,
    clear: () => {
      writes += 1;
    },
    key: (index: number) => [...saved.keys()][index] ?? null,
    removeItem: () => {
      writes += 1;
    },
    getItem: (key: string) => saved.get(key) ?? null,
    setItem: () => {
      writes += 1;
    },
  } as Storage;
  try {
    const html = renderToStaticMarkup(
      <SettingsContext.Provider value={settings()}>
        <StatsPage
          sessions={sessions}
          streak={{
            currentStreak: 999,
            longestStreak: 999,
            lastVisitDate: date,
            graceDaysUsed: 0,
            history: [],
          }}
        />
      </SettingsContext.Provider>,
    );
    assert.equal(
      writes,
      0,
      "viewing statistics must not update settings, active instrument, or global streak",
    );
    return html;
  } finally {
    globalThis.localStorage = originalStorage;
  }
}

it("initializes the accessible scope selector from storage, independently of context and global streak", () => {
  const html = renderInstrumentFixture("piano");
  assert.match(html, /aria-label="Statistics instrument"/);
  assert.match(html, /<option value="piano" selected="">Piano<\/option>/);
  assert.doesNotMatch(html, /guitar session|guitar rhythm|guitar custom|999/);
  assert.match(html, /piano session/);
  assert.match(html, /piano rhythm/);
  assert.match(html, /piano custom/);
  assert.match(html, />12m</);
  assert.match(html, /Longest: 1 day \(all time\)/);
  const completion = html.slice(
    html.indexOf("Task Completion"),
    html.indexOf("Practice Log"),
  );
  assert.match(completion, /<b>100%<\/b>/);
  assert.match(completion, /2m/);
  assert.doesNotMatch(completion, /1h 30m/);
});

it("falls back to guitar for invalid saved defaults and excludes every piano contribution", () => {
  const html = renderInstrumentFixture("violin");
  assert.match(html, /<option value="guitar" selected="">Guitar<\/option>/);
  assert.doesNotMatch(html, /piano session|piano rhythm|piano custom/);
  assert.match(html, /guitar custom/);
  assert.match(html, />1h 10m</);
});
