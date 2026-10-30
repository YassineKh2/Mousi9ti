import { ALL_ROOT_NOTES, NOTE_SEMITONES, SCALES_DATABASE } from "../data/musicTheory";
import type { NoteName, ScaleDefinition } from "../types";
import { BASS_STANDARD_TUNING, getFrettedNote } from "./frettedInstrument";

export type ScaleInstrumentView = "guitar" | "piano" | "bass" | "both";
export type PianoFocusRange = "all" | "octave4" | "octave3" | "octave34";

export const getBassScalePositions = (fretCount: number) =>
  Array.from(
    { length: Math.max(0, Math.floor(fretCount) - 2) },
    (_, index) => index,
  );

export const getBassScalePlayback = (
  root: NoteName,
  scale: ScaleDefinition,
  fretCount: number,
  position: number | null,
  direction: "ascending" | "descending" | "both",
  boxKey: string | null = null,
) => {
  const semitones = new Set(
    scale.intervals.map((interval) => (NOTE_SEMITONES[root] + interval) % 12),
  );
  const pitches = new Map<
    number,
    ReturnType<typeof getFrettedNote> & { stringIdx: number; fretNum: number }
  >();
  const box = boxKey ? scale.cagedBoxes?.[boxKey] : undefined;
  const rootFret = (NOTE_SEMITONES[root] - NOTE_SEMITONES[BASS_STANDARD_TUNING.strings[0]] + 12) % 12;
  const rawStart = box ? rootFret + box.startFretOffset : 0;
  const octaveShift = -Math.floor(rawStart / 12) * 12;
  const start = box ? Math.max(0, rawStart + octaveShift) : position ?? 0;
  const end = box
    ? Math.min(fretCount, rootFret + box.endFretOffset + octaveShift)
    : position === null ? fretCount : Math.min(fretCount, position + 3);
  BASS_STANDARD_TUNING.strings.forEach((_, stringIdx) => {
    for (let fretNum = start; fretNum <= end; fretNum++) {
      const pitch = getFrettedNote(BASS_STANDARD_TUNING, stringIdx, fretNum);
      if (semitones.has(pitch.midi % 12) && !pitches.has(pitch.midi)) {
        pitches.set(pitch.midi, { ...pitch, stringIdx, fretNum });
      }
    }
  });
  const ascending = [...pitches.values()].sort(
    (first, second) => first.midi - second.midi,
  );
  if (direction === "descending") return ascending.reverse();
  return direction === "both"
    ? [...ascending, ...ascending.slice(0, -1).reverse()]
    : ascending;
};

export type ScaleRouteTarget = {
  root: NoteName;
  scaleId: string;
  boxKey: string | null;
  instrumentView?: ScaleInstrumentView;
  pianoFocusRange?: PianoFocusRange;
  bassPosition?: number | null;
};

export type ResolvedScaleRoute = ScaleRouteTarget & {
  path: string;
  title: string;
  description: string;
  h1: string;
  indexable: boolean;
};

const scaleSlug = (scale: ScaleDefinition) =>
  scale.id === "pentatonic_minor"
    ? "pentatonic"
    : scale.id.replaceAll("_", "-");

const getRootSegment = (root: NoteName) =>
  root.toLowerCase().replace("#", "-sharp");

const getShapeSegment = (scale: ScaleDefinition, boxKey: string | null) => {
  if (!boxKey || !scale.cagedBoxes) return "";
  const shapeIndex = Object.keys(scale.cagedBoxes).indexOf(boxKey);
  return shapeIndex < 0 ? "" : `/shape${shapeIndex + 1}`;
};

export const buildScalePath = (
  root: NoteName,
  scaleId: string,
  boxKey: string | null = null,
) => {
  const scale = SCALES_DATABASE.find((item) => item.id === scaleId);
  if (!scale) return "/scales/";
  return `/scale/${getRootSegment(root)}/${scaleSlug(scale)}${getShapeSegment(scale, boxKey)}`;
};

export const buildScaleUrl = (
  root: NoteName,
  scaleId: string,
  boxKey: string | null,
  instrumentView: ScaleInstrumentView,
  pianoFocusRange: PianoFocusRange,
  bassPosition: number | null = null,
) => {
  const scale = SCALES_DATABASE.find((item) => item.id === scaleId);
  if (!scale) return "/scales/";

  if (instrumentView === "bass") {
    const params = new URLSearchParams({ instrument: "bass" });
    if (
      !boxKey &&
      bassPosition !== null &&
      Number.isInteger(bassPosition) &&
      bassPosition >= 0 &&
      bassPosition <= 21
    ) {
      params.set("position", String(bassPosition));
    }
    return `${buildScalePath(root, scaleId, boxKey)}?${params}`;
  }

  const firstBox = Object.keys(scale.cagedBoxes ?? {})[0] ?? null;
  const selectedBox =
    instrumentView === "piano"
      ? null
      : (boxKey ?? (instrumentView === "both" ? firstBox : null));
  const path = buildScalePath(root, scaleId, selectedBox);
  const params = new URLSearchParams();

  if (instrumentView !== "guitar") params.set("range", pianoFocusRange);
  if (!selectedBox && instrumentView !== "piano") {
    params.set("instrument", instrumentView);
  }

  const query = params.toString();
  return query ? `${path}?${query}` : path;
};

