import assert from "node:assert/strict";
import { it } from "node:test";
import { getTaskExpiration, validateCustomWeekDuration } from "./taskDuration";
import {
  getTaskDateKey,
  getTasksForDate,
  isTaskVisibleOnDate,
} from "./taskDates";

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
