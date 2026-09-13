import {
  ChordDefinition,
  GuitarVoicing,
  KeyboardVoicing,
  NoteName,
} from "../types";
import {
  ALL_ROOT_NOTES,
  CHROMATIC_SHARPS,
  CHROMATIC_FLATS,
  NOTE_SEMITONES,
} from "./musicTheory";

export interface ChordTypeInfo {
  type: string;
  name: string;
  symbol: string;
  intervals: number[];
  formula: string;
  degrees: string[];
}

export const CHORD_TYPES_CATALOG: ChordTypeInfo[] = [
  {
    type: "major",
    name: "Major",
    symbol: "",
    intervals: [0, 4, 7],
    formula: "1 3 5",
    degrees: ["1", "3", "5"],
  },
  {
    type: "minor",
    name: "Minor",
    symbol: "m",
    intervals: [0, 3, 7],
    formula: "1 b3 5",
    degrees: ["1", "b3", "5"],
  },
  {
    type: "7",
    name: "Dominant 7th",
    symbol: "7",
    intervals: [0, 4, 7, 10],
    formula: "1 3 5 b7",
    degrees: ["1", "3", "5", "b7"],
  },
  {
    type: "maj7",
    name: "Major 7th",
    symbol: "maj7",
    intervals: [0, 4, 7, 11],
    formula: "1 3 5 7",
    degrees: ["1", "3", "5", "7"],
  },
  {
    type: "min7",
    name: "Minor 7th",
    symbol: "m7",
    intervals: [0, 3, 7, 10],
    formula: "1 b3 5 b7",
    degrees: ["1", "b3", "5", "b7"],
  },
  {
    type: "dim",
    name: "Diminished",
    symbol: "dim",
    intervals: [0, 3, 6],
    formula: "1 b3 b5",
    degrees: ["1", "b3", "b5"],
  },
  {
    type: "dim7",
    name: "Diminished 7th",
    symbol: "dim7",
    intervals: [0, 3, 6, 9],
    formula: "1 b3 b5 bb7",
    degrees: ["1", "b3", "b5", "bb7"],
  },
  {
    type: "m7b5",
    name: "Half-Diminished",
    symbol: "m7b5",
    intervals: [0, 3, 6, 10],
    formula: "1 b3 b5 b7",
    degrees: ["1", "b3", "b5", "b7"],
  },
  {
    type: "aug",
    name: "Augmented",
    symbol: "aug",
    intervals: [0, 4, 8],
    formula: "1 3 #5",
    degrees: ["1", "3", "#5"],
  },
  {
    type: "sus2",
    name: "Suspended 2nd",
    symbol: "sus2",
    intervals: [0, 2, 7],
    formula: "1 2 5",
    degrees: ["1", "2", "5"],
  },
  {
    type: "sus4",
    name: "Suspended 4th",
    symbol: "sus4",
    intervals: [0, 5, 7],
    formula: "1 4 5",
    degrees: ["1", "4", "5"],
  },
  {
    type: "add9",
    name: "Add 9",
    symbol: "add9",
    intervals: [0, 4, 7, 14],
    formula: "1 3 5 9",
    degrees: ["1", "3", "5", "9"],
  },
  {
    type: "9",
    name: "Dominant 9th",
    symbol: "9",
    intervals: [0, 4, 7, 10, 14],
    formula: "1 3 5 b7 9",
    degrees: ["1", "3", "5", "b7", "9"],
  },
  {
    type: "11",
    name: "11th",
    symbol: "11",
    intervals: [0, 4, 7, 10, 14, 17],
    formula: "1 3 5 b7 9 11",
    degrees: ["1", "3", "5", "b7", "9", "11"],
  },
  {
    type: "13",
    name: "13th",
    symbol: "13",
    intervals: [0, 4, 7, 10, 14, 21],
    formula: "1 3 5 b7 9 13",
    degrees: ["1", "3", "5", "b7", "9", "13"],
  },
  {
    type: "6",
    name: "Major 6th",
    symbol: "6",
    intervals: [0, 4, 7, 9],
    formula: "1 3 5 6",
    degrees: ["1", "3", "5", "6"],
  },
  {
    type: "min6",
    name: "Minor 6th",
    symbol: "m6",
    intervals: [0, 3, 7, 9],
    formula: "1 b3 5 6",
    degrees: ["1", "b3", "5", "6"],
  },
  {
    type: "7b9",
    name: "7 Flat 9",
    symbol: "7b9",
    intervals: [0, 4, 7, 10, 13],
    formula: "1 3 5 b7 b9",
    degrees: ["1", "3", "5", "b7", "b9"],
  },
  {
    type: "7#9",
    name: "Hendrix 7#9",
    symbol: "7#9",
    intervals: [0, 4, 7, 10, 15],
    formula: "1 3 5 b7 #9",
    degrees: ["1", "3", "5", "b7", "#9"],
  },
];

