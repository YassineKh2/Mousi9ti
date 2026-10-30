import type { ChordDefinition, GuitarVoicing, NoteName } from "../types";
import { CHORD_TYPES_CATALOG, type ChordTypeInfo } from "../data/chordsData";
import { CHROMATIC_SHARPS, NOTE_SEMITONES } from "../data/musicTheory";
import { BASS_STANDARD_TUNING, getFrettedNote } from "./frettedInstrument";

export function getVoicingPitches(voicing: GuitarVoicing) {
  return voicing.frets.flatMap((storedFret, stringIndex) => {
    let fret = storedFret;
    for (const barre of voicing.barres?.length ? voicing.barres : voicing.barre ? [voicing.barre] : []) {
      if (stringIndex >= barre.fromString && stringIndex <= barre.toString) {
        fret = Math.max(fret ?? 0, barre.fret);
      }
    }
    return fret === null ? [] : [getFrettedNote(BASS_STANDARD_TUNING, stringIndex, fret)];
  });
}

function definingIntervals(chordType: ChordTypeInfo) {
  return chordType.intervals.filter((interval, index) => {
    const degree = chordType.degrees[index];
    return degree.includes("3") || degree.includes("7") || degree === "6" || degree.includes("b5") || degree.includes("#5") ||
      (interval > 12 && index === chordType.intervals.length - 1);
  }).map(interval => interval % 12);
}

const cache = new Map<string, GuitarVoicing[]>();

export function getBassVoicings(chord: ChordDefinition): GuitarVoicing[] {
  if (chord.bassVoicings) return chord.bassVoicings;
  const key = `${chord.root}:${chord.type}`;
  const cached = cache.get(key);
  if (cached) return cached;
  const chordType = CHORD_TYPES_CATALOG.find(entry => entry.type === chord.type);
  if (!chordType) return [];
  const rootPitch = NOTE_SEMITONES[chord.root];
  const allowed = chordType.intervals.map(interval => interval % 12);
  const required = [...new Set([0, ...definingIntervals(chordType)])];
  const candidates: GuitarVoicing[] = [];
  const seen = new Set<string>();
  for (let start = 1; start <= 20; start++) {
    const options = BASS_STANDARD_TUNING.strings.map((_, stringIndex) =>
      [null, 0, ...Array.from({ length: Math.min(4, 21 - start) }, (_, offset) => start + offset)]
        .filter(fret => fret === null || allowed.includes((getFrettedNote(BASS_STANDARD_TUNING, stringIndex, fret).midi - rootPitch + 120) % 12)),
    );
    const visit = (frets: (number | null)[]) => {
      if (frets.length < 4) {
        for (const fret of options[frets.length]) visit([...frets, fret]);
        return;
      }
      const signature = frets.join(",");
      if (seen.has(signature)) return;
      seen.add(signature);
      const pitches = frets.flatMap((fret, index) => fret === null ? [] : [getFrettedNote(BASS_STANDARD_TUNING, index, fret)]);
      const present = new Set(pitches.map(pitch => (pitch.midi - rootPitch + 120) % 12));
      if (present.size < Math.min(4, allowed.length) || !required.every(interval => present.has(interval))) return;
      const stopped = frets.filter((fret): fret is number => fret !== null && fret > 0);
      const bass = pitches.reduce((lowest, pitch) => pitch.midi < lowest.midi ? pitch : lowest);
      const omittedDegrees = chordType.degrees.filter((_, index) => !present.has(allowed[index]));
      candidates.push({
        instrument: "bass", name: `${chord.name} bass`,
        positionLabel: `${omittedDegrees.length ? "Reduced" : "Complete"} · ${stopped.length ? Math.min(...stopped) : 1}fr`,
        rootString: `Bass: ${bass.note}${bass.octave}`,
        frets, fingers: frets.map(() => null), baseFret: stopped.length ? Math.min(...stopped) : 1,
        omittedDegrees,
      });
    };
    visit([]);
  }
  candidates.sort((left, right) => left.baseFret - right.baseFret || left.frets.filter(fret => fret !== null).length - right.frets.filter(fret => fret !== null).length);
  const result = candidates.slice(0, 12);
  cache.set(key, result);
  return result;
}

export interface BassChordCandidate {
  root: NoteName;
  type: string;
  name: string;
  match: "exact" | "contextual";
  omittedDegrees: string[];
  bassNote: NoteName;
  bassOctave: number;
}

export function recognizeBassChord(voicing: GuitarVoicing): BassChordCandidate[] {
  const pitches = getVoicingPitches(voicing);
  if (!pitches.length) return [];
  const bass = pitches.reduce((lowest, pitch) => pitch.midi < lowest.midi ? pitch : lowest);
  const present = new Set(pitches.map(pitch => pitch.midi % 12));
  const candidates: BassChordCandidate[] = [];
  for (const root of CHROMATIC_SHARPS) {
    for (const chordType of CHORD_TYPES_CATALOG) {
      const allowed = chordType.intervals.map(interval => (NOTE_SEMITONES[root] + interval) % 12);
      if (![...present].every(pitch => allowed.includes(pitch))) continue;
      const omittedDegrees = chordType.degrees.filter((_, index) => !present.has(allowed[index]));
      if (omittedDegrees.length && (present.size < 3 || !definingIntervals(chordType).every(interval => present.has((NOTE_SEMITONES[root] + interval) % 12)))) continue;
      candidates.push({ root, type: chordType.type, name: `${root}${chordType.symbol}`, match: omittedDegrees.length ? "contextual" : "exact", omittedDegrees, bassNote: bass.note, bassOctave: bass.octave });
    }
  }
  return candidates.sort((left, right) => Number(left.match !== "exact") - Number(right.match !== "exact") || left.omittedDegrees.length - right.omittedDegrees.length);
}