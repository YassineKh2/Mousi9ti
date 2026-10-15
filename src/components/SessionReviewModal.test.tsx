import assert from "node:assert/strict";
import { it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { SessionReviewModal } from "./SessionReviewModal";

for (const tool of ["timer", "time"]) {
  for (const [duration, expected] of [
    ["20s", "20s"],
    ["1m 20s", "1m 20s"],
    ["5m", "5m"],
  ]) {
    it(`formats @${tool}(${duration}) without fractional minutes in session review`, () => {
      const html = renderToStaticMarkup(
        <SessionReviewModal
          isOpen
          globalDurationSeconds={80}
          tasks={[
            {
              id: "task",
              text: `Practice @${tool}(${duration})`,
              completed: true,
            },
          ]}
          attributedSeconds={{ task: 80 }}
          onSave={() => {}}
          onClose={() => {}}
        />,
      );

      assert.ok(html.includes(`>${expected}</span>`));
      assert.doesNotMatch(html, />\d+\.\d+m<\/span>/);
    });
  }
}

it("shows remaining session time as general practice, not a missing allocation", () => {
  const html = renderToStaticMarkup(
    <SessionReviewModal
      isOpen
      globalDurationSeconds={600}
      tasks={[{ id: "task", text: "Warm-up", completed: true }]}
      attributedSeconds={{ task: 80 }}
      onSave={() => {}}
      onClose={() => {}}
    />,
  );
  assert.match(html, /Full session/);
  assert.match(html, /Assigned to tasks/);
  assert.match(html, /General practice/);
  assert.match(html, /8m 40s<\/strong>/);
  assert.match(html, /You can leave time for general practice/);
  assert.doesNotMatch(html, /Unassigned|role="status"/);
});

it("explains when task time exceeds the full session", () => {
  const html = renderToStaticMarkup(
    <SessionReviewModal
      isOpen
      globalDurationSeconds={60}
      tasks={[{ id: "task", text: "Warm-up", completed: true }]}
      attributedSeconds={{ task: 80 }}
      onSave={() => {}}
      onClose={() => {}}
    />,
  );
  assert.match(html, /Task time exceeds the full session by 0m 20s/);
  assert.match(html, /role="status"/);
});

for (const seconds of [0, 20, 80, 125, 300]) {
  it(`preserves ${seconds} recorded seconds in the review fields and total`, () => {
    const html = renderToStaticMarkup(
      <SessionReviewModal
        isOpen
        globalDurationSeconds={seconds}
        tasks={[{ id: "task", text: "Practice @timer(5m)", completed: true }]}
        attributedSeconds={{ task: seconds }}
        onSave={() => {}}
        onClose={() => {}}
      />,
    );

    assert.match(
      html,
      new RegExp(
        `aria-label="Recorded minutes[^>]*value="${Math.floor(seconds / 60)}"`,
      ),
    );
    assert.match(
      html,
      new RegExp(`aria-label="Recorded seconds[^>]*value="${seconds % 60}"`),
    );
    assert.ok(
      html.includes(
        `${Math.floor(seconds / 60)}m ${String(seconds % 60).padStart(2, "0")}s</strong>`,
      ),
    );
    assert.doesNotMatch(html, /Task time is higher|Some global time remains/);
  });
}
