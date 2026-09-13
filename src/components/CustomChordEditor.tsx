import React, { useEffect, useState } from "react";
import {
  Download,
  FolderOpen,
  Guitar,
  Upload,
  Piano,
  Save,
  Trash2,
  X,
  Info,
} from "lucide-react";
import { ChordDiagram } from "./ChordDiagram";
import { KeyboardChordDiagram } from "./KeyboardChordDiagram";
import { PianoKeyboard } from "./PianoKeyboard";
import { ALL_ROOT_NOTES, NOTE_SEMITONES } from "../data/musicTheory";
import {
  CHORD_TYPES_CATALOG,
  CustomChord,
  deleteCustomChord,
  exportSavedCustomChords,
  getCustomChords,
  importCustomChords,
  saveCustomChord,
  getChordDefinition,
} from "../data/chordsData";
import {
  GuitarVoicing,
  KeyboardVoicing,
  KeyboardVoicingNote,
  NoteName,
} from "../types";

function createPianoVoicing(
  root: NoteName,
  chordType: string,
  notes: KeyboardVoicingNote[],
): KeyboardVoicing {
  const chordDefinition = getChordDefinition(root, chordType);
  const bass = notes[0] || {
    note: root,
    octave: 4,
    degree: "1",
    isRoot: true,
  };

  return {
    id: `custom-piano-${Date.now()}`,
    name: "Custom Piano Chord",
    shortLabel: "Custom Position",
    category: "open",
    positionLabel: "Custom Position",
    bassNote: bass.note,
    bassOctave: bass.octave,
    notes: notes.map((note) => ({
      ...note,
      isRoot: note.note === root || note.isRoot,
    })),
    startOctave: Math.min(...notes.map((note) => note.octave), 3),
    octavesCount: 3,
    description: `${chordDefinition.name} custom piano voicing`,
  };
}

interface CustomChordEditorProps {
  defaultInstrument: "guitar" | "piano";
}

