import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  Check,
  Clock3,
  Coffee,
  ListChecks,
  X,
} from "lucide-react";
import { PracticeTask } from "../types";
import {
  formatDurationLabel,
  MENTION_REGEX,
  parseParams,
} from "../utils/taskMentions";
import { getTaskDurationSeconds } from "../lib/storage";

interface SessionReviewModalProps {
  isOpen: boolean;
  globalDurationSeconds: number;
  tasks: PracticeTask[];
  attributedSeconds: Record<string, number>;
  onSave: (durations: Record<string, number>) => void;
  onClose: () => void;
}

const formatDuration = (seconds: number) => {
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${minutes}m ${remainder.toString().padStart(2, "0")}s`;
};

const renderTaskLabel = (task: PracticeTask) => {
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  MENTION_REGEX.lastIndex = 0;

  while ((match = MENTION_REGEX.exec(task.text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(
        <React.Fragment key={`text-${lastIndex}`}>
          {task.text.slice(lastIndex, match.index)}
        </React.Fragment>,
      );
    }

    const tool = match[2].toLowerCase();
    const params = match[3] || "";
    const parsed = parseParams(tool, params) as Record<string, string | number>;
    const label =
      tool === "metronome" || tool === "bpm"
        ? `${parsed.bpm} BPM · ${parsed.signature}`
        : tool === "scale"
          ? parsed.label || `${parsed.root} ${parsed.type}`
          : tool === "chord"
            ? parsed.label || `${parsed.root} ${parsed.type}`
            : tool === "timer"
              ? formatDurationLabel(Number(parsed.minutes))
              : tool === "time"
                ? formatDurationLabel(Number(parsed.minutes))
                : tool === "custom"
                  ? parsed.text || "Custom"
                  : tool === "tuning"
                    ? parsed.tuning || "Tuning"
                    : tool === "key"
                      ? parsed.key || "Key"
                      : tool === "technique"
                        ? parsed.technique || "Technique"
                        : tool === "exercise"
                          ? parsed.exercise || "Exercise"
                          : params;

    parts.push(
      <span
        key={`mention-${match.index}`}
        className="mx-0.5 inline-flex items-center rounded bg-surface-container-high px-1.5 py-0.5 align-middle font-mono text-[11px] font-bold text-on-surface"
      >
        {label}
      </span>,
    );
    lastIndex = MENTION_REGEX.lastIndex;
  }

  if (lastIndex < task.text.length) {
    parts.push(
      <React.Fragment key={`text-${lastIndex}`}>
        {task.text.slice(lastIndex)}
      </React.Fragment>,
    );
  }

  return parts;
};

export const SessionReviewModal: React.FC<SessionReviewModalProps> = ({
  isOpen,
  globalDurationSeconds,
  tasks,
  attributedSeconds,
  onSave,
  onClose,
}) => {
  const initialDurations = useMemo(
    () =>
      Object.fromEntries(
        tasks.map((task) => {
          const seconds = Math.max(
            0,
            Math.round(
              attributedSeconds[task.id] ?? getTaskDurationSeconds(task.text),
            ),
          );
          return [
            task.id,
            {
              minutes: String(Math.floor(seconds / 60)),
              seconds: String(seconds % 60),
            },
          ];
        }),
      ),
    [attributedSeconds, tasks],
  );
  const [durations, setDurations] =
    useState<Record<string, { minutes: string; seconds: string }>>(
      initialDurations,
    );
  const initializedInputs = useRef(new Set<string>());

  useEffect(() => {
    setDurations(initialDurations);
  }, [initialDurations]);

  if (!isOpen) return null;

  const assignedSeconds = Object.values(durations).reduce<number>(
    (total, duration) =>
      total +
      (Number(duration.minutes) || 0) * 60 +
      (Number(duration.seconds) || 0),
    0,
  );
  const unassignedSeconds = Math.max(
    0,
    globalDurationSeconds - assignedSeconds,
  );
  const differenceSeconds = assignedSeconds - globalDurationSeconds;
  const taskShare =
    globalDurationSeconds > 0
      ? Math.min(100, (assignedSeconds / globalDurationSeconds) * 100)
      : 0;

  return (
    <div
      className="fixed inset-0 z-100 flex items-center justify-center bg-black/60 p-3 backdrop-blur-sm sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="session-review-title"
    >
      <div className="flex max-h-[90dvh] w-full max-w-2xl flex-col overflow-hidden rounded-lg border border-outline-variant/40 bg-surface-container font-mono shadow-2xl">
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-outline-variant/25 px-5 py-5 sm:px-7">
          <div>
            <h2
              id="session-review-title"
              className="font-mono text-base font-bold text-on-surface"
            >
              Review practice session
            </h2>
            <p className="mt-1 text-sm text-on-surface-variant">
              A little structure. Room for general practice.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded text-on-surface-variant hover:bg-surface-container-highest hover:text-on-surface"
            aria-label="Close review"
            title="Close review"
          >
            <X size={17} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          <section
            aria-label="Session time breakdown"
            className="border-b border-outline-variant/25 bg-surface-container-low px-5 py-5 sm:px-7 sm:py-6"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-sm font-medium text-on-surface-variant">
                <Clock3 size={16} aria-hidden="true" />
                Full session <span className="text-xs">(global timer)</span>
              </div>
              <strong className="font-mono text-2xl tabular-nums text-on-surface">
                {formatDuration(globalDurationSeconds)}
              </strong>
            </div>
            <div
              className="mt-5 flex h-2.5 overflow-hidden rounded-sm bg-secondary/25"
              role="img"
              aria-label={`${formatDuration(assignedSeconds)} assigned to tasks; ${formatDuration(unassignedSeconds)} general practice`}
            >
              <div
                className="h-full bg-primary transition-[width] duration-200"
                style={{ width: `${taskShare}%` }}
              />
            </div>
            <div className="mt-4 grid grid-cols-2 gap-5">
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-xs font-medium text-on-surface-variant">
                  <ListChecks
                    size={15}
                    className="shrink-0 text-primary"
                    aria-hidden="true"
                  />
                  Assigned to tasks
                </div>
                <strong className="mt-1.5 block break-all font-mono text-lg tabular-nums text-primary">
                  {formatDuration(assignedSeconds)}
                </strong>
              </div>
              <div className="min-w-0 border-l border-outline-variant/30 pl-5">
                <div className="flex items-center gap-2 text-xs font-medium text-on-surface-variant">
                  <Coffee
                    size={15}
                    className="shrink-0 text-secondary"
                    aria-hidden="true"
                  />
                  General practice
                </div>
                <strong className="mt-1.5 block break-all font-mono text-lg tabular-nums text-secondary">
                  {formatDuration(unassignedSeconds)}
                </strong>
              </div>
            </div>
            <p className="mt-4 text-xs leading-relaxed text-on-surface-variant">
              You can leave time for general practice. Any session time not
              assigned to a task stays in your full session total.
            </p>
          </section>

          <section
            aria-labelledby="session-tasks-title"
            className="px-5 py-5 sm:px-7"
          >
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <h3
                id="session-tasks-title"
                className="text-sm font-semibold text-on-surface"
              >
                Task time
              </h3>
              <span className="font-mono text-xs text-on-surface-variant">
                {tasks.length} {tasks.length === 1 ? "task" : "tasks"}
              </span>
            </div>
            <div className="divide-y divide-outline-variant/20">
              {tasks.length === 0 ? (
                <p className="py-5 text-sm text-on-surface-variant">
                  No tasks in this session. All of your time counts as general
                  practice.
                </p>
              ) : (
                tasks.map((task) => (
                  <div
                    key={task.id}
                    className="grid grid-cols-1 items-center gap-3 py-4 first:pt-0 last:pb-0 sm:grid-cols-[minmax(0,1fr)_auto] sm:gap-5"
                  >
                    <span className="min-w-0 break-words text-sm leading-relaxed text-on-surface">
                      {renderTaskLabel(task)}
                    </span>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className="mr-auto text-xs text-on-surface-variant sm:hidden">
                        Recorded time
                      </span>
                      {(["minutes", "seconds"] as const).map((unit) => (
                        <label
                          key={unit}
                          className="inline-flex items-center gap-1"
                        >
                          <input
                            type="text"
                            inputMode="numeric"
                            value={durations[task.id]?.[unit] ?? "0"}
                            onFocus={(event) => {
                              const inputId = `${task.id}-${unit}`;
                              if (initializedInputs.current.has(inputId))
                                return;
                              initializedInputs.current.add(inputId);
                              const input = event.currentTarget;
                              requestAnimationFrame(() => {
                                input.setSelectionRange(
                                  input.value.length,
                                  input.value.length,
                                );
                              });
                            }}
                            onKeyDown={(event) => {
                              if (
                                event.key.length === 1 &&
                                !/[0-9]/.test(event.key) &&
                                !event.ctrlKey &&
                                !event.metaKey
                              ) {
                                event.preventDefault();
                              }
                            }}
                            onChange={(event) =>
                              setDurations((current) => ({
                                ...current,
                                [task.id]: {
                                  ...current[task.id],
                                  [unit]: event.target.value.replace(/\D/g, ""),
                                },
                              }))
                            }
                            className="h-10 w-14 rounded border border-outline-variant/40 bg-surface-container-lowest px-2 py-1 text-right font-mono text-sm tabular-nums text-on-surface outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                            aria-label={`Recorded ${unit} for ${task.text}`}
                          />
                          <span className="text-xs text-on-surface-variant">
                            {unit === "minutes" ? "min" : "sec"}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
          {differenceSeconds > 0 && (
            <div
              role="status"
              className="mx-5 mb-5 flex items-start gap-2 rounded border border-amber-500/30 bg-amber-500/10 p-3 text-xs leading-relaxed text-on-surface sm:mx-7"
            >
              <AlertTriangle
                size={16}
                className="shrink-0 text-amber-500"
                aria-hidden="true"
              />
              <span>
                Task time exceeds the full session by{" "}
                {formatDuration(differenceSeconds)}. The global session total
                will stay unchanged.
              </span>
            </div>
          )}
        </div>

        <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-outline-variant/25 bg-surface-container-low px-5 py-4 sm:px-7">
          <span className="flex items-center gap-2 text-xs text-on-surface-variant">
            <Clock3 size={14} aria-hidden="true" />
            Full session total stays unchanged
          </span>
          <button
            type="button"
            onClick={() => {
              onSave(
                Object.fromEntries(
                  Object.entries(durations).map(([taskId, duration]) => [
                    taskId,
                    (Number(duration.minutes) || 0) * 60 +
                      (Number(duration.seconds) || 0),
                  ]),
                ),
              );
              onClose();
            }}
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded bg-primary px-4 py-2 text-sm font-semibold text-on-primary transition-colors hover:bg-primary/90"
          >
            <Check size={14} />
            Save &amp; finish session
          </button>
        </div>
      </div>
    </div>
  );
};
