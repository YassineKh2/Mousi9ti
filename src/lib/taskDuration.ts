import { getDayBoundaryAfter, isTaskVisibleOnDate } from "./taskDates";

export type TaskDurationPeriod =
  | "default"
  | "forever"
  | "week"
  | "month"
  | "year"
  | "custom";

export const getTaskExpiration = (
  period: TaskDurationPeriod,
  referenceDate = Date.now(),
): number | undefined => {
  if (period === "forever" || period === "default") return undefined;
  if (period === "custom") return undefined;

  if (period === "week") return getDayBoundaryAfter(referenceDate, 7);

  const expiration = new Date(referenceDate);
  expiration.setHours(0, 0, 0, 0);
  if (period === "month") {
    expiration.setMonth(expiration.getMonth() + 1, 1);
  } else {
    expiration.setFullYear(expiration.getFullYear() + 1, 0, 1);
  }
  return expiration.getTime();
};

export const MAX_CUSTOM_WEEKS = 999;

export const validateCustomWeekDuration = (
  startDate: number,
  value: string,
  weekday?: number,
  hiddenDates: string[] = [],
) => {
  const weeks = Number(value);
  if (
    !/^\d+$/.test(value) ||
    !Number.isSafeInteger(weeks) ||
    weeks < 1 ||
    weeks > MAX_CUSTOM_WEEKS
  ) {
    return {
      error: `Enter a whole number of weeks from 1 to ${MAX_CUSTOM_WEEKS}.`,
      range: null,
    };
  }
  const startsAt = getDayBoundaryAfter(startDate, 0);
  const expiresAt = getDayBoundaryAfter(startsAt, weeks * 7);
  if (!Number.isFinite(startsAt) || !Number.isFinite(expiresAt)) {
    return { error: "Choose a valid starting day.", range: null };
  }
  if (weekday !== undefined) {
    if (!Number.isInteger(weekday) || weekday < 0 || weekday > 6) {
      return { error: "Choose a valid task weekday.", range: null };
    }
    const first = new Date(startsAt);
    first.setDate(first.getDate() + ((weekday - first.getDay() + 7) % 7));
    let eligible = false;
    for (
      const date = first;
      date.getTime() < expiresAt;
      date.setDate(date.getDate() + 7)
    ) {
      if (isTaskVisibleOnDate({ startsAt, expiresAt, hiddenDates }, date)) {
        eligible = true;
        break;
      }
    }
    if (!eligible)
      return {
        error: "This period contains no eligible task day.",
        range: null,
      };
  }
  return { error: null, range: { startsAt, expiresAt } };
};
