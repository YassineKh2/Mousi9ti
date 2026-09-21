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
  if (root === "Db") {
    return getChordVoicings("C#", chordType);
  }

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

  if (root === "C" && typeKey === "major") {
    const aShape = voicings.find(
      (voicing) => voicing.frets.join(",") === [null, 3, 5, 5, 5, 3].join(","),
    );
    if (aShape) {
      aShape.fingers = [null, 1, 2, 3, 4, 1];
      aShape.barre = { fret: 3, fromString: 1, toString: 5, finger: 1 };
    }

    const eShape = voicings.find(
      (voicing) => voicing.frets.join(",") === [8, 10, 10, 9, 8, 8].join(","),
    );
    if (eShape) {
      eShape.fingers = [1, 3, 4, 2, 1, 1];
      eShape.barre = { fret: 8, fromString: 0, toString: 5, finger: 1 };
    }

    voicings.push(
      {
        name: "C Major Open Variation",
        positionLabel: "Open Position Variation",
        rootString: "Root: 5th String",
        frets: [null, 3, 2, 0, 1, 3],
        fingers: [null, 3, 2, null, 1, 4],
        baseFret: 1,
        category: "variation",
        isFundamental: false,
      },
      {
        name: "C Major 3rd Position Open G",
        positionLabel: "3rd Position / Open G",
        rootString: "Root: 5th String",
        frets: [null, 3, 5, 0, 5, 3],
        fingers: [null, 1, 3, null, 4, 2],
        baseFret: 3,
        category: "variation",
        isFundamental: false,
      },
      {
        name: "C Major 3rd Position Open Strings",
        positionLabel: "3rd Position / Open G and E",
        rootString: "Root: 5th String",
        frets: [null, 3, 5, 0, 5, 0],
        fingers: [null, 1, 3, null, 4, null],
        baseFret: 3,
        category: "variation",
        isFundamental: false,
      },
      {
        name: "C Major 3rd Position Open E",
        positionLabel: "3rd Position / Open E",
        rootString: "Root: 5th String",
        frets: [null, 3, 5, 5, 5, 0],
        fingers: [null, 1, 2, 3, 4, null],
        baseFret: 3,
        category: "variation",
        isFundamental: false,
      },
      {
        name: "C Major 8th Position",
        positionLabel: "8th Position / Top Four Strings",
        rootString: "Root: 4th String",
        frets: [null, null, 10, 9, 8, 8],
        fingers: [null, null, 4, 3, 1, 2],
        baseFret: 8,
        category: "variation",
        isFundamental: false,
      },
    );
  }

  if (root === "D" && typeKey === "major") {
    const aShape = voicings.find(
      (voicing) => voicing.frets.join(",") === [null, 5, 7, 7, 7, 5].join(","),
    );
    if (aShape) {
      aShape.fingers = [null, 1, 2, 3, 4, 1];
      aShape.barre = { fret: 5, fromString: 1, toString: 5, finger: 1 };
    }

    const eShape = voicings.find(
      (voicing) =>
        voicing.frets.join(",") === [10, 12, 12, 11, 10, 10].join(","),
    );
    if (eShape) {
      eShape.fingers = [1, 3, 4, 2, 1, 1];
      eShape.barre = { fret: 10, fromString: 0, toString: 5, finger: 1 };
    }

    voicings.push(
      {
        name: "D Major 2nd Position Partial",
        positionLabel: "2nd Position / Partial",
        rootString: "Root: 5th String",
        frets: [null, 5, null, 2, 3, 2],
        fingers: [null, 4, null, 1, 2, 1],
        baseFret: 2,
        category: "variation",
      },
      {
        name: "D Major 5th Position Open D",
        positionLabel: "5th Position / Open D",
        rootString: "Root: 5th String",
        frets: [null, 5, 0, 7, 7, 5],
        fingers: [null, 1, null, 3, 4, 1],
        baseFret: 5,
        barre: { fret: 5, fromString: 1, toString: 5, finger: 1 },
        category: "variation",
      },
      {
        name: "D Major 5th Position Top Strings",
        positionLabel: "5th Position / Top Four Strings",
        rootString: "Root: 4th String",
        frets: [null, null, 0, 7, 7, 5],
        fingers: [null, null, null, 3, 4, 1],
        baseFret: 5,
        category: "variation",
      },
      {
        name: "D Major 10th Position Top Strings",
        positionLabel: "10th Position / Top Three Strings",
        rootString: "Root: 4th String",
        frets: [null, null, 0, 11, 10, 10],
        fingers: [null, null, null, 3, 2, 2],
        baseFret: 10,
        barre: { fret: 10, fromString: 4, toString: 5, finger: 2 },
        category: "variation",
      },
      {
        name: "D Major 10th Position Open Strings",
        positionLabel: "10th Position / Open A and D",
        rootString: "Root: 6th String",
        frets: [10, 0, 0, 11, 10, 10],
        fingers: [1, null, null, 3, 2, 2],
        baseFret: 10,
        barre: { fret: 10, fromString: 4, toString: 5, finger: 2 },
        category: "variation",
      },
    );
  }

  if (root === "D" && typeKey === "minor") {
    const aShape = voicings.find(
      (voicing) => voicing.frets.join(",") === [null, 5, 7, 7, 6, 5].join(","),
    );
    if (aShape) {
      aShape.fingers = [null, 1, 3, 4, 2, 1];
      aShape.barre = { fret: 5, fromString: 1, toString: 5, finger: 1 };
    }

    const eShape = voicings.find(
      (voicing) =>
        voicing.frets.join(",") === [10, 12, 12, 10, 10, 10].join(","),
    );
    if (eShape) {
      eShape.fingers = [1, 3, 4, 1, 1, 1];
      eShape.barre = { fret: 10, fromString: 0, toString: 5, finger: 1 };
    }

    voicings.push(
      {
        name: "Dm 5th Position Open D",
        positionLabel: "5th Position / Open D",
        rootString: "Root: 5th String",
        frets: [null, 5, 0, 7, 6, 5],
        fingers: [null, 1, null, 4, 3, 2],
        baseFret: 5,
        category: "variation",
      },
      {
        name: "Dm 5th Position Top Strings",
        positionLabel: "5th Position / Top Four Strings",
        rootString: "Root: 4th String",
        frets: [null, null, 0, 7, 6, 5],
        fingers: [null, null, null, 3, 2, 1],
        baseFret: 5,
        category: "variation",
      },
      {
        name: "Dm 10th Position Top Strings",
        positionLabel: "10th Position / Top Three Strings",
        rootString: "Root: 4th String",
        frets: [null, null, 0, 10, 10, 10],
        fingers: [null, null, null, 1, 2, 3],
        baseFret: 10,
        category: "variation",
      },
      {
        name: "Dm 10th Position Partial Barre",
        positionLabel: "10th Position / Partial Barre",
        rootString: "Root: 4th String",
        frets: [null, null, 12, 10, 10, 10],
        fingers: [null, null, 3, 1, 1, 1],
        baseFret: 10,
        barre: { fret: 10, fromString: 3, toString: 5, finger: 1 },
        category: "variation",
      },
      {
        name: "Dm 7th Position Double Barre",
        positionLabel: "7th Position / Double Barre",
        rootString: "Root: 4th String",
        frets: [10, 8, 7, 7, 10, 10],
        fingers: [3, 2, 1, 1, 4, 4],
        baseFret: 7,
        barres: [
          { fret: 7, fromString: 2, toString: 3, finger: 1 },
          { fret: 10, fromString: 4, toString: 5, finger: 4 },
        ],
        category: "variation",
      },
    );
  }

  if (root === "D" && typeKey === "7") {
    const aShape = voicings.find(
      (voicing) => voicing.frets.join(",") === [null, 5, 7, 5, 7, 5].join(","),
    );
    if (aShape) {
      aShape.fingers = [null, 1, 3, 1, 4, 1];
    }

    const eShape = voicings.find(
      (voicing) =>
        voicing.frets.join(",") === [10, 12, 10, 10, 10, 10].join(","),
    );
    if (eShape) {
      eShape.fingers = [1, 2, 1, 1, 1, 1];
      eShape.barre = { fret: 10, fromString: 0, toString: 5, finger: 1 };
    }

    voicings.push(
      {
        name: "D7 5th Position Open D",
        positionLabel: "5th Position / Open D",
        rootString: "Root: 5th String",
        frets: [null, 5, 0, 5, 7, 5],
        fingers: [null, 1, null, 2, 4, 3],
        baseFret: 5,
        category: "variation",
      },
      {
        name: "D7 5th Position Top Strings",
        positionLabel: "5th Position / Top Four Strings",
        rootString: "Root: 4th String",
        frets: [null, null, 0, 5, 7, 5],
        fingers: [null, null, null, 1, 3, 2],
        baseFret: 5,
        category: "variation",
      },
      {
        name: "D7 12th Position Top Strings",
        positionLabel: "12th Position / Top Four Strings",
        rootString: "Root: 4th String",
        frets: [null, null, 12, 14, 13, 14],
        fingers: [null, null, 1, 3, 2, 4],
        baseFret: 12,
        category: "variation",
      },
      {
        name: "D7 13th Position Open D",
        positionLabel: "13th Position / Open D",
        rootString: "Root: 4th String",
        frets: [null, null, 0, 14, 13, 14],
        fingers: [null, null, null, 2, 1, 3],
        baseFret: 13,
        category: "variation",
      },
      {
        name: "D7 5th Position High Variation",
        positionLabel: "5th Position / High E Variation",
        rootString: "Root: 5th String",
        frets: [null, 5, 7, 5, 7, 8],
        fingers: [null, 1, 2, 1, 3, 4],
        baseFret: 5,
        category: "variation",
      },
    );
  }

  if (root === "D" && typeKey === "maj7") {
    const aShape = voicings.find(
      (voicing) => voicing.frets.join(",") === [null, 5, 7, 6, 7, 5].join(","),
    );
    if (aShape) {
      aShape.fingers = [null, 1, 3, 2, 4, 1];
    }

    const eShape = voicings.find(
      (voicing) =>
        voicing.frets.join(",") === [10, 12, 11, 11, 10, 9].join(","),
    );
    if (eShape) {
      eShape.fingers = [1, 3, 2, 4, 1, 1];
      eShape.barre = { fret: 10, fromString: 0, toString: 4, finger: 1 };
    }

    voicings.push(
      {
        name: "Dmaj7 5th Position Open D",
        positionLabel: "5th Position / Open D",
        rootString: "Root: 5th String",
        frets: [null, 5, 0, 6, 7, 5],
        fingers: [null, 1, null, 3, 4, 2],
        baseFret: 5,
        category: "variation",
      },
      {
        name: "Dmaj7 5th Position Top Strings",
        positionLabel: "5th Position / Top Four Strings",
        rootString: "Root: 4th String",
        frets: [null, null, 0, 6, 7, 5],
        fingers: [null, null, null, 2, 3, 1],
        baseFret: 5,
        category: "variation",
      },
      {
        name: "Dmaj7 9th Position Top Strings",
        positionLabel: "9th Position / Top Four Strings",
        rootString: "Root: 4th String",
        frets: [null, null, 0, 11, 10, 9],
        fingers: [null, null, null, 3, 2, 1],
        baseFret: 9,
        category: "variation",
      },
      {
        name: "Dmaj7 12th Position Top Strings",
        positionLabel: "12th Position / Top Four Strings",
        rootString: "Root: 4th String",
        frets: [null, null, 12, 14, 13, 14],
        fingers: [null, null, 1, 3, 2, 4],
        baseFret: 12,
        category: "variation",
      },
      {
        name: "Dmaj7 14th Position Top Strings",
        positionLabel: "14th Position / Top Four Strings",
        rootString: "Root: 4th String",
        frets: [null, null, 0, 14, 15, 16],
        fingers: [null, null, null, 1, 2, 3],
        baseFret: 14,
        category: "variation",
      },
    );
  }

  if (root === "D" && typeKey === "min7") {
    const openShape = voicings.find(
      (voicing) =>
        voicing.frets.join(",") === [null, null, 0, 2, 1, 1].join(","),
    );
    if (openShape) {
      openShape.fingers = [null, null, null, 3, 1, 2];
      openShape.barre = undefined;
    }

    const aShape = voicings.find(
      (voicing) => voicing.frets.join(",") === [null, 5, 7, 5, 6, 5].join(","),
    );
    if (aShape) {
      aShape.fingers = [null, 1, 3, 1, 2, 1];
    }

    const eShape = voicings.find(
      (voicing) =>
        voicing.frets.join(",") === [10, 12, 10, 10, 10, 10].join(","),
    );
    if (eShape) {
      eShape.fingers = [1, 3, 1, 1, 1, 1];
      eShape.barre = { fret: 10, fromString: 0, toString: 5, finger: 1 };
    }

    voicings.push(
      {
        name: "Dm7 3rd Position Open D",
        positionLabel: "3rd Position / Open D",
        rootString: "Root: 4th String",
        frets: [null, 5, 3, 5, 3, 5],
        fingers: [null, 2, 1, 3, 1, 4],
        baseFret: 3,
        category: "variation",
      },
      {
        name: "Dm7 5th Position Open D",
        positionLabel: "5th Position / Open D",
        rootString: "Root: 4th String",
        frets: [null, null, 0, 5, 6, 5],
        fingers: [null, null, null, 1, 3, 2],
        baseFret: 5,
        category: "variation",
      },
      {
        name: "Dm7 5th Position Open D Variation",
        positionLabel: "5th Position / Open D Variation",
        rootString: "Root: 4th String",
        frets: [null, 5, 0, 5, 6, 5],
        fingers: [null, 1, null, 2, 3, 4],
        baseFret: 5,
        category: "variation",
      },
      {
        name: "Dm7 8th Position Top Strings",
        positionLabel: "8th Position / Top Four Strings",
        rootString: "Root: 4th String",
        frets: [null, null, 0, 10, 10, 8],
        fingers: [null, null, null, 3, 4, 1],
        baseFret: 8,
        category: "variation",
      },
      {
        name: "Dm7 8th Position Open D and F",
        positionLabel: "8th Position / Open D",
        rootString: "Root: 4th String",
        frets: [10, 8, 0, 10, 10, 8],
        fingers: [3, 1, null, 4, 4, 2],
        baseFret: 8,
        barre: { fret: 10, fromString: 3, toString: 4, finger: 4 },
        category: "variation",
      },
      {
        name: "Dm7 8th Position Open A and D",
        positionLabel: "8th Position / Open A and D",
        rootString: "Root: 4th String",
        frets: [10, 0, 0, 10, 10, 8],
        fingers: [3, null, null, 4, 4, 1],
        baseFret: 8,
        barre: { fret: 10, fromString: 3, toString: 4, finger: 4 },
        category: "variation",
      },
    );
  }

  if (root === "D" && typeKey === "dim") {
    voicings.push(
      {
        name: "Ddim Open Position",
        positionLabel: "Open Position",
        rootString: "Root: 4th String",
        frets: [null, null, 0, 1, 3, 1],
        fingers: [null, null, null, 1, 3, 2],
        baseFret: 1,
        category: "variation",
      },
      {
        name: "Ddim 9th Position",
        positionLabel: "9th Position",
        rootString: "Root: 4th String",
        frets: [null, null, 0, 10, 9, 10],
        fingers: [null, null, null, 2, 1, 3],
        baseFret: 9,
        category: "variation",
      },
      {
        name: "Ddim 4th Position Open D",
        positionLabel: "4th Position / Open D",
        rootString: "Root: 4th String",
        frets: [null, 5, 0, 7, 6, 4],
        fingers: [null, 2, null, 4, 3, 1],
        baseFret: 4,
        category: "variation",
      },
      {
        name: "Ddim 9th Position Partial",
        positionLabel: "9th Position / Partial",
        rootString: "Root: 4th String",
        frets: [null, null, 12, 9, 10, 10],
        fingers: [null, null, 4, 1, 2, 3],
        baseFret: 9,
        category: "variation",
      },
      {
        name: "Ddim 12th Position",
        positionLabel: "12th Position",
        rootString: "Root: 4th String",
        frets: [null, null, 12, 14, 14, 16],
        fingers: [null, null, 1, 2, 3, 4],
        baseFret: 12,
        category: "variation",
      },
      {
        name: "Ddim 13th Position Open D",
        positionLabel: "13th Position / Open D",
        rootString: "Root: 4th String",
        frets: [null, null, 0, 13, 15, 14],
        fingers: [null, null, null, 1, 3, 2],
        baseFret: 13,
        category: "variation",
      },
      {
        name: "Ddim 13th Position Open D and High E",
        positionLabel: "13th Position / Open D and High E",
        rootString: "Root: 4th String",
        frets: [null, null, 0, 13, null, 13],
        fingers: [null, null, null, 1, null, 2],
        baseFret: 13,
        category: "variation",
      },
      {
        name: "Ddim 3rd Position",
        positionLabel: "3rd Position",
        rootString: "Root: 5th String",
        frets: [null, 5, 3, null, null, 4],
        fingers: [null, 3, 1, null, null, 2],
        baseFret: 3,
        category: "variation",
      },
    );
  }

  if (root === "D" && typeKey === "dim7") {
    voicings.push(
      {
        name: "Ddim7 Open Position",
        positionLabel: "Open Position",
        rootString: "Root: 4th String",
        frets: [null, null, 0, 1, null, 1],
        fingers: [null, null, null, 1, null, 2],
        baseFret: 1,
        category: "variation",
      },
      {
        name: "Ddim7 4th Position Open D",
        positionLabel: "4th Position / Open D",
        rootString: "Root: 4th String",
        frets: [null, 5, 0, 4, 6, 4],
        fingers: [null, 3, null, 1, 4, 2],
        baseFret: 4,
        category: "variation",
      },
      {
        name: "Ddim7 4th Position",
        positionLabel: "4th Position",
        rootString: "Root: 5th String",
        frets: [null, 5, 6, 4, 6, 4],
        fingers: [null, 2, 3, 1, 4, 1],
        baseFret: 4,
        category: "variation",
      },
      {
        name: "Ddim7 10th Position Open Strings",
        positionLabel: "10th Position / Open A and D",
        rootString: "Root: 6th String",
        frets: [10, 0, 0, 10, 10, 10],
        fingers: [1, null, null, 3, 2, 4],
        baseFret: 10,
        category: "variation",
      },
      {
        name: "Ddim7 10th Position",
        positionLabel: "10th Position",
        rootString: "Root: 6th String",
        frets: [10, 12, 10, 10, 12, 10],
        fingers: [1, 2, 1, 1, 4, 1],
        baseFret: 10,
        category: "variation",
      },
      {
        name: "Ddim7 13th Position Open D",
        positionLabel: "13th Position / Open D",
        rootString: "Root: 4th String",
        frets: [null, null, 0, 13, 15, 13],
        fingers: [null, null, null, 1, 4, 2],
        baseFret: 13,
        category: "variation",
      },
      {
        name: "Ddim7 12th Position",
        positionLabel: "12th Position",
        rootString: "Root: 4th String",
        frets: [null, null, 12, 14, 14, 14],
        fingers: [null, null, 1, 2, 3, 4],
        baseFret: 12,
        category: "variation",
      },
      {
        name: "Ddim7 12th Position Open D",
        positionLabel: "12th Position / Open D",
        rootString: "Root: 4th String",
        frets: [null, null, 0, 13, 14, 14],
        fingers: [null, null, null, 1, 2, 3],
        baseFret: 12,
        category: "variation",
      },
    );
  }

  if (root === "D" && typeKey === "m7b5") {
    voicings.push(
      {
        name: "Dm7b5 Open Position",
        positionLabel: "Open Position",
        rootString: "Root: 4th String",
        frets: [null, null, 0, 1, 2, 3],
        fingers: [null, null, null, 1, 2, 3],
        baseFret: 1,
        category: "variation",
      },
      {
        name: "Dm7b5 3rd Position",
        positionLabel: "3rd Position",
        rootString: "Root: 4th String",
        frets: [null, 5, 3, 5, 3, 4],
        fingers: [null, 3, 1, 4, 1, 2],
        baseFret: 3,
        category: "variation",
      },
      {
        name: "Dm7b5 8th Position Open D",
        positionLabel: "8th Position / Open D",
        rootString: "Root: 4th String",
        frets: [null, null, 0, 10, 10, 8],
        fingers: [null, null, null, 3, 2, 1],
        baseFret: 8,
        category: "variation",
      },
      {
        name: "Dm7b5 8th Position",
        positionLabel: "8th Position",
        rootString: "Root: 4th String",
        frets: [10, 8, 0, 10, 10, 8],
        fingers: [3, 1, null, 4, 4, 2],
        baseFret: 8,
        barre: { fret: 10, fromString: 3, toString: 4, finger: 4 },
        category: "variation",
      },
      {
        name: "Dm7b5 13th Position Top Strings",
        positionLabel: "13th Position / Top Strings",
        rootString: "Root: 4th String",
        frets: [null, null, 0, 13, 14, 15],
        fingers: [null, null, null, 1, 2, 3],
        baseFret: 13,
        category: "variation",
      },
      {
        name: "Dm7b5 12th Position",
        positionLabel: "12th Position",
        rootString: "Root: 4th String",
        frets: [null, null, 12, 14, 14, 14],
        fingers: [null, null, 1, 2, 2, 2],
        baseFret: 12,
        barre: { fret: 14, fromString: 3, toString: 5, finger: 2 },
        category: "variation",
      },
      {
        name: "Dm7b5 4th Position Open D",
        positionLabel: "4th Position / Open D",
        rootString: "Root: 4th String",
        frets: [null, null, 0, 6, 5, 4],
        fingers: [null, null, null, 3, 2, 1],
        baseFret: 4,
        category: "variation",
      },
      {
        name: "Dm7b5 5th Position",
        positionLabel: "5th Position",
        rootString: "Root: 5th String",
        frets: [null, 5, 7, 5, 7, 8],
        fingers: [null, 1, 2, 1, 3, 4],
        baseFret: 5,
        category: "variation",
      },
    );
  }

  if (root === "D" && typeKey === "aug") {
    voicings.push(
      {
        name: "Daug Open Position",
        positionLabel: "Open Position",
        rootString: "Root: 4th String",
        frets: [null, null, 0, 3, 3, 2],
        fingers: [null, null, null, 2, 3, 1],
        baseFret: 1,
        category: "variation",
      },
      {
        name: "Daug 5th Position Open D",
        positionLabel: "5th Position / Open D",
        rootString: "Root: 4th String",
        frets: [null, 5, 0, 7, 7, 6],
        fingers: [null, 1, null, 3, 4, 2],
        baseFret: 5,
        category: "variation",
      },
      {
        name: "Daug 6th Position Open D",
        positionLabel: "6th Position / Open D",
        rootString: "Root: 4th String",
        frets: [null, null, 0, 8, 8, 6],
        fingers: [null, null, null, 2, 3, 1],
        baseFret: 6,
        category: "variation",
      },
      {
        name: "Daug 10th Position Open D",
        positionLabel: "10th Position / Open D",
        rootString: "Root: 4th String",
        frets: [null, null, 0, 12, 12, 10],
        fingers: [null, null, null, 2, 3, 1],
        baseFret: 10,
        category: "variation",
      },
      {
        name: "Daug 10th Position",
        positionLabel: "10th Position",
        rootString: "Root: 4th String",
        frets: [null, null, 12, 11, 11, 10],
        fingers: [null, null, 4, 2, 3, 1],
        baseFret: 10,
        category: "variation",
      },
      {
        name: "Daug 2nd Position Open D",
        positionLabel: "2nd Position / Open D",
        rootString: "Root: 4th String",
        frets: [null, 5, 0, 3, 3, 2],
        fingers: [null, 4, null, 2, 3, 1],
        baseFret: 2,
        category: "variation",
      },
      {
        name: "Daug 2nd Position",
        positionLabel: "2nd Position",
        rootString: "Root: 5th String",
        frets: [null, 5, 4, 3, 3, 2],
        fingers: [null, 4, 3, 2, 2, 1],
        baseFret: 2,
        category: "variation",
      },
      {
        name: "Daug 3rd Position",
        positionLabel: "3rd Position",
        rootString: "Root: 5th String",
        frets: [null, 6, 5, 4, 3, 3],
        fingers: [null, 4, 3, 2, 1, 1],
        baseFret: 3,
        barre: { fret: 3, fromString: 4, toString: 5, finger: 1 },
        category: "variation",
      },
    );
  }

  if (root === "D" && typeKey === "sus2") {
    voicings.push(
      {
        name: "Dsus2 5th Position Open D",
        positionLabel: "5th Position / Open D",
        rootString: "Root: 4th String",
        frets: [null, 5, 0, 7, 5, 5],
        fingers: [null, 1, null, 3, 2, 2],
        baseFret: 5,
        category: "variation",
      },
      {
        name: "Dsus2 5th Position Top Strings",
        positionLabel: "5th Position / Top Strings",
        rootString: "Root: 4th String",
        frets: [null, null, 0, null, 5, 5],
        fingers: [null, null, null, null, 1, 2],
        baseFret: 5,
        category: "variation",
      },
      {
        name: "Dsus2 5th Position Barre",
        positionLabel: "5th Position / Barre Variation",
        rootString: "Root: 5th String",
        frets: [null, 5, 7, 7, 5, 5],
        fingers: [null, 1, 3, 4, 1, 1],
        baseFret: 5,
        barre: { fret: 5, fromString: 4, toString: 5, finger: 1 },
        category: "variation",
      },
      {
        name: "Dsus2 5th Position Open High E",
        positionLabel: "5th Position / Open High E",
        rootString: "Root: 5th String",
        frets: [null, 5, 7, 7, 5, 0],
        fingers: [null, 1, 3, 4, 2, null],
        baseFret: 5,
        category: "variation",
      },
      {
        name: "Dsus2 9th Position Open D",
        positionLabel: "9th Position / Open D",
        rootString: "Root: 4th String",
        frets: [null, null, 0, 9, 10, 0],
        fingers: [null, null, null, 1, 2, null],
        baseFret: 9,
        category: "variation",
      },
      {
        name: "Dsus2 9th Position Open Strings",
        positionLabel: "9th Position / Open Strings",
        rootString: "Root: 4th String",
        frets: [9, 0, 0, 9, 10, 0],
        fingers: [3, null, null, 1, 2, null],
        baseFret: 9,
        category: "variation",
      },
      {
        name: "Dsus2 9th Position Top Strings",
        positionLabel: "9th Position / Top Strings",
        rootString: "Root: 4th String",
        frets: [null, null, 0, 9, 10, 10],
        fingers: [null, null, null, 1, 2, 3],
        baseFret: 9,
        category: "variation",
      },
    );
  }

  if (root === "D" && typeKey === "sus4") {
    voicings.push(
      {
        name: "Dsus4 3rd Position Open Strings",
        positionLabel: "3rd Position / Open Strings",
        rootString: "Root: 4th String",
        frets: [null, null, 0, 0, 3, 3],
        fingers: [null, null, null, null, 2, 3],
        baseFret: 3,
        category: "variation",
      },
      {
        name: "Dsus4 3rd Position Open D",
        positionLabel: "3rd Position / Open D",
        rootString: "Root: 4th String",
        frets: [null, 5, 0, 0, 3, 3],
        fingers: [null, 3, null, null, 2, 4],
        baseFret: 3,
        category: "variation",
      },
      {
        name: "Dsus4 3rd Position",
        positionLabel: "3rd Position",
        rootString: "Root: 5th String",
        frets: [null, 5, 5, 5, 3, 3],
        fingers: [null, 3, 3, 3, 1, 1],
        baseFret: 3,
        barre: { fret: 3, fromString: 4, toString: 5, finger: 1 },
        category: "variation",
      },
      {
        name: "Dsus4 8th Position Open Strings",
        positionLabel: "8th Position / Open Strings",
        rootString: "Root: 4th String",
        frets: [10, 8, 0, 0, 8, 8],
        fingers: [3, null, null, null, 1, 4],
        baseFret: 8,
        category: "variation",
      },
      {
        name: "Dsus4 10th Position Open Strings",
        positionLabel: "10th Position / Open Strings",
        rootString: "Root: 6th String",
        frets: [10, 0, 0, 10, 10, 10],
        fingers: [1, null, null, 3, 2, 2],
        baseFret: 10,
        category: "variation",
      },
      {
        name: "Dsus4 10th Position Top Strings",
        positionLabel: "10th Position / Top Strings",
        rootString: "Root: 4th String",
        frets: [null, null, 0, 10, 10, 10],
        fingers: [null, null, null, 1, 1, 2],
        baseFret: 10,
        category: "variation",
      },
      {
        name: "Dsus4 10th Position",
        positionLabel: "10th Position",
        rootString: "Root: 6th String",
        frets: [10, 0, 0, 10, 10, 10],
        fingers: [1, null, null, 3, 2, 2],
        baseFret: 10,
        category: "variation",
      },
    );
  }

  if (root === "D" && typeKey === "add9") {
    voicings.push(
      {
        name: "Dadd9 5th Position Open High E",
        positionLabel: "5th Position / Open High E",
        rootString: "Root: 5th String",
        frets: [null, 5, 7, 7, 7, 0],
        fingers: [null, 1, 2, 3, 4, null],
        baseFret: 5,
        category: "variation",
      },
      {
        name: "Dadd9 10th Position Open Strings",
        positionLabel: "10th Position / Open D and High E",
        rootString: "Root: 4th String",
        frets: [null, null, 0, 11, 10, 0],
        fingers: [null, null, null, 2, 1, null],
        baseFret: 10,
        category: "variation",
      },
      {
        name: "Dadd9 10th Position Low D",
        positionLabel: "10th Position / Open A, D and High E",
        rootString: "Root: 6th String",
        frets: [10, 0, 0, 11, 10, 0],
        fingers: [1, null, null, 3, 2, null],
        baseFret: 10,
        category: "variation",
      },
      {
        name: "Dadd9 10th Position Open D and High E",
        positionLabel: "10th Position / Open D and High E Variation",
        rootString: "Root: 6th String",
        frets: [10, null, 0, 11, 10, 0],
        fingers: [1, null, null, 3, 2, null],
        baseFret: 10,
        category: "variation",
      },
      {
        name: "Dadd9 10th Position Open Strings Variation",
        positionLabel: "10th Position / Open Strings",
        rootString: "Root: 4th String",
        frets: [0, 0, 12, 11, 10, 0],
        fingers: [null, null, 4, 3, 2, null],
        baseFret: 10,
        category: "variation",
      },
      {
        name: "Dadd9 10th Position Top Strings",
        positionLabel: "10th Position / Top Strings",
        rootString: "Root: 4th String",
        frets: [null, null, 12, 11, 10, 0],
        fingers: [null, null, 4, 3, 2, null],
        baseFret: 10,
        category: "variation",
      },
      {
        name: "Dadd9 10th Position Open Low Strings",
        positionLabel: "10th Position / Open Low Strings",
        rootString: "Root: 6th String",
        frets: [10, 0, 12, 10, 10, 0],
        fingers: [1, null, 3, 1, 1, null],
        baseFret: 10,
        category: "variation",
      },
      {
        name: "Dadd9 10th Position Open A and High E",
        positionLabel: "10th Position / Open A and High E",
        rootString: "Root: 6th String",
        frets: [10, 0, 12, 10, 10, 0],
        fingers: [1, null, 3, 1, 1, null],
        baseFret: 10,
        category: "variation",
      },
    );
  }

  if (root === "D" && typeKey === "9") {
    voicings.push(
      {
        name: "D9 5th Position Open High E",
        positionLabel: "5th Position / Open High E",
        rootString: "Root: 5th String",
        frets: [null, 5, 7, 5, 7, 0],
        fingers: [null, 1, 2, 1, 3, null],
        baseFret: 5,
        category: "variation",
      },
      {
        name: "D9 9th Position Open High E",
        positionLabel: "9th Position / Open High E",
        rootString: "Root: 5th String",
        frets: [10, 9, 10, 9, 10, 0],
        fingers: [2, 1, 3, 1, 4, null],
        baseFret: 9,
        category: "variation",
      },
      {
        name: "D9 10th Position Open Strings",
        positionLabel: "10th Position / Open A and High E",
        rootString: "Root: 6th String",
        frets: [10, 0, 10, 11, 10, 0],
        fingers: [1, null, 2, 3, 4, null],
        baseFret: 10,
        category: "variation",
      },
      {
        name: "D9 10th Position Open A",
        positionLabel: "10th Position / Open A",
        rootString: "Root: 6th String",
        frets: [10, 0, 10, 11, 10, 10],
        fingers: [1, null, 2, 3, 4, 4],
        baseFret: 10,
        category: "variation",
      },
      {
        name: "D9 10th Position",
        positionLabel: "10th Position",
        rootString: "Root: 6th String",
        frets: [10, 10, 10, 11, 10, 10],
        fingers: [1, 1, 2, 3, 1, 1],
        baseFret: 10,
        barre: { fret: 10, fromString: 0, toString: 1, finger: 1 },
        category: "variation",
      },
      {
        name: "D9 7th Position Open Strings",
        positionLabel: "7th Position / Open Strings",
        rootString: "Root: 5th String",
        frets: [null, 0, 7, 7, 7, 0],
        fingers: [null, null, 3, 4, 2, null],
        baseFret: 7,
        category: "variation",
      },
      {
        name: "D9 7th Position Open High E",
        positionLabel: "7th Position / Open High E",
        rootString: "Root: 5th String",
        frets: [null, 0, 7, 7, 7, 0],
        fingers: [null, null, 3, 4, 2, null],
        baseFret: 7,
        category: "variation",
      },
      {
        name: "D9 7th Position Barre",
        positionLabel: "7th Position / Barre",
        rootString: "Root: 5th String",
        frets: [null, 7, 7, 7, 7, 7],
        fingers: [null, 1, 1, 1, 1, 1],
        baseFret: 7,
        barre: { fret: 7, fromString: 1, toString: 5, finger: 1 },
        category: "variation",
      },
    );
  }

  if (root === "D" && typeKey === "11") {
    voicings.push(
      {
        name: "D11 9th Position Open Strings",
        positionLabel: "9th Position / Open B and High E",
        rootString: "Root: 6th String",
        frets: [10, 9, 10, 9, 10, 0],
        fingers: [2, 1, 3, 1, 4, null],
        baseFret: 9,
        category: "variation",
      },
      {
        name: "D11 10th Position Open High E",
        positionLabel: "10th Position / Open High E",
        rootString: "Root: 6th String",
        frets: [10, 10, 10, 10, 12, 0],
        fingers: [1, 1, 1, 1, 2, null],
        baseFret: 10,
        barre: { fret: 10, fromString: 0, toString: 3, finger: 1 },
        category: "variation",
      },
      {
        name: "D11 10th Position Open High E Variation",
        positionLabel: "10th Position / Open High E Variation",
        rootString: "Root: 6th String",
        frets: [10, 10, 10, 10, 10, 0],
        fingers: [1, 1, 1, 1, 1, null],
        baseFret: 10,
        barre: { fret: 10, fromString: 0, toString: 4, finger: 1 },
        category: "variation",
      },
      {
        name: "D11 7th Position Open Strings",
        positionLabel: "7th Position / Open Strings",
        rootString: "Root: 5th String",
        frets: [null, 0, 7, 7, 7, 0],
        fingers: [null, null, 3, 4, 2, null],
        baseFret: 7,
        category: "variation",
      },
      {
        name: "D11 7th Position",
        positionLabel: "7th Position",
        rootString: "Root: 6th String",
        frets: [7, 7, 9, 7, 9, 7],
        fingers: [4, 4, 3, 1, 1, 2],
        baseFret: 7,
        category: "variation",
      },
      {
        name: "D11 8th Position Open Strings",
        positionLabel: "8th Position / Open Strings",
        rootString: "Root: 5th String",
        frets: [null, 0, 8, 7, 8, 0],
        fingers: [null, null, 3, 2, 4, null],
        baseFret: 8,
        category: "variation",
      },
    );
  }

  if (root === "D" && typeKey === "6") {
    voicings.push(
      {
        name: "D6 Open Position",
        positionLabel: "Open Position",
        rootString: "Root: 4th String",
        frets: [null, null, 0, 2, 0, 2],
        fingers: [null, null, null, 1, null, 2],
        baseFret: 1,
        category: "variation",
      },
      {
        name: "D6 3rd Position",
        positionLabel: "3rd Position",
        rootString: "Root: 5th String",
        frets: [null, 5, 7, 7, 7, 7],
        fingers: [null, 1, 2, 2, 3, 4],
        baseFret: 3,
        category: "variation",
      },
      {
        name: "D6 10th Position Open Strings",
        positionLabel: "10th Position / Open Strings",
        rootString: "Root: 6th String",
        frets: [10, 0, 10, 10, 12, 0],
        fingers: [1, null, 3, 3, 4, null],
        baseFret: 10,
        category: "variation",
      },
      {
        name: "D6 10th Position Open A",
        positionLabel: "10th Position / Open A",
        rootString: "Root: 6th String",
        frets: [10, 0, 10, 10, 12, 10],
        fingers: [1, null, 2, 2, 4, 3],
        baseFret: 10,
        category: "variation",
      },
      {
        name: "D6 10th Position Open Strings Variation",
        positionLabel: "10th Position / Open Strings Variation",
        rootString: "Root: 6th String",
        frets: [10, 0, 10, 10, 10, 0],
        fingers: [1, null, 2, 2, 2, null],
        baseFret: 10,
        barre: { fret: 10, fromString: 2, toString: 4, finger: 2 },
        category: "variation",
      },
      {
        name: "D6 10th Position",
        positionLabel: "10th Position",
        rootString: "Root: 6th String",
        frets: [10, 10, 10, 10, 12, 10],
        fingers: [1, 1, 1, 1, 3, 1],
        baseFret: 10,
        barre: { fret: 10, fromString: 0, toString: 3, finger: 1 },
        category: "variation",
      },
      {
        name: "D6 12th Position",
        positionLabel: "12th Position",
        rootString: "Root: 4th String",
        frets: [null, null, 12, 14, 14, 14],
        fingers: [null, null, 1, 2, 2, 2],
        baseFret: 12,
        barre: { fret: 14, fromString: 3, toString: 5, finger: 2 },
        category: "variation",
      },
      {
        name: "D6 10th Position Partial",
        positionLabel: "10th Position / Partial",
        rootString: "Root: 6th String",
        frets: [10, null, 10, 10, 12, 10],
        fingers: [1, null, 2, 2, 4, 3],
        baseFret: 10,
        category: "variation",
      },
    );
  }

  if (root === "D" && typeKey === "min6") {
    voicings.push(
      {
        name: "Dm6 Open Position",
        positionLabel: "Open Position",
        rootString: "Root: 4th String",
        frets: [null, null, 0, 2, 1, 0],
        fingers: [null, null, null, 2, 1, null],
        baseFret: 1,
        category: "variation",
      },
      {
        name: "Dm6 3rd Position",
        positionLabel: "3rd Position",
        rootString: "Root: 5th String",
        frets: [null, 5, 7, 7, 6, 8],
        fingers: [null, 1, 3, 3, 2, 4],
        baseFret: 3,
        category: "variation",
      },
      {
        name: "Dm6 3rd Position Open High E",
        positionLabel: "3rd Position / Open High E",
        rootString: "Root: 5th String",
        frets: [null, 5, 7, 7, 6, 0],
        fingers: [null, 1, 3, 3, 2, null],
        baseFret: 3,
        category: "variation",
      },
      {
        name: "Dm6 4th Position Open D",
        positionLabel: "4th Position / Open D",
        rootString: "Root: 4th String",
        frets: [null, null, 0, 6, 6, 5],
        fingers: [null, null, null, 2, 3, 1],
        baseFret: 4,
        category: "variation",
      },
      {
        name: "Dm6 5th Position",
        positionLabel: "5th Position",
        rootString: "Root: 5th String",
        frets: [null, 5, 7, 7, 6, 5],
        fingers: [null, 1, 3, 3, 2, 1],
        baseFret: 5,
        category: "variation",
      },
      {
        name: "Dm6 10th Position Open Strings",
        positionLabel: "10th Position / Open Strings",
        rootString: "Root: 6th String",
        frets: [10, 0, 12, 10, 10, 10],
        fingers: [1, null, 3, 1, 1, 1],
        baseFret: 10,
        category: "variation",
      },
      {
        name: "Dm6 9th Position Open Strings",
        positionLabel: "9th Position / Open Strings",
        rootString: "Root: 5th String",
        frets: [null, 0, 9, 10, 10, 10],
        fingers: [null, null, 1, 2, 3, 4],
        baseFret: 9,
        category: "variation",
      },
      {
        name: "Dm6 10th Position Open A",
        positionLabel: "10th Position / Open A",
        rootString: "Root: 6th String",
        frets: [10, 0, 12, 10, 10, 0],
        fingers: [1, null, 3, 1, 1, null],
        baseFret: 10,
        category: "variation",
      },
    );
  }

  if (root === "D" && typeKey === "7b9") {
    voicings.push(
      {
        name: "D7b9 4th Position",
        positionLabel: "4th Position",
        rootString: "Root: 5th String",
        frets: [null, 5, 4, 5, 4, 5],
        fingers: [null, 2, 1, 3, 2, 4],
        baseFret: 4,
        category: "variation",
      },
      {
        name: "D7b9 8th Position Open High E",
        positionLabel: "8th Position / Open High E",
        rootString: "Root: 6th String",
        frets: [10, 9, 10, 8, 10, 0],
        fingers: [3, 2, 1, 1, 4, null],
        baseFret: 8,
        category: "variation",
      },
      {
        name: "D7b9 7th Position Open Strings",
        positionLabel: "7th Position / Open Strings",
        rootString: "Root: 6th String",
        frets: [10, 0, 10, 9, 10, 0],
        fingers: [4, null, 3, 1, 2, null],
        baseFret: 7,
        category: "variation",
      },
      {
        name: "D7b9 7th Position Open Low Strings",
        positionLabel: "7th Position / Open Low Strings",
        rootString: "Root: 6th String",
        frets: [10, 0, 10, 9, 10, 0],
        fingers: [4, null, 3, 1, 2, null],
        baseFret: 7,
        category: "variation",
      },
      {
        name: "D7b9 10th Position Open Strings",
        positionLabel: "10th Position / Open Strings",
        rootString: "Root: 6th String",
        frets: [10, 0, 12, 10, 11, 0],
        fingers: [1, null, 3, 1, 2, null],
        baseFret: 10,
        category: "variation",
      },
      {
        name: "D7b9 8th Position",
        positionLabel: "8th Position",
        rootString: "Root: 6th String",
        frets: [10, 9, 10, 8, 10, 8],
        fingers: [4, 3, 4, 1, 2, 3],
        baseFret: 8,
        category: "variation",
      },
      {
        name: "D7b9 7th Position Open Low E",
        positionLabel: "7th Position / Open Low E",
        rootString: "Root: 6th String",
        frets: [0, 7, 9, 7, 9, 7],
        fingers: [null, 2, 4, 1, 3, 1],
        baseFret: 7,
        category: "variation",
      },
      {
        name: "D7b9 7th Position Open A",
        positionLabel: "7th Position / Open A",
        rootString: "Root: 5th String",
        frets: [null, 0, 9, 7, 9, 7],
        fingers: [null, null, 4, 1, 3, 1],
        baseFret: 7,
        category: "variation",
      },
    );
  }

  if (root === "D" && typeKey === "7#9") {
    voicings.push(
      {
        name: "D7#9 8th Position Open High E",
        positionLabel: "8th Position / Open High E",
        rootString: "Root: 6th String",
        frets: [10, 8, 10, 9, 10, 0],
        fingers: [3, 2, 4, 1, 4, null],
        baseFret: 8,
        barre: { fret: 10, fromString: 2, toString: 4, finger: 4 },
        category: "variation",
      },
      {
        name: "D7#9 7th Position Barre",
        positionLabel: "7th Position / Barre",
        rootString: "Root: 5th String",
        frets: [7, 7, 7, 7, 7, 7],
        fingers: [4, 1, 1, 1, 1, 1],
        baseFret: 7,
        barre: { fret: 7, fromString: 1, toString: 5, finger: 1 },
        category: "variation",
      },
      {
        name: "D7#9 7th Position Open High E",
        positionLabel: "7th Position / Open High E",
        rootString: "Root: 5th String",
        frets: [null, 7, 7, 7, 7, 0],
        fingers: [null, 1, 1, 1, 1, null],
        baseFret: 7,
        barre: { fret: 7, fromString: 1, toString: 4, finger: 1 },
        category: "variation",
      },
      {
        name: "D7#9 7th Position Open Strings",
        positionLabel: "7th Position / Open Strings",
        rootString: "Root: 5th String",
        frets: [null, 0, 7, 7, 7, 0],
        fingers: [null, null, 3, 4, 4, null],
        baseFret: 7,
        barre: { fret: 7, fromString: 2, toString: 4, finger: 4 },
        category: "variation",
      },
      {
        name: "D7#9 10th Position",
        positionLabel: "10th Position",
        rootString: "Root: 6th String",
        frets: [10, 10, 10, 10, 10, 10],
        fingers: [1, 1, 1, 1, 1, 1],
        baseFret: 10,
        barre: { fret: 10, fromString: 0, toString: 5, finger: 1 },
        category: "variation",
      },
      {
        name: "D7#9 10th Position Partial",
        positionLabel: "10th Position / Partial",
        rootString: "Root: 6th String",
        frets: [10, 10, 10, 10, 12, 12],
        fingers: [1, 1, 1, 1, 3, 4],
        baseFret: 10,
        barre: { fret: 10, fromString: 0, toString: 3, finger: 1 },
        category: "variation",
      },
      {
        name: "D7#9 10th Position Open Strings",
        positionLabel: "10th Position / Open Strings",
        rootString: "Root: 6th String",
        frets: [10, 0, 10, 10, 12, 12],
        fingers: [1, null, 1, 1, 3, 4],
        baseFret: 10,
        barre: { fret: 10, fromString: 2, toString: 3, finger: 1 },
        category: "variation",
      },
      {
        name: "D7#9 10th Position Open A and High E",
        positionLabel: "10th Position / Open A and High E",
        rootString: "Root: 6th String",
        frets: [10, 0, 10, 10, 12, 0],
        fingers: [1, null, 1, 1, 3, null],
        baseFret: 10,
        barre: { fret: 10, fromString: 2, toString: 3, finger: 1 },
        category: "variation",
      },
    );
  }

  if (root === "C#" && typeKey === "major") {
    const imageVoicings: GuitarVoicing[] = [
      {
        name: "C# Major A-Shape Barre",
        positionLabel: "4th Position / A-Shape",
        rootString: "Root: 5th String",
        frets: [null, 4, 6, 6, 6, 4],
        fingers: [null, 1, 2, 3, 4, 1],
        baseFret: 4,
        barre: { fret: 4, fromString: 1, toString: 5, finger: 1 },
        category: "CAGED",
        isFundamental: true,
      },
      {
        name: "C# Major E-Shape Barre",
        positionLabel: "9th Position / E-Shape",
        rootString: "Root: 6th String",
        frets: [9, 11, 11, 10, 9, 9],
        fingers: [1, 3, 4, 2, 1, 1],
        baseFret: 9,
        barre: { fret: 9, fromString: 0, toString: 5, finger: 1 },
        category: "CAGED",
        isFundamental: false,
      },
      {
        name: "C# Major D-Shape",
        positionLabel: "9th Position / D-Shape",
        rootString: "Root: 4th String",
        frets: [null, null, 11, 10, 9, 9],
        fingers: [null, null, 4, 3, 1, 2],
        baseFret: 9,
        category: "variation",
        isFundamental: false,
      },
      {
        name: "C# Major C-Shape",
        positionLabel: "Open Position / C-Shape",
        rootString: "Root: 5th String",
        frets: [null, 4, 3, 1, 2, 1],
        fingers: [null, 4, 3, 1, 2, 1],
        baseFret: 1,
        category: "variation",
        isFundamental: false,
      },
      {
        name: "C# Major Low Variation",
        positionLabel: "3rd Position Variation",
        rootString: "Root: 5th String",
        frets: [null, 4, 3, 6, 6, 4],
        fingers: [null, 2, 1, 4, 4, 3],
        baseFret: 3,
        barre: { fret: 6, fromString: 3, toString: 4, finger: 4 },
        category: "variation",
        isFundamental: false,
      },
      {
        name: "C# Major 6th Position Barre",
        positionLabel: "6th Position / Partial Barre",
        rootString: "Root: 6th String",
        frets: [9, 8, 6, 6, 6, 9],
        fingers: [3, 2, 1, 1, 1, 4],
        baseFret: 6,
        barre: { fret: 6, fromString: 2, toString: 4, finger: 1 },
        category: "variation",
        isFundamental: false,
      },
      {
        name: "C# Major 6th Position Double Barre",
        positionLabel: "6th Position / Double Barre",
        rootString: "Root: 6th String",
        frets: [9, 8, 6, 6, 9, 9],
        fingers: [3, 2, 1, 1, 4, 4],
        baseFret: 6,
        barres: [
          { fret: 6, fromString: 2, toString: 3, finger: 1 },
          { fret: 9, fromString: 4, toString: 5, finger: 4 },
        ],
        category: "variation",
        isFundamental: false,
      },
      {
        name: "C# Major 11th Position",
        positionLabel: "11th Position / Top Four Strings",
        rootString: "Root: 4th String",
        frets: [null, null, 11, 13, 14, 13],
        fingers: [null, null, 1, 2, 4, 3],
        baseFret: 11,
        category: "variation",
        isFundamental: false,
      },
    ];

    return imageVoicings;
  }

  if (root === "C#" && typeKey === "minor") {
    return [
      {
        name: "C# Minor A-Shape Barre",
        positionLabel: "4th Position / A-Shape",
        rootString: "Root: 5th String",
        frets: [null, 4, 6, 6, 5, 4],
        fingers: [null, 1, 3, 4, 2, 1],
        baseFret: 4,
        barre: { fret: 4, fromString: 1, toString: 5, finger: 1 },
        category: "CAGED",
        isFundamental: true,
      },
      {
        name: "C# Minor A-Shape Open High E",
        positionLabel: "4th Position / Open High E",
        rootString: "Root: 5th String",
        frets: [null, 4, 6, 6, 5, 0],
        fingers: [null, 1, 3, 4, 2, null],
        baseFret: 4,
        category: "variation",
        isFundamental: false,
      },
      {
        name: "C# Minor E-Shape Barre",
        positionLabel: "9th Position / E-Shape",
        rootString: "Root: 6th String",
        frets: [9, 11, 11, 9, 9, 9],
        fingers: [1, 3, 4, 1, 1, 1],
        baseFret: 9,
        barre: { fret: 9, fromString: 0, toString: 5, finger: 1 },
        category: "CAGED",
        isFundamental: false,
      },
      {
        name: "C# Minor 9th Position Top Strings",
        positionLabel: "9th Position / Top Four Strings",
        rootString: "Root: 4th String",
        frets: [null, null, 11, 9, 9, 9],
        fingers: [null, null, 3, 1, 1, 1],
        baseFret: 9,
        barre: { fret: 9, fromString: 3, toString: 5, finger: 1 },
        category: "variation",
        isFundamental: false,
      },
      {
        name: "C# Minor 9th Position Open High E",
        positionLabel: "9th Position / Open High E",
        rootString: "Root: 6th String",
        frets: [9, 11, 11, 9, 9, 0],
        fingers: [1, 3, 4, 1, 1, null],
        baseFret: 9,
        barre: { fret: 9, fromString: 0, toString: 4, finger: 1 },
        category: "variation",
        isFundamental: false,
      },
      {
        name: "C# Minor 9th Position Open Strings",
        positionLabel: "9th Position / Open Low and High Strings",
        rootString: "Root: 4th String",
        frets: [null, null, 11, 9, 10, 0],
        fingers: [null, null, 3, 1, 2, null],
        baseFret: 9,
        category: "variation",
        isFundamental: false,
      },
      {
        name: "C# Minor C-Shape Open High E",
        positionLabel: "5th Position / Open High E",
        rootString: "Root: 5th String",
        frets: [null, 8, 6, 5, 6, 0],
        fingers: [null, 4, 2, 1, 3, null],
        baseFret: 5,
        category: "variation",
        isFundamental: false,
      },
      {
        name: "C# Minor 6th Position Open High E",
        positionLabel: "6th Position / Open High E",
        rootString: "Root: 6th String",
        frets: [9, 7, 6, 6, 9, 0],
        fingers: [3, 2, 1, 1, 4, null],
        baseFret: 6,
        barre: { fret: 6, fromString: 2, toString: 3, finger: 1 },
        category: "variation",
        isFundamental: false,
      },
    ];
  }

  if (root === "C#" && typeKey === "7") {
    return [
      {
        name: "C#7 Open Variation",
        positionLabel: "Open Position",
        rootString: "Root: 5th String",
        frets: [null, 4, 3, 4, 0, 4],
        fingers: [null, 2, 1, 3, null, 4],
        baseFret: 1,
        category: "variation",
        isFundamental: true,
      },
      {
        name: "C#7 A-Shape Barre",
        positionLabel: "4th Position / A-Shape",
        rootString: "Root: 5th String",
        frets: [null, 4, 6, 4, 6, 4],
        fingers: [null, 1, 3, 1, 4, 1],
        baseFret: 4,
        barre: { fret: 4, fromString: 1, toString: 5, finger: 1 },
        category: "CAGED",
        isFundamental: false,
      },
      {
        name: "C#7 E-Shape Barre",
        positionLabel: "9th Position / E-Shape",
        rootString: "Root: 6th String",
        frets: [9, 11, 9, 10, 9, 9],
        fingers: [1, 3, 1, 2, 1, 1],
        baseFret: 9,
        barre: { fret: 9, fromString: 0, toString: 5, finger: 1 },
        category: "CAGED",
        isFundamental: false,
      },
      {
        name: "C#7 11th Position Open B",
        positionLabel: "11th Position / Open B",
        rootString: "Root: 4th String",
        frets: [null, null, 11, 13, 0, 13],
        fingers: [null, null, 1, 3, null, 4],
        baseFret: 11,
        category: "variation",
        isFundamental: false,
      },
      {
        name: "C#7 11th Position",
        positionLabel: "11th Position / Top Four Strings",
        rootString: "Root: 4th String",
        frets: [null, null, 11, 13, 12, 13],
        fingers: [null, null, 1, 3, 2, 4],
        baseFret: 11,
        category: "variation",
        isFundamental: false,
      },
      {
        name: "C#7 5th Position Open B",
        positionLabel: "5th Position / Open B",
        rootString: "Root: 5th String",
        frets: [null, 8, 7, 5, 0, 5],
        fingers: [null, 4, 3, 1, null, 2],
        baseFret: 5,
        category: "variation",
        isFundamental: false,
      },
      {
        name: "C#7 5th Position Open B High Voicing",
        positionLabel: "5th Position / Open B High Voicing",
        rootString: "Root: 5th String",
        frets: [null, 8, 7, 5, 0, 8],
        fingers: [null, 3, 2, 1, null, 4],
        baseFret: 5,
        category: "variation",
        isFundamental: false,
      },
      {
        name: "C#7 3rd Position Open B",
        positionLabel: "3rd Position / Open B",
        rootString: "Root: 5th String",
        frets: [null, 5, 4, 6, 0, 5],
        fingers: [null, 2, 1, 4, null, 3],
        baseFret: 3,
        category: "variation",
        isFundamental: false,
      },
    ];
  }

  if (root === "C#" && typeKey === "maj7") {
    return [
      {
        name: "C#maj7 A-Shape Barre",
        positionLabel: "4th Position / A-Shape",
        rootString: "Root: 5th String",
        frets: [null, 4, 6, 5, 6, 4],
        fingers: [null, 1, 3, 2, 4, 1],
        baseFret: 4,
        barre: { fret: 4, fromString: 1, toString: 5, finger: 1 },
        category: "CAGED",
        isFundamental: true,
      },
      {
        name: "C#maj7 E-Shape Barre",
        positionLabel: "9th Position / E-Shape",
        rootString: "Root: 6th String",
        frets: [9, 11, 10, 10, 9, 9],
        fingers: [1, 4, 2, 3, 1, 1],
        baseFret: 9,
        barre: { fret: 9, fromString: 0, toString: 5, finger: 1 },
        category: "CAGED",
        isFundamental: false,
      },
      {
        name: "C#maj7 11th Position",
        positionLabel: "11th Position / Top Four Strings",
        rootString: "Root: 4th String",
        frets: [null, null, 11, 13, 13, 13],
        fingers: [null, null, 1, 2, 3, 4],
        baseFret: 11,
        category: "variation",
        isFundamental: false,
      },
      {
        name: "C#maj7 C-Shape",
        positionLabel: "Open Position / C-Shape",
        rootString: "Root: 5th String",
        frets: [null, 4, 3, 1, 1, 1],
        fingers: [null, 4, 3, 1, 1, 1],
        baseFret: 1,
        barre: { fret: 1, fromString: 3, toString: 5, finger: 1 },
        category: "variation",
        isFundamental: false,
      },
      {
        name: "C#maj7 Open High Variation",
        positionLabel: "Open Position / High E Variation",
        rootString: "Root: 5th String",
        frets: [null, 4, 3, 1, 1, 4],
        fingers: [null, 3, 2, 1, 1, 4],
        baseFret: 1,
        barre: { fret: 1, fromString: 3, toString: 4, finger: 1 },
        category: "variation",
        isFundamental: false,
      },
      {
        name: "C#maj7 6th Position Barre",
        positionLabel: "6th Position / Partial Barre",
        rootString: "Root: 6th String",
        frets: [9, 8, 6, 6, 6, 8],
        fingers: [4, 2, 1, 1, 1, 3],
        baseFret: 6,
        barre: { fret: 6, fromString: 2, toString: 4, finger: 1 },
        category: "variation",
        isFundamental: false,
      },
      {
        name: "C#maj7 8th Position",
        positionLabel: "8th Position / Top Four Strings",
        rootString: "Root: 4th String",
        frets: [null, null, 11, 10, 9, 8],
        fingers: [null, null, 4, 3, 2, 1],
        baseFret: 8,
        category: "variation",
        isFundamental: false,
      },
      {
        name: "C#maj7 4th Position Top Strings",
        positionLabel: "4th Position / Top Five Strings",
        rootString: "Root: 5th String",
        frets: [null, 4, 5, 6, 6, null],
        fingers: [null, 1, 2, 3, 4, null],
        baseFret: 4,
        category: "variation",
        isFundamental: false,
      },
    ];
  }

  if (root === "C#" && typeKey === "min7") {
    return [
      {
        name: "C#m7 A-Shape Variation",
        positionLabel: "4th Position / A-Shape",
        rootString: "Root: 5th String",
        frets: [null, 4, 6, 4, 5, 4],
        fingers: [null, 2, 1, 3, 1, 4],
        baseFret: 4,
        category: "CAGED",
        isFundamental: true,
      },
      {
        name: "C#m7 A-Shape Open High E",
        positionLabel: "4th Position / Open High E",
        rootString: "Root: 5th String",
        frets: [null, 4, 6, 4, 5, 0],
        fingers: [null, 2, 1, 3, 1, null],
        baseFret: 4,
        category: "variation",
        isFundamental: false,
      },
      {
        name: "C#m7 Top Four Strings",
        positionLabel: "4th Position / Top Four Strings",
        rootString: "Root: 4th String",
        frets: [null, null, 6, 4, 5, 4],
        fingers: [null, null, 3, 1, 2, 4],
        baseFret: 4,
        category: "variation",
        isFundamental: false,
      },
      {
        name: "C#m7 Open High Strings",
        positionLabel: "4th Position / Open High E",
        rootString: "Root: 4th String",
        frets: [null, null, 4, 6, 5, 0],
        fingers: [null, null, 1, 3, 2, null],
        baseFret: 4,
        category: "variation",
        isFundamental: false,
      },
      {
        name: "C#m7 4th Position Open Strings",
        positionLabel: "4th Position / Open B and High E",
        rootString: "Root: 4th String",
        frets: [null, null, 4, 6, 0, 0],
        fingers: [null, null, 1, 3, null, null],
        baseFret: 4,
        category: "variation",
        isFundamental: false,
      },
      {
        name: "C#m7 4th Position Open High E",
        positionLabel: "4th Position / Open High E",
        rootString: "Root: 5th String",
        frets: [null, 4, 6, 5, 6, 0],
        fingers: [null, 1, 2, 3, 4, null],
        baseFret: 4,
        category: "variation",
        isFundamental: false,
      },
      {
        name: "C#m7 9th Position Partial Barre",
        positionLabel: "9th Position / Partial Barre",
        rootString: "Root: 6th String",
        frets: [9, null, 9, 9, 9, null],
        fingers: [1, null, 1, 1, 1, null],
        baseFret: 9,
        barre: { fret: 9, fromString: 2, toString: 4, finger: 1 },
        category: "variation",
        isFundamental: false,
      },
      {
        name: "C#m7 9th Position Open High E",
        positionLabel: "9th Position / Open High E",
        rootString: "Root: 6th String",
        frets: [9, null, 9, 9, 9, 0],
        fingers: [1, null, 1, 1, 1, null],
        baseFret: 9,
        barre: { fret: 9, fromString: 2, toString: 4, finger: 1 },
        category: "variation",
        isFundamental: false,
      },
    ];
  }

  if (root === "C#" && typeKey === "dim") {
    return [
      {
        name: "C#dim Open Variation",
        positionLabel: "Open Position",
        rootString: "Root: 5th String",
        frets: [null, 4, 2, null, 2, 0],
        fingers: [null, 3, 1, null, 2, null],
        baseFret: 1,
        category: "variation",
        isFundamental: true,
      },
      {
        name: "C#dim Open Voicing",
        positionLabel: "Open Position",
        rootString: "Root: 5th String",
        frets: [null, 4, 2, 0, 2, 3],
        fingers: [null, 4, 1, null, 2, 3],
        baseFret: 1,
        category: "variation",
        isFundamental: false,
      },
      {
        name: "C#dim 3rd Position",
        positionLabel: "3rd Position",
        rootString: "Root: 5th String",
        frets: [null, 4, 5, null, 5, 3],
        fingers: [null, 2, 3, null, 4, 1],
        baseFret: 3,
        category: "variation",
        isFundamental: false,
      },
      {
        name: "C#dim 4th Position",
        positionLabel: "4th Position",
        rootString: "Root: 6th String",
        frets: [4, null, 5, 0, 5, 0],
        fingers: [1, null, 2, null, 3, null],
        baseFret: 4,
        category: "variation",
        isFundamental: false,
      },
      {
        name: "C#dim 2nd Position Open Strings",
        positionLabel: "2nd Position / Open B and High E",
        rootString: "Root: 5th String",
        frets: [null, 4, 5, null, 2, 0],
        fingers: [null, 3, 4, null, 1, null],
        baseFret: 2,
        category: "variation",
        isFundamental: false,
      },
      {
        name: "C#dim 2nd Position Open Strings Variation",
        positionLabel: "2nd Position / Open B and High E",
        rootString: "Root: 5th String",
        frets: [null, 4, 2, null, 5, 0],
        fingers: [null, 3, 1, null, 4, null],
        baseFret: 2,
        category: "variation",
        isFundamental: false,
      },
      {
        name: "C#dim 2nd Position Open High E",
        positionLabel: "2nd Position / Open High E",
        rootString: "Root: 5th String",
        frets: [null, 4, 2, null, 5, 3],
        fingers: [null, 3, 1, null, 4, 2],
        baseFret: 2,
        category: "variation",
        isFundamental: false,
      },
      {
        name: "C#dim 8th Position Open Strings",
        positionLabel: "8th Position / Open High E",
        rootString: "Root: 5th String",
        frets: [null, null, 11, null, 8, 0],
        fingers: [null, null, 4, null, 1, null],
        baseFret: 8,
        category: "variation",
        isFundamental: false,
      },
    ];
  }

  if (root === "C#" && typeKey === "dim7") {
    return [
      {
        name: "C#dim7 3rd Position",
        positionLabel: "3rd Position",
        rootString: "Root: 5th String",
        frets: [null, 4, 5, 3, 5, 3],
        fingers: [null, 2, 3, 1, 4, 1],
        baseFret: 3,
        category: "variation",
        isFundamental: true,
      },
      {
        name: "C#dim7 3rd Position Open High E",
        positionLabel: "3rd Position / Open High E",
        rootString: "Root: 5th String",
        frets: [null, 4, 5, 3, 5, 0],
        fingers: [null, 2, 3, 1, 4, null],
        baseFret: 3,
        category: "variation",
        isFundamental: false,
      },
      {
        name: "C#dim7 8th Position Open Strings",
        positionLabel: "8th Position / Open B and High E",
        rootString: "Root: 6th String",
        frets: [9, 10, 8, null, 8, 0],
        fingers: [3, 4, 1, null, 2, null],
        baseFret: 8,
        category: "variation",
        isFundamental: false,
      },
      {
        name: "C#dim7 9th Position",
        positionLabel: "9th Position",
        rootString: "Root: 6th String",
        frets: [9, 10, 11, 9, 11, 9],
        fingers: [1, 2, 3, 1, 4, 1],
        baseFret: 9,
        category: "variation",
        isFundamental: false,
      },
      {
        name: "C#dim7 9th Position Open High E",
        positionLabel: "9th Position / Open High E",
        rootString: "Root: 6th String",
        frets: [9, 10, 11, 9, 11, 0],
        fingers: [1, 2, 3, 1, 4, null],
        baseFret: 9,
        category: "variation",
        isFundamental: false,
      },
      {
        name: "C#dim7 9th Position Open Strings",
        positionLabel: "9th Position / Open G and High E",
        rootString: "Root: 6th String",
        frets: [9, 10, 11, 0, 11, 0],
        fingers: [1, 2, 3, null, 4, null],
        baseFret: 9,
        category: "variation",
        isFundamental: false,
      },
      {
        name: "C#dim7 11th Position Open Strings",
        positionLabel: "11th Position / Open G and High E",
        rootString: "Root: 4th String",
        frets: [null, null, 11, null, 11, 0],
        fingers: [null, null, 1, null, 2, null],
        baseFret: 11,
        category: "variation",
        isFundamental: false,
      },
      {
        name: "C#dim7 11th Position Open High E",
        positionLabel: "11th Position / Open High E",
        rootString: "Root: 4th String",
        frets: [null, null, 11, 12, 11, 0],
        fingers: [null, null, 1, 3, 2, null],
        baseFret: 11,
        category: "variation",
        isFundamental: false,
      },
    ];
  }

  if (root === "C#" && typeKey === "m7b5") {
    return [
      {
        name: "C#m7b5 Open Voicing",
        positionLabel: "Open Position",
        rootString: "Root: 5th String",
        frets: [null, 4, 2, 0, 0, 0],
        fingers: [null, 3, 1, null, null, null],
        baseFret: 1,
        category: "fundamental-open",
        isFundamental: true,
      },
      {
        name: "C#m7b5 Open Variation",
        positionLabel: "Open Position",
        rootString: "Root: 5th String",
        frets: [null, 4, 2, 4, 2, 3],
        fingers: [null, 3, 1, 4, 1, 2],
        baseFret: 1,
        category: "variation",
        isFundamental: false,
      },
      {
        name: "C#m7b5 Open High E",
        positionLabel: "Open Position / Open G and B",
        rootString: "Root: 5th String",
        frets: [null, 4, 2, 0, 0, 3],
        fingers: [null, 3, 1, null, null, 2],
        baseFret: 1,
        category: "variation",
        isFundamental: false,
      },
      {
        name: "C#m7b5 Open B Variation",
        positionLabel: "Open Position / Open B",
        rootString: "Root: 5th String",
        frets: [null, 4, 2, 4, 0, 3],
        fingers: [null, 3, 1, 4, null, 2],
        baseFret: 1,
        category: "variation",
        isFundamental: false,
      },
      {
        name: "C#m7b5 4th Position Open Strings",
        positionLabel: "4th Position / Open G, B and E",
        rootString: "Root: 5th String",
        frets: [null, 4, 5, 0, 0, 0],
        fingers: [null, 1, 2, null, null, null],
        baseFret: 4,
        category: "variation",
        isFundamental: false,
      },
      {
        name: "C#m7b5 4th Position Open Strings Variation",
        positionLabel: "4th Position / Open B and E",
        rootString: "Root: 5th String",
        frets: [null, 4, 5, 4, 0, 0],
        fingers: [null, 1, 3, 2, null, null],
        baseFret: 4,
        category: "variation",
        isFundamental: false,
      },
      {
        name: "C#m7b5 4th Position Open B and E",
        positionLabel: "4th Position / Open B and E",
        rootString: "Root: 5th String",
        frets: [null, 4, 5, 6, 0, 0],
        fingers: [null, 1, 2, 3, null, null],
        baseFret: 4,
        category: "variation",
        isFundamental: false,
      },
      {
        name: "C#m7b5 7th Position Open G and B",
        positionLabel: "7th Position / Open G and B",
        rootString: "Root: 6th String",
        frets: [9, 7, 9, 0, 0, 7],
        fingers: [3, 1, 4, null, null, 2],
        baseFret: 7,
        category: "variation",
        isFundamental: false,
      },
    ];
  }

  if (root === "C#" && typeKey === "aug") {
    return [
      {
        name: "C#aug 9th Position",
        positionLabel: "9th Position",
        rootString: "Root: 4th String",
        frets: [null, null, 12, 10, 10, 9],
        fingers: [null, null, 4, 2, 2, 1],
        baseFret: 9,
        category: "variation",
        isFundamental: true,
      },
      {
        name: "C#aug Open Variation",
        positionLabel: "Open Position",
        rootString: "Root: 5th String",
        frets: [null, 4, 3, 2, 2, 1],
        fingers: [null, 4, 3, 2, 2, 1],
        baseFret: 1,
        category: "fundamental-open",
        isFundamental: false,
      },
      {
        name: "C#aug 2nd Position",
        positionLabel: "2nd Position",
        rootString: "Root: 5th String",
        frets: [null, 4, 3, 2, 2, 5],
        fingers: [null, 3, 2, 1, 1, 4],
        baseFret: 2,
        barre: { fret: 2, fromString: 3, toString: 4, finger: 1 },
        category: "variation",
        isFundamental: false,
      },
      {
        name: "C#aug 3rd Position",
        positionLabel: "3rd Position",
        rootString: "Root: 5th String",
        frets: [null, 4, 3, 6, 6, 5],
        fingers: [null, 2, 1, 4, 4, 3],
        baseFret: 3,
        barre: { fret: 6, fromString: 3, toString: 4, finger: 4 },
        category: "variation",
        isFundamental: false,
      },
      {
        name: "C#aug 4th Position",
        positionLabel: "4th Position",
        rootString: "Root: 5th String",
        frets: [null, 4, 7, 6, 6, 5],
        fingers: [null, 1, 4, 3, 3, 2],
        baseFret: 4,
        barre: { fret: 6, fromString: 3, toString: 4, finger: 3 },
        category: "variation",
        isFundamental: false,
      },
      {
        name: "C#aug 6th Position Open A",
        positionLabel: "6th Position / Open A",
        rootString: "Root: 6th String",
        frets: [9, 0, 7, 6, 6, 9],
        fingers: [3, null, 2, 1, 1, 4],
        baseFret: 6,
        barre: { fret: 6, fromString: 3, toString: 4, finger: 1 },
        category: "variation",
        isFundamental: false,
      },
      {
        name: "C#aug 7th Position Open A",
        positionLabel: "7th Position / Open A",
        rootString: "Root: 6th String",
        frets: [8, 0, 7, 10, 10, 8],
        fingers: [2, null, 1, 4, 4, 3],
        baseFret: 7,
        barre: { fret: 10, fromString: 3, toString: 4, finger: 4 },
        category: "variation",
        isFundamental: false,
      },
      {
        name: "C#aug 9th Position",
        positionLabel: "9th Position",
        rootString: "Root: 6th String",
        frets: [9, 12, 11, 10, 10, 9],
        fingers: [1, 4, 3, 2, 2, 1],
        baseFret: 9,
        barre: { fret: 10, fromString: 3, toString: 4, finger: 2 },
        category: "variation",
        isFundamental: false,
      },
    ];
  }

  if (root === "C#" && typeKey === "sus2") {
    return [
      {
        name: "C#sus2 4th Position",
        positionLabel: "4th Position",
        rootString: "Root: 5th String",
        frets: [null, 4, 6, 6, 4, 4],
        fingers: [null, 1, 3, 4, 1, 1],
        baseFret: 4,
        category: "variation",
        isFundamental: true,
      },
      {
        name: "C#sus2 Open Variation",
        positionLabel: "Open Position",
        rootString: "Root: 5th String",
        frets: [null, 4, 4, 1, 2, 4],
        fingers: [null, 3, 1, 1, 2, 4],
        baseFret: 1,
        barre: { fret: 1, fromString: 2, toString: 3, finger: 1 },
        category: "fundamental-open",
        isFundamental: false,
      },
      {
        name: "C#sus2 Open Variation High Voicing",
        positionLabel: "Open Position / High Voicing",
        rootString: "Root: 5th String",
        frets: [null, 4, 4, 1, 4, 4],
        fingers: [null, 2, 1, 1, 3, 4],
        baseFret: 1,
        barre: { fret: 1, fromString: 2, toString: 3, finger: 1 },
        category: "variation",
        isFundamental: false,
      },
      {
        name: "C#sus2 6th Position",
        positionLabel: "6th Position",
        rootString: "Root: 6th String",
        frets: [10, 6, 6, 6, 10, 10],
        fingers: [2, 1, 1, 1, 3, 4],
        baseFret: 6,
        barre: { fret: 6, fromString: 1, toString: 3, finger: 1 },
        category: "CAGED",
        isFundamental: false,
      },
      {
        name: "C#sus2 6th Position Variation",
        positionLabel: "6th Position",
        rootString: "Root: 6th String",
        frets: [10, 6, 6, 8, 10, 10],
        fingers: [3, 1, 1, 2, 4, 4],
        baseFret: 6,
        barre: { fret: 6, fromString: 1, toString: 2, finger: 1 },
        category: "variation",
        isFundamental: false,
      },
      {
        name: "C#sus2 8th Position",
        positionLabel: "8th Position",
        rootString: "Root: 6th String",
        frets: [9, 12, 12, 8, 9, 9],
        fingers: [2, 4, 4, 1, 3, 3],
        baseFret: 8,
        barres: [
          { fret: 12, fromString: 1, toString: 2, finger: 4 },
          { fret: 9, fromString: 4, toString: 5, finger: 3 },
        ],
        category: "variation",
        isFundamental: false,
      },
      {
        name: "C#sus2 8th Position Top Strings",
        positionLabel: "8th Position / Top Strings",
        rootString: "Root: 4th String",
        frets: [null, null, 12, 8, 9, 9],
        fingers: [null, null, 4, 1, 2, 3],
        baseFret: 8,
        category: "variation",
        isFundamental: false,
      },
      {
        name: "C#sus2 8th Position High Voicing",
        positionLabel: "8th Position / High Voicing",
        rootString: "Root: 4th String",
        frets: [null, null, 12, 8, 9, 12],
        fingers: [null, null, 3, 1, 2, 4],
        baseFret: 8,
        category: "variation",
        isFundamental: false,
      },
    ];
  }

  if (root === "C#" && typeKey === "sus4") {
    return [
      {
        name: "C#sus4 9th Position Barre",
        positionLabel: "9th Position",
        rootString: "Root: 6th String",
        frets: [9, 9, 11, 11, 9, 9],
        fingers: [1, 1, 3, 4, 1, 1],
        baseFret: 9,
        barre: { fret: 9, fromString: 0, toString: 5, finger: 1 },
        category: "CAGED",
        isFundamental: true,
      },
      {
        name: "C#sus4 9th Position Top Strings",
        positionLabel: "9th Position / Top Strings",
        rootString: "Root: 4th String",
        frets: [null, null, 11, 11, 9, 9],
        fingers: [null, null, 3, 4, 1, 2],
        baseFret: 9,
        category: "variation",
        isFundamental: false,
      },
      {
        name: "C#sus4 9th Position Variation",
        positionLabel: "9th Position",
        rootString: "Root: 6th String",
        frets: [9, 11, 11, 11, 9, 9],
        fingers: [1, 2, 3, 4, 1, 1],
        baseFret: 9,
        barre: { fret: 9, fromString: 4, toString: 5, finger: 1 },
        category: "variation",
        isFundamental: false,
      },
      {
        name: "C#sus4 Open Voicing",
        positionLabel: "Open Position",
        rootString: "Root: 5th String",
        frets: [null, 4, 4, 1, 2, 2],
        fingers: [null, 4, 4, 1, 2, 3],
        baseFret: 1,
        barre: { fret: 4, fromString: 1, toString: 2, finger: 4 },
        category: "fundamental-open",
        isFundamental: false,
      },
      {
        name: "C#sus4 Open Variation",
        positionLabel: "Open Position",
        rootString: "Root: 5th String",
        frets: [null, 4, 4, 1, 2, 4],
        fingers: [null, 3, 3, 1, 2, 4],
        baseFret: 1,
        barre: { fret: 4, fromString: 1, toString: 2, finger: 3 },
        category: "variation",
        isFundamental: false,
      },
      {
        name: "C#sus4 4th Position",
        positionLabel: "4th Position",
        rootString: "Root: 5th String",
        frets: [null, 4, 4, 6, 7, 4],
        fingers: [null, 1, 1, 3, 4, 1],
        baseFret: 4,
        barre: { fret: 4, fromString: 1, toString: 2, finger: 1 },
        category: "variation",
        isFundamental: false,
      },
      {
        name: "C#sus4 4th Position Variation",
        positionLabel: "4th Position",
        rootString: "Root: 5th String",
        frets: [null, 4, 6, 6, 7, 4],
        fingers: [null, 1, 3, 3, 4, 1],
        baseFret: 4,
        barre: { fret: 6, fromString: 2, toString: 3, finger: 3 },
        category: "variation",
        isFundamental: false,
      },
      {
        name: "C#sus4 6th Position Double Barre",
        positionLabel: "6th Position",
        rootString: "Root: 6th String",
        frets: [10, 10, 6, 6, 7, 10],
        fingers: [3, 3, 1, 1, 2, 4],
        baseFret: 6,
        barres: [
          { fret: 10, fromString: 0, toString: 1, finger: 3 },
          { fret: 6, fromString: 2, toString: 3, finger: 1 },
        ],
        category: "variation",
        isFundamental: false,
      },
    ];
  }

  if (root === "C#" && typeKey === "add9") {
    return [
      {
        name: "C#add9 9th Position",
        positionLabel: "9th Position",
        rootString: "Root: 6th String",
        frets: [9, 11, 11, 10, 9, 11],
        fingers: [1, 3, 3, 2, 1, 4],
        baseFret: 9,
        barre: { fret: 11, fromString: 1, toString: 2, finger: 3 },
        category: "CAGED",
        isFundamental: true,
      },
      {
        name: "C#add9 9th Position Top Strings",
        positionLabel: "9th Position / Top Strings",
        rootString: "Root: 4th String",
        frets: [null, null, 11, 10, 9, 11],
        fingers: [null, null, 3, 2, 1, 4],
        baseFret: 9,
        category: "variation",
        isFundamental: false,
      },
      {
        name: "C#add9 Open Variation",
        positionLabel: "Open Position",
        rootString: "Root: 5th String",
        frets: [null, 4, 4, 1, 2, 1],
        fingers: [null, 4, 1, 1, 2, 1],
        baseFret: 1,
        barre: { fret: 1, fromString: 2, toString: 3, finger: 1 },
        category: "fundamental-open",
        isFundamental: false,
      },
      {
        name: "C#add9 Open High Variation",
        positionLabel: "Open Position / High Strings",
        rootString: "Root: 5th String",
        frets: [null, 4, 4, 1, 4, 1],
        fingers: [null, 3, 1, 1, 4, 1],
        baseFret: 1,
        barre: { fret: 1, fromString: 2, toString: 3, finger: 1 },
        category: "variation",
        isFundamental: false,
      },
      {
        name: "C#add9 Open Voicing",
        positionLabel: "Open Position",
        rootString: "Root: 5th String",
        frets: [null, 4, 3, 1, 4, 1],
        fingers: [null, 3, 2, 1, 4, 1],
        baseFret: 1,
        category: "variation",
        isFundamental: false,
      },
      {
        name: "C#add9 Open High E Variation",
        positionLabel: "Open Position / High E",
        rootString: "Root: 5th String",
        frets: [null, 4, 3, 1, 4, 4],
        fingers: [null, 3, 2, 1, 4, 4],
        baseFret: 1,
        barre: { fret: 4, fromString: 4, toString: 5, finger: 4 },
        category: "variation",
        isFundamental: false,
      },
      {
        name: "C#add9 3rd Position",
        positionLabel: "3rd Position",
        rootString: "Root: 5th String",
        frets: [null, 4, 3, 7, 4, 4],
        fingers: [null, 2, 1, 4, 3, 3],
        baseFret: 3,
        barre: { fret: 4, fromString: 4, toString: 5, finger: 3 },
        category: "variation",
        isFundamental: false,
      },
      {
        name: "C#add9 6th Position Barre",
        positionLabel: "6th Position",
        rootString: "Root: 6th String",
        frets: [10, 6, 6, 6, 6, 10],
        fingers: [3, 1, 1, 1, 1, 4],
        baseFret: 6,
        barre: { fret: 6, fromString: 1, toString: 4, finger: 1 },
        category: "CAGED",
        isFundamental: false,
      },
    ];
  }

  if (root === "C#" && typeKey === "9") {
    return [
      {
        name: "C#9 9th Position",
        positionLabel: "9th Position",
        rootString: "Root: 6th String",
        frets: [9, 11, 9, 10, 9, 11],
        fingers: [1, 3, 1, 2, 1, 4],
        baseFret: 9,
        category: "CAGED",
        isFundamental: true,
      },
      {
        name: "C#9 9th Position Open B",
        positionLabel: "9th Position / Open B",
        rootString: "Root: 6th String",
        frets: [9, 11, 9, 10, 0, 11],
        fingers: [1, 3, 1, 2, null, 4],
        baseFret: 9,
        category: "variation",
        isFundamental: false,
      },
      {
        name: "C#9 9th Position Open B Variation",
        positionLabel: "9th Position / Open B",
        rootString: "Root: 6th String",
        frets: [9, 11, 11, 10, 0, 11],
        fingers: [1, 3, 3, 2, null, 4],
        baseFret: 9,
        category: "variation",
        isFundamental: false,
      },
      {
        name: "C#9 Open Variation",
        positionLabel: "Open Position",
        rootString: "Root: 5th String",
        frets: [null, 4, 1, 1, 0, 1],
        fingers: [null, 4, 1, 1, null, 2],
        baseFret: 1,
        barre: { fret: 1, fromString: 2, toString: 3, finger: 1 },
        category: "fundamental-open",
        isFundamental: false,
      },
      {
        name: "C#9 6th Position Barre",
        positionLabel: "6th Position",
        rootString: "Root: 6th String",
        frets: [10, 6, 6, 6, 6, 7],
        fingers: [4, 1, 1, 1, 1, 2],
        baseFret: 6,
        barre: { fret: 6, fromString: 1, toString: 4, finger: 1 },
        category: "CAGED",
        isFundamental: false,
      },
      {
        name: "C#9 6th Position Variation",
        positionLabel: "6th Position",
        rootString: "Root: 6th String",
        frets: [10, 6, 6, 8, 6, 7],
        fingers: [4, 1, 1, 3, 1, 2],
        baseFret: 6,
        barre: { fret: 6, fromString: 1, toString: 2, finger: 1 },
        category: "variation",
        isFundamental: false,
      },
      {
        name: "C#9 8th Position Open High E",
        positionLabel: "8th Position / Open High E",
        rootString: "Root: 5th String",
        frets: [9, 8, 9, 8, 9, null],
        fingers: [2, 1, 3, 1, 4, null],
        baseFret: 8,
        category: "variation",
        isFundamental: false,
      },
      {
        name: "C#9 9th Position Open B",
        positionLabel: "9th Position / Open B",
        rootString: "Root: 6th String",
        frets: [9, 11, 9, 10, 0, 12],
        fingers: [1, 3, 1, 2, null, 4],
        baseFret: 9,
        category: "variation",
        isFundamental: false,
      },
    ];
  }

  if (root === "C#" && typeKey === "11") {
    return [
      {
        name: "C#11 9th Position",
        positionLabel: "9th Position",
        rootString: "Root: 6th String",
        frets: [9, 9, 9, 10, 9, 11],
        fingers: [1, 1, 1, 2, 1, 3],
        baseFret: 9,
        barre: { fret: 9, fromString: 0, toString: 2, finger: 1 },
        category: "CAGED",
        isFundamental: true,
      },
      {
        name: "C#11 6th Position",
        positionLabel: "6th Position",
        rootString: "Root: 6th String",
        frets: [10, 10, 6, 8, 6, 7],
        fingers: [4, 4, 1, 3, 1, 2],
        baseFret: 6,
        barre: { fret: 10, fromString: 0, toString: 1, finger: 4 },
        category: "variation",
        isFundamental: false,
      },
    ];
  }

  if (root === "C#" && typeKey === "6") {
    return [
      {
        name: "C#6 Open Variation",
        positionLabel: "Open Position",
        rootString: "Root: 5th String",
        frets: [null, 4, 3, 3, 2, 4],
        fingers: [null, 3, 2, 2, 1, 4],
        baseFret: 1,
        barre: { fret: 3, fromString: 2, toString: 3, finger: 2 },
        category: "fundamental-open",
        isFundamental: true,
      },
      {
        name: "C#6 9th Position",
        positionLabel: "9th Position",
        rootString: "Root: 6th String",
        frets: [9, 11, 11, 10, 11, 9],
        fingers: [1, 3, 3, 2, 4, 1],
        baseFret: 9,
        category: "CAGED",
        isFundamental: false,
      },
      {
        name: "C#6 11th Position Top Strings",
        positionLabel: "11th Position / Top Strings",
        rootString: "Root: 4th String",
        frets: [null, null, 11, 13, 11, 13],
        fingers: [null, null, 1, 3, 2, 4],
        baseFret: 11,
        category: "variation",
        isFundamental: false,
      },
      {
        name: "C#6 3rd Position",
        positionLabel: "3rd Position",
        rootString: "Root: 5th String",
        frets: [null, 4, 3, 3, 6, 4],
        fingers: [null, 2, 1, 1, 4, 3],
        baseFret: 3,
        barre: { fret: 3, fromString: 2, toString: 3, finger: 1 },
        category: "variation",
        isFundamental: false,
      },
      {
        name: "C#6 3rd Position Open High Strings",
        positionLabel: "3rd Position / Open High Strings",
        rootString: "Root: 5th String",
        frets: [null, 4, 6, 3, 6, 6],
        fingers: [null, 2, 3, 1, 4, 4],
        baseFret: 3,
        barre: { fret: 6, fromString: 4, toString: 5, finger: 4 },
        category: "variation",
        isFundamental: false,
      },
      {
        name: "C#6 6th Position Barre",
        positionLabel: "6th Position",
        rootString: "Root: 6th String",
        frets: [10, 8, 6, 6, 6, 6],
        fingers: [4, 3, 1, 1, 1, 1],
        baseFret: 6,
        barre: { fret: 6, fromString: 2, toString: 5, finger: 1 },
        category: "CAGED",
        isFundamental: false,
      },
      {
        name: "C#6 6th Position Variation",
        positionLabel: "6th Position",
        rootString: "Root: 6th String",
        frets: [10, 8, 6, 6, 10, 6],
        fingers: [3, 2, 1, 1, 4, 1],
        baseFret: 6,
        barre: { fret: 6, fromString: 2, toString: 3, finger: 1 },
        category: "variation",
        isFundamental: false,
      },
      {
        name: "C#6 6th Position Open Strings",
        positionLabel: "6th Position",
        rootString: "Root: 6th String",
        frets: [10, 8, 8, 6, 10, 6],
        fingers: [3, 2, 2, 1, 4, 1],
        baseFret: 6,
        barre: { fret: 8, fromString: 1, toString: 2, finger: 2 },
        category: "variation",
        isFundamental: false,
      },
    ];
  }

  if (root === "C#" && typeKey === "min6") {
    return [
      {
        name: "C#m6 Open Variation",
        positionLabel: "Open Position",
        rootString: "Root: 5th String",
        frets: [null, 4, 2, 3, 2, 4],
        fingers: [null, 3, 1, 2, 1, 4],
        baseFret: 1,
        category: "fundamental-open",
        isFundamental: true,
      },
      {
        name: "C#m6 4th Position",
        positionLabel: "4th Position",
        rootString: "Root: 5th String",
        frets: [null, 4, 6, 6, 5, 6],
        fingers: [null, 1, 3, 3, 2, 4],
        baseFret: 4,
        barre: { fret: 6, fromString: 2, toString: 3, finger: 3 },
        category: "variation",
        isFundamental: false,
      },
      {
        name: "C#m6 7th Position Open High E",
        positionLabel: "7th Position / Open High E",
        rootString: "Root: 6th String",
        frets: [9, 7, 8, 9, 9, 0],
        fingers: [3, 1, 2, 4, 4, null],
        baseFret: 7,
        barre: { fret: 9, fromString: 3, toString: 4, finger: 4 },
        category: "variation",
        isFundamental: false,
      },
      {
        name: "C#m6 8th Position Open High E",
        positionLabel: "8th Position / Open High E",
        rootString: "Root: 6th String",
        frets: [9, null, 8, 9, 9, 0],
        fingers: [2, null, 1, 3, 4, null],
        baseFret: 8,
        category: "variation",
        isFundamental: false,
      },
      {
        name: "C#m6 9th Position",
        positionLabel: "9th Position",
        rootString: "Root: 6th String",
        frets: [9, 11, 11, 9, 11, 9],
        fingers: [1, 3, 3, 1, 4, 1],
        baseFret: 9,
        category: "CAGED",
        isFundamental: false,
      },
      {
        name: "C#m6 9th Position Open High E",
        positionLabel: "9th Position / Open High E",
        rootString: "Root: 6th String",
        frets: [9, 11, 11, 9, 11, 0],
        fingers: [1, 3, 3, 1, 4, null],
        baseFret: 9,
        category: "variation",
        isFundamental: false,
      },
      {
        name: "C#m6 11th Position Open Strings",
        positionLabel: "11th Position / Open High E",
        rootString: "Root: 4th String",
        frets: [null, null, 11, 13, 11, 0],
        fingers: [null, null, 1, 3, 2, null],
        baseFret: 11,
        category: "variation",
        isFundamental: false,
      },
      {
        name: "C#m6 11th Position",
        positionLabel: "11th Position",
        rootString: "Root: 4th String",
        frets: [null, null, 11, 13, 11, 12],
        fingers: [null, null, 1, 4, 2, 3],
        baseFret: 11,
        category: "variation",
        isFundamental: false,
      },
    ];
  }

  if (root === "C#" && typeKey === "7b9") {
    return [
      {
        name: "C#7b9 Open Variation",
        positionLabel: "Open Position",
        rootString: "Root: 5th String",
        frets: [null, 4, 3, 4, 3, 4],
        fingers: [null, 2, 1, 3, 1, 4],
        baseFret: 1,
        category: "fundamental-open",
        isFundamental: true,
      },
      {
        name: "C#7b9 4th Position Open D",
        positionLabel: "4th Position / Open D",
        rootString: "Root: 5th String",
        frets: [null, 4, 0, 4, 6, 4],
        fingers: [null, 1, null, 2, 4, 3],
        baseFret: 4,
        category: "variation",
        isFundamental: false,
      },
      {
        name: "C#7b9 7th Position Open D",
        positionLabel: "7th Position / Open D",
        rootString: "Root: 6th String",
        frets: [9, 8, null, 7, 9, 7],
        fingers: [3, 2, null, 1, 4, 1],
        baseFret: 7,
        category: "variation",
        isFundamental: false,
      },
      {
        name: "C#7b9 9th Position Open Strings",
        positionLabel: "9th Position / Open D and B",
        rootString: "Root: 6th String",
        frets: [9, 11, 0, 11, 0, 10],
        fingers: [1, 4, null, 3, null, 2],
        baseFret: 9,
        category: "variation",
        isFundamental: false,
      },
      {
        name: "C#7b9 Open High Strings",
        positionLabel: "Open Position / Open D and B",
        rootString: "Root: 5th String",
        frets: [null, 4, 0, 1, 0, 1],
        fingers: [null, 4, null, 1, null, 2],
        baseFret: 1,
        category: "variation",
        isFundamental: false,
      },
      {
        name: "C#7b9 7th Position Variation",
        positionLabel: "7th Position",
        rootString: "Root: 6th String",
        frets: [9, 8, null, 7, 9, 7],
        fingers: [3, 2, null, 1, 4, 1],
        baseFret: 7,
        category: "variation",
        isFundamental: false,
      },
      {
        name: "C#7b9 9th Position Open Strings",
        positionLabel: "9th Position / Open D and B",
        rootString: "Root: 6th String",
        frets: [9, 11, 0, 10, 0, null],
        fingers: [1, 3, null, 2, null, null],
        baseFret: 9,
        category: "variation",
        isFundamental: false,
      },
      {
        name: "C#7b9 6th Position Open B",
        positionLabel: "6th Position / Open B",
        rootString: "Root: 6th String",
        frets: [10, 8, 6, 7, 0, null],
        fingers: [4, 3, 1, 2, null, null],
        baseFret: 6,
        category: "variation",
        isFundamental: false,
      },
    ];
  }

  if (root === "C#" && typeKey === "7#9") {
    return [
      {
        name: "C#7#9 4th Position Open High E",
        positionLabel: "4th Position / Open High E",
        rootString: "Root: 5th String",
        frets: [null, 4, 6, 4, 6, 0],
        fingers: [null, 1, 3, 2, 4, null],
        baseFret: 4,
        category: "variation",
        isFundamental: true,
      },
      {
        name: "C#7#9 9th Position Open High E",
        positionLabel: "9th Position / Open High E",
        rootString: "Root: 6th String",
        frets: [9, 11, 9, 10, 9, 0],
        fingers: [1, 3, 1, 2, 1, null],
        baseFret: 9,
        category: "CAGED",
        isFundamental: false,
      },
      {
        name: "C#7#9 9th Position Open B and High E",
        positionLabel: "9th Position / Open B and High E",
        rootString: "Root: 6th String",
        frets: [9, 11, 9, 10, 0, 0],
        fingers: [1, 4, 2, 3, null, null],
        baseFret: 9,
        category: "variation",
        isFundamental: false,
      },
      {
        name: "C#7#9 9th Position Open Strings",
        positionLabel: "9th Position / Open B and High E",
        rootString: "Root: 6th String",
        frets: [9, 11, 11, 10, 0, 0],
        fingers: [1, 3, 4, 2, null, null],
        baseFret: 9,
        category: "variation",
        isFundamental: false,
      },
      {
        name: "C#7#9 Open Strings",
        positionLabel: "Open Position / Open B and High E",
        rootString: "Root: 5th String",
        frets: [null, 4, 3, 1, 0, 0],
        fingers: [null, 4, 3, 1, null, null],
        baseFret: 1,
        category: "fundamental-open",
        isFundamental: false,
      },
      {
        name: "C#7#9 6th Position Open Strings",
        positionLabel: "6th Position / Open B and High E",
        rootString: "Root: 6th String",
        frets: [10, 8, 6, 6, 0, 0],
        fingers: [4, 3, 1, 2, null, null],
        baseFret: 6,
        category: "variation",
        isFundamental: false,
      },
      {
        name: "C#7#9 6th Position Open Strings Variation",
        positionLabel: "6th Position / Open B and High E",
        rootString: "Root: 6th String",
        frets: [10, 8, 6, 10, 0, 0],
        fingers: [3, 2, 1, 4, null, null],
        baseFret: 6,
        category: "variation",
        isFundamental: false,
      },
      {
        name: "C#7#9 6th Position Barre",
        positionLabel: "6th Position",
        rootString: "Root: 6th String",
        frets: [10, 8, 6, 6, 6, 8],
        fingers: [4, 2, 1, 1, 1, 3],
        baseFret: 6,
        barre: { fret: 6, fromString: 2, toString: 4, finger: 1 },
        category: "CAGED",
        isFundamental: false,
      },
    ];
  }

  if (root === "C" && typeKey === "minor") {
    const aShape = voicings.find(
      (voicing) =>
        JSON.stringify(voicing.frets) === JSON.stringify([null, 3, 5, 5, 4, 3]),
    );
    if (aShape) {
      aShape.fingers = [null, 1, 3, 4, 2, 1];
      aShape.barre = { fret: 3, fromString: 1, toString: 5, finger: 1 };
    }

    const eShape = voicings.find(
      (voicing) =>
        JSON.stringify(voicing.frets) === JSON.stringify([8, 10, 10, 8, 8, 8]),
    );
    if (eShape) {
      eShape.fingers = [1, 3, 4, 1, 1, 1];
      eShape.barre = { fret: 8, fromString: 0, toString: 5, finger: 1 };
    }

    voicings.push(
      {
        name: "C Minor Open G Variation",
        positionLabel: "Open Position / Open G",
        rootString: "Root: 5th String",
        frets: [null, 3, 1, 0, 1, 3],
        fingers: [null, 3, 1, null, 2, 4],
        baseFret: 1,
        category: "variation",
        isFundamental: false,
      },
      {
        name: "C Minor 3rd Position Open G",
        positionLabel: "3rd Position / Open G",
        rootString: "Root: 5th String",
        frets: [null, 3, 5, 0, 4, 3],
        fingers: [null, 1, 4, null, 3, 2],
        baseFret: 3,
        category: "variation",
        isFundamental: false,
      },
      {
        name: "C Minor 8th Position",
        positionLabel: "8th Position / Top Four Strings",
        rootString: "Root: 4th String",
        frets: [null, null, 10, 8, 8, 8],
        fingers: [null, null, 3, 1, 1, 1],
        baseFret: 8,
        barre: { fret: 8, fromString: 3, toString: 5, finger: 1 },
        category: "variation",
        isFundamental: false,
      },
      {
        name: "C Minor Open G High Voicing",
        positionLabel: "Open Position / Open G High Voicing",
        rootString: "Root: 5th String",
        frets: [null, 3, 1, 0, 4, 3],
        fingers: [null, 2, 1, null, 4, 3],
        baseFret: 1,
        category: "variation",
        isFundamental: false,
      },
      {
        name: "C Minor 5th Position",
        positionLabel: "5th Position",
        rootString: "Root: 6th String",
        frets: [8, 6, 5, 5, 8, 8],
        fingers: [3, 2, 1, 1, 4, 4],
        baseFret: 5,
        barres: [
          { fret: 5, fromString: 2, toString: 3, finger: 1 },
          { fret: 8, fromString: 4, toString: 5, finger: 4 },
        ],
        category: "variation",
        isFundamental: false,
      },
      {
        name: "C Minor 5th Position Open G",
        positionLabel: "5th Position / Open G",
        rootString: "Root: 6th String",
        frets: [8, 6, 5, 0, 8, 8],
        fingers: [3, 2, 1, null, 4, 4],
        baseFret: 5,
        barre: { fret: 8, fromString: 4, toString: 5, finger: 4 },
        category: "variation",
        isFundamental: false,
      },
    );
  }

  if (root === "C" && typeKey === "7") {
    const aShape = voicings.find(
      (voicing) =>
        JSON.stringify(voicing.frets) === JSON.stringify([null, 3, 5, 3, 5, 3]),
    );
    if (aShape) {
      aShape.fingers = [null, 1, 3, 1, 4, 1];
      aShape.barre = { fret: 3, fromString: 1, toString: 5, finger: 1 };
    }

    const eShape = voicings.find(
      (voicing) =>
        JSON.stringify(voicing.frets) === JSON.stringify([8, 10, 8, 9, 8, 8]),
    );
    if (eShape) {
      eShape.fingers = [1, 3, 1, 2, 1, 1];
      eShape.barre = { fret: 8, fromString: 0, toString: 5, finger: 1 };
    }

    voicings.push(
      {
        name: "C7 3rd Position Open E",
        positionLabel: "3rd Position / Open E",
        rootString: "Root: 5th String",
        frets: [null, 3, 5, 3, 5, 0],
        fingers: [null, 1, 3, 2, 4, null],
        baseFret: 3,
        category: "variation",
        isFundamental: false,
      },
      {
        name: "C7 7th Position Open Strings",
        positionLabel: "7th Position / Open G and E",
        rootString: "Root: 6th String",
        frets: [8, 7, 8, 0, 8, 0],
        fingers: [2, 1, 3, null, 4, null],
        baseFret: 7,
        category: "variation",
        isFundamental: false,
      },
      {
        name: "C7 8th Position Open Strings",
        positionLabel: "8th Position / Open G and E",
        rootString: "Root: 6th String",
        frets: [8, 10, 8, 0, 8, 0],
        fingers: [1, 4, 2, null, 3, null],
        baseFret: 8,
        category: "variation",
        isFundamental: false,
      },
      {
        name: "C7 8th Position Open E",
        positionLabel: "8th Position / Open E",
        rootString: "Root: 6th String",
        frets: [8, 10, 8, 9, 8, 0],
        fingers: [1, 3, 1, 2, 1, null],
        baseFret: 8,
        barre: { fret: 8, fromString: 0, toString: 4, finger: 1 },
        category: "variation",
        isFundamental: false,
      },
      {
        name: "C7 10th Position Open Strings",
        positionLabel: "10th Position / Open G and E",
        rootString: "Root: 4th String",
        frets: [null, null, 10, 0, 11, 0],
        fingers: [null, null, 1, null, 2, null],
        baseFret: 10,
        category: "variation",
        isFundamental: false,
      },
      {
        name: "C7 10th Position Open E",
        positionLabel: "10th Position / Open E",
        rootString: "Root: 4th String",
        frets: [null, null, 10, 12, 11, 0],
        fingers: [null, null, 1, 3, 2, null],
        baseFret: 10,
        category: "variation",
        isFundamental: false,
      },
    );
  }

  if (root === "C" && typeKey === "maj7") {
    const openShape = voicings.find(
      (voicing) =>
        JSON.stringify(voicing.frets) === JSON.stringify([null, 3, 2, 0, 0, 0]),
    );
    if (openShape) {
      openShape.fingers = [null, 2, 1, null, null, null];
    }

    const aShape = voicings.find(
      (voicing) =>
        JSON.stringify(voicing.frets) === JSON.stringify([null, 3, 5, 4, 5, 3]),
    );
    if (aShape) {
      aShape.fingers = [null, 1, 3, 2, 4, 1];
      aShape.barre = { fret: 3, fromString: 1, toString: 5, finger: 1 };
    }

    voicings.push(
      {
        name: "Cmaj7 Open Variation",
        positionLabel: "Open Position Variation",
        rootString: "Root: 5th String",
        frets: [null, 3, 2, 0, 0, 3],
        fingers: [null, 2, 1, null, null, 3],
        baseFret: 1,
        category: "variation",
        isFundamental: false,
      },
      {
        name: "Cmaj7 3rd Position Open Strings",
        positionLabel: "3rd Position / Open G, B and E",
        rootString: "Root: 5th String",
        frets: [null, 3, 5, 0, 0, 0],
        fingers: [null, 1, 3, null, null, null],
        baseFret: 3,
        category: "variation",
        isFundamental: false,
      },
      {
        name: "Cmaj7 3rd Position Open B and E",
        positionLabel: "3rd Position / Open B and E",
        rootString: "Root: 5th String",
        frets: [null, 3, 5, 4, 0, 0],
        fingers: [null, 1, 3, 2, null, null],
        baseFret: 3,
        category: "variation",
        isFundamental: false,
      },
      {
        name: "Cmaj7 3rd Position Open B and E High",
        positionLabel: "3rd Position / Open B and E High Voicing",
        rootString: "Root: 5th String",
        frets: [null, 3, 5, 5, 0, 0],
        fingers: [null, 1, 3, 4, null, null],
        baseFret: 3,
        category: "variation",
        isFundamental: false,
      },
      {
        name: "Cmaj7 3rd Position Open E",
        positionLabel: "3rd Position / Open E",
        rootString: "Root: 5th String",
        frets: [null, 3, 5, 4, 5, 0],
        fingers: [null, 1, 3, 2, 4, null],
        baseFret: 3,
        category: "variation",
        isFundamental: false,
      },
      {
        name: "Cmaj7 7th Position Open G and B",
        positionLabel: "7th Position / Open G and B",
        rootString: "Root: 6th String",
        frets: [8, 7, 9, 0, 0, 7],
        fingers: [3, 1, 4, null, null, 2],
        baseFret: 7,
        category: "variation",
        isFundamental: false,
      },
    );
  }

  if (root === "C" && typeKey === "min7") {
    const aShape = voicings.find(
      (voicing) =>
        JSON.stringify(voicing.frets) === JSON.stringify([null, 3, 5, 3, 4, 3]),
    );
    if (aShape) {
      aShape.fingers = [null, 1, 3, 1, 2, 1];
      aShape.barre = { fret: 3, fromString: 1, toString: 5, finger: 1 };
    }

    const dShape = voicings.find(
      (voicing) =>
        JSON.stringify(voicing.frets) ===
        JSON.stringify([null, null, 10, 12, 11, 11]),
    );
    if (dShape) {
      dShape.fingers = [null, null, 1, 4, 2, 3];
    }

    voicings.push(
      {
        name: "Cm7 Open Variation",
        positionLabel: "Open Position Variation",
        rootString: "Root: 5th String",
        frets: [null, 3, 1, 3, 1, 3],
        fingers: [null, 2, 1, 3, 1, 4],
        baseFret: 1,
        barre: { fret: 1, fromString: 2, toString: 4, finger: 1 },
        category: "variation",
        isFundamental: false,
      },
      {
        name: "Cm7 10th Position Open G",
        positionLabel: "10th Position / Open G",
        rootString: "Root: 4th String",
        frets: [null, null, 10, 0, 11, 11],
        fingers: [null, null, 1, null, 2, 3],
        baseFret: 10,
        category: "variation",
        isFundamental: false,
      },
      {
        name: "Cm7 3rd Position High Bb",
        positionLabel: "3rd Position / High Bb",
        rootString: "Root: 5th String",
        frets: [null, 3, 5, 3, 4, 6],
        fingers: [null, 1, 3, 1, 2, 4],
        baseFret: 3,
        barre: { fret: 3, fromString: 1, toString: 3, finger: 1 },
        category: "variation",
        isFundamental: false,
      },
      {
        name: "Cm7 3rd Position Open G",
        positionLabel: "3rd Position / Open G",
        rootString: "Root: 5th String",
        frets: [null, 3, 5, 0, 4, 6],
        fingers: [null, 1, 3, null, 2, 4],
        baseFret: 3,
        category: "variation",
        isFundamental: false,
      },
      {
        name: "Cm7 3rd Position D-G Barre",
        positionLabel: "3rd Position / D-G Barre",
        rootString: "Root: 5th String",
        frets: [null, 3, 5, 5, 4, 6],
        fingers: [null, 1, 3, 3, 2, 4],
        baseFret: 3,
        barre: { fret: 5, fromString: 2, toString: 3, finger: 3 },
        category: "variation",
        isFundamental: false,
      },
      {
        name: "Cm7 8th Position High Bb",
        positionLabel: "8th Position / High Bb",
        rootString: "Root: 6th String",
        frets: [8, 10, 8, 8, 11, 8],
        fingers: [1, 3, 1, 1, 4, 1],
        baseFret: 8,
        barre: { fret: 8, fromString: 0, toString: 5, finger: 1 },
        category: "variation",
        isFundamental: false,
      },
    );
  }

  if (root === "C" && typeKey === "dim") {
    voicings.push(
      {
        name: "Cdim 7th Position",
        positionLabel: "7th Position / Top Four Strings",
        rootString: "Root: 4th String",
        frets: [null, null, 10, 8, 7, 8],
        fingers: [null, null, 4, 2, 1, 3],
        baseFret: 7,
        category: "variation",
        isFundamental: false,
      },
      {
        name: "Cdim 10th Position",
        positionLabel: "10th Position / Top Four Strings",
        rootString: "Root: 4th String",
        frets: [null, null, 10, 11, 13, 11],
        fingers: [null, null, 1, 2, 4, 3],
        baseFret: 10,
        category: "variation",
        isFundamental: false,
      },
      {
        name: "Cdim Open Three-Note Voicing",
        positionLabel: "Open Position / Three Notes",
        rootString: "Root: 5th String",
        frets: [null, 3, 1, null, null, 2],
        fingers: [null, 3, 1, null, null, 2],
        baseFret: 1,
        category: "variation",
        isFundamental: false,
      },
      {
        name: "Cdim Open Four-Note Voicing",
        positionLabel: "Open Position / Four Notes",
        rootString: "Root: 5th String",
        frets: [null, 3, 1, null, 1, 2],
        fingers: [null, 4, 1, null, 2, 3],
        baseFret: 1,
        category: "variation",
        isFundamental: false,
      },
      {
        name: "Cdim Open Low Voicing",
        positionLabel: "Open Position / Low Voicing",
        rootString: "Root: 5th String",
        frets: [null, 3, 4, null, 4, null],
        fingers: [null, 1, 2, null, 3, null],
        baseFret: 1,
        category: "variation",
        isFundamental: false,
      },
      {
        name: "Cdim Open Split Voicing",
        positionLabel: "Open Position / Split Voicing",
        rootString: "Root: 5th String",
        frets: [null, 3, null, null, 4, 2],
        fingers: [null, 2, null, null, 3, 1],
        baseFret: 1,
        category: "variation",
        isFundamental: false,
      },
      {
        name: "Cdim Open Extended Voicing",
        positionLabel: "Open Position / Extended Voicing",
        rootString: "Root: 5th String",
        frets: [null, 3, 4, null, 4, 2],
        fingers: [null, 2, 3, null, 4, 1],
        baseFret: 1,
        category: "variation",
        isFundamental: false,
      },
      {
        name: "Cdim 6th Position",
        positionLabel: "6th Position / Low Four Strings",
        rootString: "Root: 6th String",
        frets: [8, 6, null, 8, 7, null],
        fingers: [3, 1, null, 4, 2, null],
        baseFret: 6,
        category: "variation",
        isFundamental: false,
      },
    );
  }

  if (root === "C" && typeKey === "dim7") {
    const openShape = voicings.find(
      (voicing) =>
        JSON.stringify(voicing.frets) ===
        JSON.stringify([null, 3, 4, 2, 4, null]),
    );
    if (openShape) {
      openShape.fingers = [null, 2, 3, 1, 4, null];
    }

    voicings.push(
      {
        name: "Cdim7 Open Full Voicing",
        positionLabel: "Open Position / Full Voicing",
        rootString: "Root: 5th String",
        frets: [null, 3, 4, 2, 4, 2],
        fingers: [null, 2, 3, 1, 4, 1],
        baseFret: 1,
        barre: { fret: 2, fromString: 3, toString: 5, finger: 1 },
        category: "variation",
        isFundamental: false,
      },
      {
        name: "Cdim7 7th Position Open A",
        positionLabel: "7th Position / Open A",
        rootString: "Root: 6th String",
        frets: [8, 0, 7, 8, 7, 8],
        fingers: [2, null, 1, 3, 1, 4],
        baseFret: 7,
        barre: { fret: 7, fromString: 2, toString: 4, finger: 1 },
        category: "variation",
        isFundamental: false,
      },
      {
        name: "Cdim7 8th Position",
        positionLabel: "8th Position",
        rootString: "Root: 6th String",
        frets: [8, 9, 10, 8, 10, 8],
        fingers: [1, 2, 3, 1, 4, 1],
        baseFret: 8,
        barre: { fret: 8, fromString: 0, toString: 5, finger: 1 },
        category: "variation",
        isFundamental: false,
      },
      {
        name: "Cdim7 Open Split Voicing",
        positionLabel: "Open Position / Split Voicing",
        rootString: "Root: 5th String",
        frets: [null, 3, null, 2, 4, 2],
        fingers: [null, 3, null, 1, 4, 2],
        baseFret: 1,
        category: "variation",
        isFundamental: false,
      },
      {
        name: "Cdim7 7th Position Open A Compact",
        positionLabel: "7th Position / Open A Compact",
        rootString: "Root: 6th String",
        frets: [8, 0, null, 8, 7, null],
        fingers: [2, null, null, 3, 1, null],
        baseFret: 7,
        category: "variation",
        isFundamental: false,
      },
      {
        name: "Cdim7 7th Position Open A High C",
        positionLabel: "7th Position / Open A High C",
        rootString: "Root: 6th String",
        frets: [8, 0, null, 8, 7, 8],
        fingers: [2, null, null, 3, 1, 4],
        baseFret: 7,
        category: "variation",
        isFundamental: false,
      },
      {
        name: "Cdim7 8th Position Compact",
        positionLabel: "8th Position / Compact Voicing",
        rootString: "Root: 6th String",
        frets: [8, 9, null, 8, 10, null],
        fingers: [1, 3, null, 2, 4, null],
        baseFret: 8,
        category: "variation",
        isFundamental: false,
      },
    );
  }

  if (root === "C" && typeKey === "aug") {
    voicings.push(
      {
        name: "Caug Open Voicing",
        positionLabel: "Open Position",
        rootString: "Root: 5th String",
        frets: [null, 3, 2, 1, 1, 0],
        fingers: [null, 4, 3, 1, 2, null],
        baseFret: 1,
        category: "variation",
        isFundamental: false,
      },
      {
        name: "Caug 8th Position Top Strings",
        positionLabel: "8th Position / Top Four Strings",
        rootString: "Root: 4th String",
        frets: [null, null, 10, 9, 9, 8],
        fingers: [null, null, 4, 2, 3, 1],
        baseFret: 8,
        category: "variation",
        isFundamental: false,
      },
      {
        name: "Caug 8th Position Open E",
        positionLabel: "8th Position / Open E",
        rootString: "Root: 6th String",
        frets: [8, null, 10, 9, 9, 0],
        fingers: [1, null, 4, 2, 3, null],
        baseFret: 8,
        category: "variation",
        isFundamental: false,
      },
      {
        name: "Caug 9th Position Open E",
        positionLabel: "9th Position / Open E",
        rootString: "Root: 4th String",
        frets: [null, null, 10, 9, 9, 0],
        fingers: [null, null, 3, 1, 2, null],
        baseFret: 9,
        category: "variation",
        isFundamental: false,
      },
      {
        name: "Caug Open High G Sharp",
        positionLabel: "Open Position / High G Sharp",
        rootString: "Root: 5th String",
        frets: [null, 3, 2, 1, 1, 4],
        fingers: [null, 3, 2, 1, 1, 4],
        baseFret: 1,
        barre: { fret: 1, fromString: 3, toString: 4, finger: 1 },
        category: "variation",
        isFundamental: false,
      },
      {
        name: "Caug 2nd Position",
        positionLabel: "2nd Position",
        rootString: "Root: 5th String",
        frets: [null, 3, 2, 5, 5, 4],
        fingers: [null, 2, 1, 4, 4, 3],
        baseFret: 2,
        barre: { fret: 5, fromString: 3, toString: 4, finger: 4 },
        category: "variation",
        isFundamental: false,
      },
      {
        name: "Caug 3rd Position Open E",
        positionLabel: "3rd Position / Open E",
        rootString: "Root: 5th String",
        frets: [null, 3, 6, 5, 5, 0],
        fingers: [null, 1, 4, 3, 3, null],
        baseFret: 3,
        barre: { fret: 5, fromString: 3, toString: 4, finger: 3 },
        category: "variation",
        isFundamental: false,
      },
      {
        name: "Caug 3rd Position",
        positionLabel: "3rd Position",
        rootString: "Root: 5th String",
        frets: [null, 3, 6, 5, 5, 4],
        fingers: [null, 1, 4, 3, 3, 2],
        baseFret: 3,
        barre: { fret: 5, fromString: 3, toString: 4, finger: 3 },
        category: "variation",
        isFundamental: false,
      },
    );
  }

  if (root === "C" && typeKey === "sus2") {
    const aShape = voicings.find(
      (voicing) =>
        JSON.stringify(voicing.frets) === JSON.stringify([null, 3, 5, 5, 3, 3]),
    );
    if (aShape) {
      aShape.fingers = [null, 1, 3, 4, 1, 1];
      aShape.barre = { fret: 3, fromString: 1, toString: 5, finger: 1 };
    }

    voicings.push(
      {
        name: "Csus2 Open Voicing",
        positionLabel: "Open Position",
        rootString: "Root: 5th String",
        frets: [null, 3, 0, 0, 1, 3],
        fingers: [null, 3, null, null, 1, 4],
        baseFret: 1,
        category: "variation",
        isFundamental: false,
      },
      {
        name: "Csus2 Open High Barre",
        positionLabel: "Open Position / High Barre",
        rootString: "Root: 5th String",
        frets: [null, 3, 0, 0, 3, 3],
        fingers: [null, 1, null, null, 2, 2],
        baseFret: 1,
        barre: { fret: 3, fromString: 4, toString: 5, finger: 2 },
        category: "variation",
        isFundamental: false,
      },
      {
        name: "Csus2 3rd Position Open G",
        positionLabel: "3rd Position / Open G",
        rootString: "Root: 5th String",
        frets: [null, 3, 5, 0, 3, 3],
        fingers: [null, 1, 3, null, 2, 2],
        baseFret: 3,
        barre: { fret: 3, fromString: 4, toString: 5, finger: 2 },
        category: "variation",
        isFundamental: false,
      },
      {
        name: "Csus2 3rd Position Open D",
        positionLabel: "3rd Position / Open D",
        rootString: "Root: 5th String",
        frets: [null, 3, 0, 5, 3, 3],
        fingers: [null, 1, null, 3, 2, 2],
        baseFret: 3,
        barre: { fret: 3, fromString: 4, toString: 5, finger: 2 },
        category: "variation",
        isFundamental: false,
      },
      {
        name: "Csus2 8th Position Open D and G",
        positionLabel: "8th Position / Open D and G",
        rootString: "Root: 6th String",
        frets: [8, null, 0, 0, 8, 8],
        fingers: [1, null, null, null, 2, 2],
        baseFret: 8,
        barre: { fret: 8, fromString: 4, toString: 5, finger: 2 },
        category: "variation",
        isFundamental: false,
      },
      {
        name: "Csus2 7th Position Open D",
        positionLabel: "7th Position / Open D",
        rootString: "Root: 6th String",
        frets: [8, null, 0, 7, 8, 8],
        fingers: [2, null, null, 1, 3, 4],
        baseFret: 7,
        category: "variation",
        isFundamental: false,
      },
      {
        name: "Csus2 8th Position Open D and G Full",
        positionLabel: "8th Position / Open D and G Full",
        rootString: "Root: 6th String",
        frets: [8, 10, 0, 0, 8, 8],
        fingers: [1, 3, null, null, 2, 2],
        baseFret: 8,
        barre: { fret: 8, fromString: 4, toString: 5, finger: 2 },
        category: "variation",
        isFundamental: false,
      },
    );
  }

  if (root === "C" && typeKey === "sus4") {
    const eShape = voicings.find(
      (voicing) =>
        JSON.stringify(voicing.frets) === JSON.stringify([8, 10, 10, 10, 8, 8]),
    );
    if (eShape) {
      eShape.fingers = [1, 2, 3, 4, 1, 1];
      eShape.barre = { fret: 8, fromString: 0, toString: 5, finger: 1 };
    }

    voicings.push(
      {
        name: "Csus4 Open Voicing",
        positionLabel: "Open Position",
        rootString: "Root: 5th String",
        frets: [null, 3, 3, 0, 1, 1],
        fingers: [null, 3, 4, null, 1, 2],
        baseFret: 1,
        category: "variation",
        isFundamental: false,
      },
      {
        name: "Csus4 Open A-D Barre",
        positionLabel: "Open Position / A-D Barre",
        rootString: "Root: 5th String",
        frets: [null, 3, 3, 0, 1, 3],
        fingers: [null, 3, 3, null, 1, 4],
        baseFret: 1,
        barre: { fret: 3, fromString: 1, toString: 2, finger: 3 },
        category: "variation",
        isFundamental: false,
      },
      {
        name: "Csus4 8th Position Top Strings",
        positionLabel: "8th Position / Top Four Strings",
        rootString: "Root: 4th String",
        frets: [null, null, 10, 10, 8, 8],
        fingers: [null, null, 3, 4, 1, 2],
        baseFret: 8,
        category: "variation",
        isFundamental: false,
      },
      {
        name: "Csus4 3rd Position Open G",
        positionLabel: "3rd Position / Open G",
        rootString: "Root: 5th String",
        frets: [null, 3, 3, 0, 6, 3],
        fingers: [null, 1, 1, null, 4, 2],
        baseFret: 3,
        barre: { fret: 3, fromString: 1, toString: 2, finger: 1 },
        category: "variation",
        isFundamental: false,
      },
      {
        name: "Csus4 3rd Position Open G Extended",
        positionLabel: "3rd Position / Open G Extended",
        rootString: "Root: 5th String",
        frets: [null, 3, 5, 0, 6, 3],
        fingers: [null, 1, 3, null, 4, 2],
        baseFret: 3,
        category: "variation",
        isFundamental: false,
      },
      {
        name: "Csus4 3rd Position Full Barre",
        positionLabel: "3rd Position / Full Barre",
        rootString: "Root: 5th String",
        frets: [null, 3, 3, 5, 6, 3],
        fingers: [null, 1, 1, 3, 4, 1],
        baseFret: 3,
        barre: { fret: 3, fromString: 1, toString: 5, finger: 1 },
        category: "variation",
        isFundamental: false,
      },
      {
        name: "Csus4 8th Position Compact Barre",
        positionLabel: "8th Position / Compact Barre",
        rootString: "Root: 6th String",
        frets: [8, 8, 10, 10, 8, 8],
        fingers: [1, 1, 3, 4, 1, 1],
        baseFret: 8,
        barre: { fret: 8, fromString: 0, toString: 5, finger: 1 },
        category: "variation",
        isFundamental: false,
      },
    );
  }

  if (root === "C" && typeKey === "add9") {
    voicings.push(
      {
        name: "Cadd9 Open Voicing",
        positionLabel: "Open Position",
        rootString: "Root: 5th String",
        frets: [null, 3, 0, 0, 1, 0],
        fingers: [null, 3, null, null, 1, null],
        baseFret: 1,
        category: "variation",
        isFundamental: false,
      },
      {
        name: "Cadd9 Open D Voicing",
        positionLabel: "Open Position / Open D, G and E",
        rootString: "Root: 5th String",
        frets: [null, 3, 0, 0, 3, 0],
        fingers: [null, 1, null, null, 2, null],
        baseFret: 1,
        category: "variation",
        isFundamental: false,
      },
      {
        name: "Cadd9 Open Full Voicing",
        positionLabel: "Open Position / Full Voicing",
        rootString: "Root: 5th String",
        frets: [null, 3, 2, 0, 3, 0],
        fingers: [null, 2, 1, null, 3, null],
        baseFret: 1,
        category: "variation",
        isFundamental: false,
      },
      {
        name: "Cadd9 Open High G",
        positionLabel: "Open Position / High G",
        rootString: "Root: 5th String",
        frets: [null, 3, 2, 0, 3, 3],
        fingers: [null, 2, 1, null, 3, 4],
        baseFret: 1,
        category: "variation",
        isFundamental: false,
      },
      {
        name: "Cadd9 3rd Position Open D and G",
        positionLabel: "3rd Position / Open D and G",
        rootString: "Root: 5th String",
        frets: [null, 3, 0, 0, 5, 3],
        fingers: [null, 1, null, null, 3, 2],
        baseFret: 3,
        category: "variation",
        isFundamental: false,
      },
      {
        name: "Cadd9 3rd Position Open D",
        positionLabel: "3rd Position / Open D",
        rootString: "Root: 5th String",
        frets: [null, 3, 0, 5, 5, 3],
        fingers: [null, 1, null, 3, 4, 2],
        baseFret: 3,
        category: "variation",
        isFundamental: false,
      },
      {
        name: "Cadd9 3rd Position Open G and E",
        positionLabel: "3rd Position / Open G and E",
        rootString: "Root: 5th String",
        frets: [null, 3, 5, 0, 3, 0],
        fingers: [null, 1, 3, null, 2, null],
        baseFret: 3,
        category: "variation",
        isFundamental: false,
      },
      {
        name: "Cadd9 3rd Position Open E",
        positionLabel: "3rd Position / Open E",
        rootString: "Root: 5th String",
        frets: [null, 3, 5, 5, 3, 0],
        fingers: [null, 1, 3, 4, 2, null],
        baseFret: 3,
        category: "variation",
        isFundamental: false,
      },
    );
  }

  if (root === "C" && typeKey === "11") {
    voicings.push(
      {
        name: "C11 6th Position Open D and G",
        positionLabel: "6th Position / Open D and G",
        rootString: "Root: 6th String",
        frets: [8, 7, 0, 0, 6, 6],
        fingers: [4, 3, null, null, 1, 2],
        baseFret: 6,
        category: "variation",
        isFundamental: false,
      },
      {
        name: "C11 8th Position Barre",
        positionLabel: "8th Position / Barre",
        rootString: "Root: 6th String",
        frets: [8, 8, 8, 9, 8, 10],
        fingers: [1, 1, 1, 2, 1, 3],
        baseFret: 8,
        barre: { fret: 8, fromString: 0, toString: 4, finger: 1 },
        category: "variation",
        isFundamental: false,
      },
      {
        name: "C11 5th Position Open G and E",
        positionLabel: "5th Position / Open G and E",
        rootString: "Root: 6th String",
        frets: [8, 5, 8, 0, 6, 0],
        fingers: [3, 1, 4, null, 2, null],
        baseFret: 5,
        category: "variation",
        isFundamental: false,
      },
      {
        name: "C11 5th Position Open D and G",
        positionLabel: "5th Position / Open D and G",
        rootString: "Root: 6th String",
        frets: [8, 8, 0, 0, 5, 6],
        fingers: [4, 4, null, null, 1, 2],
        baseFret: 5,
        barre: { fret: 8, fromString: 0, toString: 1, finger: 4 },
        category: "variation",
        isFundamental: false,
      },
      {
        name: "C11 5th Position Full Voicing",
        positionLabel: "5th Position / Full Voicing",
        rootString: "Root: 6th String",
        frets: [8, 8, 5, 7, 5, 6],
        fingers: [4, 4, 1, 3, 1, 2],
        baseFret: 5,
        barres: [
          { fret: 5, fromString: 2, toString: 4, finger: 1 },
          { fret: 8, fromString: 0, toString: 1, finger: 4 },
        ],
        category: "variation",
        isFundamental: false,
      },
      {
        name: "C11 6th Position Open D",
        positionLabel: "6th Position / Open D",
        rootString: "Root: 6th String",
        frets: [8, 8, 0, 9, 8, 6],
        fingers: [2, 2, null, 4, 3, 1],
        baseFret: 6,
        barre: { fret: 8, fromString: 0, toString: 1, finger: 2 },
        category: "variation",
        isFundamental: false,
      },
      {
        name: "C11 8th Position Open D, G and E",
        positionLabel: "8th Position / Open D, G and E",
        rootString: "Root: 6th String",
        frets: [8, 8, 0, 0, 11, 0],
        fingers: [1, 2, null, null, 4, null],
        baseFret: 8,
        category: "variation",
        isFundamental: false,
      },
      {
        name: "C11 8th Position Open D and E",
        positionLabel: "8th Position / Open D and E",
        rootString: "Root: 6th String",
        frets: [8, 10, 0, 10, 11, 0],
        fingers: [1, 2, null, 3, 4, null],
        baseFret: 8,
        category: "variation",
        isFundamental: false,
      },
    );
  }

  if (root === "C" && typeKey === "6") {
    voicings.push(
      {
        name: "C6 Open Voicing",
        positionLabel: "Open Position",
        rootString: "Root: 5th String",
        frets: [null, 3, 2, 2, 1, 3],
        fingers: [null, 3, 2, 2, 1, 4],
        baseFret: 1,
        barre: { fret: 2, fromString: 2, toString: 3, finger: 2 },
        category: "variation",
        isFundamental: false,
      },
      {
        name: "C6 3rd Position Open G",
        positionLabel: "3rd Position / Open G",
        rootString: "Root: 5th String",
        frets: [null, 3, 5, 0, 5, 5],
        fingers: [null, 1, 3, null, 4, 4],
        baseFret: 3,
        barre: { fret: 5, fromString: 4, toString: 5, finger: 4 },
        category: "variation",
        isFundamental: false,
      },
      {
        name: "C6 7th Position Open Strings",
        positionLabel: "7th Position / Open A, G and E",
        rootString: "Root: 6th String",
        frets: [8, 0, 7, 0, 8, 0],
        fingers: [2, null, 1, null, 3, null],
        baseFret: 7,
        category: "variation",
        isFundamental: false,
      },
      {
        name: "C6 7th Position Open G",
        positionLabel: "7th Position / Open G",
        rootString: "Root: 6th String",
        frets: [8, 7, 7, 0, 8, 8],
        fingers: [2, 1, 1, null, 3, 4],
        baseFret: 7,
        barre: { fret: 7, fromString: 1, toString: 2, finger: 1 },
        category: "variation",
        isFundamental: false,
      },
      {
        name: "C6 8th Position Open A",
        positionLabel: "8th Position / Open A",
        rootString: "Root: 6th String",
        frets: [8, 0, 10, 9, 8, 8],
        fingers: [1, null, 4, 3, 2, 2],
        baseFret: 8,
        barre: { fret: 8, fromString: 4, toString: 5, finger: 2 },
        category: "variation",
        isFundamental: false,
      },
      {
        name: "C6 8th Position Closed",
        positionLabel: "8th Position / Closed Voicing",
        rootString: "Root: 6th String",
        frets: [8, 10, 10, 9, 10, 8],
        fingers: [1, 3, 3, 2, 4, 1],
        baseFret: 8,
        barres: [
          { fret: 8, fromString: 0, toString: 5, finger: 1 },
          { fret: 10, fromString: 1, toString: 2, finger: 3 },
        ],
        category: "variation",
        isFundamental: false,
      },
      {
        name: "C6 8th Position Open A, G and E",
        positionLabel: "8th Position / Open A, G and E",
        rootString: "Root: 6th String",
        frets: [8, 0, 10, 0, 8, 0],
        fingers: [1, null, 3, null, 2, null],
        baseFret: 8,
        category: "variation",
        isFundamental: false,
      },
      {
        name: "C6 8th Position Open A and E",
        positionLabel: "8th Position / Open A and E",
        rootString: "Root: 6th String",
        frets: [8, 0, 10, 9, 8, 0],
        fingers: [1, null, 4, 3, 2, null],
        baseFret: 8,
        category: "variation",
        isFundamental: false,
      },
    );
  }

  if (root === "C" && typeKey === "min6") {
    const eShape = voicings.find(
      (voicing) =>
        JSON.stringify(voicing.frets) ===
        JSON.stringify([8, null, 7, 8, 8, null]),
    );
    if (eShape) {
      eShape.fingers = [2, null, 1, 3, 4, null];
    }

    voicings.push(
      {
        name: "Cm6 8th Position Full Barre",
        positionLabel: "8th Position / Full Barre",
        rootString: "Root: 6th String",
        frets: [8, 10, 8, 8, 10, 8],
        fingers: [1, 3, 1, 1, 4, 1],
        baseFret: 8,
        barre: { fret: 8, fromString: 0, toString: 5, finger: 1 },
        category: "variation",
        isFundamental: false,
      },
      {
        name: "Cm6 3rd Position",
        positionLabel: "3rd Position",
        rootString: "Root: 5th String",
        frets: [null, 3, 5, 3, 4, 5],
        fingers: [null, 1, 3, 1, 2, 4],
        baseFret: 3,
        barre: { fret: 3, fromString: 1, toString: 3, finger: 1 },
        category: "variation",
        isFundamental: false,
      },
      {
        name: "Cm6 Open Compact Voicing",
        positionLabel: "Open Position / Compact Voicing",
        rootString: "Root: 5th String",
        frets: [null, 3, 1, 2, 1, null],
        fingers: [null, 3, 1, 2, 1, null],
        baseFret: 1,
        barre: { fret: 1, fromString: 2, toString: 4, finger: 1 },
        category: "variation",
        isFundamental: false,
      },
      {
        name: "Cm6 7th Position Top Strings",
        positionLabel: "7th Position / Top Four Strings",
        rootString: "Root: 4th String",
        frets: [null, null, 7, 8, 8, 8],
        fingers: [null, null, 1, 2, 2, 2],
        baseFret: 7,
        barre: { fret: 8, fromString: 3, toString: 5, finger: 2 },
        category: "variation",
        isFundamental: false,
      },
      {
        name: "Cm6 Open Low Strings",
        positionLabel: "Open Position / Low Four Strings",
        rootString: "Root: 5th String",
        frets: [3, 3, 1, 2, null, null],
        fingers: [3, 4, 1, 2, null, null],
        baseFret: 1,
        category: "variation",
        isFundamental: false,
      },
      {
        name: "Cm6 5th Position Split Voicing",
        positionLabel: "5th Position / Split Voicing",
        rootString: "Root: 6th String",
        frets: [8, null, null, 8, 8, 5],
        fingers: [2, null, null, 3, 4, 1],
        baseFret: 5,
        category: "variation",
        isFundamental: false,
      },
      {
        name: "Cm6 4th Position Top Strings",
        positionLabel: "4th Position / Top Four Strings",
        rootString: "Root: 4th String",
        frets: [null, null, 5, 5, 4, 5],
        fingers: [null, null, 2, 3, 1, 4],
        baseFret: 4,
        category: "variation",
        isFundamental: false,
      },
      {
        name: "Cm6 10th Position Top Strings",
        positionLabel: "10th Position / Top Four Strings",
        rootString: "Root: 4th String",
        frets: [null, null, 10, 12, 10, 11],
        fingers: [null, null, 1, 3, 1, 2],
        baseFret: 10,
        barre: { fret: 10, fromString: 2, toString: 4, finger: 1 },
        category: "variation",
        isFundamental: false,
      },
      {
        name: "Cm6 10th Position Compact",
        positionLabel: "10th Position / Compact Voicing",
        rootString: "Root: 4th String",
        frets: [11, null, 10, 12, 10, null],
        fingers: [2, null, 1, 3, 1, null],
        baseFret: 10,
        barre: { fret: 10, fromString: 2, toString: 4, finger: 1 },
        category: "variation",
        isFundamental: false,
      },
    );
  }

  if (root === "C" && typeKey === "7#9") {
    voicings.push(
      {
        name: "C7#9 3rd Position Open E",
        positionLabel: "3rd Position / Open E",
        rootString: "Root: 5th String",
        frets: [null, 3, 5, 3, 4, 0],
        fingers: [null, 1, 4, 2, 3, null],
        baseFret: 3,
        category: "variation",
        isFundamental: false,
      },
      {
        name: "C7#9 6th Position Open G and E",
        positionLabel: "6th Position / Open G and E",
        rootString: "Root: 6th String",
        frets: [8, 6, 8, 0, 8, 0],
        fingers: [2, 1, 3, null, 4, null],
        baseFret: 6,
        category: "variation",
        isFundamental: false,
      },
      {
        name: "C7#9 8th Position Open E Barre",
        positionLabel: "8th Position / Open E Barre",
        rootString: "Root: 6th String",
        frets: [8, 10, 8, 8, 8, 0],
        fingers: [1, 3, 1, 1, 1, null],
        baseFret: 8,
        barre: { fret: 8, fromString: 0, toString: 4, finger: 1 },
        category: "variation",
        isFundamental: false,
      },
      {
        name: "C7#9 5th Position Open G and E",
        positionLabel: "5th Position / Open G and E",
        rootString: "Root: 6th String",
        frets: [8, 6, 8, 0, 5, 0],
        fingers: [3, 2, 4, null, 1, null],
        baseFret: 5,
        category: "variation",
        isFundamental: false,
      },
      {
        name: "C7#9 5th Position Closed",
        positionLabel: "5th Position / Closed Voicing",
        rootString: "Root: 6th String",
        frets: [8, 6, 5, 5, 5, 6],
        fingers: [4, 2, 1, 1, 1, 3],
        baseFret: 5,
        barre: { fret: 5, fromString: 2, toString: 4, finger: 1 },
        category: "variation",
        isFundamental: false,
      },
      {
        name: "C7#9 8th Position Open E High",
        positionLabel: "8th Position / Open E High Voicing",
        rootString: "Root: 6th String",
        frets: [8, 10, 8, 8, 11, 0],
        fingers: [1, 3, 1, 1, 4, null],
        baseFret: 8,
        barre: { fret: 8, fromString: 0, toString: 3, finger: 1 },
        category: "variation",
        isFundamental: false,
      },
      {
        name: "C7#9 8th Position Open E Full",
        positionLabel: "8th Position / Open E Full",
        rootString: "Root: 6th String",
        frets: [8, 10, 10, 8, 11, 0],
        fingers: [1, 3, 3, 1, 4, null],
        baseFret: 8,
        barres: [
          { fret: 8, fromString: 0, toString: 3, finger: 1 },
          { fret: 10, fromString: 1, toString: 2, finger: 3 },
        ],
        category: "variation",
        isFundamental: false,
      },
      {
        name: "C7#9 8th Position Closed",
        positionLabel: "8th Position / Closed Voicing",
        rootString: "Root: 6th String",
        frets: [8, 10, 8, 9, 8, 11],
        fingers: [1, 3, 1, 2, 1, 4],
        baseFret: 8,
        barre: { fret: 8, fromString: 0, toString: 4, finger: 1 },
        category: "variation",
        isFundamental: false,
      },
    );
  }

  if (root === "C" && typeKey === "7b9") {
    voicings.push(
      {
        name: "C7b9 Open Voicing",
        positionLabel: "Open Position",
        rootString: "Root: 5th String",
        frets: [null, 3, 2, 3, 2, 3],
        fingers: [null, 2, 1, 3, 1, 4],
        baseFret: 1,
        barre: { fret: 2, fromString: 2, toString: 4, finger: 1 },
        category: "variation",
        isFundamental: false,
      },
      {
        name: "C7b9 2nd Position Open E",
        positionLabel: "2nd Position / Open E",
        rootString: "Root: 5th String",
        frets: [null, 3, 5, 3, 2, 0],
        fingers: [null, 2, 4, 3, 1, null],
        baseFret: 2,
        category: "variation",
        isFundamental: false,
      },
      {
        name: "C7b9 8th Position Open G and E",
        positionLabel: "8th Position / Open G and E",
        rootString: "Root: 6th String",
        frets: [8, 10, 11, 0, 11, 0],
        fingers: [1, 2, 3, null, 4, null],
        baseFret: 8,
        category: "variation",
        isFundamental: false,
      },
      {
        name: "C7b9 14th Position",
        positionLabel: "14th Position",
        rootString: "Root: 5th String",
        frets: [null, 15, 14, 15, 14, 15],
        fingers: [null, 2, 1, 3, 1, 4],
        baseFret: 14,
        barre: { fret: 14, fromString: 2, toString: 4, finger: 1 },
        category: "variation",
        isFundamental: false,
      },
      {
        name: "C7b9 6th Position Split Voicing",
        positionLabel: "6th Position / Split Voicing",
        rootString: "Root: 6th String",
        frets: [8, 7, null, 6, 8, 6],
        fingers: [3, 2, null, 1, 4, 1],
        baseFret: 6,
        barre: { fret: 6, fromString: 3, toString: 5, finger: 1 },
        category: "variation",
        isFundamental: false,
      },
    );
  }

  if (root === "C" && typeKey === "9") {
    voicings.push(
      {
        name: "C9 3rd Position Open D",
        positionLabel: "3rd Position / Open D",
        rootString: "Root: 5th String",
        frets: [null, 3, 0, 3, 5, 3],
        fingers: [null, 1, null, 2, 4, 3],
        baseFret: 3,
        category: "variation",
        isFundamental: false,
      },
      {
        name: "C9 3rd Position Open E Barre",
        positionLabel: "3rd Position / Open E Barre",
        rootString: "Root: 5th String",
        frets: [null, 3, 5, 3, 3, 0],
        fingers: [null, 1, 3, 1, 1, null],
        baseFret: 3,
        barre: { fret: 3, fromString: 1, toString: 4, finger: 1 },
        category: "variation",
        isFundamental: false,
      },
      {
        name: "C9 6th Position Open D and G",
        positionLabel: "6th Position / Open D and G",
        rootString: "Root: 6th String",
        frets: [8, 7, 0, 0, 8, 6],
        fingers: [3, 2, null, null, 4, 1],
        baseFret: 6,
        category: "variation",
        isFundamental: false,
      },
      {
        name: "C9 7th Position Open E",
        positionLabel: "7th Position / Open E",
        rootString: "Root: 6th String",
        frets: [8, 7, 8, 7, 8, 0],
        fingers: [2, 1, 3, 1, 4, null],
        baseFret: 7,
        barre: { fret: 7, fromString: 1, toString: 3, finger: 1 },
        category: "variation",
        isFundamental: false,
      },
      {
        name: "C9 8th Position Closed",
        positionLabel: "8th Position / Closed Voicing",
        rootString: "Root: 6th String",
        frets: [8, 10, 8, 9, 8, 10],
        fingers: [1, 3, 1, 2, 1, 4],
        baseFret: 8,
        barre: { fret: 8, fromString: 0, toString: 4, finger: 1 },
        category: "variation",
        isFundamental: false,
      },
      {
        name: "C9 3rd Position Open D and G",
        positionLabel: "3rd Position / Open D and G",
        rootString: "Root: 5th String",
        frets: [null, 3, 0, 0, 5, 6],
        fingers: [null, 1, null, null, 3, 4],
        baseFret: 3,
        category: "variation",
        isFundamental: false,
      },
      {
        name: "C9 5th Position Open G and E",
        positionLabel: "5th Position / Open G and E",
        rootString: "Root: 6th String",
        frets: [8, 5, 8, 0, 5, 0],
        fingers: [3, 1, 4, null, 2, null],
        baseFret: 5,
        category: "variation",
        isFundamental: false,
      },
      {
        name: "C9 5th Position Open E",
        positionLabel: "5th Position / Open E",
        rootString: "Root: 6th String",
        frets: [8, 5, 8, 5, 8, 0],
        fingers: [2, 1, 3, 1, 4, null],
        baseFret: 5,
        barre: { fret: 5, fromString: 1, toString: 3, finger: 1 },
        category: "variation",
        isFundamental: false,
      },
    );
  }

  if (root === "C" && typeKey === "m7b5") {
    voicings.push(
      {
        name: "Cm7b5 Open Voicing",
        positionLabel: "Open Position",
        rootString: "Root: 5th String",
        frets: [null, 3, 1, 3, 1, 2],
        fingers: [null, 3, 1, 4, 1, 2],
        baseFret: 1,
        barre: { fret: 1, fromString: 2, toString: 4, finger: 1 },
        category: "variation",
        isFundamental: false,
      },
      {
        name: "Cm7b5 6th Position",
        positionLabel: "6th Position / Full Voicing",
        rootString: "Root: 6th String",
        frets: [8, 6, 8, 8, 7, 6],
        fingers: [3, 1, 4, 4, 2, 1],
        baseFret: 6,
        barres: [
          { fret: 6, fromString: 1, toString: 5, finger: 1 },
          { fret: 8, fromString: 2, toString: 3, finger: 4 },
        ],
        category: "variation",
        isFundamental: false,
      },
      {
        name: "Cm7b5 10th Position Top Strings",
        positionLabel: "10th Position / Top Four Strings",
        rootString: "Root: 4th String",
        frets: [null, null, 10, 11, 11, 11],
        fingers: [null, null, 1, 2, 2, 2],
        baseFret: 10,
        barre: { fret: 11, fromString: 3, toString: 5, finger: 2 },
        category: "variation",
        isFundamental: false,
      },
      {
        name: "Cm7b5 3rd Position",
        positionLabel: "3rd Position",
        rootString: "Root: 5th String",
        frets: [null, 3, 4, 3, 4, 6],
        fingers: [null, 1, 2, 1, 3, 4],
        baseFret: 3,
        barre: { fret: 3, fromString: 1, toString: 3, finger: 1 },
        category: "variation",
        isFundamental: false,
      },
      {
        name: "Cm7b5 8th Position Low Barre",
        positionLabel: "8th Position / Low Barre",
        rootString: "Root: 6th String",
        frets: [8, 9, 8, 8, 11, 8],
        fingers: [1, 2, 1, 1, 4, 1],
        baseFret: 8,
        barre: { fret: 8, fromString: 0, toString: 5, finger: 1 },
        category: "variation",
        isFundamental: false,
      },
      {
        name: "Cm7b5 8th Position Extended",
        positionLabel: "8th Position / Extended Voicing",
        rootString: "Root: 6th String",
        frets: [8, 9, 10, 8, 11, 8],
        fingers: [1, 2, 3, 1, 4, 1],
        baseFret: 8,
        barre: { fret: 8, fromString: 0, toString: 5, finger: 1 },
        category: "variation",
        isFundamental: false,
      },
      {
        name: "Cm7b5 8th Position High Barre",
        positionLabel: "8th Position / High Barre",
        rootString: "Root: 6th String",
        frets: [8, 9, 8, 8, 11, 11],
        fingers: [1, 2, 1, 1, 4, 4],
        baseFret: 8,
        barres: [
          { fret: 8, fromString: 0, toString: 3, finger: 1 },
          { fret: 11, fromString: 4, toString: 5, finger: 4 },
        ],
        category: "variation",
        isFundamental: false,
      },
      {
        name: "Cm7b5 8th Position Full",
        positionLabel: "8th Position / Full Voicing",
        rootString: "Root: 6th String",
        frets: [8, 9, 10, 8, 11, 11],
        fingers: [1, 2, 3, 1, 4, 4],
        baseFret: 8,
        barres: [
          { fret: 8, fromString: 0, toString: 3, finger: 1 },
          { fret: 11, fromString: 4, toString: 5, finger: 4 },
        ],
        category: "variation",
        isFundamental: false,
      },
    );
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
