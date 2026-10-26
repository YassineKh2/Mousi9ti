import { ALL_ROOT_NOTES } from "../data/musicTheory";
import { CHORD_TYPES_CATALOG } from "../data/chordsData";
import type { NoteName } from "../types";

export type ChordInstrumentView = "guitar" | "piano" | "both";

export type ChordRouteTarget = {
  root: NoteName;
  chordType: string;
  instrumentView?: ChordInstrumentView;
};

export type ResolvedChordRoute = ChordRouteTarget & {
  path: string;
  title: string;
  description: string;
  h1: string;
  indexable: boolean;
};

const rootSlug = (root: NoteName) => root.toLowerCase().replace("#", "-sharp");
const typeSlug = (name: string) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

export const buildChordPath = (root: NoteName, chordType: string) => {
  const chord = CHORD_TYPES_CATALOG.find((item) => item.type === chordType);
  if (!chord) return "/chords/";
  return `/chords/${rootSlug(root)}/${typeSlug(chord.name)}`;
};

export const buildChordUrl = (
  root: NoteName,
  chordType: string,
  instrumentView?: ChordInstrumentView,
) => {
  const path = buildChordPath(root, chordType);
  return instrumentView ? `${path}?instrument=${instrumentView}` : path;
};

export const resolveChordRoute = (
  pathname: string,
  search = "",
): ResolvedChordRoute | null => {
  const parts = pathname.split("/").filter(Boolean);
  if (parts[0]?.toLowerCase() !== "chords" || parts.length !== 3) return null;

  const normalizedRoot = decodeURIComponent(parts[1]).toLowerCase();
  const root = ALL_ROOT_NOTES.find((note) => rootSlug(note) === normalizedRoot);
  const chord = CHORD_TYPES_CATALOG.find(
    (item) => typeSlug(item.name) === parts[2].toLowerCase(),
  );
  if (!root || !chord) return null;

  const requestedInstrument = new URLSearchParams(search).get("instrument");
  const instrumentView: ChordInstrumentView | undefined =
    requestedInstrument === "guitar" ||
    requestedInstrument === "piano" ||
    requestedInstrument === "both"
      ? requestedInstrument
      : undefined;
  const path = buildChordPath(root, chord.type);
  const h1 = `${root} ${chord.name}`;

  return {
    path,
    root,
    chordType: chord.type,
    instrumentView,
    title: `${h1} Chord | Mousi9ti`,
    description: `Explore the ${root} ${chord.name.toLowerCase()} chord, its notes, formula (${chord.formula}), and guitar and piano voicings.`,
    h1,
    indexable: true,
  };
};

export const getChordRouteDefinitions = () =>
  ALL_ROOT_NOTES.flatMap((root) =>
    CHORD_TYPES_CATALOG.map(
      (chord) => resolveChordRoute(buildChordPath(root, chord.type))!,
    ),
  );
