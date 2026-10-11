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
