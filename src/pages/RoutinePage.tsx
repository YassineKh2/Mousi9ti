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
import { AppSettings, NoteName, PracticeTask, TaskActivity } from "../types";
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
} from "../components/PracticeTasksWidget";
import { useTimer } from "../lib/useTimer";
import {
  getSavedSessions,
  getSavedTaskActivities,
  recordTaskActivity,
} from "../lib/storage";
import { clampDurationMinutes } from "../lib/taskAutoConfig";
import { SessionWidget } from "../components/SessionWidget";
import {
  CalendarDateRange,
  CalendarRangePicker,
} from "../components/CalendarRangePicker";
import { StreakData } from "../types";
import { useSettingsContext } from "../contexts/SettingsContext";

type TaskDurationPeriod =
  | "default"
  | "forever"
  | "week"
  | "month"
  | "year"
  | "custom";

interface RoutineTask {
  id: string;
  text: string;
  completed: boolean;
  duration?: TaskDurationPeriod;
  startsAt?: number;
  expiresAt?: number;
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

const getTaskExpiration = (period: TaskDurationPeriod): number | undefined => {
  if (period === "forever" || period === "default") return undefined;
  if (period === "custom") return undefined;

  const expiration = new Date();
  expiration.setHours(0, 0, 0, 0);
  if (period === "week") {
    expiration.setDate(
      expiration.getDate() + ((7 - expiration.getDay()) % 7 || 7),
    );
  } else if (period === "month") {
    expiration.setMonth(expiration.getMonth() + 1, 1);
  } else {
    expiration.setFullYear(expiration.getFullYear() + 1, 0, 1);
  }
  return expiration.getTime();
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
  if (settings.taskDefaultDuration === "week") return "1 week";
  if (settings.taskDefaultDuration === "month") return "1 month";
  if (settings.taskDefaultDuration === "year") return "1 year";
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
    expiration.setDate(expiration.getDate() + 7);
  } else if (settings.taskDefaultDuration === "month") {
    addCalendarMonths(expiration, 1);
  } else if (settings.taskDefaultDuration === "year") {
    addCalendarMonths(expiration, 12);
  } else {
    const duration = Number.isInteger(settings.taskDefaultCustomDuration)
      ? Math.min(Math.max(settings.taskDefaultCustomDuration, 1), 999)
      : 1;
    if (settings.taskDefaultCustomUnit === "days") {
      expiration.setDate(expiration.getDate() + duration);
    } else if (settings.taskDefaultCustomUnit === "weeks") {
      expiration.setDate(expiration.getDate() + duration * 7);
    } else if (settings.taskDefaultCustomUnit === "years") {
      addCalendarMonths(expiration, duration * 12);
    } else {
      addCalendarMonths(expiration, duration);
    }
  }
  return expiration.getTime();
};

const isExpiredTask = (task: RoutineTask | PracticeTask) => {
  const expiresAt = "expiresAt" in task ? task.expiresAt : undefined;
  return Number.isFinite(expiresAt) && expiresAt! <= Date.now();
};

const taskRange = (task: RoutineTask): CalendarDateRange | null =>
  task.startsAt !== undefined && task.expiresAt !== undefined
    ? { start: task.startsAt, end: task.expiresAt }
    : null;

const getStartOfDay = (timestamp: number) => {
  const date = new Date(timestamp);
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
  ).getTime();
};

const getEndOfDay = (timestamp: number) => {
  const date = new Date(timestamp);
  date.setHours(23, 59, 59, 999);
  return date.getTime();
};

const getTaskDurationLabel = (task: RoutineTask) => {
  if (task.duration === "custom") return "Custom dates";
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
  { value: "custom", label: "Custom dates" },
];

