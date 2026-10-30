import assert from "node:assert/strict";
import { it } from "node:test";
import { ALL_ROOT_NOTES, SCALES_DATABASE } from "../data/musicTheory";
import { BASS_STANDARD_TUNING, getFrettedNote } from "./frettedInstrument";
import { buildScaleUrl, getBassScalePlayback, getBassScalePositions, resolveScaleRoute } from "./scaleRoutes";

const scale = SCALES_DATABASE.find((item) => item.id === "major")!;

it("round-trips legacy bass positions without piano ranges", () => {
  for (const bassPosition of [null, 0, 5, 21]) {
    const url = buildScaleUrl("A", "pentatonic_minor", null, "bass", "octave34", bassPosition);
    assert.ok(!url.includes("shape"));
    assert.ok(!url.includes("range"));
    const [path, search] = url.split("?");
    const route = resolveScaleRoute(path, search)!;
    assert.equal(route.instrumentView, "bass");
    assert.equal(route.bassPosition, bassPosition);
    assert.equal(route.boxKey, null);
    assert.equal(route.pianoFocusRange, undefined);
  }
});

it("bass patterns preserve the shape and take precedence over piano and legacy position state", () => {
  for (const position of ["-1", "22", "1.5", "bad", ""]) {
    const route = resolveScaleRoute("/scale/a/pentatonic/shape1", `instrument=bass&range=octave4&view=piano&position=${position}`)!;
    assert.equal(route.instrumentView, "bass");
    assert.equal(route.boxKey, Object.keys(SCALES_DATABASE.find(item => item.id === "pentatonic_minor")!.cagedBoxes!)[0]);
    assert.equal(route.bassPosition, null);
    assert.equal(route.pianoFocusRange, undefined);
  }
});

it("round-trips every numbered pattern for bass with the same root-relative windows as guitar", () => {
  for (const root of ALL_ROOT_NOTES) for (const definition of SCALES_DATABASE) {
    for (const [boxKey, box] of Object.entries(definition.cagedBoxes ?? {})) {
      const url = buildScaleUrl(root, definition.id, boxKey, "bass", "octave34", 5);
      assert.match(url, /\/shape\d+\?instrument=bass$/);
      const [path, search] = url.split("?");
      const route = resolveScaleRoute(path, search)!;
      assert.equal(route.boxKey, boxKey);
      assert.equal(route.instrumentView, "bass");
      assert.equal(route.bassPosition, null);
      const sequence = getBassScalePlayback(root, definition, 22, null, "ascending", boxKey);
      assert.ok(sequence.length > 0);
      const rootFret = (getFrettedNote({ name: "root", strings: [root], octaves: [1] }, 0, 0).midi - 28 + 12) % 12;
      const rawStart = rootFret + box.startFretOffset;
      const shift = -Math.floor(rawStart / 12) * 12;
      for (const pitch of sequence) {
        assert.ok(pitch.stringIdx >= 0 && pitch.stringIdx < 4);
        assert.ok(pitch.fretNum >= rawStart + shift);
        assert.ok(pitch.fretNum <= rootFret + box.endFretOffset + shift);
      }
    }
  }
});

it("round-trips every existing scale and root as bass without changing the catalog", () => {
  for (const root of ALL_ROOT_NOTES) {
    for (const definition of SCALES_DATABASE) {
      const url = buildScaleUrl(root, definition.id, null, "bass", "all", 5);
      const [path, search] = url.split("?");
      const route = resolveScaleRoute(path, search)!;
      assert.equal(route.root, root);
      assert.equal(route.scaleId, definition.id);
      assert.equal(route.instrumentView, "bass");
      assert.equal(route.bassPosition, 5);
    }
  }
});

it("generates four-consecutive-fret windows including open and final frets", () => {
  assert.deepEqual(getBassScalePositions(5), [0, 1, 2]);
  assert.equal(getBassScalePositions(24).at(-1), 21);
});

it("plays actual standard bass pitches in MIDI order, deduplicated and within the selected window", () => {
  assert.deepEqual(BASS_STANDARD_TUNING.octaves, [1, 1, 2, 2]);
  for (const position of [null, 0, 5, 19]) {
    const ascending = getBassScalePlayback("E", scale, 22, position, "ascending");
    assert.ok(ascending.length > 0);
    assert.equal(new Set(ascending.map((pitch) => pitch.midi)).size, ascending.length);
    for (const [index, pitch] of ascending.entries()) {
      assert.equal(pitch.midi, getFrettedNote(BASS_STANDARD_TUNING, pitch.stringIdx, pitch.fretNum).midi);
      assert.ok(scale.intervals.includes((pitch.midi - 4 + 12) % 12));
      if (index) assert.ok(pitch.midi > ascending[index - 1].midi);
      if (position !== null) assert.ok(pitch.fretNum >= position && pitch.fretNum <= position + 3);
    }
    assert.deepEqual(getBassScalePlayback("E", scale, 22, position, "descending"), [...ascending].reverse());
    assert.deepEqual(getBassScalePlayback("E", scale, 22, position, "both"), [...ascending, ...ascending.slice(0, -1).reverse()]);
  }
  assert.equal(getBassScalePlayback("E", scale, 22, null, "ascending")[0].midi, 28);
});