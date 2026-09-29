export const BACKUP_CATEGORIES = [
  "stats",
  "chords",
  "tasks-practice",
  "settings-layout",
] as const;

export type BackupCategory = (typeof BACKUP_CATEGORIES)[number];

export const BACKUP_CATEGORY_LABELS: Record<BackupCategory, string> = {
  stats: "Stats",
  chords: "Chords & Progressions",
  "tasks-practice": "Tasks & Practice",
  "settings-layout": "Settings & Layout",
};

export const BACKUP_CATEGORY_DESCRIPTIONS: Record<BackupCategory, string> = {
  stats: "Sessions, activity history, streaks, and task-time records.",
  chords: "Custom chords, saved chord selections, and builder progressions.",
  "tasks-practice": "Practice tasks, schedules, custom tags, and timer state.",
  "settings-layout":
    "App preferences, dashboard layout, and other saved options.",
};

export interface AppBackup {
  app: "Mousi9ti";
  formatVersion: 1;
  exportedAt: string;
  storage: Record<string, string>;
}

export function createAppBackup(): AppBackup {
  const storage: Record<string, string> = {};
  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index);
    if (key !== null) {
      const value = localStorage.getItem(key);
      if (value !== null) storage[key] = value;
    }
  }

  return {
    app: "Mousi9ti",
    formatVersion: 1,
    exportedAt: new Date().toISOString(),
    storage,
  };
}

export function downloadAppBackup(): void {
  const backup = createAppBackup();
  const blob = new Blob([JSON.stringify(backup, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `Mousi9ti-full-backup-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

export function parseAppBackup(value: unknown): AppBackup {
  if (!value || typeof value !== "object") {
    throw new Error("This file is not a valid Mousi9ti backup.");
  }

  const candidate = value as Partial<AppBackup>;
  if (
    candidate.app !== "Mousi9ti" ||
    candidate.formatVersion !== 1 ||
    typeof candidate.exportedAt !== "string" ||
    !candidate.storage ||
    typeof candidate.storage !== "object" ||
    Array.isArray(candidate.storage)
  ) {
    throw new Error("This file is not a supported Mousi9ti backup.");
  }

  for (const [key, storedValue] of Object.entries(candidate.storage)) {
    if (!key || typeof storedValue !== "string") {
      throw new Error("The backup contains invalid stored data.");
    }
  }

  return candidate as AppBackup;
}

export async function readAppBackupFile(file: File): Promise<AppBackup> {
  return parseAppBackup(JSON.parse(await file.text()));
}

export function getBackupCategory(key: string): BackupCategory {
  if (
    /^(Mousi9ti_sessions_v1|Mousi9ti_streak_v1|Mousi9ti_task_activities_v1|Mousi9ti_practice_activities_v1|Mousi9ti_task_time_attributions_v1|fretmaster_streak_v1)$/.test(
      key,
    )
  ) {
    return "stats";
  }
  if (
    /^(Mousi9ti_chord_selections_v1|Mousi9ti_custom_chords_v1|Mousi9ti_saved_progressions)$/.test(
      key,
    )
  ) {
    return "chords";
  }
  if (
    /^(mous9iti_tasks|mous9iti_weekly_schedule|mous9iti_custom_tags|Mousi9ti_active_task_id|Mousi9ti_session_is_active|Mousi9ti_session_accumulated|Mousi9ti_session_start_time|Mousi9ti_task_session_id|Mousi9ti_task_active_segment|Mousi9ti_timer_v1)$/.test(
      key,
    )
  ) {
    return "tasks-practice";
  }
  return "settings-layout";
}

export function restoreAppBackup(
  backup: AppBackup,
  categories?: BackupCategory[],
): void {
  const original: Record<string, string> = {};
  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index);
    if (key !== null) {
      const value = localStorage.getItem(key);
      if (value !== null) original[key] = value;
    }
  }

  const restored = categories
    ? { ...original }
    : ({} as Record<string, string>);

  if (categories) {
    const selected = new Set(categories);
    Object.keys(restored).forEach((key) => {
      if (selected.has(getBackupCategory(key))) delete restored[key];
    });
  }

  Object.entries(backup.storage).forEach(([key, value]) => {
    if (!categories || categories.includes(getBackupCategory(key))) {
      restored[key] = value;
    }
  });

  try {
    localStorage.clear();
    Object.entries(restored).forEach(([key, value]) =>
      localStorage.setItem(key, value),
    );
  } catch (error) {
    try {
      localStorage.clear();
      Object.entries(original).forEach(([key, value]) =>
        localStorage.setItem(key, value),
      );
    } catch {
      throw new Error(
        "Import failed and the original browser data could not be fully restored. Check available storage space.",
      );
    }
    throw new Error(
      "Import failed because browser storage is full. Existing data was restored.",
    );
  }
}
