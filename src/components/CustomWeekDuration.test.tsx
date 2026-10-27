import assert from "node:assert/strict";
import { it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { CustomWeekDuration } from "./CustomWeekDuration";

const renderDuration = (startDate: number, weeks: string) =>
  renderToStaticMarkup(
    <CustomWeekDuration
      startDate={startDate}
      weeks={weeks}
      onChange={() => {}}
      onApply={() => {}}
    />,
  );

const formatDate = (date: Date) =>
  date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

it("labels the week input and offers common choices without an end-date input", () => {
  const html = renderDuration(new Date(2026, 9, 27).getTime(), "1");
  assert.match(html, /<label for="[^"]+"[^>]*>Number of weeks<\/label>/);
  assert.match(html, /inputMode="numeric"/);
  assert.match(html, /aria-invalid="false"/);
  for (const count of [1, 2, 3, 4])
    assert.ok(html.includes(`${count} ${count === 1 ? "week" : "weeks"}`));
  assert.doesNotMatch(html, /type="date"|CalendarRangePicker/);
});

it("updates the preview when the selected starting day changes", () => {
  const tuesday = renderDuration(new Date(2026, 9, 27).getTime(), "1");
  const wednesday = renderDuration(new Date(2026, 9, 28).getTime(), "1");
  assert.ok(
    tuesday.includes(
      `${formatDate(new Date(2026, 9, 27))} - ${formatDate(new Date(2026, 10, 2))}`,
    ),
  );
  assert.ok(
    wednesday.includes(
      `${formatDate(new Date(2026, 9, 28))} - ${formatDate(new Date(2026, 10, 3))}`,
    ),
  );
});

it("announces invalid counts and disables applying them", () => {
  for (const value of ["", "0", "-1", "1.5", "no", "1000"]) {
    const html = renderDuration(Date.now(), value);
    assert.match(html, /aria-invalid="true"/);
    assert.match(html, /aria-describedby="[^"]+-status"/);
    assert.match(html, /aria-live="polite"/);
    assert.match(html, /Enter a whole number of weeks/);
    assert.match(html, /disabled=""/);
  }
});

it("displays legacy dates without changing them or inferring a rounded duration", () => {
  const existingRange = {
    startsAt: new Date(2026, 9, 27).getTime(),
    expiresAt: new Date(2026, 9, 29, 23, 59, 59, 999).getTime(),
  };
  const original = JSON.stringify(existingRange);
  const html = renderToStaticMarkup(
    <CustomWeekDuration
      startDate={existingRange.startsAt}
      weeks="1"
      existingRange={existingRange}
      onChange={() => {}}
      onApply={() => {}}
    />,
  );
  assert.ok(
    html.includes(
      `Current period: ${formatDate(new Date(2026, 9, 27))} - ${formatDate(new Date(2026, 9, 29))}`,
    ),
  );
  assert.equal(JSON.stringify(existingRange), original);
});
