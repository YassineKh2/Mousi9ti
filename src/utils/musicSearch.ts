import { NoteName, ScaleDefinition } from "../types";
import { ALL_ROOT_NOTES, SCALES_DATABASE } from "../data/musicTheory";
import { CHORD_TYPES_CATALOG } from "../data/chordsData";

// Levenshtein distance for typo-tolerant fuzzy matching
export function levenshteinDistance(s1: string, s2: string): number {
  const m = s1.length;
  const n = s2.length;
  const dp: number[][] = [];

  for (let i = 0; i <= m; i++) {
    dp[i] = [i];
  }
  for (let j = 0; j <= n; j++) {
    dp[0][j] = j;
  }

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (s1[i - 1] === s2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = Math.min(
          dp[i - 1][j] + 1, // deletion
          dp[i][j - 1] + 1, // insertion
          dp[i - 1][j - 1] + 1, // substitution
        );
      }
    }
  }

  return dp[m][n];
}

// Normalize strings for matching
export function normalizeQuery(q: string): string {
  return q
    .toLowerCase()
    .replace(/[\s\-_,]+/g, " ")
    .trim();
}

// Extract root note and remainder from a query string (e.g. "cm" -> root: "C", rest: "m")
export function extractRootAndRest(rawQuery: string): {
  root: NoteName | null;
  rest: string;
} {
  const q = rawQuery.trim();
  if (!q) return { root: null, rest: "" };

  // Check 2-char roots first (e.g. C#, Db, F#, Bb, etc.)
  if (q.length >= 2) {
    const twoChar = q.slice(0, 2);
    const matched2 = ALL_ROOT_NOTES.find(
      (n) => n.toLowerCase() === twoChar.toLowerCase(),
    );
    if (matched2) {
      return { root: matched2, rest: q.slice(2).trim() };
    }
  }

  // Check 1-char root
  const oneChar = q.slice(0, 1);
  const matched1 = ALL_ROOT_NOTES.find(
    (n) => n.toLowerCase() === oneChar.toLowerCase(),
  );
  if (matched1) {
    return { root: matched1, rest: q.slice(1).trim() };
  }

  return { root: null, rest: q };
}

export interface ChordSearchResult {
  root: NoteName;
  type: string;
  name: string;
  symbol: string;
  displayTitle: string; // e.g. "C Minor"
  shortDisplay: string; // e.g. "Cm"
  formattedValue: string; // e.g. "C minor"
  score: number;
}

export interface ScaleSearchResult {
  root: NoteName;
  scaleId: string;
  name: string;
  category: string;
  displayTitle: string; // e.g. "C Major (Full Scale)" or "C Major • Pos 1"
  formattedValue: string; // e.g. "c major" or "c major, pos 1"
  score: number;
  position?: number | null; // 1..5 or null for full scale
  boxKey?: string | null; // e.g. "Box 1 (C Shape)"
}

// Mapping of chord types to keywords and abbreviations
const CHORD_TYPE_ALIASES: Record<string, string[]> = {
  major: ["major", "maj", "m", ""],
  minor: ["minor", "min", "m", "minr", "-"],
  "7": ["7", "dom7", "dominant", "dominant 7th", "dominant 7", "dom"],
  maj7: ["maj7", "major 7", "major 7th", "m7", "^7", "delta"],
  min7: ["min7", "minor 7", "minor 7th", "m7", "-7"],
  dim: ["dim", "diminished", "diminshed", "diminsh", "o", "°"],
  dim7: ["dim7", "diminished 7", "diminished 7th", "diminshed 7", "o7"],
  m7b5: [
    "m7b5",
    "half diminished",
    "half-diminished",
    "half dim",
    "min7b5",
    "ø",
  ],
  aug: ["aug", "augmented", "+"],
  sus2: ["sus2", "suspended 2", "suspended 2nd"],
  sus4: ["sus4", "sus", "suspended 4", "suspended 4th"],
  add9: ["add9", "add 9"],
  "9": ["9", "dominant 9", "dom9", "dominant 9th"],
  "11": ["11", "11th"],
  "13": ["13", "13th"],
  "6": ["6", "6th", "major 6", "major 6th"],
  min6: ["min6", "minor 6", "minor 6th", "m6"],
  "7b9": ["7b9", "7 flat 9"],
  "7#9": ["7#9", "hendrix", "7 sharp 9"],
};