const getChordLibraryKey = (root: NoteName, typeKey: string): string =>
  `${root}_${typeKey}`;

const buildKeyboardVoicings = (
  root: NoteName,
  chordType: ChordTypeInfo,
): KeyboardVoicing[] => {
  const rootIndex = NOTE_SEMITONES[root];
  const useFlats = ["F", "Bb", "Eb", "Ab", "Db", "Gb"].includes(root);
  const chromatic = useFlats ? CHROMATIC_FLATS : CHROMATIC_SHARPS;

  return chordType.intervals.map((_, inversionIndex) => {
    const invertedIntervals = chordType.intervals.map((interval, index) => ({
      interval: interval + (index < inversionIndex ? 12 : 0),
      degree: chordType.degrees[index],
      isRoot: index === 0,
    }));

    invertedIntervals.sort((a, b) => a.interval - b.interval);

    const keyboardNotes = invertedIntervals.map(
      ({ interval, degree, isRoot }) => {
        const totalSemitones = rootIndex + interval;
        return {
          note: chromatic[totalSemitones % 12],
          octave: 4 + Math.floor(totalSemitones / 12),
          degree,
          isRoot,
        };
      },
    );

    const inversionLabel =
      inversionIndex === 0
        ? "Root Position"
        : `${inversionIndex}${inversionIndex === 1 ? "st" : inversionIndex === 2 ? "nd" : inversionIndex === 3 ? "rd" : "th"} Inversion`;

    return {
      id: `${root}_${chordType.type}_${inversionIndex}`,
      name: `${root}${chordType.symbol} ${inversionLabel}`,
      shortLabel: inversionIndex === 0 ? "Root" : `Inv. ${inversionIndex}`,
      category: inversionIndex === 0 ? "root" : "inversion",
      positionLabel: inversionLabel,
      bassNote: keyboardNotes[0].note,
      bassOctave: keyboardNotes[0].octave,
      notes: keyboardNotes,
      startOctave: 4,
      octavesCount: Math.max(
        2,
        Math.max(...keyboardNotes.map((note) => note.octave)) - 4 + 1,
      ),
      description: `${inversionLabel} voicing`,
    };
  });
};

let CHORD_LIBRARY = new Map<string, ChordDefinition>();

function rebuildDefaultChordLibrary(): Map<string, ChordDefinition> {
  const library = new Map<string, ChordDefinition>();

  for (const root of ALL_ROOT_NOTES) {
    for (const chordType of CHORD_TYPES_CATALOG) {
      library.set(getChordLibraryKey(root, chordType.type), {
        id: `${root}_${chordType.type}`,
        name: `${root}${chordType.symbol}`,
        root,
        type: chordType.type,
        symbol: chordType.symbol,
        fullName: `${root} ${chordType.name}`,
        intervals: chordType.intervals,
        formula: chordType.formula,
        notes: chordType.intervals.map((semitone) => {
          const chromatic = ["F", "Bb", "Eb", "Ab", "Db", "Gb"].includes(root)
            ? CHROMATIC_FLATS
            : CHROMATIC_SHARPS;
          return chromatic[(NOTE_SEMITONES[root] + semitone) % 12];
        }),
        voicings: getChordVoicings(root, chordType.type),
        keyboardVoicings: buildKeyboardVoicings(root, chordType),
      });
    }
  }

  return library;
}

export function resetChordLibrary(): void {
  CHORD_LIBRARY = rebuildDefaultChordLibrary();
}

