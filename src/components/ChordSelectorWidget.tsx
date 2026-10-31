import React, { useEffect, useRef, useState } from "react";
import { Guitar, Layers, Music2, Piano, Plus } from "lucide-react";
import { SwipeableChordCard } from "./SwipeableChordCard";
import { BassIcon } from "./BassIcon";
import { ChordSearchInput } from "./ChordSearchInput";
import { ChordSelection, PracticeInstrument } from "../types";
import type { InstrumentDisplay } from "../lib/frettedInstrument";
import { getCombinedInstrumentLabel, getDisplayedInstruments, getEnabledInstruments, normalizeInstrumentDisplay } from "../lib/instrumentDisplay";
import { getSavedChordSelections, saveChordSelections } from "../lib/storage";
import { getCustomChords } from "../data/chordsData";

interface ChordSelectorWidgetProps {
  defaultInstrument: "guitar" | "piano" | "bass";
  instrumentView: "guitar" | "piano" | "bass" | "both";
  enabledInstruments?: PracticeInstrument[];
}

export const ChordSelectorWidget: React.FC<ChordSelectorWidgetProps> = ({
  instrumentView,
  enabledInstruments: enabledInstrumentSettings,
}) => {
  const enabledInstruments = React.useMemo(
    () => getEnabledInstruments({ enabledInstruments: enabledInstrumentSettings }),
    [enabledInstrumentSettings],
  );
  const [selectedView, setSelectedView] = useState<InstrumentDisplay>(instrumentView);
  const view = normalizeInstrumentDisplay(selectedView, enabledInstruments);
  const displayedInstruments = getDisplayedInstruments(view, enabledInstruments);
  const combinedLabel = getCombinedInstrumentLabel(enabledInstruments);

  useEffect(() => {
    setSelectedView((current) => normalizeInstrumentDisplay(current, enabledInstruments));
  }, [enabledInstruments]);

  useEffect(() => {
    setSelectedView(normalizeInstrumentDisplay(instrumentView, enabledInstruments));
  }, [instrumentView]);

  const loadChordSelections = (): ChordSelection[] => {
    const hasSavedSelections =
      localStorage.getItem("Mousi9ti_chord_selections_v1") !== null;
    const savedSelections = getSavedChordSelections();
    const normalizeType = (type: string) =>
      type === "maj" ? "major" : type === "min" ? "minor" : type;
    const selections: ChordSelection[] = savedSelections.map((selection) => ({
      ...selection,
      root: selection.root,
      type: normalizeType(selection.type),
    }));
    const selectionKeys = new Set(
      selections.map(
        (selection) => `${selection.root}-${normalizeType(selection.type)}`,
      ),
    );

    getCustomChords().forEach((chord) => {
      const key = `${chord.root}-${normalizeType(chord.chordType)}`;
      if (!selectionKeys.has(key)) {
        selections.unshift({
          root: chord.root,
          type: normalizeType(chord.chordType),
          customChordId: chord.id,
          instrument: chord.instrument,
        });
        selectionKeys.add(key);
      }
    });

    if (selections.length === 0 && !hasSavedSelections) {
      return [
        { root: "C", type: "maj" },
        { root: "G", type: "maj" },
        { root: "A", type: "min" },
      ];
    }

    return selections;
  };

  const [selectedChords, setSelectedChords] = useState<ChordSelection[]>(() => {
    return loadChordSelections();
  });
  const [isFullWidth, setIsFullWidth] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const widgetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    saveChordSelections(selectedChords);
  }, [selectedChords]);

  useEffect(() => {
    const handleCustomChordsChanged = () => {
      setSelectedChords(loadChordSelections());
    };

    window.addEventListener(
      "mousi9ti-custom-chords-changed",
      handleCustomChordsChanged,
    );
    window.addEventListener(
      "mousi9ti-chord-selections-changed",
      handleCustomChordsChanged,
    );
    return () => {
      window.removeEventListener(
        "mousi9ti-custom-chords-changed",
        handleCustomChordsChanged,
      );
      window.removeEventListener(
        "mousi9ti-chord-selections-changed",
        handleCustomChordsChanged,
      );
    };
  }, []);

  useEffect(() => {
    const widget = widgetRef.current;
    if (!widget) return;

    const observer = new ResizeObserver(([entry]) => {
      setIsFullWidth(entry.contentRect.width >= 900);
    });

    observer.observe(widget);
    return () => observer.disconnect();
  }, []);

  const handleRemoveChord = (index: number) => {
    setSelectedChords((currentChords) =>
      currentChords.filter((_, i) => i !== index),
    );
  };

  const visibleChords = isFullWidth
    ? selectedChords.slice(0, 3)
    : selectedChords.slice(0, 1);

  return (
    <div
      ref={widgetRef}
      className="light-shadow-widget flex h-full flex-col rounded-2xl border border-outline-variant/30 bg-surface-container p-5 shadow-sm"
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-mono text-sm font-bold text-on-surface uppercase tracking-wider flex items-center gap-2">
          <Music2 size={16} className="shrink-0 text-primary" />
          Chord Selector
        </h3>
        <div role="group" aria-label="Chord instruments" className="flex w-fit shrink-0 items-center gap-1 rounded-lg border border-outline-variant/30 bg-surface-container-low p-1">
          {([...enabledInstruments, ...(enabledInstruments.length > 1 ? ["both" as const] : [])]).map((instrument) => {
            const label = instrument === "both" ? combinedLabel : instrument === "piano" ? "Piano" : instrument === "bass" ? "Bass" : "Guitar";
            const Icon = instrument === "both" ? Layers : instrument === "piano" ? Piano : instrument === "bass" ? BassIcon : Guitar;
            return (
              <button
                key={instrument}
                type="button"
                title={`${label} view`}
                aria-label={instrument === "both" ? `${label} instruments` : label}
                aria-pressed={view === instrument}
                onClick={() => setSelectedView(instrument)}
                className={`h-7 w-7 px-0 lg:w-auto lg:px-2 flex items-center justify-center gap-1.5 text-xs font-mono rounded transition-all cursor-pointer ${
                  view === instrument
                    ? "bg-primary text-on-primary font-bold shadow"
                    : "text-on-surface-variant hover:text-on-surface"
                }`}
              >
                <Icon size={14} />
                <span className="hidden lg:inline">{label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div
        className={`grid flex-1 gap-4 ${isFullWidth ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3" : "grid-cols-1"}`}
      >
        {visibleChords.map((chord, i) => (
          <div key={`${chord.root}-${chord.type}-${i}`} className="flex min-w-0 flex-col gap-4">
            {displayedInstruments.map((chordInstrument) => (
              <div key={chordInstrument} className="min-w-0 flex-1">
                {displayedInstruments.length > 1 && (
                  <h4 className="mb-2 text-center font-mono text-xs text-on-surface-variant">
                    {chordInstrument === "piano" ? "Piano" : chordInstrument === "bass" ? "Bass" : "Guitar"}
                  </h4>
                )}
                <SwipeableChordCard
                  root={chord.root}
                  type={chord.type}
                  customChordId={chord.customChordId}
                  instrument={chordInstrument}
                  onRemove={() => handleRemoveChord(i)}
                  onChange={(newRoot, newType) => {
                    setSelectedChords((currentChords) => {
                      const updated = [...currentChords];
                      updated[i] = { root: newRoot, type: newType };
                      return updated;
                    });
                  }}
                />
              </div>
            ))}
          </div>
        ))}

        {visibleChords.length < (isFullWidth ? 3 : 1) && (
          <div className="flex flex-col items-center justify-center bg-surface-container-low/50 border border-dashed border-outline-variant/50 rounded-xl p-4 min-h-[140px] w-full">
            {isAdding ? (
              <div className="flex flex-col gap-3 w-full max-w-[200px]">
                <ChordSearchInput
                  autoFocus
                  onSelect={(root, type, customChordId) => {
                    setSelectedChords((currentChords) => [
                      ...currentChords,
                      { root, type, customChordId },
                    ]);
                    setIsAdding(false);
                  }}
                  onCancel={() => setIsAdding(false)}
                />
              </div>
            ) : (
              <button
                type="button"
                aria-label="Add chord"
                onClick={() => setIsAdding(true)}
                className="w-12 h-12 rounded-full bg-surface-container hover:bg-surface-container-highest text-on-surface-variant hover:text-primary flex items-center justify-center transition-colors shadow-sm"
                title="Add Chord"
              >
                <Plus size={24} />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
