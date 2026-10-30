import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ChordDiagram } from "../components/ChordDiagram";
import { CustomChordEditor } from "../components/CustomChordEditor";
import { SwipeableChordCard } from "../components/SwipeableChordCard";
import { ChordSelectorWidget } from "../components/ChordSelectorWidget";
import { ChordsPage } from "../pages/ChordsPage";
import { BuilderPage } from "../pages/BuilderPage";
import { SettingsContext } from "../contexts/SettingsContext";
import type { AppSettings } from "../types";
import { exportSavedCustomChords, getChordDefinition, getCustomChords, importCustomChords, saveCustomChord } from "../data/chordsData";
import { getBassVoicings } from "./bassChords";
import { buildChordUrl, resolveChordRoute } from "./chordRoutes";

const settings = { defaultInstrument: "bass", enabledInstruments: ["guitar", "bass", "piano"] } as AppSettings;
function render(element: React.ReactNode) {
  return renderToStaticMarkup(<SettingsContext.Provider value={settings}>{element}</SettingsContext.Provider>);
}

function withStorage(run: (values: Map<string, string>) => void) {
  const values = new Map<string, string>();
  const descriptors = new Map(["localStorage", "window", "CustomEvent"].map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  Object.defineProperty(globalThis, "localStorage", { configurable: true, value: {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
  } });
  Object.defineProperty(globalThis, "window", { configurable: true, value: { dispatchEvent: () => true } });
  Object.defineProperty(globalThis, "CustomEvent", { configurable: true, value: class { constructor(public type: string) {} } });
  try { run(values); } finally {
    for (const [key, descriptor] of descriptors) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else Reflect.deleteProperty(globalThis, key);
    }
  }
}

test("bass routes round-trip without changing guitar paths", () => {
  assert.equal(buildChordUrl("C", "major", "bass"), "/chords/c/major?instrument=bass");
  assert.equal(resolveChordRoute("/chords/c/major", "?instrument=bass")?.instrumentView, "bass");
});

test("bass diagrams describe exactly four low-register strings and reductions", () => {
  const voicing = getBassVoicings(getChordDefinition("C", "13"))[0];
  const html = render(<ChordDiagram root="C" voicing={voicing} />);
  assert.match(html, /Four-string bass/);
  assert.match(html, /String 4 \(E\)/);
  assert.match(html, /String 1 \(G\)/);
  assert.doesNotMatch(html, /String [56]/);
  assert.match(html, /Reduced: omit/);
  const open = render(<ChordDiagram root="E" instrument="bass" voicing={{ ...voicing, frets: [0, 0, 0, 0] }} />);
  assert.match(open, /open, E1/);
  assert.match(open, /open, A1/);
  assert.match(open, /open, D2/);
  assert.match(open, /open, G2/);
});

test("bass custom JSON round-trips separately from unchanged guitar shapes", () => withStorage(values => {
  const guitar = getChordDefinition("C", "major").voicings;
  const voicing = { ...getBassVoicings(getChordDefinition("C", "13"))[0], displayFretCount: 8 };
  saveCustomChord({ id: "bass-custom", root: "C", chordType: "13", instrument: "bass", voicing, fretCount: 8 });
  const exported = exportSavedCustomChords();
  assert.equal(exported[0].voicings.length, 0);
  assert.deepEqual(exported[0].bassVoicings, [voicing]);
  values.clear();
  assert.equal(importCustomChords(JSON.stringify(exported)), 1);
  assert.equal(getCustomChords()[0].instrument, "bass");
  assert.equal(getCustomChords()[0].fretCount, 8);
  assert.deepEqual(getCustomChords()[0].voicing, voicing);
  assert.deepEqual(getChordDefinition("C", "major").voicings, guitar);
  assert.throws(() => importCustomChords([{ ...exported[0], bassVoicings: [{ ...voicing, frets: [0, 0, 0, 0, 0, 0] }] }]), /four-string bass/);
  assert.equal(getCustomChords().length, 1);
}));

test("bass library and selector never fall back to six-string guitar", () => withStorage(() => {
  const library = render(<ChordsPage settings={settings} initialChordTarget={{ root: "C", chordType: "13", instrumentView: "bass" }} />);
  assert.match(library, /Guitar Bass/);
  assert.doesNotMatch(library, /String [56]/);
  const card = render(<SwipeableChordCard root="C" type="major" instrument="bass" onRemove={() => {}} />);
  assert.match(card, /Four-string bass/);
  assert.doesNotMatch(card, /String [56]/);
  const selector = render(<ChordSelectorWidget defaultInstrument="bass" instrumentView="bass" enabledInstruments={settings.enabledInstruments} />);
  assert.match(selector, /Four-string bass/);
  assert.doesNotMatch(selector, /String [56]/);
}));

test("bass editor starts muted with four strings and candidate controls", () => withStorage(() => {
  const html = render(<CustomChordEditor defaultInstrument="bass" />);
  assert.equal((html.match(/aria-label="String [1-4] \([EADG]\): muted"/g) || []).length, 4);
  assert.match(html, /Catalog Candidates/);
  assert.match(html, /All strings muted/);
  assert.doesNotMatch(html, /aria-label="String [56]/);
}));

test("Builder defaults to four-string bass candidates", () => withStorage(() => {
  const html = render(<BuilderPage settings={settings} />);
  assert.match(html, /option value="bass" selected=""/);
  assert.match(html, /Four-string bass/);
  assert.doesNotMatch(html, /String [56]/);
}));