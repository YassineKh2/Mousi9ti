import React, { useId } from "react";
import { Volume2 } from "lucide-react";
import { GuitarVoicing, NoteName } from "../types";
import { audioEngine } from "../lib/audio";
import {
  CHROMATIC_SHARPS,
  GUITAR_TUNINGS,
  NOTE_SEMITONES,
} from "../data/musicTheory";
import { useSettingsContext } from "../contexts/SettingsContext";

interface ChordDiagramProps {
  chordName?: string;
  voicing: GuitarVoicing;
  root: NoteName;
  compact?: boolean;
  onPlay?: () => void;
  noBackground?: boolean;
  scale?: number;
  fretCount?: number;
}

export const ChordDiagram: React.FC<ChordDiagramProps> = ({
  chordName,
  voicing,
  root,
  compact = false,
  onPlay,
  noBackground = false,
  scale = 1,
  fretCount = 5,
}) => {
  const settings = useSettingsContext();
  const descriptionId = useId();
  const theme = settings.fretboardTheme;
  const noteSize = settings.fretboardNoteSize || "medium";
  const isLarge = ["large", "xlarge"].includes(noteSize);
  const isMinimal = settings.fretboardMinimalDetails;

  const strokeColor =
    theme === "high-contrast" ? "white" : "var(--color-outline-variant)";
  const onSurfaceColor =
    theme === "high-contrast" ? "white" : "var(--color-on-surface)";
  const dotColor =
    theme === "high-contrast" ? "white" : "var(--color-on-surface)";
  const textInDotColor =
    theme === "high-contrast" ? "black" : "var(--color-background)";

  const lineThickness = isMinimal ? 0.5 : isLarge ? 1.5 : 1;
  const nutThickness = isLarge ? 6 : 4;
  const dotRadiusBySize = { small: 8, medium: 10, large: 13, xlarge: 17 };
  const textSizeBySize = {
    small: "8",
    medium: "10",
    large: "12",
    xlarge: "14",
  };
  const dotRadius = dotRadiusBySize[noteSize];
  const textSize = textSizeBySize[noteSize];

  // SVG Dimensions & Layout
  const svgWidth = 240;
  const svgHeight = 270;
  const margin = { top: 48, left: 45, right: 35, bottom: 25 };
  const width = svgWidth - margin.left - margin.right;
  const height = svgHeight - margin.top - margin.bottom;

  const numStrings = 6;
  const numFrets = Math.min(8, Math.max(5, fretCount));
  const stringSpacing = width / (numStrings - 1);
  const fretSpacing = height / numFrets;

  const baseFret = voicing.baseFret || 1;
  const isNut = baseFret === 1;

  const tuning = GUITAR_TUNINGS[0]; // E A D G B E
  const barreEntries =
    voicing.barres && voicing.barres.length > 0
      ? voicing.barres
      : voicing.barre
        ? [voicing.barre]
        : [];

  const description = voicing.frets
    .map((storedFret, stringIdx) => {
      let fret = storedFret;
      barreEntries.forEach((barre) => {
        if (
          stringIdx >= barre.fromString &&
          stringIdx <= barre.toString &&
          (fret === null || fret === 0 || fret < barre.fret)
        ) {
          fret = barre.fret;
        }
      });
      const stringLabel = `String ${6 - stringIdx} (${tuning.strings[stringIdx]})`;
      if (fret === null) return `${stringLabel}: muted`;
      const totalSemi = NOTE_SEMITONES[tuning.strings[stringIdx]] + fret;
      const note = CHROMATIC_SHARPS[totalSemi % 12];
      const octave = tuning.octaves[stringIdx] + Math.floor(totalSemi / 12);
      return `${stringLabel}: ${fret === 0 ? "open" : `fret ${fret}`}, ${note}${octave}`;
    })
    .join("; ");

  // Handle Play Sound
  const handlePlayChord = () => {
    if (onPlay) {
      onPlay();
      return;
    }

    // Build pitch list from voicing
    const notesToPlay: { note: string; octave: number }[] = [];

    voicing.frets.forEach((storedFret, stringIdx) => {
      let fret = storedFret;
      barreEntries.forEach((barre) => {
        if (
          stringIdx >= barre.fromString &&
          stringIdx <= barre.toString &&
          (fret === null || fret === 0 || fret < barre.fret)
        ) {
          fret = barre.fret;
        }
      });
      if (fret === null) return; // muted
      const openNote = tuning.strings[stringIdx];
      const baseOct = tuning.octaves[stringIdx];
      const openSemi = NOTE_SEMITONES[openNote];
      const totalSemi = openSemi + fret;
      const currentSemi = totalSemi % 12;
      const noteName = CHROMATIC_SHARPS[currentSemi];
      const oct =
        baseOct + Math.floor(totalSemi / 12) - Math.floor(openSemi / 12);
      notesToPlay.push({ note: noteName, octave: oct });
    });

    audioEngine.playChordArpeggio(notesToPlay, "guitar", 0.05);
  };

  const DiagramContainer: React.ElementType = compact ? "div" : "button";
  return (
    <DiagramContainer
      type={compact ? undefined : "button"}
      className={
        compact
          ? "relative flex h-full w-full flex-col items-center justify-center p-2"
          : noBackground
            ? "group flex cursor-pointer flex-col items-center p-0 shadow-none"
            : "group flex cursor-pointer flex-col items-center rounded-xl border border-outline-variant/30 bg-surface-container-low p-4 shadow-lg transition-all hover:border-outline-variant/60 sm:p-6"
      }
      onClick={compact ? undefined : handlePlayChord}
      role={compact ? "group" : undefined}
      aria-label={
        compact
          ? `${chordName || root}, ${voicing.positionLabel || voicing.name}`
          : `Play ${chordName || root}, ${voicing.positionLabel || voicing.name}`
      }
      aria-describedby={compact ? undefined : descriptionId}
      style={{
        textAlign: "inherit",
        ...(compact || noBackground ? { background: "none", border: 0 } : {}),
        ...(scale !== 1
          ? { transform: `scale(${scale})`, transformOrigin: "center center" }
          : {}),
      }}
    >
      <span id={descriptionId} className="sr-only">
        {description}
      </span>
      {/* Chord Card Header */}
      {!compact && (
        <span className="w-full flex items-center justify-between pb-4 mb-2">
          <span className="flex items-center gap-4">
            <span className="font-mono text-[10px] tracking-widest text-on-surface-variant uppercase font-bold">
              {voicing.positionLabel || voicing.name}
            </span>
          </span>
          <span className="bg-surface-container border border-outline-variant/20 px-2 py-0.5 rounded text-[10px] font-mono text-on-surface">
            {voicing.rootString || `Root on ${root}`}
          </span>
        </span>
      )}

      {/* SVG Diagram Canvas */}
      <svg
        aria-hidden="true"
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        width={compact ? undefined : svgWidth}
        height={compact ? undefined : svgHeight}
        className={`overflow-visible select-none my-2 ${compact ? "h-full w-full max-h-full" : ""}`}
      >
        {/* Base Fret Indicator on left if not open */}
        {!isNut && (
          <text
            x={margin.left - 16}
            y={margin.top + fretSpacing / 2 + 4}
            fill={onSurfaceColor}
            fontSize="11"
            fontFamily="monospace"
            textAnchor="end"
            fontWeight="bold"
          >
            {baseFret}fr
          </text>
        )}

        {/* Nut (Thick horizontal bar at top if fret 1) */}
        {isNut ? (
          <line
            x1={margin.left}
            y1={margin.top}
            x2={margin.left + width}
            y2={margin.top}
            stroke={onSurfaceColor}
            strokeWidth={nutThickness}
            strokeLinecap="round"
          />
        ) : (
          <line
            x1={margin.left}
            y1={margin.top}
            x2={margin.left + width}
            y2={margin.top}
            stroke={strokeColor}
            strokeWidth={lineThickness}
          />
        )}

        {/* Horizontal Frets */}
        {Array.from({ length: numFrets + 1 }).map((_, i) => {
          if (i === 0 && isNut) return null;
          const y = margin.top + i * fretSpacing;
          return (
            <line
              key={`fret-${i}`}
              x1={margin.left}
              y1={y}
              x2={margin.left + width}
              y2={y}
              stroke={strokeColor}
              strokeWidth={lineThickness}
            />
          );
        })}

        {/* Vertical Strings (6th string on left to 1st string on right) */}
        {Array.from({ length: numStrings }).map((_, i) => {
          const x = margin.left + i * stringSpacing;
          return (
            <line
              key={`string-${i}`}
              x1={x}
              y1={margin.top}
              x2={x}
              y2={margin.top + height}
              stroke={strokeColor}
              strokeWidth={lineThickness}
            />
          );
        })}

        {/* Barre lines if present */}
        {barreEntries.map((barre, index) => {
          if (!barre || barre.fret <= 0) return null;

          const relFret = barre.fret - baseFret + 1;
          const fromX = margin.left + barre.fromString * stringSpacing;
          const toX = margin.left + barre.toString * stringSpacing;
          const y = margin.top + (relFret - 0.5) * fretSpacing;
          const endpointStrings = [
            ...new Set([barre.fromString, barre.toString]),
          ];
          const barreHeight = dotRadius * 1.6;

          return (
            <g key={`barre-${barre.fret}-${index}`}>
              <rect
                x={Math.min(fromX, toX) - dotRadius / 2}
                y={y - barreHeight / 2}
                width={Math.abs(toX - fromX) + dotRadius}
                height={barreHeight}
                rx={barreHeight / 2}
                fill="var(--color-on-surface-variant)"
                opacity={0.4}
              />
              {endpointStrings.map((stringIdx) => {
                const openSemi = NOTE_SEMITONES[tuning.strings[stringIdx]];
                const isRoot =
                  (openSemi + barre.fret) % 12 === NOTE_SEMITONES[root];
                const endpointX = margin.left + stringIdx * stringSpacing;

                return (
                  <g key={`barre-end-${stringIdx}`}>
                    <circle
                      cx={endpointX}
                      cy={y}
                      r={dotRadius}
                      fill={isRoot ? "var(--color-secondary)" : dotColor}
                    />
                    <text
                      x={endpointX}
                      y={y + 3.5}
                      fill={
                        isRoot ? "var(--color-on-secondary)" : textInDotColor
                      }
                      fontSize={textSize}
                      fontFamily="sans-serif"
                      textAnchor="middle"
                      fontWeight="bold"
                    >
                      {barre.finger}
                    </text>
                  </g>
                );
              })}
            </g>
          );
        })}

        {/* Finger Dots, Open 'O' and Muted 'X' indicators */}
        {voicing.frets.map((fret, stringIdx) => {
          const x = margin.left + stringIdx * stringSpacing;

          if (fret === null) {
            // Muted String 'X'
            return (
              <text
                key={`mute-${stringIdx}`}
                x={x}
                y={margin.top - 12}
                fill="var(--color-error)"
                fontSize="12"
                fontFamily="sans-serif"
                textAnchor="middle"
                fontWeight="bold"
              >
                x
              </text>
            );
          }

          if (fret === 0) {
            // Open String 'O'
            return (
              <text
                key={`open-${stringIdx}`}
                x={x}
                y={margin.top - 12}
                fill="var(--color-primary)"
                fontSize="11"
                fontFamily="monospace"
                textAnchor="middle"
                fontWeight="bold"
              >
                0
              </text>
            );
          }

          // Fretted note dot
          const relFret = fret - baseFret + 1;
          if (relFret >= 1 && relFret <= numFrets) {
            // Determine if root
            const openNote = tuning.strings[stringIdx];
            const openSemi = NOTE_SEMITONES[openNote];
            const totalSemi = openSemi + fret;
            const currentSemi = totalSemi % 12;
            const isRoot = currentSemi === NOTE_SEMITONES[root];

            // Skip drawing individual dot if it is covered by the barre
            const coveringBarre = barreEntries.find(
              (barre) =>
                barre &&
                barre.fret === fret &&
                stringIdx >= Math.min(barre.fromString, barre.toString) &&
                stringIdx <= Math.max(barre.fromString, barre.toString),
            );

            if (coveringBarre) {
              if (
                stringIdx === coveringBarre.fromString ||
                stringIdx === coveringBarre.toString
              ) {
                return null;
              }
              // We might still want to highlight if it's a root note under the barre,
              // but standard diagrams usually just leave the barre solid.
              if (isRoot) {
                const y = margin.top + (relFret - 0.5) * fretSpacing;
                return (
                  <circle
                    key={`dot-barre-root-${stringIdx}`}
                    cx={x}
                    cy={y}
                    r={5}
                    fill="var(--color-secondary)"
                  />
                );
              }
              return null;
            }

            const y = margin.top + (relFret - 0.5) * fretSpacing;
            const fingerNum = voicing.fingers
              ? voicing.fingers[stringIdx]
              : null;

            const dotFill = isRoot ? "var(--color-secondary)" : dotColor;
            const textFill = isRoot
              ? "var(--color-on-secondary)"
              : textInDotColor;

            return (
              <g key={`dot-${stringIdx}`}>
                <circle cx={x} cy={y} r={dotRadius} fill={dotFill} />
                {fingerNum && (
                  <text
                    x={x}
                    y={y + 3.5}
                    fill={textFill}
                    fontSize="10"
                    fontFamily="sans-serif"
                    textAnchor="middle"
                    fontWeight="bold"
                  >
                    {fingerNum}
                  </text>
                )}
              </g>
            );
          }

          return null;
        })}

        {/* String Names at bottom */}
        {!compact &&
          tuning.strings.map((noteName, i) => (
            <text
              key={`str-name-${i}`}
              x={margin.left + i * stringSpacing}
              y={margin.top + height + 20}
              fill={
                voicing.frets[i] === null
                  ? strokeColor
                  : voicing.frets[i] !== null &&
                      NOTE_SEMITONES[noteName] === NOTE_SEMITONES[root] &&
                      voicing.frets[i] === 0
                    ? "var(--color-secondary)"
                    : onSurfaceColor
              }
              fontSize={textSize}
              fontFamily="monospace"
              textAnchor="middle"
              fontWeight="bold"
            >
              {noteName}
            </text>
          ))}
      </svg>
      {compact && (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            handlePlayChord();
          }}
          aria-label={`Play ${chordName || root}, ${voicing.positionLabel || voicing.name}`}
          aria-describedby={descriptionId}
          className="absolute right-1 top-1 z-10 inline-flex h-8 w-8 items-center justify-center rounded bg-surface-container text-primary shadow-sm transition-colors hover:bg-surface-container-high focus-visible:ring-2 focus-visible:ring-primary"
        >
          <Volume2 size={16} aria-hidden="true" />
        </button>
      )}
    </DiagramContainer>
  );
};
