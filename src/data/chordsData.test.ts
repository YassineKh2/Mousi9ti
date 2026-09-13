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
});
