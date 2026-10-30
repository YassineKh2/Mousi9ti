import assert from "node:assert/strict";
import { beforeEach, it } from "node:test";
import {
  getTaskInstrument,
  migrateInstrumentData,
  normalizeInstrument,
  resolveRecordInstrument,
} from "./instruments";
import {
  getSavedPracticeActivities,
  getSavedSessions,
  getSavedSettings,
  getSavedTaskActivities,
  getSavedTaskAttributions,
  recordPracticeActivity,
  recordTaskActivity,
  replaceTaskAttributionsForSession,
  saveSession,
  saveSettings,
  saveTaskAttribution,
} from "./storage";
import { getBackupCategory, restoreAppBackup } from "./appBackup";
import type { Session, TaskTimeAttribution } from "../types";

class MockStorage {
  data = new Map<string, string>();
  writes = 0;
  get length() {
    return this.data.size;
  }
  key(index: number) {
    return [...this.data.keys()][index] ?? null;
  }
  getItem(key: string) {
    return this.data.get(key) ?? null;
  }
  setItem(key: string, value: string) {
    this.writes += 1;
    this.data.set(key, String(value));
  }
  removeItem(key: string) {
    this.data.delete(key);
  }
  clear() {
    this.data.clear();
  }
}

let storage: MockStorage;
const put = (key: string, value: unknown) =>
  storage.setItem(key, JSON.stringify(value));
const get = (key: string) => JSON.parse(storage.getItem(key) || "null");
beforeEach(() => {
  storage = new MockStorage();
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: storage,
  });
});

it("captures piano once, normalizes missing fields repeatedly, and makes no writes on rerun", () => {
  put("Mousi9ti_settings_v1", { defaultInstrument: "piano" });
  put("mous9iti_tasks", [{ id: "task" }]);
  put("Mousi9ti_sessions_v1", [{ id: "session" }]);
  migrateInstrumentData();
  assert.equal(getTaskInstrument("task"), "piano");
  assert.equal(get("mous9iti_tasks")[0].instrumentInferred, undefined);
  assert.equal(get("Mousi9ti_sessions_v1")[0].instrumentInferred, true);
  const writes = storage.writes;
  migrateInstrumentData();
  assert.equal(storage.writes, writes);
  put("Mousi9ti_settings_v1", { defaultInstrument: "guitar" });
  put("Mousi9ti_sessions_v1", [...get("Mousi9ti_sessions_v1"), { id: "late" }]);
  migrateInstrumentData();
  assert.equal(get("Mousi9ti_sessions_v1")[1].instrument, "piano");
});

it("assigns all legacy stats to the rollout default without changing history or moving it later", () => {
  put("Mousi9ti_settings_v1", { defaultInstrument: "piano" });
  put("mous9iti_tasks", [
    { id: "legacy-task", text: "Scales", completed: true },
  ]);
  const collections = {
    Mousi9ti_sessions_v1: [
      {
        id: "legacy-session",
        date: "2025-01-03",
        startTime: 1000,
        endTime: 61000,
        durationSeconds: 60,
      },
    ],
    Mousi9ti_task_activities_v1: [
      {
        id: "legacy-event",
        taskId: "legacy-task",
        date: "2025-01-03",
        timestamp: 61000,
        kind: "completed",
        durationSeconds: 30,
      },
    ],
    Mousi9ti_practice_activities_v1: [
      {
        id: "legacy-practice",
        source: "session",
        sourceId: "legacy-session",
        date: "2025-01-03",
        durationSeconds: 60,
      },
    ],
    Mousi9ti_task_time_attributions_v1: [
      {
        id: "legacy-attribution",
        taskId: "legacy-task",
        practiceSessionId: "legacy-session",
        startedAt: 1000,
        endedAt: 31000,
        durationSeconds: 30,
      },
    ],
  };
  for (const [key, records] of Object.entries(collections)) put(key, records);

  migrateInstrumentData();
  for (const [key, records] of Object.entries(collections)) {
    assert.deepEqual(
      get(key),
      records.map((record) => ({
        ...record,
        instrument: "piano",
        instrumentInferred: true,
      })),
    );
  }

  saveSettings({ ...getSavedSettings(), defaultInstrument: "guitar" });
  const writes = storage.writes;
  migrateInstrumentData();
  assert.equal(storage.writes, writes);
  for (const [key, records] of Object.entries(collections)) {
    assert.deepEqual(
      get(key),
      records.map((record) => ({
        ...record,
        instrument: "piano",
        instrumentInferred: true,
      })),
    );
  }
});

it("falls back to guitar for invalid settings and unknown values", () => {
  put("Mousi9ti_settings_v1", { defaultInstrument: "violin" });
  put("Mousi9ti_sessions_v1", [{ id: "session", instrument: "invalid" }]);
  migrateInstrumentData();
  assert.equal(get("Mousi9ti_sessions_v1")[0].instrument, "guitar");
  assert.equal(normalizeInstrument("piano"), "piano");
  assert.equal(normalizeInstrument(undefined), "guitar");
  assert.equal(normalizeInstrument("Piano"), "guitar");
  assert.equal(getTaskInstrument("missing"), undefined);
});

