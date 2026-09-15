import React, { useState, useRef, useEffect } from "react";
import { CircleOfFifths } from "../components/CircleOfFifths";
import { CustomChordEditor } from "../components/CustomChordEditor";
import { Metronome } from "../components/Metronome";
import { TimerView } from "../components/TimerView";
import { GUITAR_TUNINGS } from "../data/musicTheory";
import { audioEngine } from "../lib/audio";
import { AppSettings } from "../types";
import { useTimer } from "../lib/useTimer";
import {
  Compass,
  Volume2,
  Sparkles,
  Radio,
  CheckCircle,
  XCircle,
  Clock,
  TimerReset,
  ChevronDown,
  Check,
  Wrench,
} from "lucide-react";

interface ToolsPageProps {
  metronomeBpm: number;
  onBpmChange: (bpm: number) => void;
  onLogBpm: (bpm: number) => void;
  settings: AppSettings;
  onUpdateSettings: (settings: Partial<AppSettings>) => void;
  timer: ReturnType<typeof useTimer>;
  metronomeIsPlaying?: boolean;
  onMetronomePlayingChange?: (playing: boolean) => void;
  metronomeBarCycleMode?: boolean;
  onBarCycleModeChange?: (enabled: boolean) => void;
}

export const ToolsPage: React.FC<ToolsPageProps> = ({
  metronomeBpm,
  onBpmChange,
  onLogBpm,
  settings,
  onUpdateSettings,
  timer,
  metronomeIsPlaying,
  onMetronomePlayingChange,
  metronomeBarCycleMode,
  onBarCycleModeChange,
}) => {
  const [activeTool, setActiveTool] = useState<
    "timer" | "metronome" | "circle" | "tuner" | "ear" | "custom-chord"
  >("circle");
  const [selectedTuning, setSelectedTuning] = useState(GUITAR_TUNINGS[0]);
  const [isToolMenuOpen, setIsToolMenuOpen] = useState(false);
  const toolMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        toolMenuRef.current &&
        !toolMenuRef.current.contains(event.target as Node)
      ) {
        setIsToolMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Ear training game state
  const [earInterval, setEarInterval] = useState<{
    name: string;
    semitones: number;
  } | null>(null);
  const [earAnswerState, setEarAnswerState] = useState<
    "idle" | "correct" | "wrong"
  >("idle");

  const intervalsList = [
    { name: "Minor 2nd (Half Step)", semitones: 1 },
    { name: "Major 2nd (Whole Step)", semitones: 2 },
    { name: "Minor 3rd", semitones: 3 },
    { name: "Major 3rd", semitones: 4 },
    { name: "Perfect 4th", semitones: 5 },
    { name: "Tritone / Diminished 5th", semitones: 6 },
    { name: "Perfect 5th", semitones: 7 },
    { name: "Minor 6th", semitones: 8 },
    { name: "Major 6th", semitones: 9 },
    { name: "Minor 7th", semitones: 10 },
    { name: "Major 7th", semitones: 11 },
    { name: "Octave (Perfect 8th)", semitones: 12 },
  ];

  const startNewEarChallenge = () => {
    const chosen =
      intervalsList[Math.floor(Math.random() * intervalsList.length)];
    setEarInterval(chosen);
    setEarAnswerState("idle");
    playIntervalAudio(chosen.semitones);
  };

  const playIntervalAudio = (semitones: number) => {
    // Root C4
    audioEngine.playPianoNote("C", 4, 1.8, 0);
    // Interval note
    const targetSemitone = 0 + semitones;
    const targetOctave = 4 + Math.floor(targetSemitone / 12);
    const noteNames = [
      "C",
      "C#",
      "D",
      "D#",
      "E",
      "F",
      "F#",
      "G",
      "G#",
      "A",
      "A#",
      "B",
    ];
    const targetNote = noteNames[targetSemitone % 12];
    audioEngine.playPianoNote(targetNote, targetOctave, 1.8, 0.6);
  };

  const handleEarGuess = (guessSemitones: number) => {
    if (!earInterval) return;
    if (guessSemitones === earInterval.semitones) {
      setEarAnswerState("correct");
    } else {
      setEarAnswerState("wrong");
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header & Sub-tool Navigation Tabs */}
      <div data-tour="tools-tabs" className="bg-surface-container border border-outline-variant/30 rounded-lg p-6 flex flex-col gap-4 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-outline-variant/10">
          <div>
            <h1 className="font-mono text-base font-bold tracking-[0.2em] text-on-surface uppercase flex items-center gap-2">
              <Compass size={18} className="text-primary" />
              Music Theory & Ear Tools
            </h1>
          </div>

          <div className="relative w-full sm:w-auto" ref={toolMenuRef}>
            {/* Mobile Dropdown Button */}
            <div className="sm:hidden w-full">
              <button
                type="button"
                onClick={() => setIsToolMenuOpen((prev) => !prev)}
                className="w-full flex items-center justify-between bg-surface-container-low border border-outline-variant/30 rounded-lg px-4 py-3 text-sm font-mono text-on-surface focus:outline-none focus:border-primary transition-colors"
              >
                <span className="font-bold">
                  {activeTool === "circle" && "Circle of Fifths"}
                  {activeTool === "timer" && "Practice Timer"}
                  {activeTool === "metronome" && "Metronome"}
                  {activeTool === "tuner" && "Pitch Reference Tuner"}
                  {activeTool === "ear" && "Interval Ear Trainer"}
                  {activeTool === "custom-chord" && "Custom Chord Builder"}
                </span>
                <ChevronDown size={18} className={`text-on-surface-variant transition-transform duration-200 ${isToolMenuOpen ? "rotate-180" : ""}`} />
              </button>

              {/* Mobile Dropdown Menu */}
              {isToolMenuOpen && (
                <div className="absolute top-full left-0 right-0 mt-2 z-50 bg-surface border border-outline-variant/40 rounded-xl p-2 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
                  <div className="flex flex-col gap-1">
                    {[
                      { id: "circle", label: "Circle of Fifths", desc: "Explore key signatures & harmony", icon: Compass },
                      { id: "timer", label: "Practice Timer", desc: "Track your daily practice sessions", icon: Clock },
                      { id: "metronome", label: "Metronome", desc: "Precision tempo and timing practice", icon: TimerReset },
                      { id: "tuner", label: "Pitch Reference Tuner", desc: "Acoustic guitar pitch references", icon: Radio },
                      { id: "ear", label: "Interval Ear Trainer", desc: "Recognize musical intervals by ear", icon: Sparkles },
                      { id: "custom-chord", label: "Custom Chord Builder", desc: "Create & visualize chord shapes", icon: Wrench },
                    ].map((tool) => {
                      const isSelected = activeTool === tool.id;
                      const Icon = tool.icon;
                      return (
                        <button
                          key={tool.id}
                          onClick={() => {
                            setActiveTool(tool.id as any);
                            setIsToolMenuOpen(false);
                            if (tool.id === "ear" && !earInterval) startNewEarChallenge();
                          }}
                          className={`w-full flex items-center justify-between p-3 rounded-lg text-left transition-all ${
                            isSelected
                              ? "bg-primary/15 text-primary font-bold border border-primary/40"
                              : "hover:bg-surface-container-high text-on-surface"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-md ${isSelected ? "bg-primary/20 text-primary" : "bg-surface-container text-on-surface-variant"}`}>
                              <Icon size={16} />
                            </div>
                            <div className="flex flex-col">
                              <span className="font-mono text-sm">{tool.label}</span>
                              <span className="text-[10px] font-mono opacity-70">{tool.desc}</span>
                            </div>
                          </div>
                          {isSelected && <Check size={16} className="text-primary shrink-0 ml-2" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Desktop Navigation Tabs */}
            <div className="hidden sm:flex items-center gap-1.5 bg-surface-container-low p-1 rounded-lg border border-outline-variant/30 flex-wrap">
              <button
                onClick={() => setActiveTool("circle")}
                className={`px-3.5 py-1.5 rounded text-xs font-mono transition-all ${
                  activeTool === "circle"
                    ? "bg-primary text-on-primary font-bold shadow"
                    : "text-on-surface-variant hover:text-on-surface"
                }`}
              >
                Circle of Fifths
              </button>
              <button
                onClick={() => setActiveTool("timer")}
                className={`px-3.5 py-1.5 rounded text-xs font-mono transition-all flex items-center gap-1.5 ${
                  activeTool === "timer"
                    ? "bg-primary text-on-primary font-bold shadow"
                    : "text-on-surface-variant hover:text-on-surface"
                }`}
              >
                Practice Timer
              </button>

              <button
                onClick={() => setActiveTool("metronome")}
                className={`px-3.5 py-1.5 rounded text-xs font-mono transition-all ${
                  activeTool === "metronome"
                    ? "bg-primary text-on-primary font-bold shadow"
                    : "text-on-surface-variant hover:text-on-surface"
                }`}
              >
                Metronome
              </button>
              <button
                onClick={() => setActiveTool("tuner")}
                className={`px-3.5 py-1.5 rounded text-xs font-mono transition-all ${
                  activeTool === "tuner"
                    ? "bg-primary text-on-primary font-bold shadow"
                    : "text-on-surface-variant hover:text-on-surface"
                }`}
              >
                Pitch Reference Tuner
              </button>
              <button
                onClick={() => {
                  setActiveTool("ear");
                  if (!earInterval) startNewEarChallenge();
                }}
                className={`px-3.5 py-1.5 rounded text-xs font-mono transition-all ${
                  activeTool === "ear"
                    ? "bg-primary text-on-primary font-bold shadow"
                    : "text-on-surface-variant hover:text-on-surface"
                }`}
              >
                Interval Ear Trainer
              </button>
              <button
                onClick={() => setActiveTool("custom-chord")}
                className={`px-3.5 py-1.5 rounded text-xs font-mono transition-all ${
                  activeTool === "custom-chord"
                    ? "bg-primary text-on-primary font-bold shadow"
                    : "text-on-surface-variant hover:text-on-surface"
                }`}
              >
                Custom Chord Builder
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Practice Timer View */}
      {activeTool === "timer" && (
        <TimerView
          timer={timer}
          settings={settings}
          onUpdateSettings={onUpdateSettings}
        />
      )}

      {/* Metronome Tool */}
      {activeTool === "metronome" && (
        <div className="grid grid-cols-1 xl:grid-cols-[1.4fr_1fr] gap-6">
          <div className="bg-surface-container border border-outline-variant/30 rounded-lg p-4 shadow-xl">
            <div className="mb-3 flex items-center gap-2">
              <TimerReset size={16} className="text-primary" />
              <h2 className="font-mono text-base font-bold tracking-[0.15em] text-on-surface uppercase">
                Precision Metronome
              </h2>
            </div>
            <Metronome
              bpm={metronomeBpm}
              onBpmChange={onBpmChange}
              onLogBpmToSession={onLogBpm}
              settings={settings}
              isPlaying={metronomeIsPlaying}
              onIsPlayingChange={onMetronomePlayingChange}
              barCycleMode={metronomeBarCycleMode}
              onBarCycleModeChange={onBarCycleModeChange}
            />
          </div>

          <div className="bg-surface-container border border-outline-variant/30 rounded-lg p-6 shadow-xl space-y-4">
            <h3 className="font-mono text-xs font-bold tracking-[0.2em] text-on-surface uppercase">
              Practice Guide
            </h3>
            <div className="space-y-3 text-sm text-on-surface-variant">
              <p>
                Use this metronome to lock tempo before scale work, chord
                changes, and speed drills.
              </p>
              <p>
                Set the subdivision to match the pulse you want to feel in the
                hands, then use tap tempo to find a natural starting speed.
              </p>
              <p>
                For tempo training, start around 60-80 BPM and increase
                gradually while keeping clean articulation.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Circle of Fifths Tool */}
      {activeTool === "circle" && (
        <div data-tour="circle-of-fifths">
          <CircleOfFifths />
        </div>
      )}

      {/* Custom Chord Builder */}
      {activeTool === "custom-chord" && (
        <CustomChordEditor defaultInstrument={settings.defaultInstrument} />
      )}

      {/* Pitch Reference Tuner */}
      {activeTool === "tuner" && (
        <div className="bg-surface-container border border-outline-variant/30 rounded-lg p-6 shadow-xl space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-outline-variant/10">
            <div>
              <h2 className="font-mono text-base font-bold text-on-surface uppercase flex items-center gap-2">
                <Radio size={16} className="text-primary" />
                Acoustic Guitar Pitch Reference
              </h2>
              <p className="text-xs text-on-surface-variant mt-1">
                Audition precise reference frequencies (A4 = 440Hz standard)
              </p>
            </div>

            {/* Tuning Selector */}
            <select
              value={selectedTuning.name}
              onChange={(e) => {
                const found = GUITAR_TUNINGS.find(
                  (t) => t.name === e.target.value,
                );
                if (found) setSelectedTuning(found);
              }}
              className="bg-surface-container-low border border-outline-variant/30 rounded px-3 py-1.5 text-xs font-mono text-on-surface focus:outline-none focus:border-primary cursor-pointer"
            >
              {GUITAR_TUNINGS.map((t) => (
                <option key={t.name} value={t.name}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {selectedTuning.strings.map((strNote, idx) => {
              const oct = selectedTuning.octaves[idx];
              const stringNum = 6 - idx; // 6th string to 1st string

              return (
                <div
                  key={idx}
                  onClick={() => audioEngine.playGuitarPluck(strNote, oct, 3.0)}
                  className="bg-surface-container-low hover:bg-surface-container border border-outline-variant/10 hover:border-primary rounded-xl p-5 flex flex-col items-center gap-2 cursor-pointer transition-all shadow group active:scale-95"
                >
                  <span className="text-[10px] font-mono text-on-surface-variant uppercase tracking-wider">
                    String {stringNum}
                  </span>
                  <span className="font-mono text-3xl font-bold text-on-surface group-hover:text-primary">
                    {strNote}
                    <span className="text-xs font-normal opacity-50 ml-1">
                      {oct}
                    </span>
                  </span>
                  <button className="flex items-center gap-1 text-[10px] font-mono text-primary bg-primary/10 px-2.5 py-1 rounded mt-2">
                    <Volume2 size={12} />
                    <span>PLUCK</span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Interval Ear Trainer */}
      {activeTool === "ear" && (
        <div className="bg-surface-container border border-outline-variant/30 rounded-lg p-6 shadow-xl space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-outline-variant/10">
            <div>
              <h2 className="font-mono text-base font-bold text-on-surface uppercase flex items-center gap-2">
                <Sparkles size={16} className="text-primary" />
                Interval Recognition Quiz
              </h2>
              <p className="text-xs text-on-surface-variant mt-1">
                Listen to the ascending two-note interval and identify the
                musical distance
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() =>
                  earInterval && playIntervalAudio(earInterval.semitones)
                }
                className="flex items-center gap-1.5 bg-surface-container-low hover:bg-surface-container border border-outline-variant/30 text-on-surface px-3.5 py-2 rounded text-xs font-mono transition-all"
              >
                <Volume2 size={14} className="text-primary" />
                <span>REPLAY AUDIO</span>
              </button>

              <button
                onClick={startNewEarChallenge}
                className="bg-primary hover:bg-primary-container text-on-primary px-4 py-2 rounded text-xs font-mono font-bold transition-all"
              >
                NEW INTERVAL
              </button>
            </div>
          </div>

          {/* Feedback Status */}
          {earAnswerState !== "idle" && (
            <div
              className={`p-4 rounded-lg flex items-center gap-3 border ${
                earAnswerState === "correct"
                  ? "bg-tertiary/10 border-tertiary/30 text-tertiary"
                  : "bg-error/10 border-error/30 text-error"
              }`}
            >
              {earAnswerState === "correct" ? (
                <CheckCircle size={20} />
              ) : (
                <XCircle size={20} />
              )}
              <div>
                <span className="font-mono text-sm font-bold block">
                  {earAnswerState === "correct"
                    ? `Correct! That was a ${earInterval?.name}`
                    : `Incorrect. The interval was ${earInterval?.name}. Try another!`}
                </span>
              </div>
            </div>
          )}

          {/* Answer Options Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {intervalsList.map((item) => (
              <button
                key={item.semitones}
                onClick={() => handleEarGuess(item.semitones)}
                className="p-3.5 rounded-lg bg-surface-container-low hover:bg-surface-container border border-outline-variant/10 hover:border-primary text-left font-mono text-xs text-on-surface transition-all flex items-center justify-between"
              >
                <span>{item.name}</span>
                <span className="text-[10px] text-on-surface-variant">
                  +{item.semitones} st
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
