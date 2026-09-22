import React, { useState, useEffect, useRef } from "react";
import {
  Play,
  Square,
  Pause,
  SkipForward,
  RotateCcw,
  Plus,
  Trash2,
  Clock,
  Music,
  CheckCircle2,
  Circle,
  Search,
  X,
  Calendar,
  Settings,
  Sparkles,
  Tag,
  Sliders,
  Compass,
  Zap,
  Gauge,
  Target,
  Command,
  Hash,
  Edit2,
  Activity,
} from "lucide-react";
import { NoteName } from "../types";
import {
  ALL_ROOT_NOTES,
  SCALES_DATABASE,
  GUITAR_TUNINGS,
} from "../data/musicTheory";
import { CHORD_TYPES_CATALOG, getChordDefinition } from "../data/chordsData";
import { audioEngine } from "../lib/audio";
import {
  searchChords,
  searchScales,
  parseChordInput,
  parseScaleInput,
} from "../utils/musicSearch";
import {
  MENTION_REGEX,
  parseParams,
  getMentionContext,
  getMentionSuggestions,
  applyMentionSuggestion,
  renderHighlights,
  ActiveDropdown,
  COMMON_PRACTICE_KEYS,
  COMMON_TECHNIQUES,
  COMMON_EXERCISES,
} from "../utils/taskMentions";
import {
  DropdownEditor,
  InlineTaskRowEditor,
} from "../components/PracticeTasksWidget";
import { useTimer } from "../lib/useTimer";
import { getSavedSessions, recordTaskActivity } from "../lib/storage";
import { SessionWidget } from "../components/SessionWidget";
import { StreakData } from "../types";

interface DayBlueprint {
  day: string;
  name: string;
  focusTheme: string;
  goalDurationMins: number;
  defaultBpm: number;
  modules: {
    id: string;
    title: string;
    durationMin: number;
    completed: boolean;
  }[];
  tasks: { id: string; text: string; completed: boolean }[];
}

