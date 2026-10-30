import React, { useMemo, useCallback, useState, useEffect } from "react";
import { NoteDisplayMode, NoteName, ScaleDefinition, Tuning } from "../../types";
import {
  CHROMATIC_SHARPS,
  GUITAR_TUNINGS,
  INTERVAL_NAMES_MAP,
  NOTE_SEMITONES,
  getScaleNotes,
  getSpelledNote,
} from "../../data/musicTheory";
import { audioEngine } from "../../lib/audio";
import { Volume2 } from "lucide-react";
import { getFrettedNote, getInstrumentTunings, type FrettedInstrument } from "../../lib/frettedInstrument";

export interface FretboardProps {
  instrument?: FrettedInstrument;
  fretRange?: { start: number; end: number };
  tuning?: Tuning;
  onTuningChange?: (tuning: Tuning) => void;
  fretCount?: number;
  onFretCountChange?: (count: number) => void;
  selectedRoot?: NoteName;
  selectedScale?: ScaleDefinition | null;
  activeRandomNote?: string | null;
  activePlayingNote?: string | null;
  activePlayingString?: number | null;
  activePlayingFret?: number | null;
  displayMode?: NoteDisplayMode;
  onDisplayModeChange?: (mode: NoteDisplayMode) => void;
  activeCagedBox?: string | null;
  highlightedFrets?: { stringIdx: number; fret: number }[];
}