const TaskDurationMenu: React.FC<{
  value: TaskDurationPeriod;
  onChange: (value: TaskDurationPeriod) => void;
  customRange: CalendarDateRange | null;
  onCustomRangeChange: (range: CalendarDateRange) => void;
  defaultDurationLabel?: string;
  iconOnly?: boolean;
  className?: string;
}> = ({
  value,
  onChange,
  customRange,
  onCustomRangeChange,
  defaultDurationLabel,
  iconOnly = false,
  className = "",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [showingCustomCalendar, setShowingCustomCalendar] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuPanelRef = useRef<HTMLDivElement>(null);
  const [menuPosition, setMenuPosition] = useState<React.CSSProperties | null>(
    null,
  );
  const durationOptions = defaultDurationLabel
    ? [
        {
          value: "default" as const,
          label: `Default (${defaultDurationLabel})`,
        },
        ...TASK_DURATION_OPTIONS,
      ]
    : TASK_DURATION_OPTIONS;
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

    const updateMenuPosition = () => {
      const button = buttonRef.current;
      const panel = menuPanelRef.current;
      if (!button || !panel) return;

      const buttonRect = button.getBoundingClientRect();
      const panelRect = panel.getBoundingClientRect();
      const panelHeight = panel.scrollHeight;
      const viewportWidth = document.documentElement.clientWidth;
      const viewportHeight = document.documentElement.clientHeight;
      const gap = 8;
      const edgePadding = 8;
      const availableViewportHeight = Math.max(
        0,
        viewportHeight - edgePadding * 2,
      );
      const maxHeight = Math.min(panelHeight, availableViewportHeight);
      const spaceAbove = Math.max(0, buttonRect.top - gap - edgePadding);
      const spaceBelow = Math.max(
        0,
        viewportHeight - buttonRect.bottom - gap - edgePadding,
      );
      const openAbove = panelHeight > spaceBelow && spaceAbove > spaceBelow;
      const left = iconOnly
        ? buttonRect.right - panelRect.width
        : buttonRect.left;
      const clampedLeft = Math.min(
        Math.max(edgePadding, left),
        Math.max(edgePadding, viewportWidth - panelRect.width - edgePadding),
      );
      const top = openAbove
        ? buttonRect.top - gap - maxHeight
        : buttonRect.bottom + gap;
      const clampedTop = Math.min(
        Math.max(edgePadding, top),
        Math.max(edgePadding, viewportHeight - maxHeight - edgePadding),
      );

      setMenuPosition({
        position: "fixed",
        top: clampedTop,
        left: clampedLeft,
        maxHeight,
        transformOrigin: openAbove ? "bottom left" : "top left",
      });
    };

    updateMenuPosition();
    window.addEventListener("resize", updateMenuPosition);
    window.addEventListener("scroll", updateMenuPosition, true);
    return () => {
      window.removeEventListener("resize", updateMenuPosition);
      window.removeEventListener("scroll", updateMenuPosition, true);
    };
  }, [iconOnly, isOpen, showingCustomCalendar, value, durationOptions.length]);

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
            setShowingCustomCalendar(value === "custom");
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
            className={`z-50 w-[21rem] max-w-[calc(100vw-2rem)] rounded-xl border border-outline-variant/40 bg-surface p-2 shadow-2xl ${
              showingCustomCalendar ? "task-duration-calendar-view pb-4" : ""
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
            {showingCustomCalendar ? (
              <>
                <button
                  type="button"
                  onClick={() => setShowingCustomCalendar(false)}
                  className="mb-2 flex w-full items-center gap-1 rounded px-2 py-2 text-left text-xs font-mono text-on-surface-variant transition-colors hover:bg-surface-container-high hover:text-on-surface"
                >
                  <ChevronLeft size={14} />
                  Duration options
                </button>
                <CalendarRangePicker
                  range={customRange}
                  minDate={Date.now()}
                  inline
                  onChange={onCustomRangeChange}
                  onComplete={() => setIsOpen(false)}
                />
              </>
            ) : (
              durationOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  aria-current={value === option.value ? "true" : undefined}
                  onClick={() => {
                    onChange(option.value);
                    if (option.value === "custom") {
                      setShowingCustomCalendar(true);
                    } else {
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

const DEFAULT_WEEKLY_SCHEDULE: DayBlueprint[] = [
  {
    day: "MON",
    name: "Monday",
    focusTheme: "Scale Mastery & Pentatonic Flows",
    goalDurationMins: 45,
    defaultBpm: 100,
    modules: [
      {
        id: "m1",
        title: "Warm-up Chromatics",
        durationMin: 10,
        completed: true,
      },
      {
        id: "m2",
        title: "Major Scale Box Positions",
        durationMin: 20,
        completed: true,
      },
      {
        id: "m3",
        title: "Improvisation Backing Track",
        durationMin: 15,
        completed: true,
      },
    ],
    tasks: [
      {
        id: "t1",
        text: "Warm up with @scale(C major) Scale • 10m logged",
        completed: true,
      },
      {
        id: "t2",
        text: "Practice major scale positions across neck",
        completed: true,
      },
      {
        id: "t3",
        text: "Play along with @bpm(100) for @timer(15m)",
        completed: true,
      },
    ],
  },
  {
    day: "TUE",
    name: "Tuesday",
    focusTheme: "Chord Voicings & Transitions",
    goalDurationMins: 50,
    defaultBpm: 110,
    modules: [
      {
        id: "m1",
        title: "Chord Inversion Arpeggios",
        durationMin: 15,
        completed: true,
      },
      {
        id: "m2",
        title: "Smooth Chord Changes",
        durationMin: 20,
        completed: true,
      },
      {
        id: "m3",
        title: "Metronome Timing Drill",
        durationMin: 15,
        completed: true,
      },
    ],
    tasks: [
      {
        id: "t1",
        text: "Practice @chord(G major) to @chord(C major) changes",
        completed: true,
      },
      {
        id: "t2",
        text: "Chord voicing drills in @key(G Major)",
        completed: true,
      },
      { id: "t3", text: "Metronome timing test @bpm(110)", completed: true },
    ],
  },
  {
    day: "WED",
    name: "Wednesday",
    focusTheme: "Speed, Agility & Finger Independence",
    goalDurationMins: 65,
    defaultBpm: 130,
    modules: [
      {
        id: "m1",
        title: "Hanon & Spider Drills",
        durationMin: 20,
        completed: true,
      },
      {
        id: "m2",
        title: "Alternate Picking Speed Burst",
        durationMin: 25,
        completed: true,
      },
      {
        id: "m3",
        title: "String Skipping Etude",
        durationMin: 20,
        completed: true,
      },
    ],
    tasks: [
      {
        id: "t1",
        text: "Spider 1-2-3-4 drill with @bpm(130)",
        completed: true,
      },
      {
        id: "t2",
        text: "Alternate picking speed bursts @technique(Alternate Picking)",
        completed: true,
      },
      { id: "t3", text: "String skipping accuracy routine", completed: true },
    ],
  },
  {
    day: "THU",
    name: "Thursday",
    focusTheme: "Fretboard Visualization & CAGED Transitions",
    goalDurationMins: 60,
    defaultBpm: 120,
    modules: [
      {
        id: "m1",
        title: "Warm-up Chromatics",
        durationMin: 10,
        completed: true,
      },
      {
        id: "m2",
        title: "Random Note Fretboard Drill",
        durationMin: 10,
        completed: true,
      },
      {
        id: "m3",
        title: "CAGED Scale Position Linking",
        durationMin: 20,
        completed: false,
      },
      {
        id: "m4",
        title: "BPM Speed Ladder Alternate Picking",
        durationMin: 20,
        completed: false,
      },
    ],
    tasks: [
      {
        id: "t1",
        text: "Warm up with @scale(C major) • 10m logged",
        completed: true,
      },
      {
        id: "t2",
        text: "Practice @key(G Major) to @key(C Major) changes",
        completed: true,
      },
      {
        id: "t3",
        text: "Play along with @bpm(80) for @timer(5m)",
        completed: true,
      },
      {
        id: "t4",
        text: "Neck memorization: locate F# across all 6 strings",
        completed: true,
      },
      {
        id: "t5",
        text: "Drill @scale(A pentatonic minor) connecting Pos 1 -> Pos 2",
        completed: false,
      },
      {
        id: "t6",
        text: "Speed burst alternate picking with @bpm(120) for @timer(15m)",
        completed: false,
      },
    ],
  },
  {
    day: "FRI",
    name: "Friday",
    focusTheme: "Rhythm, Strumming & Grooves",
    goalDurationMins: 40,
    defaultBpm: 90,
    modules: [
      {
        id: "m1",
        title: "Syncopated Rhythm Patterns",
        durationMin: 20,
        completed: false,
      },
      {
        id: "m2",
        title: "Metronome Subdivision Drill",
        durationMin: 20,
        completed: false,
      },
    ],
    tasks: [
      {
        id: "t1",
        text: "Syncopated strumming with @bpm(90)",
        completed: false,
      },
      {
        id: "t2",
        text: "Subdivision click accuracy drill @metronome(90,4/4)",
        completed: false,
      },
    ],
  },
  {
    day: "SAT",
    name: "Saturday",
    focusTheme: "Repertoire & Full Practice Suite",
    goalDurationMins: 75,
    defaultBpm: 115,
    modules: [
      {
        id: "m1",
        title: "Full Song Playthroughs",
        durationMin: 35,
        completed: false,
      },
      {
        id: "m2",
        title: "Sweep Picking & Arpeggios",
        durationMin: 20,
        completed: false,
      },
      {
        id: "m3",
        title: "Improvisation Jam Session",
        durationMin: 20,
        completed: false,
      },
    ],
    tasks: [
      {
        id: "t1",
        text: "Full playthrough of main pieces @custom(Performance ready)",
        completed: false,
      },
      {
        id: "t2",
        text: "Sweep arpeggio transitions @technique(Sweep Picking)",
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
        durationMin: 15,
        completed: false,
      },
    ],
    tasks: [
      {
        id: "t1",
        text: "Free Improvisation in @key(A Minor)",
        completed: false,
      },
      {
        id: "t2",
        text: "Review weekly logs and notes @timer(15m)",
        completed: false,
      },
    ],
  },
];

const DAY_CODES = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
const getTodayCode = () => DAY_CODES[new Date().getDay()];
const getWeekStart = (date: Date) => {
  const weekStart = new Date(date);
  weekStart.setHours(0, 0, 0, 0);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  return weekStart;
};
const getMonthWeeks = (month: Date) => {
  const firstDay = new Date(month.getFullYear(), month.getMonth(), 1);
  const lastDay = new Date(month.getFullYear(), month.getMonth() + 1, 0);
  const weeks = [];
  const weekStart = getWeekStart(firstDay);
  while (weekStart <= lastDay) {
    weeks.push(new Date(weekStart));
    weekStart.setDate(weekStart.getDate() + 7);
  }
  return weeks;
};

interface RoutinePageProps {
  timer?: ReturnType<typeof useTimer>;
  streak?: StreakData;
  practiceTasks?: PracticeTask[];
  onPracticeTasksChange?: (tasks: PracticeTask[]) => void;
  activeSessionDuration?: number;
  isSessionActive?: boolean;
  onToggleSession?: () => void;
  onEndSession?: () => void;
}

export const RoutinePage: React.FC<RoutinePageProps> = ({
  timer: propTimer,
  streak: propStreak,
  practiceTasks,
  onPracticeTasksChange,
  activeSessionDuration = 0,
  isSessionActive = false,
  onToggleSession = () => {},
  onEndSession = () => {},
}) => {
  const settings = useSettingsContext();
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
  const historyWeeks = getMonthWeeks(historyMonth);
  const getHistoryDateForDay = (dayCode: string) => {
    const date = new Date(historyWeekStart);
    date.setDate(date.getDate() + DAY_CODES.indexOf(dayCode));
    return date;
  };
  const getTaskHistoryForDay = (dayCode: string) => {
    const date = getHistoryDateForDay(dayCode);
    const dateKey = [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, "0"),
      String(date.getDate()).padStart(2, "0"),
    ].join("-");
    return taskHistory.filter((activity) => activity.date === dateKey);
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
    setHistoryWeekStart(getMonthWeeks(nextMonth)[0]);
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
    let schedule = DEFAULT_WEEKLY_SCHEDULE;
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) schedule = parsed;
      } catch (e) {}
    }

    schedule = schedule.map((day) => ({
      ...day,
      tasks: day.tasks.filter((task) => !isExpiredTask(task)),
    }));

    if (practiceTasks) {
      const currentTasks = practiceTasks.filter((task) => !isExpiredTask(task));
      return schedule.map((day) =>
        day.day === getTodayCode() ? { ...day, tasks: currentTasks } : day,
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
              tasks: parsedTasks.filter((task) => !isExpiredTask(task)),
            }
          : day,
      );
    } catch (e) {
      return schedule;
    }
  });
  const daysInWeek = DAY_CODES.map((dayCode) =>
    weeklySchedule.find((day) => day.day === dayCode),
  ).filter((day): day is DayBlueprint => Boolean(day));

  const [activeDayCode, setActiveDayCode] = useState<string>(getTodayCode);
  const activeDay =
    weeklySchedule.find((d) => d.day === activeDayCode) || weeklySchedule[3];

  // Sync state to localStorage
  useEffect(() => {
    localStorage.setItem(
      "mous9iti_weekly_schedule",
      JSON.stringify(weeklySchedule),
    );
    if (activeDay?.day === getTodayCode()) {
      localStorage.setItem(
        "mous9iti_routine",
        JSON.stringify(
          activeDay.tasks.map((t) => ({
            id: t.id,
            title: t.text,
            completed: t.completed,
            type: "custom",
            durationSec: 300,
            restSec: 30,
            bpm: 120,
          })),
        ),
      );
      localStorage.setItem("mous9iti_tasks", JSON.stringify(activeDay.tasks));
    }
  }, [weeklySchedule, activeDayCode]);

  useEffect(() => {
    const nextExpiration = weeklySchedule
      .flatMap((day) => day.tasks)
      .map((task) => task.expiresAt)
      .filter((expiresAt): expiresAt is number => Number.isFinite(expiresAt))
      .reduce((earliest, expiresAt) => Math.min(earliest, expiresAt), Infinity);
    if (!Number.isFinite(nextExpiration)) return;

    const timeout = window.setTimeout(
      () => {
        setWeeklySchedule((current) =>
          current.map((day) => ({
            ...day,
            tasks: day.tasks.filter((task) => !isExpiredTask(task)),
          })),
        );
      },
      Math.min(Math.max(0, nextExpiration - Date.now()), 2_147_483_647),
    );

    return () => window.clearTimeout(timeout);
  }, [weeklySchedule]);

  useEffect(() => {
    if (activeDay?.day === getTodayCode()) {
      onPracticeTasksChange?.(activeDay.tasks);
    }
  }, [weeklySchedule, activeDayCode, onPracticeTasksChange]);

  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === "mous9iti_tasks" && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          setWeeklySchedule((prev) =>
            prev.map((d) => {
              if (d.day === getTodayCode()) {
                return { ...d, tasks: parsed };
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
  const [newTaskRange, setNewTaskRange] = useState<CalendarDateRange | null>(
    null,
  );
  const [cursor, setCursor] = useState(0);
  const [suggestionIndex, setSuggestionIndex] = useState(0);
  const [activeDropdown, setActiveDropdown] = useState<ActiveDropdown | null>(
    null,
  );
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
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
    if (task?.startsAt && task.startsAt > Date.now()) return;
    if (task && !task.completed) {
      recordTaskActivity(task, "started");
      recordTaskActivity(task, "completed");
      setTaskHistory(getSavedTaskActivities());
    }
    setWeeklySchedule((prev) =>
      prev.map((d) => {
        if (d.day === activeDayCode) {
          return {
            ...d,
            tasks: d.tasks.map((t) =>
              t.id === taskId ? { ...t, completed: !t.completed } : t,
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
      text: newTaskInput.trim(),
      completed: false,
      duration: taskDuration,
      startsAt: usesDefaultDuration
        ? customRange?.start
        : newTaskDuration === "custom" && newTaskRange
          ? getStartOfDay(newTaskRange.start)
          : undefined,
      expiresAt: usesDefaultDuration
        ? configuredExpiration
        : newTaskDuration === "custom" && newTaskRange
          ? getEndOfDay(newTaskRange.end)
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
    setNewTaskRange(null);
    setCursor(0);
  };

  const updateTaskDuration = (taskId: string, duration: TaskDurationPeriod) => {
    setWeeklySchedule((prev) =>
      prev.map((day) =>
        day.day === activeDayCode
          ? {
              ...day,
              tasks: day.tasks.map((task) =>
                task.id === taskId
                  ? {
                      ...task,
                      duration,
                      startsAt:
                        duration === "custom" && task.duration === "custom"
                          ? task.startsAt
                          : undefined,
                      expiresAt:
                        duration === "custom"
                          ? task.duration === "custom"
                            ? task.expiresAt
                            : undefined
                          : getTaskExpiration(duration),
                    }
                  : task,
              ),
            }
          : day,
      ),
    );
  };

  const updateTaskRange = (taskId: string, range: CalendarDateRange) => {
    setWeeklySchedule((prev) =>
      prev.map((day) =>
        day.day === activeDayCode
          ? {
              ...day,
              tasks: day.tasks.map((task) =>
                task.id === taskId
                  ? {
                      ...task,
                      duration: "custom",
                      startsAt: getStartOfDay(range.start),
                      expiresAt: getEndOfDay(range.end),
                    }
                  : task,
              ),
            }
          : day,
      ),
    );
  };

  const removeTask = (taskId: string) => {
    setWeeklySchedule((prev) =>
      prev.map((d) => {
        if (d.day === activeDayCode) {
          return { ...d, tasks: d.tasks.filter((t) => t.id !== taskId) };
        }
        return d;
      }),
    );
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
          className={`inline-flex items-center gap-1 px-1.5 py-0.5 mx-0.5 rounded text-[11px] font-mono font-bold align-middle shadow-sm cursor-pointer transition-colors ${badgeClass} ${task.completed ? "line-through" : ""}`}
          title="Click to edit badge settings"
        >
          <Icon size={12} />
          {label}
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
    const completedTasksCount = d.tasks.filter((t) => t.completed).length;
    const totalTasksCount = d.tasks.length || 1;
    return (
      acc +
      Math.round((completedTasksCount / totalTasksCount) * d.goalDurationMins)
    );
  }, 0);
  const completionPercent =
    Math.round((completedMins / totalWeekTargetMins) * 100) || 58;

  const formatHoursMins = (mins: number) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${h}h ${m}m`;
  };

  return (
    <div className="routine-page space-y-6 pb-12 relative">
      {/* Top Banner: Weekly Schedule & Cadence */}
      <div className="bg-surface-container border border-outline-variant/30 rounded-xl p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 shadow-md">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-mono text-base font-bold tracking-[0.2em] text-on-surface uppercase flex items-center gap-2">
              <Calendar size={18} className="text-primary" />
              Weekly Schedule & Cadence
            </h1>
            <span className="hidden sm:inline text-xs text-on-surface-variant font-mono">
              • Select day to inspect and define routine
            </span>
          </div>
        </div>
        <div className="grid w-full grid-cols-2 gap-x-4 gap-y-3 font-mono text-xs lg:w-auto lg:flex lg:flex-wrap lg:items-center lg:gap-6">
          <div className="min-w-0 text-on-surface-variant lg:inline">
            <span className="block text-[10px] uppercase tracking-wider lg:inline lg:text-xs lg:normal-case lg:tracking-normal">
              Week target
            </span>{" "}
            <strong className="text-on-surface font-bold">
              {formatHoursMins(totalWeekTargetMins)}
            </strong>
          </div>
          <div className="flex min-w-0 flex-col items-start gap-1 text-on-surface-variant lg:flex-row lg:flex-wrap lg:items-center lg:gap-3">
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

                      return (
                        <button
                          key={weekStart.getTime()}
                          type="button"
                          className={`routine-history-week-option ${
                            isSelected ? "selected" : ""
                          }`}
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
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        {daysInWeek.map((day) => {
          const dayHistory = getTaskHistoryForDay(day.day);
          const loggedTasks = new Map<
            string,
            { id: string; text: string; completed: boolean }
          >();
          dayHistory.forEach((activity) => {
            const loggedTask = loggedTasks.get(activity.taskId);
            loggedTasks.set(activity.taskId, {
              id: activity.taskId,
              text: loggedTask?.text || activity.taskText,
              completed: loggedTask?.completed || activity.kind === "completed",
            });
          });
          const dayTasks = isCurrentWeek
            ? day.tasks
            : [...loggedTasks.values()];
          const completedCount = dayTasks.filter(
            (task) => task.completed,
          ).length;
          const totalCount = dayTasks.length;
          const historyDate = getHistoryDateForDay(day.day);
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
              className={`text-left p-3.5 rounded-xl border flex flex-col justify-between gap-3 relative transition-all cursor-pointer ${
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
                {formatHistoryDate(historyDate)} · {dayHistory.length} done
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
        <div className="lg:col-span-7 bg-surface-container border border-outline-variant/30 rounded-xl p-5 shadow-md flex flex-col gap-4">
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
                (activeDay.tasks.filter((t) => t.completed).length /
                  (activeDay.tasks.length || 1)) *
                  100,
              )}
              %
            </div>
          </div>

          {/* Tasks List */}
          {/* Tasks List */}
          <div className="flex flex-col gap-2.5 min-h-[300px] overflow-y-auto max-h-[360px] custom-scrollbar pr-1">
            {activeDay.tasks.length === 0 ? (
              <div className="text-center py-12 text-on-surface-variant text-sm font-mono">
                No goals defined for {activeDay.name}. Add one below or
                configure the blueprint.
              </div>
            ) : (
              activeDay.tasks.map((task) => {
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
                    onClick={() => toggleTaskCompleted(task.id)}
                    className={`group flex items-center gap-3 p-3 rounded-lg border transition-all cursor-pointer ${
                      task.completed
                        ? "bg-surface-container-low/50 border-outline-variant/20 opacity-75"
                        : "bg-surface-container-low border-outline-variant/30 hover:border-primary/50"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleTaskCompleted(task.id);
                      }}
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
                        className={`text-sm font-mono leading-relaxed ${task.completed ? "line-through text-on-surface-variant" : "text-on-surface"}`}
                      >
                        {renderTaskText(task)}
                      </div>
                      {task.startsAt !== undefined &&
                        task.expiresAt !== undefined && (
                          <span className="mt-1 block text-[10px] font-mono text-on-surface-variant">
                            {new Date(task.startsAt).toLocaleDateString(
                              undefined,
                              {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              },
                            )}
                            {" - "}
                            {new Date(task.expiresAt).toLocaleDateString(
                              undefined,
                              {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              },
                            )}
                          </span>
                        )}
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <TaskDurationMenu
                        value={task.duration ?? "forever"}
                        customRange={taskRange(task)}
                        onCustomRangeChange={(range) =>
                          updateTaskRange(task.id, range)
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
                          removeTask(task.id);
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
            <div className="mt-3 flex flex-wrap items-start justify-between gap-2 border-t border-outline-variant/20 pt-3">
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
                customRange={newTaskRange}
                onCustomRangeChange={setNewTaskRange}
                defaultDurationLabel={getDefaultTaskDurationLabel(settings)}
                onChange={(duration) => {
                  setNewTaskDuration(duration);
                  if (duration !== "custom") setNewTaskRange(null);
                }}
              />
            </div>
            {newTaskDuration === "custom" && newTaskRange && (
              <p className="mt-2 text-[10px] font-mono text-on-surface-variant">
                {new Date(newTaskRange.start).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
                {" - "}
                {new Date(newTaskRange.end).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </p>
            )}
          </form>
          <div className="text-[10px] text-on-surface-variant font-mono text-center">
            Type <strong className="text-primary">@</strong> for tags (custom,
            tuning, scale, chord, bpm, timer...)
          </div>
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
                {activeDay.tasks.filter((t) => t.completed).length}/
                {activeDay.tasks.length} goals
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
    </div>
  );
};
