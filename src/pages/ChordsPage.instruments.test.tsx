import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ChordsPage } from "./ChordsPage";
import { SettingsContext } from "../contexts/SettingsContext";
import { getChordDefinition, type CustomChord } from "../data/chordsData";
import { getBassVoicings } from "../lib/bassChords";
import type { AppSettings, PracticeInstrument } from "../types";

const instruments: PracticeInstrument[] = ["guitar", "bass", "piano"];

function render(enabledInstruments?: PracticeInstrument[], view: PracticeInstrument | "both" = "both") {
  const settings = { defaultInstrument: "guitar", enabledInstruments } as AppSettings;
  return renderToStaticMarkup(
    <SettingsContext.Provider value={settings}>
      <ChordsPage settings={settings} initialChordTarget={{ root: "C", chordType: "major", instrumentView: view }} />
    </SettingsContext.Provider>,
  );
}

test("combined ChordsPage renders exactly the enabled toggles and sections for all memberships", () => {
  for (let mask = 1; mask < 8; mask++) {
    const enabled = instruments.filter((instrument, index) => mask & (1 << index));
    const html = render(enabled);
    for (const instrument of instruments) {
      const label = instrument[0].toUpperCase() + instrument.slice(1);
      assert.equal(html.includes(`aria-label="${label} view"`), enabled.includes(instrument), `${enabled}: ${instrument} toggle`);
    }
    if (enabled.includes("guitar") && enabled.includes("bass")) {
      assert.ok(
        html.indexOf('aria-label="Guitar view"') <
          html.indexOf('aria-label="Bass view"'),
        "Guitar toggle should appear before Bass",
      );
    }
    assert.equal(html.includes("Guitar Voicings"), enabled.includes("guitar"));
    assert.equal(html.includes("Guitar Bass"), enabled.includes("bass"));
    assert.equal(html.includes("Piano Voicing"), enabled.includes("piano"));
    assert.equal(html.includes('aria-label="Both instrument views"'), enabled.length === 2);
    assert.equal(html.includes('aria-label="All instrument views"'), enabled.length === 3);
    if (enabled.length === 1) {
      assert.match(html, new RegExp(`aria-label="${enabled[0][0].toUpperCase() + enabled[0].slice(1)} view"[^>]*aria-pressed="true"`));
    }
  }
});

test("missing enabled settings retain guitar/piano and disabled routes normalize immediately", () => {
  const legacy = render();
  assert.match(legacy, /Guitar Voicings/);
  assert.match(legacy, /Piano Voicing/);
  assert.doesNotMatch(legacy, /Bass Candidates|aria-label="Bass view"/);
  const fallback = render(["bass"], "guitar");
  assert.match(fallback, /aria-label="Bass view"[^>]*aria-pressed="true"/);
  assert.match(fallback, /Guitar Bass/);
  assert.doesNotMatch(fallback, /Guitar Voicings|Piano Voicing/);
});

test("custom chords appear only in their instrument section, including legacy piano chords", () => {
  const baseline = new Map(instruments.map(instrument => [instrument, render([instrument])]));
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  const definition = getChordDefinition("C", "major");
  const customChords: CustomChord[] = [
    { id: "legacy-guitar", root: "C", chordType: "major", voicing: definition.voicings[0] },
    { id: "bass", root: "C", chordType: "major", instrument: "bass", voicing: getBassVoicings(definition)[0] },
    { id: "legacy-piano", root: "C", chordType: "major", voicing: definition.voicings[0], pianoVoicing: { ...definition.keyboardVoicings![0], name: "Custom Piano Only" } },
  ];
  let stored: CustomChord[] = [];
  Object.defineProperty(globalThis, "localStorage", { configurable: true, value: { getItem: () => JSON.stringify(stored) } });
  try {
    for (const chord of customChords) {
      stored = [chord];
      const owner = chord.instrument ?? (chord.pianoVoicing ? "piano" : "guitar");
      for (const instrument of instruments) {
        assert.equal(render([instrument]) === baseline.get(instrument), instrument !== owner, `${chord.id} in ${instrument}`);
      }
    }
    stored = customChords;
    const combined = render(instruments);
    assert.match(combined, /Guitar Voicings/);
    assert.match(combined, /Guitar Bass/);
    assert.match(combined, /Custom Piano Only/);
  } finally {
    if (descriptor) Object.defineProperty(globalThis, "localStorage", descriptor);
    else Reflect.deleteProperty(globalThis, "localStorage");
  }
});