const resolveRootSegment = (segment: string): NoteName | null => {
  const normalized = decodeURIComponent(segment).toLowerCase();
  const exact = ALL_ROOT_NOTES.find(
    (note) => getRootSegment(note) === normalized,
  );
  if (exact) return exact;

  if (normalized.endsWith("m")) {
    const minorRoot = normalized.slice(0, -1);
    return (
      ALL_ROOT_NOTES.find((note) => note.toLowerCase() === minorRoot) ?? null
    );
  }
  return null;
};

const resolveScale = (slug: string) => {
  const normalized = slug.toLowerCase();
  const id =
    normalized === "pentatonic"
      ? "pentatonic_minor"
      : normalized.replaceAll("-", "_");
  return SCALES_DATABASE.find((scale) => scale.id === id) ?? null;
};

export const resolveScaleRoute = (
  pathname: string,
  search = "",
): ResolvedScaleRoute | null => {
  const parts = pathname.split("/").filter(Boolean);
  if (
    parts[0]?.toLowerCase() !== "scale" ||
    parts.length < 3 ||
    parts.length > 4
  ) {
    return null;
  }

  const root = resolveRootSegment(parts[1]);
  const scale = resolveScale(parts[2]);
  if (!root || !scale) return null;

  let boxKey: string | null = null;
  if (parts[3]) {
    const shapeMatch =
      parts[3].match(/^shape-?(\d+)$/i) ?? parts[3].match(/^(\d+)$/);
    if (!shapeMatch || !scale.cagedBoxes) return null;
    boxKey = Object.keys(scale.cagedBoxes)[Number(shapeMatch[1]) - 1] ?? null;
    if (!boxKey) return null;
  }

  const params = new URLSearchParams(search);
  const requestedView = params.get("view");
  const requestedInstrument = params.get("instrument");
  const requestedRange = params.get("range");
  if (requestedInstrument === "bass") {
    const rawPosition = params.get("position");
    const position = rawPosition !== null && /^\d+$/.test(rawPosition)
      ? Number(rawPosition)
      : NaN;
    const bassPosition = Number.isInteger(position) && position >= 0 && position <= 21
      ? position
      : null;
    const h1 = `${root} ${scale.name}`;
    return {
      path: buildScalePath(root, scale.id, boxKey),
      root,
      scaleId: scale.id,
      boxKey,
      instrumentView: "bass",
      bassPosition: boxKey ? null : bassPosition,
      title: `${h1} Scale | Mousi9ti`,
      description: `Explore the notes, intervals, and four-string bass positions of the ${root} ${scale.name.toLowerCase()} scale.`,
      h1,
      indexable: false,
    };
  }
  const hasPianoRange =
    requestedRange === "all" ||
    requestedRange === "octave4" ||
    requestedRange === "octave3" ||
    requestedRange === "octave34";
  const explicitInstrument =
    requestedInstrument === "guitar" ||
    requestedInstrument === "piano" ||
    requestedInstrument === "both"
      ? requestedInstrument
      : null;
  const isPianoOnly =
    requestedView === "piano" ||
    (!boxKey &&
      hasPianoRange &&
      explicitInstrument !== "both" &&
      explicitInstrument !== "guitar") ||
    (!boxKey && explicitInstrument === "piano");
  if (isPianoOnly) boxKey = null;

  const instrumentView: ScaleInstrumentView = boxKey
    ? hasPianoRange
      ? "both"
      : "guitar"
    : (explicitInstrument ??
      (requestedView === "guitar" ||
      requestedView === "both" ||
      requestedView === "piano"
        ? requestedView
        : "piano"));
  const pianoFocusRange: PianoFocusRange | undefined = hasPianoRange
    ? requestedRange
    : undefined;

  const path = buildScalePath(root, scale.id, boxKey);
  const shapeName = boxKey?.match(/\(([^)]+)\)/)?.[1];
  const h1 = `${root} ${scale.name}`;
  const description = `Explore the notes, intervals, and guitar positions of the ${root} ${scale.name.toLowerCase()} scale${shapeName ? ` in CAGED ${shapeName} shape` : ""}.`;

  return {
    path,
    root,
    scaleId: scale.id,
    boxKey,
    instrumentView,
    pianoFocusRange,
    title: `${h1} Scale | Mousi9ti`,
    description,
    h1,
    indexable: !boxKey,
  };
};

export const getScaleRouteDefinitions = () =>
  ALL_ROOT_NOTES.flatMap((root) =>
    SCALES_DATABASE.map(
      (scale) => resolveScaleRoute(buildScalePath(root, scale.id))!,
    ),
  );

export const getScaleShapeRouteDefinitions = () =>
  ALL_ROOT_NOTES.flatMap((root) =>
    SCALES_DATABASE.flatMap((scale) =>
      Object.keys(scale.cagedBoxes ?? {}).map(
        (boxKey) => resolveScaleRoute(buildScalePath(root, scale.id, boxKey))!,
      ),
    ),
  );
