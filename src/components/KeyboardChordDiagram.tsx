import React from "react";
import { Volume2, Music } from "lucide-react";
import { KeyboardVoicing, NoteName } from "../types";
import { audioEngine } from "../lib/audio";
import { CHROMATIC_SHARPS, NOTE_SEMITONES } from "../data/musicTheory";

interface KeyboardChordDiagramProps {
  chordName?: string;
  voicing: KeyboardVoicing;
  root: NoteName;
  instrument?: string;
  isSelected?: boolean;
  compact?: boolean;
  compactSize?: "default" | "wide";
  onPlay?: () => void;
  onSelect?: () => void;
  onNoteToggle?: (note: NoteName, octave: number) => void;
  className?: string;
}

export const KeyboardChordDiagram: React.FC<KeyboardChordDiagramProps> = ({
  chordName,
  voicing,
  root,
  instrument,
  isSelected = false,
  compact = false,
  onPlay,
  onSelect,
  onNoteToggle,
  className = "",
}) => {
  // Map notes by pitch value: (octave * 12 + semitone) -> note info
  const chordPitchMap = new Map<
    number,
    {
      note: NoteName;
      octave: number;
      degree: string;
      isRoot: boolean;
      hand?: "LH" | "RH";
    }
  >();

  voicing.notes.forEach((n) => {
    const pitch = n.octave * 12 + (NOTE_SEMITONES[n.note] ?? 0);
    chordPitchMap.set(pitch, {
      note: n.note,
      octave: n.octave,
      degree: n.degree,
      isRoot: !!n.isRoot || n.note === root,
      hand: n.hand,
    });
  });

  const chordPitches = voicing.notes.map(
    (note) => note.octave * 12 + (NOTE_SEMITONES[note.note] ?? 0),
  );
  const lowestChordPitch = Math.min(...chordPitches);
  const highestChordPitch = Math.max(...chordPitches);

  // Sound audition handler
  const handlePlaySound = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onPlay) {
      onPlay();
      return;
    }

    const notesToPlay = voicing.notes.map((n) => ({
      note: n.note,
      octave: n.octave,
    }));

    const targetInst = instrument || audioEngine.getSelectedInstrument();
    const isSynth = targetInst.includes("synth");
    const stagger = isSynth ? 0.012 : 0.016;
    audioEngine.playChordArpeggio(notesToPlay, targetInst, stagger, 0, 2.2);
  };

  // White key relative semitone offsets from C
  const whiteKeyOffsets = [0, 2, 4, 5, 7, 9, 11];
  const allWhiteKeys = Array.from({ length: 11 }, (_, index) => {
    const octave = Math.floor((lowestChordPitch - 12 + index * 12) / 12);
    return { octave, offset: 0 };
  }).flatMap(({ octave }) =>
    whiteKeyOffsets.map((offset) => ({
      octave,
      offset,
      pitch: octave * 12 + offset,
    })),
  );
  const firstVisibleWhiteIndex =
    allWhiteKeys.length -
    1 -
    [...allWhiteKeys]
      .reverse()
      .findIndex((key) => key.pitch <= lowestChordPitch);
  const lastVisibleWhiteIndex =
    allWhiteKeys.length -
    1 -
    [...allWhiteKeys]
      .reverse()
      .findIndex((key) => key.pitch <= highestChordPitch);
  const chordWhiteKeys = allWhiteKeys.slice(
    Math.max(0, firstVisibleWhiteIndex - 1),
    Math.min(allWhiteKeys.length, lastVisibleWhiteIndex + 2),
  );
  const keySize =
    chordWhiteKeys.length > 28
      ? {
          white: "w-5 h-24 pb-1",
          black: "w-3 h-14 pb-0.5",
          offset: "-right-1.5",
        }
      : chordWhiteKeys.length > 21
        ? {
            white: "w-6 h-28 pb-1.5",
            black: "w-4 h-16 pb-0.5",
            offset: "-right-2",
          }
        : chordWhiteKeys.length > 14
          ? {
              white: "w-8 h-32 pb-2",
              black: "w-5 h-20 pb-1",
              offset: "-right-2.5",
            }
          : {
              white: "w-11 h-44 pb-3",
              black: "w-7 h-28 pb-2",
              offset: "-right-3.5",
            };

  // Black keys keyed by the semitone offset of the white key they follow.
  const blackKeyDefs: {
    [offsetIdx: number]: { note: NoteName; semi: number };
  } = {
    0: { note: "C#", semi: 1 },
    2: { note: "D#", semi: 3 },
    5: { note: "F#", semi: 6 },
    7: { note: "G#", semi: 8 },
    9: { note: "A#", semi: 10 },
  };

  return (
    <div
      className={`${compact ? "flex h-full w-full flex-col justify-center" : "bg-surface-container-low border rounded-xl p-4 sm:p-5 flex flex-col justify-between shadow-md transition-all cursor-pointer relative group select-none"} ${
        !compact && isSelected
          ? "border-primary ring-2 ring-primary/30 bg-primary/5"
          : !compact
            ? "border-outline-variant/30 hover:border-outline-variant/70 hover:shadow-lg"
            : ""
      } ${className}`}
      onClick={(e) => {
        if (onSelect) onSelect();
        handlePlaySound(e);
      }}
      title="Click keyboard diagram to preview chord sound"
    >
      {/* Top Header */}
      {!compact && (
        <div className="w-full flex items-center justify-between gap-2 mb-3 pb-2 border-b border-outline-variant/20">
          <div className="flex items-center gap-2 min-w-0">
            <div className="flex flex-col min-w-0">
              <span className="font-bold text-xs sm:text-sm text-on-surface truncate">
                {voicing.name}
              </span>
              <span className="text-[10px] font-mono text-on-surface-variant truncate">
                {voicing.positionLabel}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-[10px] font-mono font-bold bg-surface-container border border-outline-variant/30 text-primary px-2 py-0.5 rounded-full">
              Bass: {voicing.bassNote}
              {voicing.bassOctave}
            </span>
          </div>
        </div>
      )}

      {/* Mini Keyboard Diagram */}
      <div
        onPointerDown={(e) => {
          if (!compact) return;

          const bounds = e.currentTarget.getBoundingClientRect();
          const scrollbarHeight = 14;
          const isScrollbarInteraction =
            e.target === e.currentTarget ||
            e.clientY >= bounds.bottom - scrollbarHeight;

          if (isScrollbarInteraction) e.stopPropagation();
        }}
        className={`w-full max-w-full overflow-x-auto overscroll-x-contain touch-pan-x no-scrollbar ${compact ? "h-full" : "py-2"}`}
      >
        <div className="w-max mx-auto py-2 px-2 flex justify-start sm:justify-center">
          <div className="piano-keyboard flex relative bg-surface-container-highest p-1.5 rounded-b-lg border-t-8 border-outline-variant shadow-2xl">
            {chordWhiteKeys.map((key, keyIdx) => {
              const chordInfo = chordPitchMap.get(key.pitch);
              const isChordKey = !!chordInfo;
              const isRootKey = !!chordInfo?.isRoot;
              const hasBlack =
                keyIdx < chordWhiteKeys.length - 1
                  ? blackKeyDefs[key.offset]
                  : undefined;

              return (
                <div
                  key={`white-${key.octave}-${key.offset}`}
                  className="relative"
                >
                  <div
                    onClick={(event) => {
                      if (!onNoteToggle) return;
                      event.stopPropagation();
                      onNoteToggle(
                        CHROMATIC_SHARPS[key.offset] as NoteName,
                        key.octave,
                      );
                    }}
                    className={`${keySize.white} rounded-b-md border-r border-l border-b border-outline-variant/30 flex flex-col justify-end items-center transition-all ${
                      isRootKey
                        ? "bg-primary text-on-primary font-black border-t-4 border-primary shadow-md z-10"
                        : isChordKey
                          ? "piano-chord-key bg-inverse-surface text-inverse-on-surface font-bold z-10"
                          : "piano-inactive-key piano-white-inactive-key bg-surface-container-highest text-on-surface-variant/40 hover:bg-surface-bright"
                    }`}
                  >
                    {isChordKey && (
                      <span className="font-mono text-[10px] font-bold">
                        {chordInfo.note}
                      </span>
                    )}
                    {isChordKey && (
                      <span
                        className={`font-mono text-[8px] font-bold mt-1 ${
                          isRootKey
                            ? "w-3.5 h-3.5 rounded bg-primary text-on-primary"
                            : "w-3.5 h-3.5 rounded bg-inverse-surface text-inverse-on-surface border border-outline-variant/40"
                        } flex items-center justify-center`}
                      >
                        {chordInfo.degree}
                      </span>
                    )}
                  </div>

                  {hasBlack && (
                    <div className={`absolute top-0 z-30 ${keySize.offset}`}>
                      {(() => {
                        const pitch = key.octave * 12 + hasBlack.semi;
                        const blackChordInfo = chordPitchMap.get(pitch);
                        const blackIsRoot = !!blackChordInfo?.isRoot;
                        return (
                          <div
                            onClick={(event) => {
                              if (!onNoteToggle) return;
                              event.stopPropagation();
                              onNoteToggle(hasBlack.note, key.octave);
                            }}
                            className={`${keySize.black} rounded-b-md flex flex-col justify-end items-center transition-all ${
                              blackIsRoot
                                ? "bg-primary text-on-primary font-bold shadow-lg ring-1 ring-primary"
                                : blackChordInfo
                                  ? "bg-black text-white shadow-[0_4px_8px_rgba(0,0,0,0.8)] border border-zinc-800"
                                  : "piano-black-inactive-key bg-surface-container-low text-on-surface-variant/20 shadow-none border border-transparent hover:bg-surface-container"
                            }`}
                          >
                            {blackChordInfo && (
                              <span className="font-mono text-[9px] font-bold">
                                {blackChordInfo.note}
                              </span>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Spelled Notes & Harmonic Flow */}
      {!compact && (
        <div className="w-full flex items-center justify-between pt-2 border-t border-outline-variant/15 mt-2">
          <div className="flex items-center gap-1 overflow-x-auto text-[10px] font-mono text-on-surface-variant font-medium">
            {voicing.notes.map((n, i) => (
              <span
                key={i}
                className={`px-1.5 py-0.5 rounded ${
                  n.note === root || n.isRoot
                    ? "bg-primary/15 text-primary font-bold"
                    : "bg-surface-container text-on-surface"
                }`}
              >
                {n.note}
                {n.octave}
              </span>
            ))}
          </div>

          <button
            type="button"
            onClick={handlePlaySound}
            className="text-xs text-primary hover:text-primary/80 font-bold px-2 py-0.5 rounded hover:bg-primary/10 transition-colors flex items-center gap-1 shrink-0"
          >
            <span>Audition</span>
          </button>
        </div>
      )}
    </div>
  );
};