// Mapping of scale types to keywords, mode names, and typo variations
const SCALE_ALIASES: Record<string, string[]> = {
  major: ["major", "maj", "ionian", "mode 1", "major scale"],
  natural_minor: [
    "natural minor",
    "minor",
    "min",
    "aeolian",
    "mode 6",
    "minor scale",
    "m",
  ],
  harmonic_minor: [
    "harmonic minor",
    "harm minor",
    "harm min",
    "harmonic",
    "harm",
  ],
  melodic_minor: [
    "melodic minor",
    "mel minor",
    "mel min",
    "jazz minor",
    "melodic",
  ],
  pentatonic_minor: [
    "minor pentatonic",
    "pentatonic minor",
    "min pent",
    "pentatonic",
    "pent",
  ],
  pentatonic_major: ["major pentatonic", "pentatonic major", "maj pent"],
  blues: ["blues", "blues scale"],
  dorian: ["dorian", "doryan", "mode 2"],
  phrygian: ["phrygian", "frygian", "phrigian", "mode 3"],
  lydian: ["lydian", "lydan", "mode 4"],
  mixolydian: [
    "mixolydian",
    "mixoyidan",
    "mixo",
    "mixolydan",
    "mixolidian",
    "mode 5",
    "dominant scale",
  ],
  locrian: ["locrian", "lokrian", "mode 7"],
};

// Search Chords
export function searchChords(rawQuery: string, limit = 8): ChordSearchResult[] {
  const query = normalizeQuery(rawQuery);
  if (!query) {
    // Return standard common chords
    const commonRoots: NoteName[] = ["C", "G", "D", "A", "E", "F", "Bb"];
    return commonRoots
      .flatMap((r) => [
        {
          root: r,
          type: "major",
          name: "Major",
          symbol: "",
          displayTitle: `${r} Major`,
          shortDisplay: r,
          formattedValue: `${r} major`,
          score: 1,
        },
        {
          root: r,
          type: "minor",
          name: "Minor",
          symbol: "m",
          displayTitle: `${r} Minor`,
          shortDisplay: `${r}m`,
          formattedValue: `${r} minor`,
          score: 1,
        },
      ])
      .slice(0, limit);
  }

  const { root: detectedRoot, rest: detectedRest } = extractRootAndRest(query);
  const cleanRest = normalizeQuery(detectedRest);

  const results: ChordSearchResult[] = [];

  for (const root of ALL_ROOT_NOTES) {
    const rootLower = root.toLowerCase();
    const isRootMatch = detectedRoot === root;
    const rootMatchesInQuery = query.startsWith(rootLower);

    for (const ctype of CHORD_TYPES_CATALOG) {
      const typeLower = ctype.type.toLowerCase();
      const nameLower = ctype.name.toLowerCase();
      const symbolLower = ctype.symbol.toLowerCase();
      const aliases = CHORD_TYPE_ALIASES[ctype.type] || [typeLower, nameLower];

      const fullCombined = `${rootLower} ${nameLower}`;
      const shortCombined = `${rootLower}${symbolLower}`;
      const compactCombined = `${rootLower} ${symbolLower}`.trim();

      let score = 0;

      // Exact match for combined short string (e.g. "cm" -> C minor)
      if (
        query === shortCombined ||
        (query === `${rootLower}m` && ctype.type === "minor")
      ) {
        score += 120;
      } else if (query === fullCombined) {
        score += 110;
      } else if (query === compactCombined) {
        score += 105;
      } else if (isRootMatch) {
        // Root matches detected root
        score += 40;

        if (!cleanRest) {
          // No rest typed yet (e.g. just "c") -> prioritize major, minor, 7th
          if (ctype.type === "major") score += 30;
          else if (ctype.type === "minor") score += 25;
          else if (ctype.type === "7") score += 20;
          else score += 10;
        } else {
          // Check rest against aliases
          let bestAliasScore = 0;
          for (const alias of aliases) {
            if (alias === cleanRest) {
              bestAliasScore = Math.max(bestAliasScore, 60);
            } else if (alias.startsWith(cleanRest)) {
              bestAliasScore = Math.max(bestAliasScore, 45);
            } else if (alias.includes(cleanRest)) {
              bestAliasScore = Math.max(bestAliasScore, 30);
            } else {
              // Typo tolerance (e.g. "diminshed" vs "diminished")
              const dist = levenshteinDistance(cleanRest, alias);
              if (dist === 1 && cleanRest.length >= 3) {
                bestAliasScore = Math.max(bestAliasScore, 40);
              } else if (dist === 2 && cleanRest.length >= 5) {
                bestAliasScore = Math.max(bestAliasScore, 30);
              }
            }
          }
          score += bestAliasScore;
        }
      } else {
        // General substring match
        if (fullCombined.includes(query) || shortCombined.includes(query)) {
          score += 25;
        }
      }

      if (score > 0) {
        results.push({
          root,
          type: ctype.type,
          name: ctype.name,
          symbol: ctype.symbol,
          displayTitle: `${root} ${ctype.name}`,
          shortDisplay: `${root}${ctype.symbol}`,
          formattedValue: `${root} ${ctype.name.toLowerCase()}`,
          score,
        });
      }
    }
  }

  // Sort by score descending
  results.sort((a, b) => b.score - a.score);
  return results.slice(0, limit);
}

