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
import "./PrecisionMetronome.css";

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
  variant?: "standard" | "precision";
}

const precisionScale = [
  [20, true],
  [30, false],
  [40, true],
  [50, false],
  [60, true],
  [70, false],
  [80, true],
  [90, false],
  [100, true],
  [110, false],
  [120, true],
  [140, true],
  [160, true],
  [180, true],
  [200, true],
  [220, true],
  [240, true],
  [270, true],
  [300, true],
] as const;

const precisionScaleLabels = [20, 40, 60, 80, 100, 140, 180, 220, 270, 300];

const precisionDistance = (value: number) =>
  270 - (250 * (value - 20)) / (300 - 20);

const getPrecisionPendulumMotion = (
  position: number,
  beatsPerSecond: number,
) => {
  const phase = Math.PI * (position - 1);
  return {
    theta: 22 * Math.cos(phase),
    velocity: -22 * Math.PI * beatsPerSecond * Math.sin(phase),
  };
};

const precisionTempoMarks = [
  [40, "Grave"],
  [60, "Largo"],
  [66, "Larghetto"],
  [76, "Adagio"],
  [108, "Andante"],
  [120, "Moderato"],
  [156, "Allegro"],
  [176, "Vivace"],
  [200, "Presto"],
  [999, "Prestissimo"],
] as const;

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
  variant = "standard",
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
  const beatUnit = parseInt(timeSignature.split("/")[1], 10) || 4;
  const beatsPerSecond = (bpm * beatUnit) / 240;
  const [subdivision, setSubdivision] =
    useState<MetronomeSubdivision>("quarter");
  const [soundType, setSoundType] = useState<MetronomeSound>(
    settings.metronomeSound,
  );
  const [currentBeat, setCurrentBeat] = useState<number>(0);
  const [isAccentBeat, setIsAccentBeat] = useState<boolean>(false);
  const [isSilentBar, setIsSilentBar] = useState(false);
  const [localBarCycleMode, setLocalBarCycleMode] = useState<boolean>(false);
  const [tempoInput, setTempoInput] = useState(String(bpm));
  const precisionArmRef = useRef<SVGGElement>(null);
  const precisionWeightRef = useRef<SVGGElement>(null);
  const precisionLeftGlowRef = useRef<SVGCircleElement>(null);
  const precisionRightGlowRef = useRef<SVGCircleElement>(null);
  const precisionLeftLampRef = useRef<SVGCircleElement>(null);
  const precisionRightLampRef = useRef<SVGCircleElement>(null);
  const precisionDotRef = useRef<HTMLElement>(null);
  const timeSignatureSelectRef = useRef<HTMLSelectElement>(null);
  const soundTypeSelectRef = useRef<HTMLSelectElement>(null);
  const pendulumBeatRef = useRef(0);
  const pendulumLastBeatRef = useRef<number | null>(null);
  const pendulumBeatAtRef = useRef<number | null>(null);
  const pendulumStartedAtRef = useRef<number | null>(null);
  const pendulumFirstBeatOffsetRef = useRef(0);
  const pendulumBeatsPerBarRef = useRef(4);
  pendulumBeatsPerBarRef.current =
    parseInt(timeSignature.split("/")[0], 10) || 4;
  const wasPlayingRef = useRef(false);
  const pendulumRestRef = useRef<{
    at: number;
    theta: number;
    velocity: number;
  } | null>(null);

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
    (
      beat: number,
      isAccent: boolean,
      isSub: boolean,
      silentBar: boolean,
    ) => {
      setCurrentBeat(beat);
      setIsAccentBeat(isAccent);
      setIsSilentBar(silentBar);
      if (!isSub) {
        const now = performance.now();
        const lastBeat = pendulumLastBeatRef.current;
        if (lastBeat === null) {
          pendulumBeatRef.current = pendulumFirstBeatOffsetRef.current;
          pendulumFirstBeatOffsetRef.current = 0;
        } else {
          const beatsPerBar = pendulumBeatsPerBarRef.current;
          const beatDelta = beat - lastBeat;
          pendulumBeatRef.current +=
            ((beatDelta % beatsPerBar) + beatsPerBar) % beatsPerBar;
        }
        pendulumLastBeatRef.current = beat;
        pendulumBeatAtRef.current = now;
      }
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
      setIsSilentBar(false);
      return;
    }

    if (barCycleMode) {
      return;
    }

    setIsSilentBar(false);
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

  useEffect(() => {
    setTempoInput(String(bpm));
  }, [bpm]);

  useEffect(() => {
    if (isPlaying && !wasPlayingRef.current) {
      pendulumBeatRef.current = 0;
      pendulumLastBeatRef.current = null;
      pendulumBeatAtRef.current = null;
      pendulumRestRef.current = null;
    } else if (!isPlaying && wasPlayingRef.current) {
      const now = performance.now();
      const beatAt = pendulumBeatAtRef.current;
      const position =
        beatAt === null
          ? pendulumStartedAtRef.current === null
            ? 0
            : 0.5 +
              ((now - pendulumStartedAtRef.current) * beatsPerSecond) / 1000
          : pendulumBeatRef.current + ((now - beatAt) * beatsPerSecond) / 1000;
      const motion = getPrecisionPendulumMotion(position, beatsPerSecond);
      pendulumRestRef.current = {
        at: now,
        theta: motion.theta,
        velocity: motion.velocity,
      };
      pendulumLastBeatRef.current = null;
      pendulumBeatAtRef.current = null;
      pendulumStartedAtRef.current = null;
    }
    wasPlayingRef.current = isPlaying;
  }, [bpm, beatsPerSecond, isPlaying]);

  useEffect(() => {
    if (variant !== "precision") return;

    let frameId = 0;
    let lastFrameAt = performance.now();
    const draw = (now: number) => {
      const dt = Math.min(0.1, (now - lastFrameAt) / 1000);
      lastFrameAt = now;

      let position = 0;
      let theta = 0;
      if (isPlaying) {
        const beatAt = pendulumBeatAtRef.current;
        if (beatAt === null) {
          const startedAt = pendulumStartedAtRef.current;
          position =
            startedAt === null
              ? 0
              : 0.5 + ((now - startedAt) * beatsPerSecond) / 1000;
        } else {
          position =
            pendulumBeatRef.current + ((now - beatAt) * beatsPerSecond) / 1000;
        }
        theta = getPrecisionPendulumMotion(position, beatsPerSecond).theta;
      } else if (pendulumRestRef.current) {
        const rest = pendulumRestRef.current;
        const elapsed = (now - rest.at) / 1000;
        const damping = 0.3;
        const frequency = 7;
        const dampedFrequency = frequency * Math.sqrt(1 - damping * damping);
        theta =
          Math.exp(-damping * frequency * elapsed) *
          (rest.theta * Math.cos(dampedFrequency * elapsed) +
            ((rest.velocity + damping * frequency * rest.theta) /
              dampedFrequency) *
              Math.sin(dampedFrequency * elapsed));
      }

      precisionArmRef.current?.setAttribute(
        "transform",
        `translate(160 352) rotate(${theta.toFixed(3)})`,
      );

      const targetWeight = precisionDistance(bpm);
      const weightTransform = precisionWeightRef.current;
      if (weightTransform) {
        const currentY = Number(
          weightTransform.getAttribute("data-y") ?? targetWeight,
        );
        const nextY =
          currentY + (targetWeight - currentY) * Math.min(1, dt * 12);
        weightTransform.setAttribute("data-y", String(nextY));
        weightTransform.setAttribute(
          "transform",
          `translate(0 ${(-nextY).toFixed(2)})`,
        );
      }

      let flash = 0;
      if (isPlaying && pendulumBeatAtRef.current !== null) {
        const beat = Math.floor(position);
        flash = Math.max(
          0,
          1 - ((position - beat) * 1000) / beatsPerSecond / 250,
        );
        const hasEndpoint = beat > 0;
        const isRight = beat % 2 === 1;
        precisionLeftLampRef.current?.setAttribute(
          "opacity",
          !hasEndpoint || isRight ? "0" : String(flash),
        );
        precisionLeftGlowRef.current?.setAttribute(
          "opacity",
          !hasEndpoint || isRight ? "0" : String(flash * 0.45),
        );
        precisionRightLampRef.current?.setAttribute(
          "opacity",
          hasEndpoint && isRight ? String(flash) : "0",
        );
        precisionRightGlowRef.current?.setAttribute(
          "opacity",
          hasEndpoint && isRight ? String(flash * 0.45) : "0",
        );
      } else {
        precisionLeftLampRef.current?.setAttribute("opacity", "0");
        precisionLeftGlowRef.current?.setAttribute("opacity", "0");
        precisionRightLampRef.current?.setAttribute("opacity", "0");
        precisionRightGlowRef.current?.setAttribute("opacity", "0");
      }
      if (precisionDotRef.current) {
        precisionDotRef.current.style.opacity = String(0.3 + 0.7 * flash);
      }
      frameId = requestAnimationFrame(draw);
    };
    frameId = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frameId);
  }, [bpm, beatsPerSecond, isPlaying, variant]);

  const togglePlay = useCallback(() => {
    if (isPlaying) {
      audioEngine.setMuted(false);
      audioEngine.resetMetronomePosition();
      audioEngine.stopMetronome();
      setIsPlayingState(false);
      setIsSilentBar(false);

      if (startTimeRef.current) {
        const elapsed = (Date.now() - startTimeRef.current) / 1000;
        if (elapsed >= 30 && onLogBpmToSession) {
          onLogBpmToSession(bpm);
        }
      }
      startTimeRef.current = null;
    } else {
      setIsSilentBar(false);
      startTimeRef.current = Date.now();
      pendulumStartedAtRef.current =
        variant === "precision" ? performance.now() : null;
      pendulumFirstBeatOffsetRef.current = variant === "precision" ? 1 : 0;
      audioEngine.startMetronome(
        bpm,
        timeSignature,
        subdivision,
        soundType,
        handleBeatCallback,
        variant === "precision" ? 0.5 / beatsPerSecond : 0,
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
    variant,
    beatsPerSecond,
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

  if (variant === "precision") {
    const mark = precisionTempoMarks.find(
      ([threshold]) => bpm < threshold,
    )?.[1];
    const commitTempoInput = () => {
      const value = Number(tempoInput);
      if (Number.isFinite(value) && tempoInput.trim() !== "") {
        onBpmChange(Math.max(20, Math.min(300, Math.round(value))));
      } else {
        setTempoInput(String(bpm));
      }
    };

    return (
      <div className="precision-metro">
        <div className="precision-metro__header">
          <div className="precision-metro__title">
            <MetronomeGlyph />
            <div>
              <h2>PRECISION METRONOME</h2>
            </div>
          </div>
          <div className="precision-metro__selects">
            <label className="precision-metro__select">
              <span
                onClick={(event) => {
                  const select = timeSignatureSelectRef.current;
                  if (select && typeof select.showPicker === "function") {
                    select.showPicker();
                    event.preventDefault();
                  }
                }}
              >
                Time signature
              </span>
              <select
                ref={timeSignatureSelectRef}
                value={timeSignature}
                onChange={(e) =>
                  handleTimeSignatureChange(e.target.value as TimeSignature)
                }
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
            </label>
            <label className="precision-metro__select">
              <span
                onClick={(event) => {
                  const select = soundTypeSelectRef.current;
                  if (select && typeof select.showPicker === "function") {
                    select.showPicker();
                    event.preventDefault();
                  }
                }}
              >
                Click sound
              </span>
              <select
                ref={soundTypeSelectRef}
                value={soundType}
                onChange={(e) => setSoundType(e.target.value as MetronomeSound)}
              >
                <option value="click">Digital Click</option>
                <option value="woodblock">Wood Block</option>
                <option value="tick">Mechanical Tick</option>
                <option value="beep">Soft Beep</option>
              </select>
            </label>
          </div>
        </div>

        <div className="precision-metro__stage">
          <section className="precision-metro__pendulum">
            <svg
              viewBox="0 0 320 392"
              role="img"
              aria-label="Metronome pendulum swinging in time with the tempo"
            >
              <path
                className="precision-metro__body"
                d="M50 30H270Q280 30 281 40L313 372Q314 382 304 382H16Q6 382 7 372L39 40Q40 30 50 30Z"
              />
              <path
                className="precision-metro__arc"
                d="M52.1 85A288 288 0 0 1 267.9 85"
              />
              <path className="precision-metro__tick" d="M160 50v12" />
              <circle
                ref={precisionLeftGlowRef}
                className="precision-metro__lamp"
                cx="52.1"
                cy="85"
                r="15"
                opacity="0"
              />
              <circle
                className="precision-metro__peg"
                cx="52.1"
                cy="85"
                r="6.5"
              />
              <circle
                ref={precisionLeftLampRef}
                className="precision-metro__lamp"
                cx="52.1"
                cy="85"
                r="6.5"
                opacity="0"
              />
              <circle
                ref={precisionRightGlowRef}
                className="precision-metro__lamp"
                cx="267.9"
                cy="85"
                r="15"
                opacity="0"
              />
              <circle
                className="precision-metro__peg"
                cx="267.9"
                cy="85"
                r="6.5"
              />
              <circle
                ref={precisionRightLampRef}
                className="precision-metro__lamp"
                cx="267.9"
                cy="85"
                r="6.5"
                opacity="0"
              />
              <g ref={precisionArmRef} transform="translate(160 352)">
                <rect
                  className="precision-metro__rod"
                  x="-2.5"
                  y="-288"
                  width="5"
                  height="316"
                  rx="2.5"
                />
                <circle
                  className="precision-metro__counterweight"
                  cy="22"
                  r="8"
                />
                <g aria-hidden="true">
                  {precisionScale.map(([value, major]) => {
                    const y = -precisionDistance(value);
                    return (
                      <g key={value}>
                        <line
                          className="precision-metro__tick"
                          x1="-3"
                          x2={major ? "-11" : "-7"}
                          y1={y}
                          y2={y}
                        />
                        {major && precisionScaleLabels.includes(value) && (
                          <text
                            className="precision-metro__scale-label"
                            x="-15"
                            y={y + 3}
                            textAnchor="end"
                          >
                            {value}
                          </text>
                        )}
                      </g>
                    );
                  })}
                </g>
                <g
                  ref={precisionWeightRef}
                  data-y={precisionDistance(bpm)}
                  transform={`translate(0 ${-precisionDistance(bpm)})`}
                >
                  <rect
                    className="precision-metro__weight"
                    x="-17"
                    y="-15"
                    width="34"
                    height="30"
                    rx="6"
                  />
                  <rect
                    className="precision-metro__weight-line"
                    x="-17"
                    y="-1.5"
                    width="34"
                    height="3"
                  />
                </g>
              </g>
              <circle
                className="precision-metro__pivot"
                cx="160"
                cy="352"
                r="9"
              />
            </svg>
          </section>

          <section className="precision-metro__controls">
            <div
              className="precision-metro__beats"
              aria-label="Beats in the bar"
            >
              {Array.from({ length: beatsInBar }, (_, index) => {
                const isCurrent = isPlaying && currentBeat === index;
                return (
                  <div
                    key={index}
                    className={`precision-metro__beat${
                      isCurrent ? " is-current" : ""
                    }${isCurrent && index === 0 ? " is-accent" : ""}${
                      isSilentBar ? " is-muted" : ""
                    }`}
                  >
                    {String(index + 1).padStart(2, "0")}
                  </div>
                );
              })}
            </div>

            <div className="precision-metro__bpm-row">
              <button
                className="precision-metro__step"
                onClick={() => adjustBpm(-1)}
                aria-label="Decrease tempo"
              >
                −
              </button>
              <div className="precision-metro__bpm-display">
                <input
                  value={tempoInput}
                  inputMode="numeric"
                  maxLength={3}
                  aria-label="Tempo in BPM"
                  onChange={(e) => setTempoInput(e.target.value)}
                  onBlur={commitTempoInput}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") e.currentTarget.blur();
                    if (e.key === "ArrowUp" || e.key === "ArrowDown") {
                      e.preventDefault();
                      adjustBpm(e.key === "ArrowUp" ? 1 : -1);
                    }
                  }}
                />
                <small>BPM</small>
              </div>
              <button
                className="precision-metro__step"
                onClick={() => adjustBpm(1)}
                aria-label="Increase tempo"
              >
                +
              </button>
            </div>

            <div className="precision-metro__mark">{mark}</div>
            <button
              className={`precision-metro__start${
                isPlaying ? " is-playing" : ""
              }`}
              onClick={togglePlay}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                {isPlaying ? (
                  <rect
                    x="6"
                    y="6"
                    width="12"
                    height="12"
                    rx="2"
                    fill="currentColor"
                  />
                ) : (
                  <path d="M7 4.5v15l13-7.5z" fill="currentColor" />
                )}
              </svg>
              <span>{isPlaying ? "STOP METRONOME" : "START METRONOME"}</span>
              <i ref={precisionDotRef} />
            </button>
            <p
              className="precision-metro__status"
              role="status"
              aria-live="polite"
            >
              {isPlaying
                ? barCycleMode && isSilentBar
                  ? "Silent bar · keep the pulse"
                  : `Playing · ${timeSignature} · ${bpm} BPM`
                : "Ready when you are"}
            </p>
          </section>
        </div>

        <section className="precision-metro__footer">
          <span className="precision-metro__label">TEMPO PRESETS</span>
          <div className="precision-metro__presets">
            {tempoPresets.map((preset) => (
              <button
                key={preset}
                className={`precision-metro__preset${
                  bpm === preset ? " is-selected" : ""
                }`}
                onClick={() => onBpmChange(preset)}
              >
                {preset}
              </button>
            ))}
          </div>

          <div className="precision-metro__lower-controls">
            <div className="precision-metro__fine">
              <div className="precision-metro__label">
                <span>FINE TUNE</span>
                <b>{bpm} BPM</b>
              </div>
              <input
                type="range"
                min="20"
                max="300"
                step="1"
                value={bpm}
                aria-label="Fine tune tempo"
                style={
                  {
                    "--precision-progress": `${((bpm - 20) / 280) * 100}%`,
                  } as React.CSSProperties
                }
                onChange={(e) => onBpmChange(Number(e.target.value))}
              />
              <div className="precision-metro__range-labels">
                <span>20</span>
                <span>300 BPM</span>
              </div>
            </div>

            <div className="precision-metro__tools">
              <div
                className="precision-metro__segmented"
                role="group"
                aria-label="Subdivision"
              >
                {[
                  { id: "quarter", label: "1/4" },
                  { id: "eighth", label: "1/8" },
                  { id: "sixteenth", label: "1/16" },
                  { id: "triplet", label: "3" },
                ].map((item) => (
                  <button
                    key={item.id}
                    className={
                      subdivision === item.id ? "is-selected" : undefined
                    }
                    title={
                      item.id === "quarter"
                        ? "Beats only"
                        : item.id === "triplet"
                          ? "Triplet: three clicks per beat"
                          : `Subdivision: ${item.label}`
                    }
                    onClick={() =>
                      setSubdivision(item.id as MetronomeSubdivision)
                    }
                  >
                    {item.label}
                  </button>
                ))}
              </div>
              <button
                className="precision-metro__tool"
                title="Tap along to set the tempo"
                onClick={handleTapTempo}
              >
                <span className="precision-metro__tap">T</span>
                Tap tempo
              </button>
              <button
                className={`precision-metro__tool${
                  barCycleMode ? " is-pressed" : ""
                }`}
                aria-pressed={barCycleMode}
                title="Alternate one audible bar with one silent bar"
                onClick={() => {
                  const next = !barCycleMode;
                  audioEngine.setMetronomeBarCycle(next);
                  audioEngine.resetMetronomePosition();
                  setIsSilentBar(false);
                  setBarCycleMode(next);
                }}
              >
                <Repeat2 size={17} />
                Mute 1 bar
              </button>
            </div>
          </div>
        </section>
      </div>
    );
  }

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
      <div className="box-content mt-auto flex min-h-11 flex-wrap justify-between items-end pt-2 border-t border-outline-variant/10 gap-2">
        <div className="flex flex-wrap items-end gap-2 flex-1">
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
              setIsSilentBar(false);
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
