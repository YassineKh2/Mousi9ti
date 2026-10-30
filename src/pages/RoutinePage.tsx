import React, { useState, useEffect, useLayoutEffect, useRef } from "react";
import { createPortal } from "react-dom";
import {
  Play,
  Square,
  Pause,
  SkipForward,
  RotateCcw,
  Plus,
  Trash2,
  Clock,
  Music,
  CheckCircle2,
  Circle,
  Search,
  X,
  Calendar,
  Settings,
  Sparkles,
  Tag,
  Sliders,
  Compass,
  Zap,
  Gauge,
  Target,
  Command,
  Hash,
  Edit2,
  Activity,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import {
  AppSettings,
  NoteName,
  PracticeTask,
  TaskActivity,
  UserTimerPreferences,
} from "../types";
import {
  ALL_ROOT_NOTES,
  SCALES_DATABASE,
  GUITAR_TUNINGS,
} from "../data/musicTheory";
import { CHORD_TYPES_CATALOG, getChordDefinition } from "../data/chordsData";
import { audioEngine } from "../lib/audio";
import {
  searchChords,
  searchScales,
  parseChordInput,
  parseScaleInput,
} from "../utils/musicSearch";
import {
  MENTION_REGEX,
  parseParams,
  getMentionContext,
  getMentionSuggestions,
  applyMentionSuggestion,
  renderHighlights,
  formatDurationLabel,
  ActiveDropdown,
  COMMON_PRACTICE_KEYS,
  COMMON_TECHNIQUES,
  COMMON_EXERCISES,
} from "../utils/taskMentions";
import {
  DropdownEditor,
  InlineTaskRowEditor,
  PracticeTasksWidget,
} from "../components/PracticeTasksWidget";
import { TaskDeleteDialog } from "../components/TaskDeleteDialog";
import { useTimer } from "../lib/useTimer";
import {
  getSavedSessions,
  getSavedTaskActivities,
  purgeTaskActivities,
  setTaskCompletion,
} from "../lib/storage";
import { clampDurationMinutes } from "../lib/taskAutoConfig";
import {
  getMondayMonthWeeks,
  getTasksForDate,
  deleteTaskFromSchedule,
  getDayBoundaryAfter,
  getTaskCompletionCounts,
  getTaskDateKey,
  isTaskExpiredAt,
  withTaskCreationDate,
} from "../lib/taskDates";
import { SessionWidget } from "../components/SessionWidget";
import { CustomWeekDuration } from "../components/CustomWeekDuration";
import {
  getTaskExpiration,
  TaskDurationPeriod,
  applyTaskDurationRange,
  getTaskRenewalExpiration,
  validateCustomWeekDuration,
} from "../lib/taskDuration";
import { StreakData } from "../types";
import { useSettingsContext } from "../contexts/SettingsContext";
import { usePracticeInstrument } from "../contexts/PracticeInstrumentContext";
import { resolveRecordInstrument } from "../lib/instruments";

interface RoutineTask extends PracticeTask {
  duration?: TaskDurationPeriod;
}

const TASK_TAG_COLOR_CLASSES: Record<string, string> = {
  scale:
    "bg-primary/15 text-primary border border-primary/30 hover:bg-primary/20",
  chord:
    "bg-violet-500/20 text-violet-300 border border-violet-500/40 hover:bg-violet-500/25",
  timer:
    "bg-orange-500/20 text-orange-300 border border-orange-500/40 hover:bg-orange-500/25",
  time: "bg-orange-500/20 text-orange-300 border border-orange-500/40 hover:bg-orange-500/25",
  custom:
    "bg-teal-500/20 text-teal-300 border border-teal-500/40 hover:bg-teal-500/25",
  tuning:
    "bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/25",
  key: "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 hover:bg-cyan-500/25",
  technique:
    "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/25",
  bpm: "bg-rose-500/20 text-rose-300 border border-rose-500/40 hover:bg-rose-500/25",
  exercise:
    "bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 hover:bg-indigo-500/25",
  metronome:
    "bg-rose-500/20 text-rose-300 border border-rose-500/40 hover:bg-rose-500/25",
  random:
    "bg-sky-500/20 text-sky-300 border border-sky-500/40 hover:bg-sky-500/25",
};

const getDefaultTaskDurationLabel = (
  settings: Pick<
    AppSettings,
    | "taskDefaultDuration"
    | "taskDefaultCustomDuration"
    | "taskDefaultCustomUnit"
  >,
) => {
  if (settings.taskDefaultDuration === "forever") return "No limit";
  if (settings.taskDefaultDuration === "week") return "This week";
  if (settings.taskDefaultDuration === "month") return "This month";
  if (settings.taskDefaultDuration === "year") return "This year";
  return `${settings.taskDefaultCustomDuration} ${settings.taskDefaultCustomUnit}`;
};

const addCalendarMonths = (date: Date, months: number) => {
  const day = date.getDate();
  date.setDate(1);
  date.setMonth(date.getMonth() + months);
  date.setDate(
    Math.min(
      day,
      new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate(),
    ),
  );
};

const getDefaultTaskExpiration = (
  settings: Pick<
    AppSettings,
    | "taskDefaultDuration"
    | "taskDefaultCustomDuration"
    | "taskDefaultCustomUnit"
  >,
  createdAt: number,
): number | undefined => {
  if (settings.taskDefaultDuration === "forever") return undefined;

  const expiration = new Date(createdAt);
  if (settings.taskDefaultDuration === "week") {
    return getDayBoundaryAfter(createdAt, 7);
  } else if (settings.taskDefaultDuration === "month") {
    addCalendarMonths(expiration, 1);
  } else if (settings.taskDefaultDuration === "year") {
    addCalendarMonths(expiration, 12);
  } else {
    const duration = Number.isInteger(settings.taskDefaultCustomDuration)
      ? Math.min(Math.max(settings.taskDefaultCustomDuration, 1), 999)
      : 1;
    if (settings.taskDefaultCustomUnit === "days") {
      return getDayBoundaryAfter(createdAt, duration);
    } else if (settings.taskDefaultCustomUnit === "weeks") {
      return getDayBoundaryAfter(createdAt, duration * 7);
    } else if (settings.taskDefaultCustomUnit === "years") {
      addCalendarMonths(expiration, duration * 12);
    } else {
      addCalendarMonths(expiration, duration);
    }
  }
  return expiration.getTime();
};

const isExpiredTask = (task: RoutineTask | PracticeTask) => {
  return isTaskExpiredAt(task, Date.now());
};

const getStartOfDay = (timestamp: number) => {
  const date = new Date(timestamp);
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
  ).getTime();
};

const getTaskDurationLabel = (task: RoutineTask) => {
  if (task.duration === "custom") return "Custom duration";
  if (task.duration === "week") return "This week";
  if (task.duration === "month") return "This month";
  if (task.duration === "year") return "This year";
  return "No limit";
};

const TASK_DURATION_OPTIONS: { value: TaskDurationPeriod; label: string }[] = [
  { value: "forever", label: "No limit" },
  { value: "week", label: "This week" },
  { value: "month", label: "This month" },
  { value: "year", label: "This year" },
  { value: "custom", label: "Custom duration" },
];

export const getTaskDurationMenuOptions = (
  defaultDuration?: TaskDurationPeriod,
  defaultDurationLabel?: string,
): { value: TaskDurationPeriod; label: string }[] => {
  if (!defaultDurationLabel) return TASK_DURATION_OPTIONS;
  if (defaultDuration && defaultDuration !== "custom") {
    return TASK_DURATION_OPTIONS.map((option) =>
      option.value === defaultDuration
        ? { ...option, value: "default" }
        : option,
    );
  }
  return [
    { value: "default", label: defaultDurationLabel },
    ...TASK_DURATION_OPTIONS,
  ];
};

