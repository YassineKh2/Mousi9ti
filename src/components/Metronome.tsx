import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Play,
  Square,
  Plus,
  Minus,
  Volume2,
  VolumeX,
  Repeat2,
} from "lucide-react";
import {
  MetronomeSound,
  MetronomeSubdivision,
  TimeSignature,
  AppSettings,
} from "../types";
import { audioEngine } from "../lib/audio";

const MetronomeGlyph: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    <path d="M12 11.4V9.1" />
    <path d="m12 17 6.59-6.59" />
    <path d="m15.05 5.7-.218-.691a3 3 0 0 0-5.663 0L4.418 19.695A1 1 0 0 0 5.37 21h13.253a1 1 0 0 0 .951-1.31L18.45 16.2" />
    <circle cx="20" cy="9" r="2" />
  </svg>
);

interface MetronomeProps {
  bpm: number;
  onBpmChange: (newBpm: number) => void;
  onLogBpmToSession?: (bpm: number) => void;
  settings: AppSettings;
  showTempoPresets?: boolean;
  isPlaying?: boolean;
  onIsPlayingChange?: (playing: boolean) => void;
  barCycleMode?: boolean;
  onBarCycleModeChange?: (enabled: boolean) => void;
  timeSignature?: TimeSignature;
  onTimeSignatureChange?: (signature: TimeSignature) => void;
}