// Get the CAGED box key for a given scale and 1-based position (1-5)
export function getScaleBoxKey(
  scale: ScaleDefinition,
  position: number,
): string | null {
  if (!scale.cagedBoxes) return null;
  const keys = Object.keys(scale.cagedBoxes);
  // Match key containing "Box {position}" or "Pos {position}"
  const found = keys.find((k) =>
    new RegExp(`(?:box|pos(?:ition)?)\\s*${position}\\b`, "i").test(k),
  );
  if (found) return found;
  if (position >= 1 && position <= keys.length) {
    return keys[position - 1];
  }
  return null;
}

// Search base scales without positions (e.g. "c", "cm", "c major", "pentatonic", "mixoyidan")
export function searchBaseScales(
  rawQuery: string,
  limit = 10,
): ScaleSearchResult[] {
  const query = normalizeQuery(rawQuery);

  if (!query) {
    const defaultRoots: NoteName[] = ["C", "A", "G", "E", "D", "Bb"];
    return defaultRoots
      .flatMap((r) => {
        return [
          {
            root: r,
            scaleId: "major",
            name: "Major (Ionian)",
            category: "Major & Minor",
            displayTitle: `${r} Major`,
            formattedValue: `${r} major`,
            score: 2,
            position: null,
            boxKey: null,
          },
          {
            root: r,
            scaleId: "pentatonic_minor",
            name: "Minor Pentatonic",
            category: "Pentatonic & Blues",
            displayTitle: `${r} Minor Pentatonic`,
            formattedValue: `${r} minor pentatonic`,
            score: 1.5,
            position: null,
            boxKey: null,
          },
        ];
      })
      .slice(0, limit);
  }

  const { root: detectedRoot, rest: detectedRest } = extractRootAndRest(query);
  const cleanRest = normalizeQuery(detectedRest);

  const results: ScaleSearchResult[] = [];

  for (const root of ALL_ROOT_NOTES) {
    const rootLower = root.toLowerCase();
    const isRootMatch = detectedRoot === root;

    for (const scale of SCALES_DATABASE) {
      const scaleIdLower = scale.id.toLowerCase();
      const nameLower = scale.name.toLowerCase();
      const aliases = SCALE_ALIASES[scale.id] || [scaleIdLower, nameLower];

      const fullCombined = `${rootLower} ${nameLower}`;
      let score = 0;

      if (query === fullCombined) {
        score += 120;
      } else if (isRootMatch) {
        score += 40;

        if (!cleanRest) {
          if (scale.id === "major") score += 30;
          else if (scale.id === "natural_minor") score += 25;
          else if (scale.id === "pentatonic_minor") score += 22;
          else score += 10;
        } else {
          let bestAliasScore = 0;
          for (const alias of aliases) {
            if (alias === cleanRest) {
              bestAliasScore = Math.max(bestAliasScore, 60);
            } else if (alias.startsWith(cleanRest)) {
              bestAliasScore = Math.max(bestAliasScore, 45);
            } else if (alias.includes(cleanRest)) {
              bestAliasScore = Math.max(bestAliasScore, 30);
            } else {
              // Typo tolerance: e.g. "mixoyidan" vs "mixolydian"
              const dist = levenshteinDistance(cleanRest, alias);
              if (dist === 1 && cleanRest.length >= 4) {
                bestAliasScore = Math.max(bestAliasScore, 50);
              } else if (dist <= 2 && cleanRest.length >= 6) {
                bestAliasScore = Math.max(bestAliasScore, 35);
              }
            }
          }
          score += bestAliasScore;
        }
      } else {
        // Query without matching root explicitly (e.g. user types "mixoyidan" or "blues")
        for (const alias of aliases) {
          if (alias === query) {
            score += 35;
          } else if (alias.startsWith(query)) {
            score += 25;
          } else {
            const dist = levenshteinDistance(query, alias);
            if (dist <= 2 && query.length >= 5) {
              score += 20;
            }
          }
        }
        if (fullCombined.includes(query)) {
          score += 15;
        }
      }

      if (score > 0) {
        const simplifiedName = scale.name.replace(/\s*\([^)]*\)/, "");
        results.push({
          root,
          scaleId: scale.id,
          name: scale.name,
          category: scale.category,
          displayTitle: `${root} ${simplifiedName}`,
          formattedValue: `${root} ${simplifiedName.toLowerCase()}`,
          position: null,
          boxKey: null,
          score,
        });
      }
    }
  }

  results.sort((a, b) => b.score - a.score);
  return results.slice(0, limit);
}

