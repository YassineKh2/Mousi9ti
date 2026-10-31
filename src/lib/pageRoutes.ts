import type { ActiveTab } from "../components/Navigation";
import { resolveChordRoute } from "./chordRoutes";
import type { ChordRouteTarget } from "./chordRoutes";
import { resolveScaleRoute } from "./scaleRoutes";
import type { ScaleRouteTarget } from "./scaleRoutes";

export type ToolRoute =
  | "timer"
  | "metronome"
  | "circle"
  | "tuner"
  | "ear"
  | "custom-chord";

export type PageRoute = {
  path: string;
  tab: ActiveTab;
  title: string;
  description: string;
  h1: string;
  tool?: ToolRoute;
  indexable?: boolean;
  scaleTarget?: ScaleRouteTarget;
  chordTarget?: ChordRouteTarget;
};

export const PAGE_ROUTES: PageRoute[] = [
  {
    path: "/",
    tab: "dashboard",
    title: "Mousi9ti — Music Practice Studio for Guitar & Piano",
    description:
      "Mousi9ti is a music practice studio for guitar and piano players with daily routines, theory tools, metronome, timer, scales, chords, and progress tracking.",
    h1: "Your Music Practice Studio",
    indexable: true,
  },
  {
    path: "/patch-notes/",
    tab: "updates",
    title: "Patch Notes and New Features | Mousi9ti",
    description:
      "See what’s new in Mousi9ti, including shareable music pages and bass for practice, scales, and chords.",
    h1: "Patch notes",
    indexable: true,
  },
  {
    path: "/scales/",
    tab: "scales",
    title: "Guitar & Piano Scales | Mousi9ti",
    description:
      "Explore guitar and piano scales, root notes, intervals, and scale patterns with an interactive music theory workspace.",
    h1: "Guitar & Piano Scales",
    indexable: true,
    scaleTarget: { root: "A", scaleId: "pentatonic_minor", boxKey: null },
  },
  {
    path: "/chords/",
    tab: "chords",
    title: "Guitar & Piano Chords | Mousi9ti",
    description:
      "Find guitar and piano chords, voicings, inversions, and chord progressions in one music practice workspace.",
    h1: "Chord Library",
    indexable: true,
  },
  {
    path: "/chord-progression-builder/",
    tab: "builder",
    title: "Chord Progression Builder | Mousi9ti",
    description:
      "Build and practice chord progressions, loop ideas, and arrangements with a flexible music builder for guitar and piano.",
    h1: "Chord Progression Builder",
    indexable: true,
  },
  {
    path: "/exercises/",
    tab: "exercises",
    title: "Music Exercises & Practice Drills | Mousi9ti",
    description:
      "Practice music drills for rhythm, theory, technique, and ear training with focused daily exercises for musicians.",
    h1: "Music Practice Exercises",
  },
  {
    path: "/routine/",
    tab: "routine",
    title: "Daily Practice Routine | Mousi9ti",
    description:
      "Plan a daily music practice routine with task scheduling, timers, streak tracking, and focused sessions for guitar and piano work.",
    h1: "Daily Practice Routine",
  },
  {
    path: "/metronome/",
    tab: "tools",
    title: "Online Metronome | Mousi9ti",
    description:
      "Practice timing with an online metronome featuring adjustable tempo, time signatures, click sounds, and silent-bar mode.",
    h1: "Online Metronome",
    tool: "metronome",
    indexable: true,
  },
  {
    path: "/timer/",
    tab: "tools",
    title: "Online Practice Timer | Mousi9ti",
    description:
      "Stay focused with a practice timer for guitar and piano. Set a duration, track focused sessions, and build a consistent practice habit.",
    h1: "Online Practice Timer",
    tool: "timer",
    indexable: true,
  },
  {
    path: "/circle-of-fifths/",
    tab: "tools",
    title: "Interactive Circle of Fifths | Mousi9ti",
    description:
      "Explore key signatures, relative keys, and harmonic relationships with an interactive Circle of Fifths for music theory practice.",
    h1: "Interactive Circle of Fifths",
    tool: "circle",
    indexable: true,
  },
  {
    path: "/guitar-tuner/",
    tab: "tools",
    title: "Guitar Tuning Note Reference | Mousi9ti",
    description:
      "Hear standard guitar tuning notes with a pitch reference tuner featuring multiple tunings and clear string-by-string reference tones.",
    h1: "Guitar Tuning Note Reference",
    tool: "tuner",
    indexable: true,
  },
  {
    path: "/interval-ear-trainer/",
    tab: "tools",
    title: "Interval Ear Training | Mousi9ti",
    description:
      "Train your musical ear by listening to intervals, identifying their distance, and practicing pitch recognition with an interactive quiz.",
    h1: "Interval Ear Trainer",
    tool: "ear",
    indexable: true,
  },
  {
    path: "/custom-chord-builder/",
    tab: "tools",
    title: "Custom Chord Builder | Mousi9ti",
    description:
      "Create custom guitar and piano chord shapes, explore voicings, and visualize your own chord ideas with the Mousi9ti chord builder.",
    h1: "Custom Chord Builder",
    tool: "custom-chord",
    indexable: true,
  },
  {
    path: "/stats/",
    tab: "stats",
    title: "Practice Statistics & Progress | Mousi9ti",
    description:
      "Review practice stats, weekly progress, streaks, and session history to stay consistent with your music routine.",
    h1: "Practice Statistics",
  },
];

