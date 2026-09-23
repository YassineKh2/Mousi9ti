import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  CheckCircle2,
  Circle,
  Plus,
  Trash2,
  Activity,
  Music,
  Hash,
  Clock,
  Command,
  Edit2,
  X,
  Check,
  Search,
  Tag,
  Sliders,
  Compass,
  Zap,
  Target,
  Gauge,
  Sparkles,
  CalendarDays,
  Play,
  Pause,
} from "lucide-react";
import { ALL_ROOT_NOTES, GUITAR_TUNINGS } from "../data/musicTheory";
import { CHORD_TYPES_CATALOG } from "../data/chordsData";
import { SCALES_DATABASE } from "../data/musicTheory";
import {
  searchChords,
  searchScales,
  parseChordInput,
  parseScaleInput,
} from "../utils/musicSearch";
import {
  COMMON_PRACTICE_KEYS,
  COMMON_TECHNIQUES,
  COMMON_EXERCISES,
} from "../utils/taskMentions";
import { PracticeTask, UserTimerPreferences } from "../types";
import { getTaskDurationSeconds, recordTaskActivity } from "../lib/storage";

export type { PracticeTask } from "../types";

const MENTION_REGEX =
  /(@(custom|tuning|key|technique|bpm|exercise|metronome|scale|chord|timer|time)(?:\(([^)]*)\))?)/gi;

