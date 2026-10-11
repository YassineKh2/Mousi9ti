import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  deleteTaskFromSchedule,
  getDayBoundaryAfter,
  getMondayMonthWeeks,
  getTaskCompletionCounts,
  preserveTaskHistoryBefore,
  getTasksForDate,
  isTaskActiveAt,
  isTaskVisibleOnDate,
} from "./taskDates";

describe("task date visibility", () => {
  const monday = new Date(2026, 9, 12);
  const nextMonday = new Date(2026, 9, 19);
  const previousMonday = new Date(2026, 9, 5);
  const start = new Date(2026, 9, 12).getTime();
  const expiration = new Date(2026, 9, 19).getTime();
  const task = {
    id: "t-1791800000000",
    startsAt: start,
    expiresAt: expiration,
  };

  it("shows a one-week task on dates in its active week only", () => {
    assert.equal(isTaskVisibleOnDate(task, monday), true);
    assert.equal(
      isTaskVisibleOnDate(task, new Date(2026, 9, 18)),
      true,
    );
    assert.equal(isTaskVisibleOnDate(task, nextMonday), false);
    assert.equal(isTaskVisibleOnDate(task, previousMonday), false);
  });

  it("shows daily widget tasks only during their configured custom date range", () => {
    const customTask = {
      id: "custom-dates",
      text: "Practice within custom dates",
      completed: false,
      startsAt: new Date(2026, 9, 14).getTime(),
      expiresAt: new Date(2026, 9, 17, 23, 59, 59, 999).getTime(),
    };

    assert.equal(getTasksForDate([customTask], new Date(2026, 9, 13)).length, 0);
    assert.equal(getTasksForDate([customTask], new Date(2026, 9, 14)).length, 1);
    assert.equal(getTasksForDate([customTask], new Date(2026, 9, 16)).length, 1);
    assert.equal(getTasksForDate([customTask], new Date(2026, 9, 17)).length, 1);
    assert.equal(getTasksForDate([customTask], new Date(2026, 9, 18)).length, 0);
  });

  it("considers a task expired at the start of the next Monday", () => {
    assert.equal(isTaskActiveAt(task, expiration - 1), true);
    assert.equal(isTaskActiveAt(task, expiration), false);
  });

  it("does not include tasks in the widget before their start date", () => {
    const futureTask = {
      id: "future-task",
      startsAt: expiration,
    };

    assert.equal(isTaskActiveAt(futureTask, expiration - 1), false);
    assert.equal(isTaskActiveAt(futureTask, expiration), true);
  });

  it("expires a one-week task at midnight seven calendar days later", () => {
    const createdMonday = new Date(2026, 9, 12, 15, 30).getTime();
    assert.equal(getDayBoundaryAfter(createdMonday, 7), expiration);
  });

  it("limits monthly week options to five and leaves overflow days for next month", () => {
    const januaryWeeks = getMondayMonthWeeks(new Date(2022, 0, 1));
    const februaryWeeks = getMondayMonthWeeks(new Date(2022, 1, 1));

    assert.equal(januaryWeeks.length, 5);
    assert.deepEqual(
      januaryWeeks.map((week) => week.getDate()),
      [27, 3, 10, 17, 24],
    );
    assert.equal(januaryWeeks.every((week) => week.getDay() === 1), true);
    assert.equal(februaryWeeks[0].getTime(), new Date(2022, 0, 31).getTime());
  });

  it("uses legacy task IDs as creation dates when date metadata is absent", () => {
    assert.equal(
      isTaskVisibleOnDate({ id: "t-1791800000000" }, previousMonday),
      false,
    );
    assert.equal(
      isTaskVisibleOnDate({ id: "t-1791800000000" }, monday),
      true,
    );
  });

  it("keeps completion state separate for each date and counts visible tasks", () => {
    const taskWithDateCompletion = {
      id: "repeating-task",
      text: "Practice",
      completed: true,
      completedByDate: {
        "2026-10-12": true,
        "2026-10-19": false,
      },
    };

    const thisMondayTasks = getTasksForDate(
      [taskWithDateCompletion],
      monday,
    );
    const nextMondayTasks = getTasksForDate(
      [taskWithDateCompletion],
      nextMonday,
    );

    assert.equal(thisMondayTasks.length, 1);
    assert.equal(thisMondayTasks[0].completed, true);
    assert.equal(nextMondayTasks.length, 1);
    assert.equal(nextMondayTasks[0].completed, false);
  });

  it("uses that date's completion activity when no explicit state exists", () => {
    const tasks = getTasksForDate(
      [{ id: "repeating-task", text: "Practice", completed: false }],
      monday,
      [
        {
          taskId: "repeating-task",
          date: "2026-10-12",
          kind: "completed",
        },
      ],
    );

    assert.equal(tasks.length, 1);
    assert.equal(tasks[0].completed, true);
  });

  it("counts only tasks visible on a day and completed for that day", () => {
    const dailyTasks = getTasksForDate(
      [
        {
          id: "everyday",
          text: "Daily",
          completed: false,
          completedByDate: { "2026-10-12": true, "2026-10-19": false },
        },
        {
          id: "one-week",
          text: "One week",
          completed: false,
          startsAt: start,
          expiresAt: expiration,
        },
      ],
      monday,
    );
    const counts = getTaskCompletionCounts(dailyTasks);

    assert.deepEqual(counts, { total: 2, completed: 1 });
  });

  it("preserves the prior task range when a new duration ends it", () => {
    const jan1 = new Date(2026, 0, 1);
    const jan30 = new Date(2026, 0, 30);
    const feb6 = new Date(2026, 1, 6);
    const changeDate = jan30.getTime();
    const history = preserveTaskHistoryBefore(
      {
        id: "task",
        startsAt: jan1.getTime(),
      },
      changeDate,
    );
    const versionedTask = {
      id: "task",
      startsAt: changeDate,
      expiresAt: feb6.getTime(),
      visibilityHistory: history,
    };

    for (let day = 1; day < 30; day += 1) {
      assert.equal(
        isTaskVisibleOnDate(versionedTask, new Date(2026, 0, day)),
        true,
        `task should remain visible on January ${day}`,
      );
    }
    assert.equal(isTaskVisibleOnDate(versionedTask, jan30), true);
    assert.equal(isTaskVisibleOnDate(versionedTask, feb6), false);
  });

  it("keeps earlier ranges when a task duration is changed again", () => {
    const firstStart = new Date(2026, 0, 13).getTime();
    const firstChange = new Date(2026, 0, 30).getTime();
    const secondChange = new Date(2026, 1, 2).getTime();
    const priorHistory = preserveTaskHistoryBefore(
      { id: "task", startsAt: firstStart },
      firstChange,
    );
    const nextHistory = preserveTaskHistoryBefore(
      {
        id: "task",
        startsAt: firstChange,
        expiresAt: new Date(2026, 1, 6).getTime(),
        visibilityHistory: priorHistory,
      },
      secondChange,
    );

    assert.equal(nextHistory.length, 2);
    assert.equal(nextHistory[0].startsAt, firstStart);
    assert.equal(nextHistory[1].startsAt, firstChange);
    assert.equal(nextHistory[1].expiresAt, secondChange);
  });

  it("deletes a task for one date without hiding its other scheduled dates", () => {
    const schedule = [
      {
        day: "MON",
        tasks: [
          {
            id: "shared",
            text: "Shared goal",
            completed: false,
            startsAt: start,
            expiresAt: new Date(2026, 10, 1).getTime(),
          },
        ],
      },
    ];
    const updatedSchedule = deleteTaskFromSchedule(
      schedule,
      "shared",
      monday,
      "day",
    );
    const updatedTask = updatedSchedule[0].tasks[0];

    assert.equal(isTaskVisibleOnDate(updatedTask, monday), false);
    assert.equal(isTaskVisibleOnDate(updatedTask, new Date(2026, 9, 13)), true);
    assert.equal(isTaskVisibleOnDate(updatedTask, nextMonday), true);
    assert.equal("hiddenDates" in schedule[0].tasks[0], false);
  });

  it("removes every scheduled version only when deleting everywhere", () => {
    const schedule = [
      { day: "MON", tasks: [{ id: "shared", text: "Goal", completed: false }] },
      { day: "TUE", tasks: [{ id: "shared", text: "Goal", completed: false }] },
      { day: "WED", tasks: [{ id: "other", text: "Other", completed: false }] },
    ];
    const updatedSchedule = deleteTaskFromSchedule(
      schedule,
      "shared",
      monday,
      "everywhere",
    );

    assert.deepEqual(
      updatedSchedule.map((day) => day.tasks.map((task) => task.id)),
      [[], [], ["other"]],
    );
    assert.equal(schedule[0].tasks.length, 1);
  });
});
