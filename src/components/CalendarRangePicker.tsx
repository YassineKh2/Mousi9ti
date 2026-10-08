import React, { useMemo, useRef, useState } from "react";
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

interface CalendarDayHitTarget {
  timestamp: number;
  centerX: number;
  centerY: number;
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
  const completingSelection = useRef(false);
  const dragStart = useRef<number | null>(null);
  const dragMoved = useRef(false);
  const activePointerId = useRef<number | null>(null);
  const dayHitTargets = useRef<CalendarDayHitTarget[]>([]);
  const lastPreviewDay = useRef<number | null>(null);
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
    onComplete?.();
  };

  const previewDay = (timestamp: number, start = selectionStart) => {
    if (start === null) return;
    if (minimumDay !== undefined && timestamp < minimumDay) return;
    if (lastPreviewDay.current === timestamp) return;
    lastPreviewDay.current = timestamp;
    onChange({
      start: Math.min(start, timestamp),
      end: Math.max(start, timestamp),
    });
  };

  const measureDayTargets = (grid: HTMLDivElement) =>
    Array.from(
      grid.querySelectorAll<HTMLButtonElement>(
        "button[data-timestamp]:not(:disabled)",
      ),
    ).map((button) => {
      const rect = button.getBoundingClientRect();
      return {
        timestamp: Number(button.dataset.timestamp),
        centerX: rect.left + rect.width / 2,
        centerY: rect.top + rect.height / 2,
      };
    });

  const nearestDay = (
    event: React.PointerEvent<HTMLDivElement>,
    targets: CalendarDayHitTarget[] = dayHitTargets.current,
  ) => {
    let nearest: { timestamp: number; distance: number } | null = null;

    targets.forEach(({ timestamp, centerX, centerY }) => {
      const dx = event.clientX - centerX;
      const dy = event.clientY - centerY;
      const distance = dx * dx + dy * dy;

      if (nearest === null || distance < nearest.distance) {
        nearest = { timestamp, distance };
      }
    });

    return nearest?.timestamp ?? null;
  };

  const dayAtPointer = (event: React.PointerEvent<HTMLDivElement>) => {
    const target = document
      .elementFromPoint(event.clientX, event.clientY)
      ?.closest<HTMLButtonElement>("button[data-timestamp]");

    if (target && event.currentTarget.contains(target)) {
      return target.disabled ? null : Number(target.dataset.timestamp);
    }

    return nearestDay(event);
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (
      !event.isPrimary ||
      (event.pointerType === "mouse" && event.button !== 0)
    ) {
      return;
    }
    const clickedDay = (event.target as HTMLElement).closest<HTMLButtonElement>(
      "button[data-timestamp]",
    );
    if (clickedDay?.disabled) return;

    const targets = measureDayTargets(event.currentTarget);
    const timestamp = clickedDay
      ? Number(clickedDay.dataset.timestamp)
      : nearestDay(event, targets);
    if (timestamp === null) return;

    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    dayHitTargets.current = targets;
    activePointerId.current = event.pointerId;
    completingSelection.current = selectionStart !== null;
    dragStart.current = timestamp;
    dragMoved.current = false;
    lastPreviewDay.current = timestamp;

    if (selectionStart === null) {
      setSelectionStart(timestamp);
      onChange({ start: timestamp, end: timestamp });
    }
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (
      activePointerId.current !== event.pointerId ||
      dragStart.current === null
    ) {
      return;
    }
    const timestamp = dayAtPointer(event);
    if (timestamp === null || timestamp === dragStart.current) return;

    dragMoved.current = true;
    if (completingSelection.current) {
      setSelectionStart(dragStart.current);
    }
    previewDay(timestamp, dragStart.current);
  };

  const finishDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    if (activePointerId.current !== event.pointerId) return;
    if (completingSelection.current) {
      if (dragMoved.current) {
        setSelectionStart(null);
        onComplete?.();
      } else if (dragStart.current !== null) {
        chooseDay(dragStart.current);
      }
    } else if (dragMoved.current) {
      setSelectionStart(null);
      onComplete?.();
    }
    completingSelection.current = false;
    dragStart.current = null;
    dragMoved.current = false;
    activePointerId.current = null;
    dayHitTargets.current = [];
    lastPreviewDay.current = null;
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
      <div
        className="stats-calendar-grid"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={finishDrag}
        onPointerCancel={finishDrag}
      >
        {calendarDays.map((day) => {
          const timestamp = startOfDay(day);
          const inMonth = day.getMonth() === calendarMonth.getMonth();
          const selected =
            range && timestamp >= range.start && timestamp <= range.end;
          const isRangeStart =
            range !== null &&
            timestamp === startOfDay(new Date(range.start));
          const isRangeEnd =
            range !== null && timestamp === startOfDay(new Date(range.end));
          const isRangeMiddle =
            Boolean(selected) && !isRangeStart && !isRangeEnd;
          const disabled = minimumDay !== undefined && timestamp < minimumDay;

          return (
            <button
              key={timestamp}
              type="button"
              data-timestamp={timestamp}
              disabled={disabled}
              aria-pressed={Boolean(selected)}
              aria-label={`${day.toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}${isRangeStart ? ", range start" : ""}${isRangeEnd ? ", range end" : ""}`}
              className={[
                inMonth ? "" : "is-muted",
                selected ? "is-selected" : "",
                isRangeStart ? "is-range-start" : "",
                isRangeEnd ? "is-range-end" : "",
                isRangeStart && isRangeEnd ? "is-range-single" : "",
                isRangeMiddle ? "is-range-middle" : "",
              ]
                .filter(Boolean)
                .join(" ")}
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