const TaskDurationMenu: React.FC<{
  value: TaskDurationPeriod;
  onChange: (value: TaskDurationPeriod) => void;
  startDate: number;
  weekday: number;
  customWeeks?: string;
  onCustomWeeksChange?: (weeks: string) => void;
  onCustomDurationApply?: (weeks: string) => void;
  hiddenDates?: string[];
  existingRange?: { startsAt: number; expiresAt: number };
  defaultDurationLabel?: string;
  defaultDuration?: TaskDurationPeriod;
  iconOnly?: boolean;
  className?: string;
}> = ({
  value,
  onChange,
  startDate,
  weekday,
  customWeeks,
  onCustomWeeksChange,
  onCustomDurationApply,
  hiddenDates,
  existingRange,
  defaultDurationLabel,
  defaultDuration,
  iconOnly = false,
  className = "",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [showingCustomDuration, setShowingCustomDuration] = useState(false);
  const [draftWeeks, setDraftWeeks] = useState("1");
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuPanelRef = useRef<HTMLDivElement>(null);
  const [menuPosition, setMenuPosition] = useState<React.CSSProperties | null>(
    null,
  );
  const durationOptions = getTaskDurationMenuOptions(
    defaultDuration,
    defaultDurationLabel,
  );
  const selectedLabel =
    durationOptions.find((option) => option.value === value)?.label ??
    "No limit";

  useEffect(() => {
    if (!isOpen) return;
    const closeOnOutsideClick = (event: PointerEvent) => {
      const target = event.target as Node;
      if (
        !menuRef.current?.contains(target) &&
        !menuPanelRef.current?.contains(target)
      ) {
        setIsOpen(false);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };
    document.addEventListener("pointerdown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [isOpen]);

  useLayoutEffect(() => {
    if (!isOpen) return;

    let horizontalAnchor: number | undefined;
    const updateMenuPosition = (reanchor = false) => {
      const button = buttonRef.current;
      const panel = menuPanelRef.current;
      if (!button || !panel) return;

      const buttonRect = button.getBoundingClientRect();
      const panelWidth = panel.offsetWidth;
      const panelHeight = panel.offsetHeight;
      const viewportWidth = document.documentElement.clientWidth;
      const viewportHeight = document.documentElement.clientHeight;
      const gap = 8;
      const edgePadding = 8;
      const availableViewportHeight = Math.max(
        0,
        viewportHeight - edgePadding * 2,
      );
      const visibleHeight = Math.min(panelHeight, availableViewportHeight);
      const spaceAbove = Math.max(0, buttonRect.top - gap - edgePadding);
      const spaceBelow = Math.max(
        0,
        viewportHeight - buttonRect.bottom - gap - edgePadding,
      );
      const openAbove = panelHeight > spaceBelow && spaceAbove > spaceBelow;
      if (horizontalAnchor === undefined || reanchor) {
        horizontalAnchor = iconOnly
          ? buttonRect.right - panelWidth
          : buttonRect.left;
      }
      const clampedLeft = Math.min(
        Math.max(edgePadding, horizontalAnchor),
        Math.max(edgePadding, viewportWidth - panelWidth - edgePadding),
      );
      const top = openAbove
        ? buttonRect.top - gap - visibleHeight
        : buttonRect.bottom + gap;
      const clampedTop = Math.min(
        Math.max(edgePadding, top),
        Math.max(edgePadding, viewportHeight - visibleHeight - edgePadding),
      );

      setMenuPosition({
        position: "fixed",
        top: clampedTop,
        left: clampedLeft,
        maxHeight: availableViewportHeight,
        transformOrigin: openAbove ? "bottom left" : "top left",
      });
    };

    updateMenuPosition();
    const resizeObserver = new ResizeObserver(() => updateMenuPosition());
    if (menuPanelRef.current) resizeObserver.observe(menuPanelRef.current);
    const reanchorMenu = () => updateMenuPosition(true);
    window.addEventListener("resize", reanchorMenu);
    window.addEventListener("scroll", reanchorMenu, true);
    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", reanchorMenu);
      window.removeEventListener("scroll", reanchorMenu, true);
    };
  }, [iconOnly, isOpen]);

  return (
    <div
      ref={menuRef}
      className={`relative inline-flex flex-col items-start ${isOpen ? "z-50" : ""} ${className}`}
      onClick={(event) => event.stopPropagation()}
    >
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={isOpen}
        aria-label={`Task duration: ${selectedLabel}`}
        title={selectedLabel}
        onClick={() => {
          if (isOpen) {
            setIsOpen(false);
          } else {
            setMenuPosition(null);
            setShowingCustomDuration(value === "custom");
            setIsMounted(true);
            setIsOpen(true);
          }
        }}
        className={`inline-flex items-center transition-colors ${
          iconOnly
            ? "p-1 text-on-surface-variant hover:text-primary"
            : "min-h-9 gap-2 rounded-md border border-outline-variant/40 bg-surface-container-high px-2.5 text-xs font-mono text-on-surface hover:border-primary/60 hover:bg-surface-container-highest"
        }`}
      >
        <Calendar
          size={14}
          className={iconOnly ? "text-current" : "text-primary"}
        />
        {!iconOnly && (
          <>
            <span>{selectedLabel}</span>
            <ChevronDown size={13} className="text-on-surface-variant" />
          </>
        )}
      </button>
      {isMounted &&
        createPortal(
          <div
            ref={menuPanelRef}
            style={
              menuPosition ?? {
                position: "fixed",
                top: 0,
                left: 0,
                visibility: "hidden",
              }
            }
            className={`z-50 w-[21rem] max-w-[calc(100vw-2rem)] overflow-y-auto overscroll-contain rounded-xl border border-outline-variant/40 bg-surface p-2 shadow-2xl ${
              showingCustomDuration ? "pb-4" : ""
            } ${
              menuPosition
                ? isOpen
                  ? "task-duration-menu-enter"
                  : "task-duration-menu-exit"
                : ""
            }`}
            onClick={(event) => event.stopPropagation()}
            onAnimationEnd={() => {
              if (!isOpen) setIsMounted(false);
            }}
          >
            {showingCustomDuration ? (
              <>
                <button
                  type="button"
                  onClick={() => setShowingCustomDuration(false)}
                  className="mb-2 flex w-full items-center gap-1 rounded px-2 py-2 text-left text-xs font-mono text-on-surface-variant transition-colors hover:bg-surface-container-high hover:text-on-surface"
                >
                  <ChevronLeft size={14} />
                  Duration options
                </button>
                <CustomWeekDuration
                  startDate={startDate}
                  weekday={weekday}
                  weeks={customWeeks ?? draftWeeks}
                  onChange={onCustomWeeksChange ?? setDraftWeeks}
                  hiddenDates={hiddenDates}
                  existingRange={existingRange}
                  onApply={() => {
                    const weeks = customWeeks ?? draftWeeks;
                    if (
                      !validateCustomWeekDuration(
                        startDate,
                        weeks,
                        weekday,
                        hiddenDates,
                      ).range
                    )
                      return;
                    if (onCustomDurationApply) {
                      onCustomDurationApply(weeks);
                    } else {
                      onChange("custom");
                    }
                    setIsOpen(false);
                  }}
                />
              </>
            ) : (
              durationOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  aria-current={value === option.value ? "true" : undefined}
                  onClick={() => {
                    if (option.value === "custom") {
                      setShowingCustomDuration(true);
                    } else {
                      onChange(option.value);
                      setIsOpen(false);
                    }
                  }}
                  className={`block w-full rounded px-3 py-2 text-left text-xs font-mono transition-colors hover:bg-surface-container-high ${
                    value === option.value ? "text-primary" : "text-on-surface"
                  }`}
                >
                  {option.label}
                </button>
              ))
            )}
          </div>,
          document.body,
        )}
    </div>
  );
};

interface DayBlueprint {
  day: string;
  name: string;
  focusTheme: string;
  goalDurationMins: number;
  defaultBpm: number;
  modules: {
    id: string;
    title: string;
    durationMin: number;
    completed: boolean;
  }[];
  tasks: RoutineTask[];
}

export const mergeRoutineTasks = (
  storedTasks: RoutineTask[],
  dailyTasks: PracticeTask[],
): RoutineTask[] => {
  const dailyById = new Map(dailyTasks.map((task) => [task.id, task]));
  const mergedTasks = storedTasks.map((task) => {
    const dailyTask = dailyById.get(task.id);
    if (!dailyTask) return task;
    dailyById.delete(task.id);
    return {
      ...task,
      ...dailyTask,
      instrument: task.instrument ?? dailyTask.instrument,
      instrumentInferred:
        task.instrumentInferred ?? dailyTask.instrumentInferred,
      createdAt: task.createdAt,
      startsAt: task.startsAt,
      expiresAt: task.expiresAt,
      duration: task.duration,
      visibilityHistory: task.visibilityHistory,
      hiddenDates: task.hiddenDates,
      completedByDate: {
        ...task.completedByDate,
        ...dailyTask.completedByDate,
      },
    };
  });
  return [...mergedTasks, ...dailyById.values()];
};

const DEFAULT_WEEKLY_SCHEDULE: DayBlueprint[] = [
  {
    day: "MON",
    name: "Monday",
    focusTheme: "Scale Mastery & Pentatonic Flows",
    goalDurationMins: 30,
    defaultBpm: 100,
    modules: [
      {
        id: "m1",
        title: "Warm-up Chromatics",
        durationMin: 10,
        completed: false,
      },
      {
        id: "m2",
        title: "Major Scale Box Positions",
        durationMin: 10,
        completed: false,
      },
      {
        id: "m3",
        title: "Improvisation Backing Track",
        durationMin: 10,
        completed: false,
      },
    ],
    tasks: [
      {
        id: "t1",
        text: "Warm up with a C major scale pattern @scale(C major) @time(10)",
        completed: false,
      },
      {
        id: "t2",
        text: "Practice the C major scale across two nearby neck positions @time(10)",
        completed: false,
      },
      {
        id: "t3",
        text: "Improvise over a simple backing track at a steady tempo @bpm(100) @time(10)",
        completed: false,
      },
    ],
  },
  {
    day: "TUE",
    name: "Tuesday",
    focusTheme: "Chord Voicings & Transitions",
    goalDurationMins: 30,
    defaultBpm: 110,
    modules: [
      {
        id: "m1",
        title: "Chord Inversion Arpeggios",
        durationMin: 10,
        completed: false,
      },
      {
        id: "m2",
        title: "Smooth Chord Changes",
        durationMin: 10,
        completed: false,
      },
      {
        id: "m3",
        title: "Metronome Timing Drill",
        durationMin: 10,
        completed: false,
      },
    ],
    tasks: [
      {
        id: "t1",
        text: "Practice smooth G major to C major chord changes @chord(G major) @chord(C major) @time(10)",
        completed: false,
      },
      {
        id: "t2",
        text: "Practice G major chord voicings and clean transitions @key(G Major) @time(10)",
        completed: false,
      },
      {
        id: "t3",
        text: "Strum a steady rhythm with a metronome @bpm(110) @time(10)",
        completed: false,
      },
    ],
  },
  {
    day: "WED",
    name: "Wednesday",
    focusTheme: "Speed, Agility & Finger Independence",
    goalDurationMins: 30,
    defaultBpm: 100,
    modules: [
      {
        id: "m1",
        title: "Spider Drill Warm-up",
        durationMin: 10,
        completed: false,
      },
      {
        id: "m2",
        title: "Alternate Picking Speed Burst",
        durationMin: 10,
        completed: false,
      },
      {
        id: "m3",
        title: "String Skipping Etude",
        durationMin: 10,
        completed: false,
      },
    ],
    tasks: [
      {
        id: "t1",
        text: "Play a relaxed 1-2-3-4 finger warm-up with even timing @bpm(100) @time(10)",
        completed: false,
      },
      {
        id: "t2",
        text: "Practice controlled alternate picking at a comfortable speed @technique(Alternate Picking) @time(10)",
        completed: false,
      },
      {
        id: "t3",
        text: "Practice a short string-skipping pattern slowly for clean accuracy @time(10)",
        completed: false,
      },
    ],
  },
  {
    day: "THU",
    name: "Thursday",
    focusTheme: "Fretboard Visualization & CAGED Transitions",
    goalDurationMins: 30,
    defaultBpm: 100,
    modules: [
      {
        id: "m1",
        title: "Warm-up Chromatics",
        durationMin: 10,
        completed: false,
      },
      {
        id: "m2",
        title: "Random Note Fretboard Drill",
        durationMin: 10,
        completed: false,
      },
      {
        id: "m3",
        title: "CAGED Scale Position Linking",
        durationMin: 10,
        completed: false,
      },
    ],
    tasks: [
      {
        id: "t1",
        text: "Warm up with a short chromatic pattern across the strings @time(10)",
        completed: false,
      },
      {
        id: "t2",
        text: "Practice G major to C major chord changes with clean transitions @key(G Major) @time(10)",
        completed: false,
      },
      {
        id: "t3",
        text: "Practice the A minor pentatonic scale between two nearby positions @scale(A pentatonic minor) @time(10)",
        completed: false,
      },
    ],
  },
  {
    day: "FRI",
    name: "Friday",
    focusTheme: "Rhythm, Strumming & Grooves",
    goalDurationMins: 30,
    defaultBpm: 80,
    modules: [
      {
        id: "m1",
        title: "Syncopated Rhythm Patterns",
        durationMin: 10,
        completed: false,
      },
      {
        id: "m2",
        title: "Metronome Subdivision Drill",
        durationMin: 10,
        completed: false,
      },
      {
        id: "m3",
        title: "Steady Strumming Practice",
        durationMin: 10,
        completed: false,
      },
    ],
    tasks: [
      {
        id: "t1",
        text: "Practice a relaxed down-up strumming pattern @bpm(80) @time(10)",
        completed: false,
      },
      {
        id: "t2",
        text: "Work on a simple syncopated rhythm while keeping a steady pulse @time(10)",
        completed: false,
      },
      {
        id: "t3",
        text: "Practice eighth-note subdivisions with a metronome @metronome(80,4/4) @time(10)",
        completed: false,
      },
    ],
  },
  {
    day: "SAT",
    name: "Saturday",
    focusTheme: "Repertoire & Full Practice Suite",
    goalDurationMins: 30,
    defaultBpm: 90,
    modules: [
      {
        id: "m1",
        title: "Full Song Playthroughs",
        durationMin: 10,
        completed: false,
      },
      {
        id: "m2",
        title: "Sweep Picking & Arpeggios",
        durationMin: 10,
        completed: false,
      },
      {
        id: "m3",
        title: "Improvisation Jam Session",
        durationMin: 10,
        completed: false,
      },
    ],
    tasks: [
      {
        id: "t1",
        text: "Practice a short section of a current song and focus on clean changes @time(10)",
        completed: false,
      },
      {
        id: "t2",
        text: "Practice chord-to-chord transitions from your current repertoire @time(10)",
        completed: false,
      },
      {
        id: "t3",
        text: "Play a short song section through at a comfortable tempo @bpm(90) @time(10)",
        completed: false,
      },
    ],
  },
  {
    day: "SUN",
    name: "Sunday",
    focusTheme: "Review, Tone & Free Improvisation",
    goalDurationMins: 30,
    defaultBpm: 80,
    modules: [
      {
        id: "m1",
        title: "Free Flow Improvisation",
        durationMin: 15,
        completed: false,
      },
      {
        id: "m2",
        title: "Weekly Review & Reflection",
        durationMin: 10,
        completed: false,
      },
      {
        id: "m3",
        title: "Relaxed Playing & Next-Week Goal",
        durationMin: 10,
        completed: false,
      },
    ],
    tasks: [
      {
        id: "t1",
        text: "Improvise freely using the A minor scale @key(A Minor) @time(10)",
        completed: false,
      },
      {
        id: "t2",
        text: "Review one riff or song section from this week @time(10)",
        completed: false,
      },
      {
        id: "t3",
        text: "Finish with relaxed playing and note one goal for next week @time(10)",
        completed: false,
      },
    ],
  },
];

const PIANO_WEEKLY_PLAN: Record<
  string,
  {
    focusTheme: string;
    goalDurationMins: number;
    defaultBpm: number;
    modules: { title: string; durationMin: number }[];
    tasks: string[];
  }
> = {
  MON: {
    focusTheme: "Relaxed Technique, Scales & Repertoire",
    goalDurationMins: 30,
    defaultBpm: 70,
    modules: [
      { title: "Relaxed Five-Finger Warm-up", durationMin: 5 },
      { title: "C Major Scale", durationMin: 10 },
      { title: "Focused Piece Practice", durationMin: 15 },
    ],
    tasks: [
      "Warm up with a relaxed five-finger pattern, hands separately, aiming for even tone @time(5)",
      "Practice the C major scale one octave, hands separately then together if comfortable @scale(C major) @time(10)",
      "Practice a short passage from your current piece slowly; focus on accurate notes and steady rhythm @time(15)",
    ],
  },
  TUE: {
    focusTheme: "Reading, Rhythm & Chord Foundations",
    goalDurationMins: 30,
    defaultBpm: 70,
    modules: [
      { title: "Short Sight-Reading Passage", durationMin: 10 },
      { title: "G Major & Tonic Chord", durationMin: 10 },
      { title: "Piece Passage Practice", durationMin: 10 },
    ],
    tasks: [
      "Sight-read a short, easy passage slowly without stopping to correct each note @time(10)",
      "Practice the G major scale and G major triad, hands separately first @scale(G major) @chord(G major) @time(10)",
      "Work on one small section of your current piece with a steady pulse @time(10)",
    ],
  },
  WED: {
    focusTheme: "Hand Coordination & Even Playing",
    goalDurationMins: 30,
    defaultBpm: 65,
    modules: [
      { title: "Hands-Together Coordination", durationMin: 10 },
      { title: "Broken Chord Pattern", durationMin: 10 },
      { title: "Piece Practice", durationMin: 10 },
    ],
    tasks: [
      "Practice a simple hands-together pattern slowly; keep both parts even and relaxed @technique(Hand Independence & Coordination) @time(10)",
      "Play a C major broken-chord pattern, listening for an even sound @chord(C major) @time(10)",
      "Repeat a short piece passage hands separately where needed, then put it together @time(10)",
    ],
  },
  THU: {
    focusTheme: "Minor-Key Scale, Chords & Reading",
    goalDurationMins: 30,
    defaultBpm: 65,
    modules: [
      { title: "A Minor Scale", durationMin: 10 },
      { title: "A Minor Chord Pattern", durationMin: 10 },
      { title: "Sight-Reading", durationMin: 10 },
    ],
    tasks: [
      "Practice the A natural minor scale slowly, hands separately, with accurate fingering @scale(A minor) @time(10)",
      "Play an A minor triad in root position and inversion, listening for an even tone @chord(A minor) @time(10)",
      "Sight-read a short passage at a comfortable tempo and keep going through small mistakes @time(10)",
    ],
  },
  FRI: {
    focusTheme: "Musical Expression & Repertoire",
    goalDurationMins: 30,
    defaultBpm: 70,
    modules: [
      { title: "Articulation & Dynamics", durationMin: 10 },
      { title: "Difficult Passage in Small Sections", durationMin: 10 },
      { title: "Expressive Play-Through", durationMin: 10 },
    ],
    tasks: [
      "Choose one phrase from your piece and practice its dynamics and articulation deliberately @time(10)",
      "Slow down one difficult passage and repeat only the small section that needs work @time(10)",
      "Play the piece or section through while listening for phrasing and an even pulse @time(10)",
    ],
  },
  SAT: {
    focusTheme: "Repertoire Building & Confident Play-Through",
    goalDurationMins: 35,
    defaultBpm: 70,
    modules: [
      { title: "Learn a New Short Passage", durationMin: 15 },
      { title: "Connect Practiced Sections", durationMin: 10 },
      { title: "Play-Through & Listen", durationMin: 10 },
    ],
    tasks: [
      "Learn a short new passage by checking notes and rhythm before gradually increasing tempo @time(15)",
      "Join two practiced sections together and note any transition that needs extra work @time(10)",
      "Play the piece through at a comfortable tempo and listen for an even, expressive sound @time(10)",
    ],
  },
  SUN: {
    focusTheme: "Light Review & Enjoyment",
    goalDurationMins: 30,
    defaultBpm: 60,
    modules: [
      { title: "Review a Familiar Piece", durationMin: 10 },
      { title: "Easy Reading", durationMin: 10 },
      { title: "Favorite Music", durationMin: 10 },
    ],
    tasks: [
      "Review one familiar piece slowly and notice which passage feels more secure now @time(10)",
      "Sight-read an easy passage at a comfortable pace @time(10)",
      "Finish with a favorite piece, keeping the session relaxed @time(10)",
    ],
  },
};

const DEFAULT_PIANO_WEEKLY_SCHEDULE: DayBlueprint[] =
  DEFAULT_WEEKLY_SCHEDULE.map((day) => {
    const pianoPlan = PIANO_WEEKLY_PLAN[day.day];
    return {
      ...day,
      focusTheme: pianoPlan.focusTheme,
      goalDurationMins: pianoPlan.goalDurationMins,
      defaultBpm: pianoPlan.defaultBpm,
      modules: pianoPlan.modules.map((module, index) => ({
        ...module,
        id: `piano-${day.day.toLowerCase()}-module-${index + 1}`,
        completed: false,
      })),
      tasks: pianoPlan.tasks.map((text, index) => ({
        id: `piano-${day.day.toLowerCase()}-task-${index + 1}`,
        text,
        completed: false,
      })),
    };
  });

const isUnmodifiedDefaultSchedule = (
  schedule: DayBlueprint[],
  defaults: DayBlueprint[],
) =>
  schedule.length === defaults.length &&
  defaults.every((defaultDay) => {
    const day = schedule.find((candidate) => candidate.day === defaultDay.day);
    if (!day) return false;
    return (
      day.name === defaultDay.name &&
      day.focusTheme === defaultDay.focusTheme &&
      day.goalDurationMins === defaultDay.goalDurationMins &&
      day.defaultBpm === defaultDay.defaultBpm &&
      day.modules.length === defaultDay.modules.length &&
      day.modules.every(
        (module, index) =>
          module.id === defaultDay.modules[index].id &&
          module.title === defaultDay.modules[index].title &&
          module.durationMin === defaultDay.modules[index].durationMin,
      ) &&
      day.tasks.length === defaultDay.tasks.length &&
      day.tasks.every(
        (task, index) =>
          task.id === defaultDay.tasks[index].id &&
          task.text === defaultDay.tasks[index].text,
      )
    );
  });

const PREVIOUS_GUITAR_DEFAULT_TASKS: Record<string, string[]> = {
  MON: [
    "Warm up with @scale(C major) Scale • 10m logged",
    "Practice major scale positions across neck",
    "Play along with @bpm(100) for @timer(15m)",
  ],
  TUE: [
    "Practice @chord(G major) to @chord(C major) changes",
    "Chord voicing drills in @key(G Major)",
    "Metronome timing test @bpm(110)",
  ],
  WED: [
    "Spider 1-2-3-4 drill with @bpm(130)",
    "Alternate picking speed bursts @technique(Alternate Picking)",
    "String skipping accuracy routine",
  ],
  THU: [
    "Warm up with @scale(C major) • 10m logged",
    "Practice @key(G Major) to @key(C Major) changes",
    "Play along with @bpm(80) for @timer(5m)",
    "Neck memorization: locate F# across all 6 strings",
    "Drill @scale(A pentatonic minor) connecting Pos 1 -> Pos 2",
    "Speed burst alternate picking with @bpm(120) for @timer(15m)",
  ],
  FRI: [
    "Syncopated strumming with @bpm(90)",
    "Subdivision click accuracy drill @metronome(90,4/4)",
  ],
  SAT: [
    "Full playthrough of main pieces @custom(Performance ready)",
    "Sweep arpeggio transitions @technique(Sweep Picking)",
  ],
  SUN: [
    "Free Improvisation in @key(A Minor)",
    "Review weekly logs and notes @timer(15m)",
  ],
};

const PREVIOUS_GUITAR_DEFAULT_DAY_DETAILS: Record<
  string,
  Pick<DayBlueprint, "focusTheme" | "goalDurationMins" | "defaultBpm">
> = {
  MON: {
    focusTheme: "Scale Mastery & Pentatonic Flows",
    goalDurationMins: 45,
    defaultBpm: 100,
  },
  TUE: {
    focusTheme: "Chord Voicings & Transitions",
    goalDurationMins: 50,
    defaultBpm: 110,
  },
  WED: {
    focusTheme: "Speed, Agility & Finger Independence",
    goalDurationMins: 65,
    defaultBpm: 130,
  },
  THU: {
    focusTheme: "Fretboard Visualization & CAGED Transitions",
    goalDurationMins: 60,
    defaultBpm: 120,
  },
  FRI: {
    focusTheme: "Rhythm, Strumming & Grooves",
    goalDurationMins: 40,
    defaultBpm: 90,
  },
  SAT: {
    focusTheme: "Repertoire & Full Practice Suite",
    goalDurationMins: 75,
    defaultBpm: 115,
  },
  SUN: {
    focusTheme: "Review, Tone & Free Improvisation",
    goalDurationMins: 30,
    defaultBpm: 80,
  },
};

const isUnmodifiedPreviousGuitarSchedule = (schedule: DayBlueprint[]) =>
  schedule.length === Object.keys(PREVIOUS_GUITAR_DEFAULT_TASKS).length &&
  Object.entries(PREVIOUS_GUITAR_DEFAULT_TASKS).every(([dayCode, texts]) => {
    const day = schedule.find((candidate) => candidate.day === dayCode);
    const details = PREVIOUS_GUITAR_DEFAULT_DAY_DETAILS[dayCode];
    if (!day) return false;
    return (
      day.focusTheme === details.focusTheme &&
      day.goalDurationMins === details.goalDurationMins &&
      day.defaultBpm === details.defaultBpm &&
      day.tasks.length === texts.length &&
      day.tasks.every(
        (task, index) =>
          task.id === `t${index + 1}` && task.text === texts[index],
      )
    );
  });

const PREVIOUS_PIANO_DEFAULT_SCHEDULE: DayBlueprint[] =
  DEFAULT_PIANO_WEEKLY_SCHEDULE.map((day) =>
    day.day === "SUN"
      ? {
          ...day,
          goalDurationMins: 20,
          modules: day.modules.slice(0, 2),
          tasks: day.tasks.slice(0, 2),
        }
      : day,
  );

const DAY_CODES = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];
const getTodayCode = () => DAY_CODES[(new Date().getDay() + 6) % 7];
const getWeekStart = (date: Date) => {
  const weekStart = new Date(date);
  weekStart.setHours(0, 0, 0, 0);
  weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7));
  return weekStart;
};
interface RoutinePageProps {
  timerPreferences?: UserTimerPreferences;
  onUpdateTimerPreferences?: (
    preferences: Partial<UserTimerPreferences>,
  ) => void;
  onQuickStartTasks?: (
    instrument: "guitar" | "piano",
    tasks: PracticeTask[],
  ) => void;
  timer?: ReturnType<typeof useTimer>;
  streak?: StreakData;
  practiceTasks?: PracticeTask[];
  onPracticeTasksChange?: (tasks: PracticeTask[]) => void;
  quickStartInstrument?: "guitar" | "piano" | "none" | null;
  onQuickStartSetupHandled?: () => void;
  activeSessionDuration?: number;
  isSessionActive?: boolean;
  onToggleSession?: () => void;
  onEndSession?: () => void;
}

