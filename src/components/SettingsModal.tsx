import React from "react";
import {
  X,
  Volume2,
  Moon,
  Sun,
  Download,
  Trash2,
  Sliders,
  Guitar,
  Piano,
  RotateCcw,
} from "lucide-react";
import { AppSettings, TaskCompletionBehavior } from "../types";
import { GUITAR_TUNINGS } from "../data/musicTheory";
import { APP_VERSION } from "../lib/version";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onUpdateSettings: (newSettings: Partial<AppSettings>) => void;
  onExportData: () => void;
  onClearData: () => void;
  onRestartTour: () => void;
  completionBehavior: TaskCompletionBehavior;
  onUpdateCompletionBehavior: (behavior: TaskCompletionBehavior) => void;
  autoConfigureDashboardFromTask: boolean;
  onToggleAutoConfigureDashboardFromTask: (enabled: boolean) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  onExportData,
  onClearData,
  onRestartTour,
  completionBehavior,
  onUpdateCompletionBehavior,
  autoConfigureDashboardFromTask,
  onToggleAutoConfigureDashboardFromTask,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-surface border border-outline-variant/30 rounded-xl w-full max-w-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant/30">
          <div className="flex items-center gap-2.5">
            <Sliders size={18} className="text-primary" />
            <h2 className="font-mono text-sm font-bold tracking-wider text-on-surface uppercase">
              Studio Configuration
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-on-surface/5 flex items-center justify-center text-on-surface-variant hover:text-on-surface transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* Master Volume */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-on-surface-variant flex items-center gap-2">
                <Volume2 size={14} className="text-primary" />
                Master Synthesis Volume
              </span>
              <span className="text-primary font-bold">
                {Math.round(settings.soundVolume * 100)}%
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={settings.soundVolume}
              onChange={(e) =>
                onUpdateSettings({ soundVolume: parseFloat(e.target.value) })
              }
              className="w-full h-1.5 bg-surface-container-highest rounded-lg appearance-none cursor-pointer accent-primary"
            />
          </div>

          {/* Daily Task Completion */}
          <div className="flex flex-col gap-3 border-t border-outline-variant/20 pt-4">
            <div>
              <span className="font-mono text-xs font-semibold text-on-surface block">
                Daily Task Completion
              </span>
              <span className="text-[11px] text-on-surface-variant">
                Choose what happens to the Practice Tracker after the last task.
              </span>
            </div>
            <select
              value={completionBehavior}
              onChange={(event) =>
                onUpdateCompletionBehavior(
                  event.target.value as TaskCompletionBehavior,
                )
              }
              className="w-full rounded-lg border border-outline-variant/30 bg-surface-container px-3 py-2 font-mono text-xs text-on-surface outline-none transition-colors focus:border-primary"
              aria-label="Daily task completion behavior"
            >
              <option value="stop">Stop Practice Tracker automatically</option>
              <option value="continue">Keep Practice Tracker running</option>
              <option value="ask">Ask me every time</option>
            </select>
          </div>

          {/* Automatic Task Setup */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-outline-variant/20 pt-4">
            <div>
              <span className="font-mono text-xs font-semibold text-on-surface block">
                Automatic Task Setup
              </span>
              <span className="text-[11px] text-on-surface-variant">
                Automatically configure the dashboard from the active task
                (scale, tempo, duration).
              </span>
            </div>
            <div className="flex items-center self-start sm:self-auto gap-1 bg-surface-container p-1 rounded-lg border border-outline-variant/30 shrink-0">
              <button
                onClick={() => onToggleAutoConfigureDashboardFromTask(false)}
                className={`px-3 py-1.5 rounded text-xs font-mono transition-all ${
                  !autoConfigureDashboardFromTask
                    ? "bg-primary text-on-primary font-bold"
                    : "text-on-surface-variant hover:text-on-surface"
                }`}
              >
                Disabled
              </button>
              <button
                onClick={() => onToggleAutoConfigureDashboardFromTask(true)}
                className={`px-3 py-1.5 rounded text-xs font-mono transition-all ${
                  autoConfigureDashboardFromTask
                    ? "bg-primary text-on-primary font-bold"
                    : "text-on-surface-variant hover:text-on-surface"
                }`}
              >
                Enabled
              </button>
            </div>
          </div>

          {/* Theme Toggle */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-outline-variant/20">
            <div>
              <span className="font-mono text-xs font-semibold text-on-surface block">
                Visual Theme
              </span>
              <span className="text-[11px] text-on-surface-variant">
                High-contrast dark mode or bright studio mode
              </span>
            </div>

            <div className="flex items-center self-start sm:self-auto gap-1 bg-surface-container p-1 rounded-lg border border-outline-variant/30 shrink-0">
              <button
                onClick={() => onUpdateSettings({ theme: "dark" })}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-mono transition-all ${
                  settings.theme === "dark"
                    ? "bg-primary text-on-primary font-bold"
                    : "text-on-surface-variant hover:text-on-surface"
                }`}
              >
                <Moon size={13} />
                <span>Dark</span>
              </button>
              <button
                onClick={() => onUpdateSettings({ theme: "light" })}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-mono transition-all ${
                  settings.theme === "light"
                    ? "bg-primary text-on-primary font-bold"
                    : "text-on-surface-variant hover:text-on-surface"
                }`}
              >
                <Sun size={13} />
                <span>Light</span>
              </button>
            </div>
          </div>

          {/* Default Instrument */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-outline-variant/20">
            <div>
              <span className="font-mono text-xs font-semibold text-on-surface block">
                Default Instrument
              </span>
              <span className="text-[11px] text-on-surface-variant">
                Used as the starting instrument across the app
              </span>
            </div>

            <div className="flex items-center self-start sm:self-auto gap-1 bg-surface-container p-1 rounded-lg border border-outline-variant/30 shrink-0">
              <button
                onClick={() =>
                  onUpdateSettings({ defaultInstrument: "guitar" })
                }
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-mono transition-all ${
                  settings.defaultInstrument === "guitar"
                    ? "bg-primary text-on-primary font-bold"
                    : "text-on-surface-variant hover:text-on-surface"
                }`}
              >
                <Guitar size={13} />
                <span>Guitar</span>
              </button>
              <button
                onClick={() => onUpdateSettings({ defaultInstrument: "piano" })}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-mono transition-all ${
                  settings.defaultInstrument === "piano"
                    ? "bg-primary text-on-primary font-bold"
                    : "text-on-surface-variant hover:text-on-surface"
                }`}
              >
                <Piano size={13} />
                <span>Piano</span>
              </button>
            </div>
          </div>

          {/* Instrument Size */}
          <div className="space-y-2 pt-2 border-t border-outline-variant/20">
            <label className="font-mono text-xs font-semibold text-on-surface block">
              Instrument Size (Notes/Keys)
            </label>
            {(() => {
              const sizes = ["small", "medium", "large", "xlarge"] as const;
              const labels = ["Small", "Medium", "Large", "X-Large"];
              const currentIndex = sizes.indexOf(
                settings.fretboardNoteSize || "medium",
              );

              return (
                <div className="px-1">
                  <input
                    type="range"
                    min="0"
                    max="3"
                    step="1"
                    value={currentIndex >= 0 ? currentIndex : 1}
                    onChange={(e) => {
                      const newIndex = parseInt(e.target.value, 10);
                      onUpdateSettings({
                        fretboardNoteSize: sizes[newIndex],
                      });
                    }}
                    className="w-full h-1.5 bg-surface-container-highest rounded-lg appearance-none cursor-pointer accent-primary"
                  />
                  <div className="flex justify-between mt-2 text-[10px] font-mono text-on-surface-variant px-1">
                    {labels.map((label, idx) => (
                      <span
                        key={label}
                        className={
                          currentIndex === idx ? "text-primary font-bold" : ""
                        }
                      >
                        {label}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Default Guitar Tuning */}
          <div className="space-y-1.5 pt-2 border-t border-outline-variant/20">
            <label className="font-mono text-xs font-semibold text-on-surface block">
              Default Instrument Tuning
            </label>
            <select
              value={settings.defaultTuning}
              onChange={(e) =>
                onUpdateSettings({ defaultTuning: e.target.value })
              }
              className="w-full bg-surface-container border border-outline-variant/30 rounded-lg px-3 py-2 text-xs font-mono text-on-surface focus:outline-none focus:border-primary"
            >
              {GUITAR_TUNINGS.map((t) => (
                <option key={t.name} value={t.name}>
                  {t.name} ({t.strings.join(" ")})
                </option>
              ))}
            </select>
          </div>

          {/* Fret Count */}
          <div className="space-y-1.5 pt-2 border-t border-outline-variant/20">
            <label className="font-mono text-xs font-semibold text-on-surface block">
              Fretboard Length
            </label>
            <div className="grid grid-cols-5 gap-2">
              {[12, 15, 21, 22, 24].map((cnt) => (
                <button
                  key={cnt}
                  onClick={() => onUpdateSettings({ fretCount: cnt })}
                  className={`py-2 rounded font-mono text-xs border transition-all ${
                    settings.fretCount === cnt
                      ? "bg-primary text-on-primary border-primary font-bold"
                      : "bg-surface-container border-outline-variant/30 text-on-surface-variant hover:text-on-surface"
                  }`}
                >
                  {cnt} Frets
                </button>
              ))}
            </div>
          </div>

          {/* Metronome Sound */}
          <div className="space-y-1.5 pt-2 border-t border-outline-variant/20">
            <label className="font-mono text-xs font-semibold text-on-surface block">
              Default Metronome Timbre
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {(["click", "woodblock", "tick", "beep"] as const).map(
                (sound) => (
                  <button
                    key={sound}
                    onClick={() => onUpdateSettings({ metronomeSound: sound })}
                    className={`py-2 px-1 rounded font-mono text-[11px] uppercase border transition-all ${
                      settings.metronomeSound === sound
                        ? "bg-primary text-on-primary border-primary font-bold"
                        : "bg-surface-container border-outline-variant/30 text-on-surface-variant hover:text-on-surface"
                    }`}
                  >
                    {sound}
                  </button>
                ),
              )}
            </div>
          </div>

          {/* Fretboard Theme */}
          <div className="space-y-1.5 pt-4 border-t border-outline-variant/20">
            <span className="font-mono text-xs font-semibold text-on-surface-variant block uppercase tracking-wider">
              Fretboard Design
            </span>
            <label className="font-mono text-xs font-semibold text-on-surface block mt-2">
              Visual Theme
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {(
                [
                  {
                    id: "original",
                    label: "Original",
                    bgClass: "bg-surface-container-highest/60",
                    borderClass: "border-outline-variant/40",
                    stringClass: "bg-outline-variant",
                  },
                  {
                    id: "ebony",
                    label: "Ebony",
                    bgClass:
                      "bg-[#252525] bg-gradient-to-b from-[#2a2a2a] to-[#202020]",
                    borderClass: "border-[#404040]",
                    stringClass: "bg-outline-variant",
                  },
                  {
                    id: "maple",
                    label: "Maple",
                    bgClass:
                      "bg-[#e8d5b5] bg-gradient-to-b from-[#ebd9bb] to-[#dfcbad]",
                    borderClass: "border-black/20",
                    stringClass: "bg-black/60",
                  },
                  {
                    id: "rosewood",
                    label: "Rosewood",
                    bgClass:
                      "bg-[#4a2618] bg-gradient-to-b from-[#4f291a] to-[#402114]",
                    borderClass: "border-[#d1b09b]/30",
                    stringClass: "bg-[#d1b09b]/60",
                  },
                  {
                    id: "high-contrast",
                    label: "High Contrast",
                    bgClass: "bg-black",
                    borderClass: "border-white",
                    stringClass: "bg-white",
                  },
                ] as const
              ).map((themeOption) => (
                <button
                  key={themeOption.id}
                  onClick={() =>
                    onUpdateSettings({ fretboardTheme: themeOption.id })
                  }
                  className={`flex flex-col items-center gap-2 p-2 rounded-lg border transition-all ${
                    settings.fretboardTheme === themeOption.id
                      ? "bg-primary/5 border-primary shadow-sm ring-1 ring-primary"
                      : "bg-surface border-outline-variant/30 hover:border-primary/50"
                  }`}
                >
                  <div
                    className={`w-full h-10 rounded border ${themeOption.bgClass} ${themeOption.borderClass} relative overflow-hidden flex flex-col justify-evenly shadow-inner`}
                  >
                    {/* Tiny decorative inlays */}
                    <div className="absolute inset-0 flex items-center justify-center opacity-50">
                      <div
                        className={`w-1.5 h-1.5 rounded-full ${themeOption.id === "high-contrast" ? "bg-white" : "bg-current"} ${themeOption.id === "maple" ? "text-black/30" : "text-white/30"}`}
                      ></div>
                    </div>
                    {/* Strings */}
                    <div
                      className={`w-full h-px ${themeOption.stringClass} opacity-80`}
                    ></div>
                    <div
                      className={`w-full h-px ${themeOption.stringClass} opacity-80`}
                    ></div>
                    <div
                      className={`w-full h-px ${themeOption.stringClass} opacity-80`}
                    ></div>
                    <div
                      className={`w-full h-px ${themeOption.stringClass} opacity-80`}
                    ></div>
                  </div>
                  <span
                    className={`font-mono text-[10px] ${settings.fretboardTheme === themeOption.id ? "text-primary font-bold" : "text-on-surface-variant"}`}
                  >
                    {themeOption.label}
                  </span>
                </button>
              ))}
            </div>

            {/* Color Vision Mode */}
            <div className="mt-4 space-y-1.5">
              <label className="font-mono text-xs font-semibold text-on-surface block">
                Color Vision Mode
              </label>
              <span className="text-[10px] text-on-surface-variant mb-2 block">
                Enhance visual accessibility using shapes and contrast
              </span>
              <div className="grid grid-cols-3 gap-2">
                {(
                  [
                    { id: "default", label: "Default" },
                    { id: "colorblind", label: "Colorblind-Safe" },
                    { id: "monochrome", label: "Monochrome" },
                  ] as const
                ).map((modeOption) => (
                  <button
                    key={modeOption.id}
                    onClick={() =>
                      onUpdateSettings({ fretboardColorMode: modeOption.id })
                    }
                    className={`py-2 px-1 rounded font-mono text-[11px] border transition-all ${
                      settings.fretboardColorMode === modeOption.id
                        ? "bg-primary text-on-primary border-primary font-bold shadow-sm"
                        : "bg-surface-container border-outline-variant/30 text-on-surface-variant hover:text-on-surface hover:border-primary/50"
                    }`}
                  >
                    {modeOption.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Marker Shape */}
            <div className="mt-4 space-y-1.5">
              <label className="font-mono text-xs font-semibold text-on-surface block">
                Note Marker Shape
              </label>
              <span className="text-[10px] text-on-surface-variant mb-2 block">
                Shape is kept uniform across all sizes
              </span>
              <div className="grid grid-cols-2 gap-2">
                {(
                  [
                    { id: "round", label: "Rounded" },
                    { id: "square", label: "Square" },
                  ] as const
                ).map((shapeOption) => (
                  <button
                    key={shapeOption.id}
                    onClick={() =>
                      onUpdateSettings({ fretboardMarkerShape: shapeOption.id })
                    }
                    className={`flex items-center justify-center gap-2 py-2 px-1 rounded font-mono text-[11px] border transition-all ${
                      (settings.fretboardMarkerShape || "round") ===
                      shapeOption.id
                        ? "bg-primary text-on-primary border-primary font-bold shadow-sm"
                        : "bg-surface-container border-outline-variant/30 text-on-surface-variant hover:text-on-surface hover:border-primary/50"
                    }`}
                  >
                    <span
                      className={`w-3 h-3 shrink-0 ${shapeOption.id === "square" ? "rounded-[3px]" : "rounded-full"} ${
                        (settings.fretboardMarkerShape || "round") ===
                        shapeOption.id
                          ? "bg-on-primary"
                          : "bg-on-surface-variant"
                      }`}
                    />
                    {shapeOption.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-4 flex flex-col gap-3">
              <label className="flex items-center justify-between cursor-pointer group">
                <div>
                  <span className="font-mono text-xs font-semibold text-on-surface block group-hover:text-primary transition-colors">
                    Minimal Details
                  </span>
                  <span className="text-[10px] text-on-surface-variant">
                    Hide fret inlays, clean background, thinner lines
                  </span>
                </div>
                <div
                  className={`w-10 h-5 rounded-full p-0.5 transition-colors ${settings.fretboardMinimalDetails ? "bg-primary" : "bg-surface-container-high border border-outline-variant/30"}`}
                  onClick={() =>
                    onUpdateSettings({
                      fretboardMinimalDetails:
                        !settings.fretboardMinimalDetails,
                    })
                  }
                >
                  <div
                    className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${settings.fretboardMinimalDetails ? "translate-x-5" : "translate-x-0"}`}
                  />
                </div>
              </label>
            </div>
          </div>

          {/* Data Management */}
          <div className="pt-4 border-t border-outline-variant/20 space-y-3">
            <span className="font-mono text-xs font-semibold text-on-surface-variant uppercase tracking-wider block">
              Data & Local Storage
            </span>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={onExportData}
                className="flex items-center gap-1.5 bg-surface-container hover:bg-surface-container-high border border-outline-variant/30 text-on-surface px-3.5 py-2 rounded text-xs font-mono transition-all"
              >
                <Download size={14} />
                <span>Export Sessions (JSON)</span>
              </button>

              <button
                onClick={() => {
                  onClose();
                  onRestartTour();
                }}
                className="flex items-center gap-1.5 bg-surface-container hover:bg-surface-container-high border border-outline-variant/30 text-on-surface px-3.5 py-2 rounded text-xs font-mono transition-all"
              >
                <RotateCcw size={14} />
                <span>Restart Tour</span>
              </button>

              <button
                onClick={() => {
                  if (
                    window.confirm(
                      "Are you sure you want to reset all practice logs and streaks?",
                    )
                  ) {
                    onClearData();
                  }
                }}
                className="flex items-center gap-1.5 bg-error/10 hover:bg-error/20 border border-error/30 text-error px-3.5 py-2 rounded text-xs font-mono transition-all"
              >
                <Trash2 size={14} />
                <span>Reset All Data</span>
              </button>
            </div>
          </div>

          {/* Version */}
          <div className="pt-4 border-t border-outline-variant/20 flex items-center justify-between">
            <span className="font-mono text-[10px] tracking-widest text-on-surface-variant/50 uppercase">
              Mousi9ti
            </span>
            <span className="font-mono text-[10px] tracking-widest text-on-surface-variant/50">
              v{APP_VERSION}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
