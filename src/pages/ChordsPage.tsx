import React, { useState, useEffect } from "react";
import { AppSettings, NoteName } from "../types";
import {
  CHROMATIC_SHARPS,
  NOTE_SEMITONES,
  ALL_ROOT_NOTES,
  getSpelledNote,
} from "../data/musicTheory";
import {
  CHORD_TYPES_CATALOG,
  CustomChord,
  getChordDefinition,
  getCustomChords,
} from "../data/chordsData";
import { ChordDiagram } from "../components/ChordDiagram";
import { PianoKeyboard } from "../components/PianoKeyboard";
import { ChordSheetMusic } from "../components/ChordSheetMusic";
import { KeyboardChordDiagram } from "../components/KeyboardChordDiagram";
import {
  Search,
  Play,
  AlertCircle,
  X,
  ExternalLink,
  Guitar,
  Piano,
  Layers,
} from "lucide-react";
import { audioEngine } from "../lib/audio";

interface ChordsPageProps {
  initialChordTarget?: { chordType: string; root: NoteName } | null;
  onInitialChordHandled?: () => void;
  settings: AppSettings;
}

export const ChordsPage: React.FC<ChordsPageProps> = ({
  initialChordTarget,
  onInitialChordHandled,
  settings,
}) => {
  const [selectedRoot, setSelectedRoot] = useState<NoteName>("E");
  const [selectedType, setSelectedType] = useState<string>("min7");
  const [showStaffNotation, setShowStaffNotation] = useState(false);
  const [instrumentView, setInstrumentView] = useState<
    "guitar" | "piano" | "both"
  >(settings.defaultInstrument);
  const [customChords, setCustomChords] = useState<CustomChord[]>(() =>
    getCustomChords(),
  );

  useEffect(() => {
    setInstrumentView(settings.defaultInstrument);
  }, [settings.defaultInstrument]);
  useEffect(() => {
    const handleCustomChordsChanged = () => setCustomChords(getCustomChords());
    window.addEventListener(
      "mousi9ti-custom-chords-changed",
      handleCustomChordsChanged,
    );
    return () =>
      window.removeEventListener(
        "mousi9ti-custom-chords-changed",
        handleCustomChordsChanged,
      );
  }, []);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedInversion, setSelectedInversion] = useState<number>(0);
  const customVoicings = customChords.filter(
    (chord) =>
      chord.instrument !== "piano" &&
      chord.root === selectedRoot &&
      chord.chordType === selectedType,
  );
  const customPianoVoicings = customChords.filter(
    (chord) =>
      chord.pianoVoicing &&
      chord.root === selectedRoot &&
      chord.chordType === selectedType,
  );

  const [redirectNotice, setRedirectNotice] = useState<{
    from: string;
    to: string;
  } | null>(null);
  const [showRedirectModal, setShowRedirectModal] = useState(false);
  const [showChordCoverageModal, setShowChordCoverageModal] = useState(false);

  useEffect(() => {
    if (!searchQuery) return;

    const rawClean = searchQuery
      .trim()
      .toLowerCase()
      .replace(/\bchord\b/gi, "")
      .trim();

    // Aliases mapping to actual catalog 'type' values
    const aliases: Record<string, string> = {
      "half diminished": "m7b5",
      "half-diminished": "m7b5",
      "half dim": "m7b5",
      ø: "m7b5",
      hendrix: "7#9",
      diminished: "dim",
      "diminished 7th": "dim7",
      "diminished 7": "dim7",
      "fully diminished": "dim7",
      dominant: "7",
      dom: "7",
      "dominant 7": "7",
      "dominant 7th": "7",
      min: "minor",
      "-": "minor",
      maj: "major",
      m: "minor",
      M: "major",
      "major 7": "maj7",
      "major 7th": "maj7",
      "minor 7": "min7",
      "minor 7th": "min7",
    };

    // 1. Try to match purely as a chord type (no root note provided)
    // Ignore valid standalone root notes (A-G with optional #/b) so "A" doesn't get confused
    if (!/^[a-g][#b]?$/i.test(rawClean)) {
      const targetJustType = aliases[rawClean] || rawClean;
      const matchedJustType = CHORD_TYPES_CATALOG.find(
        (c) =>
          c.symbol.toLowerCase() === targetJustType ||
          c.type.toLowerCase() === targetJustType ||
          c.name.toLowerCase() === targetJustType,
      );

      if (matchedJustType) {
        setSelectedType(matchedJustType.type);
        return; // Stop here, we successfully changed the type
      }
    }

    // 2. Fallback to standard Root + Type parsing
    const regex = /^([a-gA-G][#b]?)(.*)$/i;
    const match = rawClean.match(regex);
    if (match) {
      let parsedRoot = match[1];
      let parsedTypeSymbol = match[2].trim();

      parsedRoot =
        parsedRoot.charAt(0).toUpperCase() + parsedRoot.slice(1).toLowerCase();

      const theoreticalRedirections: Record<string, string> = {
        "A#": "Bb",
        "D#": "Eb",
        "G#": "Ab",
      };

      if (theoreticalRedirections[parsedRoot]) {
        setRedirectNotice({
          from: parsedRoot,
          to: theoreticalRedirections[parsedRoot],
        });
        parsedRoot = theoreticalRedirections[parsedRoot];
      } else {
        setRedirectNotice(null);
      }

      let targetType = parsedTypeSymbol;
      if (aliases[parsedTypeSymbol]) {
        targetType = aliases[parsedTypeSymbol];
      }

      if (ALL_ROOT_NOTES.includes(parsedRoot as NoteName)) {
        let matchedType = CHORD_TYPES_CATALOG.find(
          (c) =>
            c.symbol.toLowerCase() === targetType ||
            c.type.toLowerCase() === targetType ||
            c.name.toLowerCase() === targetType,
        );

        // Fuzzy fallback
        if (!matchedType && targetType !== "") {
          matchedType = CHORD_TYPES_CATALOG.find(
            (c) =>
              c.name.toLowerCase().includes(targetType) ||
              c.type.toLowerCase().includes(targetType),
          );
        }

        if (!matchedType && targetType === "") {
          matchedType = CHORD_TYPES_CATALOG.find((c) => c.type === "major");
        }

        if (matchedType) {
          setSelectedRoot(parsedRoot as NoteName);
          setSelectedType(matchedType.type);
        }
      }
    }
  }, [searchQuery]);

  useEffect(() => {
    if (!initialChordTarget) return;
    const found = CHORD_TYPES_CATALOG.find(
      (c) => c.type === initialChordTarget.chordType,
    );
    if (found) {
      setSelectedRoot(initialChordTarget.root);
      setSelectedType(found.type);
      setSearchQuery("");
    }
    onInitialChordHandled?.();
  }, [initialChordTarget, onInitialChordHandled]);

  const chordDef = getChordDefinition(selectedRoot, selectedType);

  const numNotes = chordDef.notes.length;
  const activeInversion = Math.min(selectedInversion, numNotes - 1);

  // Calculate exact piano voicing based on inversion
  const pianoBaseOctave = 4;
  const rootIndex = NOTE_SEMITONES[chordDef.root];

  const invertedSemitones = [...chordDef.intervals];
  for (let i = 0; i < activeInversion; i++) {
    invertedSemitones[i] += 12; // Shift up an octave
  }
  invertedSemitones.sort((a, b) => a - b);

  const exactPianoVoicing = invertedSemitones.map((st) => {
    const totalSemitones = rootIndex + st;
    const noteIndex = totalSemitones % 12;
    const noteName = getSpelledNote(noteIndex, { root: chordDef.root });
    const octave =
      pianoBaseOctave +
      Math.floor(totalSemitones / 12) -
      Math.floor(rootIndex / 12);
    return { noteName, octave, st };
  });

  const computedMinOctave = Math.min(...exactPianoVoicing.map((v) => v.octave));
  const computedMaxOctave = Math.max(...exactPianoVoicing.map((v) => v.octave));

  // Enforce a standard view of 3 octaves centered around Middle C / Octave 4 (e.g. C3 to C6)
  const minOctave = Math.min(3, computedMinOctave);
  const maxOctave = Math.max(minOctave + 3, computedMaxOctave + 1);
  const pianoOctavesCount = maxOctave - minOctave;

  const handlePlayArpeggio = () => {
    const notesToPlay = exactPianoVoicing.map((v) => ({
      note: v.noteName as NoteName,
      octave: v.octave,
    }));

    if (instrumentView === "both") {
      audioEngine.playChordArpeggio(notesToPlay, "guitar", 0.06, 0, 1.8);
      audioEngine.playChordArpeggio(notesToPlay, "piano", 0.06, 0.18, 1.2);
      return;
    }

    audioEngine.playChordArpeggio(notesToPlay, instrumentView, 0.06);
  };

  const handleInversionSelect = (index: number) => {
    setSelectedInversion(index);

    const inversionSemitones = [...chordDef.intervals];
    for (let i = 0; i < index; i++) {
      inversionSemitones[i] += 12;
    }
    inversionSemitones.sort((a, b) => a - b);

    const notesToPlay = inversionSemitones.map((st) => {
      const totalSemitones = rootIndex + st;
      const noteIndex = totalSemitones % 12;
      const noteName = getSpelledNote(noteIndex, { root: chordDef.root });
      const octave =
        pianoBaseOctave +
        Math.floor(totalSemitones / 12) -
        Math.floor(rootIndex / 12);
      return { note: noteName as NoteName, octave };
    });

    audioEngine.playChordArpeggio(notesToPlay, "piano", 0.06);
  };

  return (
    <div className="space-y-8 pb-12 pt-4">
      {/* Search and Instrument Toggle Bar */}
      <div data-tour="chords-search" className="flex flex-col items-stretch gap-2 bg-surface-container-low rounded-lg p-2 border border-outline-variant/30 sm:flex-row sm:items-center sm:gap-4">
        <div className="relative flex min-w-0 flex-1 items-center">
          <Search
            size={16}
            className="absolute left-3 text-on-surface-variant"
          />
          <input
            type="text"
            placeholder="Search chord (e.g., Am7)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-transparent pl-10 pr-4 py-2 text-sm font-mono text-on-surface placeholder:text-on-surface-variant focus:outline-none"
          />
        </div>
        <div className="flex w-full shrink-0 overflow-hidden rounded border border-outline-variant/30 bg-surface-container text-xs font-mono font-bold sm:w-auto">
          <button
            onClick={() => setInstrumentView("guitar")}
            aria-label="Guitar view"
            className={`flex min-h-11 flex-1 items-center justify-center gap-2 px-3 py-2 transition-colors sm:min-h-0 sm:flex-none sm:px-4 ${
              instrumentView === "guitar"
                ? "bg-primary text-on-primary"
                : "text-on-surface-variant hover:text-on-surface"
            }`}
          >
            <Guitar size={14} />
            <span className="hidden sm:inline">Guitar</span>
          </button>
          <button
            onClick={() => setInstrumentView("piano")}
            aria-label="Piano view"
            className={`flex min-h-11 flex-1 items-center justify-center gap-2 px-3 py-2 transition-colors sm:min-h-0 sm:flex-none sm:px-4 ${
              instrumentView === "piano"
                ? "bg-primary text-on-primary"
                : "text-on-surface-variant hover:text-on-surface"
            }`}
          >
            <Piano size={14} />
            <span className="hidden sm:inline">Piano</span>
          </button>
          <button
            onClick={() => setInstrumentView("both")}
            aria-label="Both instrument views"
            className={`flex min-h-11 flex-1 items-center justify-center gap-2 px-3 py-2 transition-colors sm:min-h-0 sm:flex-none sm:px-4 ${
              instrumentView === "both"
                ? "bg-primary text-on-primary"
                : "text-on-surface-variant hover:text-on-surface"
            }`}
          >
            <Layers size={14} />
            <span className="hidden sm:inline">Both</span>
          </button>
        </div>
      </div>

      {/* Redirect Notification */}
      {redirectNotice && (
        <div className="flex items-center justify-between bg-primary/10 border border-primary/30 rounded-lg p-3 text-sm">
          <div className="flex items-center gap-2">
            <AlertCircle size={16} className="text-primary" />
            <span className="text-on-surface">
              Redirected from <strong>{redirectNotice.from}</strong> to{" "}
              <strong>{redirectNotice.to}</strong>.
            </span>
          </div>
          <button
            onClick={() => setShowRedirectModal(true)}
            className="text-primary font-semibold hover:underline text-xs"
          >
            Not what you expected?
          </button>
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-6 items-start w-full max-w-full">
        {/* Left Sidebar: Filters */}
        <div data-tour="chords-filters" className="w-full lg:w-72 flex flex-col gap-4 shrink-0">
          {/* Root Note Panel */}
          <div className="rounded-xl border border-outline-variant/30 bg-surface-container-low p-4 sm:p-5">
            <span className="text-xs font-mono text-on-surface-variant tracking-[0.2em] uppercase font-bold block mb-4">
              Root Note
            </span>
            <div className="grid grid-cols-4 gap-2">
              {ALL_ROOT_NOTES.map((n) => (
                <button
                  key={n}
                  onClick={() => {
                    setSelectedRoot(n);
                    setSearchQuery("");
                  }}
                  className={`flex h-9 items-center justify-center rounded px-3 text-sm font-bold transition-colors ${
                    selectedRoot === n
                      ? "bg-primary text-on-primary"
                      : "bg-surface-container text-on-surface hover:bg-surface-container-high border border-outline-variant/10"
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          {/* Chord Type Panel */}
          <div className="rounded-xl border border-outline-variant/30 bg-surface-container-low p-4 sm:p-5">
            <span className="text-xs font-mono text-on-surface-variant tracking-[0.2em] uppercase font-bold block mb-4">
              Chord Type
            </span>

            {/* Main Types */}
            <div className="grid grid-cols-2 gap-2 mb-4">
              {CHORD_TYPES_CATALOG.filter((c) =>
                ["major", "minor", "7", "maj7", "min7", "dim"].includes(c.type),
              ).map((c) => {
                const isSelected = selectedType === c.type;
                return (
                  <button
                    key={c.type}
                    onClick={() => {
                      setSelectedType(c.type);
                      setSearchQuery("");
                    }}
                    className={`px-2 py-2 rounded-lg text-xs font-bold transition-all border ${
                      isSelected
                        ? "bg-primary text-on-primary border-primary shadow"
                        : "bg-surface-container text-on-surface hover:bg-surface-container-high border-outline-variant/10"
                    }`}
                  >
                    {c.name}
                  </button>
                );
              })}
            </div>

            {/* Other Types */}
            <div className="relative">
              <select
                value={selectedType}
                onChange={(e) => {
                  setSelectedType(e.target.value);
                  setSearchQuery("");
                }}
                className="w-full appearance-none bg-surface-container border border-outline-variant/30 rounded-lg px-4 py-3 text-sm text-on-surface focus:outline-none focus:border-primary"
              >
                <optgroup label="Main Chords">
                  {CHORD_TYPES_CATALOG.filter((c) =>
                    ["major", "minor", "7", "maj7", "min7", "dim"].includes(
                      c.type,
                    ),
                  ).map((c) => (
                    <option key={c.type} value={c.type}>
                      {c.name}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Extended / Other">
                  {CHORD_TYPES_CATALOG.filter(
                    (c) =>
                      !["major", "minor", "7", "maj7", "min7", "dim"].includes(
                        c.type,
                      ),
                  ).map((c) => (
                    <option key={c.type} value={c.type}>
                      {c.name}
                    </option>
                  ))}
                </optgroup>
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none text-on-surface-variant">
                <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20">
                  <path
                    d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                    clipRule="evenodd"
                    fillRule="evenodd"
                  ></path>
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Right Content Area */}
        <div className="flex-1 space-y-8 min-w-0 max-w-full w-full">
          {/* Chord Header Panel */}
          <div className="flex flex-col items-stretch justify-between gap-5 rounded-xl border border-outline-variant/30 bg-surface-container-low p-4 sm:gap-6 sm:p-8 xl:flex-row xl:items-center">
            <div className="space-y-4 min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-3 sm:gap-4">
                <h2 className="text-3xl font-bold tracking-tight text-on-surface sm:text-5xl lg:text-6xl">
                  {chordDef.name}
                </h2>
                <div className="bg-surface-container border border-outline-variant/30 px-3 py-1.5 rounded-lg text-primary font-mono text-xs sm:text-sm font-bold">
                  {chordDef.fullName}
                </div>
                <button
                  type="button"
                  onClick={() => setShowStaffNotation((prev) => !prev)}
                  className={`font-mono px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                    showStaffNotation
                      ? "bg-primary text-on-primary border-primary shadow"
                      : "bg-surface-container text-on-surface hover:bg-surface-container-high border-outline-variant/10"
                  }`}
                  title="Toggle staff notation"
                >
                  {showStaffNotation ? "Hide Staff" : "Show Staff"}
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-6 sm:gap-8 pt-1">
                <div>
                  <span className="text-[10px] font-mono text-on-surface-variant tracking-wider uppercase block mb-1.5 font-bold">
                    Formula
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {chordDef.formula.split("-").map((part, i) => (
                      <span
                        key={i}
                        className="bg-surface-container text-on-surface font-mono text-xs px-2.5 py-1 rounded-md border border-outline-variant/20 font-medium"
                      >
                        {part}
                      </span>
                    ))}
                  </div>
                </div>
                <div>
                  <span className="text-[10px] font-mono text-on-surface-variant tracking-wider uppercase block mb-1.5 font-bold">
                    Notes
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {chordDef.notes.map((note, i) => (
                      <span
                        key={i}
                        className="bg-surface-container text-on-surface font-mono text-xs font-bold px-2.5 py-1 rounded-md border border-outline-variant/20"
                      >
                        {note}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="shrink-0 flex items-center justify-end sm:pl-2">
              <button
                onClick={handlePlayArpeggio}
                aria-label="Play Chord"
                className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-primary text-on-primary flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-lg hover:shadow-primary/20 shrink-0"
              >
                <Play fill="currentColor" size={24} />
              </button>
            </div>
          </div>

          {/* Dedicated Staff Notation & Sheet Music Container */}
          {showStaffNotation && (
            <div className="w-full">
              <ChordSheetMusic
                chordName={chordDef.name}
                notes={chordDef.notes}
                exactVoicing={exactPianoVoicing}
                root={chordDef.root}
                onPlay={handlePlayArpeggio}
                className="w-full"
              />
            </div>
          )}

          {/* Voicings / Keyboard area */}
          <div data-tour="chords-voicing" className="w-full max-w-full min-w-0">
            <div className="mb-5 flex items-center gap-2 sm:mb-6">
              <h3 className="text-2xl font-bold text-on-surface">Voicings</h3>
              <button
                type="button"
                onClick={() => setShowChordCoverageModal(true)}
                className="flex h-3.5 w-3.5 cursor-pointer items-center justify-center rounded-full border border-primary/30 bg-primary/10 text-[8px] font-bold leading-none text-primary transition-colors hover:bg-primary/15"
                aria-label="Chord coverage info"
                title="Chord coverage info"
              >
                ?
              </button>
            </div>

            {(instrumentView === "guitar" || instrumentView === "both") && (
              <div className="space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-2">
                  <div className="flex items-center gap-2 text-sm font-mono font-bold uppercase tracking-[0.2em] text-on-surface-variant">
                    <Guitar size={14} />
                    <span>Guitar Voicings</span>
                  </div>
                  <span className="text-right text-[10px] font-mono uppercase tracking-[0.15em] text-on-surface-variant/80 sm:tracking-[0.2em]">
                    click to play
                  </span>
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3 sm:gap-6">
                  {[
                    ...chordDef.voicings.map((voicing) => ({
                      voicing,
                      fretCount: 5,
                    })),
                    ...customVoicings.map((chord) => ({
                      voicing: chord.voicing,
                      fretCount: chord.fretCount ?? 5,
                    })),
                  ]
                    .slice()
                    .sort(
                      (a, b) =>
                        (a.voicing.baseFret || 1) - (b.voicing.baseFret || 1),
                    )
                    .map(({ voicing, fretCount }, idx) => (
                      <ChordDiagram
                        key={idx}
                        chordName={chordDef.name}
                        voicing={voicing}
                        root={selectedRoot}
                        fretCount={fretCount}
                      />
                    ))}
                </div>
              </div>
            )}

            {(instrumentView === "piano" || instrumentView === "both") && (
              <div className="flex flex-col gap-4 w-full max-w-full min-w-0 mt-8">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-sm font-mono font-bold uppercase tracking-[0.2em] text-on-surface-variant">
                    <Piano size={14} />
                    <span>Piano Voicing</span>
                  </div>
                  <span className="text-[10px] font-mono text-on-surface-variant/80 uppercase tracking-[0.2em]">
                    click buttons to play
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {Array.from({ length: numNotes }).map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleInversionSelect(idx)}
                      className={`px-4 py-1.5 rounded-full text-xs font-mono font-bold transition-colors ${
                        activeInversion === idx
                          ? "bg-primary text-on-primary shadow"
                          : "bg-surface-container text-on-surface-variant hover:bg-surface-container-high border border-outline-variant/30"
                      }`}
                    >
                      {idx === 0
                        ? "Root Position"
                        : `${idx}${idx === 1 ? "st" : idx === 2 ? "nd" : idx === 3 ? "rd" : "th"} Inversion`}
                    </button>
                  ))}
                </div>

                <div className="w-full max-w-full min-w-0 overflow-hidden">
                  <PianoKeyboard
                    selectedRoot={selectedRoot}
                    chordNotes={chordDef.notes}
                    displayMode="name"
                    exactVoicing={exactPianoVoicing}
                    startOctave={minOctave}
                    octaves={pianoOctavesCount}
                  />
                </div>
                {customPianoVoicings.map((chord) => (
                  <KeyboardChordDiagram
                    key={chord.id}
                    chordName={chord.pianoVoicing?.name}
                    root={selectedRoot}
                    instrument="acoustic_grand_piano"
                    voicing={chord.pianoVoicing!}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {showChordCoverageModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-surface rounded-2xl w-full max-w-md border border-outline-variant/30 overflow-hidden shadow-2xl">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-xl font-bold text-on-surface">
                  Chord Coverage
                </h3>
                <button
                  onClick={() => setShowChordCoverageModal(false)}
                  className="text-on-surface-variant hover:text-on-surface p-1 rounded-full hover:bg-surface-container"
                >
                  <X size={20} />
                </button>
              </div>

              <p className="text-on-surface-variant text-sm mb-4 leading-relaxed">
                Not all chords are available yet. Some chords are still missing
                from this collection.
              </p>

              <p className="text-on-surface-variant text-sm mb-6 leading-relaxed">
                If you find a mistake or a missing chord, feel free to contact
                me at
                <br />
                <a
                  href="mailto:yassinekhemiri.dev@gmail.com"
                  className="text-primary font-semibold underline break-all"
                >
                  yassinekhemiri.dev@gmail.com
                </a>
              </p>

              <div className="flex justify-end">
                <button
                  onClick={() => setShowChordCoverageModal(false)}
                  className="px-4 py-2 bg-primary text-on-primary text-sm font-bold rounded-lg hover:bg-primary/90 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Redirect Explanation Modal */}
      {showRedirectModal && redirectNotice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-surface rounded-2xl w-full max-w-md border border-outline-variant/30 overflow-hidden shadow-2xl">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-xl font-bold text-on-surface">
                  Theoretical Keys
                </h3>
                <button
                  onClick={() => setShowRedirectModal(false)}
                  className="text-on-surface-variant hover:text-on-surface p-1 rounded-full hover:bg-surface-container"
                >
                  <X size={20} />
                </button>
              </div>
              <p className="text-on-surface-variant text-sm mb-4 leading-relaxed">
                You searched for <strong>{redirectNotice.from}</strong>, but
                were redirected to <strong>{redirectNotice.to}</strong>. Why?
                Keys like A#, D#, and G# are considered "theoretical keys."
              </p>
              <p className="text-on-surface-variant text-sm mb-4 leading-relaxed">
                Writing music in these keys requires confusing "double sharps"
                or "double flats" to maintain the correct alphabetical sequence
                of notes. For instance, a major scale starting on A# requires 10
                sharps!
              </p>
              <p className="text-on-surface-variant text-sm mb-6 leading-relaxed">
                Instead, musicians practically always use the simpler enharmonic
                twin note (like Bb instead of A#) because it's much easier to
                read and write on sheet music.
              </p>

              <div className="bg-surface-container rounded-lg p-4 mb-6">
                <div className="flex justify-between text-xs font-mono font-bold text-on-surface mb-2">
                  <span>Theoretical</span>
                  <span>Preferred</span>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm text-on-surface-variant">
                    <span>A# Major (10♯)</span>
                    <span className="text-primary">→ Bb Major (2♭)</span>
                  </div>
                  <div className="flex justify-between text-sm text-on-surface-variant">
                    <span>D# Major (9♯)</span>
                    <span className="text-primary">→ Eb Major (3♭)</span>
                  </div>
                  <div className="flex justify-between text-sm text-on-surface-variant">
                    <span>G# Major (8♯)</span>
                    <span className="text-primary">→ Ab Major (4♭)</span>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <a
                  href="https://en.wikipedia.org/wiki/Theoretical_key"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 text-sm font-semibold text-primary hover:bg-primary/10 rounded-lg flex items-center gap-1.5 transition-colors"
                >
                  <ExternalLink size={14} />
                  Learn More
                </a>
                <button
                  onClick={() => setShowRedirectModal(false)}
                  className="px-4 py-2 bg-primary text-on-primary text-sm font-bold rounded-lg hover:bg-primary/90 transition-colors"
                >
                  Got it
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
