import assert from "node:assert/strict";
import { it } from "node:test";
import {
  applyTaskDurationRange,
  getTaskExpiration,
  getTaskRenewalExpiration,
  validateCustomWeekDuration,
} from "./taskDuration";
import {
  getDayBoundaryAfter,
  getTaskDateKey,
  getTasksForDate,
  isTaskVisibleOnDate,
} from "./taskDates";
import type { PracticeTask } from "../types";

const transitionDurations = [
  "week",
  "month",
  "year",
  "forever",
  "1",
  "4",
] as const;

it("replaces a future period from the renewal day without retaining the superseded future range", () => {
  const createdAt = new Date(2026, 0, 1).getTime();
  const renewedAt = new Date(2026, 9, 30).getTime();
  const updated = applyTaskDurationRange(
    {
      id: `t-${createdAt}`,
      createdAt,
      startsAt: new Date(2027, 0, 1).getTime(),
      expiresAt: new Date(2027, 1, 1).getTime(),
      text: "Future task",
      completed: false,
    },
    {
      startsAt: renewedAt,
      expiresAt: getTaskRenewalExpiration("week", renewedAt),
    },
  );
  assert.equal(updated.createdAt, createdAt);
  assert.equal(isTaskVisibleOnDate(updated, new Date(2026, 9, 29)), false);
  assert.equal(isTaskVisibleOnDate(updated, new Date(2026, 9, 30)), true);
  assert.equal(isTaskVisibleOnDate(updated, new Date(2027, 0, 1)), false);
});

it("supports every task weekday and rejects a renewal with all eligible dates hidden", () => {
  const startsAt = new Date(2026, 9, 30).getTime();
  for (let weekday = 0; weekday < 7; weekday += 1) {
    const { range } = validateCustomWeekDuration(startsAt, "1", weekday);
    assert.ok(range);
    const firstOccurrence = new Date(startsAt);
    firstOccurrence.setDate(
      firstOccurrence.getDate() +
        ((weekday - firstOccurrence.getDay() + 7) % 7),
    );
    const hiddenDates = [getTaskDateKey(firstOccurrence)];
    assert.equal(
      validateCustomWeekDuration(startsAt, "1", weekday, hiddenDates).range,
      null,
    );
    assert.ok(
      validateCustomWeekDuration(startsAt, "2", weekday, hiddenDates).range,
    );
  }
});

for (const [label, offsets] of [
  ["successive changes", [0, 10, 20]],
  ["same-day changes", [0, 0, 0]],
  ["renewals after expiration", [0, 40, 80]],
] as const) {
  it(`preserves the date-by-date schedule across all duration combinations: ${label}`, () => {
    const createdAt = new Date(2026, 0, 1, 15, 30).getTime();
    const origin = getDayBoundaryAfter(createdAt, 0);
    const hiddenDates = [2, 15, 85].map((offset) =>
      getTaskDateKey(new Date(getDayBoundaryAfter(origin, offset))),
    );

    for (const first of transitionDurations) {
      for (const second of transitionDurations) {
        for (const third of transitionDurations) {
          let task: PracticeTask = {
            id: `t-${createdAt}`,
            createdAt,
            startsAt: origin,
            text: "Practice",
            completed: false,
            completedByDate: { "2026-01-01": true },
            hiddenDates,
          };
          let expected = Array.from(
            { length: 460 },
            (_, offset) =>
              offset > 0 &&
              !hiddenDates.includes(
                getTaskDateKey(
                  new Date(getDayBoundaryAfter(origin, offset - 1)),
                ),
              ),
          );

          for (const [index, duration] of [first, second, third].entries()) {
            const startsAt = getDayBoundaryAfter(origin, offsets[index]);
            const range =
              duration === "1" || duration === "4"
                ? validateCustomWeekDuration(startsAt, duration).range!
                : {
                    startsAt,
                    expiresAt: getTaskRenewalExpiration(duration, startsAt),
                  };
            const previous = JSON.stringify(task);
            const updated = applyTaskDurationRange(task, range);
            assert.equal(
              JSON.stringify(task),
              previous,
              "must not mutate the old task",
            );
            task = JSON.parse(JSON.stringify(updated));
            assert.equal(task.createdAt, createdAt);
            assert.deepEqual(task.completedByDate, { "2026-01-01": true });
            assert.deepEqual(task.hiddenDates, hiddenDates);

            expected = expected.map((wasVisible, offset) => {
              const date = new Date(getDayBoundaryAfter(origin, offset - 1));
              if (date.getTime() < startsAt) return wasVisible;
              return (
                (range.expiresAt === undefined ||
                  date.getTime() < range.expiresAt) &&
                !hiddenDates.includes(getTaskDateKey(date))
              );
            });
            for (const [offset, visible] of expected.entries()) {
              const date = new Date(getDayBoundaryAfter(origin, offset - 1));
              assert.equal(
                isTaskVisibleOnDate(task, date),
                visible,
                `${first} -> ${second} -> ${third}, change ${index}, ${getTaskDateKey(date)}`,
              );
            }
          }
        }
      }
    }
  });
}