const DEFAULT_WEEKLY_SCHEDULE: DayBlueprint[] = [
  {
    day: "MON",
    name: "Monday",
    focusTheme: "Scale Mastery & Pentatonic Flows",
    goalDurationMins: 45,
    defaultBpm: 100,
    modules: [
      {
        id: "m1",
        title: "Warm-up Chromatics",
        durationMin: 10,
        completed: true,
      },
      {
        id: "m2",
        title: "Major Scale Box Positions",
        durationMin: 20,
        completed: true,
      },
      {
        id: "m3",
        title: "Improvisation Backing Track",
        durationMin: 15,
        completed: true,
      },
    ],
    tasks: [
      {
        id: "t1",
        text: "Warm up with @scale(C major) Scale • 10m logged",
        completed: true,
      },
      {
        id: "t2",
        text: "Practice major scale positions across neck",
        completed: true,
      },
      {
        id: "t3",
        text: "Play along with @bpm(100) for @timer(15m)",
        completed: true,
      },
    ],
  },
  {
    day: "TUE",
    name: "Tuesday",
    focusTheme: "Chord Voicings & Transitions",
    goalDurationMins: 50,
    defaultBpm: 110,
    modules: [
      {
        id: "m1",
        title: "Chord Inversion Arpeggios",
        durationMin: 15,
        completed: true,
      },
      {
        id: "m2",
        title: "Smooth Chord Changes",
        durationMin: 20,
        completed: true,
      },
      {
        id: "m3",
        title: "Metronome Timing Drill",
        durationMin: 15,
        completed: true,
      },
    ],
    tasks: [
      {
        id: "t1",
        text: "Practice @chord(G major) to @chord(C major) changes",
        completed: true,
      },
      {
        id: "t2",
        text: "Chord voicing drills in @key(G Major)",
        completed: true,
      },
      { id: "t3", text: "Metronome timing test @bpm(110)", completed: true },
    ],
  },
  {
    day: "WED",
    name: "Wednesday",
    focusTheme: "Speed, Agility & Finger Independence",
    goalDurationMins: 65,
    defaultBpm: 130,
    modules: [
      {
        id: "m1",
        title: "Hanon & Spider Drills",
        durationMin: 20,
        completed: true,
      },
      {
        id: "m2",
        title: "Alternate Picking Speed Burst",
        durationMin: 25,
        completed: true,
      },
      {
        id: "m3",
        title: "String Skipping Etude",
        durationMin: 20,
        completed: true,
      },
    ],
    tasks: [
      {
        id: "t1",
        text: "Spider 1-2-3-4 drill with @bpm(130)",
        completed: true,
      },
      {
        id: "t2",
        text: "Alternate picking speed bursts @technique(Alternate Picking)",
        completed: true,
      },
      { id: "t3", text: "String skipping accuracy routine", completed: true },
    ],
  },
  {
    day: "THU",
    name: "Thursday",
    focusTheme: "Fretboard Visualization & CAGED Transitions",
    goalDurationMins: 60,
    defaultBpm: 120,
    modules: [
      {
        id: "m1",
        title: "Warm-up Chromatics",
        durationMin: 10,
        completed: true,
      },
      {
        id: "m2",
        title: "Random Note Fretboard Drill",
        durationMin: 10,
        completed: true,
      },
      {
        id: "m3",
        title: "CAGED Scale Position Linking",
        durationMin: 20,
        completed: false,
      },
      {
        id: "m4",
        title: "BPM Speed Ladder Alternate Picking",
        durationMin: 20,
        completed: false,
      },
    ],
    tasks: [
      {
        id: "t1",
        text: "Warm up with @scale(C major) • 10m logged",
        completed: true,
      },
      {
        id: "t2",
        text: "Practice @key(G Major) to @key(C Major) changes",
        completed: true,
      },
      {
        id: "t3",
        text: "Play along with @bpm(80) for @timer(5m)",
        completed: true,
      },
      {
        id: "t4",
        text: "Neck memorization: locate F# across all 6 strings",
        completed: true,
      },
      {
        id: "t5",
        text: "Drill @scale(A pentatonic minor) connecting Pos 1 -> Pos 2",
        completed: false,
      },
      {
        id: "t6",
        text: "Speed burst alternate picking with @bpm(120) for @timer(15m)",
        completed: false,
      },
    ],
  },
  {
    day: "FRI",
    name: "Friday",
    focusTheme: "Rhythm, Strumming & Grooves",
    goalDurationMins: 40,
    defaultBpm: 90,
    modules: [
      {
        id: "m1",
        title: "Syncopated Rhythm Patterns",
        durationMin: 20,
        completed: false,
      },
      {
        id: "m2",
        title: "Metronome Subdivision Drill",
        durationMin: 20,
        completed: false,
      },
    ],
    tasks: [
      {
        id: "t1",
        text: "Syncopated strumming with @bpm(90)",
        completed: false,
      },
      {
        id: "t2",
        text: "Subdivision click accuracy drill @metronome(90,4/4)",
        completed: false,
      },
    ],
  },
  {
    day: "SAT",
    name: "Saturday",
    focusTheme: "Repertoire & Full Practice Suite",
    goalDurationMins: 75,
    defaultBpm: 115,
    modules: [
      {
        id: "m1",
        title: "Full Song Playthroughs",
        durationMin: 35,
        completed: false,
      },
      {
        id: "m2",
        title: "Sweep Picking & Arpeggios",
        durationMin: 20,
        completed: false,
      },
      {
        id: "m3",
        title: "Improvisation Jam Session",
        durationMin: 20,
        completed: false,
      },
    ],
    tasks: [
      {
        id: "t1",
        text: "Full playthrough of main pieces @custom(Performance ready)",
        completed: false,
      },
      {
        id: "t2",
        text: "Sweep arpeggio transitions @technique(Sweep Picking)",
        completed: false,
      },
    ],
  },
  {
    day: "SUN",
    name: "Sunday",
    focusTheme: "Review, Tone & Free Improvisation",
    goalDurationMins: 30,
    defaultBpm: 80,
    modules: [
      {
        id: "m1",
        title: "Free Flow Improvisation",
        durationMin: 15,
        completed: false,
      },
      {
        id: "m2",
        title: "Weekly Review & Reflection",
        durationMin: 15,
        completed: false,
      },
    ],
    tasks: [
      {
        id: "t1",
        text: "Free Improvisation in @key(A Minor)",
        completed: false,
      },
      {
        id: "t2",
        text: "Review weekly logs and notes @timer(15m)",
        completed: false,
      },
    ],
  },
];

const DAY_CODES = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
const getTodayCode = () => DAY_CODES[new Date().getDay()];

