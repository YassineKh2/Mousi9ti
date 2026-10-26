import assert from "node:assert/strict";
import { it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { KeyboardChordDiagram } from "./KeyboardChordDiagram";
import { KeyboardVoicing } from "../types";

it("exposes piano chord playback and note toggles as named buttons", () => {
  const html = renderToStaticMarkup(
    <KeyboardChordDiagram
      chordName="A minor"
      root="A"
      voicing={
        {
          name: "Root position",
          positionLabel: "Root position",
          notes: [
            { note: "A", octave: 3, degree: "1", isRoot: true },
            { note: "C", octave: 4, degree: "b3" },
            { note: "E", octave: 4, degree: "5" },
          ],
        } as KeyboardVoicing
      }
      onNoteToggle={() => {}}
      compact
    />,
  );

  assert.match(
    html,
    /role="group" aria-label="A minor piano chord, Root position"/,
  );
  assert.match(html, /aria-label="Play A minor, Root position"/);
  assert.match(html, /aria-label="Toggle A3 in chord" aria-pressed="true"/);
  assert.match(html, /aria-label="Toggle C4 in chord" aria-pressed="true"/);
  assert.match(html, /aria-label="Toggle C#4 in chord" aria-pressed="false"/);
});
