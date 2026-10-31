export type ReleaseChangeCategory = "new" | "improved" | "fixed";

export interface ReleaseChange {
  id: string;
  category: ReleaseChangeCategory;
  title: string;
  description: string;
  href: string;
  featured?: boolean;
}

export interface ReleaseNotes {
  version: string;
  changes: ReleaseChange[];
}

export const RELEASES: ReleaseNotes[] = [
  {
    version: "1.3.0",
    changes: [
      {
        id: "bass-practice",
        category: "new",
        title: "Bass instrument support",
        description:
          "Choose bass as your instrument and practice with bass-aware fretboards, chord shapes, scales, and instrument settings.",
        href: "/",
        featured: true,
      },
      {
        id: "bass-chord-tools",
        category: "new",
        title: "Bass ready chord tools",
        description:
          "Explore and build chords with bass-specific voicings across the chord library, selector, and custom chord editor.",
        href: "/chords/",
        featured: true,
      },
      {
        id: "bass-audio",
        category: "improved",
        title: "Instrument-aware audio",
        description:
          "Chord and scale playback now follows the selected instrument, with improved bass soundfont playback and clearer loading feedback.",
        href: "/scales/",
      },
      {
        id: "refined-light-mode",
        category: "improved",
        title: "A more refined light mode",
        description:
          "Updated light-theme colors and surfaces make text, controls, and page backgrounds clearer and more consistent.",
        href: "/",
        featured: true,
      },
      {
        id: "compact-chord-selector",
        category: "improved",
        title: "A more compact chord selector",
        description:
          "The multi-instrument selector uses space more efficiently, keeps its controls visible, and lets you scroll through combined instrument views.",
        href: "/",
      },
      {
        id: "shareable-pages-update",
        category: "new",
        title: "Shareable chord and scale pages",
        description:
          "Open a chord or scale directly from its URL and share that page with someone else.",
        href: "/scales/",
        featured: true,
      },
    ],
  },
  {
    version: "1.2.0",
    changes: [
      {
        id: "light-mode",
        category: "improved",
        title: "Refined light mode",
        description:
          "Updated light-theme colors and surfaces make text, controls, and page backgrounds clearer and more consistent.",
        href: "/",
      },
      {
        id: "instrument-practice",
        category: "improved",
        title: "Instrument-specific practice tracking",
        description:
          "Practice sessions and tasks retain their instrument, and stats can be viewed for guitar, piano, or all instruments.",
        href: "/stats/",
      },
      {
        id: "task-scheduling",
        category: "improved",
        title: "More reliable task scheduling",
        description:
          "Task date tracking, scheduling history, completion rules, and settings persistence have been tightened up.",
        href: "/routine/",
      },
      {
        id: "custom-task-duration",
        category: "new",
        title: "Custom task durations",
        description:
          "Set a task duration in weeks and preview its date range while keeping existing task schedules intact.",
        href: "/routine/",
      },
      {
        id: "task-quick-start",
        category: "improved",
        title: "Faster task setup",
        description:
          "Task auto-configuration and quick-start scheduling make it easier to turn practice ideas into a routine.",
        href: "/routine/",
      },
      {
        id: "route-quality",
        category: "improved",
        title: "Cleaner page routes",
        description:
          "Canonical redirects, caching, and page metadata make app pages easier to navigate and discover.",
        href: "/",
      },
      {
        id: "schedule-history-fixes",
        category: "fixed",
        title: "More accurate task history",
        description:
          "Fixed task date tracking and scheduling history so custom durations and schedule edits preserve the correct date ranges and completion state.",
        href: "/routine/",
      },
      {
        id: "instrument-session-ownership",
        category: "fixed",
        title: "Correct instrument session tracking",
        description:
          "Sessions remain associated with the instrument they were recorded on when you switch instruments, keeping practice history and stats accurate.",
        href: "/stats/",
      },
    ],
  },
  {
    version: "1.1.0",
    changes: [
      {
        id: "shareable-pages",
        category: "new",
        title: "Shareable chord and scale pages",
        description:
          "Open a chord or scale directly from its URL and share that page with someone else.",
        href: "/scales/",
      },
      {
        id: "dedicated-music-routes",
        category: "new",
        title: "Direct links for music pages",
        description:
          "Chord and scale pages now have dedicated routes, with route handling for missing pages.",
        href: "/chords/",
      },
      {
        id: "page-discovery",
        category: "improved",
        title: "Search and page discovery",
        description:
          "Page titles, descriptions, canonical URLs, and navigation were improved to make content easier to find.",
        href: "/",
      },
      {
        id: "accessible-music-controls",
        category: "improved",
        title: "More accessible music controls",
        description:
          "Chord diagrams and interactive controls received keyboard and screen-reader accessibility improvements.",
        href: "/chords/",
      },
      {
        id: "search-and-playback",
        category: "improved",
        title: "Better search and chord playback",
        description:
          "Fuzzy chord search, playback behavior, and keyboard accessibility have been improved.",
        href: "/chords/",
      },
      {
        id: "metronome-audio",
        category: "improved",
        title: "Metronome and audio refinements",
        description:
          "Playback timing and audio behavior were improved across the metronome and practice tools.",
        href: "/tools/",
      },
      {
        id: "onboarding-navigation",
        category: "improved",
        title: "Smoother onboarding and navigation",
        description:
          "The guided tour, navigation, and responsive page experience were refined.",
        href: "/",
      },
      {
        id: "routine-and-stats-history",
        category: "improved",
        title: "More dependable routine and stats history",
        description:
          "Date-aware scheduling, custom task ranges, schedule-edit history, and stats filtering were aligned so routine progress is reported consistently.",
        href: "/routine/",
      },
      {
        id: "practice-setup",
        category: "improved",
        title: "Quicker, more reliable practice setup",
        description:
          "Quick-start routines, task auto-configuration, and automatic task progression make it easier to start a practice session and move through timed tasks.",
        href: "/routine/",
      },
      {
        id: "more-chord-variations",
        category: "new",
        title: "More chord variations",
        description:
          "The chord library grew with additional major, minor, seventh, diminished, suspended, and extended voicings.",
        href: "/chords/",
      },
      {
        id: "precision-metronome",
        category: "improved",
        title: "More precise, accessible metronome controls",
        description:
          "Beat timing was refined, and tempo can be adjusted with an accessible draggable control.",
        href: "/tools/",
      },
      {
        id: "mobile-routine-controls",
        category: "improved",
        title: "Smoother mobile practice",
        description:
          "Responsive scales, mobile navigation, routine controls, and practice-widget startup behavior were improved.",
        href: "/",
      },
      {
        id: "routine-completion-fixes",
        category: "fixed",
        title: "Routine scheduling and completion fixes",
        description:
          "Fixed routine and stats synchronization, date-range calculations, task deletion, and completion tracking after schedule changes.",
        href: "/routine/",
      },
      {
        id: "task-setup-fixes",
        category: "fixed",
        title: "Task setup and persistence fixes",
        description:
          "Fixed task BPM setup, settings and routine persistence, and tour navigation that could apply a task unexpectedly.",
        href: "/routine/",
      },
      {
        id: "practice-stats-fixes",
        category: "fixed",
        title: "Practice stats and task tracking fixes",
        description:
          "Corrected task tag colors and stats reporting, counted task time in seconds, and made completed tasks and started sessions count toward streaks.",
        href: "/stats/",
      },
      {
        id: "audio-overlap-fix",
        category: "fixed",
        title: "Prevented overlapping chord audio",
        description:
          "Fixed soundfont playback so the default player and chord builder no longer play over one another.",
        href: "/chords/",
      },
      {
        id: "chord-builder-layout-fix",
        category: "fixed",
        title: "Chord builder layout fixes",
        description:
          "Fixed guitar chord-builder alignment and clarified the builder with a usage hint.",
        href: "/chord-progression-builder/",
      },
      {
        id: "chord-search-url-fix",
        category: "fixed",
        title: "Chord search and URL consistency",
        description:
          "Fixed chord search text being cleared while selected chords are synchronized with shareable page URLs.",
        href: "/chords/",
      },
    ],
  },
  {
    version: "1.0.0",
    changes: [
      {
        id: "practice-dashboard",
        category: "new",
        title: "A dashboard for daily practice",
        description:
          "Arrange practice widgets and get quick access to your timer, metronome, session tracker, random note drill, and chord selector.",
        href: "/",
      },
      {
        id: "music-theory-library",
        category: "new",
        title: "Scales, chords, and exercises",
        description:
          "Explore music theory with scale and chord libraries, guitar fretboard and piano views, and guided exercises.",
        href: "/scales/",
      },
      {
        id: "practice-routines",
        category: "new",
        title: "Practice tasks and routines",
        description:
          "Plan recurring practice tasks, organize them by day, and track task completion as you build a routine.",
        href: "/routine/",
      },
      {
        id: "chord-builder",
        category: "new",
        title: "Custom chords and progressions",
        description:
          "Create and save chord shapes, queue chords, and play back song progressions with strumming or fingerpicking patterns.",
        href: "/chord-progression-builder/",
      },
      {
        id: "practice-history",
        category: "new",
        title: "Session history and progress stats",
        description:
          "Log practice sessions, review focus notes and tempo, and follow practice time, task completion, and streaks.",
        href: "/stats/",
      },
      {
        id: "practice-settings",
        category: "new",
        title: "Personal settings and data controls",
        description:
          "Choose a theme and audio preferences, keep practice data in your browser, and export or import backups.",
        href: "/",
      },
    ],
  },
];

const MAJOR_MINOR_VERSION_PATTERN =
  /^(?:v)?(\d+)\.(\d+)(?:\.\d+)?(?:[-+].*)?$/;

export const getMajorMinorVersion = (version: string): string | null => {
  const match = version.match(MAJOR_MINOR_VERSION_PATTERN);
  return match ? `${Number(match[1])}.${Number(match[2])}` : null;
};

export const isMajorOrMinorVersionAhead = (
  currentVersion: string,
  lastSeenVersion: string,
): boolean => {
  const currentMatch = currentVersion.match(
    /^(?:v)?(\d+)\.(\d+)\.\d+(?:[-+].*)?$/,
  );
  const lastSeenMatch = lastSeenVersion.match(MAJOR_MINOR_VERSION_PATTERN);
  if (!currentMatch || !lastSeenMatch) return false;

  const currentMajor = Number(currentMatch[1]);
  const currentMinor = Number(currentMatch[2]);
  const lastSeenMajor = Number(lastSeenMatch[1]);
  const lastSeenMinor = Number(lastSeenMatch[2]);

  return (
    currentMajor > lastSeenMajor ||
    (currentMajor === lastSeenMajor && currentMinor > lastSeenMinor)
  );
};