interface RoutinePageProps {
  timer?: ReturnType<typeof useTimer>;
  streak?: StreakData;
  activeSessionDuration?: number;
  isSessionActive?: boolean;
  onToggleSession?: () => void;
  onEndSession?: () => void;
}

export const RoutinePage: React.FC<RoutinePageProps> = ({
  timer: propTimer,
  streak: propStreak,
  activeSessionDuration = 0,
  isSessionActive = false,
  onToggleSession = () => {},
  onEndSession = () => {},
}) => {
  const internalTimer = useTimer();
  const timer = propTimer || internalTimer;

  const [streakData, setStreakData] = useState<StreakData>(
    propStreak || {
      currentStreak: 0,
      longestStreak: 0,
      lastVisitDate: "",
      graceDaysUsed: 0,
      history: [],
    },
  );

  useEffect(() => {
    if (propStreak) {
      setStreakData(propStreak);
      return;
    }
    try {
      const rawStreak = localStorage.getItem("fretmaster_streak_v1");
      if (rawStreak) {
        setStreakData(JSON.parse(rawStreak));
      }
    } catch (e) {}
  }, [propStreak]);

  const [totalPracticeMins, setTotalPracticeMins] = useState(0);

  useEffect(() => {
    const totalSecs = getSavedSessions().reduce(
      (total, session) => total + session.durationSeconds,
      0,
    );
    setTotalPracticeMins(Math.round(totalSecs / 60));
  }, [activeSessionDuration, isSessionActive]);

  const [weeklySchedule, setWeeklySchedule] = useState<DayBlueprint[]>(() => {
    const saved = localStorage.getItem("mous9iti_weekly_schedule");
    let schedule = DEFAULT_WEEKLY_SCHEDULE;
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) schedule = parsed;
      } catch (e) {}
    }

    const savedDailyTasks = localStorage.getItem("mous9iti_tasks");
    if (!savedDailyTasks) return schedule;
    try {
      const parsedTasks = JSON.parse(savedDailyTasks);
      if (!Array.isArray(parsedTasks)) return schedule;
      return schedule.map((day) =>
        day.day === getTodayCode() ? { ...day, tasks: parsedTasks } : day,
      );
    } catch (e) {
      return schedule;
    }
  });

  const [activeDayCode, setActiveDayCode] = useState<string>(getTodayCode);
  const activeDay =
    weeklySchedule.find((d) => d.day === activeDayCode) || weeklySchedule[3];

  // Sync state to localStorage
  useEffect(() => {
    localStorage.setItem(
      "mous9iti_weekly_schedule",
      JSON.stringify(weeklySchedule),
    );
    if (activeDay?.day === getTodayCode()) {
      localStorage.setItem(
        "mous9iti_routine",
        JSON.stringify(
          activeDay.tasks.map((t) => ({
            id: t.id,
            title: t.text,
            completed: t.completed,
            type: "custom",
            durationSec: 300,
            restSec: 30,
            bpm: 120,
          })),
        ),
      );
      localStorage.setItem("mous9iti_tasks", JSON.stringify(activeDay.tasks));
    }
  }, [weeklySchedule, activeDayCode]);

  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === "mous9iti_tasks" && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          setWeeklySchedule((prev) =>
            prev.map((d) => {
              if (d.day === getTodayCode()) {
                return { ...d, tasks: parsed };
              }
              return d;
            }),
          );
        } catch (err) {}
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  // New task input state & Autocomplete
  const [newTaskInput, setNewTaskInput] = useState("");
  const [cursor, setCursor] = useState(0);
  const [suggestionIndex, setSuggestionIndex] = useState(0);
  const [activeDropdown, setActiveDropdown] = useState<ActiveDropdown | null>(
    null,
  );
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSuggestionIndex(0);
  }, [newTaskInput, cursor]);

  const ctx = getMentionContext(newTaskInput, cursor);
  const suggestions = getMentionSuggestions(ctx);
  const safeSuggestionIndex = Math.max(
    0,
    Math.min(suggestionIndex, suggestions.length - 1),
  );

  const applySuggestion = (val: string) => {
    if (!ctx) return;
    const { newText, newCursor } = applyMentionSuggestion(
      newTaskInput,
      cursor,
      ctx,
      val,
    );
    setNewTaskInput(newText);
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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewTaskInput(e.target.value);
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

  const toggleTaskCompleted = (taskId: string) => {
    const task = activeDay.tasks.find((item) => item.id === taskId);
    if (task && !task.completed) {
      recordTaskActivity(task, "started");
      recordTaskActivity(task, "completed");
    }
    setWeeklySchedule((prev) =>
      prev.map((d) => {
        if (d.day === activeDayCode) {
          return {
            ...d,
            tasks: d.tasks.map((t) =>
              t.id === taskId ? { ...t, completed: !t.completed } : t,
            ),
          };
        }
        return d;
      }),
    );
  };

  const addTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskInput.trim()) return;
    const newTask = {
      id: `t-${Date.now()}`,
      text: newTaskInput.trim(),
      completed: false,
    };
    setWeeklySchedule((prev) =>
      prev.map((d) => {
        if (d.day === activeDayCode) {
          return { ...d, tasks: [...d.tasks, newTask] };
        }
        return d;
      }),
    );
    setNewTaskInput("");
    setCursor(0);
  };

  const removeTask = (taskId: string) => {
    setWeeklySchedule((prev) =>
      prev.map((d) => {
        if (d.day === activeDayCode) {
          return { ...d, tasks: d.tasks.filter((t) => t.id !== taskId) };
        }
        return d;
      }),
    );
  };

  const updateMention = (newParams: string, closeDropdown: boolean = false) => {
    if (!activeDropdown) return;
    setWeeklySchedule((prev) =>
      prev.map((d) => {
        if (d.day !== activeDayCode) return d;
        return {
          ...d,
          tasks: d.tasks.map((t) => {
            if (t.id !== activeDropdown.taskId) return t;
            MENTION_REGEX.lastIndex = 0;
            let m;
            let newText = t.text;
            while ((m = MENTION_REGEX.exec(t.text)) !== null) {
              if (m.index === activeDropdown.matchIndex) {
                const before = t.text.slice(0, m.index);
                const after = t.text.slice(m.index + m[0].length);
                newText =
                  before + `@${activeDropdown.tool}(${newParams})` + after;
                break;
              }
            }
            return { ...t, text: newText };
          }),
        };
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

  const renderTaskText = (task: {
    id: string;
    text: string;
    completed: boolean;
  }) => {
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

      if (tool === "scale") Icon = Music;
      else if (tool === "chord") Icon = Hash;
      else if (tool === "timer") Icon = Clock;
      else if (tool === "custom") Icon = Tag;
      else if (tool === "tuning") Icon = Sliders;
      else if (tool === "key") Icon = Compass;
      else if (tool === "technique") Icon = Zap;
      else if (tool === "bpm") Icon = Gauge;
      else if (tool === "exercise") Icon = Target;

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
          title="Click to edit badge settings"
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

  // Calculate overall stats
  const totalWeekTargetMins = weeklySchedule.reduce(
    (acc, d) => acc + d.goalDurationMins,
    0,
  );
  const completedMins = weeklySchedule.reduce((acc, d) => {
    const completedTasksCount = d.tasks.filter((t) => t.completed).length;
    const totalTasksCount = d.tasks.length || 1;
    return (
      acc +
      Math.round((completedTasksCount / totalTasksCount) * d.goalDurationMins)
    );
  }, 0);
  const completionPercent =
    Math.round((completedMins / totalWeekTargetMins) * 100) || 58;

  const formatHoursMins = (mins: number) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${h}h ${m}m`;
  };

  return (
    <div className="space-y-6 pb-12 relative">
      {/* Top Banner: Weekly Schedule & Cadence */}
      <div className="bg-surface-container border border-outline-variant/30 rounded-xl p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 shadow-md">
        <div>
          <div className="flex items-center gap-2">
            <Calendar size={18} className="text-primary" />
            <h1 className="text-base font-bold font-mono uppercase tracking-wider text-on-surface">
              Weekly Schedule & Cadence
            </h1>
            <span className="text-xs text-on-surface-variant font-mono">
              • Select day to inspect and define routine
            </span>
          </div>
        </div>
        <div className="flex items-center gap-6 font-mono text-xs">
          <div className="text-on-surface-variant">
            Total Week Target:{" "}
            <strong className="text-on-surface font-bold">
              {formatHoursMins(totalWeekTargetMins)}
            </strong>
          </div>
          <div className="text-on-surface-variant">
            Completed:{" "}
            <strong className="text-primary font-bold">
              {formatHoursMins(completedMins)} ({completionPercent}%)
            </strong>
          </div>
        </div>
      </div>

      {/* 7 Day Cards Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        {weeklySchedule.map((day) => {
          const completedCount = day.tasks.filter((t) => t.completed).length;
          const totalCount = day.tasks.length;
          const pct =
            totalCount > 0
              ? Math.round((completedCount / totalCount) * 100)
              : 0;
          const isToday = day.day === getTodayCode();
          const isSelected = day.day === activeDayCode;

          return (
            <button
              key={day.day}
              onClick={() => setActiveDayCode(day.day)}
              className={`text-left p-3.5 rounded-xl border flex flex-col justify-between gap-3 relative transition-all cursor-pointer ${
                isSelected
                  ? "bg-surface-container-high border-primary ring-1 ring-primary shadow-md"
                  : "bg-surface-container-low border-outline-variant/30 hover:bg-surface-container hover:border-outline-variant"
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <span className="font-mono font-bold text-xs uppercase tracking-wider text-on-surface">
                  {day.day}
                </span>
                {isToday && (
                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-primary text-on-primary font-bold">
                    TODAY
                  </span>
                )}
                {!isToday && (
                  <div
                    className={`w-2 h-2 rounded-full ${pct === 100 ? "bg-primary" : pct > 0 ? "bg-on-surface-variant" : "bg-outline-variant"}`}
                  />
                )}
              </div>

              <div>
                <div className="font-mono text-sm font-bold text-on-surface">
                  {completedCount}/{totalCount}{" "}
                  <span className="text-[10px] font-normal text-on-surface-variant">
                    goals
                  </span>
                </div>
                <p className="text-[11px] text-on-surface-variant truncate mt-0.5 font-sans">
                  {day.focusTheme}
                </p>
              </div>

              <div className="w-full flex flex-col gap-1">
                <div className="flex items-center justify-between text-[10px] font-mono text-on-surface-variant">
                  <span>{pct}% complete</span>
                  <span>{day.goalDurationMins}m</span>
                </div>
                <div className="w-full h-1 bg-surface-container-highest rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all duration-300"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Two-Column Grid: Daily Practice Goals & Practice Tracker Timer */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Daily Practice Goals */}
        <div className="lg:col-span-7 bg-surface-container border border-outline-variant/30 rounded-xl p-5 shadow-md flex flex-col gap-4">
          <div className="flex items-center justify-between pb-3 border-b border-outline-variant/20">
            <div>
              <h2 className="text-sm font-bold font-mono uppercase tracking-wider text-on-surface flex items-center gap-2">
                <CheckCircle2 size={16} className="text-primary" /> Daily
                Practice Goals
              </h2>
              <p className="text-xs text-on-surface-variant font-mono mt-0.5">
                {activeDay.name} • Focus: {activeDay.focusTheme}
              </p>
            </div>
            <div className="bg-surface-container-high border border-outline-variant/40 px-3 py-1 rounded-lg text-xs font-mono font-bold text-primary">
              {Math.round(
                (activeDay.tasks.filter((t) => t.completed).length /
                  (activeDay.tasks.length || 1)) *
                  100,
              )}
              %
            </div>
          </div>

          {/* Tasks List */}
          <div className="flex flex-col gap-2.5 min-h-[300px] overflow-y-auto max-h-[360px] custom-scrollbar pr-1">
            {activeDay.tasks.length === 0 ? (
              <div className="text-center py-12 text-on-surface-variant text-sm font-mono">
                No goals defined for {activeDay.name}. Add one below or
                configure the blueprint.
              </div>
            ) : (
              activeDay.tasks.map((task) => {
                if (editingTaskId === task.id) {
                  return (
                    <InlineTaskRowEditor
                      key={task.id}
                      initialText={task.text}
                      onSave={(updatedText) => {
                        setWeeklySchedule((prev) =>
                          prev.map((d) => {
                            if (d.day === activeDayCode) {
                              return {
                                ...d,
                                tasks: d.tasks.map((t) =>
                                  t.id === task.id
                                    ? { ...t, text: updatedText }
                                    : t,
                                ),
                              };
                            }
                            return d;
                          }),
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
                    onClick={() => toggleTaskCompleted(task.id)}
                    className={`group flex items-start gap-3 p-3 rounded-lg border transition-all cursor-pointer ${
                      task.completed
                        ? "bg-surface-container-low/50 border-outline-variant/20 opacity-75"
                        : "bg-surface-container-low border-outline-variant/30 hover:border-primary/50"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleTaskCompleted(task.id);
                      }}
                      className="mt-0.5 text-on-surface-variant hover:text-primary transition-colors shrink-0"
                    >
                      {task.completed ? (
                        <CheckCircle2 size={18} className="text-primary" />
                      ) : (
                        <Circle size={18} />
                      )}
                    </button>
                    <div
                      className={`flex-1 text-sm font-mono leading-relaxed ${task.completed ? "line-through text-on-surface-variant" : "text-on-surface"}`}
                    >
                      {renderTaskText(task)}
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingTaskId(task.id);
                        }}
                        className="p-1 text-on-surface-variant hover:text-primary transition-colors"
                        title="Edit goal"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeTask(task.id);
                        }}
                        className="p-1 text-on-surface-variant hover:text-error transition-colors"
                        title="Delete goal"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Bottom Task Input Bar with Autocomplete */}
          <form
            onSubmit={addTask}
            className="mt-2 pt-3 border-t border-outline-variant/20 flex flex-col relative overflow-visible"
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

            <div className="flex items-center gap-2">
              <div className="relative flex-1 bg-surface-container-lowest border border-outline-variant/40 rounded-lg px-3 py-2 flex items-center overflow-hidden focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/50">
                <div
                  ref={backdropRef}
                  className="absolute inset-0 px-3 py-2 font-mono text-xs whitespace-pre overflow-hidden pointer-events-none text-transparent"
                >
                  {renderHighlights(newTaskInput)}
                </div>
                <input
                  ref={inputRef}
                  type="text"
                  value={newTaskInput}
                  onChange={handleInputChange}
                  onSelect={handleInputSelect}
                  onScroll={handleScroll}
                  onKeyUp={handleInputSelect}
                  onMouseUp={handleInputSelect}
                  onKeyDown={handleKeyDown}
                  placeholder="e.g. Practice @chord(G major) @scale(C major) @bpm(120) @timer(15m)..."
                  className="w-full bg-transparent font-mono text-xs text-on-surface outline-none relative z-10"
                  autoComplete="off"
                  spellCheck="false"
                />
              </div>
              <button
                type="submit"
                disabled={!newTaskInput.trim() || suggestions.length > 0}
                className="bg-primary text-on-primary w-10 h-10 rounded-lg flex items-center justify-center font-bold hover:scale-105 active:scale-95 transition-all shadow-md shrink-0 cursor-pointer disabled:opacity-50"
              >
                <Plus size={18} />
              </button>
            </div>
          </form>
          <div className="text-[10px] text-on-surface-variant font-mono text-center">
            Type <strong className="text-primary">@</strong> for tags (custom,
            tuning, scale, chord, bpm, timer...)
          </div>
        </div>

        {/* Right Column: Practice Stopwatch Timer & Active Day Summary */}
        <div className="lg:col-span-5 flex flex-col gap-5">
          <SessionWidget
            streak={streakData}
            activeSessionDuration={activeSessionDuration}
            isSessionActive={isSessionActive}
            onToggleSession={onToggleSession}
            onEndSession={onEndSession}
            currentScaleName={activeDay.focusTheme}
            highestBpmSession={activeDay.defaultBpm}
          />

          <div className="bg-surface-container border border-outline-variant/30 rounded-xl p-5 shadow-md flex flex-col gap-3">
            <div className="flex items-center justify-between pb-2 border-b border-outline-variant/20">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-on-surface">
                Active Day Progress
              </span>
              <span className="text-xs font-mono text-primary font-bold">
                {activeDay.tasks.filter((t) => t.completed).length}/
                {activeDay.tasks.length} goals
              </span>
            </div>
            <div className="flex flex-col gap-1 text-xs font-mono text-on-surface-variant">
              <div className="flex justify-between">
                <span>Focus:</span>
                <span className="text-on-surface font-semibold">
                  {activeDay.focusTheme}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Target Duration:</span>
                <span className="text-on-surface font-semibold">
                  {activeDay.goalDurationMins} minutes
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

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