export function registerChordDefinitions(
  definitions: Array<Partial<ChordDefinition> | ChordDefinition>,
): void {
  for (const definition of definitions) {
    if (!definition || !definition.root || !definition.type) continue;

    const chordType =
      CHORD_TYPES_CATALOG.find((entry) => entry.type === definition.type) ||
      CHORD_TYPES_CATALOG[0];
    const root = definition.root;
    const normalisedDefinition: ChordDefinition = {
      id: definition.id || `${root}_${chordType.type}`,
      name: definition.name || `${root}${chordType.symbol}`,
      root,
      type: chordType.type,
      symbol: definition.symbol || chordType.symbol,
      fullName: definition.fullName || `${root} ${chordType.name}`,
      intervals:
        definition.intervals && definition.intervals.length > 0
          ? definition.intervals
          : chordType.intervals,
      formula: definition.formula || chordType.formula,
      notes:
        definition.notes && definition.notes.length > 0
          ? definition.notes
          : chordType.intervals.map((semitone) => {
              const chromatic = ["F", "Bb", "Eb", "Ab", "Db", "Gb"].includes(
                root,
              )
                ? CHROMATIC_FLATS
                : CHROMATIC_SHARPS;
              return chromatic[(NOTE_SEMITONES[root] + semitone) % 12];
            }),
      voicings:
        definition.voicings && definition.voicings.length > 0
          ? definition.voicings
          : getChordVoicings(root, chordType.type),
      keyboardVoicings:
        definition.keyboardVoicings && definition.keyboardVoicings.length > 0
          ? definition.keyboardVoicings
          : buildKeyboardVoicings(root, chordType),
    };

    CHORD_LIBRARY.set(
      getChordLibraryKey(root, chordType.type),
      normalisedDefinition,
    );
  }
}

export function exportChordLibrary(): ChordDefinition[] {
  return [...CHORD_LIBRARY.values()].sort((a, b) => {
    if (a.root === b.root) {
      return a.type.localeCompare(b.type);
    }
    return ALL_ROOT_NOTES.indexOf(a.root) - ALL_ROOT_NOTES.indexOf(b.root);
  });
}

export function importChordLibrary(
  value: string | Array<Partial<ChordDefinition> | ChordDefinition>,
): void {
  const parsed = typeof value === "string" ? JSON.parse(value) : value;
  if (!Array.isArray(parsed)) {
    throw new Error(
      "Chord library import requires an array of chord definitions.",
    );
  }
  registerChordDefinitions(parsed);
}

export function exportSavedCustomChords(): ChordDefinition[] {
  const customChords = getCustomChords();

  return customChords.map((chord) => {
    const baseDefinition = getChordDefinition(chord.root, chord.chordType);
    const chordTypeInfo =
      CHORD_TYPES_CATALOG.find((entry) => entry.type === chord.chordType) ||
      CHORD_TYPES_CATALOG[0];

    const exportedVoicings: GuitarVoicing[] = chord.voicing
      ? [chord.voicing]
      : [];
    const exportedKeyboardVoicings: KeyboardVoicing[] = chord.pianoVoicing
      ? [chord.pianoVoicing]
      : [];

    return {
      id: `${chord.root}_${chord.chordType}_${chord.id}`,
      name: chord.pianoVoicing?.name || chord.voicing.name,
      root: chord.root,
      type: chord.chordType,
      symbol: chordTypeInfo.symbol,
      fullName: `${chord.root} ${chordTypeInfo.name}`,
      intervals: baseDefinition.intervals,
      formula: baseDefinition.formula,
      notes: baseDefinition.notes,
      voicings: exportedVoicings,
      keyboardVoicings: exportedKeyboardVoicings,
    };
  });
}

resetChordLibrary();