it("links tasks before sessions, preserves originals, and restores active-session association", () => {
  put("mous9iti_tasks", [{ id: "task" }]);
  put("mous9iti_weekly_schedule", [
    { day: "MON", tasks: [{ id: "task", instrument: "piano" }] },
  ]);
  put("Mousi9ti_sessions_v1", [
    { id: "session", instrument: "guitar" },
    { id: "linked", taskId: "task" },
  ]);
  put("Mousi9ti_task_activities_v1", [{ id: "event", taskId: "task" }]);
  put("Mousi9ti_practice_activities_v1", [
    { id: "practice", source: "session", sourceId: "session" },
    { id: "child", parentActivityId: "practice" },
    {
      id: "original",
      taskId: "task",
      instrument: "guitar",
      instrumentInferred: false,
    },
  ]);
  put("Mousi9ti_task_time_attributions_v1", [
    { id: "attribution", taskId: "task", practiceSessionId: "session" },
    { id: "deleted-task", taskId: "deleted", practiceSessionId: "linked" },
  ]);
  storage.setItem("Mousi9ti_session_is_active", "true");
  storage.setItem("Mousi9ti_active_task_id", "task");
  put("Mousi9ti_task_active_segment", { taskId: "task", sessionId: "session" });
  migrateInstrumentData();
  assert.equal(getTaskInstrument("task"), "piano");
  assert.equal(get("Mousi9ti_sessions_v1")[1].instrument, "piano");
  assert.equal(get("Mousi9ti_task_activities_v1")[0].instrument, "piano");
  assert.deepEqual(
    get("Mousi9ti_practice_activities_v1").map(
      (record: { instrument: string }) => record.instrument,
    ),
    ["guitar", "guitar", "guitar"],
  );
  assert.equal(
    get("Mousi9ti_practice_activities_v1")[2].instrumentInferred,
    false,
  );
  assert.deepEqual(
    get("Mousi9ti_task_time_attributions_v1").map(
      (record: { instrument: string }) => record.instrument,
    ),
    ["piano", "piano"],
  );
  assert.equal(storage.getItem("Mousi9ti_session_instrument"), "piano");
  assert.equal(get("Mousi9ti_task_active_segment").instrument, "piano");
  assert.equal(resolveRecordInstrument({ taskId: "task" }), "piano");
});

const session: Session = {
  id: "session",
  date: "2026-10-30",
  startTime: 1,
  endTime: 61,
  durationSeconds: 60,
  bpmsUsed: [],
  highestBpm: 0,
  scalesPracticed: [],
  exercisesOpened: [],
  focus: "",
  completed: true,
};
const attribution: TaskTimeAttribution = {
  id: "attribution",
  sessionId: "session",
  taskId: "task",
  durationSeconds: 60,
  startedAt: 1,
  endedAt: 61,
  source: "automatic",
  createdAt: 1,
  updatedAt: 61,
};

it("normalizes old-client writes using task, session, and saved assignment before default", () => {
  put("Mousi9ti_settings_v1", { defaultInstrument: "guitar" });
  put("mous9iti_tasks", [{ id: "task", instrument: "piano" }]);
  saveSession({ ...session, instrument: "piano", instrumentInferred: true });
  saveSession({ ...session, focus: "legacy update" });
  assert.equal(getSavedSessions()[0].instrument, "piano");
  assert.equal(getSavedSessions()[0].instrumentInferred, true);
  saveTaskAttribution(attribution);
  assert.equal(getSavedTaskAttributions()[0].instrument, "piano");
  saveTaskAttribution({ ...attribution, instrument: "guitar" });
  saveTaskAttribution(attribution);
  assert.equal(getSavedTaskAttributions()[0].instrument, "piano");
  replaceTaskAttributionsForSession("session", [
    { ...attribution, id: "replacement" },
  ]);
  assert.equal(getSavedTaskAttributions()[0].instrument, "piano");
  recordTaskActivity({ id: "task", text: "Scales" }, "started");
  assert.equal(getSavedTaskActivities()[0].instrument, "piano");
  const practice = recordPracticeActivity({
    source: "session",
    sourceId: "session",
    startTime: 1,
    endTime: 61,
    durationSeconds: 60,
    area: "Practice",
    tags: [],
  });
  assert.equal(practice.instrument, "piano");
  assert.equal(practice.instrumentInferred, undefined);
  assert.equal(getSavedPracticeActivities()[0].instrument, "piano");
  const linked = recordPracticeActivity({
    source: "task",
    taskId: "task",
    startTime: 1,
    endTime: 61,
    durationSeconds: 60,
    area: "Practice",
    tags: [],
    instrument: "guitar",
  });
  assert.equal(linked.instrument, "piano");
  saveSession({ ...session, id: "unlinked" });
  assert.equal(getSavedSessions()[0].instrument, "guitar");
});