// Search Scales:
// 1. When searching without comma: searches and displays only scales (Full Scale).
// 2. When user types "," or "pos": displays CAGED positions (Pos 1..5) and Full Scale for that scale.
export function searchScales(
  rawQuery: string,
  limit = 10,
): ScaleSearchResult[] {
  const hasComma = rawQuery.includes(",");
  const hasPosKeyword = /(?:\bpos(?:ition)?|\bbox)\b/i.test(rawQuery);
  const isPositionMode = hasComma || hasPosKeyword;

  if (!isPositionMode) {
    // Normal scale search: return purely scales
    return searchBaseScales(rawQuery, limit);
  }

  // Position mode is active: user pressed "," or typed pos keyword
  let scalePart = "";
  let posPart = "";

  if (hasComma) {
    const parts = rawQuery.split(",");
    scalePart = parts[0].trim();
    posPart = parts.slice(1).join(",").trim().toLowerCase();
  } else {
    const m = rawQuery.match(/^(.*?)\b(?:pos(?:ition)?|box)\s*(.*)$/i);
    if (m) {
      scalePart = m[1].trim();
      posPart = m[2].trim().toLowerCase();
    } else {
      scalePart = rawQuery.trim();
    }
  }

  // Parse target position from posPart
  let targetPos: number | "full" | null = null;
  const numMatch = posPart.match(/\b([1-5])\b/);
  if (numMatch) {
    targetPos = parseInt(numMatch[1], 10);
  } else if (/first|1st/i.test(posPart)) {
    targetPos = 1;
  } else if (/second|2nd/i.test(posPart)) {
    targetPos = 2;
  } else if (/third|3rd/i.test(posPart)) {
    targetPos = 3;
  } else if (/fourth|4th/i.test(posPart)) {
    targetPos = 4;
  } else if (/fifth|5th/i.test(posPart)) {
    targetPos = 5;
  } else if (/full|all/i.test(posPart)) {
    targetPos = "full";
  }

  // Resolve matching scale from scalePart
  let matchedRoot: NoteName = "C";
  let matchedScale: ScaleDefinition = SCALES_DATABASE[0];

  if (scalePart) {
    const baseMatches = searchBaseScales(scalePart, 1);
    if (baseMatches.length > 0) {
      matchedRoot = baseMatches[0].root;
      const foundDef = SCALES_DATABASE.find(
        (s) => s.id === baseMatches[0].scaleId,
      );
      if (foundDef) matchedScale = foundDef;
    }
  }

  const simplifiedName = matchedScale.name.replace(/\s*\([^)]*\)/, "");
  const results: ScaleSearchResult[] = [];

  // Generate CAGED positions if available
  if (matchedScale.cagedBoxes) {
    for (let p = 1; p <= 5; p++) {
      let score = 50 - p;
      if (targetPos === p) {
        score += 100; // Boost requested position to #1
      }
      results.push({
        root: matchedRoot,
        scaleId: matchedScale.id,
        name: matchedScale.name,
        category: matchedScale.category,
        displayTitle: `${matchedRoot} ${simplifiedName} • Pos ${p}`,
        formattedValue: `${matchedRoot} ${simplifiedName.toLowerCase()}, pos ${p}`,
        position: p,
        boxKey: getScaleBoxKey(matchedScale, p),
        score,
      });
    }
  }

  // Always include Full Scale option
  const fullScore = targetPos === "full" ? 140 : 40;
  results.push({
    root: matchedRoot,
    scaleId: matchedScale.id,
    name: matchedScale.name,
    category: matchedScale.category,
    displayTitle: `${matchedRoot} ${simplifiedName} (Full Scale)`,
    formattedValue: `${matchedRoot} ${simplifiedName.toLowerCase()}`,
    position: null,
    boxKey: null,
    score: fullScore,
  });

  results.sort((a, b) => b.score - a.score);
  return results.slice(0, limit);
}

