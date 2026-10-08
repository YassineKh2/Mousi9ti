import React, { useState, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Play,
  Pause,
  Square,
  RotateCcw,
  X,
  Edit2,
  Check,
  Plus,
  Timer as TimerIcon,
} from "lucide-react";
import { useTimer } from "../lib/useTimer";
import { AppSettings } from "../types";

interface TimerWidgetProps {
  timer: ReturnType<typeof useTimer>;
  settings?: AppSettings;
  onUpdateSettings?: (settings: Partial<AppSettings>) => void;
  desktopValuePlacement?: "above" | "above-4" | "below";
}

const formatTime = (seconds: number) => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
};

export const TimerWidget: React.FC<TimerWidgetProps> = ({
  timer,
  settings,
  onUpdateSettings,
  desktopValuePlacement = "above",
}) => {
  const { status, remaining, duration, start, pause, resume, reset, cancel } =
    timer;
  const progress = duration > 0 ? Math.max(0, remaining) / duration : 1;

  const [customMin, setCustomMin] = useState("05");
  const [customSec, setCustomSec] = useState("00");
  const [isEditing, setIsEditing] = useState(false);

  const minInputRef = useRef<HTMLInputElement>(null);
  const secInputRef = useRef<HTMLInputElement>(null);

  const presets = (
    settings?.timerPresets && settings.timerPresets.length > 0
      ? settings.timerPresets
      : [3, 5, 10, 30]
  ).map((p) => Math.max(1, Math.round(p)));

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

  const handleStart = (presetMinutes: number) => {
    requestNotify();
    start(presetMinutes * 60);
  };

  const handleCustomStart = (e?: React.FormEvent) => {
    e?.preventDefault();
    const m = parseInt(customMin) || 0;
    const s = parseInt(customSec) || 0;
    const total = m * 60 + s;
    if (total > 0) {
      requestNotify();
      start(total);
    }
  };

  const handleRemovePreset = (preset: number) => {
    if (!onUpdateSettings) return;
    const target = Math.round(preset);
    const updated = presets.filter((p) => Math.round(p) !== target);
    onUpdateSettings({ timerPresets: updated });
  };

  const handleAddPreset = () => {
    if (!onUpdateSettings) return;
    const m = parseInt(customMin) || 0;
    const s = parseInt(customSec) || 0;
    const totalMin = Math.max(1, Math.round(m + s / 60));
    const cleanPresets = Array.from(
      new Set<number>(presets.map((p) => Math.round(p))),
    );
    if (totalMin > 0 && !cleanPresets.includes(totalMin)) {
      const updated = [...cleanPresets, totalMin].sort(
        (a: number, b: number) => a - b,
      );
      onUpdateSettings({ timerPresets: updated });
    }
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
  const currentAngle = startAngle + sweep * progress;

  return (
    <div className="timer-widget bg-surface-container border border-outline-variant/30 rounded-2xl relative overflow-hidden flex flex-col min-h-[260px] sm:min-h-[220px] shadow-sm">
      {/* Header */}
      <div className="relative p-4 flex items-center justify-between z-20">
        <div className="flex items-center gap-2">
          <TimerIcon className="w-4 h-4 text-primary" />
          <h3 className="font-mono text-xs font-semibold tracking-[0.2em] text-on-surface uppercase">
            Timer
          </h3>
        </div>
        <div className="flex items-center gap-1.5">
          {status === "idle" ? (
            <>
              <button
                onClick={() => setIsEditing(!isEditing)}
                className={`p-1.5 rounded-lg transition-colors flex items-center justify-center ${
                  isEditing
                    ? "text-primary bg-primary/10"
                    : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container-highest"
                }`}
                title={isEditing ? "Done editing presets" : "Edit presets"}
              >
                <Edit2 size={15} />
              </button>
              <button
                onClick={handleAddPreset}
                className="p-1.5 rounded-lg text-on-surface-variant hover:text-primary hover:bg-surface-container-highest transition-colors flex items-center justify-center"
                title="Save current time as preset"
              >
                <Plus size={15} />
              </button>
              <button
                onClick={() => handleCustomStart()}
                className="p-1.5 rounded-lg text-primary hover:text-primary/80 hover:bg-primary/10 transition-colors"
                title="Start Timer"
              >
                <Play size={15} fill="currentColor" />
              </button>
            </>
          ) : status !== "finished" ? (
            <>
              <button
                onClick={() => setIsEditing(!isEditing)}
                className={`p-1.5 rounded-lg transition-colors flex items-center justify-center ${
                  isEditing
                    ? "text-primary bg-primary/10"
                    : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container-highest"
                }`}
                title={isEditing ? "Done editing presets" : "Edit presets"}
              >
                <Edit2 size={15} />
              </button>
              <button
                onClick={status === "running" ? pause : resume}
                className="p-1.5 rounded-lg text-primary hover:text-primary/80 transition-colors"
                title={status === "running" ? "Pause" : "Resume"}
              >
                {status === "running" ? (
                  <Pause size={15} fill="currentColor" />
                ) : (
                  <Play size={15} fill="currentColor" />
                )}
              </button>
              <button
                onClick={reset}
                className="p-1.5 rounded-lg text-on-surface-variant hover:text-red-400 transition-colors"
                title="Stop Timer"
              >
                <Square size={15} fill="currentColor" />
              </button>
            </>
          ) : (
            <button
              onClick={reset}
              className="p-1.5 rounded-lg text-on-surface-variant hover:text-red-400 transition-colors"
              title="Close Timer"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {/* SVG Canvas (Arch) */}
      <div className="absolute inset-0 flex flex-col items-center justify-end pointer-events-none">
        <svg
          className="w-full h-full max-h-full block"
          viewBox={`0 -40 ${w} ${h + strokeWidth / 2}`}
          preserveAspectRatio="xMidYMax meet"
        >
          <defs>
            <linearGradient id="widgetGlow" x1="0" y1="0" x2="1" y2="0">
              <stop
                offset="0%"
                stopColor="var(--timer-arch-start, #4d8eff)"
                stopOpacity="1"
              />
              <stop
                offset="50%"
                stopColor="var(--timer-arch-mid, #d8e2ff)"
                stopOpacity="1"
              />
              <stop
                offset="100%"
                stopColor="var(--timer-arch-start, #4d8eff)"
                stopOpacity="1"
              />
            </linearGradient>
            <filter
              id="heavyWidgetGlow"
              x="-20%"
              y="-20%"
              width="140%"
              height="140%"
            >
              <feGaussianBlur stdDeviation="16" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
            <filter
              id="lightWidgetGlow"
              x="-20%"
              y="-20%"
              width="140%"
              height="140%"
            >
              <feGaussianBlur stdDeviation="8" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Background Track */}
          <path
            d={`M 0 ${h} A ${r} ${r} 0 0 1 ${w} ${h}`}
            fill="transparent"
            stroke="currentColor"
            className="text-surface-container-highest"
            strokeWidth={strokeWidth}
            strokeLinecap="butt"
          />

          {/* Foreground Track */}
          <motion.path
            d={`M 0 ${h} A ${r} ${r} 0 0 1 ${w} ${h}`}
            fill="transparent"
            stroke="url(#widgetGlow)"
            strokeWidth={strokeWidth}
            strokeLinecap="butt"
            className="timer-arch-path"
            filter="url(#heavyWidgetGlow)"
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
              opacity: 1,
              filter: "drop-shadow(0 0 8px rgba(255,255,255,0.9))",
            }}
          />
        </svg>
      </div>

      {/* Timer Value */}
      <div
        className={`absolute inset-0 flex flex-col items-center justify-start pt-14 sm:justify-center sm:pt-0 sm:pb-6 z-10 pointer-events-none ${desktopValuePlacement === "below" ? "lg:justify-end lg:pb-16" : desktopValuePlacement === "above-4" ? "lg:justify-start lg:pt-28" : "lg:justify-start lg:pt-20"}`}
      >
        {status === "idle" ? (
          <form
            onSubmit={handleCustomStart}
            className="h-[1em] font-mono font-medium text-4xl sm:text-5xl leading-none tracking-tighter text-on-surface drop-shadow-md flex flex-nowrap items-center justify-center z-30 pointer-events-auto"
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
              className="bg-transparent text-center outline-none w-[1.15em] placeholder-on-surface/20 transition-colors hover:bg-on-surface/5 focus:bg-primary/20 selection:bg-transparent rounded-xl cursor-text"
              placeholder="00"
            />
            <span className="relative -top-0.5 opacity-80 mx-1 sm:mx-2 pointer-events-none shrink-0">
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
              className="bg-transparent text-center outline-none w-[1.15em] placeholder-on-surface/20 transition-colors hover:bg-on-surface/5 focus:bg-primary/20 selection:bg-transparent rounded-xl cursor-text"
              placeholder="00"
            />
            <button type="submit" className="hidden" />
          </form>
        ) : (
          <div
            className="h-[1em] font-mono font-medium text-4xl sm:text-5xl leading-none tracking-tighter text-on-surface drop-shadow-md flex flex-nowrap items-center justify-center z-30 pointer-events-none"
            style={{ fontVariantNumeric: "tabular-nums" }}
          >
            <div className="w-[1.15em] text-right relative flex justify-end">
              {status === "finished" && (
                <span className="absolute right-full mr-1.5 sm:mr-2.5 top-0 bottom-0 flex items-center text-red-400 opacity-90 select-none">
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
            <span className="relative -top-0.5 opacity-80 mx-1 sm:mx-2 shrink-0">
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

      {/* Controls Overlay */}
      <div className="mt-auto relative z-20 pb-5 px-3">
        <AnimatePresence mode="wait">
          {status !== "finished" ? (
            <motion.div
              key="presets"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              className="flex min-h-11 flex-col items-center justify-end gap-1.5"
            >
              <div className="flex flex-wrap justify-center gap-1.5 max-w-full">
                {presets.map((mins) => (
                  <div key={mins} className="relative group">
                    <button
                      onClick={() => !isEditing && handleStart(mins)}
                      className={`px-2.5 py-1 border rounded-lg text-xs font-mono font-bold transition-all active:scale-95 shadow-sm ${
                        isEditing
                          ? "bg-surface-container-high border-outline-variant/30 text-on-surface-variant cursor-default"
                          : "bg-surface-container-high/60 backdrop-blur hover:bg-surface-container-highest border-outline-variant/30 hover:border-outline-variant/50 text-on-surface"
                      }`}
                    >
                      {mins}m
                    </button>
                    {isEditing && (
                      <button
                        onClick={() => handleRemovePreset(mins)}
                        className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 shadow-md"
                        title={`Remove ${mins}m preset`}
                      >
                        <X size={10} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="finished"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="flex min-h-11 justify-center items-center gap-3"
            >
              <button
                onClick={reset}
                title="Acknowledge"
                className="p-3 bg-surface-container-high/60 backdrop-blur hover:bg-surface-container-highest border border-outline-variant/30 rounded-full text-on-surface transition-colors active:scale-95 shadow-sm flex items-center justify-center"
              >
                <Check size={18} />
              </button>
              <button
                onClick={() => start(duration)}
                title="Restart"
                className="p-3 bg-primary/20 backdrop-blur hover:bg-primary/30 border border-primary/30 rounded-full text-primary transition-colors active:scale-95 shadow-sm flex items-center justify-center"
              >
                <RotateCcw size={18} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
