import assert from "node:assert/strict";
import { it } from "node:test";
import {
  getPageRouteForTab,
  PAGE_ROUTES,
  resolvePageRoute,
} from "./pageRoutes";
import {
  buildScaleUrl,
  buildScalePath,
  getScaleRouteDefinitions,
  getScaleShapeRouteDefinitions,
} from "./scaleRoutes";
import {
  buildChordPath,
  buildChordUrl,
  getChordRouteDefinitions,
} from "./chordRoutes";

it("resolves every public page with and without a trailing slash", () => {
  for (const route of PAGE_ROUTES) {
    const path = route.path === "/" ? "" : route.path.slice(0, -1);
    assert.equal(resolvePageRoute(route.path), route);
    assert.equal(resolvePageRoute(path), route);
  }
});

it("maps the dedicated metronome URL to the existing tools view", () => {
  const route = resolvePageRoute("/metronome/");
  assert.equal(route?.tab, "tools");
  assert.equal(route?.tool, "metronome");
  assert.equal(route?.title, "Online Metronome | Mousi9ti");
});

it("does not treat unknown paths as the dashboard", () => {
  assert.equal(resolvePageRoute("/not-a-page/"), null);
});

it("maps each navigation tab to its canonical page route", () => {
  assert.equal(getPageRouteForTab("dashboard").path, "/");
  assert.equal(
    getPageRouteForTab("builder").path,
    "/chord-progression-builder/",
  );
  assert.equal(getPageRouteForTab("tools").path, "/tools/");
});

it("resolves readable chord routes and instrument query values", () => {
  const route = resolvePageRoute("/chords/a/minor-7th", "?instrument=piano");
  assert.equal(route?.tab, "chords");
  assert.equal(route?.chordTarget?.root, "A");
  assert.equal(route?.chordTarget?.chordType, "min7");
  assert.equal(route?.chordTarget?.instrumentView, "piano");
  assert.equal(route?.title, "A Minor 7th Chord | Mousi9ti");
  assert.equal(buildChordPath("A", "min7"), "/chords/a/minor-7th");
  assert.equal(
    buildChordUrl("A", "min7", "both"),
    "/chords/a/minor-7th?instrument=both",
  );
});

it("generates a route for each chord catalog root and type", () => {
  for (const route of getChordRouteDefinitions()) {
    const resolved = resolvePageRoute(route.path);
    assert.equal(resolved?.chordTarget?.root, route.root, route.path);
    assert.equal(resolved?.chordTarget?.chordType, route.chordType, route.path);
  }
});

it("resolves the A minor pentatonic shorthand route", () => {
  const route = resolvePageRoute("/scale/am/pentatonic");
  assert.equal(route?.tab, "scales");
  assert.equal(route?.scaleTarget?.root, "A");
  assert.equal(route?.scaleTarget?.scaleId, "pentatonic_minor");
  assert.equal(route?.title, "A Minor Pentatonic Scale | Mousi9ti");
  assert.equal(route?.path, "/scale/a/pentatonic");
});

it("resolves flat roots and CAGED shape aliases", () => {
  const route = resolvePageRoute("/scale/Gb/pentatonic/shape1");
  assert.equal(route?.scaleTarget?.root, "Gb");
  assert.equal(route?.scaleTarget?.scaleId, "pentatonic_minor");
  assert.equal(route?.scaleTarget?.boxKey, "Pattern 1 (E-Shape)");
  assert.equal(route?.indexable, false);
  assert.equal(
    buildScalePath("Gb", "pentatonic_minor", "Pattern 1 (E-Shape)"),
    "/scale/gb/pentatonic/shape1",
  );
  assert.equal(
    buildScalePath("F#", "pentatonic_minor"),
    "/scale/f-sharp/pentatonic",
  );
});

it("rejects unknown scales and unavailable shapes", () => {
  assert.equal(resolvePageRoute("/scale/c/unknown-scale"), null);
  assert.equal(resolvePageRoute("/scale/c/chromatic/shape1"), null);
  assert.equal(resolvePageRoute("/scale/c/pentatonic/shape9"), null);
});

it("round-trips every supported root, scale, and CAGED shape", () => {
  for (const route of [
    ...getScaleRouteDefinitions(),
    ...getScaleShapeRouteDefinitions(),
  ]) {
    const resolved = resolvePageRoute(route.path);
    assert.equal(resolved?.scaleTarget?.root, route.root, route.path);
    assert.equal(resolved?.scaleTarget?.scaleId, route.scaleId, route.path);
    assert.equal(resolved?.scaleTarget?.boxKey, route.boxKey, route.path);
  }
});

it("restores piano and combined instrument range from a share URL", () => {
  const route = resolvePageRoute(
    "/scale/gb/pentatonic/shape2",
    "?range=octave34",
  );
  assert.equal(route?.scaleTarget?.root, "Gb");
  assert.equal(route?.scaleTarget?.boxKey, "Pattern 2 (D-Shape)");
  assert.equal(route?.scaleTarget?.instrumentView, "both");
  assert.equal(route?.scaleTarget?.pianoFocusRange, "octave34");
  assert.equal(
    buildScaleUrl(
      "Gb",
      "pentatonic_minor",
      "Pattern 2 (D-Shape)",
      "both",
      "octave34",
    ),
    "/scale/gb/pentatonic/shape2?range=octave34",
  );
});

it("supports both one-octave registers and the two-octave piano range", () => {
  for (const range of ["octave3", "octave4", "octave34", "all"] as const) {
    const url = buildScaleUrl("A", "pentatonic_minor", null, "piano", range);
    const [pathname, search] = url.split("?");
    assert.equal(
      resolvePageRoute(pathname, `?${search}`)?.scaleTarget?.pianoFocusRange,
      range,
    );
    assert.equal(
      resolvePageRoute(pathname, `?${search}`)?.scaleTarget?.instrumentView,
      "piano",
    );
  }
});

it("removes guitar shape state from piano-only URLs", () => {
  const route = resolvePageRoute(
    "/scale/gb/pentatonic/shape1",
    "?range=octave34&view=piano",
  );
  assert.equal(route?.path, "/scale/gb/pentatonic");
  assert.equal(route?.scaleTarget?.boxKey, null);
  assert.equal(route?.scaleTarget?.instrumentView, "piano");
});

it("infers Guitar from a shape, Piano from a range, and Both from both", () => {
  assert.equal(
    resolvePageRoute("/scale/gb/pentatonic/shape1")?.scaleTarget
      ?.instrumentView,
    "guitar",
  );
  assert.equal(
    resolvePageRoute("/scale/gb/pentatonic", "?range=octave4")?.scaleTarget
      ?.instrumentView,
    "piano",
  );
  assert.equal(
    resolvePageRoute("/scale/gb/pentatonic/shape1", "?range=octave4")
      ?.scaleTarget?.instrumentView,
    "both",
  );
  assert.equal(
    buildScaleUrl(
      "Gb",
      "pentatonic_minor",
      "Pattern 1 (E-Shape)",
      "guitar",
      "octave34",
    ),
    "/scale/gb/pentatonic/shape1",
  );
  assert.equal(
    buildScaleUrl("Gb", "pentatonic_minor", null, "piano", "octave34"),
    "/scale/gb/pentatonic?range=octave34",
  );
  assert.equal(
    buildScaleUrl("Gb", "pentatonic_minor", null, "guitar", "octave34"),
    "/scale/gb/pentatonic?instrument=guitar",
  );
});
