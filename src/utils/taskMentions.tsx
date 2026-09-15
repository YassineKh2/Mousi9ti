import React from "react";
import {
  ALL_ROOT_NOTES,
  GUITAR_TUNINGS,
  SCALES_DATABASE,
} from "../data/musicTheory";
import {
  searchChords,
  searchScales,
  parseChordInput,
  parseScaleInput,
} from "../utils/musicSearch";
export const COMMON_PRACTICE_KEYS = [
  "C Major",
  "A Minor",
  "G Major",
  "E Minor",
  "D Major",
  "B Minor",
  "F Major",
  "D Minor",
  "A Major",
  "F# Minor",
  "E Major",
  "C# Minor",
  "Bb Major",
  "G Minor",
  "Eb Major",
  "C Minor",
  "D Dorian",
  "A Dorian",
  "E Dorian",
  "A Blues",
  "E Blues",
];

export const COMMON_TECHNIQUES = [
  "Alternate Picking",
  "Legato",
  "Sweep Picking",
  "Bending & Vibrato",
  "Palm Muting",
  "Fingerstyle",
  "Tapping",
  "Hybrid Picking",
  "Economy Picking",
  "Slide",
  "Downpicking",
  "Tremolo Picking",
  "Hanon Finger Independence",
  "Czerny Etudes & Studies",
  "Parallel Scales & Arpeggios",
  "Staccato & Legato Articulation",
  "Pedaling (Sustain & Una Corda)",
  "Chord Inversions & Voicings",
  "Sight Reading & Real-time Decoding",
  "Polyphonic Independence",
  "Trills & Mordents",
  "Octave Glissando & Jumps",
  "Chopin Etude Technique",
  "Bach Invention Counterpoint",
];

export const COMMON_EXERCISES = [
  "Spider Drill",
  "1-2-3-4 Permutations",
  "String Skipping",
  "Triad Arpeggios",
  "Pentatonic Sequences",
  "Finger Independence",
  "Speed Burst Drill",
  "Octave Jumps",
  "CAGED Shift Drills",
];

export const MENTION_REGEX =
  /(@(custom|tuning|key|technique|bpm|exercise|metronome|scale|chord|timer)(?:\(([^)]*)\))?)/gi;

export const parseParams = (tool: string, params: string) => {
  const parts = params ? params.split(",").map((p) => p.trim()) : [];
  if (tool === "metronome") {
    const rawBpm = parts[0] ? parts[0].replace(/bpm/gi, "").trim() : "";
    const parsedBpm = parseInt(rawBpm, 10);
    return {
      bpm: !isNaN(parsedBpm) && parsedBpm > 0 ? parsedBpm : 120,
      signature: parts[1] || "4/4",
    };
  } else if (tool === "scale") {
    const parsed = parseScaleInput(params);
    return {
      root: parsed.root,
      type: parsed.scaleId,
      label: parsed.label,
      position: parsed.position,
      boxKey: parsed.boxKey,
    };
  } else if (tool === "chord") {
    const parsed = parseChordInput(params);
    return { root: parsed.root, type: parsed.type, label: parsed.label };
  } else if (tool === "timer") {
    const rawMin = parts[0]
      ? parts[0].replace(/(?:mins|min|minutes|m)/gi, "").trim()
      : "";
    const parsedMin = parseInt(rawMin, 10);
    return { minutes: !isNaN(parsedMin) && parsedMin > 0 ? parsedMin : 5 };
  } else if (tool === "custom") {
    return { text: params?.trim() || "Custom" };
  } else if (tool === "tuning") {
    return { tuning: params?.trim() || "E Standard" };
  } else if (tool === "key") {
    return { key: params?.trim() || "C Major" };
  } else if (tool === "technique") {
    return { technique: params?.trim() || "Alternate Picking" };
  } else if (tool === "bpm") {
    const rawBpm = (params || "").replace(/bpm/gi, "").trim();
    const parsedBpm = parseInt(rawBpm, 10);
    return { bpm: !isNaN(parsedBpm) && parsedBpm > 0 ? parsedBpm : 120 };
  } else if (tool === "exercise") {
    return { exercise: params?.trim() || "Spider Drill" };
  }
  return {};
};

