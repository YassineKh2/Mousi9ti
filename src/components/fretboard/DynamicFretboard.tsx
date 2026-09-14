import React from "react";
import { Volume2 } from "lucide-react";
import { GUITAR_TUNINGS, getSpelledNote, NOTE_SEMITONES } from "../../data/musicTheory";
import { useSettingsContext } from "../../contexts/SettingsContext";
import { useFretboardLogic } from "./useFretboardLogic";
import { FretboardProps } from "./OriginalFretboard";

export const DynamicFretboard: React.FC<FretboardProps> = (props) => {
  const settings = useSettingsContext();
  const logic = useFretboardLogic(props);
  const {
    tuning, fretCount, displayMode, handleTuningSelect, handleFretCountSelect,
    scaleMap, normalizedRandomNoteSemitone, normalizedPlayingNoteSemitone,
    isInCagedBox, handleNoteClick, selectedRoot, selectedScale,
    activeRandomNote, activePlayingNote, activePlayingString, activePlayingFret,
    highlightedFrets,
  } = logic;

  const noteSize = settings.fretboardNoteSize || "medium";
  const isMinimal = settings.fretboardMinimalDetails;
  const theme = settings.fretboardTheme;
  const colorMode = settings.fretboardColorMode || "default";

  let boardBgClass = "bg-surface-container-highest/60";
  let wrapperBgClass = "bg-surface-container-low";
  let fretBorderClass = isMinimal ? "border-outline-variant/20" : "border-outline-variant/40";
  let stringClass = "bg-outline-variant";
  let markerDotClass = "bg-outline-variant/60 shadow-inner";
  let fretNumClass = "text-on-surface-variant";

  if (theme === "ebony") {
    boardBgClass = "bg-[#252525] bg-gradient-to-b from-[#2a2a2a] to-[#202020] shadow-inner";
    wrapperBgClass = "bg-[#e8e8e8] dark:bg-[#1a1a1a]";
    fretBorderClass = isMinimal ? "border-[#404040]/50" : "border-[#404040]";
    markerDotClass = "bg-[#111111]/80 shadow-inner";
    fretNumClass = "text-[#333] dark:text-[#999]";
  } else if (theme === "maple") {
    boardBgClass = "bg-[#e8d5b5] bg-gradient-to-b from-[#ebd9bb] to-[#dfcbad] shadow-inner";
    wrapperBgClass = "bg-[#fdf6e3] dark:bg-[#3d3222]";
    fretBorderClass = isMinimal ? "border-black/10" : "border-black/20";
    stringClass = "bg-black/60";
    markerDotClass = "bg-black/20 shadow-inner";
    fretNumClass = "text-[#5a4a30] dark:text-[#c4b48a]";
  } else if (theme === "rosewood") {
    boardBgClass = "bg-[#4a2618] bg-gradient-to-b from-[#4f291a] to-[#402114] shadow-inner";
    wrapperBgClass = "bg-[#f0e0d0] dark:bg-[#331c13]";
    fretBorderClass = isMinimal ? "border-[#d1b09b]/15" : "border-[#d1b09b]/30";
    stringClass = "bg-[#d1b09b]/60";
    markerDotClass = "bg-[#d1b09b]/30 shadow-inner";
    fretNumClass = "text-[#5a3020] dark:text-[#d1b09b]";
  } else if (theme === "high-contrast") {
    boardBgClass = "bg-black border-2 border-white";
    wrapperBgClass = "bg-white dark:bg-black";
    fretBorderClass = isMinimal ? "border-white/50" : "border-white";
    stringClass = "bg-white";
    markerDotClass = "bg-white shadow-none";
    fretNumClass = "text-black dark:text-white";
  }

  const sizeMap = {
    small: {
      fretWidth: "32px", fretWidthHigh: "26px", stringHeight: "h-7", nutWidth: "w-8",
      noteBtn: "w-5 h-5 text-[8px]", openBtn: "w-5 h-5 text-[8px]",
      shapeBase: "rounded-[4px]", shapeRoot: "rounded-[4px]"
    },
    medium: {
      fretWidth: "38px", fretWidthHigh: "30px", stringHeight: "h-9", nutWidth: "w-10",
      noteBtn: "w-6 h-6 text-[9px]", openBtn: "w-6 h-6 text-[10px]",
      shapeBase: "rounded-md", shapeRoot: "rounded-md"
    },
    large: {
      fretWidth: "48px", fretWidthHigh: "38px", stringHeight: "h-11", nutWidth: "w-12",
      noteBtn: "w-8 h-8 text-[11px]", openBtn: "w-8 h-8 text-[11px]",
      shapeBase: "rounded-[8px]", shapeRoot: "rounded-lg"
    },
    xlarge: {
      fretWidth: "56px", fretWidthHigh: "46px", stringHeight: "h-14", nutWidth: "w-14",
      noteBtn: "w-10 h-10 text-xs", openBtn: "w-10 h-10 text-xs",
      shapeBase: "rounded-[10px]", shapeRoot: "rounded-xl"
    }
  };

  const currSize = sizeMap[noteSize as keyof typeof sizeMap] || sizeMap.medium;

  const minFretWidth = currSize.fretWidth;
  const minFretWidthHigh = currSize.fretWidthHigh;
  const stringHeight = currSize.stringHeight;
  const nutWidth = currSize.nutWidth;
  const nutClass = ["large", "xlarge"].includes(noteSize) ? "border-r-8" : "border-r-4";
  
  // Note rendering helper
  const getNoteClasses = (isRoot: boolean, isRandomActive: boolean, isPlayingActive: boolean, isLegend: boolean = false) => {
    let classes = `${isLegend ? currSize.openBtn : currSize.noteBtn} flex items-center justify-center font-mono font-bold transition-transform shadow-md `;
    
    // Base shapes
    let shapeClass = "rounded-full"; // Default fully rounded for scale notes
    if (colorMode === "colorblind" || colorMode === "monochrome") {
      shapeClass = isRoot ? currSize.shapeRoot : "rounded-full"; // Root gets square-ish shape, scale gets circle
    } else {
      shapeClass = "rounded-full"; // Default all circles
    }
    
    classes += shapeClass + " ";
    
    if (isPlayingActive && !isLegend) {
      return classes + "bg-secondary text-on-secondary font-black scale-125 z-40 shadow-2xl animate-pulse ";
    }
    if (isRandomActive && !isLegend) {
      return classes + "bg-secondary text-on-secondary scale-110 shadow-lg border-2 border-on-secondary ";
    }

    if (colorMode === "monochrome") {
      if (isRoot) {
        classes += "bg-inverse-surface text-inverse-on-surface font-black shadow-sm border-2 border-surface ";
      } else {
        classes += "bg-surface text-on-surface border-2 border-outline hover:bg-surface-variant hover:opacity-100 ";
      }
    } else if (colorMode === "colorblind") {
      if (isRoot) {
        classes += "bg-primary text-on-primary font-black shadow-sm border-2 border-on-primary ";
      } else {
        classes += "bg-inverse-surface text-inverse-on-surface border-2 border-outline-variant hover:opacity-90 ";
      }
    } else {
      // Default
      if (isRoot) {
        classes += "bg-primary text-on-primary font-black shadow-sm ";
      } else {
        classes += "bg-inverse-surface text-inverse-on-surface border border-outline-variant/40 hover:opacity-90 ";
      }
    }
    return classes;
  };

  const singleInlays = [3, 5, 7, 9, 15, 17, 19, 21];
  const doubleInlays = [12, 24];

  return (
    <div className="w-full bg-surface-container border border-outline-variant/30 rounded-lg p-3 sm:p-5 flex flex-col gap-3 sm:gap-4 shadow-xl select-none">
      {/* Controls Bar */}
      <div className="flex min-w-0 flex-col items-stretch gap-3 pb-2 border-b border-outline-variant/20 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-4">
        <div className="flex min-w-0 max-w-full flex-col items-stretch gap-3 sm:flex-1 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4">
          <div className="flex w-full min-w-0 items-center gap-2 sm:w-auto sm:max-w-full">
            <span className="text-[10px] font-mono text-on-surface-variant uppercase tracking-wider">
              Tuning:
            </span>
            <select
              value={tuning.name}
              onChange={(e) => {
                const found = GUITAR_TUNINGS.find((t) => t.name === e.target.value);
                if (found) handleTuningSelect(found);
              }}
              className="min-w-0 w-0 max-w-full flex-1 truncate bg-surface-container-low border border-outline-variant/30 rounded px-2.5 py-1 text-xs font-mono text-on-surface focus:outline-none focus:border-primary/50 cursor-pointer sm:w-auto sm:flex-1"
            >
              {GUITAR_TUNINGS.map((t) => (
                <option key={t.name} value={t.name}>
                  {t.name} ({t.strings.join(" ")})
                </option>
              ))}
            </select>
          </div>

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
        <div className={`min-w-[900px] relative ${wrapperBgClass} border border-outline-variant/30 rounded p-2.5`}>
          {/* Fret Numbers Header */}
          <div className={`flex items-center mb-2 text-[10px] font-mono ${fretNumClass}`}>
            <div className={`${nutWidth} shrink-0 text-center font-bold ${fretNumClass}`}>
              OPEN
            </div>
            <div className="flex-1 flex items-center">
              {Array.from({ length: fretCount }).map((_, i) => (
                <div
                  key={i}
                  className={`flex-1 text-center font-bold ${fretNumClass}`}
                  style={{ minWidth: i > 12 ? minFretWidthHigh : minFretWidth }}
                >
                  {i + 1}
                </div>
              ))}
            </div>
          </div>

          {/* Fretboard Grid Area */}
          <div className={`relative border-y-2 ${theme === 'high-contrast' ? 'border-white' : 'border-outline-variant'} ${boardBgClass} rounded-sm py-1 shadow-inner`}>
            {/* Position Inlay Dots */}
            {!isMinimal && (
              <div className="absolute inset-0 pointer-events-none flex">
                <div className={`${nutWidth} shrink-0`}></div>
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
                          <div className={`w-2.5 h-2.5 rounded-full ${markerDotClass}`}></div>
                        )}
                        {isDouble && (
                          <div className="flex flex-col gap-8">
                            <div className={`w-2 h-2 rounded-full ${markerDotClass}`}></div>
                            <div className={`w-2 h-2 rounded-full ${markerDotClass}`}></div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Guitar Strings */}
            {tuning.strings.map((openNote, stringIdx) => {
              const reversedIdx = 5 - stringIdx;
              const actualOpenNote = tuning.strings[reversedIdx];
              const openSemitone = NOTE_SEMITONES[actualOpenNote];
              // Thinner strings if minimal
              const thicknessMod = isMinimal ? 0.5 : 1;
              const stringThickness = `${Math.max(1, (reversedIdx * 0.5 + 1) * thicknessMod)}px`;

              return (
                <div key={stringIdx} className={`relative ${stringHeight} flex items-center group`}>
                  {/* String Physical Line */}
                  <div
                    className={`absolute right-0 ${stringClass} pointer-events-none z-10`}
                    style={{ height: stringThickness, left: ["large", "xlarge"].includes(noteSize) ? '56px' : '40px' }}
                  ></div>

                  {/* Nut (0th Fret) */}
                  <div className={`${nutWidth} h-full ${nutClass} ${fretBorderClass} bg-black/20 flex items-center justify-center z-20 relative`}>
                    {(() => {
                      const noteSemitone = openSemitone;
                      const noteName = getSpelledNote(noteSemitone, {
                        root: selectedRoot,
                        scale: selectedScale,
                        scaleMap,
                        activeRandomNote,
                      });
                      const inScale = (selectedScale ? scaleMap.has(noteSemitone) : true) && isInCagedBox(0);
                      const isRandomActive = normalizedRandomNoteSemitone === noteSemitone;
                      const isPlayingActive =
                        activePlayingString !== null &&
                        activePlayingString !== undefined &&
                        activePlayingFret !== null &&
                        activePlayingFret !== undefined
                          ? activePlayingString === reversedIdx && activePlayingFret === 0
                          : normalizedPlayingNoteSemitone === noteSemitone;
                      const isRoot = !!selectedScale && noteSemitone === NOTE_SEMITONES[selectedRoot];

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
                            className={`font-mono ${currSize.noteBtn.split(' ')[2]} ${theme === 'high-contrast' ? 'text-white' : 'text-outline hover:text-on-surface-variant'} cursor-pointer opacity-50`}
                          >
                            {noteName}
                          </span>
                        );
                      }

                      return (
                        <button
                          onClick={() => handleNoteClick(reversedIdx, 0)}
                          className={getNoteClasses(isRoot, isRandomActive, isPlayingActive)}
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
                      const inScale = (selectedScale ? scaleMap.has(noteSemitone) : true) && isInCagedBox(fretNum);
                      const isRandomActive = normalizedRandomNoteSemitone === noteSemitone;
                      const isPlayingActive =
                        activePlayingString !== null &&
                        activePlayingString !== undefined &&
                        activePlayingFret !== null &&
                        activePlayingFret !== undefined
                          ? activePlayingString === reversedIdx && activePlayingFret === fretNum
                          : normalizedPlayingNoteSemitone === noteSemitone;
                      const isRoot = !!selectedScale && noteSemitone === NOTE_SEMITONES[selectedRoot];

                      const isHighlightedFret = highlightedFrets.some(
                        (hf) => hf.stringIdx === reversedIdx && hf.fret === fretNum
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
                          className={`flex-1 h-full border-r ${fretBorderClass} relative flex items-center justify-center z-20`}
                          style={{ minWidth: fretNum > 12 ? minFretWidthHigh : minFretWidth }}
                        >
                          {inScale || isRandomActive || isPlayingActive || isHighlightedFret ? (
                            <button
                              onClick={() => handleNoteClick(reversedIdx, fretNum)}
                              className={getNoteClasses(isRoot, isRandomActive, isPlayingActive) + " hover:scale-125 z-30"}
                            >
                              {displayText}
                            </button>
                          ) : (
                            <div
                              onClick={() => handleNoteClick(reversedIdx, fretNum)}
                              className="w-full h-full cursor-pointer hover:bg-black/10 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity"
                            >
                              <span className={`font-mono ${currSize.noteBtn.split(' ')[2]} ${theme === 'high-contrast' ? 'text-white' : 'text-on-surface-variant/50'}`}>
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

      {/* Legend */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs pt-1 border-t border-outline-variant/20">
        <div className="flex flex-wrap items-center gap-4">
          <span className="text-[10px] font-mono text-on-surface-variant uppercase tracking-widest">
            Note Markers:
          </span>
          <div className="flex items-center gap-1.5 font-mono text-[10px]">
            <div className={getNoteClasses(true, false, false, true)}>
              <span className="scale-[0.8] block">R</span>
            </div>
            <span className="text-on-surface">Root Note</span>
          </div>
          <div className="flex items-center gap-1.5 font-mono text-[10px]">
            <div className={getNoteClasses(false, false, false, true)}>
              <span className="scale-[0.8] block">•</span>
            </div>
            <span className="text-on-surface">Scale Notes & Intervals</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-[10px] font-mono text-on-surface-variant">
          <Volume2 size={13} className="text-primary" />
          <span>Click any fret to play pitch</span>
        </div>
      </div>
    </div>
  );
};
