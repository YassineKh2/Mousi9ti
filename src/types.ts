export type NoteName =
  | "C"
  | "C#"
  | "Db"
  | "D"
  | "D#"
  | "Eb"
  | "E"
  | "F"
  | "F#"
  | "Gb"
  | "G"
  | "G#"
  | "Ab"
  | "A"
  | "A#"
  | "Bb"
  | "B";

export interface ChordSelection {
  root: NoteName;
  type: string;
  customChordId?: string;
}

export type NoteDisplayMode = "name" | "degree" | "interval";

export type AccidentalPreference = "sharp" | "flat" | "both";

export type InstrumentView = "fretboard" | "piano";

export type MetronomeSound = "click" | "woodblock" | "tick" | "beep";

export type MetronomeSubdivision =
  | "quarter"
  | "eighth"
  | "sixteenth"
  | "triplet";

export type TimeSignature =
  | "2/2"
  | "2/4"
  | "3/4"
  | "3/8"
  | "4/4"
  | "5/4"
  | "6/4"
  | "6/8"
  | "7/8"
  | "9/8"
  | "12/8";

export interface Tuning {
  name: string;
  strings: NoteName[]; // 6 strings from 6th (lowest) to 1st (highest) e.g., ['E', 'A', 'D', 'G', 'B', 'E']
  octaves: number[]; // e.g. [2, 2, 3, 3, 3, 4]
}

export interface ScaleDefinition {
  id: string;
  name: string;
  category:
    | "Major & Minor"
    | "Modes"
    | "Pentatonic & Blues"
    | "Symmetrical & Exotic";
  intervals: number[]; // semitones from root e.g. [0, 2, 4, 5, 7, 9, 11]
  formula: string; // e.g. "W W H W W W H"
  degrees: string[]; // e.g. ["1", "2", "3", "4", "5", "6", "7"]
  intervalsNamed: string[]; // e.g. ["R", "M2", "M3", "P4", "P5", "M6", "M7"]
  cagedBoxes?: {
    [box: string]: { startFretOffset: number; endFretOffset: number };
  };
}

export interface GuitarVoicing {
  name: string;
  positionLabel: string;
  rootString: string;
  frets: (number | null)[]; // 6 strings from 6th to 1st (null = muted, 0 = open)
  fingers: (number | null)[]; // finger 1 to 4, or null
  baseFret: number; // starting fret to display (1 if open)
  barre?: {
    fret: number;
    fromString: number;
    toString: number;
    finger: number;
  };
  barres?: Array<{
    fret: number;
    fromString: number;
    toString: number;
    finger: number;
  }>;
  category?:
    | "fundamental-open"
    | "fundamental-barre"
    | "CAGED"
    | "movable"
    | "variation";
  isFundamental?: boolean;
}

export interface KeyboardVoicingNote {
  note: NoteName;
  octave: number;
  degree: string;
  isRoot?: boolean;
  hand?: "LH" | "RH";
}

export interface KeyboardVoicing {
  id: string;
  name: string;
  shortLabel: string;
  category: "root" | "inversion" | "open" | "two-handed";
  positionLabel: string;
  bassNote: NoteName;
  bassOctave: number;
  notes: KeyboardVoicingNote[];
  startOctave: number;
  octavesCount: number;
  description: string;
}

export interface ChordDefinition {
  id: string;
  name: string;
  root: NoteName;
  type: string;
  symbol: string;
  fullName: string;
  intervals: number[];
  formula: string;
  notes: NoteName[];
  voicings: GuitarVoicing[];
  keyboardVoicings?: KeyboardVoicing[];
}

export interface Exercise {
  id: string;
  title: string;
  category: "Technique" | "Theory" | "Rhythm" | "Speed Building";
  difficulty: "Beginner" | "Intermediate" | "Advanced";
  suggestedBpm: number;
  description: string;
  tablature: string;
  focusGoal: string;
}

export interface Session {
  id: string;
  date: string; // ISO date string "2026-08-31"
  startTime: number; // Unix timestamp ms
  endTime: number; // Unix timestamp ms
  durationSeconds: number;
  bpmsUsed: number[];
  highestBpm: number;
  scalesPracticed: string[]; // e.g. ["A Minor Pentatonic", "C Major"]
  exercisesOpened: string[];
  focus: string;
  completed: boolean;
}