for (const weeks of [1, 2, 4, 12, 52, 999]) {
  it(`gives an existing task ${weeks} full weeks regardless of its prior duration`, () => {
    const createdAt = new Date(2026, 0, 1).getTime();
    const changedAt = new Date(2026, 9, 30).getTime();
    const { range } = validateCustomWeekDuration(changedAt, String(weeks));
    assert.ok(range);
    const expectedEnd = new Date(changedAt);
    expectedEnd.setDate(expectedEnd.getDate() + weeks * 7);

    for (const previousExpiration of [
      undefined,
      new Date(2026, 10, 15).getTime(),
    ]) {
      const task = {
        id: `t-${createdAt}`,
        createdAt,
        startsAt: createdAt,
        expiresAt: previousExpiration,
        text: "Practice",
        completed: false,
      };
      const updated = applyTaskDurationRange(task, range);
      assert.equal(updated.createdAt, createdAt);
      assert.equal(updated.expiresAt, expectedEnd.getTime());
      assert.equal(isTaskVisibleOnDate(updated, new Date(2026, 5, 1)), true);
      assert.equal(
        isTaskVisibleOnDate(updated, new Date(expectedEnd.getTime() - 1)),
        true,
      );
      assert.equal(isTaskVisibleOnDate(updated, expectedEnd), false);
    }
  });
}

for (const [period, start, end] of [
  ["week", new Date(2026, 9, 30), new Date(2026, 10, 6)],
  ["month", new Date(2026, 9, 30), new Date(2026, 10, 30)],
  ["year", new Date(2026, 9, 30), new Date(2027, 9, 30)],
  ["month", new Date(2026, 0, 31), new Date(2026, 1, 28)],
  ["year", new Date(2028, 1, 29), new Date(2029, 1, 28)],
] as const) {
  it(`renews ${period} from ${start.toDateString()} for a full calendar period`, () => {
    const createdAt = new Date(2025, 0, 1).getTime();
    const updated = applyTaskDurationRange(
      {
        id: `t-${createdAt}`,
        createdAt,
        startsAt: createdAt,
        text: "Practice",
        completed: false,
      },
      {
        startsAt: start.getTime(),
        expiresAt: getTaskRenewalExpiration(period, start.getTime()),
      },
    );
    assert.equal(updated.createdAt, createdAt);
    assert.equal(updated.expiresAt, end.getTime());
    assert.equal(
      isTaskVisibleOnDate(updated, new Date(end.getTime() - 1)),
      true,
    );
    assert.equal(isTaskVisibleOnDate(updated, end), false);
  });
}

it("removes expiration when an existing task is changed to indefinite", () => {
  const createdAt = new Date(2026, 0, 1).getTime();
  const updated = applyTaskDurationRange(
    {
      id: `t-${createdAt}`,
      createdAt,
      startsAt: createdAt,
      expiresAt: new Date(2026, 10, 1).getTime(),
      text: "Practice",
      completed: false,
    },
    {
      startsAt: new Date(2026, 9, 30).getTime(),
      expiresAt: getTaskRenewalExpiration("forever"),
    },
  );
  assert.equal(updated.createdAt, createdAt);
  assert.equal(updated.expiresAt, undefined);
  assert.equal(isTaskVisibleOnDate(updated, new Date(2030, 0, 1)), true);
});

it("gives an indefinite task four full weeks from the duration change", () => {
  const createdAt = new Date(2026, 4, 21, 15, 30).getTime();
  const changedAt = new Date(2026, 9, 30, 12).getTime();
  const { range } = validateCustomWeekDuration(changedAt, "4");
  assert.ok(range);
  const updated = applyTaskDurationRange(
    {
      id: `t-${createdAt}`,
      createdAt,
      startsAt: createdAt,
      text: "Practice",
      completed: false,
    },
    range,
  );

  assert.equal(updated.createdAt, createdAt);
  assert.equal(updated.expiresAt, new Date(2026, 10, 27).getTime());
  assert.equal(isTaskVisibleOnDate(updated, new Date(2026, 4, 20)), false);
  assert.equal(isTaskVisibleOnDate(updated, new Date(2026, 4, 21)), true);
  assert.equal(isTaskVisibleOnDate(updated, new Date(2026, 7, 1)), true);
  assert.equal(isTaskVisibleOnDate(updated, new Date(2026, 10, 26)), true);
  assert.equal(isTaskVisibleOnDate(updated, new Date(2026, 10, 27)), false);

  const { range: nextRange } = validateCustomWeekDuration(
    new Date(2026, 10, 13).getTime(),
    "4",
  );
  assert.ok(nextRange);
  const extended = applyTaskDurationRange(updated, nextRange);
  assert.equal(extended.createdAt, createdAt);
  assert.equal(extended.expiresAt, new Date(2026, 11, 11).getTime());
  assert.equal(isTaskVisibleOnDate(extended, new Date(2026, 7, 1)), true);
  assert.equal(isTaskVisibleOnDate(extended, new Date(2026, 11, 10)), true);
  assert.equal(isTaskVisibleOnDate(extended, new Date(2026, 11, 11)), false);
});

