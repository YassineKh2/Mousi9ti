import React, { useState, useRef, useEffect, useMemo } from "react";
import {
  NoteDisplayMode,
  NoteName,
  ScaleDefinition,
  Tuning,
  AppSettings,
} from "../types";
import {
  ALL_ROOT_NOTES,
  SCALES_DATABASE,
  GUITAR_TUNINGS,
  NOTE_SEMITONES,
  CHROMATIC_SHARPS,
  getScaleNotes,
  getSpelledNote,
} from "../data/musicTheory";
import { Fretboard } from "../components/Fretboard";
import { PianoKeyboard } from "../components/PianoKeyboard";
import { audioEngine } from "../lib/audio";
import {
  Volume2,
  Box,
  Guitar,
  Piano,
  Layers,
  ChevronDown,
  Search,
  Check,
  X,
  ArrowUpRight,
  ArrowDownRight,
  ArrowUpDown,
  Square,
} from "lucide-react";

type PlaybackDirection = "ascending" | "descending" | "both";

interface ScalesPageProps {
  initialScaleTarget?: { scaleId: string; root: NoteName } | null;
  onInitialScaleHandled?: () => void;
  settings: AppSettings;
}

export const ScalesPage: React.FC<ScalesPageProps> = ({
  initialScaleTarget,
  onInitialScaleHandled,
  settings,
}) => {
  // Get tuning from settings
  const defaultTuning = useMemo(() => {
    return (
      GUITAR_TUNINGS.find((t) => t.name === settings.defaultTuning) ??
      GUITAR_TUNINGS[0]
    );
  }, [settings.defaultTuning]);

  const [selectedRoot, setSelectedRoot] = useState<NoteName>("A");
  const [selectedScale, setSelectedScale] = useState<ScaleDefinition>(
    SCALES_DATABASE[4],
  ); // A Minor Pentatonic
  const [displayMode, setDisplayMode] = useState<NoteDisplayMode>("name");
  const [currentTuning, setCurrentTuning] = useState<Tuning>(defaultTuning);
  const [fretCount, setFretCount] = useState<number>(settings.fretCount);
  const [activeCagedBox, setActiveCagedBox] = useState<string | null>(null);
  const [pianoFocusRange, setPianoFocusRange] = useState<
    "all" | "octave4" | "octave3" | "octave34"
  >("octave4");
  const [instrumentView, setInstrumentView] = useState<
    "guitar" | "piano" | "both"
  >(settings.defaultInstrument);

  useEffect(() => {
    setInstrumentView(settings.defaultInstrument);
  }, [settings.defaultInstrument]);

  // Scale Playback Direction & Animation State
  const [playDirection, setPlayDirection] =
    useState<PlaybackDirection>("ascending");
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [activePlayingNote, setActivePlayingNote] = useState<string | null>(
    null,
  );
  const [activePlayingOctave, setActivePlayingOctave] = useState<number | null>(
    null,
  );
  const [activePlayingString, setActivePlayingString] = useState<number | null>(
    null,
  );
  const [activePlayingFret, setActivePlayingFret] = useState<number | null>(
    null,
  );
  const [isPlayMenuOpen, setIsPlayMenuOpen] = useState<boolean>(false);
  const playbackTimeoutsRef = useRef<number[]>([]);

  // Direct Selection Menus State
  const [isRootMenuOpen, setIsRootMenuOpen] = useState<boolean>(false);
  const [isScaleMenuOpen, setIsScaleMenuOpen] = useState<boolean>(false);
  const [scaleSearchQuery, setScaleSearchQuery] = useState<string>("");
  const [scaleMenuCategory, setScaleMenuCategory] = useState<string>("All");

  const rootMenuRef = useRef<HTMLDivElement>(null);
  const scaleMenuRef = useRef<HTMLDivElement>(null);
  const playMenuRef = useRef<HTMLDivElement>(null);

  const scaleCategories = [
    "Major & Minor",
    "Pentatonic & Blues",
    "Modes",
    "Symmetrical & Exotic",
  ] as const;

  // Stop scale playback helper
  const stopScalePlayback = () => {
    playbackTimeoutsRef.current.forEach((id) => clearTimeout(id));
    playbackTimeoutsRef.current = [];
    setIsPlaying(false);
    setActivePlayingNote(null);
    setActivePlayingOctave(null);
    setActivePlayingString(null);
    setActivePlayingFret(null);
  };

  // Sync fretCount from settings when it changes
  useEffect(() => {
    setFretCount(settings.fretCount);
  }, [settings.fretCount]);

  // Sync tuning from settings when it changes
  useEffect(() => {
    const newTuning =
      GUITAR_TUNINGS.find((t) => t.name === settings.defaultTuning) ??
      GUITAR_TUNINGS[0];
    setCurrentTuning(newTuning);
  }, [settings.defaultTuning]);

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        rootMenuRef.current &&
        !rootMenuRef.current.contains(event.target as Node)
      ) {
        setIsRootMenuOpen(false);
      }
      if (
        scaleMenuRef.current &&
        !scaleMenuRef.current.contains(event.target as Node)
      ) {
        setIsScaleMenuOpen(false);
      }
      if (
        playMenuRef.current &&
        !playMenuRef.current.contains(event.target as Node)
      ) {
        setIsPlayMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Cancel playback if unmounting or selecting a different scale/root/box/piano range
  useEffect(() => {
    stopScalePlayback();
    return () => {
      playbackTimeoutsRef.current.forEach((id) => clearTimeout(id));
    };
  }, [selectedRoot, selectedScale, activeCagedBox, pianoFocusRange]);

  useEffect(() => {
    if (!initialScaleTarget) return;
    const found = SCALES_DATABASE.find(
      (s) => s.id === initialScaleTarget.scaleId,
    );
    if (found) {
      setSelectedRoot(initialScaleTarget.root);
      setSelectedScale(found);
      setActiveCagedBox(null);
      setScaleSearchQuery("");
      setScaleMenuCategory("All");
      setIsScaleMenuOpen(false);
      setIsRootMenuOpen(false);
      setIsPlayMenuOpen(false);
    }
    onInitialScaleHandled?.();
  }, [initialScaleTarget, onInitialScaleHandled]);

  const scaleNotes = getScaleNotes(selectedRoot, selectedScale);

  // Piano Focused Range Definition
  const pianoFocusRangeObj = useMemo(() => {
    if (pianoFocusRange === "all") return null;
    if (pianoFocusRange === "octave4") {
      return {
        startNote: selectedRoot,
        startOctave: 4,
        endNote: selectedRoot,
        endOctave: 5,
      };
    }
    if (pianoFocusRange === "octave3") {
      return {
        startNote: selectedRoot,
        startOctave: 3,
        endNote: selectedRoot,
        endOctave: 4,
      };
    }
    if (pianoFocusRange === "octave34") {
      return {
        startNote: selectedRoot,
        startOctave: 3,
        endNote: selectedRoot,
        endOctave: 5,
      };
    }
    return null;
  }, [pianoFocusRange, selectedRoot]);

  // Play scale ascending, descending, or both (incorporating CAGED shape or Piano Focus if selected)
  const handlePlayScale = (direction: PlaybackDirection = playDirection) => {
    stopScalePlayback();
    setIsPlaying(true);

    const playingInstrument = instrumentView;
    const baseOctave = playingInstrument === "piano" ? 4 : 3;
    const rootSemitone = NOTE_SEMITONES[selectedRoot] ?? 0;
    const scaleSemitones = new Set(
      selectedScale.intervals.map((iv) => (rootSemitone + iv) % 12),
    );

    let playSequence: {
      note: NoteName;
      octave: number;
      stringIdx?: number;
      fretNum?: number;
    }[] = [];

    // 1. If a CAGED box pattern / shape is selected (on Guitar or Both view), play only the notes in that shape
    if (
      (playingInstrument === "guitar" || playingInstrument === "both") &&
      activeCagedBox &&
      selectedScale.cagedBoxes &&
      selectedScale.cagedBoxes[activeCagedBox]
    ) {
      const box = selectedScale.cagedBoxes[activeCagedBox];
      const lowestStringNote = currentTuning.strings[0];
      const lowestStringSemitone = NOTE_SEMITONES[lowestStringNote] ?? 4;
      const rootFretOnLowestString =
        (rootSemitone - lowestStringSemitone + 12) % 12;

      const rawStartFret = rootFretOnLowestString + box.startFretOffset;
      const rawEndFret = rootFretOnLowestString + box.endFretOffset;

      // Find primary fret range on guitar neck (0 to 11 start)
      const k = -Math.floor(rawStartFret / 12);
      const primaryStart = rawStartFret + 12 * k;
      const primaryEnd = rawEndFret + 12 * k;

      const shapeNotes: {
        note: NoteName;
        octave: number;
        stringIdx: number;
        fretNum: number;
      }[] = [];

      // Traverse from lowest string (6th string, index 0) to highest string (1st string, index 5)
      for (
        let stringIdx = 0;
        stringIdx < currentTuning.strings.length;
        stringIdx++
      ) {
        const openNote = currentTuning.strings[stringIdx];
        const stringBaseOctave = currentTuning.octaves[stringIdx];
        const openSemitone = NOTE_SEMITONES[openNote] ?? 0;

        for (
          let fret = Math.max(0, primaryStart);
          fret <= Math.min(fretCount, primaryEnd);
          fret++
        ) {
          const currentSemitone = (openSemitone + fret) % 12;
          if (scaleSemitones.has(currentSemitone)) {
            const noteName = getSpelledNote(currentSemitone, {
              root: selectedRoot,
              scale: selectedScale,
            });
            const totalSemitonesFromOpen = openSemitone + fret;
            const octave =
              stringBaseOctave +
              Math.floor(totalSemitonesFromOpen / 12) -
              Math.floor(openSemitone / 12);
            shapeNotes.push({
              note: noteName,
              octave,
              stringIdx,
              fretNum: fret,
            });
          }
        }
      }

      if (shapeNotes.length > 0) {
        if (direction === "ascending") {
          playSequence = shapeNotes;
        } else if (direction === "descending") {
          playSequence = [...shapeNotes].reverse();
        } else if (direction === "both") {
          playSequence = [...shapeNotes, ...shapeNotes.slice(0, -1).reverse()];
        }
      }
    }

    // 2. If no CAGED shape is active and Piano Focus Range is enabled (on Piano or Both view), play that focused range
    if (
      playSequence.length === 0 &&
      (playingInstrument === "piano" || playingInstrument === "both") &&
      pianoFocusRange !== "all"
    ) {
      const startOct = pianoFocusRange === "octave4" ? 4 : 3;
      const numOctaves = pianoFocusRange === "octave34" ? 2 : 1;
      const pianoSequence: { note: NoteName; octave: number }[] = [];

      for (let o = 0; o < numOctaves; o++) {
        const curBaseOct = startOct + o;
        selectedScale.intervals.forEach((interval) => {
          const semitonesTotal = rootSemitone + interval;
          const noteName = getSpelledNote(semitonesTotal % 12, {
            root: selectedRoot,
            scale: selectedScale,
          });
          const octaveOffset = Math.floor(semitonesTotal / 12);
          pianoSequence.push({
            note: noteName,
            octave: curBaseOct + octaveOffset,
          });
        });
      }

      // Top closing root note
      const finalOct = startOct + numOctaves;
      pianoSequence.push({
        note: selectedRoot,
        octave: finalOct,
      });

      if (direction === "ascending") {
        playSequence = pianoSequence;
      } else if (direction === "descending") {
        playSequence = [...pianoSequence].reverse();
      } else if (direction === "both") {
        playSequence = [
          ...pianoSequence,
          ...pianoSequence.slice(0, -1).reverse(),
        ];
      }
    }

    // Default full scale playback if no shape is selected or shape produced no notes
    if (playSequence.length === 0) {
      const fullScaleWithOctaves: { note: NoteName; octave: number }[] = [];
      selectedScale.intervals.forEach((interval) => {
        const semitonesTotal = rootSemitone + interval;
        const noteName = getSpelledNote(semitonesTotal % 12, {
          root: selectedRoot,
          scale: selectedScale,
        });
        const octaveOffset = Math.floor(semitonesTotal / 12);
        fullScaleWithOctaves.push({
          note: noteName,
          octave: baseOctave + octaveOffset,
        });
      });

      // Top root note (1 octave higher)
      const topRootSemitones = rootSemitone + 12;
      fullScaleWithOctaves.push({
        note: selectedRoot,
        octave: baseOctave + Math.floor(topRootSemitones / 12),
      });

      if (direction === "ascending") {
        playSequence = fullScaleWithOctaves;
      } else if (direction === "descending") {
        playSequence = [...fullScaleWithOctaves].reverse();
      } else if (direction === "both") {
        playSequence = [
          ...fullScaleWithOctaves,
          ...fullScaleWithOctaves.slice(0, -1).reverse(),
        ];
      }
    }

    const noteDurationSec = 1.2;
    const noteStepMs = 280;

    playSequence.forEach((item, idx) => {
      const tId = window.setTimeout(() => {
        setActivePlayingNote(item.note);
        setActivePlayingOctave(item.octave);
        setActivePlayingString(item.stringIdx ?? null);
        setActivePlayingFret(item.fretNum ?? null);

        if (playingInstrument === "piano" || playingInstrument === "both") {
          audioEngine.playPianoNote(item.note, item.octave, noteDurationSec);
        }
        if (playingInstrument === "guitar" || playingInstrument === "both") {
          audioEngine.playGuitarPluck(item.note, item.octave, noteDurationSec);
        }

        // If last note in sequence, wrap up playing state
        if (idx === playSequence.length - 1) {
          const finishTId = window.setTimeout(() => {
            setIsPlaying(false);
            setActivePlayingNote(null);
            setActivePlayingOctave(null);
            setActivePlayingString(null);
            setActivePlayingFret(null);
          }, noteStepMs);
          playbackTimeoutsRef.current.push(finishTId);
        }
      }, idx * noteStepMs);

      playbackTimeoutsRef.current.push(tId);
    });
  };

  // Filter scales for the search dropdown
  const filteredModalScales = SCALES_DATABASE.filter((s) => {
    const matchesCategory =
      scaleMenuCategory === "All" || s.category === scaleMenuCategory;
    const matchesSearch =
      s.name.toLowerCase().includes(scaleSearchQuery.toLowerCase()) ||
      s.category.toLowerCase().includes(scaleSearchQuery.toLowerCase()) ||
      s.formula.toLowerCase().includes(scaleSearchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="space-y-4 sm:space-y-6 pb-8 sm:pb-12">
      {/* Selected Scale Detail Card (Formula, Degrees, CAGED boxes) */}
      <div data-tour="scales-panel" className="bg-surface-container border border-outline-variant/30 rounded-lg p-3 sm:p-6 shadow-xl space-y-4">
        <div className="flex flex-col items-stretch gap-3 pb-3 border-b border-outline-variant/30 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <div className="flex min-w-0 items-center gap-2 sm:flex-1 sm:gap-3">
            {/* Interactive Root Note Badge Selector */}
            <div className="relative" ref={rootMenuRef}>
              <button
                type="button"
                onClick={() => {
                  setIsRootMenuOpen((prev) => !prev);
                  setIsScaleMenuOpen(false);
                }}
                className="w-11 h-11 rounded-lg bg-primary text-on-primary flex flex-col items-center justify-center font-mono font-bold text-lg shadow-md transition-transform hover:scale-105 active:scale-95 group focus:outline-none focus:ring-2 focus:ring-primary/60 cursor-pointer"
                title="Click to change root note"
              >
                <span>{selectedRoot}</span>
                <span className="text-[8px] -mt-1 opacity-70 font-mono tracking-tighter group-hover:opacity-100 flex items-center">
                  ROOT <ChevronDown size={8} className="ml-0.5" />
                </span>
              </button>

              {/* Root Note Popover Dropdown */}
              {isRootMenuOpen && (
                <div className="absolute top-full left-0 mt-2 z-50 bg-surface border border-outline-variant/40 rounded-xl p-3 shadow-2xl w-60 animate-in fade-in zoom-in-95 duration-150">
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-outline-variant/20">
                    <span className="text-[11px] font-mono font-bold text-on-surface uppercase tracking-wider">
                      Select Root Note
                    </span>
                    <button
                      onClick={() => setIsRootMenuOpen(false)}
                      className="text-on-surface-variant hover:text-on-surface p-0.5 rounded"
                    >
                      <X size={14} />
                    </button>
                  </div>
                  <div className="grid grid-cols-4 gap-1.5">
                    {ALL_ROOT_NOTES.map((note) => {
                      const isSelected = selectedRoot === note;
                      return (
                        <button
                          key={note}
                          type="button"
                          onClick={() => {
                            setSelectedRoot(note);
                            setIsRootMenuOpen(false);
                          }}
                          className={`h-9 rounded font-mono text-xs font-bold transition-all flex items-center justify-center ${
                            isSelected
                              ? "bg-primary text-on-primary shadow-sm scale-105"
                              : "bg-surface-container hover:bg-surface-container-high text-on-surface border border-outline-variant/30 hover:border-primary/50"
                          }`}
                        >
                          {note}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Interactive Scale Name Dropdown Selector */}
            <div className="relative min-w-0 flex-1" ref={scaleMenuRef}>
              <button
                type="button"
                onClick={() => {
                  setIsScaleMenuOpen((prev) => !prev);
                  setIsRootMenuOpen(false);
                }}
                className="group w-full min-w-0 max-w-full text-left px-2 py-1 -ml-2 rounded-lg hover:bg-surface-container-high transition-colors focus:outline-none focus:ring-1 focus:ring-primary/40 cursor-pointer"
                title="Click to select another scale"
              >
                <div className="flex items-center gap-1.5">
                  <h2 className="font-mono text-base sm:text-lg font-bold text-on-surface group-hover:text-primary transition-colors flex min-w-0 items-center gap-1.5">
                    <span className="truncate">
                      {selectedRoot} {selectedScale.name}
                    </span>
                    <ChevronDown
                      size={18}
                      className="text-on-surface-variant group-hover:text-primary transition-transform duration-200 group-hover:translate-y-0.5"
                    />
                  </h2>
                </div>
                <div className="mt-0.5 flex flex-wrap items-center gap-2">
                  <span className="text-xs font-mono text-on-surface-variant">
                    Formula:{" "}
                    <strong className="text-on-surface">
                      {selectedScale.formula}
                    </strong>
                  </span>
                  <span className="inline-flex w-fit shrink-0 rounded bg-surface-container-low px-1.5 py-0.5 text-[10px] font-mono text-on-surface-variant border border-outline-variant/30">
                    {selectedScale.category}
                  </span>
                </div>
              </button>

              {/* Comprehensive Scale Picker Popover */}
              {isScaleMenuOpen && (
                <div className="absolute top-full left-1/2 right-auto -translate-x-1/2 -ml-6 mt-2 z-50 bg-surface border border-outline-variant/40 rounded-xl p-3 shadow-2xl w-[calc(100vw-1rem)] max-w-[320px] sm:left-0 sm:right-auto sm:translate-x-0 sm:ml-0 sm:w-105 sm:max-w-none animate-in fade-in zoom-in-95 duration-150">
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-outline-variant/20">
                    <span className="text-[11px] font-mono font-bold text-on-surface uppercase tracking-wider">
                      Select Scale or Mode
                    </span>
                    <button
                      onClick={() => setIsScaleMenuOpen(false)}
                      className="text-on-surface-variant hover:text-on-surface p-0.5 rounded"
                    >
                      <X size={14} />
                    </button>
                  </div>

                  {/* Search bar inside scale popover */}
                  <div className="relative mb-2.5">
                    <Search
                      size={14}
                      className="absolute left-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant"
                    />
                    <input
                      type="text"
                      placeholder="Search scale name or category..."
                      value={scaleSearchQuery}
                      onChange={(e) => setScaleSearchQuery(e.target.value)}
                      className="w-full bg-surface-container-low border border-outline-variant/40 rounded-lg pl-8 pr-7 py-1.5 text-xs font-mono text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary"
                      autoFocus
                    />
                    {scaleSearchQuery && (
                      <button
                        onClick={() => setScaleSearchQuery("")}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface p-0.5"
                      >
                        <X size={12} />
                      </button>
                    )}
                  </div>

                  {/* Category Pills inside Popover */}
                  <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pb-2 mb-2 border-b border-outline-variant/10">
                    {["All", ...scaleCategories].map((cat) => (
                      <button
                        key={cat}
                        onClick={() => setScaleMenuCategory(cat)}
                        className={`px-2.5 py-1 rounded-full text-[11px] font-mono whitespace-nowrap transition-all ${
                          scaleMenuCategory === cat
                            ? "bg-primary text-on-primary font-bold"
                            : "bg-surface-container text-on-surface-variant hover:text-on-surface border border-outline-variant/20"
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>

                  {/* Filtered Scales List */}
                  <div className="max-h-60 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                    {filteredModalScales.length === 0 ? (
                      <div className="p-4 text-center text-xs font-mono text-on-surface-variant">
                        No scales found matching "{scaleSearchQuery}"
                      </div>
                    ) : (
                      filteredModalScales.map((s) => {
                        const isSelected = selectedScale.id === s.id;
                        return (
                          <button
                            key={s.id}
                            onClick={() => {
                              setSelectedScale(s);
                              setActiveCagedBox(null);
                              setIsScaleMenuOpen(false);
                            }}
                            className={`w-full flex items-center justify-between p-2 rounded-lg text-left transition-all ${
                              isSelected
                                ? "bg-primary/15 text-primary font-bold border border-primary/40"
                                : "hover:bg-surface-container-high text-on-surface"
                            }`}
                          >
                            <div className="flex flex-col min-w-0 pr-2">
                              <span className="font-mono text-xs font-semibold truncate">
                                {s.name}
                              </span>
                              <span className="text-[10px] font-mono text-on-surface-variant opacity-75 truncate">
                                {s.formula} • {s.category}
                              </span>
                            </div>
                            {isSelected && (
                              <Check
                                size={15}
                                className="text-primary shrink-0"
                              />
                            )}
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between gap-2 flex-nowrap sm:justify-end">
            {/* Note Label Display Mode */}
            <div className="flex h-10 min-w-0 flex-1 items-stretch gap-1 overflow-x-auto rounded-lg border border-outline-variant/30 bg-surface-container-low p-1">
              {(["name", "degree", "interval"] as NoteDisplayMode[]).map(
                (mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setDisplayMode(mode)}
                    className={`flex min-w-max flex-1 items-center justify-center rounded px-2 text-[10px] font-mono uppercase tracking-wider transition-colors ${
                      displayMode === mode
                        ? "bg-primary text-on-primary font-semibold shadow-sm"
                        : "text-on-surface-variant hover:bg-outline-variant/10 hover:text-on-surface"
                    }`}
                  >
                    {mode === "name"
                      ? "Note Name"
                      : mode === "degree"
                        ? "Degrees (1 3 5)"
                        : "Intervals (R M3)"}
                  </button>
                ),
              )}
            </div>

            {/* Instrument Toggle (Guitar / Piano / Both) */}
            <div className="flex items-center gap-1 bg-surface-container-low p-1 rounded-lg border border-outline-variant/30">
              <button
                type="button"
                onClick={() => setInstrumentView("guitar")}
                aria-label="Guitar view"
                title="Guitar view"
                className={`w-8 sm:w-auto h-8 px-0 sm:px-2 flex items-center justify-center gap-1.5 text-xs font-mono rounded transition-all cursor-pointer ${
                  instrumentView === "guitar"
                    ? "bg-primary text-on-primary font-bold shadow"
                    : "text-on-surface-variant hover:text-on-surface"
                }`}
              >
                <Guitar size={14} />
                <span className="hidden sm:inline">Guitar</span>
              </button>

              <button
                type="button"
                onClick={() => setInstrumentView("piano")}
                aria-label="Piano view"
                title="Piano view"
                className={`w-8 sm:w-auto h-8 px-0 sm:px-2 flex items-center justify-center gap-1.5 text-xs font-mono rounded transition-all cursor-pointer ${
                  instrumentView === "piano"
                    ? "bg-primary text-on-primary font-bold shadow"
                    : "text-on-surface-variant hover:text-on-surface"
                }`}
              >
                <Piano size={14} />
                <span className="hidden sm:inline">Piano</span>
              </button>

              <button
                type="button"
                onClick={() => setInstrumentView("both")}
                aria-label="Guitar and piano view"
                title="Guitar and piano view"
                className={`w-8 sm:w-auto h-8 px-0 sm:px-2 flex items-center justify-center gap-1.5 text-xs font-mono rounded transition-all cursor-pointer ${
                  instrumentView === "both"
                    ? "bg-primary text-on-primary font-bold shadow"
                    : "text-on-surface-variant hover:text-on-surface"
                }`}
              >
                <Layers size={14} />
                <span className="hidden sm:inline">Both</span>
              </button>
            </div>

            {/* Play Scale with Integrated Direction Dropdown */}
            <div
              className="relative inline-flex min-w-0 items-center"
              ref={playMenuRef}
            >
              {isPlaying ? (
                <button
                  type="button"
                  onClick={stopScalePlayback}
                  className="flex items-center gap-2 bg-error hover:bg-error-container text-on-error font-mono text-xs font-bold px-4 py-2 rounded-lg shadow-md transition-all active:scale-95 cursor-pointer"
                >
                  <Square size={13} fill="currentColor" />
                  <span>STOP</span>
                </button>
              ) : (
                <div className="inline-flex rounded-lg shadow-md bg-primary text-on-primary">
                  <button
                    type="button"
                    onClick={() => handlePlayScale(playDirection)}
                    className="flex items-center gap-2 bg-primary hover:bg-primary-container text-on-primary font-mono text-xs font-bold pl-4 pr-3 py-2 rounded-l-lg transition-all active:scale-95 cursor-pointer border-r border-on-primary/20"
                    title={`Play ${playDirection === "ascending" ? "Ascending" : playDirection === "descending" ? "Descending" : "Ascending & Descending"}`}
                  >
                    <Volume2 size={15} />
                    <span className="sm:hidden">PLAY</span>
                    <span className="hidden sm:inline">
                      PLAY{" "}
                      {playDirection === "ascending"
                        ? "ASCENDING"
                        : playDirection === "descending"
                          ? "DESCENDING"
                          : "ASC & DESC"}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsPlayMenuOpen((prev) => !prev)}
                    className="px-2.5 py-2 bg-primary hover:bg-primary-container text-on-primary rounded-r-lg transition-all active:scale-95 cursor-pointer flex items-center justify-center focus:outline-none"
                    title="Change Playback Order (Ascending, Descending, Both)"
                  >
                    <ChevronDown
                      size={14}
                      className={`transition-transform duration-200 ${isPlayMenuOpen ? "rotate-180" : ""}`}
                    />
                  </button>
                </div>
              )}

              {/* Playback Direction Dropdown Menu */}
              {isPlayMenuOpen && (
                <div className="absolute right-0 top-full mt-2 z-50 bg-surface border border-outline-variant/40 rounded-xl p-2 shadow-2xl w-60 animate-in fade-in zoom-in-95 duration-150">
                  <div className="text-[10px] font-mono font-bold text-on-surface-variant uppercase px-2.5 py-1 border-b border-outline-variant/20 mb-1">
                    Select Playback Order
                  </div>
                  <div className="space-y-1">
                    {[
                      {
                        id: "ascending" as PlaybackDirection,
                        label: "Ascending",
                        sub: "Low to High (1 → 8)",
                        icon: ArrowUpRight,
                      },
                      {
                        id: "descending" as PlaybackDirection,
                        label: "Descending",
                        sub: "High to Low (8 → 1)",
                        icon: ArrowDownRight,
                      },
                      {
                        id: "both" as PlaybackDirection,
                        label: "Asc & Desc",
                        sub: "Up & down continuous",
                        icon: ArrowUpDown,
                      },
                    ].map((opt) => {
                      const isSelected = playDirection === opt.id;
                      const Icon = opt.icon;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => {
                            setPlayDirection(opt.id);
                            setIsPlayMenuOpen(false);
                            handlePlayScale(opt.id);
                          }}
                          className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-left font-mono text-xs transition-colors cursor-pointer ${
                            isSelected
                              ? "bg-secondary/20 text-secondary font-bold"
                              : "text-on-surface hover:bg-surface-container-high"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <Icon
                              size={14}
                              className={
                                isSelected
                                  ? "text-secondary"
                                  : "text-on-surface-variant"
                              }
                            />
                            <div>
                              <div className="font-semibold leading-tight">
                                {opt.label}
                              </div>
                              <div className="text-[10px] opacity-70 font-normal">
                                {opt.sub}
                              </div>
                            </div>
                          </div>
                          {isSelected && (
                            <Check
                              size={14}
                              className="text-secondary shrink-0 ml-1"
                            />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Notes & Degrees Table */}
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-3">
          {scaleNotes.map((sn, idx) => {
            const isRoot = idx === 0;
            const isCurrentlyPlaying = activePlayingNote === sn.note;
            return (
              <div
                key={sn.note + sn.degree}
                className={`rounded-lg p-3 flex flex-col items-center gap-1 shadow transition-all duration-150 ${
                  isCurrentlyPlaying
                    ? "scale-105 bg-secondary text-on-secondary shadow-lg"
                    : isRoot
                      ? "bg-secondary/20 text-secondary"
                      : "bg-surface-container-low text-on-surface"
                }`}
              >
                <span
                  className={`text-[10px] font-mono uppercase ${isCurrentlyPlaying ? "text-on-secondary/80" : "text-on-surface-variant"}`}
                >
                  {isRoot ? "Root (1)" : `Degree ${sn.degree}`}
                </span>
                <span
                  className={`font-mono text-xl font-bold ${isCurrentlyPlaying ? "text-on-secondary font-black" : isRoot ? "text-secondary" : "text-on-surface"}`}
                >
                  {sn.note}
                </span>
                <span
                  className={`text-[10px] font-mono px-2 py-0.5 rounded ${isCurrentlyPlaying ? "bg-black/20 text-on-secondary font-semibold" : "bg-surface border border-outline-variant/40 text-on-surface-variant"}`}
                >
                  {sn.interval} ({sn.degree})
                </span>
              </div>
            );
          })}
        </div>

        {/* CAGED System Box Selector (Shown when Guitar or Both is chosen) */}
        {(instrumentView === "guitar" || instrumentView === "both") &&
          selectedScale.cagedBoxes && (
            <div className="pt-3 border-t border-outline-variant/30 space-y-2">
              <div className="flex items-start gap-2">
                <Box size={15} className="text-primary" />
                <span className="text-[11px] sm:text-xs font-mono font-bold text-on-surface uppercase tracking-wider leading-5">
                  CAGED Box Patterns (Guitar):
                </span>
              </div>

              <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:flex-wrap">
                <button
                  onClick={() => setActiveCagedBox(null)}
                  className={`w-full px-3 py-2 text-left sm:w-auto sm:py-1.5 rounded font-mono text-xs transition-all cursor-pointer ${
                    activeCagedBox === null
                      ? "bg-primary text-on-primary font-bold"
                      : "bg-surface-container-low text-on-surface-variant hover:text-on-surface border border-outline-variant/30"
                  }`}
                >
                  Entire Fretboard (Full View)
                </button>

                {Object.keys(selectedScale.cagedBoxes).map((boxKey) => (
                  <button
                    key={boxKey}
                    onClick={() => setActiveCagedBox(boxKey)}
                    className={`w-full px-3 py-2 text-left sm:w-auto sm:py-1.5 rounded font-mono text-xs transition-all cursor-pointer ${
                      activeCagedBox === boxKey
                        ? "bg-primary text-on-primary font-bold"
                        : "bg-surface-container-low text-on-surface-variant hover:text-on-surface border border-outline-variant/30"
                    }`}
                  >
                    {boxKey}
                  </button>
                ))}
              </div>
            </div>
          )}

        {/* Piano Visible Range / Scale Span Focus (Shown when Piano or Both is chosen) */}
        {(instrumentView === "piano" || instrumentView === "both") && (
          <div className="pt-3 border-t border-outline-variant/30 space-y-2">
            <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-2">
                <Piano size={15} className="text-primary" />
                <span className="text-[11px] sm:text-xs font-mono font-bold text-on-surface uppercase tracking-wider leading-5">
                  Piano Visible Range (Scale Focus):
                </span>
              </div>
              <span className="text-[11px] font-mono text-on-surface-variant hidden sm:inline">
                Dims notes outside active range (e.g. before {selectedRoot}4 &
                after {selectedRoot}5)
              </span>
            </div>

            <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:flex-wrap">
              <button
                onClick={() => setPianoFocusRange("octave4")}
                className={`w-full px-3 py-2 text-left sm:w-auto sm:py-1.5 rounded font-mono text-xs transition-all cursor-pointer ${
                  pianoFocusRange === "octave4"
                    ? "bg-primary text-on-primary font-bold"
                    : "bg-surface-container-low text-on-surface-variant hover:text-on-surface border border-outline-variant/30"
                }`}
              >
                Focus {selectedRoot}4 – {selectedRoot}5 (1 Octave)
              </button>

              <button
                onClick={() => setPianoFocusRange("octave3")}
                className={`w-full px-3 py-2 text-left sm:w-auto sm:py-1.5 rounded font-mono text-xs transition-all cursor-pointer ${
                  pianoFocusRange === "octave3"
                    ? "bg-primary text-on-primary font-bold"
                    : "bg-surface-container-low text-on-surface-variant hover:text-on-surface border border-outline-variant/30"
                }`}
              >
                Focus {selectedRoot}3 – {selectedRoot}4 (1 Octave)
              </button>

              <button
                onClick={() => setPianoFocusRange("octave34")}
                className={`w-full px-3 py-2 text-left sm:w-auto sm:py-1.5 rounded font-mono text-xs transition-all cursor-pointer ${
                  pianoFocusRange === "octave34"
                    ? "bg-primary text-on-primary font-bold"
                    : "bg-surface-container-low text-on-surface-variant hover:text-on-surface border border-outline-variant/30"
                }`}
              >
                Focus {selectedRoot}3 – {selectedRoot}5 (2 Octaves)
              </button>

              <button
                onClick={() => setPianoFocusRange("all")}
                className={`w-full px-3 py-2 text-left sm:w-auto sm:py-1.5 rounded font-mono text-xs transition-all cursor-pointer ${
                  pianoFocusRange === "all"
                    ? "bg-primary text-on-primary font-bold"
                    : "bg-surface-container-low text-on-surface-variant hover:text-on-surface border border-outline-variant/30"
                }`}
              >
                Entire Keyboard (Full View)
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Fretboard Visualization */}
      <div data-tour="scales-fretboard">
      {(instrumentView === "guitar" || instrumentView === "both") && (
        <Fretboard
          tuning={currentTuning}
          onTuningChange={setCurrentTuning}
          fretCount={fretCount}
          onFretCountChange={setFretCount}
          selectedRoot={selectedRoot}
          selectedScale={selectedScale}
          activePlayingNote={activePlayingNote}
          activePlayingString={activePlayingString}
          activePlayingFret={activePlayingFret}
          displayMode={displayMode}
          onDisplayModeChange={setDisplayMode}
          activeCagedBox={activeCagedBox}
        />
      )}

      {/* Piano Visualizer Sync */}
      {(instrumentView === "piano" || instrumentView === "both") && (
        <PianoKeyboard
          selectedRoot={selectedRoot}
          selectedScale={selectedScale}
          activePlayingNote={activePlayingNote}
          activePlayingOctave={activePlayingOctave}
          displayMode={displayMode}
          focusRange={pianoFocusRangeObj}
        />
      )}
      </div>
    </div>
  );
};
