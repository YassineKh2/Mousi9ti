import { ALL_ROOT_NOTES, SCALES_DATABASE } from "../data/musicTheory";
import type { NoteName, ScaleDefinition } from "../types";

export type ScaleInstrumentView = "guitar" | "piano" | "both";
export type PianoFocusRange = "all" | "octave4" | "octave3" | "octave34";

export type ScaleRouteTarget = {
  root: NoteName;
  scaleId: string;
  boxKey: string | null;
  instrumentView?: ScaleInstrumentView;
  pianoFocusRange?: PianoFocusRange;
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
) => {
  const scale = SCALES_DATABASE.find((item) => item.id === scaleId);
  if (!scale) return "/scales/";

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