export const RoutinePage: React.FC<RoutinePageProps> = ({
  timerPreferences,
  onUpdateTimerPreferences,
  onQuickStartTasks,
  timer: propTimer,
  streak: propStreak,
  practiceTasks,
  onPracticeTasksChange,
  quickStartInstrument,
  onQuickStartSetupHandled,
  activeSessionDuration = 0,
  isSessionActive = false,
  onToggleSession = () => {},
  onEndSession = () => {},
}) => {
  const settings = useSettingsContext();
  const { activeInstrument } = usePracticeInstrument();
  const isActiveInstrumentTask = (task: PracticeTask) =>
    resolveRecordInstrument(task) === activeInstrument;
  const needsTaskSetup = Boolean(
    timerPreferences &&
    !timerPreferences.hasSeenDailyTasksOnboarding &&
    practiceTasks?.filter(isActiveInstrumentTask).length === 0,
  );
  const internalTimer = useTimer();
  const timer = propTimer || internalTimer;
  const [taskHistory, setTaskHistory] = useState<TaskActivity[]>(
    getSavedTaskActivities,
  );
  const [isCompletionPickerOpen, setIsCompletionPickerOpen] = useState(false);
  const completionPickerRef = useRef<HTMLDivElement>(null);
  const completionPickerTriggerRef = useRef<HTMLButtonElement>(null);
  const [historyMonth, setHistoryMonth] = useState(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });
  const [historyWeekStart, setHistoryWeekStart] = useState(() =>
    getWeekStart(new Date()),
  );
  const historyWeeks = getMondayMonthWeeks(historyMonth);
  const getHistoryDateForDay = (dayCode: string) => {
    const date = new Date(historyWeekStart);
    date.setDate(date.getDate() + DAY_CODES.indexOf(dayCode));
    return date;
  };
  const isCurrentWeek =
    historyWeekStart.getTime() === getWeekStart(new Date()).getTime();
  const formatHistoryDate = (date: Date) =>
    date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const changeHistoryMonth = (offset: number) => {
    const nextMonth = new Date(
      historyMonth.getFullYear(),
      historyMonth.getMonth() + offset,
      1,
    );
    setHistoryMonth(nextMonth);
    setHistoryWeekStart(getMondayMonthWeeks(nextMonth)[0]);
  };

  useEffect(() => {
    if (!isCompletionPickerOpen) return;

    const closeOnOutsidePointer = (event: PointerEvent) => {
      if (!completionPickerRef.current?.contains(event.target as Node)) {
        setIsCompletionPickerOpen(false);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsCompletionPickerOpen(false);
        completionPickerTriggerRef.current?.focus();
      }
    };

    document.addEventListener("pointerdown", closeOnOutsidePointer);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsidePointer);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [isCompletionPickerOpen]);

  const [streakData, setStreakData] = useState<StreakData>(
    propStreak || {
      currentStreak: 0,
      longestStreak: 0,
      lastVisitDate: "",
      graceDaysUsed: 0,
      history: [],
    },
  );

  useEffect(() => {
    if (propStreak) {
      setStreakData(propStreak);
      return;
    }
    try {
      const rawStreak = localStorage.getItem("fretmaster_streak_v1");
      if (rawStreak) {
        setStreakData(JSON.parse(rawStreak));
      }
    } catch (e) {}
  }, [propStreak]);

  const [totalPracticeMins, setTotalPracticeMins] = useState(0);

  useEffect(() => {
    const totalSecs = getSavedSessions().reduce(
      (total, session) => total + session.durationSeconds,
      0,
    );
    setTotalPracticeMins(Math.round(totalSecs / 60));
  }, [activeSessionDuration, isSessionActive]);

  const [weeklySchedule, setWeeklySchedule] = useState<DayBlueprint[]>(() => {
    const saved = localStorage.getItem("mous9iti_weekly_schedule");
    const templateInstrument =
      quickStartInstrument === "guitar" || quickStartInstrument === "piano"
        ? quickStartInstrument
        : activeInstrument;
    let schedule =
      templateInstrument === "piano"
        ? DEFAULT_PIANO_WEEKLY_SCHEDULE
        : DEFAULT_WEEKLY_SCHEDULE;
    if (quickStartInstrument !== "guitar" && quickStartInstrument !== "piano") {
      schedule = schedule.map((day) => ({ ...day, tasks: [] }));
    }
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          schedule = parsed;
        }
      } catch (e) {}
    }

    if (
      saved &&
      (quickStartInstrument === "guitar" || quickStartInstrument === "piano")
    ) {
      const template =
        templateInstrument === "piano"
          ? DEFAULT_PIANO_WEEKLY_SCHEDULE
          : DEFAULT_WEEKLY_SCHEDULE;
      schedule = schedule.map((day) => ({
        ...day,
        tasks: mergeRoutineTasks(
          day.tasks,
          (template.find((item) => item.day === day.day)?.tasks ?? []).map(
            (task) => ({
              ...task,
              instrument: templateInstrument,
              instrumentInferred: false,
            }),
          ),
        ),
      }));
    }

    const migrationTimestamp = Date.now();
    schedule = schedule.map((day) => ({
      ...day,
      tasks: day.tasks.map((task) =>
        withTaskCreationDate(
          {
            ...task,
            instrument: saved
              ? resolveRecordInstrument(task)
              : templateInstrument,
          },
          migrationTimestamp,
        ),
      ),
    }));

    if (practiceTasks) {
      const currentTasks = practiceTasks
        .filter((task) => !isExpiredTask(task))
        .map((task) => withTaskCreationDate(task, migrationTimestamp));
      return schedule.map((day) =>
        day.day === getTodayCode()
          ? {
              ...day,
              tasks: mergeRoutineTasks(day.tasks, currentTasks),
            }
          : day,
      );
    }

    const savedDailyTasks = localStorage.getItem("mous9iti_tasks");
    if (!savedDailyTasks) return schedule;
    try {
      const parsedTasks = JSON.parse(savedDailyTasks);
      if (!Array.isArray(parsedTasks)) return schedule;
      return schedule.map((day) =>
        day.day === getTodayCode()
          ? {
              ...day,
              tasks: mergeRoutineTasks(
                day.tasks,
                parsedTasks
                  .filter((task) => !isExpiredTask(task))
                  .map((task) =>
                    withTaskCreationDate(task, migrationTimestamp),
                  ),
              ),
            }
          : day,
      );
    } catch (e) {
      return schedule;
    }
  });
  const previousPracticeTasks = useRef(practiceTasks);
  const hasIncomingPracticeTasks =
    previousPracticeTasks.current !== practiceTasks;
  useEffect(() => {
    if (!hasIncomingPracticeTasks) return;
    previousPracticeTasks.current = practiceTasks;
    if (!practiceTasks) return;
    setWeeklySchedule((previous) => {
      const next = previous.map((day) =>
        day.day === getTodayCode()
          ? {
              ...day,
              tasks: mergeRoutineTasks(
                day.tasks,
                practiceTasks.map((task) => withTaskCreationDate(task)),
              ),
            }
          : day,
      );
      return JSON.stringify(previous) === JSON.stringify(next)
        ? previous
        : next;
    });
  }, [practiceTasks, hasIncomingPracticeTasks]);
  useEffect(() => {
    if (quickStartInstrument) onQuickStartSetupHandled?.();
  }, [quickStartInstrument, onQuickStartSetupHandled]);
  const daysInWeek = DAY_CODES.map((dayCode) =>
    weeklySchedule.find((day) => day.day === dayCode),
  ).filter((day): day is DayBlueprint => Boolean(day));

  const [activeDayCode, setActiveDayCode] = useState<string>(getTodayCode);
  const activeDay =
    weeklySchedule.find((d) => d.day === activeDayCode) || weeklySchedule[3];
  const activeDayDate = getHistoryDateForDay(activeDayCode);
  const allActiveDayTasks = getTasksForDate(
    activeDay.tasks,
    activeDayDate,
    taskHistory,
  );
  const activeDayTasks = getTasksForDate(
    activeDay.tasks.filter(isActiveInstrumentTask),
    activeDayDate,
    taskHistory,
  );
  const activeDayTaskCounts = getTaskCompletionCounts(activeDayTasks);
  const isActiveDayToday =
    isCurrentWeek &&
    getStartOfDay(activeDayDate.getTime()) === getStartOfDay(Date.now());

  // Sync state to localStorage
  useEffect(() => {
    if (hasIncomingPracticeTasks) return;
    localStorage.setItem(
      "mous9iti_weekly_schedule",
      JSON.stringify(weeklySchedule),
    );
    if (activeDay?.day === getTodayCode() && isActiveDayToday) {
      localStorage.setItem(
        "mous9iti_routine",
        JSON.stringify(
          allActiveDayTasks.map((t) => ({
            id: t.id,
            instrument: resolveRecordInstrument(t),
            title: t.text,
            completed: t.completed,
            type: "custom",
            durationSec: 300,
            restSec: 30,
            bpm: 120,
          })),
        ),
      );
      localStorage.setItem("mous9iti_tasks", JSON.stringify(allActiveDayTasks));
    }
  }, [
    weeklySchedule,
    activeDayCode,
    historyWeekStart,
    practiceTasks,
    hasIncomingPracticeTasks,
  ]);

  useEffect(() => {
    if (hasIncomingPracticeTasks) return;
    if (activeDay?.day === getTodayCode() && isActiveDayToday) {
      onPracticeTasksChange?.(
        allActiveDayTasks.filter((task) => !isExpiredTask(task)),
      );
    }
  }, [
    weeklySchedule,
    activeDayCode,
    historyWeekStart,
    onPracticeTasksChange,
    practiceTasks,
    hasIncomingPracticeTasks,
  ]);

  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === "mous9iti_tasks" && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (!Array.isArray(parsed)) return;
          setWeeklySchedule((prev) =>
            prev.map((d) => {
              if (d.day === getTodayCode()) {
                return {
                  ...d,
                  tasks: mergeRoutineTasks(
                    d.tasks,
                    parsed.map((task: PracticeTask) =>
                      withTaskCreationDate(task),
                    ),
                  ),
                };
              }
              return d;
            }),
          );
        } catch (err) {}
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  // New task input state & Autocomplete
  const [newTaskInput, setNewTaskInput] = useState("");
  const [newTaskDuration, setNewTaskDuration] =
    useState<TaskDurationPeriod>("default");
  const [newTaskWeeks, setNewTaskWeeks] = useState("1");
  const { range: newTaskRange, error: newTaskDurationError } =
    validateCustomWeekDuration(
      activeDayDate.getTime(),
      newTaskWeeks,
      activeDayDate.getDay(),
    );
  const [cursor, setCursor] = useState(0);
  const [suggestionIndex, setSuggestionIndex] = useState(0);
  const [activeDropdown, setActiveDropdown] = useState<ActiveDropdown | null>(
    null,
  );
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [pendingDeleteTask, setPendingDeleteTask] =
    useState<RoutineTask | null>(null);
  const [editingDayField, setEditingDayField] = useState<
    "focus" | "duration" | null
  >(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSuggestionIndex(0);
  }, [newTaskInput, cursor]);

  const ctx = getMentionContext(newTaskInput, cursor);
  const suggestions = getMentionSuggestions(ctx);
  const safeSuggestionIndex = Math.max(
    0,
    Math.min(suggestionIndex, suggestions.length - 1),
  );

  const applySuggestion = (val: string) => {
    if (!ctx) return;
    const { newText, newCursor } = applyMentionSuggestion(
      newTaskInput,
      cursor,
      ctx,
      val,
    );
    setNewTaskInput(newText);
    setCursor(newCursor);
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
        inputRef.current.setSelectionRange(newCursor, newCursor);
      }
    }, 0);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (suggestions.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSuggestionIndex((prev) =>
          Math.min(prev + 1, suggestions.length - 1),
        );
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSuggestionIndex((prev) => Math.max(prev - 1, 0));
      } else if (e.key === "Tab" || e.key === "Enter") {
        e.preventDefault();
        applySuggestion(suggestions[safeSuggestionIndex].value);
      }
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewTaskInput(e.target.value);
    setCursor(e.target.selectionStart || 0);
  };

  const handleInputSelect = (e: React.SyntheticEvent<HTMLInputElement>) => {
    setCursor(e.currentTarget.selectionStart || 0);
  };

  const handleScroll = (e: React.UIEvent<HTMLInputElement>) => {
    if (backdropRef.current) {
      backdropRef.current.scrollLeft = e.currentTarget.scrollLeft;
    }
  };

  const toggleTaskCompleted = (taskId: string) => {
    const task = activeDay.tasks.find((item) => item.id === taskId);
    if (!task) return;
    const completed = !activeDayTasks.find(
      (activeTask) => activeTask.id === taskId,
    )?.completed;
    if (isActiveDayToday) {
      setTaskCompletion(task, completed);
      setTaskHistory(getSavedTaskActivities());
    }
    setWeeklySchedule((prev) =>
      prev.map((d) => {
        if (d.day === activeDayCode) {
          return {
            ...d,
            tasks: d.tasks.map((t) =>
              t.id === taskId
                ? {
                    ...t,
                    completedByDate: {
                      ...t.completedByDate,
                      [getTaskDateKey(activeDayDate)]: completed,
                    },
                  }
                : t,
            ),
          };
        }
        return d;
      }),
    );
  };

  const addTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskInput.trim() || (newTaskDuration === "custom" && !newTaskRange))
      return;
    const createdAt = Date.now();
    const usesDefaultDuration = newTaskDuration === "default";
    const configuredExpiration = usesDefaultDuration
      ? getDefaultTaskExpiration(settings, createdAt)
      : undefined;
    const customRange =
      usesDefaultDuration && configuredExpiration !== undefined
        ? {
            start: createdAt,
            end: configuredExpiration,
          }
        : undefined;
    const taskDuration: TaskDurationPeriod = usesDefaultDuration
      ? configuredExpiration === undefined
        ? "forever"
        : "custom"
      : newTaskDuration;
    const newTask = {
      id: `t-${createdAt}`,
      instrument: activeInstrument,
      createdAt,
      text: newTaskInput.trim(),
      completed: false,
      duration: taskDuration,
      startsAt:
        usesDefaultDuration && customRange
          ? getStartOfDay(customRange.start)
          : newTaskDuration === "custom" && newTaskRange
            ? newTaskRange.startsAt
            : getStartOfDay(createdAt),
      expiresAt: usesDefaultDuration
        ? configuredExpiration
        : newTaskDuration === "custom" && newTaskRange
          ? newTaskRange.expiresAt
          : getTaskExpiration(newTaskDuration),
    };
    setWeeklySchedule((prev) =>
      prev.map((d) => {
        if (d.day === activeDayCode) {
          return { ...d, tasks: [...d.tasks, newTask] };
        }
        return d;
      }),
    );
    setNewTaskInput("");
    setNewTaskDuration("default");
    setNewTaskWeeks("1");
    setCursor(0);
  };

  const updateTaskDuration = (taskId: string, duration: TaskDurationPeriod) => {
    const changeStartsAt = getStartOfDay(Date.now());
    setWeeklySchedule((prev) =>
      prev.map((day) =>
        day.day === activeDayCode
          ? {
              ...day,
              tasks: day.tasks.map((task) =>
                task.id === taskId
                  ? {
                      ...applyTaskDurationRange(task, {
                        startsAt:
                          duration === "custom" && task.duration === "custom"
                            ? Math.max(
                                task.startsAt ?? changeStartsAt,
                                changeStartsAt,
                              )
                            : changeStartsAt,
                        expiresAt:
                          duration === "custom"
                            ? task.duration === "custom"
                              ? task.expiresAt
                              : undefined
                            : getTaskRenewalExpiration(
                                duration,
                                changeStartsAt,
                              ),
                      }),
                      duration,
                    }
                  : task,
              ),
            }
          : day,
      ),
    );
  };

  const updateTaskWeeks = (taskId: string, weeks: string) => {
    const task = activeDay.tasks.find((item) => item.id === taskId);
    if (!task) return;
    const { range } = validateCustomWeekDuration(
      Date.now(),
      weeks,
      activeDayDate.getDay(),
      task.hiddenDates,
    );
    if (!range) return;
    setWeeklySchedule((prev) =>
      prev.map((day) =>
        day.day === activeDayCode
          ? {
              ...day,
              tasks: day.tasks.map((task) =>
                task.id === taskId
                  ? {
                      ...applyTaskDurationRange(task, range),
                      duration: "custom",
                    }
                  : task,
              ),
            }
          : day,
      ),
    );
  };

  const removeTask = (scope: "day" | "everywhere") => {
    if (!pendingDeleteTask) return;
    const taskId = pendingDeleteTask.id;
    setWeeklySchedule((prev) =>
      deleteTaskFromSchedule(prev, taskId, activeDayDate, scope),
    );
    if (editingTaskId === taskId) setEditingTaskId(null);
    if (isActiveDayToday) purgeTaskActivities(taskId);
    if (scope === "everywhere") {
      onPracticeTasksChange?.(
        (practiceTasks ?? []).filter((task) => task.id !== taskId),
      );
    } else if (isActiveDayToday) {
      onPracticeTasksChange?.(
        (practiceTasks ?? []).filter((task) => task.id !== taskId),
      );
    }
    setPendingDeleteTask(null);
  };

  const updateActiveDay = (updates: Partial<DayBlueprint>) => {
    setWeeklySchedule((prev) =>
      prev.map((day) =>
        day.day === activeDayCode ? { ...day, ...updates } : day,
      ),
    );
  };

  const updateMention = (newParams: string, closeDropdown: boolean = false) => {
    if (!activeDropdown) return;
    setWeeklySchedule((prev) =>
      prev.map((d) => {
        if (d.day !== activeDayCode) return d;
        return {
          ...d,
          tasks: d.tasks.map((t) => {
            if (t.id !== activeDropdown.taskId) return t;
            MENTION_REGEX.lastIndex = 0;
            let m;
            let newText = t.text;
            while ((m = MENTION_REGEX.exec(t.text)) !== null) {
              if (m.index === activeDropdown.matchIndex) {
                const before = t.text.slice(0, m.index);
                const after = t.text.slice(m.index + m[0].length);
                newText =
                  before + `@${activeDropdown.tool}(${newParams})` + after;
                break;
              }
            }
            return { ...t, text: newText };
          }),
        };
      }),
    );
    if (closeDropdown) {
      setActiveDropdown(null);
    } else {
      setActiveDropdown((prev) =>
        prev ? { ...prev, params: newParams } : null,
      );
    }
  };

  const renderTaskText = (task: {
    id: string;
    text: string;
    completed: boolean;
  }) => {
    const parts = [];
    let lastIndex = 0;
    let match;
    MENTION_REGEX.lastIndex = 0;

    while ((match = MENTION_REGEX.exec(task.text)) !== null) {
      if (match.index > lastIndex) {
        parts.push(
          <span key={`text-${lastIndex}`}>
            {task.text.slice(lastIndex, match.index)}
          </span>,
        );
      }

      const tool = match[2].toLowerCase();
      const params = match[3] || "";
      const currentMatchIndex = match.index;

      let Icon = Activity;
      const badgeClass = settings.taskTagsColored
        ? TASK_TAG_COLOR_CLASSES[tool] || TASK_TAG_COLOR_CLASSES.custom
        : "border border-outline-variant/40 bg-surface-container-high text-on-surface-variant";

      if (tool === "scale") Icon = Music;
      else if (tool === "chord") Icon = Hash;
      else if (tool === "timer" || tool === "time") Icon = Clock;
      else if (tool === "custom") Icon = Tag;
      else if (tool === "tuning") Icon = Sliders;
      else if (tool === "key") Icon = Compass;
      else if (tool === "technique") Icon = Zap;
      else if (tool === "bpm") Icon = Gauge;
      else if (tool === "exercise") Icon = Target;

      let label = tool;
      const p = parseParams(tool, params);
      if (tool === "metronome") label = `${p.bpm} BPM · ${p.signature}`;
      else if (tool === "scale") label = p.label || `${p.root} ${p.type}`;
      else if (tool === "chord") label = p.label || `${p.root} ${p.type}`;
      else if (tool === "timer" || tool === "time") {
        label = formatDurationLabel(p.minutes);
      } else if (tool === "custom") label = p.text || "Custom";
      else if (tool === "tuning") label = p.tuning || "Tuning";
      else if (tool === "key") label = p.key || "Key";
      else if (tool === "technique") label = p.technique || "Technique";
      else if (tool === "bpm") label = `${p.bpm} BPM · ${p.signature}`;
      else if (tool === "exercise") label = p.exercise || "Exercise";

      parts.push(
        <button
          key={`mention-${currentMatchIndex}`}
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setActiveDropdown({
              taskId: task.id,
              matchIndex: currentMatchIndex,
              tool,
              params,
              triggerEl: e.currentTarget,
              rect: e.currentTarget.getBoundingClientRect(),
            });
          }}
          className={`inline-flex max-w-full min-w-0 items-center gap-1 whitespace-normal break-words px-1.5 py-0.5 mx-0.5 rounded text-[11px] font-mono font-bold align-middle shadow-sm cursor-pointer transition-colors ${badgeClass} ${settings.taskTagsColored ? `task-tag-badge--${tool}` : ""} ${task.completed ? "line-through" : ""}`}
          title="Click to edit badge settings"
        >
          <Icon size={12} className="shrink-0" />
          <span className="min-w-0 break-words">{label}</span>
        </button>,
      );

      lastIndex = MENTION_REGEX.lastIndex;
    }

    if (lastIndex < task.text.length) {
      parts.push(
        <span key={`text-${lastIndex}`}>{task.text.slice(lastIndex)}</span>,
      );
    }

    return parts;
  };

  // Calculate overall stats
  const totalWeekTargetMins = weeklySchedule.reduce(
    (acc, d) => acc + d.goalDurationMins,
    0,
  );
  const completedMins = weeklySchedule.reduce((acc, d) => {
    const tasks = d.tasks.filter(isActiveInstrumentTask);
    const completedTasksCount = tasks.filter((task) => task.completed).length;
    const totalTasksCount = tasks.length || 1;
    return (
      acc +
      Math.round((completedTasksCount / totalTasksCount) * d.goalDurationMins)
    );
  }, 0);
  const completionPercent =
    totalWeekTargetMins > 0
      ? Math.round((completedMins / totalWeekTargetMins) * 100)
      : 0;

  const formatHoursMins = (mins: number) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${h}h ${m}m`;
  };

  return (
    <div className="routine-page space-y-6 pb-12 relative">
      {/* Top Banner: Weekly Schedule & Cadence */}
      <div
        data-tour="routine-schedule"
        className="bg-surface-container border border-outline-variant/30 rounded-xl p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 shadow-md"
      >
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-mono text-base font-bold tracking-[0.2em] text-on-surface uppercase flex items-center gap-2">
              <Calendar size={18} className="text-primary" />
              Weekly Schedule & Cadence
            </h2>
            <span className="hidden sm:inline text-xs text-on-surface-variant font-mono">
              • Select day to inspect and define routine
            </span>
          </div>
        </div>
        <div className="grid w-full grid-cols-2 gap-x-4 gap-y-3 font-mono text-xs lg:w-auto lg:flex lg:flex-wrap lg:items-center lg:gap-6">
          <span
            className="text-on-surface-variant"
            aria-label={`Practice instrument: ${activeInstrument}`}
          >
            {activeInstrument === "piano" ? "Piano" : "Guitar"}
          </span>
          <div className="min-w-0 text-on-surface-variant lg:inline">
            <span className="block text-[10px] uppercase tracking-wider lg:inline lg:text-xs lg:normal-case lg:tracking-normal">
              Week target
            </span>{" "}
            <strong className="text-on-surface font-bold">
              {formatHoursMins(totalWeekTargetMins)}
            </strong>
          </div>
          <div
            className="flex min-w-0 flex-col items-start gap-1 text-on-surface-variant lg:flex-row lg:flex-wrap lg:items-center lg:gap-3"
            title="Estimated completion based on completed tasks and daily target durations, not recorded practice time."
            aria-label={`Estimated completion: ${formatHoursMins(completedMins)} (${completionPercent}%), based on completed tasks and daily target durations, not recorded practice time.`}
          >
            <span className="text-[10px] uppercase tracking-wider lg:text-xs lg:normal-case lg:tracking-normal">
              Completed
            </span>
            <strong className="text-primary font-bold">
              {formatHoursMins(completedMins)} ({completionPercent}%)
            </strong>
          </div>
          <div
            ref={completionPickerRef}
            className="routine-history-picker col-span-2 w-full lg:col-span-1 lg:w-auto"
          >
            <button
              ref={completionPickerTriggerRef}
              type="button"
              className="routine-history-trigger w-full justify-between lg:w-auto"
              onClick={() => setIsCompletionPickerOpen((isOpen) => !isOpen)}
              aria-expanded={isCompletionPickerOpen}
              aria-label="Choose a week to view completed tasks"
            >
              <Calendar size={14} />
              <span>
                {formatHistoryDate(historyWeekStart)} –{" "}
                {formatHistoryDate(
                  new Date(
                    historyWeekStart.getFullYear(),
                    historyWeekStart.getMonth(),
                    historyWeekStart.getDate() + 6,
                  ),
                )}
              </span>
              <ChevronDown size={13} />
            </button>
            {isCompletionPickerOpen && (
              <div className="routine-history-popover">
                <div className="routine-history-month">
                  <button
                    type="button"
                    onClick={() => changeHistoryMonth(-1)}
                    aria-label="Previous month"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <strong>
                    {historyMonth.toLocaleDateString("en-US", {
                      month: "long",
                      year: "numeric",
                    })}
                  </strong>
                  <button
                    type="button"
                    onClick={() => changeHistoryMonth(1)}
                    aria-label="Next month"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
                <div className="routine-history-week-label">SELECT WEEK</div>
                <div className="routine-history-week-list">
                  {historyWeeks.map((weekStart, index) => {
                    const weekEnd = new Date(weekStart);
                    weekEnd.setDate(weekEnd.getDate() + 6);
                    const isSelected =
                      weekStart.getTime() === historyWeekStart.getTime();
                    const isCurrent =
                      weekStart.getTime() ===
                      getWeekStart(new Date()).getTime();

                    return (
                      <button
                        key={weekStart.getTime()}
                        type="button"
                        className={`routine-history-week-option ${
                          isSelected ? "selected" : ""
                        } ${isCurrent ? "current" : ""}`}
                        aria-label={`Week ${index + 1}, ${formatHistoryDate(weekStart)} to ${formatHistoryDate(weekEnd)}${isCurrent ? ", current week" : ""}`}
                        aria-pressed={isSelected}
                        onClick={() => {
                          setHistoryWeekStart(new Date(weekStart));
                          setIsCompletionPickerOpen(false);
                        }}
                      >
                        <span className="routine-history-week-number">
                          Week {index + 1}
                        </span>
                        <span className="routine-history-week-range">
                          {formatHistoryDate(weekStart)} –{" "}
                          {formatHistoryDate(weekEnd)}
                        </span>
                        {isCurrent && (
                          <span className="routine-history-current-label">
                            CURRENT
                          </span>
                        )}
                        {isSelected && (
                          <CheckCircle2 size={15} aria-hidden="true" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 7 Day Cards Row */}
      <div
        data-tour="routine-days"
        className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3"
      >
        {daysInWeek.map((day) => {
          const historyDate = getHistoryDateForDay(day.day);
          const dayTasks = getTasksForDate(
            day.tasks.filter(isActiveInstrumentTask),
            historyDate,
            taskHistory,
          );
          const { completed: completedCount, total: totalCount } =
            getTaskCompletionCounts(dayTasks);
          const pct =
            totalCount > 0
              ? Math.round((completedCount / totalCount) * 100)
              : 0;
          const isToday =
            day.day === getTodayCode() &&
            getWeekStart(new Date()).getTime() === historyWeekStart.getTime();
          const isSelected = day.day === activeDayCode;

          return (
            <button
              key={day.day}
              onClick={() => setActiveDayCode(day.day)}
              className={`min-w-0 text-left p-3.5 rounded-xl border flex flex-col justify-between gap-3 relative transition-all cursor-pointer ${
                isSelected
                  ? "bg-surface-container-high border-primary ring-1 ring-primary shadow-md"
                  : "bg-surface-container-low border-outline-variant/30 hover:bg-surface-container hover:border-outline-variant"
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <span className="font-mono font-bold text-xs uppercase tracking-wider text-on-surface">
                  {day.day}
                </span>
                {isToday && (
                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-primary text-on-primary font-bold">
                    TODAY
                  </span>
                )}
                {!isToday && (
                  <div
                    className={`w-2 h-2 rounded-full ${pct === 100 ? "bg-primary" : pct > 0 ? "bg-on-surface-variant" : "bg-outline-variant"}`}
                  />
                )}
              </div>
              <p className="-mt-2 text-[10px] font-mono text-on-surface-variant">
                {formatHistoryDate(historyDate)} · {completedCount} done
              </p>

              <div>
                <div className="font-mono text-sm font-bold text-on-surface">
                  {completedCount}/{totalCount}{" "}
                  <span className="text-[10px] font-normal text-on-surface-variant">
                    goals
                  </span>
                </div>
                <div className="mt-1 flex flex-col gap-0.5">
                  <p
                    className="truncate text-[10px] text-on-surface-variant font-sans"
                    title={day.focusTheme}
                  >
                    {day.focusTheme}
                  </p>
                </div>
              </div>

              <div className="w-full flex flex-col gap-1">
                <div className="flex items-center justify-between text-[10px] font-mono text-on-surface-variant">
                  <span>{pct}% complete</span>
                  <span>{day.goalDurationMins}m</span>
                </div>
                <div className="w-full h-1 bg-surface-container-highest rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all duration-300"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Two-Column Grid: Daily Practice Goals & Practice Tracker Timer */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Daily Practice Goals */}
        <div
          data-tour="routine-goals"
          className="lg:col-span-7 bg-surface-container border border-outline-variant/30 rounded-xl p-5 shadow-md flex flex-col gap-4"
        >
          <div className="flex items-center justify-between pb-3 border-b border-outline-variant/20">
            <div>
              <h2 className="text-sm font-bold font-mono uppercase tracking-wider text-on-surface flex items-center gap-2">
                <CheckCircle2 size={16} className="text-primary" /> Daily
                Practice Goals
              </h2>
              <p className="text-xs text-on-surface-variant font-mono mt-0.5">
                {activeDay.name} • Focus: {activeDay.focusTheme}
              </p>
            </div>
            <div className="bg-surface-container-high border border-outline-variant/40 px-3 py-1 rounded-lg text-xs font-mono font-bold text-primary">
              {Math.round(
                (activeDayTaskCounts.completed /
                  (activeDayTaskCounts.total || 1)) *
                  100,
              )}
              %
            </div>
          </div>

          {/* Tasks List */}
          {needsTaskSetup ? (
            <PracticeTasksWidget
              startupLayout="routine"
              tasks={practiceTasks?.filter(isActiveInstrumentTask)}
              timerPreferences={timerPreferences}
              onUpdateTimerPreferences={onUpdateTimerPreferences}
              onDismissTour={() =>
                window.dispatchEvent(new Event("mousi9ti-task-setup-start"))
              }
              onQuickStartTasks={(_instrument, tasks) => {
                const schedule =
                  activeInstrument === "piano"
                    ? DEFAULT_PIANO_WEEKLY_SCHEDULE
                    : DEFAULT_WEEKLY_SCHEDULE;
                const currentTasks = tasks.map((task) => ({
                  ...task,
                  instrument: activeInstrument,
                  instrumentInferred: false,
                }));
                setWeeklySchedule((previous) =>
                  previous.map((day) => {
                    const template = schedule.find(
                      (item) => item.day === day.day,
                    );
                    const additions =
                      day.day === getTodayCode()
                        ? currentTasks
                        : (template?.tasks ?? []).map((task) => ({
                            ...task,
                            instrument: activeInstrument,
                            instrumentInferred: false,
                          }));
                    return {
                      ...day,
                      tasks: mergeRoutineTasks(day.tasks, additions),
                    };
                  }),
                );
                onQuickStartTasks?.(activeInstrument, currentTasks);
              }}
              onFinishDailyTasksOnboarding={() => {
                window.dispatchEvent(new Event("mousi9ti-task-setup-ready"));
              }}
            />
          ) : (
            <>
              <div className="flex flex-col gap-2.5 min-h-[300px] overflow-y-auto max-h-[360px] custom-scrollbar pr-1">
                {activeDayTasks.length === 0 ? (
                  <div className="text-center py-12 text-on-surface-variant text-sm font-mono">
                    No goals defined for {activeDay.name}. Start by adding ones
                    below
                  </div>
                ) : (
                  activeDayTasks.map((task) => {
                    if (editingTaskId === task.id) {
                      return (
                        <InlineTaskRowEditor
                          key={task.id}
                          initialText={task.text}
                          onSave={(updatedText) => {
                            setWeeklySchedule((prev) =>
                              prev.map((d) => {
                                if (d.day === activeDayCode) {
                                  return {
                                    ...d,
                                    tasks: d.tasks.map((t) =>
                                      t.id === task.id
                                        ? { ...t, text: updatedText }
                                        : t,
                                    ),
                                  };
                                }
                                return d;
                              }),
                            );
                            setEditingTaskId(null);
                          }}
                          onCancel={() => setEditingTaskId(null)}
                        />
                      );
                    }
                    return (
                      <div
                        key={task.id}
                        className={`group flex w-full items-start gap-3 p-3 rounded-lg border transition-all ${
                          task.completed
                            ? "bg-surface-container-low/50 border-outline-variant/20 opacity-75"
                            : "bg-surface-container-low border-outline-variant/30 hover:border-primary/50"
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => toggleTaskCompleted(task.id)}
                          aria-label={`${task.completed ? "Mark task incomplete" : "Mark task complete"}: ${task.text}`}
                          aria-pressed={task.completed}
                          className="text-on-surface-variant hover:text-primary transition-colors shrink-0"
                        >
                          {task.completed ? (
                            <CheckCircle2 size={18} className="text-primary" />
                          ) : (
                            <Circle size={18} />
                          )}
                        </button>
                        <div className="min-w-0 flex-1">
                          <div
                            className={`text-sm font-mono leading-relaxed break-all [overflow-wrap:anywhere] ${task.completed ? "line-through text-on-surface-variant" : "text-on-surface"}`}
                          >
                            {renderTaskText(task)}
                          </div>
                          {task.startsAt !== undefined &&
                            task.expiresAt !== undefined && (
                              <span className="mt-1 block text-[10px] font-mono text-on-surface-variant">
                                {new Date(
                                  task.createdAt ?? task.startsAt,
                                ).toLocaleDateString(undefined, {
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                })}
                                {" - "}
                                {new Date(
                                  task.expiresAt - 1,
                                ).toLocaleDateString(undefined, {
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                })}
                              </span>
                            )}
                        </div>
                        <div className="ml-auto flex shrink-0 items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                          <TaskDurationMenu
                            value={task.duration ?? "forever"}
                            startDate={getStartOfDay(Date.now())}
                            weekday={activeDayDate.getDay()}
                            hiddenDates={task.hiddenDates}
                            existingRange={
                              task.startsAt !== undefined &&
                              task.expiresAt !== undefined
                                ? {
                                    startsAt: task.startsAt,
                                    expiresAt: task.expiresAt,
                                  }
                                : undefined
                            }
                            onCustomDurationApply={(weeks) =>
                              updateTaskWeeks(task.id, weeks)
                            }
                            onChange={(duration) =>
                              updateTaskDuration(task.id, duration)
                            }
                            iconOnly
                          />
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingTaskId(task.id);
                            }}
                            className="p-1 text-on-surface-variant hover:text-primary transition-colors"
                            title="Edit goal"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setPendingDeleteTask(task);
                            }}
                            className="p-1 text-on-surface-variant hover:text-error transition-colors"
                            title="Delete goal"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Bottom Task Input Bar with Autocomplete */}
              <form
                onSubmit={addTask}
                className="mt-2 pt-3 border-t border-outline-variant/20 flex flex-col relative overflow-visible"
              >
                {suggestions.length > 0 && (
                  <div
                    className="absolute bottom-[calc(100%+8px)] left-0 w-72 sm:w-80 max-h-52 overflow-y-auto bg-surface-container-high border border-outline-variant/30 rounded-lg shadow-xl z-50 animate-in fade-in slide-in-from-bottom-2 py-1 custom-scrollbar overscroll-contain"
                    onWheel={(e) => e.stopPropagation()}
                  >
                    {suggestions.map((s, i) => (
                      <button
                        key={i}
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          applySuggestion(s.value);
                        }}
                        className={`w-full text-left px-3.5 py-1.5 text-xs font-mono flex items-center justify-between gap-2 transition-colors ${i === safeSuggestionIndex ? "bg-surface-container-highest text-primary font-semibold" : "text-on-surface hover:bg-surface-container-highest hover:text-primary"}`}
                        ref={(el) => {
                          if (el && i === safeSuggestionIndex) {
                            el.scrollIntoView({ block: "nearest" });
                          }
                        }}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <Command
                            size={11}
                            className={
                              i === safeSuggestionIndex
                                ? "opacity-100 text-primary"
                                : "opacity-40"
                            }
                          />
                          <span className="truncate">{s.label}</span>
                        </div>
                        {s.subLabel && (
                          <span
                            className={`text-[10px] shrink-0 font-normal ${i === safeSuggestionIndex ? "text-primary/80" : "text-on-surface-variant"}`}
                          >
                            {s.subLabel}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <div className="relative flex-1 bg-surface-container-lowest border border-outline-variant/40 rounded-lg px-3 py-2 flex items-center overflow-hidden focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/50">
                    <div
                      ref={backdropRef}
                      className="absolute inset-0 px-3 py-2 font-mono text-xs whitespace-pre overflow-hidden pointer-events-none text-transparent"
                    >
                      {renderHighlights(newTaskInput)}
                    </div>
                    <input
                      ref={inputRef}
                      type="text"
                      value={newTaskInput}
                      onChange={handleInputChange}
                      onSelect={handleInputSelect}
                      onScroll={handleScroll}
                      onKeyUp={handleInputSelect}
                      onMouseUp={handleInputSelect}
                      onKeyDown={handleKeyDown}
                      placeholder="e.g. Practice @chord(G major) @scale(C major) @bpm(120) @timer(15m 30s)..."
                      className="w-full bg-transparent font-mono text-xs text-on-surface outline-none relative z-10"
                      autoComplete="off"
                      spellCheck="false"
                    />
                  </div>
                  <button
                    type="submit"
                    aria-label="Add task"
                    disabled={
                      !newTaskInput.trim() ||
                      suggestions.length > 0 ||
                      (newTaskDuration === "custom" && !newTaskRange)
                    }
                    className="bg-primary text-on-primary w-10 h-10 rounded-lg flex items-center justify-center font-bold hover:scale-105 active:scale-95 transition-all shadow-md shrink-0 cursor-pointer disabled:opacity-50"
                  >
                    <Plus size={18} />
                  </button>
                </div>
                <div className="mt-3 flex flex-wrap items-start justify-between gap-2">
                  <div className="space-y-1">
                    <span className="block text-xs font-mono font-semibold text-on-surface">
                      Task duration
                    </span>
                    <span className="block text-[10px] font-mono text-on-surface-variant">
                      New tasks use the default duration from Settings
                    </span>
                  </div>
                  <TaskDurationMenu
                    value={newTaskDuration}
                    startDate={activeDayDate.getTime()}
                    weekday={activeDayDate.getDay()}
                    customWeeks={newTaskWeeks}
                    onCustomWeeksChange={setNewTaskWeeks}
                    onCustomDurationApply={(weeks) => {
                      setNewTaskWeeks(weeks);
                      setNewTaskDuration("custom");
                      inputRef.current?.form
                        ?.querySelector<HTMLButtonElement>(
                          'button[type="submit"]',
                        )
                        ?.focus();
                    }}
                    defaultDurationLabel={getDefaultTaskDurationLabel(settings)}
                    defaultDuration={settings.taskDefaultDuration}
                    onChange={(duration) => {
                      setNewTaskDuration(duration);
                    }}
                  />
                </div>
                {newTaskDuration === "custom" && newTaskRange && (
                  <p className="mt-2 text-[10px] font-mono text-on-surface-variant">
                    {new Date(newTaskRange.startsAt).toLocaleDateString(
                      undefined,
                      {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      },
                    )}
                    {" - "}
                    {new Date(newTaskRange.expiresAt - 1).toLocaleDateString(
                      undefined,
                      {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      },
                    )}
                  </p>
                )}
                {newTaskDuration === "custom" && newTaskDurationError && (
                  <p role="alert" className="mt-2 text-xs font-mono text-error">
                    {newTaskDurationError}
                  </p>
                )}
              </form>
              <div className="text-[10px] text-on-surface-variant font-mono text-center">
                Type <strong className="text-primary">@</strong> for tags
                (custom, tuning, scale, chord, bpm, timer...)
              </div>
            </>
          )}
        </div>

        {/* Right Column: Practice Stopwatch Timer & Active Day Summary */}
        <div className="lg:col-span-5 flex flex-col gap-5">
          <SessionWidget
            streak={streakData}
            activeSessionDuration={activeSessionDuration}
            isSessionActive={isSessionActive}
            onToggleSession={onToggleSession}
            onEndSession={onEndSession}
            currentScaleName={activeDay.focusTheme}
            highestBpmSession={activeDay.defaultBpm}
          />

          <div className="bg-surface-container border border-outline-variant/30 rounded-xl p-5 shadow-md flex flex-col gap-3">
            <div className="flex items-center justify-between pb-2 border-b border-outline-variant/20">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-on-surface">
                Active Day Progress
              </span>
              <span className="text-xs font-mono text-primary font-bold">
                {activeDayTaskCounts.completed}/{activeDayTaskCounts.total}{" "}
                goals
              </span>
            </div>
            <div className="flex flex-col gap-1 text-xs font-mono text-on-surface-variant">
              {editingDayField === "focus" ? (
                <label className="flex items-center justify-between gap-3">
                  <span className="shrink-0">Focus:</span>
                  <input
                    type="text"
                    value={activeDay.focusTheme}
                    onChange={(event) =>
                      updateActiveDay({ focusTheme: event.target.value })
                    }
                    onBlur={() => setEditingDayField(null)}
                    aria-label="Active day focus"
                    autoFocus
                    className="min-w-0 flex-1 rounded border border-primary bg-surface-container-lowest px-2 py-1 text-right text-on-surface outline-none ring-1 ring-primary/50"
                  />
                </label>
              ) : (
                <button
                  type="button"
                  onClick={() => setEditingDayField("focus")}
                  title="Click to edit focus"
                  aria-label="Click to edit active day focus"
                  className="group flex w-full items-center justify-between gap-3 rounded px-1 py-1 text-left transition-colors hover:bg-surface-container-highest"
                >
                  <span className="shrink-0">Focus:</span>
                  <span className="min-w-0 flex-1 truncate text-right text-on-surface font-semibold">
                    {activeDay.focusTheme}
                  </span>
                  <span className="flex shrink-0 items-center gap-1 text-[9px] font-bold text-primary opacity-70 transition-opacity group-hover:opacity-100">
                    <Edit2 size={11} />
                  </span>
                </button>
              )}
              <div className="flex items-center justify-between gap-3">
                {editingDayField === "duration" ? (
                  <>
                    <label htmlFor="active-day-duration" className="shrink-0">
                      Target Duration:
                    </label>
                    <div className="flex items-center gap-1">
                      <input
                        id="active-day-duration"
                        type="number"
                        min={1}
                        max={180}
                        step={1}
                        value={activeDay.goalDurationMins}
                        onChange={(event) => {
                          const value = Number(event.target.value);
                          if (Number.isFinite(value) && value > 0) {
                            updateActiveDay({
                              goalDurationMins: clampDurationMinutes(value),
                            });
                          }
                        }}
                        onBlur={() => setEditingDayField(null)}
                        aria-label="Active day target duration in minutes"
                        autoFocus
                        className="w-20 rounded border border-primary bg-surface-container-lowest px-2 py-1 text-right text-on-surface outline-none ring-1 ring-primary/50"
                      />
                      <span>minutes</span>
                    </div>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => setEditingDayField("duration")}
                    title="Click to edit target duration"
                    aria-label="Click to edit active day target duration"
                    className="group flex w-full items-center justify-between gap-3 rounded px-1 py-1 text-left transition-colors hover:bg-surface-container-highest"
                  >
                    <span className="shrink-0">Target Duration:</span>
                    <span className="flex shrink-0 items-center gap-1 text-on-surface font-semibold">
                      {activeDay.goalDurationMins} minutes
                      <span className="ml-1 flex items-center gap-1 text-[9px] font-bold text-primary opacity-70 transition-opacity group-hover:opacity-100">
                        <Edit2 size={11} />
                      </span>
                    </span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {activeDropdown && (
        <DropdownEditor
          active={activeDropdown}
          onClose={() => setActiveDropdown(null)}
          onSave={updateMention}
        />
      )}
      {pendingDeleteTask && (
        <TaskDeleteDialog
          taskName={pendingDeleteTask.text}
          onConfirm={removeTask}
          onCancel={() => setPendingDeleteTask(null)}
        />
      )}
    </div>
  );
};
