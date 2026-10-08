import React, { useState, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Play,
  Pause,
  Square,
  Plus,
  RotateCcw,
  X,
  Edit2,
  Check,
  Clock,
} from "lucide-react";
import { useTimer } from "../lib/useTimer";
import { AppSettings } from "../types";

interface TimerViewProps {
  timer: ReturnType<typeof useTimer>;
  settings: AppSettings;
  onUpdateSettings: (settings: Partial<AppSettings>) => void;
}

const formatTime = (seconds: number) => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
};

export const TimerView: React.FC<TimerViewProps> = ({
  timer,
  settings,
  onUpdateSettings,
}) => {
  const { status, remaining, duration, start, pause, resume, reset, cancel } =
    timer;
  const progress = duration > 0 ? Math.max(0, remaining) / duration : 1;

  const [customMin, setCustomMin] = useState("10");
  const [customSec, setCustomSec] = useState("00");
  const [isEditing, setIsEditing] = useState(false);
  const [newPresetInput, setNewPresetInput] = useState("");

  const minInputRef = useRef<HTMLInputElement>(null);
  const secInputRef = useRef<HTMLInputElement>(null);

  const handleMinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const clean = e.target.value.replace(/\D/g, "").slice(-2);
    setCustomMin(clean);
    if (clean.length === 2) {
      secInputRef.current?.focus();
      secInputRef.current?.select();
    }
  };

  const handleSecChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const clean = e.target.value.replace(/\D/g, "").slice(-2);
    setCustomSec(clean);
  };

  const handleSecKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && customSec === "") {
      minInputRef.current?.focus();
      minInputRef.current?.select();
    }
  };

  const requestNotify = () => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  };

  const handleStart = (seconds: number) => {
    requestNotify();
    start(seconds);
  };

  const handleCustomStart = (e: React.FormEvent) => {
    e.preventDefault();
    const m = parseInt(customMin) || 0;
    const s = parseInt(customSec) || 0;
    const total = m * 60 + s;
    if (total > 0) handleStart(total);
  };

  const handleRemovePreset = (preset: number) => {
    const target = Math.round(preset);
    const updated = settings.timerPresets.filter(
      (p) => Math.round(p) !== target,
    );
    onUpdateSettings({ timerPresets: updated });
  };

  const handleAddPreset = () => {
    const m = parseInt(customMin) || 0;
    const s = parseInt(customSec) || 0;
    const totalMin = Math.max(1, Math.round(m + s / 60));
    const cleanPresets = Array.from(
      new Set<number>(settings.timerPresets.map((p) => Math.round(p))),
    );
    if (totalMin > 0 && !cleanPresets.includes(totalMin)) {
      const updated = [...cleanPresets, totalMin].sort(
        (a: number, b: number) => a - b,
      );
      onUpdateSettings({ timerPresets: updated });
    }
  };

  const handleAddCustomPreset = (e?: React.FormEvent) => {
    e?.preventDefault();
    const val = parseInt(newPresetInput);
    if (val > 0) {
      const cleanPresets = Array.from(
        new Set<number>(settings.timerPresets.map((p) => Math.round(p))),
      );
      if (!cleanPresets.includes(val)) {
        const updated = [...cleanPresets, val].sort(
          (a: number, b: number) => a - b,
        );
        onUpdateSettings({ timerPresets: updated });
      }
      setNewPresetInput("");
    }
  };

  const handleRestoreDefaults = () => {
    onUpdateSettings({ timerPresets: [3, 5, 10, 30] });
  };

  // Math for the perfect corner-to-corner flat arch
  const w = 1000;
  const cx = 500;
  const r = 550;
  const cy = 600;
  const h = 370.87;

  const startAngle = Math.atan2(h - cy, 0 - cx);
  const endAngle = Math.atan2(h - cy, w - cx);
  const sweep = endAngle - startAngle;

  const strokeWidth = 54;

  const renderTicks = () => {
    const ticks = [];
    const numTicks = 80;
    for (let i = 0; i <= numTicks; i++) {
      const p = i / numTicks;
      const angle = startAngle + sweep * p;

      const isMajor = i % 5 === 0;
      const tickLength = isMajor ? 12 : 6;
      // Position ticks OUTSIDE the track
      const offset = strokeWidth / 2 + 15;

      const x1 = cx + (r + offset) * Math.cos(angle);
      const y1 = cy + (r + offset) * Math.sin(angle);
      const x2 = cx + (r + offset + tickLength) * Math.cos(angle);
      const y2 = cy + (r + offset + tickLength) * Math.sin(angle);

      // Fade out ticks near the very edges for a polished look
      const distanceToCenter = Math.abs(p - 0.5) * 2;
      const opacity = Math.max(0, 1 - Math.pow(distanceToCenter, 4));

      ticks.push(
        <line
          key={i}
          x1={x1}
          y1={y1}
          x2={x2}
          y2={y2}
          stroke="currentColor"
          strokeWidth={isMajor ? 2 : 1}
          className="text-on-surface"
          style={{ opacity: opacity * 0.4 }}
        />,
      );
    }
    return ticks;
  };

  const currentAngle = startAngle + sweep * progress;

  return (
    <div className="bg-surface-container border border-outline-variant/30 rounded-xl p-4 sm:p-6 shadow-xl space-y-6">
      {/* Practice Timer Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-outline-variant/10">
        <div>
          <h2 className="font-mono text-base font-bold tracking-[0.12em] text-on-surface uppercase flex items-center gap-2">
            <Clock size={16} className="text-primary" />
            Practice Timer
          </h2>
          <p className="text-xs text-on-surface-variant mt-1">
            Focus on your technique for a specific duration
          </p>
        </div>
      </div>

      {/* Main Timer Display */}
      <div className="flex flex-col items-center justify-center bg-transparent relative overflow-hidden group transition-all duration-500 rounded-xl">
        {/* Subtle grid background */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
            backgroundPosition: "center bottom",
          }}
        ></div>

        {/* The Arch */}
        <div className="relative w-full flex flex-col items-center justify-end z-10 pt-16">
          <svg
            className="w-full h-auto block"
            viewBox={`0 -40 ${w} ${h + 40}`}
            preserveAspectRatio="xMidYMax meet"
          >
            <defs>
              <linearGradient id="timerGlow" x1="0" y1="0" x2="1" y2="0">
                <stop
                  offset="0%"
                  stopColor="var(--color-primary-container, #4d8eff)"
                  stopOpacity="1"
                />
                <stop
                  offset="50%"
                  stopColor="var(--color-primary-fixed, #d8e2ff)"
                  stopOpacity="1"
                />
                <stop
                  offset="100%"
                  stopColor="var(--color-primary-container, #4d8eff)"
                  stopOpacity="1"
                />
              </linearGradient>
              <filter
                id="heavyGlow"
                x="-20%"
                y="-20%"
                width="140%"
                height="140%"
              >
                <feGaussianBlur stdDeviation="16" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>

            {/* Ticks */}
            {renderTicks()}

            {/* Background Empty Track */}
            <path
              d={`M 0 ${h} A ${r} ${r} 0 0 1 ${w} ${h}`}
              fill="transparent"
              stroke="var(--color-surface-container-highest)"
              strokeWidth={strokeWidth}
              strokeLinecap="butt"
            />

            {/* Foreground Filled Track */}
            <motion.path
              d={`M 0 ${h} A ${r} ${r} 0 0 1 ${w} ${h}`}
              fill="transparent"
              stroke="url(#timerGlow)"
              strokeWidth={strokeWidth}
              strokeLinecap="butt"
              filter="url(#heavyGlow)"
              pathLength={1000}
              strokeDasharray={1000}
              animate={{ strokeDashoffset: 1000 * (1 - progress) }}
              transition={{ ease: "linear", duration: 0.2 }}
            />

            {/* Bright tip marker */}
            <motion.line
              stroke="#ffffff"
              strokeWidth="6"
              strokeLinecap="round"
              animate={{
                x1: cx + (r - strokeWidth / 2 - 4) * Math.cos(currentAngle),
                y1: cy + (r - strokeWidth / 2 - 4) * Math.sin(currentAngle),
                x2: cx + (r + strokeWidth / 2 + 4) * Math.cos(currentAngle),
                y2: cy + (r + strokeWidth / 2 + 4) * Math.sin(currentAngle),
              }}
              transition={{ ease: "linear", duration: 0.2 }}
              style={{
                opacity: status !== "idle" ? 1 : 0,
                filter: "drop-shadow(0 0 8px rgba(255,255,255,0.9))",
              }}
            />
          </svg>

          <div className="absolute bottom-0 sm:bottom-4 flex flex-col items-center justify-end w-full pointer-events-auto">
            <div className="text-[11px] sm:text-[14px] font-sans text-on-surface-variant mb-1 sm:mb-2 opacity-90 tracking-widest uppercase">
              {status === "running"
                ? "Flow time"
                : status === "finished"
                  ? "Complete"
                  : "Timer"}
            </div>
            <div className="h-[clamp(2.75rem,13vw,12rem)] w-full flex items-center justify-center">
              {status === "idle" ? (
                <form
                  onSubmit={handleCustomStart}
                  className="font-mono font-medium text-[clamp(2.75rem,13vw,12rem)] leading-none tracking-tighter text-on-surface drop-shadow-2xl flex flex-nowrap items-center justify-center -translate-y-1 sm:-translate-y-4 z-30"
                  style={{ fontVariantNumeric: "tabular-nums" }}
                >
                  <input
                    ref={minInputRef}
                    type="text"
                    maxLength={2}
                    value={customMin}
                    onChange={handleMinChange}
                    onBlur={() => setCustomMin((prev) => prev.padStart(2, "0"))}
                    onFocus={(e) => e.target.select()}
                    className="bg-transparent text-center outline-none w-[1.15em] placeholder-on-surface/20 transition-colors hover:bg-on-surface/5 focus:bg-primary/20 selection:bg-transparent rounded-3xl cursor-text"
                    placeholder="00"
                  />
                  <span className="relative -top-0.5 opacity-80 pb-1 sm:pb-2 mx-1 sm:mx-3 pointer-events-none shrink-0">
                    :
                  </span>
                  <input
                    ref={secInputRef}
                    type="text"
                    maxLength={2}
                    value={customSec}
                    onChange={handleSecChange}
                    onKeyDown={handleSecKeyDown}
                    onBlur={() => setCustomSec((prev) => prev.padStart(2, "0"))}
                    onFocus={(e) => e.target.select()}
                    className="bg-transparent text-center outline-none w-[1.15em] placeholder-on-surface/20 transition-colors hover:bg-on-surface/5 focus:bg-primary/20 selection:bg-transparent rounded-3xl cursor-text"
                    placeholder="00"
                  />
                  <button type="submit" className="hidden" />
                </form>
              ) : (
                <div
                  className="font-mono font-medium text-[clamp(2.75rem,13vw,12rem)] leading-none tracking-tighter text-on-surface drop-shadow-2xl pointer-events-none flex flex-nowrap items-center justify-center z-30"
                  style={{ fontVariantNumeric: "tabular-nums" }}
                >
                  <div className="w-[1.15em] text-right relative flex justify-end">
                    {status === "finished" && (
                      <span className="absolute right-full mr-3 sm:mr-6 top-0 bottom-0 flex items-center text-red-400 opacity-90 select-none">
                        -
                      </span>
                    )}
                    {status === "finished"
                      ? Math.floor(Math.abs(remaining) / 60)
                          .toString()
                          .padStart(2, "0")
                      : Math.floor(remaining / 60)
                          .toString()
                          .padStart(2, "0")}
                  </div>
                  <span className="relative -top-0.5 opacity-80 pb-1 sm:pb-2 mx-1 sm:mx-3 shrink-0">
                    :
                  </span>
                  <div className="w-[1.15em] text-left">
                    {status === "finished"
                      ? (Math.abs(remaining) % 60).toString().padStart(2, "0")
                      : (remaining % 60).toString().padStart(2, "0")}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Hover Controls */}
        <div className="absolute top-6 sm:top-10 left-0 right-0 flex justify-center gap-4 sm:gap-6 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-20">
          {status === "idle" ? (
            <>
              <button
                onClick={(e) => handleCustomStart(e as any)}
                className="p-3 sm:px-5 sm:py-2.5 bg-primary/20 hover:bg-primary/40 border border-primary/30 rounded-full text-primary backdrop-blur-md text-sm font-mono flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-lg"
                title="Start"
              >
                <Play size={16} fill="currentColor" />{" "}
                <span className="hidden sm:inline">Start</span>
              </button>
              <button
                onClick={handleAddPreset}
                className="p-3 sm:px-5 sm:py-2.5 bg-surface-container-highest hover:bg-surface-container-highest/80 border border-outline-variant/30 rounded-full text-on-surface backdrop-blur-md text-sm font-mono flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-lg"
                title="Save as Preset"
              >
                <Plus size={16} />{" "}
                <span className="hidden sm:inline">Save</span>
              </button>
            </>
          ) : status !== "finished" ? (
            <>
              <button
                onClick={status === "running" ? pause : resume}
                className="p-3 sm:px-5 sm:py-2.5 bg-on-surface/10 hover:bg-on-surface/20 rounded-full text-on-surface backdrop-blur-md text-sm font-mono flex items-center justify-center gap-2 transition-colors border border-on-surface/10 cursor-pointer shadow-lg"
                title={status === "running" ? "Pause" : "Resume"}
              >
                {status === "running" ? (
                  <Pause size={16} fill="currentColor" />
                ) : (
                  <Play size={16} fill="currentColor" />
                )}
                <span className="hidden sm:inline">
                  {status === "running" ? "Pause" : "Resume"}
                </span>
              </button>
              <button
                onClick={reset}
                className="p-3 sm:px-5 sm:py-2.5 bg-surface-container-highest hover:bg-surface-container-highest/80 border border-outline-variant/30 rounded-full text-on-surface backdrop-blur-md text-sm font-mono flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-lg"
                title="Stop"
              >
                <Square size={16} />{" "}
                <span className="hidden sm:inline">Stop</span>
              </button>
            </>
          ) : (
            <>
              <button
                onClick={reset}
                title="Acknowledge"
                className="p-3 sm:px-5 sm:py-2.5 bg-surface-container-highest hover:bg-surface-container-highest/80 border border-outline-variant/30 rounded-full text-on-surface backdrop-blur-md text-sm font-mono flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-lg"
              >
                <Check size={16} />{" "}
                <span className="hidden sm:inline">Acknowledge</span>
              </button>
              <button
                onClick={() => start(duration)}
                title="Restart"
                className="p-3 sm:px-5 sm:py-2.5 bg-primary/20 hover:bg-primary/40 border border-primary/30 rounded-full text-primary backdrop-blur-md text-sm font-mono flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-lg"
              >
                <RotateCcw size={16} />{" "}
                <span className="hidden sm:inline">Restart</span>
              </button>
            </>
          )}
        </div>

        {/* Bottom edge glow */}
        <div className="absolute bottom-0 w-full h-1 bg-gradient-to-r from-transparent via-primary/30 to-transparent z-10"></div>
        <div className="absolute bottom-0 w-full h-24 bg-primary/10 blur-[50px] rounded-full z-0 pointer-events-none"></div>
      </div>

      {/* Presets */}
      <div className="w-full max-w-2xl mx-auto flex flex-col items-center">
        <div className="w-full space-y-8 py-4">
          {/* Presets */}
          <div className="flex flex-col items-center">
            <div className="flex items-center gap-4 mb-4">
              <span className="text-xs font-mono text-on-surface-variant uppercase font-bold tracking-wider">
                Presets
              </span>
              <button
                onClick={() => setIsEditing(!isEditing)}
                className="text-[11px] text-primary flex items-center gap-1 hover:underline"
              >
                <Edit2 size={12} /> {isEditing ? "Done" : "Edit"}
              </button>
            </div>
            <div className="flex flex-wrap justify-center gap-3">
              {settings.timerPresets.map((rawPreset) => {
                const preset = Math.max(1, Math.round(rawPreset));
                return (
                  <div key={preset} className="relative group">
                    <button
                      onClick={() => !isEditing && handleStart(preset * 60)}
                      className={`px-6 py-3 border rounded-xl text-lg font-mono font-bold transition-all active:scale-95 shadow-sm ${
                        isEditing
                          ? "bg-surface-container-high border-outline-variant/30 text-on-surface-variant cursor-default"
                          : "bg-surface-container hover:bg-surface-container-highest border-outline-variant/30 hover:border-outline-variant/50 text-on-surface shadow-lg"
                      }`}
                    >
                      {preset}m
                    </button>
                    {isEditing && (
                      <button
                        onClick={() => handleRemovePreset(preset)}
                        className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 shadow-md"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
            {isEditing && (
              <div className="mt-5 flex flex-col items-center gap-3">
                <form
                  onSubmit={handleAddCustomPreset}
                  className="flex items-center gap-2"
                >
                  <input
                    type="text"
                    maxLength={3}
                    placeholder="e.g. 25"
                    value={newPresetInput}
                    onChange={(e) =>
                      setNewPresetInput(e.target.value.replace(/\D/g, ""))
                    }
                    className="w-20 px-3 py-1.5 text-sm font-mono bg-surface-container-low border border-outline-variant/30 rounded-lg text-on-surface text-center outline-none focus:border-primary"
                  />
                  <span className="text-xs font-mono text-on-surface-variant">
                    min
                  </span>
                  <button
                    type="submit"
                    disabled={!newPresetInput || parseInt(newPresetInput) <= 0}
                    className="px-3.5 py-1.5 bg-primary text-on-primary rounded-lg text-xs font-mono font-bold hover:bg-primary/90 disabled:opacity-40 transition-all flex items-center gap-1 shadow-sm"
                  >
                    <Plus size={14} /> Add Preset
                  </button>
                </form>
                <button
                  onClick={handleRestoreDefaults}
                  className="text-[11px] font-mono text-on-surface-variant hover:text-on-surface underline"
                >
                  Restore Defaults
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