export const Metronome: React.FC<MetronomeProps> = ({
  bpm,
  onBpmChange,
  onLogBpmToSession,
  settings,
  showTempoPresets = true,
  isPlaying: controlledIsPlaying,
  onIsPlayingChange,
  barCycleMode: controlledBarCycleMode,
  onBarCycleModeChange,
  timeSignature: controlledTimeSignature,
  onTimeSignatureChange,
}) => {
  const [isHydratedFromEngine, setIsHydratedFromEngine] =
    useState<boolean>(false);
  const [localIsPlaying, setLocalIsPlaying] = useState<boolean>(() =>
    audioEngine.isRunning(),
  );
  const isPlaying =
    controlledIsPlaying !== undefined ? controlledIsPlaying : localIsPlaying;
  const [localTimeSignature, setLocalTimeSignature] =
    useState<TimeSignature>("4/4");
  const timeSignature = controlledTimeSignature ?? localTimeSignature;
  const [subdivision, setSubdivision] =
    useState<MetronomeSubdivision>("quarter");
  const [soundType, setSoundType] = useState<MetronomeSound>(
    settings.metronomeSound,
  );
  const [currentBeat, setCurrentBeat] = useState<number>(0);
  const [isAccentBeat, setIsAccentBeat] = useState<boolean>(false);
  const [localBarCycleMode, setLocalBarCycleMode] = useState<boolean>(false);

  const tempoPresets = [60, 72, 80, 88, 96, 108, 120, 132, 144, 160];
  const barCycleMode =
    controlledBarCycleMode !== undefined
      ? controlledBarCycleMode
      : localBarCycleMode;

  const handleTimeSignatureChange = (signature: TimeSignature) => {
    setLocalTimeSignature(signature);
    onTimeSignatureChange?.(signature);
  };

  const setBarCycleMode = useCallback(
    (nextValue: boolean | ((prev: boolean) => boolean)) => {
      const resolvedValue =
        typeof nextValue === "function" ? nextValue(barCycleMode) : nextValue;

      if (onBarCycleModeChange) {
        onBarCycleModeChange(resolvedValue);
        return;
      }

      setLocalBarCycleMode(resolvedValue);
    },
    [barCycleMode, onBarCycleModeChange],
  );

  const setIsPlayingState = useCallback(
    (playing: boolean) => {
      if (onIsPlayingChange) {
        onIsPlayingChange(playing);
        return;
      }

      setLocalIsPlaying(playing);
    },
    [onIsPlayingChange],
  );

  // Tap tempo state
  const tapTimesRef = useRef<number[]>([]);
  const isPlayingRef = useRef<boolean>(false);

  // Metronome run duration tracker for auto-saving (>30s)
  const startTimeRef = useRef<number | null>(null);

  const handleBeatCallback = useCallback(
    (beat: number, isAccent: boolean, _isSub: boolean) => {
      setCurrentBeat(beat);
      setIsAccentBeat(isAccent);
    },
    [],
  );

  // Sync sound type from settings when it changes
  useEffect(() => {
    if (!audioEngine.isRunning()) {
      setSoundType(settings.metronomeSound);
    }
  }, [settings.metronomeSound]);

  useEffect(() => {
    isPlayingRef.current = isPlaying;

    if (!isPlaying) {
      audioEngine.setMuted(false);
      audioEngine.resetMetronomePosition();
      return;
    }

    if (barCycleMode) {
      return;
    }

    audioEngine.setMuted(false);
    if (!audioEngine.isRunning()) {
      audioEngine.resetMetronomePosition();
    }
  }, [barCycleMode, isPlaying]);

  // Hydrate from current engine state and keep UI playback status synced across page switches
  useEffect(() => {
    const engineState = audioEngine.getMetronomeState();

    setIsPlayingState(engineState.isPlaying);
    setLocalTimeSignature(engineState.timeSignature as TimeSignature);
    setSubdivision(engineState.subdivision);
    setSoundType(engineState.soundType);
    setCurrentBeat(engineState.currentBeat);
    audioEngine.setMetronomeBarCycle(barCycleMode);

    if (engineState.bpm !== bpm) {
      onBpmChange(engineState.bpm);
    }

    audioEngine.setMetronomeBeatCallback(handleBeatCallback);

    const unsubscribe = audioEngine.onMetronomeStateChange((playing) => {
      setIsPlayingState(playing);
      if (!playing) {
        startTimeRef.current = null;
      }
    });

    setIsHydratedFromEngine(true);

    return () => {
      audioEngine.setMetronomeBeatCallback(null);
      unsubscribe();
    };
  }, [barCycleMode, onBpmChange, handleBeatCallback, setIsPlayingState]);

  // Time signature beats
  const beatsInBar = parseInt(timeSignature.split("/")[0], 10) || 4;

  const togglePlay = useCallback(() => {
    if (isPlaying) {
      audioEngine.setMuted(false);
      audioEngine.resetMetronomePosition();
      audioEngine.stopMetronome();
      setIsPlayingState(false);

      if (startTimeRef.current) {
        const elapsed = (Date.now() - startTimeRef.current) / 1000;
        if (elapsed >= 30 && onLogBpmToSession) {
          onLogBpmToSession(bpm);
        }
      }
      startTimeRef.current = null;
    } else {
      startTimeRef.current = Date.now();
      audioEngine.startMetronome(
        bpm,
        timeSignature,
        subdivision,
        soundType,
        handleBeatCallback,
      );
      setIsPlayingState(true);
    }
  }, [
    isPlaying,
    bpm,
    timeSignature,
    subdivision,
    soundType,
    handleBeatCallback,
    onLogBpmToSession,
    barCycleMode,
  ]);

  // Update metronome if playing and params change
  useEffect(() => {
    if (isPlaying && isHydratedFromEngine) {
      audioEngine.updateMetronomeParams(
        bpm,
        timeSignature,
        subdivision,
        soundType,
      );
    }
  }, [
    bpm,
    timeSignature,
    subdivision,
    soundType,
    isPlaying,
    isHydratedFromEngine,
  ]);

  // Tap tempo handler
  const handleTapTempo = () => {
    const now = Date.now();
    const taps = tapTimesRef.current.filter((t) => now - t < 3000); // keep taps within last 3 seconds
    taps.push(now);
    tapTimesRef.current = taps;

    if (taps.length >= 2) {
      const recentTaps = taps.slice(-4); // last 4 taps
      let totalDiff = 0;
      for (let i = 1; i < recentTaps.length; i++) {
        totalDiff += recentTaps[i] - recentTaps[i - 1];
      }
      const avgDiff = totalDiff / (recentTaps.length - 1);
      const calculatedBpm = Math.round(60000 / avgDiff);
      const boundedBpm = Math.max(20, Math.min(300, calculatedBpm));
      onBpmChange(boundedBpm);
    }
  };

  const adjustBpm = (delta: number) => {
    const newBpm = Math.max(20, Math.min(300, bpm + delta));
    onBpmChange(newBpm);
  };

  return (
    <div className="bg-surface-container border border-outline-variant/30 rounded-lg p-4 md:p-5 flex flex-col min-w-0 justify-between relative shadow-xl">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-outline-variant/10">
        <div className="flex items-center gap-2">
          <MetronomeGlyph className="h-4 w-4 text-primary" />
          <span className="font-mono text-xs font-semibold tracking-[0.2em] text-on-surface uppercase">
            Metronome
          </span>
          {isPlaying && (
            <span className="w-2 h-2 rounded-full bg-primary animate-ping"></span>
          )}
        </div>

        <div className="flex min-w-0 flex-1 items-center justify-end gap-2">
          <select
            value={timeSignature}
            onChange={(e) =>
              handleTimeSignatureChange(e.target.value as TimeSignature)
            }
            className="min-h-10 min-w-0 bg-surface-container-low border border-outline-variant/30 rounded px-2 py-1 text-[11px] font-mono text-on-surface focus:outline-none focus:border-primary/50 cursor-pointer md:min-h-0"
          >
            <option value="2/2">2/2</option>
            <option value="2/4">2/4</option>
            <option value="3/4">3/4</option>
            <option value="3/8">3/8</option>
            <option value="4/4">4/4</option>
            <option value="5/4">5/4</option>
            <option value="6/4">6/4</option>
            <option value="6/8">6/8</option>
            <option value="7/8">7/8</option>
            <option value="9/8">9/8</option>
            <option value="12/8">12/8</option>
          </select>

          <select
            value={soundType}
            onChange={(e) => setSoundType(e.target.value as MetronomeSound)}
            className="min-h-10 min-w-0 flex-1 bg-surface-container-low border border-outline-variant/30 rounded px-2 py-1 text-[11px] font-mono text-on-surface focus:outline-none focus:border-primary/50 cursor-pointer md:min-h-0"
          >
            <option value="click">Digital Click</option>
            <option value="woodblock">Woodblock</option>
            <option value="tick">Mechanical Tick</option>
            <option value="beep">Pure Tone Beep</option>
          </select>
        </div>
      </div>

      {/* Visual Beat Indicator Dots/Bars */}
      <div className="flex gap-1.5 my-3 w-full justify-center">
        {Array.from({ length: beatsInBar }).map((_, i) => {
          const isCurrent = isPlaying && currentBeat === i;
          const isAccent = isCurrent && isAccentBeat && i === 0;

          return (
            <div
              key={i}
              className={`flex-1 h-2 rounded-sm transition-all duration-75 ${
                isAccent
                  ? "bg-on-surface shadow-[0_0_10px_var(--color-on-surface)] scale-y-125"
                  : isCurrent
                    ? "bg-primary shadow-[0_0_10px_var(--color-primary)] scale-y-110"
                    : "bg-outline-variant/20"
              }`}
            />
          );
        })}
      </div>

      {/* Large Numerical BPM Display */}
      <div className="flex items-baseline justify-center gap-3 my-1">
        <span className="font-mono text-6xl font-light tracking-tighter text-on-surface select-none">
          {bpm}
        </span>
        <span className="font-mono text-xs text-on-surface-variant tracking-widest uppercase">
          BPM
        </span>
      </div>

      {showTempoPresets && (
        <div className="flex flex-wrap justify-center gap-1.5 mb-3">
          {tempoPresets.map((preset) => (
            <button
              key={preset}
              onClick={() => onBpmChange(preset)}
              className={`px-2.5 py-1 rounded-full text-[10px] font-mono tracking-widest transition-all ${
                bpm === preset
                  ? "bg-primary/20 text-primary border border-primary/50"
                  : "bg-surface-container-low text-on-surface-variant border border-outline-variant/30 hover:text-on-surface"
              }`}
            >
              {preset}
            </button>
          ))}
        </div>
      )}

      {/* Subdivision Selector Buttons */}
      <div className="flex flex-wrap justify-center gap-1.5 my-2.5">
        {[
          { id: "quarter", label: "1/4" },
          { id: "eighth", label: "1/8" },
          { id: "sixteenth", label: "1/16" },
          { id: "triplet", label: "3" },
        ].map((s) => (
          <button
            key={s.id}
            onClick={() => setSubdivision(s.id as MetronomeSubdivision)}
            className={`min-h-10 px-3 py-1 rounded font-mono text-[10px] tracking-wider transition-colors md:min-h-0 ${
              subdivision === s.id
                ? "bg-primary/20 text-primary border border-primary/50 font-bold"
                : "border border-outline-variant/30 text-on-surface-variant hover:text-on-surface hover:bg-outline-variant/10"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Tactile Slider with +/- Buttons */}
      <div className="flex items-center gap-3 my-2">
        <button
          onClick={() => adjustBpm(-1)}
          className="w-10 h-10 md:w-7 md:h-7 rounded bg-surface-container-low border border-outline-variant/30 flex items-center justify-center text-on-surface-variant hover:text-on-surface hover:border-outline-variant transition-all"
        >
          <Minus size={14} />
        </button>

        <input
          type="range"
          min="20"
          max="300"
          value={bpm}
          onChange={(e) => onBpmChange(Number(e.target.value))}
          className="flex-1 min-w-0 h-1.5 bg-surface-container-highest rounded-lg appearance-none cursor-pointer accent-primary"
        />

        <button
          onClick={() => adjustBpm(1)}
          className="w-10 h-10 md:w-7 md:h-7 rounded bg-surface-container-low border border-outline-variant/30 flex items-center justify-center text-on-surface-variant hover:text-on-surface hover:border-outline-variant transition-all"
        >
          <Plus size={14} />
        </button>
      </div>

      {/* Bottom Controls: Tap Tempo, Bar Cycle Toggle & Big Play Button */}
      <div className="box-content mt-auto flex min-h-11 flex-wrap justify-between items-center pt-2 border-t border-outline-variant/10 gap-2">
        <div className="flex flex-wrap items-center gap-2 flex-1">
          <button
            onClick={handleTapTempo}
            className="min-h-10 text-[10px] font-mono tracking-widest text-on-surface-variant border border-outline-variant/30 px-3.5 py-1.5 rounded hover:text-on-surface hover:border-primary/40 hover:bg-primary/5 active:scale-95 transition-all md:min-h-0"
          >
            TAP TEMPO
          </button>

          <button
            onClick={() => {
              const next = !barCycleMode;
              audioEngine.setMetronomeBarCycle(next);
              audioEngine.resetMetronomePosition();
              setBarCycleMode(next);
            }}
            className={`inline-flex min-h-10 items-center gap-1.5 px-2.5 py-1.5 rounded text-[10px] font-mono tracking-widest transition-all md:min-h-0 ${
              barCycleMode
                ? "bg-primary/15 text-primary border border-primary/50"
                : "border border-outline-variant/30 text-on-surface-variant hover:text-on-surface hover:border-primary/30"
            }`}
          >
            {barCycleMode ? <VolumeX size={12} /> : <Repeat2 size={12} />}
            MUTE 1 BAR
          </button>
        </div>

        <button
          onClick={togglePlay}
          className={`w-11 h-11 rounded-full flex items-center justify-center transition-all shadow-lg active:scale-95 ${
            isPlaying
              ? "bg-error-container text-on-error-container border border-error/50 hover:opacity-80"
              : "bg-primary text-on-primary hover:bg-primary-container shadow-primary/20"
          }`}
        >
          {isPlaying ? (
            <Square size={18} fill="currentColor" />
          ) : (
            <Play size={20} className="ml-0.5" fill="currentColor" />
          )}
        </button>
      </div>
    </div>
  );
};
