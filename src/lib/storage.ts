import {
  AppSettings,
  DashboardWidgetLayout,
  DashboardLayoutData,
  DashboardRow,
  Session,
  StreakData,
  ChordSelection,
} from "../types";

const STORAGE_KEYS = {
  SESSIONS: "Mousi9ti_sessions_v1",
  STREAK: "Mousi9ti_streak_v1",
  SETTINGS: "Mousi9ti_settings_v1",
  CHORD_SELECTIONS: "Mousi9ti_chord_selections_v1",
  DASHBOARD_LAYOUT: "Mousi9ti_dashboard_layout_v1",
  DASHBOARD_LAYOUT_V2: "Mousi9ti_dashboard_layout_v2",
};

const DEFAULT_SETTINGS: AppSettings = {
  theme: "dark",
  accentColor: "#3b82f6", // Electric Blue
  defaultInstrument: "guitar",
  defaultTuning: "E Standard",
  fretCount: 15,
  soundVolume: 1,
  metronomeSound: "click",
  fretboardTheme: "original",
  fretboardNoteSize: "medium",
  fretboardColorMode: "default",
  fretboardMarkerShape: "round",
  fretboardMinimalDetails: false,
  autoSaveSession: true,
  timerPresets: [3, 5, 10, 30],
  stopMetronomeOnTimerEnd: false,
};

const DEFAULT_DASHBOARD_LAYOUT: DashboardLayoutData = {
  rows: [
    {
      id: "row-1",
      widgets: [
        { id: "metronome", title: "Metronome" },
        { id: "timer", title: "Practice Timer" },
        { id: "random-drill", title: "Random Note Drill" },
        { id: "session", title: "Practice Streak" },
      ],
    },
    {
      id: "row-2",
      widgets: [{ id: "practice-tasks", title: "Daily Practice Goals" }],
    },
    {
      id: "row-3",
      widgets: [{ id: "instruments", title: "Instruments" }],
    },
    {
      id: "row-4",
      widgets: [{ id: "chord-selector", title: "Chord Selector" }],
    },
  ],
  hiddenWidgets: [],
};

