import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Session,
  StreakData,
  TaskActivity,
  PracticeActivity,
  PracticeTask,
} from "../types";
import {
  getSavedPracticeActivities,
  getSavedSettings,
  getSavedTaskActivities,
  getSavedTaskAttributions,
} from "../lib/storage";
import { getSavedCustomTags } from "../lib/customTaskTags";
import {
  formatDurationLabel,
  MENTION_REGEX,
  parseParams,
} from "../utils/taskMentions";
import { isTaskVisibleOnDate } from "../lib/taskDates";
import { isPracticeDayComplete } from "../lib/practiceDays";
import { CalendarRangePicker } from "../components/CalendarRangePicker";
import { useSettingsContext } from "../contexts/SettingsContext";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Area,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Activity,
  BarChart3,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Flame,
  Gauge,
  Hash,
  ListChecks,
  Music,
  Sliders,
  Compass,
  Tag,
  Target,
  Zap,
} from "lucide-react";

interface StatsPageProps {
  sessions: Session[];
  streak: StreakData;
}

type Range = "week" | "30" | "90" | "all" | "custom";
export type StatisticsScope = "guitar" | "piano" | "all";
const statisticsInstrument = (record: object): "guitar" | "piano" =>
  (record as { instrument?: string }).instrument === "piano"
    ? "piano"
    : "guitar";

export function filterStatisticsRecords<T extends object>(
  records: T[],
  scope: StatisticsScope,
): T[] {
  return records.filter(
    (record) => scope === "all" || statisticsInstrument(record) === scope,
  );
}

export function getDefaultStatisticsScope(value: unknown): StatisticsScope {
  return value === "piano" ? "piano" : "guitar";
}

const statisticsTaskKey = (task: object, id: string) =>
  `${statisticsInstrument(task)}:${id}`;

export function getStatisticsPracticeDates(
  activities: { date: string; source: string; durationSeconds: number }[],
  taskActivities: TaskActivity[],
  todayTasks: PracticeTask[] | null,
  tasksByWeekday: ReadonlyMap<string, PracticeTask[]>,
  today: string,
): string[] {
  const completedByDate = new Map<string, Set<string>>();
  const tasksByDate = new Map<string, Set<string>>();
  taskActivities.forEach((activity) => {
    const key = statisticsTaskKey(activity, activity.taskId);
    const taskIds = tasksByDate.get(activity.date) || new Set<string>();
    taskIds.add(key);
    tasksByDate.set(activity.date, taskIds);
    if (activity.kind === "completed") {
      const completed = completedByDate.get(activity.date) || new Set<string>();
      completed.add(key);
      completedByDate.set(activity.date, completed);
    }
  });
  const dates = new Set([
    ...activities.map((activity) => activity.date),
    ...taskActivities.map((activity) => activity.date),
  ]);
  const weekdayCodes = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
  return [...dates]
    .filter((date) => {
      const day = new Date(`${date}T12:00:00`);
      const scheduled = date === today ? todayTasks : undefined;
      const planned =
        scheduled ??
        tasksByWeekday
          .get(weekdayCodes[day.getDay()])
          ?.filter((task) => isTaskVisibleOnDate(task, day));
      const taskIds = planned?.map((task) =>
        statisticsTaskKey(task, task.id),
      ) ?? [...(tasksByDate.get(date) || [])];
      return isPracticeDayComplete(
        taskIds,
        completedByDate.get(date) || new Set(),
        activities.some(
          (activity) =>
            activity.date === date &&
            activity.source === "Session" &&
            activity.durationSeconds > 0,
        ),
      );
    })
    .sort();
}

export function getStatisticsStreak(dates: string[], today: string) {
  const ordered = [...new Set(dates)].filter((date) => date <= today).sort();
  const calendarDay = (date: string) => Date.parse(date) / 86400000;
  let currentStreak = 0;
  let longestStreak = 0;
  ordered.forEach((date, index) => {
    const gap = index
      ? calendarDay(date) - calendarDay(ordered[index - 1])
      : Infinity;
    currentStreak = gap <= 3 ? currentStreak + 1 : 1;
    longestStreak = Math.max(longestStreak, currentStreak);
  });
  const last = ordered.at(-1);
  if (!last || calendarDay(today) - calendarDay(last) > 3) currentStreak = 0;
  return { currentStreak, longestStreak };
}

type Source = "Task" | "Timer" | "Metronome" | "Session" | "Custom";
interface AnalyticsActivity {
  id: string;
  instrument: "guitar" | "piano";
  date: string;
  startTime: number;
  durationSeconds: number;
  countedDurationSeconds: number;
  practiceSessionId?: string;
  source: Source;
  area: string;
  subject?: string;
  task?: string;
  tags: string[];
  bpm?: number;
  averageBpm?: number;
  status?: string;
  plannedDurationSeconds?: number;
}

const colors = [
  "var(--color-primary)",
  "#f59e0b",
  "#22c55e",
  "#ef4444",
  "#8b5cf6",
  "#06b6d4",
  "#ec4899",
];
const monoFontFamily =
  '"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace';
const statsTooltipContentStyle = {
  backgroundColor: "var(--color-surface-container-high)",
  border: "1px solid var(--color-outline-variant)",
  borderRadius: "8px",
  boxShadow: "0 8px 24px rgb(0 0 0 / 0.28)",
  fontFamily: monoFontFamily,
  padding: "8px 12px",
};
const statsTooltipLabelStyle = {
  color: "var(--color-on-surface-variant)",
  fontFamily: monoFontFamily,
  fontSize: "11px",
  paddingBottom: "4px",
};
const statsTooltipItemStyle = {
  color: "var(--color-on-surface)",
  fontFamily: monoFontFamily,
  fontSize: "12px",
};
const formatDuration = (seconds: number) => {
  const minutes = Math.round(seconds / 60);
  return minutes >= 60
    ? `${Math.floor(minutes / 60)}h ${minutes % 60}m`
    : `${minutes}m`;
};
const dateLabel = (date: string) =>
  date === new Date().toISOString().slice(0, 10) ? "Today" : date;
const daysSince = (timestamp: number) =>
  Math.max(0, Math.floor((Date.now() - timestamp) / 86400000));

