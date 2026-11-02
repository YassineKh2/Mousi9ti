import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  decideTimerSessionSync,
  TimerSessionSyncState,
} from "./timerSessionSync";

const state = (
  status: TimerSessionSyncState["status"],
  overrides: Partial<TimerSessionSyncState> = {},
): TimerSessionSyncState => ({
  status,
  enabled: true,
  taskSystemActive: false,
  ...overrides,
});

describe("decideTimerSessionSync", () => {
  it("starts the practice tracker when a standalone timer starts", () => {
    const decision = decideTimerSessionSync({
      current: state("running"),
      previous: state("idle"),
      taskManagedTimer: false,
    });

    assert.equal(decision.action, "resume");
  });

  it("pauses the practice tracker when a standalone timer is paused or stopped", () => {
    for (const status of ["paused", "idle", "finished"] as const) {
      const decision = decideTimerSessionSync({
        current: state(status),
        previous: state("running"),
        taskManagedTimer: false,
      });

      assert.equal(decision.action, "pause", `status ${status}`);
    }
  });

  it("does not start or pause the practice tracker for an active task timer", () => {
    for (const status of ["running", "paused", "finished"] as const) {
      const decision = decideTimerSessionSync({
        current: state(status, { taskSystemActive: true }),
        previous: state("idle"),
        taskManagedTimer: false,
      });

      assert.equal(decision.action, null, `status ${status}`);
    }
  });

  it("keeps a task-managed timer excluded after its task is deactivated", () => {
    const running = decideTimerSessionSync({
      current: state("running", { taskSystemActive: true }),
      previous: state("idle"),
      taskManagedTimer: false,
    });
    assert.equal(running.action, null);
    assert.equal(running.taskManagedTimer, true);

    const finished = decideTimerSessionSync({
      current: state("finished"),
      previous: state("running", { taskSystemActive: false }),
      taskManagedTimer: running.taskManagedTimer,
    });
    assert.equal(finished.action, null);
    assert.equal(finished.taskManagedTimer, false);
  });

  it("does not affect the practice tracker when task mode is entered during a timer", () => {
    const decision = decideTimerSessionSync({
      current: state("running", { taskSystemActive: true }),
      previous: state("running"),
      taskManagedTimer: false,
    });

    assert.equal(decision.action, null);
    assert.equal(decision.taskManagedTimer, true);
  });

  it("does not react to a task timer becoming idle after its task is deactivated", () => {
    const decision = decideTimerSessionSync({
      current: state("idle"),
      previous: state("running", { taskSystemActive: true }),
      taskManagedTimer: true,
    });

    assert.equal(decision.action, null);
    assert.equal(decision.taskManagedTimer, false);
  });

  it("keeps synced timer behavior unchanged when tasks are not active", () => {
    const started = decideTimerSessionSync({
      current: state("running"),
      previous: state("idle"),
      taskManagedTimer: false,
    });
    const paused = decideTimerSessionSync({
      current: state("paused"),
      previous: state("running"),
      taskManagedTimer: started.taskManagedTimer,
    });

    assert.equal(started.action, "resume");
    assert.equal(paused.action, "pause");
  });
});
