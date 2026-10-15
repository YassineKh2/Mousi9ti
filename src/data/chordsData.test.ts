import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import { GUITAR_TUNINGS } from "./musicTheory";
import { validateGuitarVoicing } from "../lib/chordValidation";
import {
  CHORD_TYPES_CATALOG,
  exportChordLibrary,
  getChordDefinition,
  registerChordDefinitions,
  resetChordLibrary,
} from "./chordsData";

describe("canonical chord library", () => {
  beforeEach(() => {
    resetChordLibrary();
  });

  it("allows corrected exported chords to replace the canonical definition without duplicates", () => {
    const correctedMaj7: any = {
      id: "C_maj7",
      root: "C",
      type: "maj7",
      name: "Cmaj7",
      symbol: "maj7",
      fullName: "C Major 7th",
      intervals: [0, 4, 7, 11],
      formula: "1 3 5 7",
      notes: ["C", "E", "G", "B"],
      voicings: [],
      keyboardVoicings: [],
    };

    registerChordDefinitions([correctedMaj7]);

    const chord = getChordDefinition("C", "maj7");
    assert.deepEqual(chord.id, "C_maj7");
    assert.deepEqual(chord.root, "C");
    assert.deepEqual(chord.type, "maj7");
    assert.deepEqual(chord.notes, ["C", "E", "G", "B"]);

    const exported = exportChordLibrary();
    assert.equal(exported.filter((entry) => entry.id === "C_maj7").length, 1);
    assert.equal(
      CHORD_TYPES_CATALOG.some((entry) => entry.type === "maj7"),
      true,
    );
  });

  it("includes all eight screenshot B major shapes with complete fingers and barres", () => {
    const chord = getChordDefinition("B", "major");
    const expectedVoicings = [
      {
        frets: [null, 2, 4, 4, 4, 2],
        fingers: [null, 1, 2, 3, 4, 1],
        baseFret: 1,
        barre: { fret: 2, fromString: 1, toString: 5, finger: 1 },
      },
      {
        frets: [7, 9, 9, 8, 7, 7],
        fingers: [1, 3, 4, 2, 1, 1],
        baseFret: 7,
        barre: { fret: 7, fromString: 0, toString: 5, finger: 1 },
      },
      {
        frets: [null, null, 9, 8, 7, 7],
        fingers: [null, null, 4, 3, 1, 2],
        baseFret: 7,
      },
      {
        frets: [null, null, 9, 11, 0, 11],
        fingers: [null, null, 1, 3, null, 4],
        baseFret: 9,
      },
      {
        frets: [null, 2, 1, 4, 0, 2],
        fingers: [null, 2, 1, 4, null, 3],
        baseFret: 1,
      },
      {
        frets: [null, 2, 1, 4, 4, 2],
        fingers: [null, 2, 1, 4, 4, 3],
        baseFret: 1,
        barre: { fret: 4, fromString: 3, toString: 4, finger: 4 },
      },
      {
        frets: [7, 6, 4, 4, 4, 7],
        fingers: [3, 2, 1, 1, 1, 4],
        baseFret: 4,
        barre: { fret: 4, fromString: 2, toString: 4, finger: 1 },
      },
      {
        frets: [7, 6, 4, 4, 0, 7],
        fingers: [3, 2, 1, 1, null, 4],
        baseFret: 4,
        barre: { fret: 4, fromString: 2, toString: 3, finger: 1 },
      },
    ];

    expectedVoicings.forEach((expected) => {
      const matches = chord.voicings.filter(
        (candidate) =>
          JSON.stringify(candidate.frets) === JSON.stringify(expected.frets),
      );
      assert.equal(
        matches.length,
        1,
        `Expected exactly one B major shape ${expected.frets.join("-")}`,
      );
      assert.deepEqual(matches[0].fingers, expected.fingers);
      assert.equal(matches[0].baseFret, expected.baseFret);
      assert.deepEqual(matches[0].barre, expected.barre);
      assert.equal(matches[0].barres, undefined);
    });

    const tuning = GUITAR_TUNINGS.find(
      (candidate) => candidate.name === "E Standard",
    );
    assert.ok(tuning);
    assert.equal(
      chord.voicings.some((voicing) => voicing.isFundamental),
      true,
    );
    chord.voicings.forEach((voicing) => {
      const result = validateGuitarVoicing(voicing, chord, tuning);
      assert.deepEqual(result.errors, [], voicing.name);
      voicing.frets.forEach((fret, stringIndex) => {
        if (fret === null || fret === 0) {
          assert.equal(voicing.fingers[stringIndex], null);
        } else {
          assert.ok(
            [1, 2, 3, 4].includes(voicing.fingers[stringIndex]!),
            voicing.name,
          );
        }
      });
    });
  });

  it("includes the complete C major voicings and fingerings", () => {
    const voicings = getChordDefinition("C", "major").voicings;
    const expectedVoicings = [
      {
        frets: [null, 3, 2, 0, 1, 0],
        fingers: [null, 3, 2, null, 1, null],
      },
      {
        frets: [null, 3, 2, 0, 1, 3],
        fingers: [null, 3, 2, null, 1, 4],
      },
      {
        frets: [null, 3, 5, 5, 5, 3],
        fingers: [null, 1, 2, 3, 4, 1],
      },
      {
        frets: [8, 10, 10, 9, 8, 8],
        fingers: [1, 3, 4, 2, 1, 1],
      },
      {
        frets: [null, 3, 5, 0, 5, 3],
        fingers: [null, 1, 3, null, 4, 2],
      },
      {
        frets: [null, 3, 5, 0, 5, 0],
        fingers: [null, 1, 3, null, 4, null],
      },
      {
        frets: [null, 3, 5, 5, 5, 0],
        fingers: [null, 1, 2, 3, 4, null],
      },
      {
        frets: [null, null, 10, 9, 8, 8],
        fingers: [null, null, 4, 3, 1, 2],
      },
    ];

    expectedVoicings.forEach((expected) => {
      const voicing = voicings.find(
        (candidate) =>
          JSON.stringify(candidate.frets) === JSON.stringify(expected.frets),
      );
      assert.ok(voicing, `Missing C major voicing ${expected.frets.join("-")}`);
      assert.deepEqual(voicing.fingers, expected.fingers);
    });

    const aShape = voicings.find(
      (voicing) =>
        JSON.stringify(voicing.frets) === JSON.stringify([null, 3, 5, 5, 5, 3]),
    );
    const eShape = voicings.find(
      (voicing) =>
        JSON.stringify(voicing.frets) === JSON.stringify([8, 10, 10, 9, 8, 8]),
    );

    assert.deepEqual(aShape?.barre, {
      fret: 3,
      fromString: 1,
      toString: 5,
      finger: 1,
    });
    assert.deepEqual(eShape?.barre, {
      fret: 8,
      fromString: 0,
      toString: 5,
      finger: 1,
    });
  });
});