function taskToActivity(activity: TaskActivity): AnalyticsActivity {
  return {
    id: activity.id,
    instrument: statisticsInstrument(activity),
    date: activity.date,
    startTime: activity.timestamp,
    durationSeconds: activity.durationSeconds,
    countedDurationSeconds: activity.durationSeconds,
    source: activity.source === "custom" ? "Custom" : "Task",
    area: activity.area,
    subject: activity.subject,
    task: activity.taskText,
    tags: activity.tags || [],
    bpm: activity.bpm,
    status: "Completed",
    plannedDurationSeconds: activity.plannedDurationSeconds,
  };
}

function sessionToActivity(session: Session): AnalyticsActivity {
  return {
    id: session.id,
    instrument: statisticsInstrument(session),
    date: session.date,
    startTime: session.startTime,
    durationSeconds: session.durationSeconds || 0,
    countedDurationSeconds: session.durationSeconds || 0,
    source: "Session",
    area: session.focus || "Free practice",
    subject: session.focus,
    tags: ["session"],
    bpm: session.highestBpm,
    averageBpm: session.bpmsUsed?.length
      ? session.bpmsUsed.reduce((sum, bpm) => sum + bpm, 0) /
        session.bpmsUsed.length
      : session.highestBpm,
    status: "Completed",
  };
}

function genericToActivity(activity: PracticeActivity): AnalyticsActivity {
  return {
    id: activity.id,
    instrument: statisticsInstrument(activity),
    date: activity.date,
    startTime: activity.startTime,
    durationSeconds: activity.durationSeconds,
    countedDurationSeconds: activity.durationSeconds,
    source:
      activity.source === "custom"
        ? "Custom"
        : activity.source === "timer"
          ? "Timer"
          : "Metronome",
    area: activity.area,
    subject: activity.subject,
    task: activity.taskText,
    tags: activity.tags || [],
    bpm: activity.bpm,
    status: activity.status === "completed" ? "Completed" : activity.status,
    plannedDurationSeconds: activity.plannedDurationSeconds,
  };
}

export function countStatisticsActivities(
  records: AnalyticsActivity[],
  legacySessions: AnalyticsActivity[],
  taskRecords: AnalyticsActivity[],
  customSegments: AnalyticsActivity[],
): AnalyticsActivity[] {
  return records.map((activity) => {
    if (customSegments.includes(activity)) return activity;
    const isContained =
      activity.source !== "Session" &&
      legacySessions.some(
        (session) =>
          session.instrument === activity.instrument &&
          activity.startTime >= session.startTime &&
          activity.startTime <=
            session.startTime + session.durationSeconds * 1000 &&
          activity.durationSeconds <= session.durationSeconds,
      );
    const isEmbeddedInTask =
      (activity.source === "Timer" || activity.source === "Metronome") &&
      taskRecords.some(
        (task) =>
          task.instrument === activity.instrument &&
          task.date === activity.date &&
          task.durationSeconds > 0 &&
          Math.abs(
            task.startTime -
              activity.startTime -
              activity.durationSeconds * 1000,
          ) < 120000,
      );
    return {
      ...activity,
      countedDurationSeconds:
        activity.source === "Session"
          ? Math.max(
              0,
              activity.durationSeconds -
                customSegments
                  .filter(
                    (segment) =>
                      segment.practiceSessionId === activity.id &&
                      segment.instrument === activity.instrument,
                  )
                  .reduce((sum, segment) => sum + segment.durationSeconds, 0),
            )
          : isContained || isEmbeddedInTask
            ? 0
            : activity.durationSeconds,
    };
  });
}