export interface ActiveDropdown {
  taskId: string;
  matchIndex: number;
  tool: string;
  params: string;
  triggerEl?: HTMLElement;
  rect: DOMRect;
}

export interface MentionContext {
  type: "tool" | "param";
  query: string;
  startIndex: number;
  tool?: string;
  paramIndex?: number;
}

export const getMentionContext = (
  text: string,
  cursor: number,
): MentionContext | null => {
  const textBefore = text.slice(0, cursor);
  const atIndex = textBefore.lastIndexOf("@");
  if (atIndex === -1) return null;

  const textSinceAt = textBefore.slice(atIndex);
  if (textSinceAt.includes(" ") && !textSinceAt.includes("(")) return null;
  if (textSinceAt.includes(")")) return null;

  if (!textSinceAt.includes("(")) {
    return {
      type: "tool",
      query: textSinceAt.slice(1).toLowerCase(),
      startIndex: atIndex,
    };
  }

  const toolMatch = textSinceAt.match(/^@([a-zA-Z]+)\(/);
  if (!toolMatch) return null;

  const tool = toolMatch[1].toLowerCase();
  const paramsString = textSinceAt.slice(toolMatch[0].length);

  if (
    [
      "scale",
      "chord",
      "custom",
      "tuning",
      "key",
      "technique",
      "bpm",
      "exercise",
    ].includes(tool)
  ) {
    return {
      type: "param",
      tool,
      paramIndex: 0,
      query: paramsString.trim(),
      startIndex: atIndex,
    };
  }

  const params = paramsString.split(",");
  const paramIndex = params.length - 1;
  const query = params[paramIndex].trim().toLowerCase();

  return { type: "param", tool, paramIndex, query, startIndex: atIndex };
};

export const getMentionSuggestions = (
  ctx: MentionContext | null,
): { label: string; value: string; subLabel?: string }[] => {
  if (!ctx) return [];
  if (ctx.type === "tool") {
    const tools = [
      {
        name: "custom",
        label: "@custom",
        subLabel: "Custom note (type anything)",
      },
      {
        name: "tuning",
        label: "@tuning",
        subLabel: "Guitar tuning (Drop D, DADGAD...)",
      },
      {
        name: "key",
        label: "@key",
        subLabel: "Musical key (A Minor, C Major...)",
      },
      {
        name: "technique",
        label: "@technique",
        subLabel: "Guitar technique (Legato, Picking...)",
      },
      { name: "bpm", label: "@bpm", subLabel: "Target tempo BPM" },
      {
        name: "exercise",
        label: "@exercise",
        subLabel: "Practice drill / routine",
      },
      { name: "scale", label: "@scale", subLabel: "Scale & position" },
      { name: "chord", label: "@chord", subLabel: "Chord voicing" },
      {
        name: "metronome",
        label: "@metronome",
        subLabel: "Metronome BPM & signature",
      },
      { name: "timer", label: "@timer", subLabel: "Practice timer (minutes)" },
    ];
    return tools
      .filter((t) => t.name.startsWith(ctx.query))
      .map((t) => ({ label: t.label, value: t.name, subLabel: t.subLabel }));
  } else if (ctx.type === "param" && ctx.tool) {
    if (ctx.tool === "custom") {
      const presets = [
        "Warm-up",
        "Alternate Picking",
        "Backing Track",
        "Clean Tone",
        "High Gain Lead",
        "Solo Section",
        "Improvisation",
        "Triad Shapes",
        "Fingerstyle",
        "Bending",
      ];
      const list: { label: string; value: string; subLabel?: string }[] = [];
      if (ctx.query.trim()) {
        list.push({
          label: `"${ctx.query.trim()}"`,
          value: ctx.query.trim(),
          subLabel: "Custom note",
        });
      }
      presets
        .filter(
          (p) =>
            !ctx.query || p.toLowerCase().includes(ctx.query.toLowerCase()),
        )
        .forEach((p) => {
          if (p.toLowerCase() !== ctx.query.toLowerCase()) {
            list.push({ label: p, value: p, subLabel: "Quick tag" });
          }
        });
      return list.slice(0, 7);
    } else if (ctx.tool === "tuning") {
      return GUITAR_TUNINGS.filter(
        (t) =>
          !ctx.query ||
          t.name.toLowerCase().includes(ctx.query.toLowerCase()) ||
          t.strings.join(" ").toLowerCase().includes(ctx.query.toLowerCase()),
      )
        .map((t) => ({
          label: t.name,
          value: t.name,
          subLabel: t.strings.join(" "),
        }))
        .slice(0, 7);
    } else if (ctx.tool === "key") {
      return COMMON_PRACTICE_KEYS.filter(
        (k) => !ctx.query || k.toLowerCase().includes(ctx.query.toLowerCase()),
      )
        .map((k) => ({ label: k, value: k, subLabel: "Key" }))
        .slice(0, 7);
    } else if (ctx.tool === "technique") {
      const list: { label: string; value: string; subLabel?: string }[] = [];
      if (
        ctx.query.trim() &&
        !COMMON_TECHNIQUES.some(
          (t) => t.toLowerCase() === ctx.query.toLowerCase(),
        )
      ) {
        list.push({
          label: `"${ctx.query.trim()}"`,
          value: ctx.query.trim(),
          subLabel: "Custom technique",
        });
      }
      COMMON_TECHNIQUES.filter(
        (t) => !ctx.query || t.toLowerCase().includes(ctx.query.toLowerCase()),
      ).forEach((t) =>
        list.push({ label: t, value: t, subLabel: "Technique" }),
      );
      return list.slice(0, 7);
    } else if (ctx.tool === "bpm") {
      const baseList = [
        "60",
        "80",
        "100",
        "120",
        "130",
        "140",
        "160",
        "180",
        "200",
      ];
      const numMatch = ctx.query.match(/\d+/);
      if (numMatch) {
        const strVal = parseInt(numMatch[0], 10).toString();
        if (!baseList.includes(strVal)) baseList.unshift(strVal);
      }
      return baseList
        .filter(
          (b) =>
            !ctx.query ||
            b.startsWith(ctx.query) ||
            (numMatch && b === parseInt(numMatch[0], 10).toString()),
        )
        .map((b) => ({ label: `${b} BPM`, value: b, subLabel: "Tempo" }))
        .slice(0, 7);
    } else if (ctx.tool === "exercise") {
      const list: { label: string; value: string; subLabel?: string }[] = [];
      if (
        ctx.query.trim() &&
        !COMMON_EXERCISES.some(
          (e) => e.toLowerCase() === ctx.query.toLowerCase(),
        )
      ) {
        list.push({
          label: `"${ctx.query.trim()}"`,
          value: ctx.query.trim(),
          subLabel: "Custom drill",
        });
      }
      COMMON_EXERCISES.filter(
        (e) => !ctx.query || e.toLowerCase().includes(ctx.query.toLowerCase()),
      ).forEach((e) => list.push({ label: e, value: e, subLabel: "Exercise" }));
      return list.slice(0, 7);
    } else if (ctx.tool === "scale") {
      const results = searchScales(ctx.query, 6);
      return results.map((s) => ({
        label: s.displayTitle,
        value: s.formattedValue,
        subLabel: s.position ? `Pos ${s.position}` : "Scale",
      }));
    } else if (ctx.tool === "chord") {
      const results = searchChords(ctx.query, 6);
      return results.map((c) => ({
        label: `${c.displayTitle} (${c.shortDisplay})`,
        value: c.formattedValue,
        subLabel: "Chord",
      }));
    } else if (ctx.tool === "metronome") {
      if (ctx.paramIndex === 0) {
        const baseList = ["60", "80", "100", "120", "140", "160"];
        const numMatch = ctx.query.match(/\d+/);
        if (numMatch) {
          const strVal = parseInt(numMatch[0], 10).toString();
          if (!baseList.includes(strVal)) baseList.unshift(strVal);
        }
        return baseList
          .filter(
            (b) =>
              ctx.query === "" ||
              b.startsWith(ctx.query) ||
              (numMatch && b === parseInt(numMatch[0], 10).toString()),
          )
          .map((b) => ({ label: `${b} BPM`, value: b, subLabel: "Tempo" }));
      }
      if (ctx.paramIndex === 1) {
        const baseList = ["4/4", "3/4", "6/8"];
        const sigMatch = ctx.query.match(/\d+\/\d+/);
        if (sigMatch) {
          if (!baseList.includes(sigMatch[0])) baseList.unshift(sigMatch[0]);
        }
        return baseList
          .filter(
            (s) =>
              ctx.query === "" ||
              s.startsWith(ctx.query) ||
              (sigMatch && s === sigMatch[0]),
          )
          .map((s) => ({
            label: `Signature: ${s}`,
            value: s,
            subLabel: "Time sig",
          }));
      }
    } else if (ctx.tool === "timer") {
      if (ctx.paramIndex === 0) {
        const baseList = ["1", "2", "3", "5", "10", "15", "20", "30"];
        const numMatch = ctx.query.match(/\d+/);
        if (numMatch) {
          const strVal = parseInt(numMatch[0], 10).toString();
          if (!baseList.includes(strVal)) baseList.unshift(strVal);
        }
        return baseList
          .filter(
            (m) =>
              ctx.query === "" ||
              m.startsWith(ctx.query) ||
              (numMatch && m === parseInt(numMatch[0], 10).toString()),
          )
          .map((m) => ({
            label: `${m} Minutes`,
            value: m,
            subLabel: "Duration",
          }));
      }
    }
  }
  return [];
};

export const applyMentionSuggestion = (
  currentText: string,
  currentCursor: number,
  ctx: MentionContext,
  val: string,
): { newText: string; newCursor: number } => {
  const beforeAt = currentText.slice(0, ctx.startIndex);

  if (ctx.type === "tool") {
    const afterCursor = currentText.slice(ctx.startIndex);
    let replaceLen = afterCursor.search(/[\s\(]/);
    if (replaceLen === -1) replaceLen = afterCursor.length;

    const newPrefix = beforeAt + "@" + val + "(";
    const newText = newPrefix + afterCursor.slice(replaceLen);
    return { newText, newCursor: newPrefix.length };
  } else if (ctx.type === "param" && ctx.tool) {
    if (
      [
        "scale",
        "chord",
        "custom",
        "tuning",
        "key",
        "technique",
        "bpm",
        "exercise",
      ].includes(ctx.tool)
    ) {
      const openParenIndex = currentText.lastIndexOf("(", currentCursor);
      const beforeParen = currentText.slice(0, openParenIndex + 1);
      const afterCursor = currentText.slice(currentCursor);
      let cutIndex = afterCursor.indexOf(")");
      if (cutIndex !== -1) {
        cutIndex = cutIndex + 1;
      } else {
        cutIndex = 0;
      }
      const newPrefix = beforeParen + val + ") ";
      const newText =
        newPrefix + afterCursor.slice(cutIndex).replace(/^\s+/, "");
      return { newText, newCursor: newPrefix.length };
    }

    const beforeParam = currentText.slice(0, currentCursor - ctx.query.length);
    let isLast = false;
    if (ctx.tool === "metronome" && ctx.paramIndex === 1) isLast = true;
    if (ctx.tool === "timer" && ctx.paramIndex === 0) isLast = true;

    const suffix = isLast ? ") " : ",";

    const afterCursor = currentText.slice(currentCursor);
    const nextParen = afterCursor.indexOf(")");
    const nextComma = afterCursor.indexOf(",");
    let cutIndex = afterCursor.length;

    if (nextComma !== -1 && nextParen !== -1)
      cutIndex = Math.min(nextComma, nextParen);
    else if (nextComma !== -1) cutIndex = nextComma;
    else if (nextParen !== -1) cutIndex = nextParen;

    if (isLast && afterCursor[cutIndex] === ")") cutIndex++;

    const newPrefix = beforeParam + val + suffix;
    const newText = newPrefix + afterCursor.slice(cutIndex).replace(/^\s+/, "");
    return { newText, newCursor: newPrefix.length };
  }

  return { newText: currentText, newCursor: currentCursor };
};

export const renderHighlights = (text: string) => {
  const parts = text.split(
    /(@(?:custom|tuning|key|technique|bpm|exercise|metronome|scale|chord|timer)(?:\([^)]*\)?)?)/gi,
  );
  return parts.map((part, i) => {
    if (
      /^@(?:custom|tuning|key|technique|bpm|exercise|metronome|scale|chord|timer)/i.test(
        part,
      )
    ) {
      return (
        <span key={i} className="bg-primary/20 text-transparent rounded px-0.5">
          {part}
        </span>
      );
    }
    return (
      <span key={i} className="text-transparent">
        {part}
      </span>
    );
  });
};