export function getSavedDashboardLayout(): DashboardLayoutData {
  try {
    const rawV2 = localStorage.getItem(STORAGE_KEYS.DASHBOARD_LAYOUT_V2);
    if (rawV2) {
      const data = JSON.parse(rawV2) as DashboardLayoutData;
      // Sanitize/migrate V2 data if it still contains split fretboard or piano
      let hasLegacyInstruments = false;
      let hasInstruments = false;

      const newRows: DashboardRow[] = [];
      const newHiddenWidgets: DashboardWidgetLayout[] = [];

      data.rows?.forEach((row) => {
        const newWidgets: DashboardWidgetLayout[] = [];
        row.widgets?.forEach((w: any) => {
          if (w.id === "fretboard" || w.id === "piano") {
            hasLegacyInstruments = true;
            if (!hasInstruments) {
              newWidgets.push({ id: "instruments", title: "Instruments" });
              hasInstruments = true;
            }
          } else if (w.id === "instruments") {
            hasInstruments = true;
            newWidgets.push(w);
          } else {
            newWidgets.push(w);
          }
        });
        if (newWidgets.length > 0) {
          newRows.push({ ...row, widgets: newWidgets });
        }
      });

      data.hiddenWidgets?.forEach((w: any) => {
        if (w.id === "fretboard" || w.id === "piano") {
          hasLegacyInstruments = true;
          if (!hasInstruments) {
            newHiddenWidgets.push({ id: "instruments", title: "Instruments" });
            hasInstruments = true;
          }
        } else if (w.id === "instruments") {
          hasInstruments = true;
          newHiddenWidgets.push(w);
        } else {
          newHiddenWidgets.push(w);
        }
      });

      if (!hasInstruments && hasLegacyInstruments) {
        newRows.push({
          id: `row-${Math.random().toString(36).substring(2, 9)}`,
          widgets: [{ id: "instruments", title: "Instruments" }],
        });
      }

      const hasChordSelector =
        newRows.some((row) =>
          row.widgets.some((widget) => widget.id === "chord-selector"),
        ) || newHiddenWidgets.some((widget) => widget.id === "chord-selector");

      if (!hasChordSelector) {
        newRows.push({
          id: `row-${Math.random().toString(36).substring(2, 9)}`,
          widgets: [{ id: "chord-selector", title: "Chord Selector" }],
        });
      }

      const hasPracticeTasks =
        newRows.some((row) =>
          row.widgets.some((widget) => widget.id === "practice-tasks"),
        ) || newHiddenWidgets.some((widget) => widget.id === "practice-tasks");

      if (!hasPracticeTasks) {
        newRows.push({
          id: `row-${Math.random().toString(36).substring(2, 9)}`,
          widgets: [{ id: "practice-tasks", title: "Daily Practice Goals" }],
        });
      }

      const sanitized: DashboardLayoutData = {
        rows: newRows,
        hiddenWidgets: newHiddenWidgets,
      };

      if (hasLegacyInstruments || !hasChordSelector || !hasPracticeTasks) {
        saveDashboardLayout(sanitized);
      }

      return sanitized;
    }

    // Fallback and migrate from V1
    const rawV1 = localStorage.getItem(STORAGE_KEYS.DASHBOARD_LAYOUT);
    if (rawV1) {
      const savedV1 = JSON.parse(rawV1);
      if (Array.isArray(savedV1)) {
        const rows: DashboardRow[] = [];
        const hiddenWidgets: DashboardWidgetLayout[] = [];
        let currentRow: DashboardWidgetLayout[] = [];

        let addedInstruments = false;

        savedV1.forEach((widget: any) => {
          let w = { id: widget.id, title: widget.title };
          if (widget.id === "fretboard" || widget.id === "piano") {
            if (addedInstruments) return;
            w = { id: "instruments", title: "Instruments" };
            addedInstruments = true;
          }

          if (widget.hidden && w.id !== "instruments") {
            hiddenWidgets.push(w);
          } else if (widget.size === "wide" || w.id === "instruments") {
            rows.push({
              id: `row-${Math.random().toString(36).substring(2, 9)}`,
              widgets: [w],
            });
          } else {
            currentRow.push(w);
            if (currentRow.length >= 4) {
              rows.push({
                id: `row-${Math.random().toString(36).substring(2, 9)}`,
                widgets: currentRow,
              });
              currentRow = [];
            }
          }
        });
        if (currentRow.length > 0) {
          rows.push({
            id: `row-${Math.random().toString(36).substring(2, 9)}`,
            widgets: currentRow,
          });
        }

        const hasChordSelector = rows.some((row) =>
          row.widgets.some((widget) => widget.id === "chord-selector"),
        );
        if (!hasChordSelector) {
          rows.push({
            id: `row-${Math.random().toString(36).substring(2, 9)}`,
            widgets: [{ id: "chord-selector", title: "Chord Selector" }],
          });
        }

        const hasPracticeTasks =
          rows.some((row) =>
            row.widgets.some((widget) => widget.id === "practice-tasks"),
          ) || hiddenWidgets.some((widget) => widget.id === "practice-tasks");
        if (!hasPracticeTasks) {
          rows.push({
            id: `row-${Math.random().toString(36).substring(2, 9)}`,
            widgets: [{ id: "practice-tasks", title: "Daily Practice Goals" }],
          });
        }

        const migrated: DashboardLayoutData = { rows, hiddenWidgets };
        saveDashboardLayout(migrated);
        return migrated;
      }
    }

    return DEFAULT_DASHBOARD_LAYOUT;
  } catch (e) {
    console.error("Failed to load dashboard layout", e);
    return DEFAULT_DASHBOARD_LAYOUT;
  }
}

export function saveDashboardLayout(layout: DashboardLayoutData): void {
  try {
    localStorage.setItem(
      STORAGE_KEYS.DASHBOARD_LAYOUT_V2,
      JSON.stringify(layout),
    );
  } catch (e) {
    console.error("Failed to save dashboard layout", e);
  }
}

export function getTodayDateString(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getSavedSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw);

    // Migration for large notes to note size
    if (
      parsed.fretboardLargeNotes !== undefined &&
      parsed.fretboardNoteSize === undefined
    ) {
      parsed.fretboardNoteSize = parsed.fretboardLargeNotes
        ? "large"
        : "medium";
      delete parsed.fretboardLargeNotes;
    }
    // Migration for color mode
    if (parsed.fretboardColorMode === undefined) {
      parsed.fretboardColorMode = "default";
    }

    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch (e) {
    console.error("Failed to load settings from storage", e);
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: AppSettings): void {
  try {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  } catch (e) {
    console.error("Failed to save settings", e);
  }
}

export function getSavedChordSelections(): ChordSelection[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CHORD_SELECTIONS);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.error("Failed to get chord selections", e);
    return [];
  }
}

export function saveChordSelections(chords: ChordSelection[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.CHORD_SELECTIONS, JSON.stringify(chords));
  } catch (e) {
    console.error("Failed to save chord selections", e);
  }
}

export function getSavedSessions(): Session[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SESSIONS);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.error("Failed to get sessions", e);
    return [];
  }
}

