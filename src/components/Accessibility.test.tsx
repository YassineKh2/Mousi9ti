import assert from "node:assert/strict";
import { it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ChordSearchInput } from "./ChordSearchInput";
import { RandomDrill } from "./RandomDrill";
import { SwipeableChordCard } from "./SwipeableChordCard";
import { ChordSelectorWidget } from "./ChordSelectorWidget";
import { SettingsContext } from "../contexts/SettingsContext";
import { AppSettings } from "../types";

const settings = {} as AppSettings;
const noop = () => {};

it("names chord search and cancel controls independently of placeholders", () => {
  const html = renderToStaticMarkup(
    <ChordSearchInput onSelect={noop} onCancel={noop} placeholder="" />,
  );
  assert.match(html, /<input[^>]*aria-label="Search chords"/);
  assert.match(html, /<button[^>]*aria-label="Cancel chord search"/);
});

it("names both drill selects and uses native next-note activation", () => {
  const html = renderToStaticMarkup(
    <RandomDrill currentNote="C#" onNextNote={noop} metronomeBpm={120} />,
  );
  assert.match(html, /<select aria-label="Random note accidentals"/);
  assert.match(html, /<select aria-label="Random note advance interval"/);
  assert.match(
    html,
    /<button type="button" aria-label="Next random note, current note C#"/,
  );
  assert.match(html, /aria-pressed="false"/);
});

it("keeps remove, edit, voicing selection and playback controls separate", () => {
  const html = renderToStaticMarkup(
    <SettingsContext.Provider value={settings}>
      <SwipeableChordCard
        root="C"
        type="major"
        instrument="guitar"
        onRemove={noop}
        onChange={noop}
      />
    </SettingsContext.Provider>,
  );
  assert.match(html, /aria-label="Remove C"/);
  assert.match(html, /role="button" tabindex="0" aria-label="Change C"/);
  assert.match(html, /aria-pressed="true"[^>]*aria-label="Go to voicing 1"/);
  assert.match(html, /pointer-events-auto w-full/);
  assert.doesNotMatch(
    html,
    /<button\b[^>]*>(?:(?!<\/button>)[\s\S])*<button\b/,
  );
});

it("names the empty selector's add control", () => {
  const previousStorage = Object.getOwnPropertyDescriptor(
    globalThis,
    "localStorage",
  );
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      getItem: (key: string) =>
        key === "Mousi9ti_chord_selections_v1" ? "[]" : null,
    },
  });
  try {
    const html = renderToStaticMarkup(
      <ChordSelectorWidget
        defaultInstrument="guitar"
        instrumentView="guitar"
      />,
    );
    assert.match(html, /<button type="button" aria-label="Add chord"/);
  } finally {
    if (previousStorage)
      Object.defineProperty(globalThis, "localStorage", previousStorage);
    else Reflect.deleteProperty(globalThis, "localStorage");
  }
});
