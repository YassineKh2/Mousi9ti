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
  assert.match(html, /lucide-volume-2/);
  assert.match(
    html,
    /class="relative w-max mx-auto py-2 px-2 flex justify-start sm:justify-center">[\s\S]*?class="absolute right-0 -top-1[^"]*bg-surface-container text-primary shadow-sm transition-colors hover:bg-surface-container-high focus-visible:ring-2 focus-visible:ring-primary/,
  );
  assert.match(html, /aria-label="Toggle A3 in chord" aria-pressed="true"/);
  assert.match(html, /data-piano-key="true"/);
  assert.doesNotMatch(html, /hover:brightness|hover:bg-zinc-800|bg-primary hover:bg-primary/);
  assert.match(html, /aria-label="Toggle C4 in chord" aria-pressed="true"/);
  assert.match(html, /aria-label="Toggle C#4 in chord" aria-pressed="false"/);
});
