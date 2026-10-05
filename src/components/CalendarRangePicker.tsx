import React, { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

export interface CalendarDateRange {
  start: number;
  end: number;
}

interface CalendarRangePickerProps {
  range: CalendarDateRange | null;
  onChange: (range: CalendarDateRange) => void;
  onComplete?: () => void;
  minDate?: number;
  inline?: boolean;
  calendarRef?: React.Ref<HTMLDivElement>;
}

const startOfDay = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();

export const CalendarRangePicker: React.FC<CalendarRangePickerProps> = ({
  range,
  onChange,
  onComplete,
  minDate,
  inline = false,
  calendarRef,
}) => {
  const [calendarMonth, setCalendarMonth] = useState(
    () => new Date(range?.start ?? Date.now()),
  );
  const [selectionStart, setSelectionStart] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
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
  const minimumDay =
    minDate === undefined ? undefined : startOfDay(new Date(minDate));

  const chooseDay = (timestamp: number) => {
    if (minimumDay !== undefined && timestamp < minimumDay) return;
    if (selectionStart === null) {
      setSelectionStart(timestamp);
      onChange({ start: timestamp, end: timestamp });
      return;
    }

    onChange({
      start: Math.min(selectionStart, timestamp),
      end: Math.max(selectionStart, timestamp),
    });
    setSelectionStart(null);
    setIsDragging(false);
    onComplete?.();
  };

  const previewDay = (timestamp: number) => {
    if (!isDragging || selectionStart === null) return;
    if (minimumDay !== undefined && timestamp < minimumDay) return;
    onChange({
      start: Math.min(selectionStart, timestamp),
      end: Math.max(selectionStart, timestamp),
    });
  };

  const finishDrag = () => {
    setIsDragging(false);
    if (selectionStart !== null && range && range.start !== range.end) {
      setSelectionStart(null);
      onComplete?.();
    }
  };

  return (
    <div
      ref={calendarRef}
      className={`stats-calendar-popover${inline ? " task-calendar-inline" : ""}`}
    >
      <div className="stats-calendar-header">
        <button
          type="button"
          aria-label="Previous month"
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
          <ChevronLeft size={16} />
        </button>
        <b>
          {calendarMonth.toLocaleDateString("en-US", {
            month: "long",
            year: "numeric",
          })}
        </b>
        <button
          type="button"
          aria-label="Next month"
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
          <ChevronRight size={16} />
        </button>
      </div>
      <div className="stats-calendar-weekdays">
        {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((day) => (
          <span key={day}>{day}</span>
        ))}
      </div>
      <div className="stats-calendar-grid" onMouseUp={finishDrag}>
        {calendarDays.map((day) => {
          const timestamp = startOfDay(day);
          const inMonth = day.getMonth() === calendarMonth.getMonth();
          const selected =
            range && timestamp >= range.start && timestamp <= range.end;
          const disabled = minimumDay !== undefined && timestamp < minimumDay;

          return (
            <button
              key={timestamp}
              type="button"
              disabled={disabled}
              aria-pressed={Boolean(selected)}
              aria-label={day.toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
              className={`${inMonth ? "" : "is-muted"} ${selected ? "is-selected" : ""}`}
              onMouseDown={(event) => {
                event.preventDefault();
                if (disabled) return;
                setIsDragging(true);
                chooseDay(timestamp);
              }}
              onMouseEnter={() => previewDay(timestamp)}
              onClick={(event) => {
                if (event.detail === 0 && !disabled) chooseDay(timestamp);
              }}
            >
              {day.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
};
