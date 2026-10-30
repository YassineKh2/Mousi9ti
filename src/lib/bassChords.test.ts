import assert from "node:assert/strict";
import test from "node:test";
import { CHORD_TYPES_CATALOG, getChordDefinition } from "../data/chordsData";
import { CHROMATIC_SHARPS, NOTE_SEMITONES } from "../data/musicTheory";
import { getBassVoicings, getVoicingPitches, recognizeBassChord } from "./bassChords";

test("bass catalog candidates are independently generated, bounded and pitch-correct", () => {
  for (const root of CHROMATIC_SHARPS) for (const chordType of CHORD_TYPES_CATALOG) {
    const chord = getChordDefinition(root, chordType.type);
    const voicings = getBassVoicings(chord);
    assert.ok(voicings.length, `${root} ${chordType.type}`);
    for (const voicing of voicings) {
      assert.equal(voicing.frets.length, 4);
      const stopped = voicing.frets.filter((fret): fret is number => fret !== null && fret > 0);
      assert.ok(stopped.every(fret => fret <= 20));
      assert.ok(Math.max(...stopped) - Math.min(...stopped) <= 3);
      const relative = new Set(getVoicingPitches(voicing).map(pitch => (pitch.midi - NOTE_SEMITONES[root] + 120) % 12));
      assert.ok([...relative].every(interval => chordType.intervals.some(expected => expected % 12 === interval)));
      assert.deepEqual(voicing.omittedDegrees, chordType.degrees.filter((_, index) => !relative.has(chordType.intervals[index] % 12)));
      chordType.degrees.forEach((degree, index) => {
        if (degree.includes("3") || degree.includes("7") || degree.includes("b5") || degree.includes("#5")) assert.ok(relative.has(chordType.intervals[index] % 12));
      });
    }
  }
});

test("recognition reports ambiguity, contextual omissions and actual lowest MIDI", () => {
  const shape = { name: "test", positionLabel: "test", rootString: "", baseFret: 1, frets: [12, 3, 5, null], fingers: [null, null, null, null] };
  const candidates = recognizeBassChord(shape);
  assert.ok(candidates.some(candidate => candidate.name === "C" && candidate.match === "exact"));
  assert.ok(candidates.every(candidate => candidate.bassNote === "C" && candidate.bassOctave === 2));
  const diminished = getBassVoicings(getChordDefinition("C", "dim7"))[0];
  assert.equal(recognizeBassChord(diminished).filter(candidate => candidate.match === "exact").length, 4);
  const extended = getBassVoicings(getChordDefinition("C", "13"))[0];
  assert.ok(recognizeBassChord(extended).some(candidate => candidate.type === "13" && candidate.match === "contextual"));
});