export const StatsPage: React.FC<StatsPageProps> = ({
  sessions: savedSessions,
}) => {
  const settings = useSettingsContext();
  const [scope, setScope] = useState<StatisticsScope>(() =>
    getDefaultStatisticsScope(getSavedSettings().defaultInstrument),
  );
  const sessions = filterStatisticsRecords(savedSessions, scope);
  const [range, setRange] = useState<Range>("week");
  const [isRangeOpen, setIsRangeOpen] = useState(false);
  const rangePickerRef = useRef<HTMLDivElement>(null);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const calendarPopoverRef = useRef<HTMLDivElement>(null);
  const calendarToggleRef = useRef<HTMLButtonElement>(null);
  const [customRange, setCustomRange] = useState<{
    start: number;
    end: number;
  } | null>(null);
  const [selectedTask, setSelectedTask] = useState<string | null>(null);
  const [customAnalyticsPage, setCustomAnalyticsPage] = useState(1);
  const [practiceLogPage, setPracticeLogPage] = useState(1);
  useEffect(() => {
    if (!isRangeOpen) return;
    const closeOnOutsideClick = (event: PointerEvent) => {
      if (!rangePickerRef.current?.contains(event.target as Node)) {
        setIsRangeOpen(false);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsRangeOpen(false);
    };
    document.addEventListener("pointerdown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [isRangeOpen]);
  useEffect(() => {
    if (!isCalendarOpen) return;
    const closeOnOutsideClick = (event: PointerEvent) => {
      const target = event.target as Node;
      if (
        !calendarPopoverRef.current?.contains(target) &&
        !calendarToggleRef.current?.contains(target)
      ) {
        setIsCalendarOpen(false);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsCalendarOpen(false);
    };
    document.addEventListener("pointerdown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [isCalendarOpen]);
  const taskActivities = filterStatisticsRecords(
    getSavedTaskActivities(),
    scope,
  );
  const genericActivities = filterStatisticsRecords(
    getSavedPracticeActivities(),
    scope,
  );
  const periodStart = useMemo(() => {
    if (range === "custom" && customRange) return customRange.start;
    if (range === "all") return 0;
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    if (range === "week")
      start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
    else start.setDate(start.getDate() - Number(range) + 1);
    return start.getTime();
  }, [customRange, range]);
  const periodEnd =
    range === "custom" && customRange
      ? new Date(customRange.end).setHours(23, 59, 59, 999)
      : Infinity;
  const periodDays =
    range === "custom" && customRange
      ? Math.max(
          1,
          Math.floor((customRange.end - customRange.start) / 86400000) + 1,
        )
      : range === "all"
        ? Math.max(
            1,
            Math.ceil(
              (Date.now() - (sessions[0]?.startTime || Date.now())) / 86400000,
            ) + 1,
          )
        : range === "week"
          ? ((new Date().getDay() + 6) % 7) + 1
          : Number(range);

  const allActivities = useMemo(() => {
    const taskRecords = taskActivities
      .filter((activity) => activity.kind === "completed")
      .map(taskToActivity);
    const legacySessions = sessions.map(sessionToActivity);
    const genericRecords = genericActivities
      .filter((activity) => activity.source !== "timer")
      .map(genericToActivity);
    let savedTasks: PracticeTask[] = [];
    try {
      const parsed: unknown = JSON.parse(
        localStorage.getItem("mous9iti_tasks") || "[]",
      );
      if (Array.isArray(parsed))
        savedTasks = filterStatisticsRecords(parsed, scope);
    } catch {
      savedTasks = [];
    }
    const customSegments: AnalyticsActivity[] = filterStatisticsRecords(
      getSavedTaskAttributions(),
      scope,
    ).flatMap((attribution) => {
      const instrument = statisticsInstrument(attribution);
      const task = savedTasks.find(
        (item) =>
          item.id === attribution.taskId &&
          statisticsInstrument(item) === instrument,
      );
      const text =
        task?.text ||
        taskActivities.find(
          (item) =>
            item.taskId === attribution.taskId &&
            statisticsInstrument(item) === instrument,
        )?.taskText;
      const name = text?.match(/@custom\(([^)]*)\)/i)?.[1]?.trim();
      if (!name || !attribution.durationSeconds) return [];
      const session = attribution.practiceSessionId
        ? legacySessions.find(
            (item) =>
              item.id === attribution.practiceSessionId &&
              item.instrument === instrument,
          )
        : attribution.source === "automatic"
          ? legacySessions.find(
              (item) =>
                item.instrument === instrument &&
                attribution.startedAt >= item.startTime &&
                attribution.endedAt <=
                  item.startTime + item.durationSeconds * 1000,
            )
          : undefined;
      if (!session) return [];
      return [
        {
          id: attribution.id,
          instrument,
          date: session.date,
          startTime: attribution.practiceSessionId
            ? session.startTime
            : attribution.startedAt,
          durationSeconds: attribution.durationSeconds,
          countedDurationSeconds: attribution.durationSeconds,
          practiceSessionId: session.id,
          source: "Custom" as const,
          area: "Custom",
          subject: name,
          task: text,
          tags: ["custom"],
        },
      ];
    });
    const records = [
      ...legacySessions,
      ...taskRecords,
      ...genericRecords,
      ...customSegments,
    ].sort((a, b) => b.startTime - a.startTime);
    return countStatisticsActivities(
      records,
      legacySessions,
      taskRecords,
      customSegments,
    );
  }, [genericActivities, sessions, taskActivities, scope]);
  const activities = allActivities.filter(
    (activity) =>
      activity.startTime >= periodStart && activity.startTime <= periodEnd,
  );
  const taskStarts = taskActivities.filter(
    (activity) =>
      activity.kind === "started" &&
      activity.timestamp >= periodStart &&
      activity.timestamp <= periodEnd,
  );
  const taskCompletions = taskActivities.filter(
    (activity) =>
      activity.kind === "completed" &&
      activity.timestamp >= periodStart &&
      activity.timestamp <= periodEnd,
  );
  const totalSeconds = activities.reduce(
    (sum, activity) => sum + activity.countedDurationSeconds,
    0,
  );
  const taskSeconds = activities
    .filter((a) => a.source === "Task" || a.source === "Custom")
    .reduce((sum, a) => sum + a.countedDurationSeconds, 0);
  const metronomeSeconds = activities
    .filter((a) => a.source === "Metronome")
    .reduce((sum, a) => sum + a.countedDurationSeconds, 0);
  const today = new Date().toISOString().slice(0, 10);
  const tasksByWeekday = new Map<string, PracticeTask[]>();
  try {
    const schedule: unknown = JSON.parse(
      localStorage.getItem("mous9iti_weekly_schedule") || "[]",
    );
    if (Array.isArray(schedule)) {
      schedule.forEach((day) => {
        if (day && typeof day.day === "string" && Array.isArray(day.tasks)) {
          tasksByWeekday.set(
            day.day,
            filterStatisticsRecords(
              day.tasks.filter(
                (task: unknown): task is PracticeTask =>
                  task &&
                  typeof task === "object" &&
                  "id" in task &&
                  typeof task.id === "string" &&
                  "text" in task &&
                  typeof task.text === "string",
              ),
              scope,
            ),
          );
        }
      });
    }
  } catch {
    // An absent or malformed schedule falls back to the task activity log.
  }
  let todayTasks: PracticeTask[] | null = null;
  try {
    const parsed: unknown = JSON.parse(
      localStorage.getItem("mous9iti_tasks") || "[]",
    );
    if (Array.isArray(parsed))
      todayTasks = filterStatisticsRecords(parsed, scope);
  } catch {
    todayTasks = null;
  }
  const datesWithTaskActivity = taskActivities.filter(
    (activity) =>
      activity.timestamp >= periodStart && activity.timestamp <= periodEnd,
  );
  const practiceDays = getStatisticsPracticeDates(
    activities,
    datesWithTaskActivity,
    todayTasks,
    tasksByWeekday,
    today,
  ).length;
  const scopedStreak = getStatisticsStreak(
    getStatisticsPracticeDates(
      allActivities,
      taskActivities,
      todayTasks,
      tasksByWeekday,
      today,
    ),
    today,
  );
  const completionRate = taskStarts.length
    ? Math.round((taskCompletions.length / taskStarts.length) * 100)
    : 0;
  const practiceLogPageSize = 10;
  const practiceLogPageCount = Math.max(
    1,
    Math.ceil(activities.length / practiceLogPageSize),
  );
  const visiblePracticeLogPage = Math.min(
    practiceLogPage,
    practiceLogPageCount,
  );
  const practiceLogActivities = activities.slice(
    (visiblePracticeLogPage - 1) * practiceLogPageSize,
    visiblePracticeLogPage * practiceLogPageSize,
  );

  const aggregate = (
    key: (activity: AnalyticsActivity) => string,
    sourceActivities = activities,
  ) =>
    Object.entries(
      sourceActivities.reduce(
        (result, activity) => {
          const name = key(activity) || "Uncategorized";
          result[name] ||= {
            seconds: 0,
            sessions: 0,
            days: new Set<string>(),
            last: 0,
          };
          result[name].seconds += activity.countedDurationSeconds;
          result[name].sessions += 1;
          result[name].days.add(activity.date);
          result[name].last = Math.max(result[name].last, activity.startTime);
          return result;
        },
        {} as Record<
          string,
          { seconds: number; sessions: number; days: Set<string>; last: number }
        >,
      ),
    );
  const savedCustomTags = new Map(
    getSavedCustomTags().map((name) => [name.toLowerCase(), name]),
  );
  // Same custom name on different days/tasks must share one bucket regardless of case/spacing.
  const seenCustomNames = new Map<string, string>();
  const customTagName = (activity: AnalyticsActivity) => {
    const raw =
      activity.task?.match(/@custom\(([^)]*)\)/i)?.[1] ||
      (activity.source === "Custom" ? activity.subject : undefined);
    const name = raw?.replace(/\s+/g, " ").trim();
    if (!name) return undefined;
    const key = name.toLowerCase();
    const display =
      savedCustomTags.get(key) || seenCustomNames.get(key) || name;
    seenCustomNames.set(key, display);
    return `@custom(${display})`;
  };
  const generalAreas = new Set([
    "timer",
    "tones",
    "technique",
    "fretboard theory & metronome technique",
    "fretboard theory",
    "metronome technique",
  ]);
  const normalizedArea = (activity: AnalyticsActivity) =>
    generalAreas.has(activity.area.trim().toLowerCase())
      ? "General practice"
      : activity.area;
  const areaRows = aggregate(
    (activity) => customTagName(activity) || normalizedArea(activity),
  ).sort((a, b) => b[1].seconds - a[1].seconds);
  const savedTagLabels = [...savedCustomTags.values()].map(
    (name) => `@custom(${name})`,
  );
  const tagLabel = (name: string) =>
    name.startsWith("@custom(") && name.endsWith(")")
      ? name.slice(8, -1)
      : null;
  const activityTagStyles: Record<string, string> = {
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
  const renderActivityText = (value?: string) => {
    const text = value?.trim() || "-";
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;
    MENTION_REGEX.lastIndex = 0;

    while ((match = MENTION_REGEX.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push(
          <span key={`text-${lastIndex}`}>
            {text.slice(lastIndex, match.index)}
          </span>,
        );
      }

      const tool = match[2].toLowerCase();
      const params = match[3] || "";
      let Icon = Activity;
      const badgeClass = settings.taskTagsColored
        ? activityTagStyles[tool] || activityTagStyles.custom
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
      const parsed = parseParams(tool, params);
      if (tool === "metronome")
        label = `${parsed.bpm} BPM · ${parsed.signature}`;
      else if (tool === "scale")
        label = parsed.label || `${parsed.root} ${parsed.type}`;
      else if (tool === "chord")
        label = parsed.label || `${parsed.root} ${parsed.type}`;
      else if (tool === "timer" || tool === "time") {
        label = formatDurationLabel(parsed.minutes);
      } else if (tool === "custom") label = parsed.text || "Custom";
      else if (tool === "tuning") label = parsed.tuning || "Tuning";
      else if (tool === "key") label = parsed.key || "Key";
      else if (tool === "technique") label = parsed.technique || "Technique";
      else if (tool === "bpm")
        label = `${parsed.bpm} BPM · ${parsed.signature}`;
      else if (tool === "exercise") label = parsed.exercise || "Exercise";
      else if (tool === "random") {
        const modeLabels: Record<string, string> = {
          both: "all notes",
          sharps: "sharp notes",
          flats: "flat notes",
          naturals: "natural notes",
        };
        label = `random (${modeLabels[parsed.accidentalMode] || "all notes"})${parsed.autoAdvance ? ` · auto advance for ${parsed.interval}` : ""}`;
      }

      parts.push(
        <span
          key={`mention-${match.index}`}
          className={`inline-flex max-w-full min-w-0 items-center gap-1 whitespace-normal break-words px-1.5 py-0.5 mx-0.5 rounded text-[11px] font-mono font-bold align-middle shadow-sm transition-colors ${badgeClass} ${settings.taskTagsColored ? `task-tag-badge--${tool}` : ""}`}
          style={
            settings.taskTagsColored
              ? undefined
              : { backgroundColor: "var(--color-surface-container-high)" }
          }
        >
          <Icon size={12} className="shrink-0" />
          <span className="min-w-0 break-words">{label}</span>
        </span>,
      );
      lastIndex = MENTION_REGEX.lastIndex;
    }

    if (lastIndex < text.length) {
      parts.push(
        <span key={`text-${lastIndex}`}>{text.slice(lastIndex)}</span>,
      );
    }

    return <span className="whitespace-normal break-words">{parts}</span>;
  };
  const renderAreaName = (name: string) => {
    const label = tagLabel(name);
    return label === null ? (
      name
    ) : (
      <span className="inline-flex max-w-full min-w-0 items-start gap-1 text-on-surface">
        <Tag size={11} className="mt-0.5 shrink-0 text-on-surface-variant" />
        <span className="min-w-0 [overflow-wrap:anywhere]">{label}</span>
      </span>
    );
  };
  const customActivities = activities.filter(
    (activity) => customTagName(activity) !== undefined,
  );
  const taskRows = aggregate(
    (activity) => activity.task || activity.subject || "Untitled task",
    customActivities,
  )
    .filter(([name]) => name !== "Untitled task")
    .sort((a, b) => b[1].seconds - a[1].seconds);
  const customRows = aggregate(
    (activity) => customTagName(activity) || "Uncategorized",
    customActivities,
  )
    .filter(([name]) => tagLabel(name) !== null)
    .sort((a, b) => b[1].seconds - a[1].seconds);
  const customPracticeSeconds = customActivities.reduce(
    (sum, activity) => sum + activity.countedDurationSeconds,
    0,
  );
  const customActivityMaxSeconds = Math.max(
    1,
    ...customRows.map(([, value]) => value.seconds),
  );
  const customTaskMaxSeconds = Math.max(
    1,
    ...taskRows.map(([, value]) => value.seconds),
  );
  const topCustomActivity = customRows[0];
  const customTimeShare = (seconds: number) =>
    Math.round((seconds / Math.max(1, customPracticeSeconds)) * 100);
  const customAnalyticsPageSize = 8;
  const customAnalyticsPageCount = Math.max(
    1,
    Math.ceil(
      Math.max(customRows.length, taskRows.length) / customAnalyticsPageSize,
    ),
  );
  const visibleCustomAnalyticsPage = Math.min(
    customAnalyticsPage,
    customAnalyticsPageCount,
  );
  const customAnalyticsPageStart =
    (visibleCustomAnalyticsPage - 1) * customAnalyticsPageSize;
  const visibleCustomRows = customRows.slice(
    customAnalyticsPageStart,
    customAnalyticsPageStart + customAnalyticsPageSize,
  );
  const visibleTaskRows = taskRows.slice(
    customAnalyticsPageStart,
    customAnalyticsPageStart + customAnalyticsPageSize,
  );
  const areaChart = areaRows.map(([name, value]) => ({
    name,
    minutes: Math.round(value.seconds / 60),
  }));
  const sourceAreas = [
    "Rhythm",
    "General practice",
    "Chords",
    "Scales",
    "Exercises",
  ];
  const sourceTotals = new Map(sourceAreas.map((name) => [name, 0]));
  savedTagLabels.forEach((name) => sourceTotals.set(name, 0));
  activities.forEach((activity) => {
    const tag = customTagName(activity);
    const name =
      activity.source === "Timer" ||
      (!tag && normalizedArea(activity) === "General practice")
        ? "General practice"
        : tag || activity.area || "General practice";
    sourceTotals.set(
      name,
      (sourceTotals.get(name) || 0) + activity.countedDurationSeconds,
    );
  });
  const sourceChart = [...sourceTotals]
    .filter(([, seconds]) => Math.round(seconds / 60) > 0)
    .map(([name, seconds]) => ({
      name,
      label: tagLabel(name) || name,
      seconds,
      minutes: seconds / 60,
      percentage: Math.round((seconds / Math.max(1, totalSeconds)) * 100),
    }));
  const dailyData = activities.reduce(
    (days, activity) => {
      days[activity.date] ||= { seconds: 0, sessions: 0, tasks: 0 };
      days[activity.date].seconds += activity.countedDurationSeconds;
      days[activity.date].sessions += 1;
      if (activity.source === "Task" || activity.source === "Custom")
        days[activity.date].tasks += 1;
      return days;
    },
    {} as Record<string, { seconds: number; sessions: number; tasks: number }>,
  );
  const dailyBpmData = Object.entries(
    (scope === "all" ? [] : activities).reduce(
      (days, activity) => {
        if (activity.bpm === undefined) return days;
        days[activity.date] ||= {
          peakBpm: 0,
          averageBpmTotal: 0,
          readings: 0,
        };
        days[activity.date].peakBpm = Math.max(
          days[activity.date].peakBpm,
          activity.bpm,
        );
        days[activity.date].averageBpmTotal +=
          activity.averageBpm ?? activity.bpm;
        days[activity.date].readings += 1;
        return days;
      },
      {} as Record<
        string,
        { peakBpm: number; averageBpmTotal: number; readings: number }
      >,
    ),
  )
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, value]) => ({
      date: date.slice(5),
      peakBpm: value.peakBpm,
      averageBpm: Math.round(value.averageBpmTotal / value.readings),
    }));
  const trendData = Object.entries(dailyData)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, value]) => ({
      date: date.slice(5),
      minutes: Math.round(value.seconds / 60),
      sessions: value.sessions,
      tasks: value.tasks,
    }));
  const weekdays = activities.reduce(
    (days, activity) => {
      const day = new Date(`${activity.date}T12:00:00`).toLocaleDateString(
        undefined,
        { weekday: "short" },
      );
      days[day] = (days[day] || 0) + 1;
      return days;
    },
    {} as Record<string, number>,
  );
  const activeDay =
    Object.entries(weekdays).sort((a, b) => b[1] - a[1])[0]?.[0] ||
    "No activity yet";
  const orderedDays = [
    ...new Set(activities.map((activity) => activity.date)),
  ].sort();
  const longestGap = orderedDays.reduce(
    (max, date, index) =>
      index
        ? Math.max(
            max,
            Math.floor(
              (new Date(`${date}T12:00:00`).getTime() -
                new Date(`${orderedDays[index - 1]}T12:00:00`).getTime()) /
                86400000,
            ) - 1,
          )
        : 0,
    0,
  );
  const neglected = areaRows
    .slice()
    .sort((a, b) => a[1].last - b[1].last)
    .slice(0, 5);
  const selectedTaskActivities = selectedTask
    ? allActivities.filter(
        (activity) =>
          (activity.task === selectedTask ||
            activity.subject === selectedTask) &&
          customTagName(activity) !== undefined,
      )
    : [];
  const selectedTaskStats = selectedTaskActivities.reduce(
    (result, activity) => {
      result.seconds += activity.countedDurationSeconds;
      result.days.add(activity.date);
      result.bpms.push(...(activity.bpm ? [activity.bpm] : []));
      result.last = Math.max(result.last, activity.startTime);
      return result;
    },
    { seconds: 0, days: new Set<string>(), bpms: [] as number[], last: 0 },
  );
  const plannedRows = taskActivities
    .filter(
      (activity) =>
        activity.kind === "completed" &&
        activity.timestamp >= periodStart &&
        activity.timestamp <= periodEnd &&
        activity.plannedDurationSeconds,
    )
    .reduce(
      (result, activity) => {
        const area = activity.area;
        result[area] ||= { planned: 0, actual: 0 };
        result[area].planned += activity.plannedDurationSeconds || 0;
        result[area].actual += activity.durationSeconds;
        return result;
      },
      {} as Record<string, { planned: number; actual: number }>,
    );
  const metricCards = [
    [
      "Total practice",
      formatDuration(totalSeconds),
      `${activities.length} practice activities`,
      <Clock size={16} className="text-primary" />,
    ],
    [
      "Practice days",
      range === "all" ? practiceDays : `${practiceDays}/${periodDays}`,
      range === "all" ? "Days with activity" : "Days with activity in range",
      <Calendar size={16} className="text-primary" />,
    ],
    [
      "Tasks completed",
      taskCompletions.length,
      "In selected range",
      <CheckCircle2 size={16} className="text-primary" />,
    ],
    [
      "Areas practiced",
      areaRows.length,
      "Distinct practice areas",
      <Target size={16} className="text-primary" />,
    ],
    [
      "Current streak",
      `${scopedStreak.currentStreak} ${scopedStreak.currentStreak === 1 ? "day" : "days"}`,
      `Longest: ${scopedStreak.longestStreak} ${scopedStreak.longestStreak === 1 ? "day" : "days"} (all time)`,
      <Flame size={16} className="text-primary" />,
    ],
  ];
  const rangeLabel =
    range === "all"
      ? "All time"
      : range === "week"
        ? "This week"
        : `${range} days`;
  const rangeEnd =
    range === "custom" && customRange ? new Date(customRange.end) : new Date();
  const rangeStart =
    range === "all"
      ? new Date(allActivities.at(-1)?.startTime || Date.now())
      : new Date(periodStart);
  const formatRangeDate = (date: Date) =>
    date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  return (
    <div className="stats-page space-y-6 pb-12">
      <div className="flex flex-col gap-4 rounded-lg border border-outline-variant/30 bg-surface-container p-6 shadow-xl sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-mono text-base font-bold tracking-[0.2em] text-on-surface uppercase flex items-center gap-2">
            <BarChart3 size={18} className="text-primary" />
            Practice Analytics
          </h2>
          <label className="mt-2 inline-flex items-center gap-2 text-[11px] font-mono text-on-surface-variant">
            Instrument
            <span className="relative inline-flex items-center">
              <select
                aria-label="Statistics instrument"
                value={scope}
                onChange={(event) => {
                  setScope(event.target.value as StatisticsScope);
                  setSelectedTask(null);
                  setCustomAnalyticsPage(1);
                  setPracticeLogPage(1);
                }}
                className="h-7 w-32 cursor-pointer appearance-none rounded bg-transparent py-1 pl-1 pr-5 text-[11px] font-mono text-on-surface-variant transition-colors hover:text-on-surface focus-visible:outline-2 focus-visible:outline-primary [&>option]:bg-surface-container [&>option]:text-on-surface"
              >
                <option value="guitar">Guitar</option>
                <option value="piano">Piano</option>
                <option value="all">All instruments</option>
              </select>
              <ChevronDown
                size={11}
                aria-hidden="true"
                className="pointer-events-none absolute right-1 text-on-surface-variant"
              />
            </span>
          </label>
          <p
            className="text-xs font-mono text-on-surface mt-1"
            style={{ color: "var(--color-on-surface)" }}
          >
            One practice history across tasks, timer, metronome, and custom
            work.
          </p>
        </div>
        <div className="stats-date-picker">
          <div className="stats-date-control">
            <div ref={rangePickerRef} className="relative">
              <button
                type="button"
                aria-label="Practice date range"
                aria-expanded={isRangeOpen}
                aria-haspopup="true"
                onClick={() => {
                  setIsCalendarOpen(false);
                  setIsRangeOpen((open) => !open);
                }}
                className="flex cursor-pointer items-center gap-1.5 rounded px-2 py-1.5 text-on-surface focus-visible:outline-2 focus-visible:outline-primary"
              >
                <Calendar size={16} className="text-on-surface-variant" />
                {range === "all"
                  ? "All time"
                  : range === "custom"
                    ? "Custom range"
                    : rangeLabel}
                <ChevronDown size={13} className="text-on-surface-variant" />
              </button>
              {isRangeOpen && (
                <div
                  className="absolute left-0 top-[calc(100%+0.5rem)] z-30 min-w-32 rounded-lg border border-outline-variant/30 bg-surface-container p-1 shadow-xl dropdown-menu-enter"
                  aria-label="Practice date ranges"
                >
                  {(
                    [
                      "week",
                      "30",
                      "90",
                      "all",
                      ...(range === "custom" ? ["custom"] : []),
                    ] as Range[]
                  ).map((value) => (
                    <button
                      key={value}
                      type="button"
                      aria-current={range === value ? "true" : undefined}
                      className={`block w-full rounded px-3 py-2 text-left text-xs font-mono transition-colors hover:bg-surface-container-high focus-visible:outline-2 focus-visible:outline-primary ${range === value ? "bg-primary/10 text-primary" : "text-on-surface"}`}
                      onClick={() => {
                        if (value !== "custom") setCustomRange(null);
                        setRange(value);
                        setIsRangeOpen(false);
                      }}
                    >
                      {value === "all"
                        ? "All time"
                        : value === "custom"
                          ? "Custom range"
                          : value === "week"
                            ? "This week"
                            : `${value} days`}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <span className="stats-date-divider" />
            <button
              ref={calendarToggleRef}
              className="stats-date-display"
              onClick={() => setIsCalendarOpen((open) => !open)}
            >
              {range === "all"
                ? rangeLabel
                : `${formatRangeDate(rangeStart)} – ${formatRangeDate(rangeEnd)}`}
            </button>
            <ChevronRight size={14} />
          </div>
          {isCalendarOpen && (
            <CalendarRangePicker
              range={customRange}
              calendarRef={calendarPopoverRef}
              onChange={(nextRange) => {
                setCustomRange(nextRange);
                setRange("custom");
              }}
            />
          )}
        </div>
      </div>
      <div
        data-tour="stats-metrics"
        className="stats-metrics-grid grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5"
      >
        {metricCards.map(([label, value, detail, icon]) => (
          <div
            key={String(label)}
            className="stats-metric-card flex min-w-0 items-start gap-3 rounded-lg border border-outline-variant/30 bg-surface-container p-4 shadow-xl"
          >
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
              {icon}
            </span>
            <div className="min-w-0">
              <span className="block font-mono text-[11px] text-on-surface-variant">
                {label}
              </span>
              <span className="mt-1 block font-mono text-2xl font-semibold leading-none text-on-surface">
                {value}
              </span>
              <span className="mt-1 block font-mono text-[10px] text-on-surface-variant">
                {detail}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="stats-breakdown-grid grid grid-cols-1 gap-4 xl:grid-cols-2">
        <section className="bg-surface-container border border-outline-variant/30 rounded-lg p-6 shadow-xl space-y-4 flex flex-col">
          <h2 className="font-mono text-xs font-bold text-on-surface uppercase tracking-wider">
            Peak vs Average BPM
          </h2>
          <div className="flex h-64 min-w-0 flex-col">
            {dailyBpmData.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={dailyBpmData} margin={{ top: 12 }}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="var(--color-outline-variant)"
                    opacity={0.4}
                  />
                  <XAxis
                    dataKey="date"
                    fontSize={11}
                    padding={{ left: 8, right: 8 }}
                  />
                  <YAxis unit=" BPM" fontSize={11} />
                  <Tooltip
                    contentStyle={statsTooltipContentStyle}
                    labelStyle={statsTooltipLabelStyle}
                    itemStyle={statsTooltipItemStyle}
                  />
                  <Line
                    dataKey="peakBpm"
                    name="Peak BPM"
                    stroke="var(--color-secondary)"
                    strokeWidth={2}
                    type="monotone"
                  />
                  <Line
                    dataKey="averageBpm"
                    name="Average BPM"
                    stroke="var(--color-primary)"
                    strokeWidth={2}
                    type="monotone"
                  />
                </ComposedChart>
              </ResponsiveContainer>
            ) : (
              <p className="mt-auto text-[10px] font-mono text-on-surface-variant">
                {scope === "all"
                  ? "BPM is instrument-specific."
                  : "No BPM data for these dates."}
              </p>
            )}
          </div>
          {dailyBpmData.length > 0 && (
            <div className="mt-auto flex flex-wrap items-center gap-x-5 gap-y-2 pt-2 text-[10px] font-mono text-on-surface-variant">
              <span className="inline-flex items-center gap-2">
                <i className="h-2 w-2 rounded-full bg-[var(--color-secondary)]" />
                Peak BPM
              </span>
              <span className="inline-flex items-center gap-2">
                <i className="h-2 w-2 rounded-full bg-[var(--color-primary)]" />
                Average BPM
              </span>
            </div>
          )}
        </section>
        <section className="bg-surface-container border border-outline-variant/30 rounded-lg p-6 shadow-xl space-y-4 flex flex-col">
          <h2 className="font-mono text-xs font-bold text-on-surface uppercase tracking-wider">
            Practice Sources
          </h2>
          {sourceChart.length ? (
            <>
              <div className="stats-source-content flex-1">
                <div className="stats-source-chart">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Tooltip
                        formatter={(value: number) => formatDuration(value)}
                        contentStyle={statsTooltipContentStyle}
                        labelStyle={statsTooltipLabelStyle}
                        itemStyle={statsTooltipItemStyle}
                      />
                      <Pie
                        data={sourceChart}
                        dataKey="seconds"
                        nameKey="label"
                        cx="50%"
                        cy="50%"
                        innerRadius={58}
                        outerRadius={82}
                        paddingAngle={1}
                        stroke="none"
                      >
                        {sourceChart.map((entry, index) => (
                          <Cell
                            key={entry.name}
                            fill={colors[index % colors.length]}
                          />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="stats-source-total">
                    <b>{formatDuration(totalSeconds)}</b>
                    <span>Total Practice</span>
                  </div>
                </div>
                <div className="stats-source-legend max-h-72 min-w-0 overflow-x-hidden overflow-y-auto pr-2">
                  {sourceChart.map((entry, index) => (
                    <div key={entry.name} className="stats-source-row">
                      <span className="stats-source-name">
                        <i
                          style={{
                            backgroundColor: colors[index % colors.length],
                          }}
                        />
                        <span className="min-w-0 [overflow-wrap:anywhere]">
                          {renderAreaName(entry.name)}
                        </span>
                      </span>
                      <span>{entry.percentage}%</span>
                      <span>{formatDuration(entry.seconds)}</span>
                    </div>
                  ))}
                </div>
              </div>
              <p className="mt-auto text-[10px] font-mono text-on-surface-variant">
                Breakdown shows how much time was spent on each practice source.
              </p>
            </>
          ) : (
            <div className="flex flex-1 items-end">
              <p className="text-[10px] font-mono text-on-surface-variant">
                No practice data for these dates.
              </p>
            </div>
          )}
        </section>
      </div>

      <section className="stats-trend bg-surface-container border border-outline-variant/30 rounded-lg p-6 shadow-xl space-y-4">
        <h2 className="font-mono text-xs font-bold text-on-surface uppercase tracking-wider">
          Trends
        </h2>
        <div className="flex h-64 min-w-0 flex-col">
          {trendData.length > 0 ? (
            <div className="min-h-0 flex-1">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={trendData}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="var(--color-outline-variant)"
                    opacity={0.4}
                  />
                  <XAxis dataKey="date" fontSize={11} />
                  <YAxis yAxisId="time" unit="m" fontSize={11} />
                  <YAxis yAxisId="count" orientation="right" fontSize={11} />
                  <Tooltip
                    contentStyle={statsTooltipContentStyle}
                    labelStyle={statsTooltipLabelStyle}
                    itemStyle={statsTooltipItemStyle}
                  />
                  <Area
                    yAxisId="time"
                    dataKey="minutes"
                    fill="var(--color-primary)"
                    fillOpacity={0.25}
                    type="monotone"
                    stroke="var(--color-primary)"
                    name="Minutes"
                  />
                  <Line
                    yAxisId="count"
                    dataKey="sessions"
                    stroke="var(--color-secondary)"
                    name="Sessions"
                    strokeWidth={2}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="mt-auto text-[10px] font-mono text-on-surface-variant">
              No practice data for these dates.
            </p>
          )}
          {trendData.length > 0 && (
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[10px] font-mono text-on-surface-variant">
              <span className="inline-flex items-center gap-2">
                <i className="h-2 w-2 rounded-full bg-[var(--color-primary)]" />
                Minutes
              </span>
              <span className="inline-flex items-center gap-2">
                <i className="h-2 w-2 rounded-full bg-[var(--color-secondary)]" />
                Sessions
              </span>
            </div>
          )}
        </div>
      </section>

      <div className="stats-ranking-grid grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        <section className="stats-ranking-panel flex min-h-0 flex-col bg-surface-container border border-outline-variant/30 rounded-lg p-6 shadow-xl space-y-4">
          <h2 className="font-mono text-xs font-bold text-on-surface uppercase tracking-wider">
            Most Practiced
          </h2>
          <div className="min-h-0 flex-1 overflow-y-auto pr-1">
            {areaRows.slice(0, 6).map(([name, value], index) => (
              <div
                key={name}
                className="stats-rank-row flex items-center gap-2 text-xs font-mono"
              >
                <span className="stats-rank-number">{index + 1}</span>
                <span
                  className="stats-rank-dot"
                  style={{ backgroundColor: colors[index % colors.length] }}
                />
                <span className="min-w-0 flex-1 text-on-surface [overflow-wrap:anywhere]">
                  {renderAreaName(name)}
                </span>
                <span className="whitespace-nowrap text-on-surface-variant">
                  {formatDuration(value.seconds)} · {value.days.size} session
                  {value.days.size === 1 ? "" : "s"}
                </span>
              </div>
            ))}
          </div>
        </section>
        <section className="stats-ranking-panel flex min-h-0 flex-col bg-surface-container border border-outline-variant/30 rounded-lg p-6 shadow-xl space-y-4">
          <h2 className="font-mono text-xs font-bold text-on-surface uppercase tracking-wider">
            Least Practiced
          </h2>
          <div className="min-h-0 flex-1 overflow-y-auto pr-1">
            {neglected.length ? (
              neglected.map(([name, value], index) => (
                <div
                  key={name}
                  className="stats-rank-row flex items-center gap-2 text-xs font-mono"
                >
                  <span className="stats-rank-number">{index + 1}</span>
                  <span
                    className="stats-rank-dot"
                    style={{ backgroundColor: colors[index % colors.length] }}
                  />
                  <span className="min-w-0 flex-1 text-on-surface [overflow-wrap:anywhere]">
                    {renderAreaName(name)}
                  </span>
                  <span className="text-on-surface-variant">
                    {formatDuration(value.seconds)} · {daysSince(value.last)}d
                    ago
                  </span>
                </div>
              ))
            ) : (
              <p className="text-xs font-mono text-on-surface-variant">
                No gaps recorded yet.
              </p>
            )}
          </div>
          <div className="mt-auto border-t border-outline-variant/30 pt-3 text-xs font-mono text-on-surface-variant">
            Most active day:{" "}
            <span className="text-on-surface">{activeDay}</span> · Longest gap:{" "}
            <span className="text-on-surface">{longestGap} days</span>
          </div>
        </section>
        <section className="stats-ranking-panel flex min-h-0 flex-col bg-surface-container border border-outline-variant/30 rounded-lg p-6 shadow-xl">
          <h2 className="font-mono text-xs font-bold text-on-surface uppercase tracking-wider">
            Task Completion
          </h2>
          <div className="mt-4 min-h-0 flex-1 overflow-y-auto space-y-4 text-xs font-mono">
            <div className="flex items-center gap-5">
              <div className="stats-completion-ring">
                <div>
                  <b>{completionRate}%</b>
                  <span>Completed</span>
                </div>
              </div>
              <div className="space-y-2 text-xs">
                <p>
                  <span className="mr-3 inline-block h-3 w-3 rounded-full bg-emerald-400" />
                  {taskCompletions.length}
                  <span className="ml-4 text-on-surface-variant">
                    Completed
                  </span>
                </p>
                <p>
                  <span className="mr-3 inline-block h-3 w-3 rounded-full bg-blue-500" />
                  {Math.max(0, taskStarts.length - taskCompletions.length)}
                  <span className="ml-4 text-on-surface-variant">
                    In progress
                  </span>
                </p>
                <p>
                  <span className="mr-3 inline-block h-3 w-3 rounded-full bg-slate-500" />
                  {Math.max(
                    0,
                    new Set(
                      taskActivities.map((activity) =>
                        statisticsTaskKey(activity, activity.taskId),
                      ),
                    ).size - taskStarts.length,
                  )}
                  <span className="ml-4 text-on-surface-variant">
                    Not started
                  </span>
                </p>
              </div>
            </div>
            <div className="border-t border-outline-variant/30 pt-3 text-on-surface-variant">
              <p className="mb-2 text-on-surface">Planned vs Actual</p>
              <div className="flex justify-between border-b border-white/[0.04] py-1">
                <span>Task</span>
                <span>
                  {formatDuration(
                    Object.values(plannedRows).reduce(
                      (sum, row) => sum + row.planned,
                      0,
                    ),
                  )}{" "}
                  <b className="mx-3 text-on-surface-variant">→</b>{" "}
                  {formatDuration(taskSeconds)}
                </span>
              </div>
              <div className="flex justify-between border-b border-white/[0.04] py-1">
                <span>Metronome</span>
                <span>
                  0m <b className="mx-3 text-on-surface-variant">→</b>{" "}
                  {formatDuration(metronomeSeconds)}
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span>Total</span>
                <span>
                  {formatDuration(
                    Object.values(plannedRows).reduce(
                      (sum, row) => sum + row.planned,
                      0,
                    ),
                  )}{" "}
                  <b className="mx-3 text-on-surface-variant">→</b>{" "}
                  {formatDuration(totalSeconds)}
                </span>
              </div>
            </div>
          </div>
        </section>
      </div>

      <section className="stats-practice-log bg-surface-container border border-outline-variant/30 rounded-lg p-6 shadow-xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-mono text-xs font-bold text-on-surface uppercase tracking-wider">
            Practice Log
          </h2>
          {practiceLogPageCount > 1 && (
            <div className="flex items-center gap-2 font-mono text-xs text-on-surface-variant">
              <button
                type="button"
                className="stats-log-page-button"
                onClick={() =>
                  setPracticeLogPage((page) => Math.max(1, page - 1))
                }
                disabled={visiblePracticeLogPage === 1}
                aria-label="Previous practice log page"
              >
                <ChevronLeft size={15} />
              </button>
              <span>
                Page {visiblePracticeLogPage} of {practiceLogPageCount}
              </span>
              <button
                type="button"
                className="stats-log-page-button"
                onClick={() =>
                  setPracticeLogPage((page) =>
                    Math.min(practiceLogPageCount, page + 1),
                  )
                }
                disabled={visiblePracticeLogPage === practiceLogPageCount}
                aria-label="Next practice log page"
              >
                <ChevronRight size={15} />
              </button>
            </div>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="stats-practice-log-table w-full text-left font-mono text-xs">
            <thead>
              <tr className="border-b border-outline-variant/30 text-on-surface-variant uppercase text-[10px]">
                <th className="py-3 px-3">Date</th>
                <th className="py-3 px-3">Activity</th>
                <th className="py-3 px-3">Source</th>
                <th className="py-3 px-3">Area</th>
                <th className="py-3 px-3">Duration</th>
                {scope === "all" && <th className="py-3 px-3">Instrument</th>}
                {scope !== "all" && <th className="py-3 px-3">BPM</th>}
                <th className="py-3 px-3">Tags</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/30">
              {practiceLogActivities.map((activity) => (
                <tr key={`${activity.instrument}:${activity.id}`}>
                  <td className="py-3 px-3 text-on-surface-variant">
                    {activity.date}
                  </td>
                  <td className="py-3 px-3 text-on-surface max-w-[220px] align-top">
                    {renderActivityText(
                      activity.task || activity.subject || activity.area,
                    )}
                  </td>
                  <td className="py-3 px-3 text-primary">{activity.source}</td>
                  <td className="py-3 px-3 text-on-surface">{activity.area}</td>
                  <td className="py-3 px-3 text-on-surface">
                    {formatDuration(activity.durationSeconds)}
                  </td>
                  <td className="py-3 px-3 text-on-surface">
                    {scope === "all"
                      ? activity.instrument === "piano"
                        ? "Piano"
                        : "Guitar"
                      : activity.bpm || "-"}
                  </td>
                  <td className="py-3 px-3 text-on-surface-variant">
                    {activity.tags.join(", ") || "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
