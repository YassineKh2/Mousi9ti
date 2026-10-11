import React, { useState } from "react";
import { AlertTriangle, X } from "lucide-react";

type DeleteScope = "day" | "everywhere";

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

  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
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
                Choose where to delete “{taskName}”.
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
