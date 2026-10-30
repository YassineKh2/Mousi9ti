import assert from "node:assert/strict";
import { it } from "node:test";
import { BASS_STANDARD_TUNING, getFrettedNote, getInstrumentTunings } from "./frettedInstrument";

it("maps exactly four standard bass strings to sounding E1 A1 D2 G2", () => {
  assert.deepEqual(BASS_STANDARD_TUNING.strings.map((_, index) => getFrettedNote(BASS_STANDARD_TUNING, index, 0).midi), [28, 33, 38, 43]);
  assert.deepEqual(BASS_STANDARD_TUNING.strings.map((_, index) => getFrettedNote(BASS_STANDARD_TUNING, index, 12).midi), [40, 45, 50, 55]);
  assert.deepEqual(getFrettedNote(BASS_STANDARD_TUNING, 0, 8), { note: "C", octave: 2, midi: 36 });
  assert.equal(getInstrumentTunings("bass").length, 1);
  assert.equal(getInstrumentTunings("guitar")[0].strings.length, 6);
  assert.throws(() => getFrettedNote(BASS_STANDARD_TUNING, 4, 0), RangeError);
});