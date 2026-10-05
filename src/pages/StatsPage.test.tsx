import assert from "node:assert/strict";
import { it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { StatsPage } from "./StatsPage";
import { Session, TaskTimeAttribution } from "../types";

const durationSeconds = 600;

function renderWithAttribution(
  source: TaskTimeAttribution["source"],
  attributedDurationSeconds = 240,
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
      <StatsPage
        sessions={[session]}
        streak={{
          currentStreak: 1,
          longestStreak: 1,
          lastVisitDate: session.date,
          graceDaysUsed: 0,
          history: [],
        }}
      />,
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
    assert.doesNotMatch(html, /Practice Focus \/ Breakdown/);
    assert.doesNotMatch(
      analytics,
      /Fretboard Theory & Metronome Technique|Technique|Fretboard Theory|Metronome Technique/,
    );
    assert.match(html, /General practice/);
    assert.match(html, /Peak vs Average BPM/);
    assert.match(html, /Peak BPM/);
    assert.match(html, /Average BPM/);
    assert.match(sources, /Solo/);
    assert.match(sources, />40%</);
    assert.match(html, />10m</);
  });
}

it("hides practice sources that round to zero minutes", () => {
  const html = renderWithAttribution("automatic", 0);
  const sources = html.slice(
    html.indexOf("Practice Sources"),
    html.indexOf("Trends"),
  );

  assert.doesNotMatch(sources, /Solo/);
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
      <StatsPage
        sessions={[]}
        streak={{
          currentStreak: 0,
          longestStreak: 0,
          lastVisitDate: date,
          graceDaysUsed: 0,
          history: [],
        }}
      />,
    );
    const analytics = html.slice(
      html.indexOf("Custom Activities and Individual Task Analytics"),
      html.indexOf("Practice Log"),
    );

    assert.match(analytics, /Page 1 of 2/);
    assert.match(analytics, /Custom task 1/);
    assert.doesNotMatch(analytics, /Custom task 9/);
    assert.doesNotMatch(analytics, /Standard scales/);
  } finally {
    globalThis.localStorage = originalStorage;
  }
});
