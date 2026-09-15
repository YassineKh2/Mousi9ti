import React, { useState, useRef, useEffect } from "react";
import { Search, X } from "lucide-react";
import { NoteName } from "../types";
import { CHORD_TYPES_CATALOG, getCustomChords } from "../data/chordsData";
import { ALL_ROOT_NOTES } from "../data/musicTheory";

// Pre-generate all chords for fast searching
const ALL_CHORDS = ALL_ROOT_NOTES.flatMap((root) =>
  CHORD_TYPES_CATALOG.map((ct) => ({
    root,
    type: ct.type,
    symbol: ct.symbol,
    name: ct.name,
    displayString: `${root}${ct.symbol}`,
    fullName: `${root} ${ct.name}`,
  })),
);

type SearchChord = (typeof ALL_CHORDS)[number] & { customChordId?: string };

interface ChordSearchInputProps {
  onSelect: (root: NoteName, type: string, customChordId?: string) => void;
  onCancel: () => void;
  autoFocus?: boolean;
  initialValue?: string;
  placeholder?: string;
}

export const ChordSearchInput: React.FC<ChordSearchInputProps> = ({
  onSelect,
  onCancel,
  autoFocus,
  initialValue = "",
  placeholder = "Search chord (e.g. Cmaj7)...",
}) => {
  const [query, setQuery] = useState(initialValue);
  const inputRef = useRef<HTMLInputElement>(null);

  const allChords: SearchChord[] = [
    ...ALL_CHORDS,
    ...getCustomChords().map((chord) => ({
      root: chord.root,
      type: chord.chordType,
      symbol: "",
      name: chord.pianoVoicing?.name || chord.voicing.name,
      displayString: `${chord.root} ${chord.pianoVoicing?.name || chord.voicing.name}`,
      fullName: `${chord.root} ${chord.pianoVoicing?.name || chord.voicing.name}`,
      customChordId: chord.id,
    })),
  ];

  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  const filteredChords = allChords
    .filter((c) => {
      if (!query) return true; // Show all if no query (but capped by slice)
      const q = query.toLowerCase().replace(/\s+/g, "");
      const displayStr = c.displayString.toLowerCase();
      const fullStr = c.fullName.toLowerCase().replace(/\s+/g, "");
      return displayStr.includes(q) || fullStr.includes(q);
    })
    .slice(0, 30); // limit to 30 results for perf

  return (
    <div className="relative w-full z-50">
      <div className="relative">
        <Search
          size={14}
          className="absolute left-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant"
        />
        <input
          ref={inputRef}
          type="text"
          placeholder={placeholder}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              onCancel();
            } else if (e.key === "Enter" && filteredChords.length > 0) {
              onSelect(
                filteredChords[0].root,
                filteredChords[0].type,
                filteredChords[0].customChordId,
              );
            }
          }}
          className="w-full bg-surface-container-high border border-outline-variant/40 rounded-lg pl-8 pr-7 py-1.5 text-xs font-mono text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary"
        />
        <button
          onClick={onCancel}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface p-0.5"
        >
          <X size={12} />
        </button>
      </div>

      <div className="absolute top-full left-0 right-0 mt-1 max-h-[160px] overflow-y-auto bg-surface-container-high border border-outline-variant/30 rounded-lg shadow-xl flex flex-col p-1">
        {filteredChords.length > 0 ? (
          filteredChords.map((chord) => (
            <button
              key={`${chord.root}-${chord.type}-${chord.customChordId || "standard"}`}
              onClick={() =>
                onSelect(chord.root, chord.type, chord.customChordId)
              }
              className="text-left px-2 py-1.5 hover:bg-surface-container-highest rounded text-xs font-mono flex justify-between items-center"
            >
              <span className="font-bold text-on-surface">
                {chord.displayString}
              </span>
              <span className="text-on-surface-variant text-[10px] ml-2 truncate">
                {chord.name}
              </span>
            </button>
          ))
        ) : (
          <div className="px-2 py-2 text-xs text-on-surface-variant text-center">
            No chords found
          </div>
        )}
      </div>
    </div>
  );
};
