import type { PracticeInstrument } from "../types";

const KEYS = {
  settings: "Mousi9ti_settings_v1",
  migrationDefault: "Mousi9ti_instrument_migration_default_v1",
  tasks: "mous9iti_tasks",
  schedule: "mous9iti_weekly_schedule",
  sessions: "Mousi9ti_sessions_v1",
  taskActivities: "Mousi9ti_task_activities_v1",
  practiceActivities: "Mousi9ti_practice_activities_v1",
  attributions: "Mousi9ti_task_time_attributions_v1",
  activeInstrument: "Mousi9ti_session_instrument",
  activeSegment: "Mousi9ti_task_active_segment",
} as const;

type StoredRecord = Record<string, unknown>;
type InstrumentRecord = {
  instrument?: PracticeInstrument;
  instrumentInferred?: boolean;
  taskId?: string;
  sessionId?: string;
  practiceSessionId?: string;
  source?: string;
  sourceId?: string;
  parentActivityId?: string;
};

function isInstrument(value: unknown): value is PracticeInstrument {
  return value === "guitar" || value === "piano" || value === "bass";
}

export function normalizeInstrument(value: unknown): PracticeInstrument {
  return isInstrument(value) ? value : "guitar";
}

function isRecord(value: unknown): value is StoredRecord {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function read(key: string): unknown {
  try {
    return JSON.parse(localStorage.getItem(key) || "null");
  } catch {
    return null;
  }
}

function records(key: string): StoredRecord[] {
  const value = read(key);
  return Array.isArray(value) ? value.filter(isRecord) : [];
}

function savedDefault(): PracticeInstrument {
  const settings = read(KEYS.settings);
  return normalizeInstrument(
    isRecord(settings) ? settings.defaultInstrument : undefined,
  );
}

function taskRecords(): StoredRecord[] {
  return [
    ...records(KEYS.tasks),
    ...records(KEYS.schedule).flatMap((day) =>
      Array.isArray(day.tasks) ? day.tasks.filter(isRecord) : [],
    ),
  ];
}

export function getTaskInstrument(
  taskId: string,
): PracticeInstrument | undefined {
  return taskInstrumentMap(taskRecords()).get(taskId);
}

function taskInstrumentMap(
  tasks: StoredRecord[],
): Map<unknown, PracticeInstrument> {
  const instruments = new Map<unknown, PracticeInstrument>();
  for (const task of tasks) {
    if (
      typeof task.id === "string" &&
      isInstrument(task.instrument) &&
      !instruments.has(task.id)
    ) {
      instruments.set(task.id, task.instrument);
    }
  }
  return instruments;
}

function linkedIds(record: StoredRecord): unknown[] {
  return [
    record.practiceSessionId,
    record.sessionId,
    record.source === "session" ? record.sourceId : undefined,
    record.parentActivityId,
  ];
}

function resolveLinked(
  record: StoredRecord,
  tasks: Map<unknown, PracticeInstrument>,
  history: Map<unknown, StoredRecord>,
  seen = new Set<StoredRecord>(),
): PracticeInstrument | undefined {
  if (isInstrument(record.instrument)) return record.instrument;
  const taskInstrument = tasks.get(record.taskId);
  if (taskInstrument) return taskInstrument;
  if (seen.has(record)) return undefined;
  seen.add(record);
  for (const id of linkedIds(record)) {
    const linked = history.get(id);
    const instrument = linked && resolveLinked(linked, tasks, history, seen);
    if (instrument) return instrument;
  }
  return undefined;
}

export function resolveRecordInstrument(record: {
  instrument?: PracticeInstrument;
  taskId?: string;
}): PracticeInstrument {
  const tasks = taskInstrumentMap(taskRecords());
  const history = new Map(
    [...records(KEYS.sessions), ...records(KEYS.practiceActivities)].map(
      (item) => [item.id, item],
    ),
  );
  return resolveLinked(record, tasks, history) ?? savedDefault();
}

export function normalizeInstrumentRecord<T extends InstrumentRecord>(
  record: T,
  previous?: InstrumentRecord,
): T {
  const taskInstrument = record.taskId && getTaskInstrument(record.taskId);
  if (taskInstrument) return { ...record, instrument: taskInstrument };
  if (isInstrument(previous?.instrument)) {
    return {
      ...record,
      instrument: previous.instrument,
      ...(previous.instrumentInferred === undefined
        ? {}
        : { instrumentInferred: previous.instrumentInferred }),
    };
  }
  if (isInstrument(record.instrument)) return record;
  return { ...record, instrument: resolveRecordInstrument(record) };
}

export function migrateInstrumentData(): void {
  const captured = localStorage.getItem(KEYS.migrationDefault);
  const fallback = isInstrument(captured) ? captured : savedDefault();
  if (!isInstrument(captured))
    localStorage.setItem(KEYS.migrationDefault, fallback);

  const tasks = taskRecords();
  const taskInstruments = taskInstrumentMap(tasks);
  const normalizeTask = (task: StoredRecord) => {
    if (!isInstrument(task.instrument)) {
      task.instrument = taskInstruments.get(task.id) ?? fallback;
      if (typeof task.id === "string") {
        taskInstruments.set(task.id, task.instrument as PracticeInstrument);
      }
    }
  };
  tasks.forEach(normalizeTask);

  const historyKeys = [
    KEYS.sessions,
    KEYS.taskActivities,
    KEYS.practiceActivities,
    KEYS.attributions,
  ];
  const collections = historyKeys.map((key) => ({ key, value: read(key) }));
  const history = new Map<unknown, StoredRecord>();
  const historyRecords: StoredRecord[] = [];
  for (const { value } of collections) {
    if (Array.isArray(value)) {
      for (const record of value.filter(isRecord)) {
        historyRecords.push(record);
        if (typeof record.id === "string" && !history.has(record.id))
          history.set(record.id, record);
      }
    }
  }
  const assignments = new Map<StoredRecord, PracticeInstrument>();
  for (const record of historyRecords) {
    assignments.set(
      record,
      resolveLinked(record, taskInstruments, history) ?? fallback,
    );
  }
  const persist = (key: string, value: unknown) => {
    const serialized = JSON.stringify(value);
    if (serialized !== localStorage.getItem(key))
      localStorage.setItem(key, serialized);
  };
  for (const key of [KEYS.tasks, KEYS.schedule]) {
    const value = read(key);
    if (!Array.isArray(value)) continue;
    for (const item of value.filter(isRecord)) {
      if (key === KEYS.tasks) normalizeTask(item);
      else if (Array.isArray(item.tasks))
        item.tasks.filter(isRecord).forEach(normalizeTask);
    }
    persist(key, value);
  }
  for (const { key, value } of collections) {
    if (!Array.isArray(value)) continue;
    for (const record of value.filter(isRecord)) {
      if (!isInstrument(record.instrument)) {
        record.instrument = assignments.get(record) ?? fallback;
        record.instrumentInferred = true;
      }
    }
    persist(key, value);
  }

  const segment = read(KEYS.activeSegment);
  const restored =
    localStorage.getItem("Mousi9ti_session_is_active") === "true" ||
    Number(localStorage.getItem("Mousi9ti_session_accumulated")) > 0;
  if (restored || isRecord(segment)) {
    let instrument = localStorage.getItem(KEYS.activeInstrument);
    if (!isInstrument(instrument)) {
      const taskId = localStorage.getItem("Mousi9ti_active_task_id");
      instrument =
        (taskId && taskInstruments.get(taskId)) ||
        (isRecord(segment) &&
          resolveLinked(segment, taskInstruments, history)) ||
        fallback;
      localStorage.setItem(KEYS.activeInstrument, instrument);
    }
    if (isRecord(segment) && !isInstrument(segment.instrument)) {
      segment.instrument =
        resolveLinked(segment, taskInstruments, history) ?? instrument;
      segment.instrumentInferred = true;
      persist(KEYS.activeSegment, segment);
    }
  }
}
