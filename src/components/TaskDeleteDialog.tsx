import React, { useState } from "react";
import { AlertTriangle, X } from "lucide-react";
import { formatDurationLabel, parseParams } from "../utils/taskMentions";

type DeleteScope = "day" | "everywhere";

const TASK_MENTION_REGEX =
  /(@(custom|tuning|key|technique|bpm|exercise|metronome|scale|chord|timer|time|random)(?:\(([^)]*)\))?)/gi;

interface TaskDeleteDialogProps {
  taskName: string;
  onConfirm: (scope: DeleteScope) => void;
  onCancel: () => void;
}

export const TaskDeleteDialog: React.FC<TaskDeleteDialogProps> = ({
  taskName,
  onConfirm,
  onCancel,
}) => {
  const [scope, setScope] = useState<DeleteScope | null>(null);

  const renderTaskName = () => {
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;
    TASK_MENTION_REGEX.lastIndex = 0;

    while ((match = TASK_MENTION_REGEX.exec(taskName)) !== null) {
      if (match.index > lastIndex) {
        parts.push(
          <span key={`text-${lastIndex}`}>
            {taskName.slice(lastIndex, match.index)}
          </span>,
        );
      }

      const tool = match[2].toLowerCase();
      const params = match[3] || "";
      const parsed = parseParams(tool, params);
      let label = tool;

      if (tool === "metronome")
        label = `${parsed.bpm} BPM · ${parsed.signature}`;
      else if (tool === "scale")
        label = parsed.label || `${parsed.root} ${parsed.type}`;
      else if (tool === "chord")
        label = parsed.label || `${parsed.root} ${parsed.type}`;
      else if (tool === "timer" || tool === "time") {
        label = formatDurationLabel(parsed.minutes);
      } else if (tool === "custom") label = parsed.text || "Custom";
      else if (tool === "tuning") label = parsed.tuning || "Tuning";
      else if (tool === "key") label = parsed.key || "Key";
      else if (tool === "technique") label = parsed.technique || "Technique";
      else if (tool === "bpm")
        label = `${parsed.bpm} BPM · ${parsed.signature}`;
      else if (tool === "exercise") label = parsed.exercise || "Exercise";
      else if (tool === "random") {
        const modeLabels: Record<string, string> = {
          both: "all notes",
          sharps: "sharp notes",
          flats: "flat notes",
          naturals: "natural notes",
        };
        label = `random (${modeLabels[parsed.accidentalMode] || "all notes"})${parsed.autoAdvance ? ` · auto advance for ${parsed.interval}` : ""}`;
      }

      parts.push(
        <span
          key={`mention-${match.index}`}
          className="mx-0.5 inline-flex max-w-full min-w-0 items-center whitespace-normal break-words rounded border border-outline-variant/40 bg-surface-container-high px-1.5 py-0.5 align-middle font-mono text-[11px] font-bold text-on-surface-variant"
        >
          {label}
        </span>,
      );
      lastIndex = TASK_MENTION_REGEX.lastIndex;
    }

    if (lastIndex < taskName.length) {
      parts.push(
        <span key={`text-${lastIndex}`}>{taskName.slice(lastIndex)}</span>,
      );
    }

    return parts;
  };

  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center bg-black/70 p-4 font-mono backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-task-dialog-title"
    >
      <div className="w-full max-w-md rounded-xl border border-outline-variant/30 bg-surface p-5 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="rounded-full bg-error/10 p-2 text-error">
              <AlertTriangle size={20} />
            </div>
            <div>
              <h2
                id="delete-task-dialog-title"
                className="font-mono text-sm font-bold uppercase tracking-[0.14em] text-on-surface"
              >
                Delete task?
              </h2>
              <p className="mt-2 break-words text-sm leading-relaxed text-on-surface-variant">
                Choose where to delete “{renderTaskName()}”.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="rounded p-1 text-on-surface-variant transition-colors hover:bg-surface-container-highest hover:text-on-surface"
            aria-label="Close"
          >
            <X size={17} />
          </button>
        </div>

        <div className="mt-5 grid gap-2">
          <button
            type="button"
            onClick={() => setScope("day")}
            aria-pressed={scope === "day"}
            className={`flex items-center justify-between rounded-lg border px-3 py-2.5 text-left text-sm text-on-surface transition-colors ${
              scope === "day"
                ? "border-primary/40 bg-primary/10"
                : "border-outline-variant/40 hover:bg-surface-container-highest"
            }`}
          >
            <span>
              <strong className="block">Only this day</strong>
              <span className="text-xs text-on-surface-variant">
                Keep the task on its other dates.
              </span>
            </span>
            <span
              aria-hidden="true"
              className={`ml-3 h-4 w-4 rounded-full border ${
                scope === "day"
                  ? "border-primary bg-primary ring-2 ring-primary/20"
                  : "border-outline-variant"
              }`}
            />
          </button>
          <button
            type="button"
            onClick={() => setScope("everywhere")}
            aria-pressed={scope === "everywhere"}
            className={`flex items-center justify-between rounded-lg border px-3 py-2.5 text-left text-sm text-on-surface transition-colors ${
              scope === "everywhere"
                ? "border-error/50 bg-error/10"
                : "border-outline-variant/40 hover:bg-surface-container-highest"
            }`}
          >
            <span>
              <strong className="block">Everywhere</strong>
              <span className="text-xs text-on-surface-variant">
                Remove all scheduled versions of this task.
              </span>
            </span>
            <span
              aria-hidden="true"
              className={`ml-3 h-4 w-4 rounded-full border ${
                scope === "everywhere"
                  ? "border-error bg-error ring-2 ring-error/20"
                  : "border-outline-variant"
              }`}
            />
          </button>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-outline-variant/40 px-3 py-2 text-sm text-on-surface transition-colors hover:bg-surface-container-highest"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => scope && onConfirm(scope)}
            disabled={!scope}
            className="rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Confirm delete
          </button>
        </div>
      </div>
    </div>
  );
};
