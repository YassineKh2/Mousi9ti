import { NoteName } from "../types";
import {
  ALL_ROOT_NOTES,
  GUITAR_TUNINGS,
  SCALES_DATABASE,
} from "../data/musicTheory";
import { searchChords, searchScales } from "../utils/musicSearch";
import { MENTION_REGEX, parseParams } from "../utils/taskMentions";

// Normalized, partial dashboard configuration recognized from a task's text.
// Every field is optional: only confidently recognized values are populated.
export interface TaskConfiguration {
  scale?: { root: NoteName; scaleId: string; label: string };
  chord?: { root: NoteName; type: string; label: string };
  tuning?: string;
  bpm?: number;
  durationMinutes?: number;
  exerciseType?: string;
  // Whether the task explicitly calls for the metronome (not just a target tempo).
  startMetronome?: boolean;
}

const MIN_BPM = 20;
const MAX_BPM = 300;
const MIN_DURATION_MINUTES = 1;
const MAX_DURATION_MINUTES = 180;
// searchScales()/searchChords() score for an exact root+alias match (e.g. "C" + "major"); below this we treat the match as a guess.
const SCALE_MATCH_CONFIDENCE_THRESHOLD = 100;
const CHORD_MATCH_CONFIDENCE_THRESHOLD = 100;

export function clampBpm(bpm: number): number {
  return Math.max(MIN_BPM, Math.min(MAX_BPM, Math.round(bpm)));
}

export function clampDurationMinutes(minutes: number): number {
  return Math.max(
    MIN_DURATION_MINUTES,
    Math.min(MAX_DURATION_MINUTES, Math.round(minutes)),
  );
}

function cloneMentionRegex(): RegExp {
  return new RegExp(MENTION_REGEX.source, MENTION_REGEX.flags);
}

// Highest-confidence source: explicit structured @mentions the task editor already supports.
function parseFromMentions(text: string): TaskConfiguration {
  const config: TaskConfiguration = {};
  const regex = cloneMentionRegex();
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text))) {
    const tool = match[2]?.toLowerCase();
    const params = match[3] || "";
    if (!tool) continue;

    if (tool === "scale" && !config.scale) {
      const parsed = parseParams("scale", params);
      if (parsed.root && parsed.type) {
        config.scale = {
          root: parsed.root,
          scaleId: parsed.type,
          label: parsed.label || `${parsed.root} ${parsed.type}`,
        };
      }
    } else if (
      (tool === "bpm" || tool === "metronome") &&
      config.bpm === undefined
    ) {
      const parsed = parseParams(tool, params);
      if (typeof parsed.bpm === "number") config.bpm = clampBpm(parsed.bpm);
    } else if (
      (tool === "timer" || tool === "time") &&
      config.durationMinutes === undefined
    ) {
      const parsed = parseParams(tool, params);
      if (typeof parsed.minutes === "number") {
        config.durationMinutes = clampDurationMinutes(parsed.minutes);
      }
    } else if (tool === "exercise" && !config.exerciseType) {
      const parsed = parseParams("exercise", params);
      if (parsed.exercise) config.exerciseType = parsed.exercise;
    } else if (tool === "chord" && !config.chord) {
      const parsed = parseParams("chord", params);
      if (parsed.root && parsed.type) {
        config.chord = {
          root: parsed.root,
          type: parsed.type,
          label: parsed.label || `${parsed.root} ${parsed.type}`,
        };
      }
    } else if (tool === "tuning" && !config.tuning) {
      const parsed = parseParams("tuning", params);
      if (parsed.tuning) config.tuning = parsed.tuning;
    }

    if (tool === "metronome") config.startMetronome = true;
  }

  return config;
}

// Removes @mentions so free-text parsing below never re-reads numbers/words from inside them.
function stripMentions(text: string): string {
  return text.replace(cloneMentionRegex(), " ");
}

function parseBpmFromText(text: string): number | undefined {
  const match = text.match(/\b(\d{2,3})\s*bpm\b/i);
  if (!match) return undefined;
  const value = parseInt(match[1], 10);
  return Number.isFinite(value) && value > 0 ? clampBpm(value) : undefined;
}

