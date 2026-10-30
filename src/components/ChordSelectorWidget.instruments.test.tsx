import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ChordSelectorWidget } from "./ChordSelectorWidget";
import { SettingsContext } from "../contexts/SettingsContext";
import type { AppSettings, PracticeInstrument } from "../types";

function renderSelector(enabledInstruments?: PracticeInstrument[], instrumentView: "both" | PracticeInstrument = "both") {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  Object.defineProperty(globalThis, "localStorage", { configurable: true, value: { getItem: () => null } });
  try {
    return renderToStaticMarkup(
      <SettingsContext.Provider value={{ defaultInstrument: "piano", enabledInstruments } as AppSettings}>
        <ChordSelectorWidget defaultInstrument="piano" instrumentView={instrumentView} enabledInstruments={enabledInstruments} />
      </SettingsContext.Provider>,
    );
  } finally {
    if (descriptor) Object.defineProperty(globalThis, "localStorage", descriptor);
    else Reflect.deleteProperty(globalThis, "localStorage");
  }
}

test("combined selector renders guitar, bass and piano instead of the default instrument", () => {
  const html = renderSelector(["guitar", "bass", "piano"]);
  assert.match(html, /aria-label="All instruments"/);
  assert.match(html, /String 6 \(E\)/);
  assert.match(html, /Four-string bass/);
  assert.match(html, />Piano<\/h4>/);
});

test("single bass normalizes disabled selection and hides other controls", () => {
  const html = renderSelector(["bass"], "guitar");
  assert.match(html, /Four-string bass/);
  assert.match(html, /aria-label="Bass" aria-pressed="true"/);
  assert.doesNotMatch(html, /aria-label="(?:Guitar|Piano|Both instruments|All instruments)"/);
  assert.doesNotMatch(html, /String [56]/);
});

test("legacy settings default to guitar and piano with Both", () => {
  const html = renderSelector();
  assert.match(html, /aria-label="Both instruments"/);
  assert.match(html, /String 6 \(E\)/);
  assert.match(html, />Piano<\/h4>/);
  assert.doesNotMatch(html, /aria-label="Bass"|Four-string bass/);
});

test("each enabled pair renders both diagrams and excludes the disabled control", () => {
  for (const pair of [["guitar", "bass"], ["bass", "piano"], ["guitar", "piano"]] as PracticeInstrument[][]) {
    const html = renderSelector(pair);
    assert.match(html, /aria-label="Both instruments" aria-pressed="true"/);
    assert.equal(html.includes("String 6 (E)"), pair.includes("guitar"));
    assert.equal(html.includes("Four-string bass"), pair.includes("bass"));
    assert.equal(html.includes(">Piano</h4>"), pair.includes("piano"));
    for (const instrument of ["guitar", "bass", "piano"] as const) {
      const label = instrument[0].toUpperCase() + instrument.slice(1);
      assert.equal(html.includes(`aria-label="${label}"`), pair.includes(instrument));
    }
  }
});