export type PracticeActivitySource =
  | "task"
  | "timer"
  | "metronome"
  | "session"
  | "custom";

export interface PracticeActivity {
  id: string;
  source: PracticeActivitySource;
  sourceId?: string;
  parentActivityId?: string;
  date: string;
  startTime: number;
  endTime: number;
  durationSeconds: number;
  area: string;
  subject?: string;
  taskId?: string;
  taskText?: string;
  tags: string[];
  bpm?: number;
  plannedDurationSeconds?: number;
  status?: "started" | "completed" | "skipped";
}

export interface TaskActivity {
  id: string;
  taskId: string;
  taskText: string;
  date: string;
  timestamp: number;
  kind: "started" | "completed";
  durationSeconds: number;
  area: string;
  source?: "task" | "custom";
  subject?: string;
  tags?: string[];
  bpm?: number;
  plannedDurationSeconds?: number;
}

export interface PracticeTask {
  id: string;
  text: string;
  completed: boolean;
  attributedDurationSeconds?: number;
  manuallyConfirmedDurationSeconds?: number;
}

export type TaskAttributionSource = "automatic" | "manual";

export interface TaskTimeAttribution {
  id: string;
  sessionId: string;
  taskId: string;
  durationSeconds: number;
  startedAt: number;
  endedAt: number;
  source: TaskAttributionSource;
  createdAt: number;
  updatedAt: number;
}

export type TaskCompletionBehavior = "stop" | "continue" | "ask";

export interface UserTimerPreferences {
  autoStartTimerWithDailyTasks: boolean;
  autoActivateFirstTask: boolean;
  completionBehavior: TaskCompletionBehavior;
  hasSeenTaskTimerOnboarding: boolean;
  autoConfigureDashboardFromTask: boolean;
  hasSeenAutoConfigOnboarding: boolean;
}

export interface StreakData {
  currentStreak: number;
  longestStreak: number;
  lastVisitDate: string; // ISO date string "YYYY-MM-DD"
  graceDaysUsed: number; // 0, 1, or 2
  history: { date: string; practiced: boolean; durationMin?: number }[];
}

export type FretboardTheme =
  | "original"
  | "ebony"
  | "maple"
  | "rosewood"
  | "high-contrast";

export interface AppSettings {
  theme: "dark" | "light";
  accentColor: string; // hex
  defaultInstrument: "guitar" | "piano";
  defaultTuning: string;
  fretCount: number; // 12, 15, 21, 22, 24
  soundVolume: number; // 0-1
  metronomeSound: MetronomeSound;
  fretboardTheme: FretboardTheme;
  fretboardNoteSize: "small" | "medium" | "large" | "xlarge";
  fretboardColorMode: "default" | "colorblind" | "monochrome";
  fretboardMarkerShape: "round" | "square";
  fretboardMinimalDetails: boolean;
  autoSaveSession: boolean;
  timerPresets: number[]; // in minutes
  stopMetronomeOnTimerEnd: boolean;
}

export type DashboardWidgetId =
  | "metronome"
  | "timer"
  | "random-drill"
  | "session"
  | "practice-tasks"
  | "instruments"
  | "chord-selector";

export interface DashboardWidgetLayout {
  id: DashboardWidgetId;
  title: string;
}

export interface DashboardRow {
  id: string;
  widgets: DashboardWidgetLayout[];
}

export interface DashboardLayoutData {
  rows: DashboardRow[];
  hiddenWidgets: DashboardWidgetLayout[];
}

export interface QueueItem {
  id: string;
  root: NoteName;
  type: string;
  customChordId?: string;
  repeats: number;
  duration: number; // Duration in beats (1 = quarter note, 2 = half note, 3 = dotted half, 4 = whole note, 8 = 2 bars)
  style: string; // Strumming pattern key
  voicingIndex?: number;
}

export interface SongPreset {
  id: string;
  title: string;
  artist: string;
  category: "Original";
  arrangement: string;
  key: string;
  tempo: number;
  instrument: string;
  style: string;
  reverbWet: number;
  reverbSpace: "room" | "hall" | "ambient";
  chords: Omit<QueueItem, "id">[];
  source: string;
}

export interface SavedProgression {
  id: string;
  name: string;
  queue: QueueItem[];
  tempo: number;
  instrument: string;
  reverbWet: number;
  isReverbActive: boolean;
  reverbSpace: "room" | "hall" | "ambient";
  updatedAt: number;
}
