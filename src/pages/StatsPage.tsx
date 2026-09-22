import React, { useMemo, useState } from "react";
import { Session, StreakData, TaskActivity, PracticeActivity } from "../types";
import {
  getSavedPracticeActivities,
  getSavedStreak,
  getSavedTaskActivities,
} from "../lib/storage";
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
  Target,
  Timer,
  Zap,
} from "lucide-react";

interface StatsPageProps {
  sessions: Session[];
  streak: StreakData;
}

type Range = "7" | "30" | "90" | "all" | "custom";
type Source = "Task" | "Timer" | "Metronome" | "Session" | "Custom";
interface AnalyticsActivity {
  id: string;
  date: string;
  startTime: number;
  durationSeconds: number;
  countedDurationSeconds: number;
  source: Source;
  area: string;
  subject?: string;
  task?: string;
  tags: string[];
  bpm?: number;
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
  const [range, setRange] = useState<Range>("7");
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(() => new Date());
  const [customRange, setCustomRange] = useState<{
    start: number;
    end: number;
  } | null>(null);
  const [selectionStart, setSelectionStart] = useState<number | null>(null);
  const [isDraggingRange, setIsDraggingRange] = useState(false);
  const [selectedTask, setSelectedTask] = useState<string | null>(null);
  const [practiceLogPage, setPracticeLogPage] = useState(1);
  const taskActivities = getSavedTaskActivities();
  const genericActivities = getSavedPracticeActivities();
  const savedStreak = getSavedStreak();
  const periodStart = useMemo(() => {
    if (range === "custom" && customRange) return customRange.start;
    if (range === "all") return 0;
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - Number(range) + 1);
    return start.getTime();
  }, [customRange, range]);
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
        : Number(range);

  const allActivities = useMemo(() => {
    const taskRecords = taskActivities
      .filter((activity) => activity.kind === "completed")
      .map(taskToActivity);
    const legacySessions = sessions.map(sessionToActivity);
    const genericRecords = genericActivities.map(genericToActivity);
    const records = [...legacySessions, ...taskRecords, ...genericRecords].sort(
      (a, b) => b.startTime - a.startTime,
    );
    return records.map((activity) => {
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
          isContained || isEmbeddedInTask ? 0 : activity.durationSeconds,
      };
    });
  }, [genericActivities, sessions, taskActivities]);
  const activities = allActivities.filter(
    (activity) => activity.startTime >= periodStart,
  );
  const taskStarts = taskActivities.filter(
    (activity) =>
      activity.kind === "started" && activity.timestamp >= periodStart,
  );
  const taskCompletions = taskActivities.filter(
    (activity) =>
      activity.kind === "completed" && activity.timestamp >= periodStart,
  );
  const totalSeconds = activities.reduce(
    (sum, activity) => sum + activity.countedDurationSeconds,
    0,
  );
  const taskSeconds = activities
    .filter((a) => a.source === "Task" || a.source === "Custom")
    .reduce((sum, a) => sum + a.countedDurationSeconds, 0);
  const timerSeconds = activities
    .filter((a) => a.source === "Timer")
    .reduce((sum, a) => sum + a.countedDurationSeconds, 0);
  const metronomeSeconds = activities
    .filter((a) => a.source === "Metronome")
    .reduce((sum, a) => sum + a.countedDurationSeconds, 0);
  const practiceDays = new Set(activities.map((activity) => activity.date))
    .size;
  const averageSession = activities.length
    ? totalSeconds / activities.length
    : 0;
  const completionRate = taskStarts.length
    ? Math.round((taskCompletions.length / taskStarts.length) * 100)
    : 0;
  const customActivities = activities.filter(
    (activity) => activity.source === "Custom",
  );
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

  const aggregate = (key: (activity: AnalyticsActivity) => string) =>
    Object.entries(
      activities.reduce(
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
  const areaRows = aggregate((activity) => activity.area).sort(
    (a, b) => b[1].seconds - a[1].seconds,
  );
  const taskRows = aggregate(
    (activity) => activity.task || activity.subject || "Untitled task",
  )
    .filter(([name]) => name !== "Untitled task")
    .sort((a, b) => b[1].seconds - a[1].seconds);
  const customRows = aggregate(
    (activity) =>
      activity.subject || activity.task || "Unnamed custom activity",
  )
    .filter(([name]) => name !== "Unnamed custom activity")
    .sort((a, b) => b[1].seconds - a[1].seconds);
  const tagRows = aggregate(
    (activity) =>
      activity.tags.find(
        (tag) => !["timer", "session", "metronome"].includes(tag),
      ) || "",
  )
    .filter(([name]) => name)
    .sort((a, b) => b[1].sessions - a[1].sessions);
  const areaChart = areaRows.map(([name, value]) => ({
    name,
    minutes: Math.round(value.seconds / 60),
  }));
  const sourceAreas = [
    "Rhythm",
    "General practice",
    "Technique",
    "Scales",
    "Exercises",
    "Tones",
  ];
  const sourceChart = [
    ...sourceAreas,
    ...areaRows
      .map(([name]) => name)
      .filter((name) => !sourceAreas.includes(name)),
  ].map((name) => {
    const seconds = activities
      .filter((activity) => activity.area === name)
      .reduce((sum, activity) => sum + activity.countedDurationSeconds, 0);
    return {
      name,
      seconds,
      minutes: seconds / 60,
      percentage: Math.round((seconds / Math.max(1, totalSeconds)) * 100),
    };
  });
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
          activity.task === selectedTask || activity.subject === selectedTask,
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
  if (!sessions.length && !taskActivities.length && !genericActivities.length)
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
      `${practiceDays} practice days`,
      <Clock size={16} className="text-primary" />,
    ],
    [
      "Task practice",
      formatDuration(taskSeconds),
      `${Math.round((taskSeconds / Math.max(1, totalSeconds)) * 100)}% of total`,
      <ListChecks size={16} className="text-primary" />,
    ],
    [
      "Timer practice",
      formatDuration(timerSeconds),
      "Deduplicated embedded sessions",
      <Timer size={16} className="text-primary" />,
    ],
    [
      "Metronome practice",
      formatDuration(metronomeSeconds),
      "Standalone rhythm work",
      <Zap size={16} className="text-primary" />,
    ],
    [
      "Current streak",
      `${savedStreak.currentStreak} days`,
      `Longest: ${savedStreak.longestStreak} days`,
      <Flame size={16} className="text-primary" />,
    ],
    [
      "Average session",
      formatDuration(averageSession),
      `${activities.length} total sessions`,
      <Calendar size={16} className="text-primary" />,
    ],
    [
      "Tasks completed",
      taskCompletions.length,
      `${completionRate}% completion rate`,
      <CheckCircle2 size={16} className="text-primary" />,
    ],
    [
      "Areas practiced",
      areaRows.length,
      `${customRows.length} custom activities`,
      <Target size={16} className="text-primary" />,
    ],
    [
      "Practice days",
      `${practiceDays}/${periodDays}`,
      `${Math.round((practiceDays / periodDays) * 100)}% consistency`,
      <Calendar size={16} className="text-primary" />,
    ],
    [
      "Practice acts",
      `${taskStarts.length}/${Math.max(taskStarts.length, taskCompletions.length)}`,
      `${completionRate}% consistency`,
      <BarChart3 size={16} className="text-primary" />,
    ],
  ];
  const overviewCards = metricCards.slice(0, 5);
  const secondaryCards = metricCards.slice(5);
  const rangeLabel = range === "all" ? "All time" : `${range} days`;
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
  const calendarDays = useMemo(() => {
    const firstDay = new Date(
      calendarMonth.getFullYear(),
      calendarMonth.getMonth(),
      1,
    );
    const gridStart = new Date(firstDay);
    gridStart.setDate(firstDay.getDate() - firstDay.getDay());
    return Array.from({ length: 42 }, (_, index) => {
      const day = new Date(gridStart);
      day.setDate(gridStart.getDate() + index);
      day.setHours(0, 0, 0, 0);
      return day;
    });
  }, [calendarMonth]);
  const dayTimestamp = (date: Date) =>
    new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const chooseCalendarDay = (timestamp: number) => {
    if (selectionStart === null) {
      setSelectionStart(timestamp);
      setCustomRange({ start: timestamp, end: timestamp });
      setRange("custom");
      return;
    }
    const start = Math.min(selectionStart, timestamp);
    const end = Math.max(selectionStart, timestamp);
    setCustomRange({ start, end });
    setRange("custom");
    setSelectionStart(null);
    setIsDraggingRange(false);
  };
  const previewCalendarDay = (timestamp: number) => {
    if (isDraggingRange && selectionStart !== null) {
      setCustomRange({
        start: Math.min(selectionStart, timestamp),
        end: Math.max(selectionStart, timestamp),
      });
      setRange("custom");
    }
  };
  const finishCalendarDrag = () => {
    if (
      selectionStart !== null &&
      customRange &&
      customRange.start !== customRange.end
    )
      setSelectionStart(null);
    setIsDraggingRange(false);
  };

  return (
    <div className="stats-page space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-mono text-xl font-bold text-on-surface">
            Practice Analytics
          </h1>
          <p className="text-xs font-mono text-on-surface-variant mt-1">
            One practice history across tasks, timer, metronome, and custom
            work.
          </p>
        </div>
        <div className="stats-date-picker">
          <div className="stats-date-control">
            <Calendar size={16} />
            <select
              value={range}
              onChange={(event) => {
                setCustomRange(null);
                setSelectionStart(null);
                setRange(event.target.value as Range);
              }}
              aria-label="Practice date range"
            >
              {(["7", "30", "90", "all"] as Range[]).map((value) => (
                <option key={value} value={value}>
                  {value === "all" ? "All time" : `${value} days`}
                </option>
              ))}
              {range === "custom" && (
                <option value="custom">Custom range</option>
              )}
            </select>
            <ChevronDown size={13} />
            <span className="stats-date-divider" />
            <button
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
            <div className="stats-calendar-popover">
              <div className="stats-calendar-header">
                <button
                  onClick={() =>
                    setCalendarMonth(
                      new Date(
                        calendarMonth.getFullYear(),
                        calendarMonth.getMonth() - 1,
                        1,
                      ),
                    )
                  }
                >
                  ‹
                </button>
                <b>
                  {calendarMonth.toLocaleDateString("en-US", {
                    month: "long",
                    year: "numeric",
                  })}
                </b>
                <button
                  onClick={() =>
                    setCalendarMonth(
                      new Date(
                        calendarMonth.getFullYear(),
                        calendarMonth.getMonth() + 1,
                        1,
                      ),
                    )
                  }
                >
                  ›
                </button>
              </div>
              <div className="stats-calendar-weekdays">
                {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((day) => (
                  <span key={day}>{day}</span>
                ))}
              </div>
              <div
                className="stats-calendar-grid"
                onMouseUp={finishCalendarDrag}
              >
                {calendarDays.map((day) => {
                  const timestamp = dayTimestamp(day);
                  const inMonth = day.getMonth() === calendarMonth.getMonth();
                  const selected =
                    customRange &&
                    timestamp >= customRange.start &&
                    timestamp <= customRange.end;
                  return (
                    <button
                      key={timestamp}
                      className={`${inMonth ? "" : "is-muted"} ${selected ? "is-selected" : ""}`}
                      onMouseDown={(event) => {
                        event.preventDefault();
                        setIsDraggingRange(true);
                        chooseCalendarDay(timestamp);
                      }}
                      onMouseEnter={() => previewCalendarDay(timestamp)}
                    >
                      {day.getDate()}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
      <div
        data-tour="stats-metrics"
        className="stats-overview-card rounded-xl border border-white/[0.07] bg-[#111a26] p-4 shadow-[0_8px_30px_rgba(0,0,0,.18)]"
      >
        <div className="stats-overview-items grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
          {overviewCards.map(([label, value, detail, icon]) => (
            <div
              key={String(label)}
              className="stats-overview-item min-w-0 border-l border-white/[0.07] pl-4"
            >
              <div className="flex items-start gap-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-blue-500/15 text-blue-400">
                  {icon}
                </span>
                <div className="min-w-0">
                  <span className="block truncate text-[11px] text-slate-400">
                    {label}
                  </span>
                  <span className="mt-1 block text-2xl font-semibold leading-none tracking-tight text-slate-100">
                    {value}
                  </span>
                  <span className="mt-1 block text-[10px] text-emerald-400">
                    {label === "Total Practice" || label === "Task Practice"
                      ? "↑ 12%"
                      : label === "Total Sessions"
                        ? "↑ 50%"
                        : label === "Areas Practiced"
                          ? "↑ 67%"
                          : "0%"}
                  </span>
                  <span className="mt-0.5 block text-[10px] text-slate-500">
                    {detail}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="stats-secondary-grid grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        {secondaryCards.map(([label, value, detail, icon], index) => (
          <div
            key={String(label)}
            className="stats-metric-card min-w-0 rounded-xl border border-white/[0.07] bg-[#17191d] p-4 shadow-[0_8px_30px_rgba(0,0,0,.18)]"
          >
            <div className="flex items-start gap-3">
              <span
                className={`grid h-9 w-9 shrink-0 place-items-center rounded-full ${index === 0 ? "bg-amber-500/15 text-amber-400" : index === 2 ? "bg-emerald-500/15 text-emerald-400" : index === 3 ? "bg-violet-500/15 text-violet-400" : "bg-blue-500/15 text-blue-400"}`}
              >
                {icon}
              </span>
              <div className="min-w-0">
                <span className="block truncate text-[11px] text-slate-400">
                  {label}
                </span>
                <span className="mt-1 block text-2xl font-semibold leading-none tracking-tight text-slate-100">
                  {value}
                </span>
                <span className="mt-1 block truncate text-[10px] text-slate-500">
                  {detail}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="stats-breakdown-grid grid grid-cols-1 gap-4 xl:grid-cols-[1.15fr_.85fr]">
        <section className="bg-surface-container border border-outline-variant/30 rounded-lg p-6 shadow-xl space-y-4">
          <h2 className="font-mono text-xs font-bold text-on-surface uppercase tracking-wider">
            Practice Focus / Breakdown
          </h2>
          {areaRows.length ? (
            areaRows.map(([name, value], index) => (
              <div
                key={name}
                className="grid grid-cols-[125px_1fr_42px_30px] items-center gap-3 text-xs font-mono"
              >
                <span className="flex items-center gap-2 text-slate-300">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: colors[index % colors.length] }}
                  />
                  {name}
                </span>
                <div className="h-2 overflow-hidden rounded-full bg-[#28303a]">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${Math.max(0, (value.seconds / Math.max(1, totalSeconds)) * 100)}%`,
                      backgroundColor: colors[index % colors.length],
                    }}
                  />
                </div>
                <span className="text-right text-slate-400">
                  {Math.round(
                    (value.seconds / Math.max(1, totalSeconds)) * 100,
                  )}
                  %
                </span>
              </div>
            ))
          ) : (
            <p className="text-xs font-mono text-on-surface-variant">
              No timed focus data yet.
            </p>
          )}
        </section>
        <section className="bg-surface-container border border-outline-variant/30 rounded-lg p-6 shadow-xl space-y-4">
          <h2 className="font-mono text-xs font-bold text-on-surface uppercase tracking-wider">
            Practice Sources
          </h2>
          <div className="stats-source-content">
            <div className="stats-source-chart">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Tooltip
                    formatter={(value: number) => formatDuration(value)}
                  />
                  <Pie
                    data={sourceChart}
                    dataKey="seconds"
                    nameKey="name"
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
            <div className="stats-source-legend">
              {sourceChart.map((entry, index) => (
                <div key={entry.name} className="stats-source-row">
                  <span className="stats-source-name">
                    <i
                      style={{ backgroundColor: colors[index % colors.length] }}
                    />
                    {entry.name}
                  </span>
                  <span>{entry.percentage}%</span>
                  <span>{formatDuration(entry.seconds)}</span>
                </div>
              ))}
            </div>
          </div>
          <p className="text-[10px] font-mono text-on-surface-variant">
            Breakdown shows how much time was spent on each practice source.
          </p>
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
              <Tooltip />
              <Area
                yAxisId="time"
                dataKey="minutes"
                fill="#60a5fa"
                fillOpacity={0.25}
                type="monotone"
                stroke="#60a5fa"
                name="Minutes"
              />
              <Line
                yAxisId="count"
                dataKey="sessions"
                stroke="#f59e0b"
                name="Sessions"
                strokeWidth={2}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </section>

      <div className="stats-ranking-grid grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        <section className="bg-surface-container border border-outline-variant/30 rounded-lg p-6 shadow-xl space-y-4">
          <h2 className="font-mono text-xs font-bold text-on-surface uppercase tracking-wider">
            Most Practiced
          </h2>
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
              <span className="flex-1 truncate text-on-surface">{name}</span>
              <span className="whitespace-nowrap text-on-surface-variant">
                {formatDuration(value.seconds)} · {value.days.size} session
                {value.days.size === 1 ? "" : "s"}
              </span>
            </div>
          ))}
        </section>
        <section className="bg-surface-container border border-outline-variant/30 rounded-lg p-6 shadow-xl space-y-4">
          <h2 className="font-mono text-xs font-bold text-on-surface uppercase tracking-wider">
            Least Practiced
          </h2>
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
                <span className="flex-1 truncate text-on-surface">{name}</span>
                <span className="text-on-surface-variant">
                  {formatDuration(value.seconds)} · {daysSince(value.last)}d ago
                </span>
              </div>
            ))
          ) : (
            <p className="text-xs font-mono text-on-surface-variant">
              No gaps recorded yet.
            </p>
          )}
          <div className="border-t border-outline-variant/30 pt-3 text-xs font-mono text-on-surface-variant">
            Most active day:{" "}
            <span className="text-on-surface">{activeDay}</span> · Longest gap:{" "}
            <span className="text-on-surface">{longestGap} days</span>
          </div>
        </section>
        <section className="stats-completion-card bg-surface-container border border-outline-variant/30 rounded-lg p-6 shadow-xl">
          <h2 className="font-mono text-xs font-bold text-on-surface uppercase tracking-wider">
            Task Completion
          </h2>
          <div className="mt-4 space-y-4 text-xs font-mono">
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
                  <span className="ml-4 text-slate-500">Completed</span>
                </p>
                <p>
                  <span className="mr-3 inline-block h-3 w-3 rounded-full bg-blue-500" />
                  {Math.max(0, taskStarts.length - taskCompletions.length)}
                  <span className="ml-4 text-slate-500">In progress</span>
                </p>
                <p>
                  <span className="mr-3 inline-block h-3 w-3 rounded-full bg-slate-500" />
                  {Math.max(
                    0,
                    new Set(taskActivities.map((activity) => activity.taskId))
                      .size - taskStarts.length,
                  )}
                  <span className="ml-4 text-slate-500">Not started</span>
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
                  <b className="mx-3 text-slate-500">→</b>{" "}
                  {formatDuration(taskSeconds)}
                </span>
              </div>
              <div className="flex justify-between border-b border-white/[0.04] py-1">
                <span>Metronome</span>
                <span>
                  0m <b className="mx-3 text-slate-500">→</b>{" "}
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
                  <b className="mx-3 text-slate-500">→</b>{" "}
                  {formatDuration(totalSeconds)}
                </span>
              </div>
            </div>
          </div>
        </section>
      </div>

      <section className="stats-custom-card stats-analytics-panel bg-surface-container border border-outline-variant/30 rounded-lg p-6 shadow-xl">
        <h2 className="stats-analytics-heading font-mono text-xs font-bold text-on-surface uppercase tracking-wider">
          <span className="stats-analytics-heading-icon">
            <BarChart3 size={15} />
          </span>
          Custom Activities and Individual Task Analytics
        </h2>
        <div className="stats-analytics-grid grid grid-cols-1 lg:grid-cols-2 gap-6 mt-5">
          <div className="stats-analytics-column">
            {customRows.length ? (
              customRows.map(([name, value]) => (
                <div key={name} className="stats-analytics-row font-mono">
                  <span className="stats-analytics-row-icon stats-analytics-row-icon-custom">
                    <BarChart3 size={15} />
                  </span>
                  <span className="stats-analytics-row-copy">
                    <span className="stats-analytics-row-title">{name}</span>
                    <span className="stats-analytics-row-meta">
                      For{" "}
                      {activities.find(
                        (activity) =>
                          (activity.subject || activity.task) === name,
                      )?.area || "Custom practice"}{" "}
                      · {value.sessions} session
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
              taskRows.slice(0, 8).map(([name, value]) => (
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