// Parse free-form chord input text (e.g. "cm", "C Minor", "c minor", "C, minor", "G# diminshed")
export function parseChordInput(input: string): {
  root: NoteName;
  type: string;
  label: string;
} {
  const raw = (input || "").trim();
  if (!raw) return { root: "C", type: "major", label: "C Major" };

  // Comma format check: "C, minor" or "C, m"
  if (raw.includes(",")) {
    const parts = raw.split(",").map((p) => p.trim());
    const r = (ALL_ROOT_NOTES.find(
      (n) => n.toLowerCase() === parts[0].toLowerCase(),
    ) || "C") as NoteName;
    const typePart = parts[1]?.toLowerCase() || "major";
    const matched = CHORD_TYPES_CATALOG.find(
      (c) =>
        c.type.toLowerCase() === typePart || c.name.toLowerCase() === typePart,
    );
    return {
      root: r,
      type: matched?.type || "major",
      label: `${r} ${matched?.name || "Major"}`,
    };
  }

  // Use search to find the highest-ranking match
  const searchResults = searchChords(raw, 1);
  if (searchResults.length > 0) {
    const top = searchResults[0];
    return {
      root: top.root,
      type: top.type,
      label: top.displayTitle,
    };
  }

  return { root: "C", type: "major", label: "C Major" };
}

// Parse free-form scale input text (e.g. "c major , pos 1", "c major, pos 1", "c major", "C, major", "Bb mixolydian, pos 2")
export function parseScaleInput(input: string): {
  root: NoteName;
  scaleId: string;
  label: string;
  position: number | null;
  boxKey: string | null;
  formattedValue: string;
} {
  const raw = (input || "").trim();
  if (!raw) {
    return {
      root: "C",
      scaleId: "major",
      label: "C Major",
      position: null,
      boxKey: null,
      formattedValue: "c major",
    };
  }

  // 1. Detect position if specified: e.g. "c major , pos 1", "c major, 1", "c major, first pos", "c major, second"
  let position: number | null = null;
  let cleanWithoutPos = raw;

  const digitMatch =
    raw.match(/(?:,\s*)?(?:pos(?:ition)?|box)\s*([1-5])\b/i) ||
    raw.match(/,\s*pos(?:ition)?\s*([1-5])\b/i) ||
    raw.match(/,\s*([1-5])\s*$/i);
  if (digitMatch) {
    position = parseInt(digitMatch[1], 10);
    cleanWithoutPos = raw.replace(digitMatch[0], "").trim();
  } else {
    const wordMatch = raw.match(
      /,\s*(first|1st|second|2nd|third|3rd|fourth|4th|fifth|5th)(?:\s*pos(?:ition)?)?\s*$/i,
    );
    if (wordMatch) {
      const w = wordMatch[1].toLowerCase();
      if (w === "first" || w === "1st") position = 1;
      else if (w === "second" || w === "2nd") position = 2;
      else if (w === "third" || w === "3rd") position = 3;
      else if (w === "fourth" || w === "4th") position = 4;
      else if (w === "fifth" || w === "5th") position = 5;
      cleanWithoutPos = raw.replace(wordMatch[0], "").trim();
    }
  }

  // 2. Check comma separation for root & scale: e.g. "C, major" or "Bb, mixolydian"
  let detectedRoot: NoteName = "C";
  let scaleId = "major";
  let scaleDef: ScaleDefinition | undefined;

  if (cleanWithoutPos.includes(",")) {
    const parts = cleanWithoutPos.split(",").map((p) => p.trim());
    const r = (ALL_ROOT_NOTES.find(
      (n) => n.toLowerCase() === parts[0].toLowerCase(),
    ) || "C") as NoteName;
    const scalePart = parts[1]?.toLowerCase() || "major";
    const matched = SCALES_DATABASE.find(
      (s) =>
        s.id.toLowerCase() === scalePart || s.name.toLowerCase() === scalePart,
    );
    detectedRoot = r;
    scaleId = matched?.id || "major";
    scaleDef = matched || SCALES_DATABASE[0];
  } else {
    const searchResults = searchScales(cleanWithoutPos, 5);
    if (searchResults.length > 0) {
      detectedRoot = searchResults[0].root;
      scaleId = searchResults[0].scaleId;
      scaleDef = SCALES_DATABASE.find((s) => s.id === scaleId);
    }
  }

  const simplifiedName = scaleDef
    ? scaleDef.name.replace(/\s*\([^)]*\)/, "")
    : "Major";
  const boxKey =
    scaleDef && position ? getScaleBoxKey(scaleDef, position) : null;

  const label = position
    ? `${detectedRoot} ${simplifiedName} • Pos ${position}`
    : `${detectedRoot} ${simplifiedName}`;

  const formattedValue = position
    ? `${detectedRoot} ${simplifiedName.toLowerCase()}, pos ${position}`
    : `${detectedRoot} ${simplifiedName.toLowerCase()}`;

  return {
    root: detectedRoot,
    scaleId,
    label,
    position,
    boxKey,
    formattedValue,
  };
}
