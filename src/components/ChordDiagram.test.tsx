import assert from "node:assert/strict";
import { it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ChordDiagram } from "./ChordDiagram";
import { SettingsContext } from "../contexts/SettingsContext";
import { AppSettings, GuitarVoicing } from "../types";

it("uses one native playback button and describes actual frets and notes", () => {
  const voicing = {
    name: "Test position",
    baseFret: 5,
    frets: [null, 0, 7, 6, 5, 5],
  } as GuitarVoicing;
  const html = renderToStaticMarkup(
    <SettingsContext.Provider value={{} as AppSettings}>
      <ChordDiagram chordName="A" root="A" voicing={voicing} />
    </SettingsContext.Provider>,
  );
  assert.equal((html.match(/<button\b/g) || []).length, 1);
  assert.match(html, /<button type="button"/);
  assert.match(html, /aria-label="Play A, Test position"/);
  assert.match(html, /aria-describedby="[^"]+"/);
  assert.match(html, /String 6 \(E\): muted/);
  assert.match(html, /String 5 \(A\): open, A2/);
  assert.match(html, /String 4 \(D\): fret 7, A3/);
  assert.doesNotMatch(html, /role="button"|tabindex|<div/);
});

it("describes notes covered by a barre consistently with playback", () => {
  const html = renderToStaticMarkup(
    <SettingsContext.Provider value={{} as AppSettings}>
      <ChordDiagram
        root="F"
        compact
        voicing={
          {
            name: "Barre",
            frets: [0, 3, 3, 2, 0, 0],
            barre: { fret: 1, fromString: 0, toString: 5, finger: 1 },
          } as GuitarVoicing
        }
      />
    </SettingsContext.Provider>,
  );
  assert.match(html, /String 6 \(E\): fret 1, F2/);
  assert.match(html, /String 5 \(A\): fret 3, C3/);
  assert.match(html, /String 1 \(E\): fret 1, F4/);
  assert.match(html, /<svg aria-hidden="true"/);
});