// Helper to generate voicings for standard tunings across all roots
export function getChordVoicings(
  root: NoteName,
  chordType: string,
): GuitarVoicing[] {
  const voicings: GuitarVoicing[] = [];

  // Normalize chord type for lookup
  const typeKey =
    chordType === "m" ? "minor" : chordType === "m7" ? "min7" : chordType;

  const SHAPE_OFFSETS: Record<
    string,
    { e?: (number | null)[]; a?: (number | null)[] }
  > = {
    major: { e: [0, 2, 2, 1, 0, 0], a: [null, 0, 2, 2, 2, 0] },
    minor: { e: [0, 2, 2, 0, 0, 0], a: [null, 0, 2, 2, 1, 0] },
    "7": { e: [0, 2, 0, 1, 0, 0], a: [null, 0, 2, 0, 2, 0] },
    maj7: { e: [0, null, 1, 1, 0, null], a: [null, 0, 2, 1, 2, 0] },
    min7: { e: [0, 2, 0, 0, 0, 0], a: [null, 0, 2, 0, 1, 0] },
    dim: { e: [0, null, 2, 0, -1, null], a: [null, 0, 1, 2, 1, null] },
    dim7: { e: [0, null, -1, 0, -1, null], a: [null, 0, 1, -1, 1, null] },
    m7b5: { e: [0, null, 0, 0, -1, null], a: [null, 0, 1, 0, 1, null] },
    aug: { e: [0, null, 2, 1, 1, null], a: [null, 0, -1, -2, -2, null] },
    sus2: { e: [0, 2, 4, 4, 0, 0], a: [null, 0, 2, 2, 0, 0] },
    sus4: { e: [0, 2, 2, 2, 0, 0], a: [null, 0, 2, 2, 3, 0] },
    add9: { e: [0, 2, 4, 1, 0, 0], a: [null, 0, 2, 4, 2, 0] },
    "9": { e: [0, null, 0, -1, 0, 0], a: [null, 0, -1, 0, 0, null] },
    "11": { e: [0, null, 0, 1, -2, null], a: [null, 0, 0, 0, 0, null] },
    "13": { e: [0, null, 0, 1, 2, null], a: [null, 0, -1, 0, 2, null] },
    "6": { e: [0, null, -1, 1, 0, null], a: [null, 0, 2, -1, 2, null] },
    min6: { e: [0, null, -1, 0, 0, null], a: [null, 0, 2, -1, 1, null] },
    "7b9": { e: [0, null, 0, 1, null, 1], a: [null, 0, -1, 0, -1, null] },
    "7#9": { e: [0, null, 0, 1, null, 3], a: [null, 0, -1, 0, 1, null] },
  };

  const offsets = SHAPE_OFFSETS[typeKey];

  // 1. Handcrafted Open Shapes (highest priority fundamental)
  const openShapes: Record<string, Record<string, Partial<GuitarVoicing>>> = {
    C: {
      major: {
        name: "C Open Major",
        positionLabel: "Open Position",
        rootString: "Root: 5th String",
        frets: [null, 3, 2, 0, 1, 0],
        fingers: [null, 3, 2, null, 1, null],
        baseFret: 1,
      },
      "7": {
        name: "C7 Open",
        positionLabel: "Open Position",
        rootString: "Root: 5th String",
        frets: [null, 3, 2, 3, 1, 0],
        fingers: [null, 3, 2, 4, 1, null],
        baseFret: 1,
      },
      maj7: {
        name: "Cmaj7 Open",
        positionLabel: "Open Position",
        rootString: "Root: 5th String",
        frets: [null, 3, 2, 0, 0, 0],
        fingers: [null, 3, 2, null, null, null],
        baseFret: 1,
      },
    },
    A: {
      major: {
        name: "A Open Major",
        positionLabel: "Open Position",
        rootString: "Root: 5th String",
        frets: [null, 0, 2, 2, 2, 0],
        fingers: [null, null, 1, 2, 3, null],
        baseFret: 1,
      },
      minor: {
        name: "Am Open Minor",
        positionLabel: "Open Position",
        rootString: "Root: 5th String",
        frets: [null, 0, 2, 2, 1, 0],
        fingers: [null, null, 2, 3, 1, null],
        baseFret: 1,
      },
      "7": {
        name: "A7 Open",
        positionLabel: "Open Position",
        rootString: "Root: 5th String",
        frets: [null, 0, 2, 0, 2, 0],
        fingers: [null, null, 2, null, 3, null],
        baseFret: 1,
      },
      min7: {
        name: "Am7 Open",
        positionLabel: "Open Position",
        rootString: "Root: 5th String",
        frets: [null, 0, 2, 0, 1, 0],
        fingers: [null, null, 2, null, 1, null],
        baseFret: 1,
      },
      maj7: {
        name: "Amaj7 Open",
        positionLabel: "Open Position",
        rootString: "Root: 5th String",
        frets: [null, 0, 2, 1, 2, 0],
        fingers: [null, null, 2, 1, 3, null],
        baseFret: 1,
      },
      sus2: {
        name: "Asus2 Open",
        positionLabel: "Open Position",
        rootString: "Root: 5th String",
        frets: [null, 0, 2, 2, 0, 0],
        fingers: [null, null, 2, 3, null, null],
        baseFret: 1,
      },
      sus4: {
        name: "Asus4 Open",
        positionLabel: "Open Position",
        rootString: "Root: 5th String",
        frets: [null, 0, 2, 2, 3, 0],
        fingers: [null, null, 1, 2, 3, null],
        baseFret: 1,
      },
    },
    G: {
      major: {
        name: "G Open Major",
        positionLabel: "Open Position",
        rootString: "Root: 6th String",
        frets: [3, 2, 0, 0, 0, 3],
        fingers: [2, 1, null, null, null, 3],
        baseFret: 1,
      },
      "7": {
        name: "G7 Open",
        positionLabel: "Open Position",
        rootString: "Root: 6th String",
        frets: [3, 2, 0, 0, 0, 1],
        fingers: [3, 2, null, null, null, 1],
        baseFret: 1,
      },
      maj7: {
        name: "Gmaj7 Open",
        positionLabel: "Open Position",
        rootString: "Root: 6th String",
        frets: [3, 2, 0, 0, 0, 2],
        fingers: [3, 2, null, null, null, 1],
        baseFret: 1,
      },
    },
    E: {
      major: {
        name: "E Open Major",
        positionLabel: "Open Position",
        rootString: "Root: 6th String",
        frets: [0, 2, 2, 1, 0, 0],
        fingers: [null, 2, 3, 1, null, null],
        baseFret: 1,
      },
      minor: {
        name: "Em Open Minor",
        positionLabel: "Open Position",
        rootString: "Root: 6th String",
        frets: [0, 2, 2, 0, 0, 0],
        fingers: [null, 2, 3, null, null, null],
        baseFret: 1,
      },
      "7": {
        name: "E7 Open",
        positionLabel: "Open Position",
        rootString: "Root: 6th String",
        frets: [0, 2, 0, 1, 0, 0],
        fingers: [null, 2, null, 1, null, null],
        baseFret: 1,
      },
      min7: {
        name: "Em7 Open",
        positionLabel: "Open Position",
        rootString: "Root: 6th String",
        frets: [0, 2, 0, 0, 0, 0],
        fingers: [null, 2, null, null, null, null],
        baseFret: 1,
      },
      maj7: {
        name: "Emaj7 Open",
        positionLabel: "Open Position",
        rootString: "Root: 6th String",
        frets: [0, 2, 1, 1, 0, 0],
        fingers: [null, 3, 1, 2, null, null],
        baseFret: 1,
      },
    },
    D: {
      major: {
        name: "D Open Major",
        positionLabel: "Open Position",
        rootString: "Root: 4th String",
        frets: [null, null, 0, 2, 3, 2],
        fingers: [null, null, null, 1, 3, 2],
        baseFret: 1,
      },
      minor: {
        name: "Dm Open Minor",
        positionLabel: "Open Position",
        rootString: "Root: 4th String",
        frets: [null, null, 0, 2, 3, 1],
        fingers: [null, null, null, 2, 3, 1],
        baseFret: 1,
      },
      "7": {
        name: "D7 Open",
        positionLabel: "Open Position",
        rootString: "Root: 4th String",
        frets: [null, null, 0, 2, 1, 2],
        fingers: [null, null, null, 2, 1, 3],
        baseFret: 1,
      },
      min7: {
        name: "Dm7 Open",
        positionLabel: "Open Position",
        rootString: "Root: 4th String",
        frets: [null, null, 0, 2, 1, 1],
        fingers: [null, null, null, 2, 1, 1],
        baseFret: 1,
        barre: { fret: 1, fromString: 4, toString: 5, finger: 1 },
      },
      maj7: {
        name: "Dmaj7 Open",
        positionLabel: "Open Position",
        rootString: "Root: 4th String",
        frets: [null, null, 0, 2, 2, 2],
        fingers: [null, null, null, 1, 1, 1],
        baseFret: 1,
        barre: { fret: 2, fromString: 3, toString: 5, finger: 1 },
      },
      sus2: {
        name: "Dsus2 Open",
        positionLabel: "Open Position",
        rootString: "Root: 4th String",
        frets: [null, null, 0, 2, 3, 0],
        fingers: [null, null, null, 1, 3, null],
        baseFret: 1,
      },
      sus4: {
        name: "Dsus4 Open",
        positionLabel: "Open Position",
        rootString: "Root: 4th String",
        frets: [null, null, 0, 2, 3, 3],
        fingers: [null, null, null, 1, 3, 4],
        baseFret: 1,
      },
    },
    B: {
      "7": {
        name: "B7 Open",
        positionLabel: "Open Position",
        rootString: "Root: 5th String",
        frets: [null, 2, 1, 2, 0, 2],
        fingers: [null, 2, 1, 3, null, 4],
        baseFret: 1,
      },
    },
    F: {
      major: {
        name: "F Major (Mini Barre)",
        positionLabel: "First Position",
        rootString: "Root: 4th String",
        frets: [null, null, 3, 2, 1, 1],
        fingers: [null, null, 3, 2, 1, 1],
        baseFret: 1,
        barre: { fret: 1, fromString: 4, toString: 5, finger: 1 },
      },
      maj7: {
        name: "Fmaj7 Open",
        positionLabel: "Open Position",
        rootString: "Root: 4th String",
        frets: [null, null, 3, 2, 1, 0],
        fingers: [null, null, 3, 2, 1, null],
        baseFret: 1,
      },
    },
  };

  const rootIdx = NOTE_SEMITONES[root];
  const fretOn6th = (rootIdx - NOTE_SEMITONES["E"] + 12) % 12;
  const fretOn5th = (rootIdx - NOTE_SEMITONES["A"] + 12) % 12;

  let fundamentalAdded = false;

  // 1A. Add explicit open/fundamental shape if handcrafted
  if (openShapes[root] && openShapes[root][typeKey]) {
    voicings.push({
      ...openShapes[root][typeKey],
      isFundamental: true,
      category: "fundamental-open",
    } as GuitarVoicing);
    fundamentalAdded = true;
  } else if (offsets) {
    // 1B. Deduce lowest standard barre shape for roots lacking an explicit open shape
    const eFret = fretOn6th > 0 ? fretOn6th : 12;
    const aFret = fretOn5th > 0 ? fretOn5th : 12;

    // Attempt E-shape if it's lower, otherwise A-shape
    if (eFret <= aFret && offsets.e && eFret < 12) {
      const frets = offsets.e.map((o) => (o === null ? null : fretOn6th + o));
      if (frets.every((f) => f === null || f >= 0)) {
        voicings.push({
          name: `${root}${chordType} (First Position Barre)`,
          positionLabel: "First Position",
          rootString: "Root: 6th String",
          frets: frets,
          fingers: frets.map(() => null),
          baseFret: fretOn6th,
          barre:
            typeKey === "major" ||
            typeKey === "minor" ||
            typeKey === "7" ||
            typeKey === "min7"
              ? { fret: fretOn6th, fromString: 0, toString: 5, finger: 1 }
              : undefined,
          isFundamental: true,
          category: "fundamental-barre",
        });
        fundamentalAdded = true;
      }
    }

    if (!fundamentalAdded && offsets.a && aFret < 12) {
      const frets = offsets.a.map((o) => (o === null ? null : fretOn5th + o));
      if (frets.every((f) => f === null || f >= 0)) {
        voicings.push({
          name: `${root}${chordType} (First Position Barre)`,
          positionLabel: "First Position",
          rootString: "Root: 5th String",
          frets: frets,
          fingers: frets.map(() => null),
          baseFret: fretOn5th,
          barre:
            typeKey === "major" ||
            typeKey === "minor" ||
            typeKey === "7" ||
            typeKey === "min7"
              ? { fret: fretOn5th, fromString: 1, toString: 5, finger: 1 }
              : undefined,
          isFundamental: true,
          category: "fundamental-barre",
        });
        fundamentalAdded = true;
      }
    }

    // Fallback try E again if A failed and E wasn't tried yet
    if (!fundamentalAdded && offsets.e && eFret > aFret && eFret < 12) {
      const frets = offsets.e.map((o) => (o === null ? null : fretOn6th + o));
      if (frets.every((f) => f === null || f >= 0)) {
        voicings.push({
          name: `${root}${chordType} (First Position Barre)`,
          positionLabel: "First Position",
          rootString: "Root: 6th String",
          frets: frets,
          fingers: frets.map(() => null),
          baseFret: fretOn6th,
          barre:
            typeKey === "major" ||
            typeKey === "minor" ||
            typeKey === "7" ||
            typeKey === "min7"
              ? { fret: fretOn6th, fromString: 0, toString: 5, finger: 1 }
              : undefined,
          isFundamental: true,
          category: "fundamental-barre",
        });
        fundamentalAdded = true;
      }
    }
  }

  // 2. Movable CAGED Variations
  if (offsets) {
    const hasE = voicings.some(
      (v) => v.baseFret === fretOn6th && v.rootString.includes("6th"),
    );
    if (!hasE && offsets.e && fretOn6th > 0) {
      const frets = offsets.e.map((o) => (o === null ? null : fretOn6th + o));
      if (frets.every((f) => f === null || f >= 0)) {
        voicings.push({
          name: `${root}${chordType} (E-Shape)`,
          positionLabel: "Barre 6th String",
          rootString: "Root: 6th String",
          frets: frets,
          fingers: frets.map(() => null),
          baseFret: fretOn6th,
          barre:
            typeKey === "major" ||
            typeKey === "minor" ||
            typeKey === "7" ||
            typeKey === "min7"
              ? { fret: fretOn6th, fromString: 0, toString: 5, finger: 1 }
              : undefined,
          isFundamental: false,
          category: "CAGED",
        });
      }
    }

    const hasA = voicings.some(
      (v) => v.baseFret === fretOn5th && v.rootString.includes("5th"),
    );
    if (!hasA && offsets.a && fretOn5th > 0) {
      const frets = offsets.a.map((o) => (o === null ? null : fretOn5th + o));
      if (frets.every((f) => f === null || f >= 0)) {
        voicings.push({
          name: `${root}${chordType} (A-Shape)`,
          positionLabel: "Barre 5th String",
          rootString: "Root: 5th String",
          frets: frets,
          fingers: frets.map(() => null),
          baseFret: fretOn5th,
          barre:
            typeKey === "major" ||
            typeKey === "minor" ||
            typeKey === "7" ||
            typeKey === "min7"
              ? { fret: fretOn5th, fromString: 1, toString: 5, finger: 1 }
              : undefined,
          isFundamental: false,
          category: "CAGED",
        });
      }
    }
  }

  // 3. Drop 2 / D-Shape (Variations)
  if (["major", "minor", "7", "min7"].includes(typeKey)) {
    const fretOn4th = (rootIdx - NOTE_SEMITONES["D"] + 12) % 12;
    if (fretOn4th > 0) {
      const offsets4 = {
        major: [null, null, 0, 2, 3, 2],
        minor: [null, null, 0, 2, 3, 1],
        "7": [null, null, 0, 2, 1, 2],
        min7: [null, null, 0, 2, 1, 1],
      }[typeKey];

      if (offsets4) {
        const frets = offsets4.map((o) => (o === null ? null : fretOn4th + o));
        voicings.push({
          name: `${root}${chordType} (D-Shape)`,
          positionLabel: "Drop 2 / 4th String",
          rootString: "Root: 4th String",
          frets: frets,
          fingers: frets.map(() => null),
          baseFret: fretOn4th,
          isFundamental: false,
          category: "variation",
        });
      }
    }
  }

  // Fallback for missing fundamental (should rarely happen for standard 19 types, but safety net)
  if (voicings.length > 0 && !voicings.some((v) => v.isFundamental)) {
    voicings[0].isFundamental = true;
    voicings[0].category = "fundamental-barre"; // guess
  }

  return voicings;
}