export const OriginalFretboard: React.FC<FretboardProps> = ({
  instrument = "guitar",
  fretRange,
  tuning: controlledTuning,
  onTuningChange,
  fretCount: controlledFretCount,
  onFretCountChange,
  selectedRoot = "C",
  selectedScale = null,
  activeRandomNote = null,
  activePlayingNote = null,
  activePlayingString = null,
  activePlayingFret = null,
  displayMode: controlledDisplayMode,
  onDisplayModeChange,
  activeCagedBox = null,
  highlightedFrets = [],
}) => {
  // Local state fallbacks for standalone/uncontrolled usage
  const [internalTuning, setInternalTuning] = useState<Tuning>(
    controlledTuning || getInstrumentTunings(instrument)[0],
  );
  const [internalFretCount, setInternalFretCount] = useState<number>(
    controlledFretCount || 15,
  );
  const [internalDisplayMode, setInternalDisplayMode] =
    useState<NoteDisplayMode>(controlledDisplayMode || "name");

  useEffect(() => {
    if (controlledTuning) setInternalTuning(controlledTuning);
  }, [controlledTuning]);

  useEffect(() => {
    if (controlledFretCount !== undefined)
      setInternalFretCount(controlledFretCount);
  }, [controlledFretCount]);

  useEffect(() => {
    if (controlledDisplayMode) setInternalDisplayMode(controlledDisplayMode);
  }, [controlledDisplayMode]);

  const tunings = getInstrumentTunings(instrument);
  const tuning = controlledTuning || (tunings.includes(internalTuning) ? internalTuning : tunings[0]);
  const fretCount =
    controlledFretCount !== undefined ? controlledFretCount : internalFretCount;
  const displayMode = controlledDisplayMode || internalDisplayMode;

  const handleTuningSelect = (newTuning: Tuning) => {
    setInternalTuning(newTuning);
    onTuningChange?.(newTuning);
  };

  const handleFretCountSelect = (newCount: number) => {
    setInternalFretCount(newCount);
    onFretCountChange?.(newCount);
  };

  const handleDisplayModeSelect = (newMode: NoteDisplayMode) => {
    setInternalDisplayMode(newMode);
    onDisplayModeChange?.(newMode);
  };
  // Compute scale notes and their degrees from root
  const scaleMap = useMemo(() => {
    if (!selectedScale)
      return new Map<
        number,
        { noteName: NoteName; degree: string; interval: string }
      >();
    const notes = getScaleNotes(selectedRoot, selectedScale);
    const map = new Map<
      number,
      { noteName: NoteName; degree: string; interval: string }
    >();

    notes.forEach((item) => {
      const noteSemitone = NOTE_SEMITONES[item.note];
      map.set(noteSemitone, {
        noteName: item.note,
        degree: item.degree,
        interval: item.interval,
      });
    });

    return map;
  }, [selectedScale, selectedRoot]);

  // Clean random note normalized
  const normalizedRandomNoteSemitone = useMemo(() => {
    if (!activeRandomNote) return null;
    const clean = activeRandomNote.trim();
    if (NOTE_SEMITONES[clean as NoteName] !== undefined) {
      return NOTE_SEMITONES[clean as NoteName];
    }
    return null;
  }, [activeRandomNote]);

  // Clean playing note normalized
  const normalizedPlayingNoteSemitone = useMemo(() => {
    if (!activePlayingNote) return null;
    const clean = activePlayingNote.trim();
    if (NOTE_SEMITONES[clean as NoteName] !== undefined) {
      return NOTE_SEMITONES[clean as NoteName];
    }
    return null;
  }, [activePlayingNote]);

  // Determine if a given fret falls into the active CAGED box
  const isInCagedBox = useCallback(
    (fretNum: number) => {
      if (fretRange) return fretNum >= fretRange.start && fretNum <= fretRange.end;
      if (
        !activeCagedBox ||
        !selectedScale ||
        !selectedScale.cagedBoxes ||
        !selectedScale.cagedBoxes[activeCagedBox]
      )
        return true;

      const box = selectedScale.cagedBoxes[activeCagedBox];
      const rootSemitone = NOTE_SEMITONES[selectedRoot];
      const lowestStringNote = tuning.strings[0];
      const lowestStringSemitone = NOTE_SEMITONES[lowestStringNote];

      const rootFretOnLowestString =
        (rootSemitone - lowestStringSemitone + 12) % 12;

      const startFret = rootFretOnLowestString + box.startFretOffset;
      const endFret = rootFretOnLowestString + box.endFretOffset;

      for (let k = -2; k <= 3; k++) {
        if (fretNum >= startFret + 12 * k && fretNum <= endFret + 12 * k) {
          return true;
        }
      }
      return false;
    },
    [activeCagedBox, selectedScale, selectedRoot, tuning, fretRange, instrument],
  );

  // Play guitar note on click
  const handleNoteClick = (stringIdx: number, fret: number) => {
    // 6th string is index 0 in tuning.strings (Low E)
    const openNote = tuning.strings[stringIdx];
    const baseOctave = tuning.octaves[stringIdx];
    const openSemitone = NOTE_SEMITONES[openNote];
    const currentSemitone = (openSemitone + fret) % 12;
    const noteName = getSpelledNote(currentSemitone, {
      root: selectedRoot,
      scale: selectedScale,
      scaleMap,
      activeRandomNote,
    });

    const { octave } = getFrettedNote(tuning, stringIdx, fret);
    audioEngine.playSingleInstrumentNote(noteName, octave, 1.8, 0, instrument);
  };

  // Inlay markers
  const singleInlays = [3, 5, 7, 9, 15, 17, 19, 21];
  const doubleInlays = [12, 24];
  const minFretWidth = instrument === "bass" ? "54px" : "38px";
  const minFretWidthHigh = instrument === "bass" ? "44px" : "30px";

  return (
    <div data-instrument={instrument} data-fretboard-theme="original" className={`w-full bg-surface-container border border-outline-variant/30 rounded-lg p-3 sm:p-5 flex flex-col gap-3 sm:gap-4 shadow-xl select-none ${instrument === "bass" ? "bass-fretboard" : ""}`}>
      {/* Controls Bar */}
      <div className="flex min-w-0 flex-col items-stretch gap-3 pb-2 border-b border-outline-variant/20 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-4">
        <div className="flex min-w-0 max-w-full flex-col items-stretch gap-3 sm:flex-1 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4">
          {/* Tuning Selector */}
          <div className="flex w-full min-w-0 items-center gap-2 sm:w-auto sm:max-w-full">
            <span className="text-[10px] font-mono text-on-surface-variant uppercase tracking-wider">
              Tuning:
            </span>
            <select
              value={tuning.name}
              onChange={(e) => {
                const found = tunings.find(
                  (t) => t.name === e.target.value,
                );
                if (found) handleTuningSelect(found);
              }}
              className="min-w-0 w-0 max-w-full flex-1 truncate bg-surface-container-low border border-outline-variant/30 rounded px-2.5 py-1 text-xs font-mono text-on-surface focus:outline-none focus:border-primary/50 cursor-pointer sm:w-auto sm:flex-1"
            >
              {tunings.map((t) => (
                <option key={t.name} value={t.name}>
                  {t.name} ({t.strings.join(" ")})
                </option>
              ))}
            </select>
          </div>

          {/* Frets Count */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono text-on-surface-variant uppercase tracking-wider">
              Frets:
            </span>
            <select
              value={fretCount}
              onChange={(e) => handleFretCountSelect(Number(e.target.value))}
              className="bg-surface-container-low border border-outline-variant/30 rounded px-2.5 py-1 text-xs font-mono text-on-surface focus:outline-none focus:border-primary/50 cursor-pointer"
            >
              <option value={12}>12 Frets</option>
              <option value={15}>15 Frets</option>
              <option value={21}>21 Frets</option>
              <option value={22}>22 Frets</option>
              <option value={24}>24 Frets</option>
            </select>
          </div>
        </div>
      </div>

      {/* Interactive Fretboard Stage */}
      <div className="w-full overflow-x-auto pb-4 pt-2 select-none">
        <div className="bass-neck-stage min-w-[900px] relative bg-surface-container-low border border-outline-variant/30 rounded p-2.5">
          {/* Fret Numbers Header */}
          <div className="flex items-center mb-2 text-[10px] font-mono text-on-surface-variant">
            <div className="bass-neck-open w-10 shrink-0 text-center font-bold text-on-surface-variant">
              OPEN
            </div>
            <div className="flex-1 flex items-center">
              {Array.from({ length: fretCount }).map((_, i) => (
                <div
                  key={i}
                  className="flex-1 text-center font-bold text-on-surface-variant"
                  style={{ minWidth: (instrument === "bass" ? i >= 12 : i > 12) ? minFretWidthHigh : minFretWidth }}
                >
                  {i + 1}
                </div>
              ))}
            </div>
          </div>

          {/* Fretboard Grid Area */}
          <div className="bass-neck-board relative border-y-2 border-outline-variant bg-surface-container-highest/60 rounded-sm py-1 shadow-inner">
            {/* Position Inlay Dots (Background Layer) */}
            <div className="absolute inset-0 pointer-events-none flex">
              <div className="bass-neck-open w-10 shrink-0"></div>
              <div className="flex-1 flex h-full">
                {Array.from({ length: fretCount }).map((_, i) => {
                  const fretNum = i + 1;
                  const isSingle = singleInlays.includes(fretNum);
                  const isDouble = doubleInlays.includes(fretNum);

                  return (
                    <div
                      key={fretNum}
                      className="flex-1 h-full relative flex items-center justify-center"
                      style={{ minWidth: fretNum > 12 ? minFretWidthHigh : minFretWidth }}
                    >
                      {isSingle && (
                        <div className="bass-neck-inlay w-2.5 h-2.5 rounded-full bg-outline-variant/60 shadow-inner"></div>
                      )}
                      {isDouble && (
                        <div className="flex flex-col gap-8">
                          <div className="bass-neck-inlay w-2 h-2 rounded-full bg-outline-variant/60 shadow-inner"></div>
                          <div className="bass-neck-inlay w-2 h-2 rounded-full bg-outline-variant/60 shadow-inner"></div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Guitar Strings (High E at top, Low E at bottom or standard 6th to 1st) */}
            {tuning.strings.map((openNote, stringIdx) => {
              const reversedIdx = tuning.strings.length - 1 - stringIdx;
              const actualOpenNote = tuning.strings[reversedIdx];
              const openSemitone = NOTE_SEMITONES[actualOpenNote];
              // String physical thickness
              const stringThickness = `${instrument === "bass" ? 3 + stringIdx * 1.1 : Math.max(1, reversedIdx * 0.5 + 1)}px`;

              return (
                <div
                  key={stringIdx}
                  data-string-index={reversedIdx}
                  data-open-pitch={`${actualOpenNote}${tuning.octaves[reversedIdx]}`}
                  className="relative h-9 flex items-center group"
                >
                  {/* String Physical Line */}
                  <div
                    className="bass-neck-string absolute left-10 right-0 bg-outline-variant pointer-events-none z-10"
                    style={{ height: stringThickness }}
                  ></div>

                  {/* Nut (0th Fret / Open String) */}
                  <div className="bass-neck-nut bass-neck-open w-10 h-full border-r-4 border-outline-variant bg-surface-container-highest flex items-center justify-center z-20 relative">
                    {(() => {
                      const noteSemitone = openSemitone;
                      const noteName = getSpelledNote(noteSemitone, {
                        root: selectedRoot,
                        scale: selectedScale,
                        scaleMap,
                        activeRandomNote,
                      });
                      const inScale =
                        (selectedScale ? scaleMap.has(noteSemitone) : true) &&
                        isInCagedBox(0);
                      const isRandomActive =
                        normalizedRandomNoteSemitone === noteSemitone;
                      const isPlayingActive =
                        activePlayingString !== null &&
                        activePlayingString !== undefined &&
                        activePlayingFret !== null &&
                        activePlayingFret !== undefined
                          ? activePlayingString === reversedIdx &&
                            activePlayingFret === 0
                          : normalizedPlayingNoteSemitone === noteSemitone;
                      const isRoot =
                        !!selectedScale &&
                        noteSemitone === NOTE_SEMITONES[selectedRoot];

                      let displayText: string = noteName;
                      if (selectedScale && scaleMap.has(noteSemitone)) {
                        const info = scaleMap.get(noteSemitone)!;
                        displayText =
                          displayMode === "name"
                            ? noteName
                            : displayMode === "degree"
                              ? info.degree
                              : info.interval;
                      }

                      if (!inScale && !isRandomActive && !isPlayingActive) {
                        return (
                          <span
                            onClick={() => handleNoteClick(reversedIdx, 0)}
                            className="font-mono text-[10px] text-outline hover:text-on-surface-variant cursor-pointer"
                          >
                            {noteName}
                          </span>
                        );
                      }

                      return (
                        <button
                          type="button"
                          aria-label={`Play ${noteName}${tuning.octaves[reversedIdx]}, string ${tuning.strings.length - reversedIdx}, open`}
                          onClick={() => handleNoteClick(reversedIdx, 0)}
                          className={`w-6 h-6 rounded flex items-center justify-center font-mono text-[10px] font-bold transition-all shadow-md ${
                            isPlayingActive
                              ? "bg-secondary text-on-secondary font-black scale-125 z-40 shadow-2xl animate-pulse"
                              : isRandomActive
                                ? "bg-secondary text-on-secondary shadow-lg"
                                : isRoot
                                  ? "bg-primary text-on-primary font-black shadow-sm"
                                  : "bg-inverse-surface text-inverse-on-surface border border-outline-variant/40 hover:opacity-90"
                          }`}
                        >
                          {displayText}
                        </button>
                      );
                    })()}
                  </div>

                  {/* Frets 1 to fretCount */}
                  <div className="flex-1 flex h-full">
                    {Array.from({ length: fretCount }).map((_, fIdx) => {
                      const fretNum = fIdx + 1;
                      const noteSemitone = (openSemitone + fretNum) % 12;
                      const noteName = getSpelledNote(noteSemitone, {
                        root: selectedRoot,
                        scale: selectedScale,
                        scaleMap,
                        activeRandomNote,
                      });
                      const inScale =
                        (selectedScale ? scaleMap.has(noteSemitone) : true) &&
                        isInCagedBox(fretNum);
                      const isRandomActive =
                        normalizedRandomNoteSemitone === noteSemitone;
                      const isPlayingActive =
                        activePlayingString !== null &&
                        activePlayingString !== undefined &&
                        activePlayingFret !== null &&
                        activePlayingFret !== undefined
                          ? activePlayingString === reversedIdx &&
                            activePlayingFret === fretNum
                          : normalizedPlayingNoteSemitone === noteSemitone;
                      const isRoot =
                        !!selectedScale &&
                        noteSemitone === NOTE_SEMITONES[selectedRoot];

                      const isHighlightedFret = highlightedFrets.some(
                        (hf) =>
                          hf.stringIdx === reversedIdx && hf.fret === fretNum,
                      );

                      let displayText: string = noteName;
                      if (selectedScale && scaleMap.has(noteSemitone)) {
                        const info = scaleMap.get(noteSemitone)!;
                        displayText =
                          displayMode === "name"
                            ? noteName
                            : displayMode === "degree"
                              ? info.degree
                              : info.interval;
                      }

                      return (
                        <div
                          key={fretNum}
                          className="bass-neck-fret flex-1 h-full border-r border-outline-variant/40 relative flex items-center justify-center z-20"
                          style={{ minWidth: fretNum > 12 ? minFretWidthHigh : minFretWidth }}
                        >
                          {inScale ||
                          isRandomActive ||
                          isPlayingActive ||
                          isHighlightedFret ? (
                            <button
                              type="button"
                              aria-label={`Play ${noteName}${getFrettedNote(tuning, reversedIdx, fretNum).octave}, string ${tuning.strings.length - reversedIdx}, fret ${fretNum}`}
                              onClick={() =>
                                handleNoteClick(reversedIdx, fretNum)
                              }
                              className={`w-6 h-6 rounded flex items-center justify-center font-mono text-[9px] font-bold transition-transform hover:scale-125 z-30 shadow-md ${
                                isPlayingActive
                                  ? "bg-secondary text-on-secondary font-black scale-125 z-40 shadow-2xl animate-pulse"
                                  : isRandomActive
                                    ? "bg-secondary text-on-secondary scale-110 shadow-lg"
                                    : isRoot
                                      ? "bg-primary text-on-primary font-black shadow-sm"
                                      : "bg-inverse-surface text-inverse-on-surface border border-outline-variant/40 hover:opacity-90"
                              }`}
                            >
                              {displayText}
                            </button>
                          ) : (
                            <div
                              onClick={() =>
                                handleNoteClick(reversedIdx, fretNum)
                              }
                              className="w-full h-full cursor-pointer hover:bg-outline-variant/10 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity"
                            >
                              <span
                                className={`w-6 h-6 rounded-full flex items-center justify-center font-mono text-[9px] font-bold shadow-md ${
                                  isRoot
                                    ? "bg-primary text-on-primary"
                                    : "bg-inverse-surface text-inverse-on-surface"
                                }`}
                              >
                                {noteName}
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Legend & Clean Uniform Note Identifiers */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs pt-1 border-t border-outline-variant/20">
        <div className="flex flex-wrap items-center gap-4">
          <span className="text-[10px] font-mono text-on-surface-variant uppercase tracking-widest">
            Note Markers:
          </span>
          <div className="flex items-center gap-1.5 font-mono text-[10px]">
            <span className="w-3.5 h-3.5 rounded bg-primary text-on-primary flex items-center justify-center font-bold text-[8px] shadow-sm">
              R
            </span>
            <span className="text-on-surface">Root Note</span>
          </div>
          <div className="flex items-center gap-1.5 font-mono text-[10px]">
            <span className="w-3.5 h-3.5 rounded bg-inverse-surface text-inverse-on-surface border border-outline-variant/40 flex items-center justify-center text-[8px] font-bold">
              •
            </span>
            <span className="text-on-surface">Scale Notes & Intervals</span>
          </div>
          {activePlayingNote && (
            <div className="flex items-center gap-1.5 font-mono text-[10px]">
              <span className="w-3.5 h-3.5 rounded bg-secondary text-on-secondary flex items-center justify-center font-bold text-[8px] shadow-sm animate-pulse">
                {activePlayingNote}
              </span>
              <span className="text-secondary font-bold">Sounding Note</span>
            </div>
          )}
          {activeRandomNote && (
            <div className="flex items-center gap-1.5 font-mono text-[10px]">
              <span className="w-3.5 h-3.5 rounded bg-secondary text-on-secondary flex items-center justify-center font-bold text-[8px] shadow-sm">
                {activeRandomNote}
              </span>
              <span className="text-secondary font-semibold">
                Target Drill Note
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-1.5 text-[10px] font-mono text-on-surface-variant">
          <Volume2 size={13} className="text-primary" />
          <span>Click any fret to play pitch</span>
        </div>
      </div>
    </div>
  );
};
