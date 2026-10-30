interface DatedTask {
  id?: string;
  createdAt?: number;
  startsAt?: number;
  expiresAt?: number;
  visibilityHistory?: { startsAt?: number; expiresAt?: number }[];
  hiddenDates?: string[];
}

interface TaskCompletion {
  id: string;
  completed?: boolean;
  completedByDate?: Record<string, boolean>;
}

interface TaskCompletionActivity {
  taskId: string;
  date: string;
  kind: "started" | "completed";
}

export const getTaskDateKey = (date: Date) =>
  [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");

export const getDayBoundaryAfter = (timestamp: number, days: number) => {
  const date = new Date(timestamp);
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + days);
  return date.getTime();
};

export const getMondayMonthWeeks = (month: Date) => {
  const firstDay = new Date(month.getFullYear(), month.getMonth(), 1);
  const lastDay = new Date(month.getFullYear(), month.getMonth() + 1, 0);
  const firstWeek = new Date(firstDay);
  firstWeek.setDate(firstWeek.getDate() - ((firstWeek.getDay() + 6) % 7));

  const weeks: Date[] = [];
  while (firstWeek <= lastDay) {
    weeks.push(new Date(firstWeek));
    firstWeek.setDate(firstWeek.getDate() + 7);
  }
  return weeks.slice(0, 5);
};

export const getTaskCreatedAt = (task: DatedTask) => {
  if (Number.isFinite(task.createdAt)) return task.createdAt;
  const legacyTimestamp = task.id?.match(/^(?:t-)?(\d{13})(?:-\d+)?$/)?.[1];
  return legacyTimestamp ? Number(legacyTimestamp) : undefined;
};

export const withTaskCreationDate = <T extends DatedTask>(
  task: T,
  fallbackTimestamp = Date.now(),
): T & { createdAt: number } => ({
  ...task,
  createdAt:
    getTaskCreatedAt(task) ??
    (Number.isFinite(task.startsAt) ? task.startsAt! : fallbackTimestamp),
});

const getTaskStart = (task: DatedTask) => {
  if (Number.isFinite(task.startsAt)) return task.startsAt;
  return getTaskCreatedAt(task);
};

export const preserveTaskHistoryBefore = (task: DatedTask, cutoff: number) => {
  const startsAt = getTaskStart(task);
  if (startsAt !== undefined && startsAt >= cutoff) {
    return task.visibilityHistory ?? [];
  }

  const expiresAt =
    task.expiresAt === undefined ? cutoff : Math.min(task.expiresAt, cutoff);
  if (expiresAt <= (startsAt ?? Number.NEGATIVE_INFINITY)) {
    return task.visibilityHistory ?? [];
  }

  return [...(task.visibilityHistory ?? []), { startsAt, expiresAt }];
};

const isRangeVisibleOnDate = (
  range: { startsAt?: number; expiresAt?: number },
  dayStart: number,
  nextDayStart: number,
) =>
  (range.startsAt === undefined || range.startsAt < nextDayStart) &&
  (!Number.isFinite(range.expiresAt) || range.expiresAt! > dayStart);

export const isTaskActiveAt = (task: DatedTask, timestamp: number) => {
  const startsAt = getTaskStart(task);
  const createdAt = getTaskCreatedAt(task);
  return (
    (createdAt === undefined ||
      getDayBoundaryAfter(createdAt, 0) <= timestamp) &&
    (startsAt === undefined || startsAt <= timestamp) &&
    !isTaskExpiredAt(task, timestamp)
  );
};

export const isTaskExpiredAt = (task: DatedTask, timestamp: number) =>
  Number.isFinite(task.expiresAt) && task.expiresAt! <= timestamp;

export const isTaskVisibleOnDate = (task: DatedTask, date: Date) => {
  const dayStart = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
  ).getTime();
  const nextDayStart = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate() + 1,
  ).getTime();
  const startsAt = getTaskStart(task);

  const createdAt = getTaskCreatedAt(task);
  if (createdAt !== undefined && createdAt >= nextDayStart) return false;
  if (task.hiddenDates?.includes(getTaskDateKey(date))) return false;

  return (
    isRangeVisibleOnDate(
      { startsAt, expiresAt: task.expiresAt },
      dayStart,
      nextDayStart,
    ) ||
    task.visibilityHistory?.some((range) =>
      isRangeVisibleOnDate(range, dayStart, nextDayStart),
    ) === true
  );
};

export const deleteTaskFromSchedule = <
  T extends { tasks: Array<{ id: string; hiddenDates?: string[] }> },
>(
  schedule: T[],
  taskId: string,
  date: Date,
  scope: "day" | "everywhere",
) => {
  if (scope === "everywhere") {
    return schedule.map((day) => ({
      ...day,
      tasks: day.tasks.filter((task) => task.id !== taskId),
    }));
  }

  const dateKey = getTaskDateKey(date);
  return schedule.map((day) => ({
    ...day,
    tasks: day.tasks.map((task) =>
      task.id === taskId
        ? {
            ...task,
            hiddenDates: [...new Set([...(task.hiddenDates ?? []), dateKey])],
          }
        : task,
    ),
  }));
};

export const isTaskCompletedOnDate = (
  task: TaskCompletion,
  date: Date,
  activities: TaskCompletionActivity[] = [],
) => {
  const dateKey = getTaskDateKey(date);
  if (Object.hasOwn(task.completedByDate ?? {}, dateKey)) {
    return task.completedByDate![dateKey];
  }

  if (
    activities.some(
      (activity) =>
        activity.taskId === task.id &&
        activity.date === dateKey &&
        activity.kind === "completed",
    )
  ) {
    return true;
  }

  const startsAt = getTaskStart(task);
  if (task.completed && startsAt !== undefined) {
    return getTaskDateKey(new Date(startsAt)) === dateKey;
  }

  return task.completed === true && dateKey === getTaskDateKey(new Date());
};

export const getTasksForDate = <T extends DatedTask & TaskCompletion>(
  tasks: T[],
  date: Date,
  activities: TaskCompletionActivity[] = [],
) =>
  tasks
    .filter((task) => isTaskVisibleOnDate(task, date))
    .map((task) => ({
      ...task,
      completed: isTaskCompletedOnDate(task, date, activities),
    }));

export const getTaskCompletionCounts = (
  tasks: Array<Pick<TaskCompletion, "completed">>,
) => ({
  total: tasks.length,
  completed: tasks.filter((task) => task.completed).length,
});