export interface CustomChord {
  id: string;
  root: NoteName;
  chordType: string;
  voicing: GuitarVoicing;
  fretCount?: number;
  pianoVoicing?: KeyboardVoicing;
  instrument?: "guitar" | "piano";
}

const CUSTOM_CHORDS_KEY = "Mousi9ti_custom_chords_v1";

export function getCustomChords(): CustomChord[] {
  if (typeof localStorage === "undefined") {
    return [];
  }

  try {
    const raw = localStorage.getItem(CUSTOM_CHORDS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as CustomChord[];
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error("Failed to load custom chords", error);
    return [];
  }
}

export function saveCustomChord(chord: CustomChord): void {
  if (typeof localStorage === "undefined") return;

  try {
    const existing = getCustomChords();
    const updated = [...existing, chord];
    localStorage.setItem(CUSTOM_CHORDS_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent("mousi9ti-custom-chords-changed"));
  } catch (error) {
    console.error("Failed to save custom chord", error);
  }
}

export function importCustomChords(
  value: string | Array<Partial<ChordDefinition> | ChordDefinition>,
): number {
  const parsed = typeof value === "string" ? JSON.parse(value) : value;
  if (!Array.isArray(parsed)) {
    throw new Error(
      "Custom chord import requires an array of chord definitions.",
    );
  }

  const imported: CustomChord[] = [];
  parsed.forEach((definition, definitionIndex) => {
    if (
      !definition ||
      typeof definition.root !== "string" ||
      typeof definition.type !== "string"
    ) {
      throw new Error(
        `Invalid chord definition at index ${definitionIndex}: root and type are required.`,
      );
    }

    const chordType = CHORD_TYPES_CATALOG.some(
      (entry) => entry.type === definition.type,
    )
      ? definition.type
      : "major";
    const guitarVoicings: GuitarVoicing[] = Array.isArray(definition.voicings)
      ? (definition.voicings as GuitarVoicing[])
      : [];
    const pianoVoicings: KeyboardVoicing[] = Array.isArray(
      definition.keyboardVoicings,
    )
      ? (definition.keyboardVoicings as KeyboardVoicing[])
      : [];
    const fallbackVoicing: GuitarVoicing = {
      name: definition.name || `${definition.root} chord`,
      positionLabel: "Imported Chord",
      rootString: "Root: 6th String",
      baseFret: 1,
      frets: [null, null, null, null, null, null],
      fingers: [null, null, null, null, null, null],
      barres: [],
    };

    guitarVoicings.forEach((voicing, voicingIndex) => {
      imported.push({
        id: `custom-import-${Date.now()}-${definitionIndex}-guitar-${voicingIndex}`,
        root: definition.root as NoteName,
        chordType,
        voicing,
        instrument: "guitar",
      });
    });

    pianoVoicings.forEach((pianoVoicing, voicingIndex) => {
      imported.push({
        id: `custom-import-${Date.now()}-${definitionIndex}-piano-${voicingIndex}`,
        root: definition.root as NoteName,
        chordType,
        voicing: guitarVoicings[0] || fallbackVoicing,
        pianoVoicing,
        instrument: "piano",
      });
    });

    if (guitarVoicings.length === 0 && pianoVoicings.length === 0) {
      imported.push({
        id: `custom-import-${Date.now()}-${definitionIndex}-guitar`,
        root: definition.root as NoteName,
        chordType,
        voicing: fallbackVoicing,
        instrument: "guitar",
      });
    }
  });

  if (typeof localStorage !== "undefined" && imported.length > 0) {
    const updated = [...getCustomChords(), ...imported];
    localStorage.setItem(CUSTOM_CHORDS_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent("mousi9ti-custom-chords-changed"));
  }

  return imported.length;
}

export function deleteCustomChord(id: string): void {
  if (typeof localStorage === "undefined") return;

  try {
    const existing = getCustomChords();
    localStorage.setItem(
      CUSTOM_CHORDS_KEY,
      JSON.stringify(existing.filter((chord) => chord.id !== id)),
    );
    window.dispatchEvent(new CustomEvent("mousi9ti-custom-chords-changed"));
  } catch (error) {
    console.error("Failed to delete custom chord", error);
  }
}

export function getChordDefinition(
  root: NoteName,
  typeKey: string,
): ChordDefinition {
  const chordType =
    CHORD_TYPES_CATALOG.find((c) => c.type === typeKey) ||
    CHORD_TYPES_CATALOG[0];

  const key = getChordLibraryKey(root, chordType.type);
  const existing = CHORD_LIBRARY.get(key);

  if (existing) {
    return existing;
  }

  const rootIndex = NOTE_SEMITONES[root];
  const useFlats = ["F", "Bb", "Eb", "Ab", "Db", "Gb"].includes(root);
  const chromatic = useFlats ? CHROMATIC_FLATS : CHROMATIC_SHARPS;

  const notes: NoteName[] = chordType.intervals.map((semitone) => {
    return chromatic[(rootIndex + semitone) % 12];
  });

  const keyboardVoicings: KeyboardVoicing[] = chordType.intervals.map(
    (_, inversionIndex) => {
      const invertedIntervals = chordType.intervals.map((interval, index) => ({
        interval: interval + (index < inversionIndex ? 12 : 0),
        degree: chordType.degrees[index],
        isRoot: index === 0,
      }));
      invertedIntervals.sort((a, b) => a.interval - b.interval);

      const keyboardNotes = invertedIntervals.map(
        ({ interval, degree, isRoot }) => {
          const totalSemitones = rootIndex + interval;
          return {
            note: chromatic[totalSemitones % 12],
            octave: 4 + Math.floor(totalSemitones / 12),
            degree,
            isRoot,
          };
        },
      );
      const inversionLabel =
        inversionIndex === 0
          ? "Root Position"
          : `${inversionIndex}${inversionIndex === 1 ? "st" : inversionIndex === 2 ? "nd" : inversionIndex === 3 ? "rd" : "th"} Inversion`;

      return {
        id: `${root}_${chordType.type}_${inversionIndex}`,
        name: `${root}${chordType.symbol} ${inversionLabel}`,
        shortLabel: inversionIndex === 0 ? "Root" : `Inv. ${inversionIndex}`,
        category: inversionIndex === 0 ? "root" : "inversion",
        positionLabel: inversionLabel,
        bassNote: keyboardNotes[0].note,
        bassOctave: keyboardNotes[0].octave,
        notes: keyboardNotes,
        startOctave: 4,
        octavesCount: Math.max(
          2,
          Math.max(...keyboardNotes.map((note) => note.octave)) - 4 + 1,
        ),
        description: `${inversionLabel} voicing`,
      };
    },
  );

  const generated = {
    id: `${root}_${chordType.type}`,
    name: `${root}${chordType.symbol}`,
    root: root,
    type: chordType.type,
    symbol: chordType.symbol,
    fullName: `${root} ${chordType.name}`,
    intervals: chordType.intervals,
    formula: chordType.formula,
    notes,
    voicings: getChordVoicings(root, chordType.type),
    keyboardVoicings,
  };

  CHORD_LIBRARY.set(key, generated);
  return generated;
}
