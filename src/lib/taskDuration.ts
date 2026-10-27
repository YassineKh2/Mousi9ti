import { getDayBoundaryAfter, getTaskDateKey } from "./taskDates";

export const MAX_CUSTOM_WEEKS = 999;

export const validateCustomWeekDuration = (
  startDate: number,
  value: string,
  weekday?: number,
  hiddenDates: string[] = [],
) => {
  const weeks = Number(value);
  if (!/^\d+$/.test(value) || !Number.isSafeInteger(weeks) || weeks < 1 || weeks > MAX_CUSTOM_WEEKS) {
    return { error: `Enter a whole number of weeks from 1 to ${MAX_CUSTOM_WEEKS}.`, range: null };
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
    first.setDate(first.getDate() + (weekday - first.getDay() + 7) % 7);
    let eligible = false;
    for (const date = first; date.getTime() < expiresAt; date.setDate(date.getDate() + 7)) {
      if (!hiddenDates.includes(getTaskDateKey(date))) {
        eligible = true;
        break;
      }
    }
    if (!eligible) return { error: "This period contains no eligible task day.", range: null };
  }
  return { error: null, range: { startsAt, expiresAt } };
};