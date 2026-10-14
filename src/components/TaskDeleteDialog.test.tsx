import assert from "node:assert/strict";
import { it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { TaskDeleteDialog } from "./TaskDeleteDialog";

it("requires a deletion scope to be selected before confirming", () => {
  const html = renderToStaticMarkup(
    <TaskDeleteDialog
      taskName="Practice scales"
      onConfirm={() => {}}
      onCancel={() => {}}
    />,
  );

  assert.match(html, /aria-pressed="false"/);
  assert.match(html, /<button type="button" disabled=""[^>]*>Confirm delete<\/button>/);
  assert.match(html, /Only this day/);
  assert.match(html, /Everywhere/);
});

it("renders task mentions as readable tags in the delete prompt", () => {
  const html = renderToStaticMarkup(
    <TaskDeleteDialog
      taskName="Practice @custom(Performance ready) for @timer(10 minutes)"
      onConfirm={() => {}}
      onCancel={() => {}}
    />,
  );

  assert.match(html, /Choose where to delete/);
  assert.match(html, /Practice/);
  assert.match(html, /Performance ready/);
  assert.match(html, /10m/);
  assert.match(html, /bg-surface-container-high/);
  assert.doesNotMatch(html, /@custom|@timer/);
});
