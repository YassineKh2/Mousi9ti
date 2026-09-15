import React, { useRef, useState, useEffect } from "react";
import { NoteName } from "../types";
import { getChordDefinition, getCustomChords } from "../data/chordsData";
import { ChordDiagram } from "./ChordDiagram";
import { KeyboardChordDiagram } from "./KeyboardChordDiagram";
import { ChordSearchInput } from "./ChordSearchInput";
import { X, Edit2, ChevronLeft, ChevronRight } from "lucide-react";

interface SwipeableChordCardProps {
  root: NoteName;
  type: string;
  customChordId?: string;
  instrument: "guitar" | "piano";
  onRemove: () => void;
  onChange?: (root: NoteName, type: string) => void;
}

export const SwipeableChordCard: React.FC<SwipeableChordCardProps> = ({
  root,
  type,
  customChordId,
  instrument,
  onRemove,
  onChange,
}) => {
  const chordDef = getChordDefinition(root, type);
  const normalizeType = (chordType: string) =>
    chordType === "maj" ? "major" : chordType === "min" ? "minor" : chordType;
  const customChord = customChordId
    ? getCustomChords().find(
        (chord) =>
          chord.id === customChordId &&
          (instrument === "piano"
            ? chord.pianoVoicing
            : chord.instrument !== "piano"),
      )
    : undefined;
  const customChords = getCustomChords().filter(
    (chord) =>
      chord.root === root &&
      normalizeType(chord.chordType) === normalizeType(type),
  );
  const customVoicings = customChords
    .filter((chord) =>
      instrument === "piano"
        ? chord.pianoVoicing
        : chord.instrument !== "piano",
    )
    .map((chord) =>
      instrument === "piano" ? chord.pianoVoicing : chord.voicing,
    )
    .filter((voicing): voicing is NonNullable<typeof voicing> => !!voicing);
  const customVoicingFretCounts = customChords
    .filter((chord) => chord.instrument !== "piano")
    .map((chord) => chord.fretCount);
  const voicings =
    instrument === "guitar"
      ? customChord
        ? [customChord.voicing]
        : [...chordDef.voicings, ...customVoicings]
      : customChord
        ? [customChord.pianoVoicing!]
        : [...(chordDef.keyboardVoicings || []), ...customVoicings];
  const [activeIndex, setActiveIndex] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const dragStartX = useRef<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleScroll = () => {
    if (!scrollRef.current) return;
    const scrollLeft = scrollRef.current.scrollLeft;
    const width = scrollRef.current.clientWidth;
    // Calculate index based on scroll position
    const newIndex = Math.round(scrollLeft / width);
    if (
      newIndex !== activeIndex &&
      newIndex >= 0 &&
      newIndex < voicings.length
    ) {
      setActiveIndex(newIndex);
    }
  };

  const handleGoToIndex = (i: number) => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        left: i * scrollRef.current.clientWidth,
        behavior: "smooth",
      });
    }
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.pointerType !== "mouse") return; // let native touch scroll handle it
    dragStartX.current = e.clientX;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch (err) {}
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (
      e.pointerType !== "mouse" ||
      dragStartX.current === null ||
      !scrollRef.current
    )
      return;
    // Visual drag feedback for PC
    e.preventDefault();
    const diff = e.clientX - dragStartX.current;
    // Normal drag logic: diff < 0 means dragging left, so scrollRight increases.
    // However, since it's snap container, we don't strictly *have* to visually update `scrollLeft`
    // unless we disable snap. Let's just allow a slight translation or do nothing visually
    // since `pointerUp` will handle the index jump.
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (e.pointerType !== "mouse" || dragStartX.current === null) return;

    const diff = e.clientX - dragStartX.current;
    dragStartX.current = null;

    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch (err) {}

    // User requested explicitly:
    // "if i move to the right i should get the next chord" (diff > 30) -> Next
    // "if i move to the left i should get the previous" (diff < -30) -> Prev
    if (diff < -30 && activeIndex < voicings.length - 1) {
      handleGoToIndex(activeIndex + 1);
    } else if (diff > 30 && activeIndex > 0) {
      handleGoToIndex(activeIndex - 1);
    }
  };

  // When instrument changes, voicings change, so reset index
  useEffect(() => {
    setActiveIndex(0);
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ left: 0, behavior: "instant" });
    }
  }, [instrument]);

  if (!voicings || voicings.length === 0) return null;

  return (
    <div className="relative flex flex-col w-full h-full overflow-hidden group">
      <button
        onClick={onRemove}
        className="absolute top-0 right-0 p-1.5 text-on-surface-variant hover:text-red-400 bg-surface-container hover:bg-surface-container-highest rounded-full transition-colors z-10 opacity-0 group-hover:opacity-100 focus:opacity-100"
      >
        <X size={12} />
      </button>

      {isEditing && onChange ? (
        <div className="mb-2 w-full px-4">
          <ChordSearchInput
            autoFocus
            initialValue={`${root}${chordDef.symbol}`}
            onSelect={(newRoot, newType) => {
              onChange(newRoot, newType);
              setIsEditing(false);
            }}
            onCancel={() => setIsEditing(false)}
          />
        </div>
      ) : (
        <div
          onClick={() => {
            if (onChange) setIsEditing(true);
          }}
          className={`font-bold text-on-surface mb-2 font-mono text-center text-sm tracking-wider uppercase flex justify-center items-center gap-1 ${onChange ? "cursor-pointer hover:text-primary transition-colors" : ""}`}
          title={onChange ? "Click to change chord" : undefined}
        >
          {chordDef.name}
          {onChange && <Edit2 size={10} className="opacity-50" />}
        </div>
      )}

      <div className="flex-1 flex flex-col justify-center min-w-0 h-full">
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
          onPointerMove={handlePointerMove}
          onPointerCancel={handlePointerUp}
          className="flex h-full overflow-x-auto snap-x snap-mandatory scroll-smooth w-full [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] select-none cursor-grab active:cursor-grabbing"
          style={{ touchAction: "pan-x" }}
        >
          {voicings.map((voicing, i) => (
            <div
              key={i}
              className="w-full h-full flex-shrink-0 snap-center flex justify-center items-center px-2"
            >
              <div
                className={`${instrument === "piano" ? "pointer-events-auto" : "pointer-events-none"} w-full h-full flex justify-center items-center`}
              >
                {instrument === "guitar" ? (
                  <ChordDiagram
                    root={root}
                    voicing={voicing as any}
                    compact={true}
                    fretCount={
                      customChord?.fretCount ??
                      customVoicingFretCounts[i - chordDef.voicings.length]
                    }
                  />
                ) : (
                  <KeyboardChordDiagram
                    root={root}
                    voicing={voicing as any}
                    instrument="acoustic_grand_piano"
                    compact={true}
                    compactSize="wide"
                  />
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-center items-center gap-1.5 mt-2 h-5">
        <button
          onClick={() => handleGoToIndex(activeIndex - 1)}
          disabled={activeIndex === 0}
          className="md:hidden p-0.5 text-on-surface-variant transition-colors hover:text-on-surface disabled:opacity-30 disabled:pointer-events-none"
          aria-label="Go to previous voicing"
        >
          <ChevronLeft size={14} />
        </button>

        {voicings.map((_, i) => (
          <button
            key={i}
            onClick={() => handleGoToIndex(i)}
            className={`rounded-full transition-all duration-300 ${i === activeIndex ? "w-2 h-2 bg-primary" : "w-1.5 h-1.5 bg-outline-variant/40 hover:bg-outline-variant/70"}`}
            aria-label={`Go to voicing ${i + 1}`}
          />
        ))}

        <button
          onClick={() => handleGoToIndex(activeIndex + 1)}
          disabled={activeIndex === voicings.length - 1}
          className="md:hidden p-0.5 text-on-surface-variant transition-colors hover:text-on-surface disabled:opacity-30 disabled:pointer-events-none"
          aria-label="Go to next voicing"
        >
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
};