function parseDurationFromText(text: string): number | undefined {
  const match = text.match(/\b(\d{1,3})\s*(?:minutes|minute|mins|min)\b/i);
  if (!match) return undefined;
  const value = parseInt(match[1], 10);
  return Number.isFinite(value) && value > 0
    ? clampDurationMinutes(value)
    : undefined;
}

// Explicit mention of "metronome" signals the task wants the click running, not just a tempo target.
function mentionsMetronomeByWord(text: string): boolean {
  return /\bmetronomes?\b/i.test(text);
}

// Known tuning names are specific proper nouns (e.g. "Drop D", "DADGAD"), so a direct
// case-insensitive substring match is already confident -- no fuzzy scoring needed.
function parseTuningFromText(text: string): string | undefined {
  const sortedTunings = [...GUITAR_TUNINGS].sort(
    (a, b) => b.name.length - a.name.length,
  );
  for (const tuning of sortedTunings) {
    const escaped = tuning.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const nameRegex = new RegExp(`\\b${escaped}\\b`, "i");
    if (nameRegex.test(text)) return tuning.name;
  }
  return undefined;
}

// Only trusts a scale when a root note is directly followed by a recognized scale name
// (e.g. "C major", "A minor pentatonic scale") -- avoids guessing on ambiguous text like "review scales".
const ROOT_NOTE_LOOKUP = new Set(ALL_ROOT_NOTES.map((n) => n.toLowerCase()));

function parseScaleFromText(
  text: string,
): { root: NoteName; scaleId: string; label: string } | undefined {
  const tokens = text.split(/\s+/).map((t) => t.replace(/[.,!?;:]+$/, ""));
  let best:
    | { root: NoteName; scaleId: string; label: string; score: number }
    | undefined;

  for (let i = 0; i < tokens.length; i++) {
    const word = tokens[i];
    if (!word || !ROOT_NOTE_LOOKUP.has(word.toLowerCase())) continue;

    // Try longer phrases first so more specific aliases (e.g. "minor pentatonic") win ties.
    for (let len = 3; len >= 1; len--) {
      const rest = tokens
        .slice(i + 1, i + 1 + len)
        .join(" ")
        .trim();
      if (!rest) continue;
      const phrase = `${word} ${rest}`;
      const [result] = searchScales(phrase, 1);
      if (result && result.score >= SCALE_MATCH_CONFIDENCE_THRESHOLD) {
        if (!best || result.score > best.score) {
          const scaleDef = SCALES_DATABASE.find((s) => s.id === result.scaleId);
          const simplifiedName = scaleDef
            ? scaleDef.name.replace(/\s*\([^)]*\)/, "")
            : result.name;
          best = {
            root: result.root,
            scaleId: result.scaleId,
            label: `${result.root} ${simplifiedName}`,
            score: result.score,
          };
        }
      }
    }
  }

  return best;
}

// Only trusts a chord when a root note + quality is directly followed by the word "chord(s)"
// -- disambiguates from a bare "C major" scale reference, which is parsed as a scale by default.
function parseChordFromText(
  text: string,
): { root: NoteName; type: string; label: string } | undefined {
  const tokens = text.split(/\s+/).map((t) => t.replace(/[.,!?;:]+$/, ""));
  let best:
    | { root: NoteName; type: string; label: string; score: number }
    | undefined;

  for (let i = 0; i < tokens.length; i++) {
    const word = tokens[i];
    if (!word || !ROOT_NOTE_LOOKUP.has(word.toLowerCase())) continue;

    for (let len = 3; len >= 1; len--) {
      const windowTokens = tokens.slice(i + 1, i + 1 + len);
      if (windowTokens.length === 0) continue;
      const last = windowTokens[windowTokens.length - 1]?.toLowerCase();
      if (last !== "chord" && last !== "chords") continue;
      const rest = windowTokens.slice(0, -1).join(" ").trim();
      if (!rest) continue;

      const phrase = `${word} ${rest}`;
      const [result] = searchChords(phrase, 1);
      if (result && result.score >= CHORD_MATCH_CONFIDENCE_THRESHOLD) {
        if (!best || result.score > best.score) {
          best = {
            root: result.root,
            type: result.type,
            label: result.displayTitle,
            score: result.score,
          };
        }
      }
    }
  }

  return best;
}