// Configuration parsing for rendering
const parseParams = (tool: string, params: string) => {
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
  } else if (tool === "timer" || tool === "time") {
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

interface ActiveDropdown {
  taskId: string;
  matchIndex: number;
  tool: string;
  params: string;
  triggerEl?: HTMLElement;
  rect: DOMRect;
}

interface MentionContext {
  type: "tool" | "param";
  query: string;
  startIndex: number;
  tool?: string;
  paramIndex?: number;
}

const getMentionContext = (
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

  // Single-param search and custom free-text tools
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

const getMentionSuggestions = (
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

const applyMentionSuggestion = (
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
      // Single parameter tools: replace content between '(' and ')' or cursor
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

const renderHighlights = (text: string) => {
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

export interface InlineTaskRowEditorProps {
  initialText: string;
  onSave: (text: string) => void;
  onCancel: () => void;
}

export const InlineTaskRowEditor: React.FC<InlineTaskRowEditorProps> = ({
  initialText,
  onSave,
  onCancel,
}) => {
  const [text, setText] = useState(initialText);
  const [cursor, setCursor] = useState(initialText.length);
  const [suggestionIndex, setSuggestionIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.setSelectionRange(initialText.length, initialText.length);
  }, [initialText]);

  useEffect(() => {
    setSuggestionIndex(0);
  }, [text, cursor]);

  const ctx = getMentionContext(text, cursor);
  const suggestions = getMentionSuggestions(ctx);
  const safeSuggestionIndex = Math.max(
    0,
    Math.min(suggestionIndex, suggestions.length - 1),
  );

  const applySuggestion = (val: string) => {
    if (!ctx) return;
    const { newText, newCursor } = applyMentionSuggestion(
      text,
      cursor,
      ctx,
      val,
    );
    setText(newText);
    setCursor(newCursor);
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
        inputRef.current.setSelectionRange(newCursor, newCursor);
      }
    }, 0);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (suggestions.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSuggestionIndex((prev) =>
          Math.min(prev + 1, suggestions.length - 1),
        );
        return;
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSuggestionIndex((prev) => Math.max(prev - 1, 0));
        return;
      } else if (e.key === "Tab" || e.key === "Enter") {
        e.preventDefault();
        applySuggestion(suggestions[safeSuggestionIndex].value);
        return;
      }
    }

    if (e.key === "Enter") {
      e.preventDefault();
      if (text.trim()) {
        onSave(text.trim());
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      onCancel();
    }
  };

  const handleScroll = (e: React.UIEvent<HTMLInputElement>) => {
    if (backdropRef.current) {
      backdropRef.current.scrollLeft = e.currentTarget.scrollLeft;
    }
  };

  return (
    <div className="flex items-center gap-2 p-1.5 rounded-lg bg-surface-container-high border border-primary/40 shadow-inner relative my-1">
      <div className="relative flex-1 bg-surface-container-lowest border border-outline-variant/60 rounded focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/50 transition-all flex items-center overflow-hidden">
        <div
          ref={backdropRef}
          className="absolute inset-0 px-2.5 py-1.5 font-mono text-xs sm:text-sm whitespace-pre overflow-hidden pointer-events-none text-transparent"
        >
          {renderHighlights(text)}
        </div>
        <input
          ref={inputRef}
          type="text"
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setCursor(e.target.selectionStart || 0);
          }}
          onSelect={(e) => setCursor(e.currentTarget.selectionStart || 0)}
          onScroll={handleScroll}
          onKeyUp={(e) => setCursor(e.currentTarget.selectionStart || 0)}
          onMouseUp={(e) => setCursor(e.currentTarget.selectionStart || 0)}
          onKeyDown={handleKeyDown}
          className="w-full bg-transparent px-2.5 py-1.5 font-mono text-xs sm:text-sm text-on-surface outline-none caret-primary relative z-10"
          autoComplete="off"
          spellCheck="false"
        />
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <button
          type="button"
          onClick={() => text.trim() && onSave(text.trim())}
          disabled={!text.trim()}
          className="text-primary hover:bg-primary/20 p-1.5 rounded transition-colors focus:outline-none disabled:opacity-40"
          title="Save changes"
          aria-label="Save changes"
        >
          <Check size={16} />
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="text-on-surface-variant hover:text-error hover:bg-error/10 p-1.5 rounded transition-colors focus:outline-none"
          title="Cancel"
          aria-label="Cancel editing"
        >
          <X size={16} />
        </button>
      </div>

      {suggestions.length > 0 && (
        <div
          className="absolute top-[calc(100%+4px)] left-0 w-72 max-h-48 overflow-y-auto bg-surface-container-high border border-outline-variant/40 rounded-lg shadow-2xl z-[80] py-1 custom-scrollbar overscroll-contain"
          onWheel={(e) => e.stopPropagation()}
        >
          {suggestions.map((s, i) => (
            <button
              key={i}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                applySuggestion(s.value);
              }}
              className={`w-full text-left px-3 py-1.5 text-xs font-mono flex items-center justify-between gap-2 transition-colors ${i === safeSuggestionIndex ? "bg-surface-container-highest text-primary font-semibold" : "text-on-surface hover:bg-surface-container-highest hover:text-primary"}`}
              ref={(el) => {
                if (el && i === safeSuggestionIndex) {
                  el.scrollIntoView({ block: "nearest" });
                }
              }}
            >
              <div className="flex items-center gap-1.5 truncate">
                <Command
                  size={11}
                  className={
                    i === safeSuggestionIndex
                      ? "opacity-100 text-primary"
                      : "opacity-40"
                  }
                />
                <span className="truncate">{s.label}</span>
              </div>
              {s.subLabel && (
                <span
                  className={`text-[10px] shrink-0 font-normal ${i === safeSuggestionIndex ? "text-primary/80" : "text-on-surface-variant"}`}
                >
                  {s.subLabel}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

interface PracticeTasksWidgetProps {
  onOpenRoutine?: () => void;
  tasks?: PracticeTask[];
  activeTaskId?: string | null;
  timerStatus?: "idle" | "running" | "paused" | "finished";
  timerPreferences?: UserTimerPreferences;
  onStartDailyTasks?: () => void;
  isDailyRoutineActive?: boolean;
  isSessionActive?: boolean;
  onPauseDailyTasks?: () => void;
  onResumeDailyTasks?: () => void;
  onMakeTaskActive?: (taskId: string | null) => void;
  onToggleTask?: (taskId: string) => void;
  onUpdateTimerPreferences?: (
    preferences: Partial<UserTimerPreferences>,
  ) => void;
  onTasksChange?: (tasks: PracticeTask[]) => void;
  onSetTaskManualDuration?: (taskId: string, minutes: number) => void;
}

const DEFAULT_PRACTICE_TASKS: PracticeTask[] = [
  {
    id: "1",
    text: "Warm up with @exercise(Spider Drill) in @tuning(E Standard)",
    completed: false,
  },
  {
    id: "2",
    text: "Practice @scale(C major) and @chord(G major) changes",
    completed: false,
  },
  {
    id: "3",
    text: "Work on @technique(Alternate Picking) at @bpm(120)",
    completed: false,
  },
  {
    id: "4",
    text: "Play along with @metronome(80,4/4) for @timer(5)",
    completed: false,
  },
  {
    id: "5",
    text: "@custom(Focus on clean fretting hand posture)",
    completed: false,
  },
];

export const getSavedPracticeTasks = (): PracticeTask[] => {
  const saved = localStorage.getItem("mous9iti_tasks");
  if (!saved) return DEFAULT_PRACTICE_TASKS;

  try {
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed : DEFAULT_PRACTICE_TASKS;
  } catch (error) {
    console.error("Failed to parse tasks", error);
    return DEFAULT_PRACTICE_TASKS;
  }
};

export const PracticeTasksWidget: React.FC<PracticeTasksWidgetProps> = ({
  onOpenRoutine,
  tasks: controlledTasks,
  activeTaskId,
  timerStatus,
  timerPreferences,
  onStartDailyTasks,
  isDailyRoutineActive,
  isSessionActive,
  onPauseDailyTasks,
  onResumeDailyTasks,
  onMakeTaskActive,
  onToggleTask: onToggleControlledTask,
  onUpdateTimerPreferences,
  onTasksChange,
  onSetTaskManualDuration,
}) => {
  const [localTasks, setLocalTasks] = useState<PracticeTask[]>(
    getSavedPracticeTasks,
  );
  const tasks = controlledTasks ?? localTasks;
  const setTasks = (
    next: PracticeTask[] | ((current: PracticeTask[]) => PracticeTask[]),
  ) => {
    const updated = typeof next === "function" ? next(tasks) : next;
    if (controlledTasks) onTasksChange?.(updated);
    else setLocalTasks(updated);
  };
  const [newTaskText, setNewTaskText] = useState("");
  const [cursor, setCursor] = useState(0);
  const [suggestionIndex, setSuggestionIndex] = useState(0);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [activeDropdown, setActiveDropdown] = useState<ActiveDropdown | null>(
    null,
  );

  const inputRef = useRef<HTMLInputElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!controlledTasks)
      localStorage.setItem("mous9iti_tasks", JSON.stringify(tasks));
  }, [tasks]);

  useEffect(() => {
    setSuggestionIndex(0);
  }, [newTaskText, cursor]);

  const addTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskText.trim()) return;
    setTasks([
      ...tasks,
      { id: Date.now().toString(), text: newTaskText.trim(), completed: false },
    ]);
    setNewTaskText("");
    setCursor(0);
  };

  const toggleTask = (id: string) => {
    const task = tasks.find((t) => t.id === id);
    if (!task) return;
    if (onToggleControlledTask) {
      onToggleControlledTask(id);
      return;
    }
    const nextCompleted = !task.completed;
    if (nextCompleted) {
      recordTaskActivity(task, "started");
      recordTaskActivity(task, "completed");
    }
    setTasks(
      tasks.map((t) => (t.id === id ? { ...t, completed: nextCompleted } : t)),
    );
  };
  const deleteTask = (id: string) => {
    if (editingTaskId === id) setEditingTaskId(null);
    setTasks(tasks.filter((t) => t.id !== id));
  };

  const startEditTask = (id: string) => {
    setActiveDropdown(null);
    setEditingTaskId(id);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewTaskText(e.target.value);
    setCursor(e.target.selectionStart || 0);
  };

  const handleInputSelect = (e: React.SyntheticEvent<HTMLInputElement>) => {
    setCursor(e.currentTarget.selectionStart || 0);
  };

  const handleScroll = (e: React.UIEvent<HTMLInputElement>) => {
    if (backdropRef.current) {
      backdropRef.current.scrollLeft = e.currentTarget.scrollLeft;
    }
  };

  const ctx = getMentionContext(newTaskText, cursor);
  const suggestions = getMentionSuggestions(ctx);
  const safeSuggestionIndex = Math.max(
    0,
    Math.min(suggestionIndex, suggestions.length - 1),
  );

  const applySuggestion = (val: string) => {
    if (!ctx) return;
    const { newText, newCursor } = applyMentionSuggestion(
      newTaskText,
      cursor,
      ctx,
      val,
    );
    setNewTaskText(newText);
    setCursor(newCursor);
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
        inputRef.current.setSelectionRange(newCursor, newCursor);
      }
    }, 0);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (suggestions.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSuggestionIndex((prev) =>
          Math.min(prev + 1, suggestions.length - 1),
        );
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSuggestionIndex((prev) => Math.max(prev - 1, 0));
      } else if (e.key === "Tab" || e.key === "Enter") {
        e.preventDefault();
        applySuggestion(suggestions[safeSuggestionIndex].value);
      }
    }
  };

  const renderTaskText = (task: PracticeTask) => {
    const parts = [];
    let lastIndex = 0;
    let match;
    MENTION_REGEX.lastIndex = 0;

    while ((match = MENTION_REGEX.exec(task.text)) !== null) {
      if (match.index > lastIndex) {
        parts.push(
          <span key={`text-${lastIndex}`}>
            {task.text.slice(lastIndex, match.index)}
          </span>,
        );
      }

      const tool = match[2].toLowerCase();
      const params = match[3] || "";
      const currentMatchIndex = match.index;

      let Icon = Activity;
      let badgeClass =
        "bg-surface-container-high text-on-surface border border-outline-variant/40 hover:bg-surface-container-highest";

      if (tool === "scale") {
        Icon = Music;
      } else if (tool === "chord") {
        Icon = Hash;
      } else if (tool === "timer") {
        Icon = Clock;
      } else if (tool === "custom") {
        Icon = Tag;
      } else if (tool === "tuning") {
        Icon = Sliders;
      } else if (tool === "key") {
        Icon = Compass;
      } else if (tool === "technique") {
        Icon = Zap;
      } else if (tool === "bpm") {
        Icon = Gauge;
      } else if (tool === "exercise") {
        Icon = Target;
      }

      let label = tool;
      const p = parseParams(tool, params);
      if (tool === "metronome") label = `${p.bpm} BPM`;
      else if (tool === "scale") label = p.label || `${p.root} ${p.type}`;
      else if (tool === "chord") label = p.label || `${p.root} ${p.type}`;
      else if (tool === "timer") label = `${p.minutes}m`;
      else if (tool === "custom") label = p.text || "Custom";
      else if (tool === "tuning") label = p.tuning || "Tuning";
      else if (tool === "key") label = p.key || "Key";
      else if (tool === "technique") label = p.technique || "Technique";
      else if (tool === "bpm") label = `${p.bpm} BPM`;
      else if (tool === "exercise") label = p.exercise || "Exercise";

      parts.push(
        <button
          key={`mention-${currentMatchIndex}`}
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setActiveDropdown({
              taskId: task.id,
              matchIndex: currentMatchIndex,
              tool,
              params,
              triggerEl: e.currentTarget,
              rect: e.currentTarget.getBoundingClientRect(),
            });
          }}
          className={`inline-flex items-center gap-1 px-1.5 py-0.5 mx-0.5 rounded text-[11px] font-mono font-bold align-middle shadow-sm cursor-pointer transition-colors ${
            task.completed
              ? "bg-surface-container-high text-on-surface-variant hover:text-on-surface line-through opacity-70"
              : badgeClass
          }`}
        >
          <Icon size={12} />
          {label}
        </button>,
      );

      lastIndex = MENTION_REGEX.lastIndex;
    }

    if (lastIndex < task.text.length) {
      parts.push(
        <span key={`text-${lastIndex}`}>{task.text.slice(lastIndex)}</span>,
      );
    }

    return parts;
  };

  const updateMention = (newParams: string, closeDropdown: boolean = false) => {
    if (!activeDropdown) return;
    setTasks(
      tasks.map((t) => {
        if (t.id !== activeDropdown.taskId) return t;
        MENTION_REGEX.lastIndex = 0;
        let m;
        let newText = t.text;
        while ((m = MENTION_REGEX.exec(t.text)) !== null) {
          if (m.index === activeDropdown.matchIndex) {
            const before = t.text.slice(0, m.index);
            const after = t.text.slice(m.index + m[0].length);
            newText = before + `@${activeDropdown.tool}(${newParams})` + after;
            break;
          }
        }
        return { ...t, text: newText };
      }),
    );
    if (closeDropdown) {
      setActiveDropdown(null);
    } else {
      setActiveDropdown((prev) =>
        prev ? { ...prev, params: newParams } : null,
      );
    }
  };

  const completedCount = tasks.filter((t) => t.completed).length;
  const progress =
    tasks.length === 0 ? 0 : Math.round((completedCount / tasks.length) * 100);

  return (
    <div className="bg-surface-container border border-outline-variant/30 rounded-lg p-5 flex flex-col shadow-xl relative group h-[400px]">
      <div className="flex items-center justify-between pb-3 border-b border-outline-variant/10 shrink-0">
        <span className="font-mono text-xs font-semibold tracking-[0.2em] text-on-surface uppercase">
          Daily Practice Goals
        </span>
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-primary">{progress}%</span>
          {onStartDailyTasks && !isDailyRoutineActive && (
            <button
              type="button"
              onClick={onStartDailyTasks}
              className="rounded p-1 text-primary transition-colors hover:bg-primary/10 hover:text-primary-container"
              title="Start daily session"
              aria-label="Start daily session"
            >
              <Play size={15} fill="currentColor" />
            </button>
          )}
          {isDailyRoutineActive &&
            (onPauseDailyTasks || onResumeDailyTasks) && (
              <button
                type="button"
                onClick={
                  isSessionActive ? onPauseDailyTasks : onResumeDailyTasks
                }
                className="rounded p-1 text-primary transition-colors hover:bg-primary/10"
                title={
                  isSessionActive
                    ? "Pause daily session"
                    : "Resume daily session"
                }
                aria-label={
                  isSessionActive
                    ? "Pause daily session"
                    : "Resume daily session"
                }
              >
                {isSessionActive ? (
                  <Pause size={15} fill="currentColor" />
                ) : (
                  <Play size={15} fill="currentColor" />
                )}
              </button>
            )}
          {onOpenRoutine && (
            <button
              type="button"
              onClick={onOpenRoutine}
              className="rounded p-1 text-on-surface-variant transition-colors hover:bg-primary/10 hover:text-primary"
              title="Open weekly routine"
              aria-label="Open weekly routine"
            >
              <CalendarDays size={15} />
            </button>
          )}
        </div>
      </div>

      <div className="w-full h-1.5 bg-surface-container-highest rounded-full my-3 overflow-hidden shrink-0">
        <div
          className="h-full bg-primary transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      {activeTaskId &&
        timerPreferences &&
        !timerPreferences.autoConfigureDashboardFromTask &&
        !timerPreferences.hasSeenAutoConfigOnboarding &&
        onUpdateTimerPreferences && (
          <div className="mb-2 flex items-start gap-2 rounded border border-primary/30 bg-primary/5 p-2 text-[11px] text-on-surface-variant shrink-0">
            <Sparkles size={13} className="mt-0.5 shrink-0 text-primary" />
            <div className="min-w-0 flex-1">
              <span className="block text-on-surface">
                Want the dashboard to auto-set scale, tempo and duration from
                your active task?
              </span>
              <div className="mt-1 flex gap-2">
                <button
                  type="button"
                  onClick={() =>
                    onUpdateTimerPreferences({
                      autoConfigureDashboardFromTask: true,
                      hasSeenAutoConfigOnboarding: true,
                    })
                  }
                  className="font-mono font-semibold text-primary hover:underline"
                >
                  Enable
                </button>
                <button
                  type="button"
                  onClick={() =>
                    onUpdateTimerPreferences({
                      hasSeenAutoConfigOnboarding: true,
                    })
                  }
                  className="font-mono text-on-surface-variant hover:underline"
                >
                  Not now
                </button>
              </div>
            </div>
          </div>
        )}

      <div className="flex-1 overflow-y-auto pr-2 space-y-2 my-2 custom-scrollbar min-h-0">
        {tasks.length === 0 ? (
          <p className="font-mono text-xs text-on-surface-variant text-center mt-4">
            No tasks set. Add a goal below!
          </p>
        ) : (
          tasks.map((task) => {
            if (editingTaskId === task.id) {
              return (
                <InlineTaskRowEditor
                  key={task.id}
                  initialText={task.text}
                  onSave={(updatedText) => {
                    setTasks(
                      tasks.map((t) =>
                        t.id === task.id ? { ...t, text: updatedText } : t,
                      ),
                    );
                    setEditingTaskId(null);
                  }}
                  onCancel={() => setEditingTaskId(null)}
                />
              );
            }

            return (
              <div
                key={task.id}
                className={`group/task flex items-start gap-2 rounded border p-2 transition-colors ${task.id === activeTaskId ? "border-primary/50 bg-primary/10" : task.completed ? "border-transparent bg-surface-container-low opacity-60" : "border-transparent hover:bg-surface-container-low"}`}
              >
                <button
                  type="button"
                  onClick={() => toggleTask(task.id)}
                  className="mt-0.5 text-primary focus:outline-none flex-shrink-0"
                >
                  {task.completed ? (
                    <CheckCircle2 size={16} />
                  ) : (
                    <Circle size={16} className="text-outline-variant" />
                  )}
                </button>
                <div
                  onClick={() => toggleTask(task.id)}
                  className={`flex-1 cursor-pointer break-words text-sm leading-relaxed ${task.completed ? "line-through text-on-surface-variant" : "text-on-surface"}`}
                >
                  {renderTaskText(task)}
                </div>
                {!task.completed &&
                  onMakeTaskActive &&
                  task.id !== activeTaskId && (
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        onMakeTaskActive(
                          task.id === activeTaskId ? null : task.id,
                        );
                      }}
                      className="shrink-0 appearance-none border-0 bg-transparent p-1.5 sm:p-1 text-on-surface-variant opacity-100 sm:opacity-0 transition-opacity sm:group-hover/task:opacity-100 hover:bg-transparent hover:text-primary focus-visible:opacity-100 touch-manipulation"
                      aria-label="Make task active"
                    >
                      <Target size={14} className="sm:hidden" />
                      <Target size={13} className="hidden sm:block" />
                    </button>
                  )}
                <div className="opacity-100 sm:opacity-0 sm:group-hover/task:opacity-100 flex items-center gap-1 transition-opacity">
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      startEditTask(task.id);
                    }}
                    className="text-primary hover:bg-primary/10 p-1.5 sm:p-1 rounded transition-colors focus:outline-none focus:opacity-100 touch-manipulation"
                    aria-label="Edit task"
                    title="Edit task inline"
                  >
                    <Edit2 size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      deleteTask(task.id);
                    }}
                    className="text-error hover:bg-error/10 p-1.5 sm:p-1 rounded transition-colors focus:outline-none focus:opacity-100 touch-manipulation"
                    aria-label="Delete task"
                    title="Delete task"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      <form
        onSubmit={addTask}
        className="mt-3 pt-3 border-t border-outline-variant/10 shrink-0 flex flex-col relative overflow-visible"
      >
        {suggestions.length > 0 && (
          <div
            className="absolute bottom-[calc(100%+8px)] left-0 w-72 sm:w-80 max-h-52 overflow-y-auto bg-surface-container-high border border-outline-variant/30 rounded-lg shadow-xl z-50 animate-in fade-in slide-in-from-bottom-2 py-1 custom-scrollbar overscroll-contain"
            onWheel={(e) => e.stopPropagation()}
          >
            {suggestions.map((s, i) => (
              <button
                key={i}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  applySuggestion(s.value);
                }}
                className={`w-full text-left px-3.5 py-1.5 text-xs font-mono flex items-center justify-between gap-2 transition-colors ${i === safeSuggestionIndex ? "bg-surface-container-highest text-primary font-semibold" : "text-on-surface hover:bg-surface-container-highest hover:text-primary"}`}
                ref={(el) => {
                  if (el && i === safeSuggestionIndex) {
                    el.scrollIntoView({ block: "nearest" });
                  }
                }}
              >
                <div className="flex items-center gap-2 truncate">
                  <Command
                    size={11}
                    className={
                      i === safeSuggestionIndex
                        ? "opacity-100 text-primary"
                        : "opacity-40"
                    }
                  />
                  <span className="truncate">{s.label}</span>
                </div>
                {s.subLabel && (
                  <span
                    className={`text-[10px] shrink-0 font-normal ${i === safeSuggestionIndex ? "text-primary/80" : "text-on-surface-variant"}`}
                  >
                    {s.subLabel}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}

        <div className="flex gap-2">
          <div className="relative flex-1 bg-surface-container-lowest border border-outline-variant/50 rounded focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/50 transition-all flex items-center overflow-hidden">
            <div
              ref={backdropRef}
              className="absolute inset-0 px-3 py-2 font-mono text-sm whitespace-pre overflow-hidden pointer-events-none text-transparent"
            >
              {renderHighlights(newTaskText)}
            </div>
            <input
              ref={inputRef}
              type="text"
              value={newTaskText}
              onChange={handleInputChange}
              onSelect={handleInputSelect}
              onScroll={handleScroll}
              onKeyUp={handleInputSelect}
              onMouseUp={handleInputSelect}
              onKeyDown={handleKeyDown}
              placeholder="e.g. Warm up @exercise(Spider Drill) in @tuning(Drop D)..."
              className="w-full bg-transparent px-3 py-2 font-mono text-sm text-on-surface outline-none caret-primary relative z-10"
              autoComplete="off"
              spellCheck="false"
            />
          </div>
          <button
            type="submit"
            disabled={!newTaskText.trim() || suggestions.length > 0}
            className="bg-primary text-on-primary px-3 rounded disabled:opacity-50 hover:bg-primary-container hover:text-on-primary-container transition-colors shrink-0 flex items-center justify-center"
          >
            <Plus size={18} />
          </button>
        </div>
        <div className="text-[9px] text-on-surface-variant font-mono mt-2 uppercase tracking-wider text-center flex items-center justify-center gap-2">
          <span>
            Type <strong className="text-primary">@</strong> for tags (custom,
            tuning, scale, chord, bpm, timer...)
          </span>
        </div>
      </form>

      {activeDropdown && (
        <DropdownEditor
          active={activeDropdown}
          onClose={() => setActiveDropdown(null)}
          onSave={updateMention}
        />
      )}
    </div>
  );
};

export const DropdownEditor: React.FC<{
  active: ActiveDropdown;
  onClose: () => void;
  onSave: (params: string, closeDropdown?: boolean) => void;
}> = ({ active, onClose, onSave }) => {
  const dropdownRef = useRef<HTMLDivElement>(null);
  const initial = parseParams(active.tool, active.params);

  // Custom text state
  const [customText, setCustomText] = useState(active.params || "");

  // Tuning search
  const [tuningQuery, setTuningQuery] = useState("");

  // Key search
  const [keyQuery, setKeyQuery] = useState("");

  // Technique state
  const [techniqueText, setTechniqueText] = useState(
    active.params || "Alternate Picking",
  );

  // Exercise state
  const [exerciseText, setExerciseText] = useState(
    active.params || "Spider Drill",
  );

  // BPM only state
  const [bpmOnlyStr, setBpmOnlyStr] = useState(
    initial.bpm ? String(initial.bpm) : "120",
  );

  // Metronome & timer state
  const [bpmStr, setBpmStr] = useState(
    initial.bpm ? String(initial.bpm) : "120",
  );
  const [signature, setSignature] = useState(initial.signature || "4/4");
  const [minutesStr, setMinutesStr] = useState(
    initial.minutes ? String(initial.minutes) : "5",
  );

  const initialDisplay =
    initial.label ||
    (active.tool === "chord"
      ? `${initial.root || "C"} ${initial.type || "major"}`
      : `${initial.root || "C"} ${initial.type || "major"}`);
  const [searchQuery, setSearchQuery] = useState(initialDisplay);
  const [selectedValue, setSelectedValue] = useState(
    active.params || (active.tool === "chord" ? "c minor" : "c major"),
  );
  const [selectedDisplay, setSelectedDisplay] = useState(initialDisplay);

  const chordResults = searchChords(searchQuery, 5);
  const scaleResults = searchScales(searchQuery, 8);

  const saveMetronome = (newBpm: string, newSig: string) => {
    const cleanBpm = parseInt(newBpm, 10);
    if (!isNaN(cleanBpm) && cleanBpm > 0) {
      onSave(`${cleanBpm},${newSig || "4/4"}`, false);
    }
  };

  const saveTimer = (newMin: string) => {
    const cleanMin = parseInt(newMin, 10);
    if (!isNaN(cleanMin) && cleanMin > 0) {
      onSave(`${cleanMin}`, false);
    }
  };

  const DROPDOWN_WIDTH = 260;

  // Dynamic position tracking to anchor dropdown firmly to the clicked element and prevent moving up/down
  const [coords, setCoords] = useState<{ top: number; left: number }>(() => {
    const left = Math.min(
      Math.max(8, active.rect.left),
      window.innerWidth - DROPDOWN_WIDTH - 8,
    );
    const top = active.rect.bottom + 4;
    return { top, left };
  });

  const updatePosition = useCallback(() => {
    const el = active.triggerEl;
    if (!el || !el.isConnected) {
      onClose();
      return;
    }

    const rect = el.getBoundingClientRect();

    // Check if the trigger button has scrolled outside of its scrollable parent
    const scrollParent = el.closest(".overflow-y-auto");
    if (scrollParent) {
      const parentRect = scrollParent.getBoundingClientRect();
      if (rect.bottom < parentRect.top || rect.top > parentRect.bottom) {
        onClose();
        return;
      }
    }

    // Check if the trigger button has scrolled outside the window viewport
    if (rect.bottom < 0 || rect.top > window.innerHeight) {
      onClose();
      return;
    }

    const estimatedHeight = dropdownRef.current
      ? dropdownRef.current.offsetHeight
      : 280;
    const spaceBelow = window.innerHeight - rect.bottom;
    const showAbove =
      spaceBelow < estimatedHeight && rect.top > estimatedHeight;

    const top = showAbove
      ? Math.max(8, rect.top - estimatedHeight - 4)
      : rect.bottom + 4;
    const left = Math.min(
      Math.max(8, rect.left),
      window.innerWidth - DROPDOWN_WIDTH - 8,
    );

    setCoords({ top, left });
  }, [active.triggerEl, onClose]);

  useEffect(() => {
    updatePosition();

    const handleScroll = (e: Event) => {
      // If the scroll happened inside the dropdown itself, don't close or reposition
      if (
        dropdownRef.current &&
        dropdownRef.current.contains(e.target as Node)
      ) {
        return;
      }
      // If the task list or window scrolls, update position immediately to stay locked
      updatePosition();
    };

    window.addEventListener("scroll", handleScroll, {
      capture: true,
      passive: true,
    });
    window.addEventListener("resize", updatePosition, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll, { capture: true });
      window.removeEventListener("resize", updatePosition);
    };
  }, [updatePosition]);

  return (
    <>
      <div
        className="fixed inset-0 z-[90]"
        onClick={onClose}
        onWheel={onClose}
      />
      <div
        ref={dropdownRef}
        className="fixed z-[100] w-[260px] bg-surface-container-high border border-outline-variant/30 rounded-lg shadow-2xl p-3 flex flex-col gap-3 animate-in fade-in zoom-in-95 overscroll-contain"
        style={{ top: coords.top, left: coords.left }}
        onWheel={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-2 border-b border-outline-variant/10">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-on-surface capitalize font-mono">
              @{active.tool}
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-on-surface-variant hover:text-on-surface p-0.5 rounded transition-colors"
            title="Close"
          >
            <X size={14} />
          </button>
        </div>

        <div className="flex flex-col gap-2">
          {/* Custom text mention editor */}
          {active.tool === "custom" && (
            <div className="flex flex-col gap-2">
              <label className="text-[10px] text-on-surface-variant uppercase font-bold tracking-wider">
                Custom Text
              </label>
              <input
                type="text"
                value={customText}
                onChange={(e) => {
                  const val = e.target.value;
                  setCustomText(val);
                  onSave(val, false);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    onSave(customText.trim() || "Custom", true);
                  }
                }}
                placeholder="Type whatever you want..."
                className="bg-surface-container-lowest px-2.5 py-1.5 rounded text-xs text-on-surface border border-outline-variant/50 focus:border-primary outline-none font-mono"
                autoFocus
              />
              <div className="flex flex-col gap-1">
                <span className="text-[9px] text-on-surface-variant uppercase font-mono font-bold tracking-wider">
                  Quick Presets:
                </span>
                <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto custom-scrollbar p-0.5">
                  {[
                    "Warm-up",
                    "Alternate Picking",
                    "Clean Tone",
                    "Backing Track",
                    "Triad Shapes",
                    "Solo Section",
                    "Improvisation",
                    "Legato",
                    "Bending",
                  ].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => {
                        setCustomText(preset);
                        onSave(preset, true);
                      }}
                      className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-surface-container-highest text-on-surface hover:bg-primary/20 hover:text-primary transition-colors text-left"
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Tuning mention editor */}
          {active.tool === "tuning" && (
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] text-on-surface-variant uppercase font-bold tracking-wider">
                Guitar Tuning
              </label>
              <div className="relative">
                <Search
                  size={12}
                  className="absolute left-2 top-1/2 -translate-y-1/2 text-on-surface-variant"
                />
                <input
                  type="text"
                  value={tuningQuery}
                  onChange={(e) => setTuningQuery(e.target.value)}
                  placeholder="Search tuning (e.g. Drop D)..."
                  className="w-full bg-surface-container-lowest pl-6 pr-2 py-1.5 rounded text-xs text-on-surface border border-outline-variant/50 focus:border-primary outline-none font-mono"
                  autoFocus
                />
              </div>
              <div
                className="flex flex-col gap-1 max-h-[140px] overflow-y-auto border border-outline-variant/20 rounded p-1 bg-surface-container-lowest overscroll-contain custom-scrollbar"
                onWheel={(e) => e.stopPropagation()}
              >
                {GUITAR_TUNINGS.filter(
                  (t) =>
                    !tuningQuery ||
                    t.name.toLowerCase().includes(tuningQuery.toLowerCase()) ||
                    t.strings
                      .join(" ")
                      .toLowerCase()
                      .includes(tuningQuery.toLowerCase()),
                ).map((t) => {
                  const isSelected =
                    active.params?.toLowerCase() === t.name.toLowerCase();
                  return (
                    <button
                      key={t.name}
                      type="button"
                      onClick={() => onSave(t.name, true)}
                      className={`text-left px-2 py-1 rounded text-xs font-mono flex items-center justify-between transition-colors ${
                        isSelected
                          ? "bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40"
                          : "text-on-surface hover:bg-surface-container-high"
                      }`}
                    >
                      <span className="truncate">{t.name}</span>
                      <span className="text-[10px] text-on-surface-variant shrink-0 font-normal">
                        {t.strings.join(" ")}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Key mention editor */}
          {active.tool === "key" && (
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] text-on-surface-variant uppercase font-bold tracking-wider">
                Musical Key
              </label>
              <div className="relative">
                <Search
                  size={12}
                  className="absolute left-2 top-1/2 -translate-y-1/2 text-on-surface-variant"
                />
                <input
                  type="text"
                  value={keyQuery}
                  onChange={(e) => {
                    setKeyQuery(e.target.value);
                    if (e.target.value.trim())
                      onSave(e.target.value.trim(), false);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      const first = COMMON_PRACTICE_KEYS.find((k) =>
                        k.toLowerCase().includes(keyQuery.toLowerCase()),
                      );
                      if (first) onSave(first, true);
                      else if (keyQuery.trim()) onSave(keyQuery.trim(), true);
                    }
                  }}
                  placeholder="Search key (e.g. A Minor)..."
                  className="w-full bg-surface-container-lowest pl-6 pr-2 py-1.5 rounded text-xs text-on-surface border border-outline-variant/50 focus:border-primary outline-none font-mono"
                  autoFocus
                />
              </div>
              <div
                className="flex flex-col gap-1 max-h-[140px] overflow-y-auto border border-outline-variant/20 rounded p-1 bg-surface-container-lowest overscroll-contain custom-scrollbar"
                onWheel={(e) => e.stopPropagation()}
              >
                {COMMON_PRACTICE_KEYS.filter(
                  (k) =>
                    !keyQuery ||
                    k.toLowerCase().includes(keyQuery.toLowerCase()),
                ).map((k) => {
                  const isSelected =
                    active.params?.toLowerCase() === k.toLowerCase();
                  return (
                    <button
                      key={k}
                      type="button"
                      onClick={() => onSave(k, true)}
                      className={`text-left px-2 py-1 rounded text-xs font-mono transition-colors ${
                        isSelected
                          ? "bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/40"
                          : "text-on-surface hover:bg-surface-container-high"
                      }`}
                    >
                      {k}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Technique mention editor */}
          {active.tool === "technique" && (
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] text-on-surface-variant uppercase font-bold tracking-wider">
                Technique
              </label>
              <input
                type="text"
                value={techniqueText}
                onChange={(e) => {
                  setTechniqueText(e.target.value);
                  if (e.target.value.trim())
                    onSave(e.target.value.trim(), false);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    onSave(techniqueText.trim() || "Alternate Picking", true);
                  }
                }}
                placeholder="Type or pick technique..."
                className="w-full bg-surface-container-lowest px-2 py-1.5 rounded text-xs text-on-surface border border-outline-variant/50 focus:border-primary outline-none font-mono"
                autoFocus
              />
              <div
                className="flex flex-col gap-1 max-h-[140px] overflow-y-auto border border-outline-variant/20 rounded p-1 bg-surface-container-lowest overscroll-contain custom-scrollbar"
                onWheel={(e) => e.stopPropagation()}
              >
                {COMMON_TECHNIQUES.map((tech) => {
                  const isSelected =
                    techniqueText.toLowerCase() === tech.toLowerCase();
                  return (
                    <button
                      key={tech}
                      type="button"
                      onClick={() => {
                        setTechniqueText(tech);
                        onSave(tech, true);
                      }}
                      className={`text-left px-2 py-1 rounded text-xs font-mono transition-colors ${
                        isSelected
                          ? "bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/40"
                          : "text-on-surface hover:bg-surface-container-high"
                      }`}
                    >
                      {tech}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Dedicated BPM mention editor */}
          {active.tool === "bpm" && (
            <div className="flex flex-col gap-2">
              <label className="text-[10px] text-on-surface-variant uppercase font-bold tracking-wider">
                Target BPM
              </label>
              <input
                type="text"
                inputMode="numeric"
                value={bpmOnlyStr}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, "");
                  setBpmOnlyStr(val);
                  if (val && parseInt(val, 10) > 0) {
                    onSave(val, false);
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    onSave(bpmOnlyStr.trim() || "120", true);
                  }
                }}
                placeholder="e.g. 120"
                className="bg-surface-container-lowest px-2 py-1.5 rounded text-sm text-on-surface border border-outline-variant/50 focus:border-primary outline-none font-mono"
                autoFocus
              />
              <div className="flex flex-col gap-1">
                <span className="text-[9px] text-on-surface-variant uppercase font-mono font-bold tracking-wider">
                  Quick Tempos:
                </span>
                <div className="grid grid-cols-4 gap-1">
                  {[60, 80, 100, 120, 140, 160, 180, 200].map((b) => (
                    <button
                      key={b}
                      type="button"
                      onClick={() => {
                        setBpmOnlyStr(String(b));
                        onSave(String(b), true);
                      }}
                      className="px-1 py-1 rounded text-xs font-mono bg-surface-container-highest text-on-surface hover:bg-rose-500/20 hover:text-rose-300 transition-colors text-center"
                    >
                      {b}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Exercise / Drill mention editor */}
          {active.tool === "exercise" && (
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] text-on-surface-variant uppercase font-bold tracking-wider">
                Exercise / Routine
              </label>
              <input
                type="text"
                value={exerciseText}
                onChange={(e) => {
                  setExerciseText(e.target.value);
                  if (e.target.value.trim())
                    onSave(e.target.value.trim(), false);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    onSave(exerciseText.trim() || "Spider Drill", true);
                  }
                }}
                placeholder="Type or select drill..."
                className="w-full bg-surface-container-lowest px-2 py-1.5 rounded text-xs text-on-surface border border-outline-variant/50 focus:border-primary outline-none font-mono"
                autoFocus
              />
              <div
                className="flex flex-col gap-1 max-h-[140px] overflow-y-auto border border-outline-variant/20 rounded p-1 bg-surface-container-lowest overscroll-contain custom-scrollbar"
                onWheel={(e) => e.stopPropagation()}
              >
                {COMMON_EXERCISES.map((ex) => {
                  const isSelected =
                    exerciseText.toLowerCase() === ex.toLowerCase();
                  return (
                    <button
                      key={ex}
                      type="button"
                      onClick={() => {
                        setExerciseText(ex);
                        onSave(ex, true);
                      }}
                      className={`text-left px-2 py-1 rounded text-xs font-mono transition-colors ${
                        isSelected
                          ? "bg-indigo-500/20 text-indigo-300 font-bold border border-indigo-500/40"
                          : "text-on-surface hover:bg-surface-container-high"
                      }`}
                    >
                      {ex}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {active.tool === "metronome" && (
            <>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-on-surface-variant uppercase font-bold tracking-wider">
                  BPM
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={bpmStr}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, "");
                    setBpmStr(val);
                    if (val) {
                      saveMetronome(val, signature);
                    }
                  }}
                  onBlur={() => {
                    if (!bpmStr.trim() || parseInt(bpmStr, 10) <= 0) {
                      setBpmStr("120");
                      saveMetronome("120", signature);
                    }
                  }}
                  placeholder="e.g. 105"
                  className="bg-surface-container-lowest px-2 py-1.5 rounded text-sm text-on-surface border border-outline-variant/50 focus:border-primary outline-none font-mono"
                  autoFocus
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-on-surface-variant uppercase font-bold tracking-wider">
                  Signature
                </label>
                <input
                  type="text"
                  value={signature}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSignature(val);
                    saveMetronome(bpmStr, val);
                  }}
                  placeholder="e.g. 4/4"
                  className="bg-surface-container-lowest px-2 py-1.5 rounded text-sm text-on-surface border border-outline-variant/50 focus:border-primary outline-none font-mono"
                />
              </div>
            </>
          )}

          {(active.tool === "scale" || active.tool === "chord") && (
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] text-on-surface-variant uppercase font-bold tracking-wider">
                {active.tool === "chord" ? "Search Chord" : "Search Scale"}
              </label>
              <div className="relative">
                <Search
                  size={12}
                  className="absolute left-2 top-1/2 -translate-y-1/2 text-on-surface-variant"
                />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSearchQuery(val);
                    const topResults =
                      active.tool === "chord"
                        ? searchChords(val, 1)
                        : searchScales(val, 1);
                    if (topResults.length > 0 && val.trim().length >= 2) {
                      setSelectedValue(topResults[0].formattedValue);
                      setSelectedDisplay(topResults[0].displayTitle);
                      onSave(topResults[0].formattedValue, false);
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      const top =
                        active.tool === "chord"
                          ? chordResults[0]
                          : scaleResults[0];
                      if (top) {
                        setSelectedValue(top.formattedValue);
                        setSelectedDisplay(top.displayTitle);
                        onSave(top.formattedValue, true);
                      }
                    }
                  }}
                  placeholder={
                    active.tool === "chord"
                      ? "e.g. Cm, G# dim..."
                      : "e.g. C major (type , for pos 1, 2...)"
                  }
                  className="w-full bg-surface-container-lowest pl-6 pr-2 py-1.5 rounded text-xs text-on-surface border border-outline-variant/50 focus:border-primary outline-none font-mono"
                  autoFocus
                />
              </div>

              <div
                className="flex flex-col gap-1 max-h-[140px] overflow-y-auto border border-outline-variant/20 rounded p-1 bg-surface-container-lowest overscroll-contain custom-scrollbar"
                onWheel={(e) => e.stopPropagation()}
              >
                {active.tool === "chord"
                  ? chordResults.map((c) => (
                      <button
                        key={`${c.root}-${c.type}`}
                        type="button"
                        onClick={() => {
                          setSelectedValue(c.formattedValue);
                          setSelectedDisplay(c.displayTitle);
                          setSearchQuery(c.displayTitle);
                          onSave(c.formattedValue, true);
                        }}
                        className={`text-left px-2 py-1 rounded text-xs font-mono flex items-center justify-between transition-colors ${
                          selectedValue.toLowerCase() ===
                          c.formattedValue.toLowerCase()
                            ? "bg-primary text-on-primary font-bold"
                            : "text-on-surface hover:bg-surface-container-high"
                        }`}
                      >
                        <span className="truncate">{c.displayTitle}</span>
                        <span
                          className={`text-[10px] ml-1 shrink-0 ${selectedValue.toLowerCase() === c.formattedValue.toLowerCase() ? "text-on-primary/80" : "text-on-surface-variant"}`}
                        >
                          {c.shortDisplay}
                        </span>
                      </button>
                    ))
                  : scaleResults.map((s) => {
                      const isSelected =
                        selectedValue.toLowerCase() ===
                        s.formattedValue.toLowerCase();
                      return (
                        <button
                          key={`${s.root}-${s.scaleId}-${s.position || "full"}`}
                          type="button"
                          onClick={() => {
                            setSelectedValue(s.formattedValue);
                            setSelectedDisplay(s.displayTitle);
                            setSearchQuery(s.displayTitle);
                            onSave(s.formattedValue, true);
                          }}
                          className={`text-left px-2 py-1 rounded text-xs font-mono flex items-center justify-between transition-colors ${
                            isSelected
                              ? "bg-primary text-on-primary font-bold"
                              : "text-on-surface hover:bg-surface-container-high"
                          }`}
                        >
                          <span className="truncate">{s.displayTitle}</span>
                          {s.position ? (
                            <span
                              className={`text-[9px] px-1 py-0.2 rounded font-mono ml-1 shrink-0 ${
                                isSelected
                                  ? "bg-black/25 text-on-primary"
                                  : "bg-primary/15 text-primary"
                              }`}
                            >
                              Pos {s.position}
                            </span>
                          ) : s.displayTitle.includes("(Full Scale)") ? (
                            <span
                              className={`text-[9px] px-1 py-0.2 rounded font-mono ml-1 shrink-0 ${
                                isSelected
                                  ? "bg-black/25 text-on-primary/90"
                                  : "bg-surface-container-highest text-on-surface-variant"
                              }`}
                            >
                              Full
                            </span>
                          ) : null}
                        </button>
                      );
                    })}
              </div>
            </div>
          )}

          {active.tool === "timer" && (
            <div className="flex flex-col gap-1">
              <label className="text-[10px] text-on-surface-variant uppercase font-bold tracking-wider">
                Minutes
              </label>
              <input
                type="text"
                inputMode="numeric"
                value={minutesStr}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, "");
                  setMinutesStr(val);
                  if (val) {
                    saveTimer(val);
                  }
                }}
                onBlur={() => {
                  if (!minutesStr.trim() || parseInt(minutesStr, 10) <= 0) {
                    setMinutesStr("5");
                    saveTimer("5");
                  }
                }}
                placeholder="e.g. 3"
                className="bg-surface-container-lowest px-2 py-1.5 rounded text-sm text-on-surface border border-outline-variant/50 focus:border-primary outline-none font-mono"
                autoFocus
              />
            </div>
          )}
        </div>
      </div>
    </>
  );
};