it("captures the original default before a settings update and inherits restored session instrument", () => {
  put("Mousi9ti_settings_v1", { defaultInstrument: "piano" });
  put("Mousi9ti_sessions_v1", [{ ...session }]);
  storage.setItem("Mousi9ti_session_is_active", "true");
  saveSettings({ ...getSavedSettings(), defaultInstrument: "guitar" });
  assert.equal(getSavedSessions()[0].instrument, "piano");
  assert.equal(
    storage.getItem("Mousi9ti_instrument_migration_default_v1"),
    "piano",
  );
  saveSession({ ...session, id: "restored" });
  assert.equal(getSavedSessions()[0].instrument, "piano");
});

it("migrates a legacy backup after restore using its settings and includes the active instrument with tasks", () => {
  restoreAppBackup({
    app: "Mousi9ti",
    formatVersion: 1,
    exportedAt: "2026-10-30",
    storage: {
      Mousi9ti_settings_v1: JSON.stringify({ defaultInstrument: "piano" }),
      Mousi9ti_sessions_v1: JSON.stringify([session]),
      mous9iti_tasks: JSON.stringify([{ id: "task" }]),
    },
  });
  assert.equal(getSavedSessions()[0].instrument, "piano");
  assert.equal(getTaskInstrument("task"), "piano");
  assert.equal(
    getBackupCategory("Mousi9ti_session_instrument"),
    "tasks-practice",
  );
  const writes = storage.writes;
  migrateInstrumentData();
  assert.equal(storage.writes, writes);
});

it("keeps conflicting valid task copies and uses consistent daily-task precedence", () => {
  put("mous9iti_tasks", [{ id: "task", instrument: "piano" }]);
  put("mous9iti_weekly_schedule", [
    { day: "MON", tasks: [{ id: "task", instrument: "guitar" }] },
  ]);
  put("Mousi9ti_task_activities_v1", [{ id: "activity", taskId: "task" }]);
  migrateInstrumentData();
  assert.equal(getTaskInstrument("task"), "piano");
  assert.equal(resolveRecordInstrument({ taskId: "task" }), "piano");
  assert.equal(get("Mousi9ti_task_activities_v1")[0].instrument, "piano");
  assert.equal(
    get("mous9iti_weekly_schedule")[0].tasks[0].instrument,
    "guitar",
  );
});

it("handles malformed collections, duplicate IDs, and cyclic links without losing task links", () => {
  storage.setItem("mous9iti_weekly_schedule", "not JSON");
  put("mous9iti_tasks", [null, { id: "task", instrument: "piano" }]);
  put("Mousi9ti_sessions_v1", [
    null,
    { id: "duplicate", taskId: "task" },
    { id: "duplicate", taskId: "task" },
    { parentActivityId: "cycle" },
    { id: "cycle", parentActivityId: "cycle" },
  ]);
  migrateInstrumentData();
  assert.equal(storage.getItem("mous9iti_weekly_schedule"), "not JSON");
  assert.deepEqual(
    get("Mousi9ti_sessions_v1")
      .slice(1)
      .map((record: { instrument: string }) => record.instrument),
    ["piano", "piano", "guitar", "guitar"],
  );
});

it("uses the current piano default for new omitted fields, not the historical migration default", () => {
  migrateInstrumentData();
  saveSettings({ ...getSavedSettings(), defaultInstrument: "piano" });
  saveSession(session);
  assert.equal(getSavedSessions()[0].instrument, "piano");
  assert.equal(getSavedSessions()[0].instrumentInferred, undefined);
  const activity = recordPracticeActivity({
    source: "timer",
    startTime: 1,
    endTime: 61,
    durationSeconds: 60,
    area: "Practice",
    tags: [],
  });
  assert.equal(activity.instrument, "piano");
  assert.equal(
    storage.getItem("Mousi9ti_instrument_migration_default_v1"),
    "guitar",
  );
});

it("preserves a paused active instrument and ignores a stale inactive association on new saves", () => {
  storage.setItem("Mousi9ti_session_is_active", "false");
  storage.setItem("Mousi9ti_session_accumulated", "60");
  storage.setItem("Mousi9ti_session_instrument", "piano");
  migrateInstrumentData();
  assert.equal(storage.getItem("Mousi9ti_session_instrument"), "piano");
  saveSession(session);
  assert.equal(getSavedSessions()[0].instrument, "piano");
  storage.setItem("Mousi9ti_session_accumulated", "0");
  saveSession({ ...session, id: "new" });
  assert.equal(getSavedSessions()[0].instrument, "guitar");
});

it("rolls back the original storage if migration fails during backup restore", () => {
  put("mous9iti_tasks", [{ id: "original", instrument: "guitar" }]);
  const original = [...storage.data];
  const setItem = storage.setItem.bind(storage);
  let shouldFail = true;
  storage.setItem = (key, value) => {
    if (key === "Mousi9ti_instrument_migration_default_v1" && shouldFail) {
      shouldFail = false;
      throw new Error("Storage full");
    }
    setItem(key, value);
  };
  assert.throws(
    () =>
      restoreAppBackup({
        app: "Mousi9ti",
        formatVersion: 1,
        exportedAt: "2026-10-30",
        storage: { Mousi9ti_sessions_v1: JSON.stringify([session]) },
      }),
    /Existing data was restored/,
  );
  assert.deepEqual([...storage.data], original);
});
