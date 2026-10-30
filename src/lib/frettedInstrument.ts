import { CHROMATIC_SHARPS, GUITAR_TUNINGS, NOTE_SEMITONES } from "../data/musicTheory";
import type { NoteName, PracticeInstrument, Tuning } from "../types";

export const BASS_STANDARD_TUNING: Tuning = {
  name: "Standard Bass",
  strings: ["E", "A", "D", "G"],
  octaves: [1, 1, 2, 2],
};

export type FrettedInstrument = "guitar" | "bass";
export type InstrumentDisplay = PracticeInstrument | "both";

export function getInstrumentTunings(instrument: FrettedInstrument): Tuning[] {
  return instrument === "bass" ? [BASS_STANDARD_TUNING] : GUITAR_TUNINGS;
}

export function getFrettedNote(tuning: Tuning, stringIndex: number, fret: number) {
  const openNote = tuning.strings[stringIndex];
  const openOctave = tuning.octaves[stringIndex];
  if (openNote === undefined || openOctave === undefined || !Number.isInteger(fret) || fret < 0) {
    throw new RangeError("Invalid string or fret");
  }
  const midi = (openOctave + 1) * 12 + NOTE_SEMITONES[openNote] + fret;
  return {
    note: CHROMATIC_SHARPS[midi % 12] as NoteName,
    octave: Math.floor(midi / 12) - 1,
    midi,
  };
}