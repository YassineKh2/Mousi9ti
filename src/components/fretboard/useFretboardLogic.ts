import { useState, useEffect, useMemo, useCallback } from "react";
import { Tuning, NoteDisplayMode, NoteName, ScaleDefinition } from "../../types";
import { GUITAR_TUNINGS, NOTE_SEMITONES, getScaleNotes, getSpelledNote } from "../../data/musicTheory";
import { audioEngine } from "../../lib/audio";
import { FretboardProps } from "./OriginalFretboard";
import { getFrettedNote, getInstrumentTunings } from "../../lib/frettedInstrument";

export function useFretboardLogic(props: FretboardProps) {
  const {
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
  } = props;

  // Local state fallbacks for standalone/uncontrolled usage
  const [internalTuning, setInternalTuning] = useState<Tuning>(
    controlledTuning || getInstrumentTunings(instrument)[0]
  );
  const [internalFretCount, setInternalFretCount] = useState<number>(
    controlledFretCount || 15
  );
  const [internalDisplayMode, setInternalDisplayMode] = useState<NoteDisplayMode>(
    controlledDisplayMode || "name"
  );

  useEffect(() => {
    if (controlledTuning) setInternalTuning(controlledTuning);
  }, [controlledTuning]);

  useEffect(() => {
    if (controlledFretCount !== undefined) setInternalFretCount(controlledFretCount);
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
    [activeCagedBox, selectedScale, selectedRoot, tuning, fretRange, instrument]
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

  return {
    tunings,
    tuning,
    fretCount,
    displayMode,
    handleTuningSelect,
    handleFretCountSelect,
    handleDisplayModeSelect,
    scaleMap,
    normalizedRandomNoteSemitone,
    normalizedPlayingNoteSemitone,
    isInCagedBox,
    handleNoteClick,
    selectedRoot,
    selectedScale,
    activeRandomNote,
    activePlayingNote,
    activePlayingString,
    activePlayingFret,
    highlightedFrets,
  };
}
