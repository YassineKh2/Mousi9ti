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
  getSavedStreak,
  getSavedTaskActivities,
  getSavedTaskAttributions,
} from "../lib/storage";
import { getSavedCustomTags } from "../lib/customTaskTags";
import { isPracticeDayComplete } from "../lib/practiceDays";
import { CalendarRangePicker } from "../components/CalendarRangePicker";
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
  BarChart3,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Flame,
  ListChecks,
  Tag,
  Target,
} from "lucide-react";

interface StatsPageProps {
  sessions: Session[];
  streak: StreakData;
}

type Range = "week" | "30" | "90" | "all" | "custom";
type Source = "Task" | "Timer" | "Metronome" | "Session" | "Custom";
interface AnalyticsActivity {
  id: string;
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

export const StatsPage: React.FC<StatsPageProps> = ({ sessions, streak }) => {
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
  const taskActivities = getSavedTaskActivities();
  const genericActivities = getSavedPracticeActivities();
  const savedStreak = getSavedStreak();
  const periodStart = useMemo(() => {
    if (range === "custom" && customRange) return customRange.start;
    if (range === "all") return 0;
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    // Weeks start on Sunday to match the calendar grid.
    if (range === "week") start.setDate(start.getDate() - start.getDay());
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
          ? new Date().getDay() + 1
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
      if (Array.isArray(parsed)) savedTasks = parsed;
    } catch {
      savedTasks = [];
    }
    const customSegments: AnalyticsActivity[] =
      getSavedTaskAttributions().flatMap((attribution) => {
        const task = savedTasks.find((item) => item.id === attribution.taskId);
        const text =
          task?.text ||
          taskActivities.find((item) => item.taskId === attribution.taskId)
            ?.taskText;
        const name = text?.match(/@custom\(([^)]*)\)/i)?.[1]?.trim();
        if (!name || !attribution.durationSeconds) return [];
        const session = attribution.practiceSessionId
          ? legacySessions.find(
              (item) => item.id === attribution.practiceSessionId,
            )
          : attribution.source === "automatic"
            ? legacySessions.find(
                (item) =>
                  attribution.startedAt >= item.startTime &&
                  attribution.endedAt <=
                    item.startTime + item.durationSeconds * 1000,
              )
            : undefined;
        if (!session) return [];
        return [
          {
            id: attribution.id,
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
    return records.map((activity) => {
      if (customSegments.includes(activity)) return activity;
      const isContained =
        activity.source !== "Session" &&
        legacySessions.some(
          (session) =>
            activity.startTime >= session.startTime &&
            activity.startTime <=
              session.startTime + session.durationSeconds * 1000 &&
            activity.durationSeconds <= session.durationSeconds,
        );
      const isEmbeddedInTask =
        (activity.source === "Timer" || activity.source === "Metronome") &&
        taskRecords.some(
          (task) =>
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
                      (segment) => segment.practiceSessionId === activity.id,
                    )
                    .reduce((sum, segment) => sum + segment.durationSeconds, 0),
              )
            : isContained || isEmbeddedInTask
              ? 0
              : activity.durationSeconds,
      };
    });
  }, [genericActivities, sessions, taskActivities]);
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
  const tasksByWeekday = new Map<string, string[]>();
  try {
    const schedule: unknown = JSON.parse(
      localStorage.getItem("mous9iti_weekly_schedule") || "[]",
    );
    if (Array.isArray(schedule)) {
      schedule.forEach((day) => {
        if (day && typeof day.day === "string" && Array.isArray(day.tasks)) {
          tasksByWeekday.set(
            day.day,
            day.tasks
              .map((task: unknown) =>
                task &&
                typeof task === "object" &&
                "id" in task &&
                typeof task.id === "string"
                  ? task.id
                  : null,
              )
              .filter((id: string | null): id is string => id !== null),
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
    if (Array.isArray(parsed)) todayTasks = parsed;
  } catch {
    todayTasks = null;
  }
  const completedTaskIdsByDate = new Map<string, Set<string>>();
  const taskIdsByDate = new Map<string, Set<string>>();
  const datesWithTaskActivity = taskActivities.filter(
    (activity) =>
      activity.timestamp >= periodStart && activity.timestamp <= periodEnd,
  );
  datesWithTaskActivity.forEach((activity) => {
    const taskIds = taskIdsByDate.get(activity.date) || new Set<string>();
    taskIds.add(activity.taskId);
    taskIdsByDate.set(activity.date, taskIds);
    if (activity.kind === "completed") {
      const completedIds =
        completedTaskIdsByDate.get(activity.date) || new Set<string>();
      completedIds.add(activity.taskId);
      completedTaskIdsByDate.set(activity.date, completedIds);
    }
  });
  const practiceDayDates = new Set([
    ...activities.map((activity) => activity.date),
    ...datesWithTaskActivity.map((activity) => activity.date),
  ]);
  const weekdayCodes = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
  const practiceDays = [...practiceDayDates].filter((date) => {
    const weekday = weekdayCodes[new Date(`${date}T12:00:00`).getDay()];
    const plannedTaskIds =
      date === today ? todayTasks?.map((task) => task.id) : undefined;
    const dayTaskIds = plannedTaskIds ??
      tasksByWeekday.get(weekday) ?? [...(taskIdsByDate.get(date) || [])];
    const hasGeneralTime = activities.some(
      (activity) =>
        activity.date === date &&
        activity.source === "Session" &&
        activity.durationSeconds > 0,
    );
    return isPracticeDayComplete(
      dayTaskIds,
      completedTaskIdsByDate.get(date) || new Set(),
      hasGeneralTime,
    );
  }).length;
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
    activities.reduce(
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
  if (
    !sessions.length &&
    !taskActivities.length &&
    !genericActivities.length &&
    !savedCustomTags.size
  )
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[60vh] space-y-4">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
          <BarChart3 size={32} className="text-primary" />
        </div>
        <h2 className="font-mono text-xl font-bold text-on-surface">
          No Practice Data Yet
        </h2>
        <p className="text-on-surface-variant font-mono text-sm max-w-md text-center">
          Start a task, timer, metronome, or practice session to build your
          analytics.
        </p>
      </div>
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
      `${savedStreak.currentStreak} ${savedStreak.currentStreak === 1 ? "day" : "days"}`,
      `Longest: ${savedStreak.longestStreak} ${savedStreak.longestStreak === 1 ? "day" : "days"} (all time)`,
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
      ? new Date(sessions.at(-1)?.startTime || Date.now())
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
          <h1 className="font-mono text-base font-bold tracking-[0.2em] text-on-surface uppercase flex items-center gap-2">
            <BarChart3 size={18} className="text-primary" />
            Practice Analytics
          </h1>
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
              <span className="block text-[11px] text-on-surface-variant">
                {label}
              </span>
              <span className="mt-1 block font-mono text-2xl font-semibold leading-none text-on-surface">
                {value}
              </span>
              <span className="mt-1 block text-[10px] text-on-surface-variant">
                {detail}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="stats-breakdown-grid grid grid-cols-1 gap-4 xl:grid-cols-2">
        <section className="bg-surface-container border border-outline-variant/30 rounded-lg p-6 shadow-xl space-y-4">
          <h2 className="font-mono text-xs font-bold text-on-surface uppercase tracking-wider">
            Peak vs Average BPM
          </h2>
          {dailyBpmData.length > 0 && (
            <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-on-surface-variant">
              <span className="inline-flex items-center gap-2 font-mono">
                <i className="h-2 w-2 rounded-full bg-[var(--color-secondary)]" />{" "}
                Peak BPM
              </span>
              <span className="inline-flex items-center gap-2 font-mono">
                <i className="h-2 w-2 rounded-full bg-[var(--color-primary)]" />{" "}
                Average BPM
              </span>
            </div>
          )}
          <div className="flex h-64 min-w-0 flex-col">
            {dailyBpmData.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={dailyBpmData} margin={{ top: 12 }}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="var(--color-outline-variant)"
                    opacity={0.4}
                  />
                  <XAxis dataKey="date" fontSize={11} />
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
                No BPM data for these dates.
              </p>
            )}
          </div>
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
                Breakdown shows how much time was spent on each practice
                source.
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
        <div className="h-64">
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
                    new Set(taskActivities.map((activity) => activity.taskId))
                      .size - taskStarts.length,
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

      <section className="stats-custom-card stats-analytics-panel bg-surface-container border border-outline-variant/30 rounded-lg p-6 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="stats-analytics-heading font-mono text-xs font-bold text-on-surface uppercase tracking-wider">
            <span className="stats-analytics-heading-icon">
              <BarChart3 size={15} />
            </span>
            Custom Activities and Individual Task Analytics
          </h2>
          {customAnalyticsPageCount > 1 && (
            <div className="flex items-center gap-2 font-mono text-xs text-on-surface-variant">
              <button
                type="button"
                className="stats-log-page-button"
                onClick={() =>
                  setCustomAnalyticsPage((page) => Math.max(1, page - 1))
                }
                disabled={visibleCustomAnalyticsPage === 1}
                aria-label="Previous custom analytics page"
              >
                <ChevronLeft size={15} />
              </button>
              <span>
                Page {visibleCustomAnalyticsPage} of {customAnalyticsPageCount}
              </span>
              <button
                type="button"
                className="stats-log-page-button"
                onClick={() =>
                  setCustomAnalyticsPage((page) =>
                    Math.min(customAnalyticsPageCount, page + 1),
                  )
                }
                disabled={
                  visibleCustomAnalyticsPage === customAnalyticsPageCount
                }
                aria-label="Next custom analytics page"
              >
                <ChevronRight size={15} />
              </button>
            </div>
          )}
        </div>
        <div className="stats-analytics-grid grid grid-cols-1 lg:grid-cols-2 gap-6 mt-5">
          <div className="stats-analytics-column">
            {customRows.length ? (
              visibleCustomRows.map(([name, value]) => (
                <div key={name} className="stats-analytics-row font-mono">
                  <span className="stats-analytics-row-icon stats-analytics-row-icon-custom">
                    <BarChart3 size={15} />
                  </span>
                  <span className="stats-analytics-row-copy">
                    <span className="stats-analytics-row-title">
                      {tagLabel(name)}
                    </span>
                    <span className="stats-analytics-row-meta">
                      {value.days.size} day{value.days.size === 1 ? "" : "s"} ·{" "}
                      {value.sessions} session
                      {value.sessions === 1 ? "" : "s"}
                    </span>
                  </span>
                  <span className="stats-analytics-row-stat">
                    {formatDuration(value.seconds)} · {daysSince(value.last)}d
                  </span>
                </div>
              ))
            ) : (
              <p className="text-xs font-mono text-on-surface-variant">
                Use @custom(Activity Name) in a task to track custom work.
              </p>
            )}
          </div>
          <div className="stats-analytics-column">
            {taskRows.length ? (
              visibleTaskRows.map(([name, value]) => (
                <button
                  key={name}
                  onClick={() =>
                    setSelectedTask(selectedTask === name ? null : name)
                  }
                  className="stats-analytics-row stats-analytics-row-button w-full text-left font-mono hover:bg-outline-variant/10"
                >
                  <span className="stats-analytics-row-icon stats-analytics-row-icon-task">
                    <ListChecks size={15} />
                  </span>
                  <span className="stats-analytics-row-copy">
                    <span className="stats-analytics-row-title">{name}</span>
                    <span className="stats-analytics-row-meta">
                      For{" "}
                      {activities.find(
                        (activity) =>
                          (activity.task || activity.subject) === name,
                      )?.area || "Task practice"}{" "}
                      · {value.days.size} day
                      {value.days.size === 1 ? "" : "s"}
                    </span>
                  </span>
                  <span className="stats-analytics-row-stat">
                    {formatDuration(value.seconds)} · {value.days.size}d
                  </span>
                </button>
              ))
            ) : (
              <p className="text-xs font-mono text-on-surface-variant">
                No task history yet.
              </p>
            )}
          </div>
        </div>
        {selectedTask && (
          <div className="mt-5 border-t border-outline-variant/30 pt-4 text-xs font-mono">
            <h3 className="text-on-surface font-bold">{selectedTask}</h3>
            <p className="text-on-surface-variant mt-2">
              Total time {formatDuration(selectedTaskStats.seconds)} ·{" "}
              {selectedTaskStats.days.size} practice days · average{" "}
              {formatDuration(
                selectedTaskStats.seconds /
                  Math.max(1, selectedTaskActivities.length),
              )}{" "}
              · last{" "}
              {dateLabel(
                new Date(selectedTaskStats.last).toISOString().slice(0, 10),
              )}
            </p>
            {selectedTaskStats.bpms.length > 0 && (
              <p className="text-on-surface-variant">
                BPM {Math.min(...selectedTaskStats.bpms)}–
                {Math.max(...selectedTaskStats.bpms)} · average{" "}
                {Math.round(
                  selectedTaskStats.bpms.reduce((a, b) => a + b, 0) /
                    selectedTaskStats.bpms.length,
                )}
              </p>
            )}
          </div>
        )}
      </section>

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
                <th className="py-3 px-3">BPM</th>
                <th className="py-3 px-3">Tags</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/30">
              {practiceLogActivities.map((activity) => (
                <tr key={activity.id}>
                  <td className="py-3 px-3 text-on-surface-variant">
                    {activity.date}
                  </td>
                  <td className="py-3 px-3 text-on-surface max-w-[220px] truncate">
                    {activity.task || activity.subject || activity.area}
                  </td>
                  <td className="py-3 px-3 text-primary">{activity.source}</td>
                  <td className="py-3 px-3 text-on-surface">{activity.area}</td>
                  <td className="py-3 px-3 text-on-surface">
                    {formatDuration(activity.durationSeconds)}
                  </td>
                  <td className="py-3 px-3 text-on-surface">
                    {activity.bpm || "-"}
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
