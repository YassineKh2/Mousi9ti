import React, { useEffect, useMemo, useRef, useState } from "react";
import { Check, X } from "lucide-react";
import { PracticeTask } from "../types";
import { MENTION_REGEX, parseParams } from "../utils/taskMentions";
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
      tool === "metronome"
        ? `${parsed.bpm} BPM`
        : tool === "scale"
          ? parsed.label || `${parsed.root} ${parsed.type}`
          : tool === "chord"
            ? parsed.label || `${parsed.root} ${parsed.type}`
            : tool === "timer"
              ? `${parsed.minutes}m`
              : tool === "time"
                ? `${parsed.minutes}m`
                : tool === "custom"
                  ? parsed.text || "Custom"
                  : tool === "tuning"
                    ? parsed.tuning || "Tuning"
                    : tool === "key"
                      ? parsed.key || "Key"
                      : tool === "technique"
                        ? parsed.technique || "Technique"
                        : tool === "bpm"
                          ? `${parsed.bpm} BPM`
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
        tasks.map((task) => [
          task.id,
          String(
            Math.ceil(
              (attributedSeconds[task.id] ||
                getTaskDurationSeconds(task.text) ||
                0) / 60,
            ),
          ),
        ]),
      ),
    [attributedSeconds, tasks],
  );
  const [durations, setDurations] =
    useState<Record<string, string>>(initialDurations);
  const initializedInputs = useRef(new Set<string>());

  useEffect(() => {
    setDurations(initialDurations);
  }, [initialDurations]);

  if (!isOpen) return null;

  const assignedSeconds = Object.values(durations).reduce<number>(
    (total, minutes) => total + Math.max(0, Number(minutes) || 0) * 60,
    0,
  );
  const unassignedSeconds = Math.max(
    0,
    globalDurationSeconds - assignedSeconds,
  );
  const differenceSeconds = assignedSeconds - globalDurationSeconds;

  return (
    <div
      className="fixed inset-0 z-100 flex items-center justify-center bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="session-review-title"
    >
      <div className="w-full max-w-lg rounded-xl border border-outline-variant/40 bg-surface-container p-5 shadow-2xl">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h2
              id="session-review-title"
              className="font-mono text-sm font-bold uppercase tracking-[0.16em] text-on-surface"
            >
              Review practice session
            </h2>
            <p className="mt-1 text-xs text-on-surface-variant">
              Task times were calculated automatically based on the global timer
              and the time each task was active.
            </p>
            <p className="mt-1 text-[11px] text-on-surface-variant">
              Review or edit them before saving. The global timer remains
              separate from task-attributed time.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-on-surface-variant hover:bg-surface-container-highest hover:text-on-surface"
            aria-label="Close review"
          >
            <X size={17} />
          </button>
        </div>

        <div className="mb-4 grid grid-cols-2 gap-2 text-sm">
          <div className="rounded border border-outline-variant/30 bg-surface-container-low p-3">
            <div className="text-[10px] uppercase tracking-wider text-on-surface-variant">
              Global timer
            </div>
            <div className="mt-1 font-mono font-bold text-primary">
              {formatDuration(globalDurationSeconds)}
            </div>
          </div>
          <div className="rounded border border-outline-variant/30 bg-surface-container-low p-3">
            <div className="text-[10px] uppercase tracking-wider text-on-surface-variant">
              Unassigned
            </div>
            <div className="mt-1 font-mono font-bold text-on-surface">
              {formatDuration(unassignedSeconds)}
            </div>
          </div>
        </div>

        <div className="max-h-[45vh] space-y-2 overflow-y-auto pr-1">
          {tasks.length === 0 ? (
            <p className="py-4 text-center text-sm text-on-surface-variant">
              No tasks were involved in this session.
            </p>
          ) : (
            tasks.map((task) => (
              <label
                key={task.id}
                className="flex items-center gap-3 rounded border border-outline-variant/30 bg-surface-container-low p-3"
              >
                <span className="min-w-0 flex-1 text-sm text-on-surface">
                  {renderTaskLabel(task)}
                </span>
                <span className="text-[10px] text-on-surface-variant">
                  Recorded
                </span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={durations[task.id] ?? 0}
                  onFocus={(event) => {
                    if (initializedInputs.current.has(task.id)) return;
                    initializedInputs.current.add(task.id);
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
                      [task.id]: event.target.value.replace(/\D/g, ""),
                    }))
                  }
                  className="w-16 rounded border border-outline-variant/40 bg-surface-container-lowest px-2 py-1 text-right font-mono text-sm text-on-surface [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                  aria-label={`Recorded minutes for ${task.text}`}
                />
                <span className="text-xs text-on-surface-variant">min</span>
              </label>
            ))
          )}
        </div>

        <div className="mt-4 flex items-center justify-between border-t border-outline-variant/20 pt-4">
          <span className="text-xs text-on-surface-variant">
            Task total:{" "}
            <strong className="text-on-surface">
              {formatDuration(assignedSeconds)}
            </strong>
          </span>
          {differenceSeconds !== 0 && (
            <span className="text-[10px] text-on-surface-variant">
              {differenceSeconds > 0
                ? "Task time is higher than the global timer."
                : "Some global time remains unassigned."}
            </span>
          )}
          <button
            type="button"
            onClick={() => {
              onSave(
                Object.fromEntries(
                  Object.entries(durations).map(([taskId, minutes]) => [
                    taskId,
                    Number(minutes) || 0,
                  ]),
                ),
              );
              onClose();
            }}
            className="inline-flex items-center gap-2 rounded bg-primary px-3 py-2 text-xs font-bold text-on-primary hover:bg-primary/90"
          >
            <Check size={14} />
            Save changes
          </button>
        </div>
      </div>
    </div>
  );
};
