export type SyncedTimerStatus = "idle" | "running" | "paused" | "finished";
export type TimerSessionSyncAction = "resume" | "pause" | null;

export interface TimerSessionSyncState {
  status: SyncedTimerStatus;
  enabled: boolean;
  taskSystemActive: boolean;
}

interface TimerSessionSyncDecisionInput {
  current: TimerSessionSyncState;
  previous: TimerSessionSyncState | null;
  taskManagedTimer: boolean;
}

interface TimerSessionSyncDecision {
  action: TimerSessionSyncAction;
  taskManagedTimer: boolean;
}

export const decideTimerSessionSync = ({
  current,
  previous,
  taskManagedTimer,
}: TimerSessionSyncDecisionInput): TimerSessionSyncDecision => {
  let nextTaskManagedTimer = taskManagedTimer;
  if (
    current.taskSystemActive &&
    current.status !== "idle" &&
    current.status !== "finished"
  ) {
    nextTaskManagedTimer = true;
  }

  if (
    !current.enabled ||
    current.taskSystemActive ||
    previous?.taskSystemActive ||
    nextTaskManagedTimer
  ) {
    if (current.status === "idle" || current.status === "finished") {
      nextTaskManagedTimer = false;
    }
    return { action: null, taskManagedTimer: nextTaskManagedTimer };
  }

  if (!previous) {
    return {
      action:
        current.status === "finished"
          ? "pause"
          : current.status === "running"
            ? "resume"
            : null,
      taskManagedTimer: nextTaskManagedTimer,
    };
  }

  if (current.status === "running") {
    return {
      action:
        !previous.enabled || previous.status !== "running" ? "resume" : null,
      taskManagedTimer: nextTaskManagedTimer,
    };
  }

  if (
    previous.enabled &&
    previous.status !== current.status &&
    (previous.status === "running" || previous.status === "paused")
  ) {
    return { action: "pause", taskManagedTimer: nextTaskManagedTimer };
  }

  return { action: null, taskManagedTimer: nextTaskManagedTimer };
};
