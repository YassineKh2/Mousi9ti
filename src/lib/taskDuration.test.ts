import assert from "node:assert/strict";
import { it } from "node:test";
import { validateCustomWeekDuration } from "./taskDuration";
import { isTaskVisibleOnDate } from "./taskDates";

it("includes the following Monday in one week starting Tuesday", () => {
  const { range, error } = validateCustomWeekDuration(new Date(2026, 9, 27, 15).getTime(), "1", 1);
  assert.equal(error, null);
  assert.ok(range);
  assert.equal(range.startsAt, new Date(2026, 9, 27).getTime());
  assert.equal(range.expiresAt, new Date(2026, 10, 3).getTime());
  assert.equal(isTaskVisibleOnDate(range, new Date(2026, 10, 2)), true);
  assert.equal(isTaskVisibleOnDate(range, new Date(2026, 10, 3)), false);
});