export const CustomChordEditor: React.FC<CustomChordEditorProps> = ({
  defaultInstrument,
}) => {
  const [customChords, setCustomChords] = useState<CustomChord[]>([]);

  const [root, setRoot] = useState<NoteName>("C");
  const [chordType, setChordType] = useState<string>("major");
  const [editorInstrument, setEditorInstrument] = useState<"guitar" | "piano">(
    defaultInstrument,
  );

  useEffect(() => {
    setEditorInstrument(defaultInstrument);
  }, [defaultInstrument]);

  const [name, setName] = useState("Custom Chord");
  const [positionLabel, setPositionLabel] = useState("Custom Position");
  const [rootString, setRootString] = useState("Root: 6th String");
  const [baseFret, setBaseFret] = useState<number | "">(1);
  const [fretCount, setFretCount] = useState(5);

  const [frets, setFrets] = useState<(number | null)[]>([
    null,
    null,
    null,
    null,
    null,
    null,
  ]);
  const [fingers, setFingers] = useState<(number | null)[]>([
    null,
    null,
    null,
    null,
    null,
    null,
  ]);

  const [barres, setBarres] = useState<
    { fret: number; fromString: number; toString: number; finger: number }[]
  >([]);
  const [pianoNotes, setPianoNotes] = useState<KeyboardVoicingNote[]>(
    () => getChordDefinition("C", "major").keyboardVoicings?.[0]?.notes || [],
  );

  const [dragStart, setDragStart] = useState<{ s: number; f: number } | null>(
    null,
  );
  const [dragCurrent, setDragCurrent] = useState<{
    s: number;
    f: number;
  } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [showDesignerInfo, setShowDesignerInfo] = useState(false);

  useEffect(() => {
    setCustomChords(getCustomChords());
  }, []);

  const handleExportSavedChords = () => {
    const exported = exportSavedCustomChords();
    const payload = JSON.stringify(exported, null, 2);
    const blob = new Blob([payload], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "mousi9ti-saved-chords.json";
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleImportSavedChords = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    try {
      const importedCount = importCustomChords(await file.text());
      setCustomChords(getCustomChords());
      window.alert(
        `${importedCount} chord${importedCount === 1 ? "" : "s"} imported successfully.`,
      );
    } catch (error) {
      window.alert(
        error instanceof Error
          ? error.message
          : "Could not import the chord JSON file.",
      );
    }
  };

  const handleStringClick = (stringIdx: number) => {
    const newFrets = [...frets];
    if (newFrets[stringIdx] === null) {
      newFrets[stringIdx] = 0;
    } else if (newFrets[stringIdx] === 0) {
      newFrets[stringIdx] = null;
    } else {
      newFrets[stringIdx] = null;
    }
    setFrets(newFrets);

    if (newFrets[stringIdx] === null || newFrets[stringIdx] === 0) {
      const newFingers = [...fingers];
      newFingers[stringIdx] = null;
      setFingers(newFingers);
    }
  };

  const handleFretClick = (stringIdx: number, f: number) => {
    const absFret = f + (baseFret || 1) - 1;
    const newFrets = [...frets];
    if (newFrets[stringIdx] === absFret) {
      newFrets[stringIdx] = null;
    } else {
      newFrets[stringIdx] = absFret;
    }
    setFrets(newFrets);

    const newFingers = [...fingers];
    if (newFrets[stringIdx] !== null && newFingers[stringIdx] === null) {
      newFingers[stringIdx] = 1;
    }
    if (newFrets[stringIdx] === null) {
      newFingers[stringIdx] = null;
    }
    setFingers(newFingers);
  };

  const cycleFinger = (stringIdx: number) => {
    if (frets[stringIdx] === null || frets[stringIdx] === 0) return;
    const current = fingers[stringIdx];

    const newFingers = [...fingers];
    if (current === null) newFingers[stringIdx] = 1;
    else if (current === 1) newFingers[stringIdx] = 2;
    else if (current === 2) newFingers[stringIdx] = 3;
    else if (current === 3) newFingers[stringIdx] = 4;
    else if (current === 4) newFingers[stringIdx] = 5;
    else if (current === 5) newFingers[stringIdx] = 1;
    setFingers(newFingers);
  };

  const removeFinger = (stringIdx: number) => {
    const newFrets = [...frets];
    newFrets[stringIdx] = null;
    setFrets(newFrets);

    const newFingers = [...fingers];
    newFingers[stringIdx] = null;
    setFingers(newFingers);
  };

  const removeBarre = (fret: number) => {
    const targetBarre = barres.find((barre) => barre.fret === fret);
    if (!targetBarre) return;

    setBarres((prev) => prev.filter((barre) => barre.fret !== fret));
    setFrets((prev) => {
      const next = [...prev];
      for (
        let stringIdx = targetBarre.fromString;
        stringIdx <= targetBarre.toString;
        stringIdx += 1
      ) {
        if (next[stringIdx] === fret) {
          next[stringIdx] = null;
        }
      }
      return next;
    });
  };

  useEffect(() => {
    const handleGlobalUp = () => {
      if (dragStart) {
        if (isDragging && dragCurrent) {
          const minS = Math.min(dragStart.s, dragCurrent.s);
          const maxS = Math.max(dragStart.s, dragCurrent.s);

          setBarres((prev) => {
            const newBarres = prev.filter((b) => b.fret !== dragStart.f);
            newBarres.push({
              fret: dragStart.f,
              fromString: minS,
              toString: maxS,
              finger: 1,
            });
            return newBarres;
          });

          setFrets((prev) => {
            const nf = [...prev];
            for (let i = minS; i <= maxS; i += 1) {
              if (nf[i] === null || nf[i] === 0 || nf[i] < dragStart.f) {
                nf[i] = dragStart.f;
              }
            }
            return nf;
          });
        }
        setDragStart(null);
        setDragCurrent(null);
        setIsDragging(false);
      }
    };

    window.addEventListener("pointerup", handleGlobalUp);
    return () => window.removeEventListener("pointerup", handleGlobalUp);
  }, [dragCurrent, dragStart, isDragging]);

  const handlePointerDown = (s: number, f: number, e: React.PointerEvent) => {
    e.currentTarget.releasePointerCapture(e.pointerId);
    const absFret = f + (baseFret || 1) - 1;
    setDragStart({ s, f: absFret });
    setDragCurrent({ s, f: absFret });
    setIsDragging(false);
  };

  const handlePointerEnter = (s: number, f: number) => {
    const absFret = f + (baseFret || 1) - 1;
    if (dragStart && dragStart.f === absFret) {
      setDragCurrent({ s, f: absFret });
      if (s !== dragStart.s) {
        setIsDragging(true);
      }
    }
  };

  const handlePointerUp = (s: number, f: number) => {
    const absFret = f + (baseFret || 1) - 1;
    if (dragStart) {
      if (isDragging && dragCurrent) {
        const minS = Math.min(dragStart.s, dragCurrent.s);
        const maxS = Math.max(dragStart.s, dragCurrent.s);
        setBarres((prev) => {
          const newBarres = prev.filter((b) => b.fret !== dragStart.f);
          newBarres.push({
            fret: dragStart.f,
            fromString: minS,
            toString: maxS,
            finger: 1,
          });
          return newBarres;
        });
        setFrets((prev) => {
          const nf = [...prev];
          for (let i = minS; i <= maxS; i += 1) {
            if (nf[i] === null || nf[i] === 0 || nf[i] < dragStart.f) {
              nf[i] = dragStart.f;
            }
          }
          return nf;
        });
      } else {
        handleFretClick(s, f);
      }
    }
    setDragStart(null);
    setDragCurrent(null);
    setIsDragging(false);
  };

  const toggleBarreRow = (f: number) => {
    const absFret = f + (baseFret || 1) - 1;
    const existingBarre = barres.find((b) => b.fret === absFret);

    if (existingBarre) {
      setBarres((prev) => prev.filter((b) => b.fret !== absFret));
      setFrets((prev) => {
        const nf = [...prev];
        for (
          let i = existingBarre.fromString;
          i <= existingBarre.toString;
          i += 1
        ) {
          if (nf[i] === absFret) nf[i] = null;
        }
        return nf;
      });
    } else {
      let minStr = 0;
      let maxStr = 5;
      const activeStrings = [0, 1, 2, 3, 4, 5].filter(
        (s) => frets[s] !== null && frets[s] !== 0 && frets[s]! >= absFret,
      );

      if (activeStrings.length > 0) {
        minStr = Math.min(...activeStrings);
        maxStr = Math.max(...activeStrings);
      }

      setBarres((prev) => [
        ...prev,
        { fret: absFret, fromString: minStr, toString: maxStr, finger: 1 },
      ]);

      setFrets((prev) => {
        const nf = [...prev];
        for (let i = minStr; i <= maxStr; i += 1) {
          if (nf[i] === null || nf[i] === 0 || nf[i] < absFret) {
            nf[i] = absFret;
          }
        }
        return nf;
      });
    }
  };

  const cycleBarreFinger = (fret: number) => {
    setBarres((prev) =>
      prev.map((barre) => {
        if (barre.fret !== fret) return barre;
        const nextFinger = barre.finger >= 4 ? 1 : barre.finger + 1;
        return { ...barre, finger: nextFinger };
      }),
    );
  };

  const handleSave = () => {
    const voicing: GuitarVoicing = {
      name,
      positionLabel,
      rootString,
      baseFret: baseFret === "" ? 1 : baseFret,
      frets,
      fingers,
      barres,
    };

    const newChord: CustomChord = {
      id: `custom-${Date.now()}`,
      root,
      chordType,
      voicing,
      fretCount: editorInstrument === "guitar" ? fretCount : undefined,
      pianoVoicing:
        editorInstrument === "piano"
          ? {
              ...createPianoVoicing(root, chordType, pianoNotes),
              name,
              positionLabel,
            }
          : undefined,
      instrument: editorInstrument,
    };

    saveCustomChord(newChord);
    setCustomChords(getCustomChords());
  };

  const handleDelete = (id: string) => {
    deleteCustomChord(id);
    setCustomChords(getCustomChords());
  };

  const handleLoad = (chord: CustomChord) => {
    setRoot(chord.root);
    setChordType(chord.chordType);
    const instrument =
      chord.instrument || (chord.pianoVoicing ? "piano" : "guitar");
    setEditorInstrument(instrument);
    if (instrument === "piano" && chord.pianoVoicing) {
      setName(chord.pianoVoicing.name);
      setPositionLabel(chord.pianoVoicing.positionLabel);
      setPianoNotes([...chord.pianoVoicing.notes]);
    } else {
      setName(chord.voicing.name);
      setPositionLabel(chord.voicing.positionLabel);
      setRootString(chord.voicing.rootString);
      setBaseFret(chord.voicing.baseFret || 1);
      setFretCount(Math.min(8, Math.max(5, chord.fretCount ?? 5)));
      setFrets([...chord.voicing.frets]);
      setFingers([...chord.voicing.fingers]);
      setBarres(chord.voicing.barres ? [...chord.voicing.barres] : []);
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handlePianoNoteToggle = (note: NoteName, octave: number) => {
    setPianoNotes((current) => {
      const isSelected = current.some(
        (selected) => selected.note === note && selected.octave === octave,
      );
      if (isSelected) {
        return current.filter(
          (selected) => selected.note !== note || selected.octave !== octave,
        );
      }

      const chordDefinition = getChordDefinition(root, chordType);
      const chordTypeDefinition = CHORD_TYPES_CATALOG.find(
        (chord) => chord.type === chordType,
      );
      const noteIndex = chordDefinition.notes.indexOf(note);
      return [
        ...current,
        {
          note,
          octave,
          degree:
            noteIndex >= 0 && chordTypeDefinition
              ? chordTypeDefinition.degrees[noteIndex]
              : "",
          isRoot: note === root,
        },
      ].sort(
        (a, b) =>
          a.octave * 12 +
          (NOTE_SEMITONES[a.note] || 0) -
          (b.octave * 12 + (NOTE_SEMITONES[b.note] || 0)),
      );
    });
  };

  return (
    <div className="custom-chord-editor flex w-full min-w-0 flex-col gap-6 pb-12 animate-fade-in">
      <div className="custom-chord-editor-header flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-center bg-surface-container border border-outline-variant/30 p-4 sm:p-6 rounded-lg shadow-sm">
        <div>
          <h1 className="text-2xl font-mono font-bold text-on-surface">
            Chord Editor
          </h1>
          <p className="font-mono text-sm text-on-surface-variant mt-1">
            Design, preview, and save custom chord voicings.
          </p>
        </div>
        <div className="custom-chord-editor-actions flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
          <label className="custom-chord-mobile-action flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-outline-variant/30 bg-surface-container-low px-3 py-2 text-xs font-bold font-mono text-on-surface hover:border-primary/50 hover:text-primary transition-colors">
            <span className="custom-chord-mobile-action-icon">
              <Upload size={18} />
            </span>
            <span className="custom-chord-mobile-action-content">
              <span className="custom-chord-mobile-action-title">
                Import Chords
              </span>
              <span className="custom-chord-mobile-action-description">
                Load a saved JSON file
              </span>
            </span>
            <span className="custom-chord-mobile-action-arrow">›</span>
            <input
              type="file"
              accept="application/json,.json"
              onChange={handleImportSavedChords}
              className="hidden"
            />
          </label>
          <button
            type="button"
            onClick={handleExportSavedChords}
            className="custom-chord-mobile-action flex items-center justify-center gap-2 rounded-lg border border-outline-variant/30 bg-surface-container-low px-3 py-2 text-xs font-bold text-on-surface hover:border-primary/50 hover:text-primary transition-colors"
          >
            <span className="custom-chord-mobile-action-icon">
              <Download size={18} />
            </span>
            <span className="custom-chord-mobile-action-content">
              <span className="font-mono custom-chord-mobile-action-title">
                Export Saved Chords
              </span>
              <span className="custom-chord-mobile-action-description">
                Save your voicings as JSON
              </span>
            </span>
            <span className="custom-chord-mobile-action-arrow">›</span>
          </button>

          <div className="custom-chord-instrument-section">
            <span className="custom-chord-instrument-label">Editor Mode</span>
            <div className="custom-chord-instrument-switch flex w-full shrink-0 overflow-hidden rounded border border-outline-variant/30 bg-surface-container text-xs font-mono font-bold sm:w-auto">
              <button
                type="button"
                aria-label="Use guitar chord editor"
                title="Guitar chord editor"
                onClick={() => setEditorInstrument("guitar")}
                className={`flex min-h-11 flex-1 items-center justify-center gap-2 px-3 py-2 transition-colors sm:min-h-0 sm:flex-none sm:px-4 ${
                  editorInstrument === "guitar"
                    ? "bg-primary text-on-primary"
                    : "text-on-surface-variant hover:text-on-surface"
                }`}
              >
                <Guitar size={14} />
                <span className="hidden sm:inline">Guitar</span>
              </button>
              <button
                type="button"
                aria-label="Use piano chord editor"
                title="Piano chord editor"
                onClick={() => setEditorInstrument("piano")}
                className={`flex min-h-11 flex-1 items-center justify-center gap-2 px-3 py-2 transition-colors sm:min-h-0 sm:flex-none sm:px-4 ${
                  editorInstrument === "piano"
                    ? "bg-primary text-on-primary"
                    : "text-on-surface-variant hover:text-on-surface"
                }`}
              >
                <Piano size={14} />
                <span className="hidden sm:inline">Piano</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        <div
          className={`${editorInstrument === "guitar" ? "flex" : "hidden"} xl:col-span-7 bg-surface-container border border-outline-variant/30 rounded-lg p-4 sm:p-6 lg:p-10 flex-col items-center shadow-sm overflow-hidden`}
        >
          <div className="w-full max-w-[400px] mb-4">
            <h2 className="text-xl font-bold mb-1 font-mono flex items-center gap-2">
              Interactive Designer
              <button
                type="button"
                onClick={() => setShowDesignerInfo(true)}
                className="flex h-5 w-5 cursor-pointer items-center justify-center rounded-full border border-primary/30 bg-primary/10 text-[10px] font-bold leading-none text-primary transition-colors hover:bg-primary/15"
                aria-label="Designer instructions"
                title="Designer instructions"
              >
                ?
              </button>
            </h2>
          </div>

          <div
            className="custom-chord-maker relative w-[360px] h-[720px] select-none mx-auto mb-4 touch-none"
            style={
              {
                height: `${(fretCount + 1) * 80}px`,
                "--mobile-maker-collapse": `${16 - (fretCount + 1) * 80 * 0.28}px`,
              } as React.CSSProperties
            }
          >
            <div className="absolute inset-0 top-[60px] border-[3px] border-outline-variant/60 bg-surface-container-highest rounded-b-md shadow-inner" />

            <div
              className={`absolute left-0 right-0 top-[60px] h-3 ${(baseFret || 1) === 1 ? "bg-on-surface" : "bg-outline-variant/80"} z-10`}
            />

            {Array.from(
              { length: Math.max(0, fretCount - 1) },
              (_, i) => i + 1,
            ).map((f) => (
              <div
                key={`fret-line-${f}`}
                className="absolute left-0 right-0 h-1 bg-outline-variant/80 shadow-sm"
                style={{ top: `${60 + f * 80}px` }}
              />
            ))}

            {[0, 1, 2, 3, 4, 5].map((s) => (
              <div
                key={`string-${s}`}
                className="absolute top-[60px] bottom-0 bg-on-surface-variant/40 shadow-sm"
                style={{
                  left: `${40 + s * 56}px`,
                  width: `${4 + (5 - s) * 0.6}px`,
                  transform: "translateX(-50%)",
                }}
              />
            ))}

            {["E", "A", "D", "G", "B", "e"].map((label, s) => (
              <div
                key={`label-${s}`}
                className="absolute -bottom-8 w-10 text-center text-xs font-bold text-on-surface-variant/50"
                style={{
                  left: `${40 + s * 56}px`,
                  transform: "translateX(-50%)",
                }}
              >
                {label}
              </div>
            ))}

            {Array.from({ length: fretCount }, (_, i) => i + 1).map((f) => {
              const actualFret = f + (baseFret || 1) - 1;
              const hasDot = [3, 5, 7, 9, 15, 17, 19].includes(actualFret);
              if (!hasDot) return null;
              return (
                <div
                  key={`marker-${f}`}
                  className="absolute w-4 h-4 rounded-full bg-outline-variant/40"
                  style={{
                    top: `${60 + (f - 1) * 80 + 40}px`,
                    left: "180px",
                    transform: "translate(-50%, -50%)",
                  }}
                />
              );
            })}

            {[0, 1, 2, 3, 4, 5].map((s) => (
              <button
                key={`mute-${s}`}
                onClick={() => handleStringClick(s)}
                className="absolute top-0 w-10 h-10 rounded-md flex items-center justify-center font-bold text-lg bg-surface-container-highest hover:bg-outline-variant/40 border border-outline-variant/50 transition-colors z-20 shadow-sm"
                style={{
                  left: `${40 + s * 56}px`,
                  transform: "translateX(-50%)",
                }}
              >
                {frets[s] === null ? (
                  <X size={20} className="text-error" />
                ) : frets[s] === 0 ? (
                  <span className="text-primary">O</span>
                ) : (
                  ""
                )}
              </button>
            ))}

            {Array.from({ length: fretCount }, (_, i) => i + 1).map((f) => (
              <React.Fragment key={`zone-row-${f}`}>
                <div
                  onClick={() => toggleBarreRow(f)}
                  className={`custom-chord-bar-control absolute -left-12 w-10 flex items-center justify-center cursor-pointer text-xs font-bold rounded hover:bg-outline-variant/20 transition-colors z-20 ${
                    barres.some((b) => b.fret === f + (baseFret || 1) - 1)
                      ? "text-primary bg-primary/10"
                      : "text-on-surface-variant/40"
                  }`}
                  style={{ top: `${60 + (f - 1) * 80 + 20}px`, height: "40px" }}
                >
                  {barres.some((b) => b.fret === f + (baseFret || 1) - 1)
                    ? "-Bar"
                    : "+Bar"}
                </div>

                <div
                  className="custom-chord-fret-label absolute -right-8 w-6 flex items-center text-xs font-bold text-on-surface-variant/40 pointer-events-none"
                  style={{ top: `${60 + (f - 1) * 80}px`, height: "80px" }}
                >
                  {f + (baseFret || 1) - 1}fr
                </div>

                {[0, 1, 2, 3, 4, 5].map((s) => {
                  const absFret = f + (baseFret || 1) - 1;
                  const isPlaced = frets[s] === absFret;
                  const isBarreCovered = barres.some(
                    (b) =>
                      b.fret === absFret &&
                      s >= b.fromString &&
                      s <= b.toString,
                  );

                  return (
                    <div
                      key={`zone-${f}-${s}`}
                      onPointerDown={(e) => handlePointerDown(s, f, e)}
                      onPointerEnter={() => handlePointerEnter(s, f)}
                      onPointerUp={() => handlePointerUp(s, f)}
                      className="absolute z-20 flex items-center justify-center group cursor-pointer touch-none"
                      style={{
                        left: `${40 + s * 56 - 28}px`,
                        top: `${60 + (f - 1) * 80}px`,
                        width: "56px",
                        height: "80px",
                      }}
                    >
                      {!isPlaced && !isBarreCovered && (
                        <div className="w-12 h-12 rounded-full bg-on-surface opacity-0 group-hover:opacity-10 pointer-events-none transition-opacity" />
                      )}

                      {isPlaced && !isBarreCovered && (
                        <div
                          onClick={(e) => {
                            e.stopPropagation();
                            cycleFinger(s);
                          }}
                          onPointerDown={(e) => e.stopPropagation()}
                          onPointerUp={(e) => e.stopPropagation()}
                          className="group/finger relative w-10 h-10 rounded-full bg-secondary text-on-secondary font-bold flex items-center justify-center text-lg shadow-lg hover:scale-110 transition-transform"
                        >
                          {fingers[s] === 5 ? "T" : fingers[s] || ""}
                          <button
                            type="button"
                            aria-label={`Remove note from string ${s + 1}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              removeFinger(s);
                            }}
                            onPointerDown={(e) => e.stopPropagation()}
                            onPointerUp={(e) => e.stopPropagation()}
                            className="custom-chord-remove absolute -top-1 -right-1 w-5 h-5 bg-error text-on-error rounded-full flex items-center justify-center text-[12px] shadow-sm z-30 opacity-0 group-hover/finger:opacity-100 hover:scale-125 transition-all cursor-pointer"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </React.Fragment>
            ))}

            {dragStart && dragCurrent && isDragging && (
              <div
                className="absolute z-20 bg-primary/30 border-2 border-primary border-dashed flex items-center justify-center shadow-md pointer-events-none"
                style={{
                  top: `${60 + (dragStart.f - (baseFret || 1)) * 80 + 20}px`,
                  height: "40px",
                  borderRadius: "20px",
                  left: `${40 + Math.min(dragStart.s, dragCurrent.s) * 56 - 20}px`,
                  width: `${(Math.max(dragStart.s, dragCurrent.s) - Math.min(dragStart.s, dragCurrent.s)) * 56 + 40}px`,
                }}
              />
            )}

            {barres.map((barre, i) => (
              <div
                key={`barre-overlay-${i}`}
                className="absolute z-30 bg-primary/90 text-on-primary flex items-center justify-center font-bold text-lg shadow-xl cursor-pointer hover:bg-primary transition-colors group"
                style={{
                  top: `${60 + (barre.fret - (baseFret || 1)) * 80 + 20}px`,
                  height: "40px",
                  borderRadius: "20px",
                  left: `${40 + barre.fromString * 56 - 20}px`,
                  width: `${(barre.toString - barre.fromString) * 56 + 40}px`,
                }}
                onClick={() => cycleBarreFinger(barre.fret)}
                onPointerDown={(e) => e.stopPropagation()}
                onPointerUp={(e) => e.stopPropagation()}
              >
                {barre.finger || 1}
                <div
                  className="custom-chord-remove absolute -top-1 -right-1 w-5 h-5 bg-error text-on-error rounded-full flex items-center justify-center text-[12px] shadow-sm z-30 opacity-0 group-hover:opacity-100 hover:scale-125 transition-all cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeBarre(barre.fret);
                  }}
                >
                  <X size={12} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div
          className={`${editorInstrument === "piano" ? "xl:col-span-6 order-2" : "xl:col-span-5"} flex flex-col gap-6`}
        >
          <div className="bg-surface-container border border-outline-variant/30 rounded-lg p-4 sm:p-6 shadow-sm">
            <h2 className="text-lg font-bold mb-4">Chord Identity</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div className="flex-1">
                <label className="block text-xs font-bold font-mono text-on-surface-variant uppercase tracking-wider mb-2">
                  Root Note
                </label>
                <select
                  value={root}
                  onChange={(e) => setRoot(e.target.value as NoteName)}
                  className="w-full bg-surface-container-highest border border-outline-variant/50 rounded px-3 py-2 text-on-surface outline-none focus:border-primary font-bold font-mono"
                >
                  {ALL_ROOT_NOTES.map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex-1">
                <label className="block text-xs font-bold font-mono text-on-surface-variant uppercase tracking-wider mb-2">
                  Chord Type
                </label>
                <select
                  value={chordType}
                  onChange={(e) => setChordType(e.target.value)}
                  className="w-full bg-surface-container-highest border border-outline-variant/50 rounded px-3 py-2 text-on-surface outline-none focus:border-primary font-bold font-mono"
                >
                  {CHORD_TYPES_CATALOG.map((t) => (
                    <option key={t.type} value={t.type}>
                      {t.name} ({t.symbol})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-xs font-bold font-mono text-on-surface-variant uppercase tracking-wider mb-2">
                Display Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. C Major (Open)"
                className="w-full bg-surface-container-highest border border-outline-variant/50 rounded px-3 py-2 text-on-surface outline-none focus:border-primary font-bold"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div className="flex-1">
                <label className="block text-xs font-bold font-mono text-on-surface-variant uppercase tracking-wider mb-2">
                  Position Label
                </label>
                <input
                  type="text"
                  value={positionLabel}
                  onChange={(e) => setPositionLabel(e.target.value)}
                  placeholder="e.g. Open Position"
                  className="w-full bg-surface-container-highest border border-outline-variant/50 rounded px-3 py-2 text-on-surface outline-none focus:border-primary text-sm"
                />
              </div>
              {editorInstrument === "guitar" && (
                <div className="flex-1">
                  <label className="block text-xs font-bold font-mono text-on-surface-variant uppercase tracking-wider mb-2">
                    Root String
                  </label>
                  <select
                    value={rootString}
                    onChange={(e) => setRootString(e.target.value)}
                    className="w-full bg-surface-container-highest border border-outline-variant/50 rounded px-3 py-2 text-on-surface outline-none focus:border-primary text-sm font-mono"
                  >
                    <option value="Root: 6th String">Root: 6th String</option>
                    <option value="Root: 5th String">Root: 5th String</option>
                    <option value="Root: 4th String">Root: 4th String</option>
                    <option value="Root: 3rd String">Root: 3rd String</option>
                    <option value="Root: 2nd String">Root: 2nd String</option>
                    <option value="Root: 1st String">Root: 1st String</option>
                  </select>
                </div>
              )}
            </div>

            {editorInstrument === "guitar" && (
              <>
                <div>
                  <label className="block text-xs font-bold font-mono text-on-surface-variant uppercase tracking-wider mb-2">
                    Starting Base Fret
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="28"
                    value={baseFret}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === "") {
                        setBaseFret("");
                      } else {
                        let num = Number.parseInt(val, 10);
                        if (num > 28) num = 28;
                        if (num < 1 && val !== "0") num = 1;

                        const oldBase = baseFret || 1;
                        const diff = num - oldBase;

                        if (diff !== 0) {
                          setFrets((prev) =>
                            prev.map((f) =>
                              f === null || f === 0 ? f : f + diff,
                            ),
                          );
                          setBarres((prev) =>
                            prev.map((b) => ({ ...b, fret: b.fret + diff })),
                          );
                        }

                        setBaseFret(num);
                      }
                    }}
                    onBlur={() => {
                      if (baseFret === "" || Number(baseFret) < 1)
                        setBaseFret(1);
                    }}
                    className="base-fret-input w-full bg-surface-container-highest border border-outline-variant/50 rounded px-3 py-2 text-on-surface outline-none focus:border-primary font-mono"
                  />
                </div>
                <div className="mt-4">
                  <label className="block text-xs font-bold font-mono text-on-surface-variant uppercase tracking-wider mb-2">
                    Available Frets
                  </label>
                  <select
                    value={fretCount}
                    onChange={(e) => setFretCount(Number(e.target.value))}
                    className="w-full bg-surface-container-highest border border-outline-variant/50 rounded px-3 py-2 text-on-surface outline-none focus:border-primary font-mono"
                  >
                    {[5, 6, 7, 8].map((count) => (
                      <option key={count} value={count}>
                        {count} frets
                      </option>
                    ))}
                  </select>
                </div>
              </>
            )}
          </div>

          {editorInstrument === "guitar" && (
            <div className="bg-surface-container border border-outline-variant/30 rounded-lg p-4 sm:p-6 shadow-sm flex flex-col items-center overflow-hidden">
              <h2 className="text-lg font-bold mb-4 w-full text-left">
                Live Preview
              </h2>

              <div className="flex flex-col justify-center items-center my-6 py-6 w-full h-[400px] overflow-hidden">
                <div className="relative -translate-y-3 w-full max-w-[340px] flex items-center justify-between gap-8 pb-3 shrink-0">
                  <span className="font-mono text-[10px] tracking-widest text-on-surface-variant uppercase font-bold truncate">
                    {positionLabel || name}
                  </span>
                  <span className="bg-surface-container border border-outline-variant/20 px-2 py-0.5 rounded text-[10px] font-mono text-on-surface shrink-0">
                    {rootString || `Root on ${root}`}
                  </span>
                </div>
                <ChordDiagram
                  noBackground={true}
                  scale={1.4}
                  compact={true}
                  root={root}
                  chordName={`${root} ${CHORD_TYPES_CATALOG.find((c) => c.type === chordType)?.symbol || ""}`}
                  voicing={{
                    name,
                    positionLabel,
                    rootString,
                    baseFret: baseFret === "" ? 1 : baseFret,
                    frets,
                    fingers,
                    barres,
                  }}
                  fretCount={fretCount}
                />
              </div>

              <button
                onClick={handleSave}
                className="flex items-center justify-center gap-2 w-full py-3.5 bg-primary text-on-primary rounded font-black hover:scale-[1.02] transition-transform shadow-md text-lg"
              >
                <Save size={20} />
                SAVE TO LIBRARY
              </button>
            </div>
          )}
        </div>

        <div
          className={`${editorInstrument === "piano" ? "flex" : "hidden"} order-first xl:col-span-12 bg-surface-container border border-outline-variant/30 rounded-lg p-4 sm:p-6 lg:p-10 flex-col items-center shadow-sm overflow-hidden`}
        >
          <div className="w-full">
            <h2 className="text-xl font-bold mb-1">Piano Note Designer</h2>
            <p className="text-xs text-on-surface-variant mb-6">
              Click keys to add or remove notes from the custom piano voicing.
            </p>
            <div className="h-[340px] w-full overflow-hidden">
              <PianoKeyboard
                octaves={3}
                startOctave={3}
                selectedRoot={root}
                displayMode="name"
                autoCenterChord={false}
                bare={true}
                exactVoicing={pianoNotes.map((note) => ({
                  noteName: note.note,
                  octave: note.octave,
                }))}
                onNoteToggle={handlePianoNoteToggle}
              />
            </div>
          </div>
        </div>

        {editorInstrument === "piano" && (
          <div className="order-3 xl:col-span-6 bg-surface-container border border-outline-variant/30 rounded-lg p-4 sm:p-6 shadow-sm flex flex-col items-center overflow-hidden">
            <div className="w-full flex items-center justify-between mb-3">
              <span className="font-mono text-sm font-bold uppercase tracking-wider text-on-surface">
                {root}{" "}
                {CHORD_TYPES_CATALOG.find((chord) => chord.type === chordType)
                  ?.symbol || ""}
              </span>
              <span className="text-[10px] font-mono text-on-surface-variant uppercase tracking-wider truncate max-w-[45%]">
                {positionLabel || name}
              </span>
            </div>
            <div className="w-full min-h-[220px] overflow-visible rounded-xl border border-outline-variant/30 bg-transparent p-2">
              <KeyboardChordDiagram
                root={root}
                instrument="acoustic_grand_piano"
                compact={true}
                voicing={createPianoVoicing(root, chordType, pianoNotes)}
              />
            </div>
            <div className="flex items-center justify-center gap-1.5 mt-3 h-4">
              <span className="h-2 w-2 rounded-full bg-primary" />
            </div>
            <button
              onClick={handleSave}
              className="flex items-center justify-center gap-2 w-full py-3.5 bg-primary text-on-primary rounded font-black hover:scale-[1.02] transition-transform shadow-md text-lg mt-4"
            >
              <Save size={20} />
              SAVE TO LIBRARY
            </button>
          </div>
        )}
      </div>

      <div className="bg-surface-container border border-outline-variant/30 rounded-lg p-4 sm:p-6 shadow-sm mt-2 overflow-hidden">
        <h2 className="text-lg font-bold mb-4 font-mono">
          Saved Custom Chords
        </h2>
        {customChords.length === 0 ? (
          <div className="font-mono py-8 text-center text-on-surface-variant bg-surface-container-lowest rounded border border-dashed border-outline-variant/50">
            No custom chords saved yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {customChords.map((chord) => (
              <div
                key={chord.id}
                className="bg-surface-container-lowest border border-outline-variant/30 p-4 rounded flex justify-between items-start hover:border-primary/50 transition-colors"
              >
                <div>
                  <h3 className="font-bold text-primary">
                    {chord.root}{" "}
                    {CHORD_TYPES_CATALOG.find((t) => t.type === chord.chordType)
                      ?.name || chord.chordType}
                  </h3>
                  <p className="text-sm font-semibold">
                    {chord.instrument === "piano"
                      ? chord.pianoVoicing?.name
                      : chord.voicing.name}
                  </p>
                  <p className="text-xs text-on-surface-variant mt-1">
                    {chord.instrument === "piano"
                      ? `${chord.pianoVoicing?.positionLabel || "Piano voicing"} • ${chord.pianoVoicing?.notes.length || 0} notes`
                      : `${chord.voicing.positionLabel} • ${chord.voicing.rootString}`}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleLoad(chord)}
                    className="p-2 text-on-surface-variant hover:text-primary hover:bg-primary/10 rounded transition-colors"
                    title="Load Custom Chord"
                  >
                    <FolderOpen size={16} />
                  </button>
                  <button
                    onClick={() => handleDelete(chord.id)}
                    className="p-2 text-on-surface-variant hover:text-error hover:bg-error/10 rounded transition-colors"
                    title="Delete Custom Chord"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Designer Instructions Modal */}
      {showDesignerInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-surface rounded-2xl w-full max-w-md border border-outline-variant/30 overflow-hidden shadow-2xl">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-xl font-bold text-on-surface">
                  How to Use the Designer
                </h3>
                <button
                  onClick={() => setShowDesignerInfo(false)}
                  className="text-on-surface-variant hover:text-on-surface p-1 rounded-full hover:bg-surface-container"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-4 text-sm text-on-surface-variant leading-relaxed">
                <div className="flex gap-3 items-start">
                  <span className="shrink-0 mt-0.5 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">1</span>
                  <p>Click the <strong className="text-on-surface">top buttons</strong> above each string to toggle between Mute (X) and Open (O).</p>
                </div>
                <div className="flex gap-3 items-start">
                  <span className="shrink-0 mt-0.5 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">2</span>
                  <p>Click anywhere on the <strong className="text-on-surface">fretboard</strong> to place a finger dot.</p>
                </div>
                <div className="flex gap-3 items-start">
                  <span className="shrink-0 mt-0.5 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">3</span>
                  <p><strong className="text-on-surface">Drag across a fret</strong> (horizontally) to create a barre chord.</p>
                </div>
                <div className="flex gap-3 items-start">
                  <span className="shrink-0 mt-0.5 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">4</span>
                  <p>Click a placed <strong className="text-on-surface">finger or barre</strong> to cycle its number (1–T). Click the <strong className="text-on-surface text-error">✕</strong> to remove it.</p>
                </div>
              </div>

              <div className="flex justify-end mt-6">
                <button
                  onClick={() => setShowDesignerInfo(false)}
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
