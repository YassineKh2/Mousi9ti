import assert from "node:assert/strict";
import { it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Fretboard } from "./Fretboard";
import { SettingsContext } from "../contexts/SettingsContext";
import type { AppSettings } from "../types";
import { BASS_STANDARD_TUNING } from "../lib/frettedInstrument";
import { SCALES_DATABASE } from "../data/musicTheory";

for (const theme of ["original", "ebony", "maple", "rosewood", "high-contrast"]) {
  it(`renders four correctly ordered bass strings in ${theme}`, () => {
    const settings = { fretboardTheme: theme, fretboardNoteSize: "medium", fretboardColorMode: "default" } as AppSettings;
    const html = renderToStaticMarkup(
      <SettingsContext.Provider value={settings}>
        <Fretboard instrument="bass" tuning={BASS_STANDARD_TUNING} fretCount={12} />
      </SettingsContext.Provider>,
    );
    assert.equal((html.match(/data-string-index=/g) || []).length, 4);
    assert.match(html, /data-instrument="bass"/);
    assert.doesNotMatch(html, /bass-fretboard__identity|bass-fretboard__tuning/);
    assert.match(html, /bass-neck-string/);
    assert.match(html, /bass-neck-inlay/);
    assert.match(html, /min-width:54px/);
    assert.match(html, /height:3px/);
    assert.match(html, /height:6\.3[0-9]*px/);
    assert.deepEqual([...html.matchAll(/data-open-pitch="([^"]+)"/g)].map(match => match[1]), ["G2", "D2", "A1", "E1"]);
    assert.match(html, /aria-label="Play E1, string 4, open"/);
    assert.doesNotMatch(html, /Standard Tuning|Drop D|undefined|NaN/);
  });
}

it("keeps guitar defaults and bass position filtering separate", () => {
  const settings = { fretboardTheme: "original", fretboardNoteSize: "medium", fretboardColorMode: "default" } as AppSettings;
  const render = (bass: boolean) => renderToStaticMarkup(
    <SettingsContext.Provider value={settings}>
      <Fretboard instrument={bass ? "bass" : "guitar"} fretCount={12}
        selectedRoot="C" selectedScale={SCALES_DATABASE[0]}
        fretRange={bass ? { start: 5, end: 8 } : undefined} />
    </SettingsContext.Provider>,
  );
  assert.equal((render(false).match(/data-string-index=/g) || []).length, 6);
  assert.match(render(false), /min-width:38px/);
  assert.doesNotMatch(render(false), /min-width:54px/);
  assert.doesNotMatch(render(false), /bass-fretboard__identity|class="[^"]*bass-fretboard /);
  assert.equal((render(true).match(/data-string-index=/g) || []).length, 4);
  assert.doesNotMatch(render(true), /aria-label="Play [^"]+, open"/);
});