import React, { useMemo, useRef, useEffect } from "react";
import { NoteDisplayMode, NoteName, ScaleDefinition } from "../types";
import {
  CHROMATIC_SHARPS,
  INTERVAL_NAMES_MAP,
  NOTE_SEMITONES,
  getScaleNotes,
  getSpelledNote,
} from "../data/musicTheory";
import { audioEngine } from "../lib/audio";
import { Volume2 } from "lucide-react";
import { useSettingsContext } from "../contexts/SettingsContext";

interface PianoKeyboardProps {
  octaves?: number; // 2 or 3 octaves (default 3: C2 to B4 or C5)
  startOctave?: number; // default 2
  selectedRoot?: NoteName;
  selectedScale?: ScaleDefinition | null;
  activeRandomNote?: string | null;
  activePlayingNote?: string | null;
  activePlayingOctave?: number | null;
  displayMode?: NoteDisplayMode;
  chordNotes?: NoteName[];
  exactVoicing?: { noteName: string; octave: number }[];
  onNoteToggle?: (note: NoteName, octave: number) => void;
  focusRange?: {
    startNote: NoteName;
    startOctave: number;
    endNote: NoteName;
    endOctave: number;
  } | null;
  autoCenterChord?: boolean;
  bare?: boolean;
}

export const PianoKeyboard: React.FC<PianoKeyboardProps> = ({
  octaves = 3,
  startOctave = 3,
  selectedRoot = "C",
  selectedScale = null,
  activeRandomNote = null,
  activePlayingNote = null,
  activePlayingOctave = null,
  displayMode = "name",
  chordNotes = [],
  exactVoicing,
  onNoteToggle,
  focusRange = null,
  autoCenterChord = true,
  bare = false,
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  
  const settings = useSettingsContext();
  const noteSize = settings.fretboardNoteSize || "medium";

  const sizeMap = {
    small: {
      whiteKey: "w-8 h-32 sm:w-10 sm:h-40",
      blackKey: "w-5 h-20 sm:w-6 sm:h-24",
      whiteText: "text-[9px]",
      blackText: "text-[8px]",
      octaveText: "text-[7px]",
    },
    medium: {
      whiteKey: "w-9 h-36 sm:w-11 sm:h-44",
      blackKey: "w-6 h-24 sm:w-7 sm:h-28",
      whiteText: "text-[10px]",
      blackText: "text-[9px]",
      octaveText: "text-[8px]",
    },
    large: {
      whiteKey: "w-11 h-44 sm:w-14 sm:h-52",
      blackKey: "w-7 h-28 sm:w-9 sm:h-32",
      whiteText: "text-xs",
      blackText: "text-[10px]",
      octaveText: "text-[9px]",
    },
    xlarge: {
      whiteKey: "w-14 h-52 sm:w-16 sm:h-60",
      blackKey: "w-9 h-32 sm:w-11 sm:h-40",
      whiteText: "text-sm",
      blackText: "text-xs",
      octaveText: "text-[10px]",
    }
  };
  const currSize = sizeMap[noteSize as keyof typeof sizeMap] || sizeMap.medium;

  // Scale Map
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

  const hasChordSelection =
    chordNotes.length > 0 || (exactVoicing?.length ?? 0) > 0;
  const isAllNotesSelected =
    !hasChordSelection && (selectedScale === null || scaleMap.size === 12);

  // Focus Range Pitch Limits
  const focusLimits = useMemo(() => {
    if (!focusRange) return null;
    const startVal =
      focusRange.startOctave * 12 + (NOTE_SEMITONES[focusRange.startNote] ?? 0);
    const endVal =
      focusRange.endOctave * 12 + (NOTE_SEMITONES[focusRange.endNote] ?? 0);
    return {
      minVal: Math.min(startVal, endVal),
      maxVal: Math.max(startVal, endVal),
    };
  }, [focusRange]);

  const normalizedRandomNoteSemitone = useMemo(() => {
    if (!activeRandomNote) return null;
    const clean = activeRandomNote.trim();
    if (NOTE_SEMITONES[clean as NoteName] !== undefined) {
      return NOTE_SEMITONES[clean as NoteName];
    }
    return null;
  }, [activeRandomNote]);

  const normalizedPlayingNoteSemitone = useMemo(() => {
    if (!activePlayingNote) return null;
    const clean = activePlayingNote.trim();
    if (NOTE_SEMITONES[clean as NoteName] !== undefined) {
      return NOTE_SEMITONES[clean as NoteName];
    }
    return null;
  }, [activePlayingNote]);

  const chordSemitones = useMemo(() => {
    return new Set(chordNotes.map((n) => NOTE_SEMITONES[n]));
  }, [chordNotes]);

  // Keys list across octaves
  // White keys per octave: C, D, E, F, G, A, B
  const whiteKeyOffsets = [0, 2, 4, 5, 7, 9, 11]; // semitones from C
  const blackKeyMap: {
    [whiteIdx: number]: { name: NoteName; semitone: number };
  } = {
    0: { name: "C#", semitone: 1 },
    1: { name: "D#", semitone: 3 },
    3: { name: "F#", semitone: 6 },
    4: { name: "G#", semitone: 8 },
    5: { name: "A#", semitone: 10 },
  };

  // Auto center chord notes in view when exactVoicing or chord notes change
  useEffect(() => {
    if (!autoCenterChord) return;

    const timer = setTimeout(() => {
      const container = scrollContainerRef.current;
      if (!container) return;

      const chordElements = container.querySelectorAll<HTMLElement>(
        '[data-chord-key="true"]',
      );
      const targetElements =
        chordElements.length > 0
          ? chordElements
          : container.querySelectorAll<HTMLElement>('[data-scale-key="true"]');
      if (targetElements.length === 0) return;

      const containerRect = container.getBoundingClientRect();
      let minLeft = Infinity;
      let maxRight = -Infinity;

      targetElements.forEach((el) => {
        const rect = el.getBoundingClientRect();
        const relativeLeft =
          rect.left - containerRect.left + container.scrollLeft;
        const relativeRight =
          rect.right - containerRect.left + container.scrollLeft;
        if (relativeLeft < minLeft) minLeft = relativeLeft;
        if (relativeRight > maxRight) maxRight = relativeRight;
      });

      if (minLeft !== Infinity && maxRight !== -Infinity) {
        const chordCenter = (minLeft + maxRight) / 2;
        const targetScrollLeft = chordCenter - container.clientWidth / 2;

        container.scrollTo({
          left: Math.max(0, targetScrollLeft),
          behavior: "smooth",
        });
      }
    }, 50);

    return () => clearTimeout(timer);
  }, [
    exactVoicing,
    chordNotes,
    selectedRoot,
    startOctave,
    octaves,
    autoCenterChord,
  ]);

  const handleKeyClick = (noteName: NoteName, octave: number) => {
    if (onNoteToggle) {
      onNoteToggle(noteName, octave);
      return;
    }
    audioEngine.playPianoNote(noteName, octave);
  };

  return (
    <div
      className={`w-full max-w-full overflow-hidden flex flex-col gap-4 select-none ${
        bare
          ? ""
          : "bg-surface-container border border-outline-variant/30 rounded-lg p-4 sm:p-5 shadow-xl"
      }`}
    >
      {!bare && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-outline-variant/10 pb-2">
          <span className="text-[10px] font-mono text-on-surface-variant uppercase tracking-widest font-semibold">
            Interactive Piano Keyboard (Range: C{startOctave} - C
            {startOctave + octaves})
          </span>
        </div>
      )}

      {/* Piano Stage */}
      <div
        ref={scrollContainerRef}
        className="w-full max-w-full overflow-x-auto overscroll-x-contain pb-1 sm:pb-4 touch-pan-x scroll-smooth"
      >
        <div className="w-max mx-auto px-0.5 py-1.5 sm:px-2 sm:py-2 flex justify-start sm:justify-center">
          <div className="piano-keyboard flex relative bg-surface-container-highest p-1 sm:p-1.5 rounded-b-lg border-t-4 sm:border-t-8 border-outline-variant shadow-2xl">
            {Array.from({ length: octaves }).map((_, octIdx) => {
              const currentOctave = startOctave + octIdx;

              return (
                <div key={octIdx} className="flex relative">
                  {whiteKeyOffsets.map((offset, wIdx) => {
                    const noteSemitone = offset;
                    const spelledNote = getSpelledNote(noteSemitone, {
                      root: selectedRoot,
                      scale: selectedScale,
                      scaleMap,
                      activeRandomNote,
                    });
                    const keyPitch = currentOctave * 12 + noteSemitone;
                    const isDimmed = focusLimits
                      ? keyPitch < focusLimits.minVal ||
                        keyPitch > focusLimits.maxVal
                      : false;

                    const inScale = selectedScale
                      ? scaleMap.has(noteSemitone)
                      : false;

                    const inChord = exactVoicing
                      ? exactVoicing.some(
                          (v) =>
                            (v.noteName === spelledNote ||
                              NOTE_SEMITONES[v.noteName as NoteName] ===
                                noteSemitone) &&
                            v.octave === currentOctave,
                        )
                      : chordSemitones.has(noteSemitone);

                    const isRandom =
                      normalizedRandomNoteSemitone === noteSemitone;
                    const isPlaying =
                      normalizedPlayingNoteSemitone === noteSemitone;
                    const isExactOctavePlaying =
                      isPlaying &&
                      (activePlayingOctave === null ||
                        activePlayingOctave === currentOctave);
                    const isRoot =
                      (!!selectedScale ||
                        chordNotes.length > 0 ||
                        (exactVoicing && exactVoicing.length > 0)) &&
                      noteSemitone === NOTE_SEMITONES[selectedRoot] &&
                      (!exactVoicing || inChord);

                    const degreeInfo = scaleMap.get(noteSemitone);

                    let label: string = spelledNote;
                    if (selectedScale && scaleMap.has(noteSemitone)) {
                      label =
                        displayMode === "name"
                          ? spelledNote
                          : displayMode === "degree"
                            ? degreeInfo!.degree
                            : degreeInfo!.interval;
                    }

                    const hasBlack = blackKeyMap[wIdx];

                    return (
                      <div key={wIdx} className="relative">
                        {/* White Key */}
                        <button
                          data-chord-key={inChord ? "true" : undefined}
                          data-scale-key={
                            inScale &&
                            (!focusLimits ||
                              (keyPitch >= focusLimits.minVal &&
                                keyPitch <= focusLimits.maxVal))
                              ? "true"
                              : undefined
                          }
                          onClick={() =>
                            handleKeyClick(spelledNote, currentOctave)
                          }
                          className={`rounded-b-md border-r border-l border-b border-outline-variant/30 flex flex-col justify-end pb-2 sm:pb-3 items-center transition-all ${currSize.whiteKey} ${
                            isDimmed
                              ? "opacity-25 hover:opacity-50 grayscale bg-surface-container-lowest/50 text-on-surface-variant/20 shadow-none border-outline-variant/10 cursor-pointer"
                              : isExactOctavePlaying
                                ? "bg-secondary text-on-secondary font-black shadow-2xl scale-[1.02] z-30"
                                : isPlaying
                                  ? "bg-secondary/85 text-on-secondary font-bold shadow-lg z-20"
                                  : isRandom
                                    ? "bg-secondary text-on-secondary font-bold shadow-lg z-20"
                                    : isRoot
                                      ? "bg-primary text-on-primary font-black border-t-4 border-primary shadow-md z-10"
                                      : inChord
                                        ? "piano-chord-key bg-inverse-surface text-inverse-on-surface font-bold z-10"
                                        : inScale
                                          ? isAllNotesSelected
                                            ? "bg-white text-black hover:bg-white active:bg-white"
                                            : hasChordSelection
                                              ? "piano-chord-inactive-key bg-white text-black hover:bg-white active:bg-white"
                                              : "bg-white text-black hover:bg-white active:bg-white"
                                          : isAllNotesSelected
                                            ? "bg-white text-black hover:bg-white active:bg-white"
                                            : `${hasChordSelection ? "piano-chord-inactive-key" : "piano-inactive-key"} bg-surface-container-highest text-on-surface-variant/40 hover:bg-surface-bright`
                          }`}
                        >
                          <span
                            className={`font-mono font-bold ${currSize.whiteText} ${isDimmed ? "opacity-40" : ""}`}
                          >
                            {label}
                            {wIdx === 0 && (
                              <span className={`opacity-60 ml-0.5 ${currSize.octaveText}`}>
                                {currentOctave}
                              </span>
                            )}
                          </span>
                        </button>

                        {/* Black Key */}
                        {hasBlack && (
                          <div className="absolute top-0 right-0 translate-x-1/2 z-30">
                            {(() => {
                              const bInfo = hasBlack;
                              const bSemitone = bInfo.semitone;
                              const bSpelledNote = getSpelledNote(bSemitone, {
                                root: selectedRoot,
                                scale: selectedScale,
                                scaleMap,
                                activeRandomNote,
                              });
                              const bKeyPitch = currentOctave * 12 + bSemitone;
                              const bIsDimmed = focusLimits
                                ? bKeyPitch < focusLimits.minVal ||
                                  bKeyPitch > focusLimits.maxVal
                                : false;

                              const bInScale = selectedScale
                                ? scaleMap.has(bSemitone)
                                : false;

                              const bInChord = exactVoicing
                                ? exactVoicing.some(
                                    (v) =>
                                      (v.noteName === bSpelledNote ||
                                        NOTE_SEMITONES[
                                          v.noteName as NoteName
                                        ] === bSemitone) &&
                                      v.octave === currentOctave,
                                  )
                                : chordSemitones.has(bSemitone);

                              const bIsRandom =
                                normalizedRandomNoteSemitone === bSemitone;
                              const bIsPlaying =
                                normalizedPlayingNoteSemitone === bSemitone;
                              const bIsExactOctavePlaying =
                                bIsPlaying &&
                                (activePlayingOctave === null ||
                                  activePlayingOctave === currentOctave);
                              const bIsRoot =
                                (!!selectedScale ||
                                  chordNotes.length > 0 ||
                                  (exactVoicing && exactVoicing.length > 0)) &&
                                bSemitone === NOTE_SEMITONES[selectedRoot] &&
                                (!exactVoicing || bInChord);
                              const bDegreeInfo = scaleMap.get(bSemitone);
                              let bLabel: string = bSpelledNote;
                              if (selectedScale && scaleMap.has(bSemitone)) {
                                bLabel =
                                  displayMode === "name"
                                    ? bSpelledNote
                                    : displayMode === "degree"
                                      ? bDegreeInfo!.degree
                                      : bDegreeInfo!.interval;
                              }
                              return (
                                <button
                                  data-chord-key={bInChord ? "true" : undefined}
                                  data-scale-key={
                                    bInScale &&
                                    (!focusLimits ||
                                      (bKeyPitch >= focusLimits.minVal &&
                                        bKeyPitch <= focusLimits.maxVal))
                                      ? "true"
                                      : undefined
                                  }
                                  onClick={() =>
                                    handleKeyClick(bSpelledNote, currentOctave)
                                  }
                                  className={`rounded-b-md flex flex-col justify-end pb-1.5 sm:pb-2 items-center transition-all ${currSize.blackKey} ${
                                    bIsDimmed
                                      ? "opacity-20 hover:opacity-40 grayscale bg-surface-container-lowest/50 text-on-surface-variant/20 shadow-none border border-transparent"
                                      : bIsExactOctavePlaying
                                        ? "bg-secondary text-on-secondary font-black shadow-2xl scale-105 z-50"
                                        : bIsPlaying
                                          ? "bg-secondary/90 text-on-secondary font-bold shadow-lg z-40"
                                          : bIsRandom
                                            ? "bg-secondary text-on-secondary shadow-lg"
                                            : bIsRoot
                                              ? "bg-primary text-on-primary font-bold shadow-lg ring-1 ring-primary"
                                              : bInChord
                                                ? "bg-black text-white shadow-[0_4px_8px_rgba(0,0,0,0.8)] border border-zinc-800"
                                                : bInScale
                                                  ? "bg-black text-white shadow-[0_4px_8px_rgba(0,0,0,0.8)] border border-zinc-800"
                                                  : isAllNotesSelected
                                                    ? "bg-black text-white shadow-[0_4px_8px_rgba(0,0,0,0.8)] border border-zinc-800"
                                                    : "bg-surface-container-low text-on-surface-variant/20 shadow-none border border-transparent hover:bg-surface-container"
                                  }`}
                                >
                                  <span
                                    className={`font-mono font-bold ${currSize.blackText} ${bIsDimmed ? "opacity-40" : ""}`}
                                  >
                                    {bLabel}
                                  </span>
                                </button>
                              );
                            })()}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}

            {/* Final C Key */}
            {(() => {
              const noteSemitone = 0; // C
              const noteName: NoteName = "C";
              const finalOctave = startOctave + octaves;
              const keyPitch = finalOctave * 12 + noteSemitone;
              const isDimmed = focusLimits
                ? keyPitch < focusLimits.minVal || keyPitch > focusLimits.maxVal
                : false;

              const inScale = selectedScale
                ? scaleMap.has(noteSemitone)
                : false;
              const inChord = exactVoicing
                ? exactVoicing.some(
                    (v) => v.noteName === "C" && v.octave === finalOctave,
                  )
                : chordSemitones.has(noteSemitone);

              const isRandom = normalizedRandomNoteSemitone === noteSemitone;
              const isPlaying = normalizedPlayingNoteSemitone === noteSemitone;
              const isExactOctavePlaying =
                isPlaying &&
                (activePlayingOctave === null ||
                  activePlayingOctave === finalOctave);
              const isRoot =
                (!!selectedScale ||
                  chordNotes.length > 0 ||
                  (exactVoicing && exactVoicing.length > 0)) &&
                noteSemitone === NOTE_SEMITONES[selectedRoot] &&
                (!exactVoicing || inChord);
              const degreeInfo = scaleMap.get(noteSemitone);
              let label: string = noteName;
              if (selectedScale && scaleMap.has(noteSemitone)) {
                label =
                  displayMode === "name"
                    ? noteName
                    : displayMode === "degree"
                      ? degreeInfo!.degree
                      : degreeInfo!.interval;
              }

              return (
                <div className="relative">
                  <button
                    data-chord-key={inChord ? "true" : undefined}
                    data-scale-key={
                      inScale &&
                      (!focusLimits ||
                        (keyPitch >= focusLimits.minVal &&
                          keyPitch <= focusLimits.maxVal))
                        ? "true"
                        : undefined
                    }
                    onClick={() => handleKeyClick("C", finalOctave)}
                    className={`rounded-b-md border-r border-l border-b border-outline-variant/30 flex flex-col justify-end pb-2 sm:pb-3 items-center transition-all ${currSize.whiteKey} ${
                      isDimmed
                        ? "opacity-25 hover:opacity-50 grayscale bg-surface-container-lowest/50 text-on-surface-variant/20 shadow-none border-outline-variant/10 cursor-pointer"
                        : isExactOctavePlaying
                          ? "bg-secondary text-on-secondary font-black shadow-2xl scale-[1.02] z-30"
                          : isPlaying
                            ? "bg-secondary/85 text-on-secondary font-bold shadow-lg z-20"
                            : isRandom
                              ? "bg-secondary text-on-secondary font-bold shadow-lg z-20"
                              : isRoot
                                ? "bg-primary text-on-primary font-black border-t-4 border-primary shadow-md z-10"
                                : inChord
                                  ? "piano-chord-key bg-inverse-surface text-inverse-on-surface font-bold z-10"
                                  : inScale
                                    ? isAllNotesSelected
                                      ? "bg-white text-black hover:bg-white active:bg-white"
                                      : hasChordSelection
                                        ? "piano-chord-inactive-key bg-white text-black hover:bg-white active:bg-white"
                                        : "bg-white text-black hover:bg-white active:bg-white"
                                    : isAllNotesSelected
                                      ? "bg-white text-black hover:bg-white active:bg-white"
                                      : `${hasChordSelection ? "piano-chord-inactive-key" : "piano-inactive-key"} bg-surface-container-highest text-on-surface-variant/40 hover:bg-surface-bright`
                    }`}
                  >
                    <span
                      className={`font-mono font-bold ${currSize.whiteText} ${isDimmed ? "opacity-40" : ""}`}
                    >
                      {label}
                      <span className={`opacity-60 ml-0.5 ${currSize.octaveText}`}>
                        {finalOctave}
                      </span>
                    </span>
                  </button>
                </div>
              );
            })()}
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
          <span>Click any key to play pitch</span>
        </div>
      </div>
    </div>
  );
};