export const DEFAULT_PAGE_ROUTE = PAGE_ROUTES[0];

const normalizePath = (pathname: string) => {
  if (!pathname || pathname === "/") return "/";
  return `/${pathname.replace(/^\/+|\/+$/g, "")}/`;
};

export const resolvePageRoute = (
  pathname: string,
  search = "",
): PageRoute | null => {
  const chordRoute = resolveChordRoute(pathname, search);
  if (chordRoute) {
    return {
      path: chordRoute.path,
      tab: "chords",
      title: chordRoute.title,
      description: chordRoute.description,
      h1: chordRoute.h1,
      indexable: chordRoute.indexable,
      chordTarget: {
        root: chordRoute.root,
        chordType: chordRoute.chordType,
        instrumentView: chordRoute.instrumentView,
      },
    };
  }
  const scaleRoute = resolveScaleRoute(pathname, search);
  if (scaleRoute) {
    return {
      path: scaleRoute.path,
      tab: "scales",
      title: scaleRoute.title,
      description: scaleRoute.description,
      h1: scaleRoute.h1,
      indexable: scaleRoute.indexable,
      scaleTarget: {
        root: scaleRoute.root,
        scaleId: scaleRoute.scaleId,
        boxKey: scaleRoute.boxKey,
        instrumentView: scaleRoute.instrumentView,
        pianoFocusRange: scaleRoute.pianoFocusRange,
        bassPosition: scaleRoute.bassPosition,
      },
    };
  }
  const normalizedPath = normalizePath(pathname);
  if (normalizedPath === "/tools/") {
    return PAGE_ROUTES.find((route) => route.tool === "timer") ?? null;
  }
  return PAGE_ROUTES.find((route) => route.path === normalizedPath) ?? null;
};

export const getPageRouteForTab = (tab: ActiveTab): PageRoute => {
  if (tab === "tools") return getPageRouteForTool("timer");
  return (
    PAGE_ROUTES.find((route) => route.tab === tab && !route.tool) ??
    DEFAULT_PAGE_ROUTE
  );
};

export const getPageRouteForTool = (tool: ToolRoute): PageRoute => {
  const route = PAGE_ROUTES.find((page) => page.tool === tool);
  if (!route) {
    throw new Error(`Missing page route for tool "${tool}"`);
  }
  return route;
};
