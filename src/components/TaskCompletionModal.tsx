import React from "react";
import { CheckCircle2, X } from "lucide-react";
import { TaskCompletionBehavior } from "../types";

interface TaskCompletionModalProps {
  isOpen: boolean;
  onChoose: (behavior: TaskCompletionBehavior) => void;
  onClose: () => void;
}

export const TaskCompletionModal: React.FC<TaskCompletionModalProps> = ({
  isOpen,
  onChoose,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="task-completion-title"
    >
      <div className="w-full max-w-md rounded-xl border border-outline-variant/40 bg-surface-container p-5 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="rounded-full bg-primary/10 p-2 text-primary">
              <CheckCircle2 size={20} />
            </div>
            <div>
              <h2
                id="task-completion-title"
                className="font-mono text-sm font-bold uppercase tracking-[0.14em] text-on-surface"
              >
                Daily tasks complete
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-on-surface-variant">
                All daily tasks are complete. Choose what happens to the
                Practice Tracker.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-on-surface-variant transition-colors hover:bg-surface-container-highest hover:text-on-surface"
            aria-label="Close"
          >
            <X size={17} />
          </button>
        </div>

        <div className="mt-5 grid gap-2">
          <button
            type="button"
            onClick={() => onChoose("stop")}
            className="flex items-center justify-between rounded-lg border border-primary/40 bg-primary/10 px-3 py-2.5 text-left text-sm text-on-surface transition-colors hover:bg-primary/20"
          >
            <span>
              <strong className="block">Stop Practice Tracker</strong>
              <span className="text-xs text-on-surface-variant">
                Stop now and stop automatically when tasks are complete.
              </span>
            </span>
          </button>
          <button
            type="button"
            onClick={() => onChoose("continue")}
            className="flex items-center justify-between rounded-lg border border-outline-variant/40 px-3 py-2.5 text-left text-sm text-on-surface transition-colors hover:bg-surface-container-highest"
          >
            <span>
              <strong className="block">Keep Practice Tracker running</strong>
              <span className="text-xs text-on-surface-variant">
                Continue recording general practice after tasks finish.
              </span>
            </span>
          </button>
          <button
            type="button"
            onClick={() => onChoose("ask")}
            className="flex items-center justify-between rounded-lg border border-outline-variant/40 px-3 py-2.5 text-left text-sm text-on-surface transition-colors hover:bg-surface-container-highest"
          >
            <span>
              <strong className="block">Ask me next time</strong>
              <span className="text-xs text-on-surface-variant">
                Keep running now and show this choice again next time.
              </span>
            </span>
          </button>
        </div>

        <p className="mt-4 text-center text-[11px] text-on-surface-variant">
          You can change this preference later in Settings.
        </p>
      </div>
    </div>
  );
};
