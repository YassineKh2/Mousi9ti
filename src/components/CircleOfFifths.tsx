import React, { useState } from "react";
import { Volume2, Music, Sparkles } from "lucide-react";
import { NoteName } from "../types";
import {
  CIRCLE_OF_FIFTHS_DATA,
  CircleKeyData,
  DiatonicChord,
  getDiatonicChords,
  NOTE_SEMITONES,
  CHROMATIC_SHARPS,
} from "../data/musicTheory";
import { audioEngine } from "../lib/audio";

interface CircleOfFifthsProps {
  onSelectKey?: (key: NoteName) => void;
}

export const CircleOfFifths: React.FC<CircleOfFifthsProps> = ({
  onSelectKey,
}) => {
  const [selectedKey, setSelectedKey] = useState<CircleKeyData>(
    CIRCLE_OF_FIFTHS_DATA[0],
  ); // C Major default
  const diatonicChords = getDiatonicChords(selectedKey.major);

  const size = 640;
  const center = size / 2;
  const outerRadius = 280;
  const middleRadius = 193;
  const innerRadius = 107;

  const getDisplayMajor = (major: string) => {
    if (major === "B") return "B/Cb";
    if (major === "F#") return "F#/Gb";
    if (major === "Db") return "Db/C#";
    return major;
  };

  const getDisplayMinor = (minor: string) => {
    if (minor === "G#m") return "G#m/Abm";
    if (minor === "D#m") return "D#m/Ebm";
    if (minor === "Bbm") return "Bbm/A#m";
    return minor;
  };

  const getDisplaySignature = (major: string, count: number, type: string) => {
    if (major === "B") return "5# / 7b";
    if (major === "F#") return "6# / 6b";
    if (major === "Db") return "5b / 7#";
    if (count === 0) return "";
    return `${count}${type}`;
  };

  const handleKeyClick = (item: CircleKeyData) => {
    setSelectedKey(item);
    if (onSelectKey) onSelectKey(item.major);
    // Play root triad sound
    audioEngine.playGuitarPluck(item.major, 3, 1.8);
  };

  const playDiatonicChord = (chord: DiatonicChord) => {
    const notesToPlay = chord.notes.map((n) => ({ note: n, octave: 3 }));
    audioEngine.playChordArpeggio(notesToPlay, "guitar", 0.05);
  };

  // Play full 4-chord progression
  const playProgression = (indices: number[]) => {
    indices.forEach((idx, i) => {
      const chord = diatonicChords[idx];
      if (!chord) return;
      const notesToPlay = chord.notes.map((n) => ({ note: n, octave: 3 }));
      setTimeout(() => {
        audioEngine.playChordArpeggio(notesToPlay, "guitar", 0.04);
      }, i * 750);
    });
  };

  return (
    <div className="circle-of-fifths w-full bg-surface-container border border-outline-variant/30 rounded-lg p-6 flex flex-col gap-6 shadow-xl">
      <div className="flex w-full flex-wrap items-center justify-between gap-4 pb-4 border-b border-outline-variant/10">
        <div>
          <h2 className="font-mono text-base font-bold tracking-[0.12em] text-[color:var(--circle-heading)] uppercase flex items-center gap-2">
            <Sparkles size={16} className="text-primary" />
            Interactive Circle of Fifths
          </h2>
          <p className="text-xs text-[color:var(--circle-subtle)] mt-0.5">
            Harmonic relationships, relative keys, and diatonic chord analysis
          </p>
        </div>

        <div className="flex items-center gap-2 bg-blue-500/10 border border-blue-500/30 px-3 py-1.5 rounded">
          <span className="text-xs font-mono text-blue-300">
            Selected:{" "}
            <strong className="text-[color:var(--circle-heading)]">
              {getDisplayMajor(selectedKey.major)} Major
            </strong>{" "}
            /{" "}
            <span className="text-zinc-300">
              {getDisplayMinor(selectedKey.minor)}
            </span>
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        {/* SVG Interactive Wheel */}
        <div className="lg:col-span-7 flex justify-center">
          <div className="relative w-full max-w-[640px]">
            <svg
              viewBox={`0 0 ${size} ${size}`}
              className="select-none w-full h-auto"
            >
              {/* Center decorative circle */}
              <circle
                cx={center}
                cy={center}
                r={innerRadius}
                fill="var(--circle-center)"
                stroke="var(--circle-center-border)"
                strokeWidth="2"
              />
              <text
                x={center}
                y={center - 10}
                fill="var(--circle-heading)"
                fontSize="22"
                fontWeight="bold"
                fontFamily="monospace"
                textAnchor="middle"
              >
                {getDisplayMajor(selectedKey.major)}
              </text>
              <text
                x={center}
                y={center + 6}
                fill="#3b82f6"
                fontSize="15"
                fontFamily="monospace"
                textAnchor="middle"
              >
                {getDisplayMinor(selectedKey.minor)}
              </text>
              {selectedKey.signatureCount > 0 && (
                <text
                  x={center}
                  y={center + 20}
                  fill="var(--circle-muted)"
                  fontSize="13"
                  fontFamily="monospace"
                  textAnchor="middle"
                >
                  {getDisplaySignature(
                    selectedKey.major,
                    selectedKey.signatureCount,
                    selectedKey.signatureType,
                  )}
                </text>
              )}

              {/* Outer 12 Segments for Major Keys */}
              {CIRCLE_OF_FIFTHS_DATA.map((item, idx) => {
                const angleDeg = idx * 30 - 90; // C at 12 o'clock (-90 deg)
                const startAngle = (angleDeg - 15) * (Math.PI / 180);
                const endAngle = (angleDeg + 15) * (Math.PI / 180);
                const textAngle = angleDeg * (Math.PI / 180);

                const isSelected = selectedKey.major === item.major;

                // Sector Path coordinates
                const x1 = center + outerRadius * Math.cos(startAngle);
                const y1 = center + outerRadius * Math.sin(startAngle);
                const x2 = center + outerRadius * Math.cos(endAngle);
                const y2 = center + outerRadius * Math.sin(endAngle);
                const x3 = center + middleRadius * Math.cos(endAngle);
                const y3 = center + middleRadius * Math.sin(endAngle);
                const x4 = center + middleRadius * Math.cos(startAngle);
                const y4 = center + middleRadius * Math.sin(startAngle);

                const outerPath = `M ${x1} ${y1} A ${outerRadius} ${outerRadius} 0 0 1 ${x2} ${y2} L ${x3} ${y3} A ${middleRadius} ${middleRadius} 0 0 0 ${x4} ${y4} Z`;

                const textRadius = (outerRadius + middleRadius) / 2;
                const tx = center + textRadius * Math.cos(textAngle);
                const ty = center + textRadius * Math.sin(textAngle);

                // Inner relative minor sector coordinates
                const ix1 = center + middleRadius * Math.cos(startAngle);
                const iy1 = center + middleRadius * Math.sin(startAngle);
                const ix2 = center + middleRadius * Math.cos(endAngle);
                const iy2 = center + middleRadius * Math.sin(endAngle);
                const ix3 = center + innerRadius * Math.cos(endAngle);
                const iy3 = center + innerRadius * Math.sin(endAngle);
                const ix4 = center + innerRadius * Math.cos(startAngle);
                const iy4 = center + innerRadius * Math.sin(startAngle);

                const innerPath = `M ${ix1} ${iy1} A ${middleRadius} ${middleRadius} 0 0 1 ${ix2} ${iy2} L ${ix3} ${iy3} A ${innerRadius} ${innerRadius} 0 0 0 ${ix4} ${iy4} Z`;

                const minorTextRadius = (middleRadius + innerRadius) / 2;
                const mtx = center + minorTextRadius * Math.cos(textAngle);
                const mty = center + minorTextRadius * Math.sin(textAngle);

                return (
                  <g
                    key={item.major}
                    onClick={() => handleKeyClick(item)}
                    className="cursor-pointer group"
                  >
                    {/* Major Key Wedge */}
                    <path
                      d={outerPath}
                      fill={isSelected ? "#2563eb" : "var(--circle-major)"}
                      stroke="var(--circle-center)"
                      strokeWidth="2"
                      className="transition-colors hover:fill-blue-500/70"
                    />
                    <text
                      x={tx}
                      y={ty + 1}
                      fill={isSelected ? "#ffffff" : "var(--circle-text)"}
                      fontSize={
                        getDisplayMajor(item.major).includes("/") ? "15" : "18"
                      }
                      fontWeight="bold"
                      fontFamily="monospace"
                      textAnchor="middle"
                    >
                      {getDisplayMajor(item.major)}
                    </text>
                    {item.signatureCount > 0 && (
                      <text
                        x={tx}
                        y={ty + 15}
                        fill={isSelected ? "#bfdbfe" : "var(--circle-muted)"}
                        fontSize={
                          getDisplaySignature(
                            item.major,
                            item.signatureCount,
                            item.signatureType,
                          ).includes("/")
                            ? "9"
                            : "12"
                        }
                        fontFamily="monospace"
                        textAnchor="middle"
                      >
                        {getDisplaySignature(
                          item.major,
                          item.signatureCount,
                          item.signatureType,
                        )}
                      </text>
                    )}

                    {/* Relative Minor Wedge */}
                    <path
                      d={innerPath}
                      fill={isSelected ? "#1d4ed8" : "var(--circle-minor)"}
                      stroke="var(--circle-center)"
                      strokeWidth="2"
                      className="transition-colors hover:fill-blue-600/70"
                    />
                    <text
                      x={mtx}
                      y={mty + 3}
                      fill={isSelected ? "#93c5fd" : "var(--circle-muted)"}
                      fontSize={
                        getDisplayMinor(item.minor).includes("/") ? "10" : "12"
                      }
                      fontFamily="monospace"
                      textAnchor="middle"
                    >
                      {getDisplayMinor(item.minor)}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        </div>

        {/* Diatonic Chords & Progression Analysis */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          <div className="bg-surface-container-low border border-outline-variant/30 rounded-lg p-4">
            <h3 className="font-mono text-xs font-semibold text-[color:var(--circle-subtle)] uppercase tracking-wider mb-3">
              Diatonic Harmony ({getDisplayMajor(selectedKey.major)} Major)
            </h3>

            {/* Diatonic Chord Grid */}
            <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
              {diatonicChords.map((chord, idx) => (
                <div
                  key={chord.numeral}
                  onClick={() => playDiatonicChord(chord)}
                  className="bg-surface-container border border-outline-variant/30 hover:border-blue-500/40 rounded p-2 flex flex-col items-center cursor-pointer group transition-all"
                >
                  <span className="text-[10px] font-mono text-[color:var(--circle-muted)] group-hover:text-blue-400">
                    {chord.numeral}
                  </span>
                  <span className="font-mono text-sm font-bold text-[color:var(--circle-strong)] group-hover:text-white">
                    {chord.name}
                  </span>
                  <span className="text-[9px] font-mono text-[color:var(--circle-muted)] mt-1">
                    {chord.type}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Popular Chord Progressions */}
          <div className="bg-surface-container-low border border-outline-variant/30 rounded-lg p-4">
            <h3 className="font-mono text-xs font-semibold text-[color:var(--circle-subtle)] uppercase tracking-wider mb-3">
              Common Progressions (Click to Audition)
            </h3>

            <div className="space-y-2">
              {[
                { name: "Pop Anthem (I - V - vi - IV)", indices: [0, 4, 5, 3] },
                { name: "Jazz Turnaround (ii - V - I)", indices: [1, 4, 0] },
                {
                  name: "50s Doo-Wop (I - vi - IV - V)",
                  indices: [0, 5, 3, 4],
                },
                {
                  name: "Andalusian Minor (i - VII - VI - V)",
                  indices: [5, 4, 3, 2],
                },
              ].map((prog) => {
                const chordNames = prog.indices
                  .map((idx) => diatonicChords[idx]?.name || "")
                  .join(" → ");

                return (
                  <div
                    key={prog.name}
                    onClick={() => playProgression(prog.indices)}
                    className="flex items-center justify-between bg-surface-container hover:bg-surface-container-high border border-outline-variant/20 hover:border-blue-500/30 p-2.5 rounded cursor-pointer transition-colors"
                  >
                    <div className="flex flex-col">
                      <span className="font-mono text-xs font-semibold text-[color:var(--circle-strong)]">
                        {prog.name}
                      </span>
                      <span className="font-mono text-[11px] text-blue-400 mt-0.5">
                        {chordNames}
                      </span>
                    </div>

                    <button className="w-7 h-7 rounded bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center justify-center">
                      <Volume2 size={13} />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