/**
 * Parses a task's text into a normalized dashboard configuration.
 * Prefers structured @mentions over deterministic free-text parsing, and never guesses:
 * fields that cannot be confidently recognized are simply omitted.
 */
export function parseTaskConfiguration(text: string): TaskConfiguration {
  const config: TaskConfiguration = parseFromMentions(text);
  const remainingText = stripMentions(text);

  if (config.bpm === undefined) {
    const bpm = parseBpmFromText(remainingText);
    if (bpm !== undefined) config.bpm = bpm;
  }

  if (config.durationMinutes === undefined) {
    const duration = parseDurationFromText(remainingText);
    if (duration !== undefined) config.durationMinutes = duration;
  }

  if (!config.scale) {
    const scale = parseScaleFromText(remainingText);
    if (scale) config.scale = scale;
  }

  if (!config.chord) {
    const chord = parseChordFromText(remainingText);
    if (chord) config.chord = chord;
  }

  if (!config.tuning) {
    const tuning = parseTuningFromText(remainingText);
    if (tuning) config.tuning = tuning;
  }

  if (
    !config.startMetronome &&
    config.bpm !== undefined &&
    mentionsMetronomeByWord(remainingText)
  ) {
    config.startMetronome = true;
  }

  return config;
}

export function hasRecognizedConfiguration(config: TaskConfiguration): boolean {
  return (
    config.scale !== undefined ||
    config.chord !== undefined ||
    config.tuning !== undefined ||
    config.bpm !== undefined ||
    config.durationMinutes !== undefined
  );
}

export function formatConfigurationSummary(
  config: TaskConfiguration,
): string[] {
  const parts: string[] = [];
  if (config.scale) parts.push(`Scale: ${config.scale.label}`);
  if (config.chord) parts.push(`Chord: ${config.chord.label}`);
  if (config.tuning) parts.push(`Tuning: ${config.tuning}`);
  if (config.bpm !== undefined) parts.push(`Tempo: ${config.bpm} BPM`);
  if (config.durationMinutes !== undefined) {
    parts.push(`Duration: ${config.durationMinutes} min`);
  }
  if (config.startMetronome) parts.push("Metronome: started");
  return parts;
}

export interface AutoConfigDecisionInput {
  /** The "Automatically configure the dashboard from the active task" user preference. */
  enabled: boolean;
  activeTaskId: string | null;
  /** The task id that was last auto-configured (persisted across remounts/refreshes). */
  lastConfiguredTaskId: string | null;
}

export interface AutoConfigDecision {
  shouldApply: boolean;
  /** What `lastConfiguredTaskId` should become after this decision. */
  nextLastConfiguredTaskId: string | null;
}

/**
 * Pure decision logic for whether an active task should be (re)applied to the dashboard.
 * Automatic setup runs exactly once per activation: switching to a new task re-applies,
 * but re-rendering/refreshing while the same task stays active does not, and deactivating
 * a task clears the tracker so reactivating it later is treated as a fresh activation.
 */
export function decideAutoConfigAction(
  input: AutoConfigDecisionInput,
): AutoConfigDecision {
  if (!input.enabled) {
    return {
      shouldApply: false,
      nextLastConfiguredTaskId: input.lastConfiguredTaskId,
    };
  }
  if (!input.activeTaskId) {
    return { shouldApply: false, nextLastConfiguredTaskId: null };
  }
  if (input.lastConfiguredTaskId === input.activeTaskId) {
    return {
      shouldApply: false,
      nextLastConfiguredTaskId: input.lastConfiguredTaskId,
    };
  }
  return { shouldApply: true, nextLastConfiguredTaskId: input.activeTaskId };
}