export function saveSession(session: Session): void {
  try {
    const existing = getSavedSessions();
    const index = existing.findIndex((s) => s.id === session.id);
    let updated: Session[];
    if (index >= 0) {
      updated = [...existing];
      updated[index] = session;
    } else {
      updated = [session, ...existing];
    }
    localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(updated));
    recordPracticeDay(session.date, Math.round(session.durationSeconds / 60));
  } catch (e) {
    console.error("Failed to save session", e);
  }
}

// Streak System Logic (chess.com-style with 2-day grace period)
//
// How it works:
// - `recordPracticeDay` is the ONLY function that increments the streak.
//   It is called when a session is logged. If the user hasn't practiced
//   today yet, the streak goes up by 1.
// - `getSavedStreak` is called on app load / refresh. It checks if the
//   streak has decayed (missed too many days since last practice) and
//   resets it if needed, but NEVER increments.

export function getSavedStreak(): StreakData {
  const today = getTodayDateString();
  const defaultStreak: StreakData = {
    currentStreak: 0,
    longestStreak: 0,
    lastVisitDate: today,
    graceDaysUsed: 0,
    history: [],
  };

  try {
    const raw = localStorage.getItem(STORAGE_KEYS.STREAK);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.STREAK, JSON.stringify(defaultStreak));
      return defaultStreak;
    }

    const data: StreakData = JSON.parse(raw);
    return applyStreakDecay(data, today);
  } catch (e) {
    console.error("Failed to get streak", e);
    return defaultStreak;
  }
}

/**
 * Called on app open / refresh. Checks how many days since last practice
 * and applies grace period or resets the streak. Never increments.
 */
function applyStreakDecay(data: StreakData, today: string): StreakData {
  // Find the last day the user actually practiced
  const history = data.history || [];
  const lastPracticed = history
    .slice()
    .reverse()
    .find((h) => h.practiced);

  if (!lastPracticed) {
    // No practice history at all — streak should be 0
    const updated = {
      ...data,
      currentStreak: 0,
      graceDaysUsed: 0,
      lastVisitDate: today,
    };
    localStorage.setItem(STORAGE_KEYS.STREAK, JSON.stringify(updated));
    return updated;
  }

  const lastDate = new Date(lastPracticed.date);
  const nowDate = new Date(today);
  const diffDays = Math.floor(
    (nowDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24),
  );

  let currentStreak = data.currentStreak;
  let graceDaysUsed = data.graceDaysUsed;

  if (diffDays <= 1) {
    // Practiced today or yesterday — streak is fine
    graceDaysUsed = 0;
  } else if (diffDays === 2) {
    // Missed 1 day — grace period
    graceDaysUsed = 1;
  } else if (diffDays === 3) {
    // Missed 2 days — grace period 2
    graceDaysUsed = 2;
  } else {
    // Missed 3+ days — streak broken
    currentStreak = 0;
    graceDaysUsed = 0;
  }

  const updated: StreakData = {
    ...data,
    currentStreak,
    longestStreak: Math.max(currentStreak, data.longestStreak || 0),
    lastVisitDate: today,
    graceDaysUsed,
  };

  localStorage.setItem(STORAGE_KEYS.STREAK, JSON.stringify(updated));
  return updated;
}

/**
 * Called when a session is saved. This is the ONLY place the streak increments.
 * Reads raw localStorage to avoid the decay recalculation race condition.
 */
export function recordPracticeDay(dateStr: string, durationMin: number): void {
  try {
    // Read raw streak data — do NOT go through getSavedStreak() to avoid
    // the decay logic resetting the streak before we can increment it.
    const raw = localStorage.getItem(STORAGE_KEYS.STREAK);
    const streak: StreakData = raw
      ? JSON.parse(raw)
      : {
          currentStreak: 0,
          longestStreak: 0,
          lastVisitDate: dateStr,
          graceDaysUsed: 0,
          history: [],
        };

    const history = streak.history || [];
    const index = history.findIndex((h) => h.date === dateStr);

    let alreadyPracticedToday = false;

    if (index >= 0) {
      alreadyPracticedToday = history[index].practiced;
      history[index].practiced = true;
      history[index].durationMin =
        (history[index].durationMin || 0) + durationMin;
    } else {
      history.push({ date: dateStr, practiced: true, durationMin });
    }

    // Sort chronologically
    history.sort((a, b) => a.date.localeCompare(b.date));

    // Only increment streak if this is the first session of the day
    if (!alreadyPracticedToday) {
      streak.currentStreak = (streak.currentStreak || 0) + 1;
      streak.longestStreak = Math.max(
        streak.longestStreak || 0,
        streak.currentStreak,
      );
      streak.graceDaysUsed = 0;
    }

    streak.history = history.slice(-90); // keep 90 days
    streak.lastVisitDate = dateStr;
    localStorage.setItem(STORAGE_KEYS.STREAK, JSON.stringify(streak));
  } catch (e) {
    console.error("Failed to record practice day", e);
  }
}
