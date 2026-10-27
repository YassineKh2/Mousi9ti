import React, { useId } from "react";
import { Check } from "lucide-react";
import {
  MAX_CUSTOM_WEEKS,
  validateCustomWeekDuration,
} from "../lib/taskDuration";

interface CustomWeekDurationProps {
  startDate: number;
  weeks: string;
  onChange: (weeks: string) => void;
  onApply: () => void;
  weekday?: number;
  hiddenDates?: string[];
  existingRange?: { startsAt: number; expiresAt: number };
}

const formatDate = (timestamp: number) =>
  new Date(timestamp).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

export const CustomWeekDuration: React.FC<CustomWeekDurationProps> = ({
  startDate,
  weeks,
  onChange,
  onApply,
  weekday,
  hiddenDates,
  existingRange,
}) => {
  const inputId = useId();
  const { range, error } = validateCustomWeekDuration(
    startDate,
    weeks,
    weekday,
    hiddenDates,
  );
  return (
    <div className="space-y-3 px-2 text-xs font-mono text-on-surface">
      {existingRange && (
        <p className="text-on-surface-variant">
          Current period: {formatDate(existingRange.startsAt)} -{" "}
          {formatDate(existingRange.expiresAt - 1)}
        </p>
      )}
      <label htmlFor={inputId} className="block">
        Number of weeks
      </label>
      <input
        id={inputId}
        type="text"
        inputMode="numeric"
        value={weeks}
        onChange={(event) => onChange(event.target.value)}
        aria-invalid={Boolean(error)}
        aria-describedby={`${inputId}-status`}
        autoComplete="off"
        className="min-h-9 w-full rounded-md border border-outline-variant/40 bg-surface-container-high px-3 outline-none focus:border-primary"
      />
      <div
        className="flex gap-2"
        role="group"
        aria-label="Common week durations"
      >
        {[1, 2, 3, 4].map((count) => (
          <button
            key={count}
            type="button"
            aria-pressed={weeks === String(count)}
            onClick={() => onChange(String(count))}
            className={`min-h-9 flex-1 rounded-md border px-1 ${weeks === String(count) ? "border-primary text-primary" : "border-outline-variant/40"}`}
          >
            {count} {count === 1 ? "week" : "weeks"}
          </button>
        ))}
      </div>
      <p
        id={`${inputId}-status`}
        aria-live="polite"
        className={error ? "text-error" : "text-on-surface-variant"}
      >
        {range
          ? `${formatDate(range.startsAt)} - ${formatDate(range.expiresAt - 1)}`
          : error}
      </p>
      <button
        type="button"
        disabled={!range}
        onClick={onApply}
        title={`Apply duration (1 to ${MAX_CUSTOM_WEEKS} weeks)`}
        className="flex min-h-9 w-full items-center justify-center gap-2 rounded-md bg-primary px-3 text-on-primary disabled:opacity-50"
      >
        <Check size={14} /> Apply duration
      </button>
    </div>
  );
};
