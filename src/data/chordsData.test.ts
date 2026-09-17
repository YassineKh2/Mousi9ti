import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
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
        JSON.stringify(voicing.frets) ===
        JSON.stringify([null, 3, 5, 5, 5, 3]),
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