it("includes the following Monday in one week starting Tuesday", () => {
  const { range, error } = validateCustomWeekDuration(
    new Date(2026, 9, 27, 15).getTime(),
    "1",
    1,
  );
  assert.equal(error, null);
  assert.ok(range);
  assert.equal(range.startsAt, new Date(2026, 9, 27).getTime());
  assert.equal(range.expiresAt, new Date(2026, 10, 3).getTime());
  assert.equal(isTaskVisibleOnDate(range, new Date(2026, 10, 2)), true);
  assert.equal(isTaskVisibleOnDate(range, new Date(2026, 10, 3)), false);
});

for (const [label, start, weeks, end] of [
  ["multiple weeks", new Date(2026, 9, 27), "3", new Date(2026, 10, 17)],
  ["month end", new Date(2026, 0, 29), "1", new Date(2026, 1, 5)],
  ["year end", new Date(2026, 11, 29), "2", new Date(2027, 0, 12)],
  ["leap day", new Date(2028, 1, 27), "1", new Date(2028, 2, 5)],
  ["spring daylight saving", new Date(2026, 2, 3), "1", new Date(2026, 2, 10)],
  ["fall daylight saving", new Date(2026, 9, 27), "1", new Date(2026, 10, 3)],
  ["maximum duration", new Date(2026, 0, 1), "999", new Date(2045, 1, 23)],
] as const) {
  it(`calculates calendar-day boundaries across ${label}`, () => {
    const { range } = validateCustomWeekDuration(start.getTime(), weeks);
    assert.ok(range);
    assert.equal(range.startsAt, start.getTime());
    assert.equal(range.expiresAt, end.getTime());
    const persisted = JSON.parse(
      JSON.stringify({ duration: "custom", ...range }),
    );
    assert.equal(
      isTaskVisibleOnDate(
        persisted,
        new Date(end.getFullYear(), end.getMonth(), end.getDate() - 1),
      ),
      true,
    );
    assert.equal(isTaskVisibleOnDate(persisted, end), false);
  });
}

for (const value of [
  "",
  " ",
  "0",
  "-1",
  "1.5",
  "1.0",
  "abc",
  "NaN",
  "Infinity",
  "1e2",
  "1000",
  "9007199254740992",
]) {
  it(`rejects invalid week count ${JSON.stringify(value)}`, () => {
    const { range, error } = validateCustomWeekDuration(Date.now(), value);
    assert.equal(range, null);
    assert.match(error!, /whole number/);
  });
}

it("rejects invalid start dates and task weekdays", () => {
  assert.equal(validateCustomWeekDuration(NaN, "1").range, null);
  assert.equal(validateCustomWeekDuration(Date.now(), "1", 7).range, null);
});

it("checks weekday eligibility without changing weekday membership or hidden dates", () => {
  const start = new Date(2026, 9, 27).getTime();
  const monday = new Date(2026, 10, 2);
  assert.ok(validateCustomWeekDuration(start, "1", 1).range);
  const hiddenDates = [getTaskDateKey(monday)];
  assert.equal(
    validateCustomWeekDuration(start, "1", 1, hiddenDates).range,
    null,
  );
  const { range } = validateCustomWeekDuration(start, "2", 1, hiddenDates);
  assert.ok(range);
  const schedule = [
    {
      weekday: 1,
      tasks: [{ id: "monday-only", completed: false, ...range, hiddenDates }],
    },
  ];
  const tasksOnDate = (date: Date) =>
    getTasksForDate(
      schedule.find((day) => day.weekday === date.getDay())?.tasks ?? [],
      date,
    );
  assert.equal(tasksOnDate(new Date(2026, 9, 27)).length, 0);
  assert.equal(tasksOnDate(monday).length, 0);
  assert.equal(tasksOnDate(new Date(2026, 10, 9)).length, 1);
  assert.deepEqual(schedule[0].tasks[0].hiddenDates, hiddenDates);
});

it("preserves standard week, month, year and unlimited expiration behavior", () => {
  const start = new Date(2026, 9, 27, 15, 30).getTime();
  assert.equal(
    getTaskExpiration("week", start),
    new Date(2026, 10, 3).getTime(),
  );
  assert.equal(
    getTaskExpiration("month", start),
    new Date(2026, 10, 1).getTime(),
  );
  assert.equal(
    getTaskExpiration("year", start),
    new Date(2027, 0, 1).getTime(),
  );
  assert.equal(getTaskExpiration("forever", start), undefined);
  assert.equal(getTaskExpiration("default", start), undefined);
});

it("reads legacy custom dates without rounding or modifying persisted timestamps", () => {
  const original = JSON.stringify({
    id: "legacy-custom",
    completed: false,
    duration: "custom",
    startsAt: new Date(2026, 9, 27).getTime(),
    expiresAt: new Date(2026, 9, 29, 23, 59, 59, 999).getTime(),
  });
  const task = JSON.parse(original);
  assert.equal(getTasksForDate([task], new Date(2026, 9, 29)).length, 1);
  assert.equal(getTasksForDate([task], new Date(2026, 9, 30)).length, 0);
  assert.equal(JSON.stringify(task), original);
});
