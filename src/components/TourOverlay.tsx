import React, { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  X,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Keyboard,
  MousePointerClick,
  ChevronRight,
  Check,
  RefreshCw,
  List,
  Plus,
  Piano,
  BookOpen,
  LayoutDashboard,
  Timer,
  Clock,
  Guitar,
  Play,
  Flame,
  CalendarCheck2,
  Music,
  Music2,
  Layers,
  Settings2,
  Compass,
  BarChart3,
  Search,
  Trophy,
} from "lucide-react";
import { ActiveTab } from "./Navigation";

// ─── Types ───────────────────────────────────────────────────────────────────

interface TourStep {
  id: string;
  title: string;
  description: string;
  targetSelector?: string;
  tab?: ActiveTab;
  awaitAction?: boolean;
  action?: string;
}

// ─── Step Definitions ────────────────────────────────────────────────────────

const STEPS: TourStep[] = [
  {
    id: "welcome",
    title: "Welcome to Mousi9ti",
    description:
      "Your practice studio for guitar and piano. Take a quick tour of the dashboard, practice routine, music tools, and progress tracking.",
  },
  {
    id: "sidebar",
    title: "Navigation",
    description:
      "Move between Dashboard, Scales, Chords, Builder, Routine, Tools, and Stats from the sidebar on desktop or the bottom bar on mobile.",
    targetSelector: "[data-tour='sidebar-nav']",
    tab: "dashboard",
  },
  {
    id: "metronome",
    title: "Metronome",
    description:
      "Set BPM, time signature, subdivision, and click sound. The metronome keeps running when you switch pages.",
    targetSelector: "[data-dashboard-widget='metronome']",
    tab: "dashboard",
    action: "Press Space to start / stop",
  },
  {
    id: "timer",
    title: "Practice Timer",
    description:
      "Use the countdown timer and quick presets to structure a focused practice block.",
    targetSelector: "[data-dashboard-widget='timer']",
    tab: "dashboard",
  },
  {
    id: "session",
    title: "Practice Session",
    description:
      "Start a session to track your full practice time. Log & Finish opens a review of task time in minutes and seconds. You can leave time for general practice without assigning it to a task. Save & finish session confirms the log, closing with X leaves the session paused without finishing it.",
    targetSelector: "[data-dashboard-widget='session']",
    tab: "dashboard",
  },
  {
    id: "instruments-widget",
    title: "Fretboard & Piano",
    description:
      "Explore notes on the fretboard or piano. Switch between Guitar, Piano, or Both and adjust tuning here, choose your instrument before moving on to Daily Practice Goals.",
    targetSelector: "[data-dashboard-widget='instruments']",
    tab: "dashboard",
  },
  {
    id: "practice-tasks",
    title: "Daily Practice Goals",
    description:
      "Keep today's practice goals close at hand. Starting or checking off one task counts toward your streak, completing every planned task marks the practice day complete. Click Get started to set up your tasks. The tour pauses during setup, click Resume tour when you are done.",
    targetSelector: "[data-dashboard-widget='practice-tasks']",
    tab: "dashboard",
  },
  {
    id: "drill",
    title: "Random Note Drill",
    description:
      "A random note appears for you to find on the fretboard, building note recognition and position memory.",
    targetSelector: "[data-dashboard-widget='random-drill']",
    tab: "dashboard",
    action: "Press N for the next note",
  },
  {
    id: "chord-widget",
    title: "Chord Display",
    description:
      "See the selected chord's guitar diagram and piano voicing together. Play the voicings to hear them.",
    targetSelector: "[data-dashboard-widget='chord-selector']",
    tab: "dashboard",
  },
  {
    id: "streak",
    title: "Practice Streak",
    description:
      "Starting or completing at least one task earns streak credit for the day, only once per day. A streak tracks showing up to practice, a completed practice day means you finished all planned tasks. Starting a task does not check it off or complete the practice day.",
    targetSelector: "[data-tour='sidebar-streak']",
    tab: "dashboard",
  },
  {
    id: "dashboard-customize",
    title: "Customize Dashboard",
    description:
      "Click Customize to rearrange or hide widgets. The tour will pause while you edit, click Done to continue the tour.",
    targetSelector: "[data-tour='dashboard-customize']",
    tab: "dashboard",
    awaitAction: true,
  },
  {
    id: "go-scales",
    title: "Open Scales",
    description:
      "Open Scales to explore and play scales across the fretboard and piano.",
    targetSelector: "[data-tour='nav-item-scales']",
    tab: "dashboard",
    awaitAction: true,
  },
  {
    id: "scales-panel",
    title: "Scale Explorer",
    description:
      "Choose a root note and scale type, then display note names, degrees, or intervals and play through the scale.",
    targetSelector: "[data-tour='scales-panel']",
    tab: "scales",
  },
  {
    id: "scales-fretboard",
    title: "Scale on Your Instrument",
    description:
      "The fretboard and piano respond to the selected scale. Adjust tuning and fret count or switch between guitar, piano, and both.",
    targetSelector: "[data-tour='scales-fretboard']",
    tab: "scales",
  },
  {
    id: "go-chords",
    title: "Open Chords",
    description: "Open Chords to find and hear guitar and piano voicings.",
    targetSelector: "[data-tour='nav-item-chords']",
    tab: "scales",
    awaitAction: true,
  },
  {
    id: "chords-filters",
    title: "Chord Library",
    description:
      "Choose a root and chord type to update the available voicings and notation, then play a chord to hear it.",
    targetSelector: "[data-tour='chords-filters']",
    tab: "chords",
  },
  {
    id: "chords-voicing",
    title: "Guitar & Piano Voicings",
    description:
      "Browse guitar fingering positions and the corresponding piano voicing for your selected chord.",
    targetSelector: "[data-tour='chords-voicing']",
    tab: "chords",
  },
  {
    id: "go-builder",
    title: "Open Builder",
    description: "Open Builder to create, save, and play chord progressions.",
    targetSelector: "[data-tour='nav-item-builder']",
    tab: "chords",
    awaitAction: true,
  },
  {
    id: "builder-controls",
    title: "Playback Controls",
    description:
      "Choose an instrument, set tempo and reverb, and play your progression with instrument audio.",
    targetSelector: "[data-tour='builder-controls']",
    tab: "builder",
  },
  {
    id: "builder-queue",
    title: "Chord Queue",
    description:
      "Arrange your progression, set chord durations and strumming patterns, and load or save presets.",
    targetSelector: "[data-tour='builder-queue']",
    tab: "builder",
  },
  {
    id: "builder-add",
    title: "Add Chords to Queue",
    description:
      "Search for a chord, choose a voicing, and add it to your progression.",
    targetSelector: "[data-tour='builder-add']",
    tab: "builder",
  },
  {
    id: "go-routine",
    title: "Open Routine",
    description:
      "Open Routine to plan practice goals across the week and review your completion.",
    targetSelector: "[data-tour='nav-item-routine']",
    tab: "builder",
    awaitAction: true,
  },
  {
    id: "routine-schedule",
    title: "Weekly Schedule",
    description:
      "Review your weekly target and completion, and choose a past week to check your practice history.",
    targetSelector: "[data-tour='routine-schedule']",
    tab: "routine",
  },
  {
    id: "routine-days",
    title: "Choose a Practice Day",
    description:
      "Select a day to edit its focus, goals, and target duration. The cards summarize completion across the week.",
    targetSelector: "[data-tour='routine-days']",
    tab: "routine",
  },
  {
    id: "routine-goals",
    title: "Daily Goals & Task Tags",
    description:
      "Click Start tasks to complete the task guide and add your practice goals, then click Resume tour. Use @scale, @chord, @bpm, or @timer for practice settings. Timer durations accept seconds, such as @timer(20s), or mixed times like @timer(1m 20s). Typing @t puts Timer first and Tuning last.",
    targetSelector: "[data-tour='routine-goals']",
    tab: "routine",
  },
  {
    id: "go-tools",
    title: "Open Tools",
    description:
      "Open Tools for the Circle of Fifths and other music-practice utilities.",
    targetSelector: "[data-tour='nav-item-tools']",
    tab: "routine",
    awaitAction: true,
  },
  {
    id: "tools-tabs",
    title: "Theory Tools",
    description:
      "Switch between the available theory and practice tools using these tabs.",
    targetSelector: "[data-tour='tools-tabs']",
    tab: "tools",
  },
  {
    id: "circle-fifths",
    title: "Circle of Fifths",
    description:
      "Explore key relationships, related chords, chord qualities, and relative minors from the interactive wheel.",
    targetSelector: "[data-tour='circle-of-fifths']",
    tab: "tools",
  },
  {
    id: "go-stats",
    title: "Open Stats",
    description:
      "Open Stats for your session history, practice totals, and progress charts.",
    targetSelector: "[data-tour='nav-item-stats']",
    tab: "tools",
    awaitAction: true,
  },
  {
    id: "stats-metrics",
    title: "Practice Analytics",
    description:
      "Review practice totals, streaks, completed practice days, and BPM progress. Your streak counts days when you started or completed at least one task, completed practice days require all planned tasks to be finished. These track consistency and daily goal completion separately.",
    targetSelector: "[data-tour='stats-metrics']",
    tab: "stats",
  },
  {
    id: "search",
    title: "Global Search",
    description:
      "Search pages, scales, and chords from anywhere in the app to jump directly to what you need.",
    targetSelector: "[data-tour='search-bar']",
    tab: "stats",
  },
  {
    id: "done",
    title: "You're all set!",
    description:
      "You're ready to practice. Restart this tour anytime from Studio Settings.",
    tab: "dashboard",
  },
];

// ─── Constants ────────────────────────────────────────────────────────────────

const SP_PAD = 10;

const SECTION_STARTS: Record<number, string> = {
  0: "Intro",
  1: "Navigation",
  2: "Dashboard",
  11: "Scales",
  14: "Chords",
  17: "Builder",
  21: "Routine",
  25: "Tools",
  28: "Stats",
  31: "Finish",
};

// ─── Step Icons ───────────────────────────────────────────────────────────────

function getSidebarItemClass(i: number, stepIndex: number): string {
  if (i === stepIndex) return "bg-primary/12 text-on-surface";
  if (i < stepIndex)
    return "text-on-surface-variant/50 hover:bg-surface-container-high hover:text-on-surface";
  return "text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface";
}

function getStepIcon(id: string, size = 34): React.ReactNode {
  const S = size;
  const map: Record<string, React.ReactNode> = {
    welcome: <BookOpen size={S} />,
    sidebar: <LayoutDashboard size={S} />,
    metronome: <Timer size={S} />,
    timer: <Clock size={S} />,
    drill: <Guitar size={S} />,
    session: <Play size={S} />,
    "practice-tasks": <CheckCircle2 size={S} />,
    streak: <Flame size={S} />,
    "dashboard-customize": <Settings2 size={S} />,
    "go-routine": <CalendarCheck2 size={S} />,
    "routine-schedule": <CalendarCheck2 size={S} />,
    "routine-days": <CalendarCheck2 size={S} />,
    "routine-goals": <CheckCircle2 size={S} />,
    "go-scales": <Music size={S} />,
    "scales-panel": <Music2 size={S} />,
    "scales-fretboard": <Guitar size={S} />,
    "go-chords": <Layers size={S} />,
    "chords-filters": <Layers size={S} />,
    "chords-voicing": <Layers size={S} />,
    "go-builder": <Settings2 size={S} />,
    "builder-controls": <Settings2 size={S} />,
    "builder-queue": <Settings2 size={S} />,
    "builder-add": <Plus size={S} />,
    "go-tools": <Compass size={S} />,
    "tools-tabs": <Compass size={S} />,
    "circle-fifths": <Compass size={S} />,
    "go-stats": <BarChart3 size={S} />,
    "stats-metrics": <BarChart3 size={S} />,
    "instruments-widget": <Guitar size={S} />,
    "chord-widget": <Piano size={S} />,
    search: <Search size={S} />,
    done: <Trophy size={S} />,
  };
  return map[id] ?? <BookOpen size={S} />;
}

// ─── Module-level Effect Helpers ─────────────────────────────────────────────

/**
 * Returns the first element matching `selector` that has non-zero dimensions.
 * Elements hidden via display:none (e.g. the desktop sidebar on mobile) return
 * a zero rect from getBoundingClientRect, so they are skipped. This lets us
 * fall through to a mobile-visible duplicate (e.g. the bottom tab bar).
 */
function findVisible(selector: string): HTMLElement | null {
  for (const el of document.querySelectorAll<HTMLElement>(selector)) {
    const r = el.getBoundingClientRect();
    if (r.width > 0 || r.height > 0) return el;
  }
  return null;
}

/**
 * Retries finding a *visible* element matching `selector` up to 12 times every
 * 80ms. Calls `onNotFound` after all attempts if no visible element is found —
 * used to fall back from reveal mode to the full modal on mobile.
 */
function resolveWithRetry(
  selector: string | undefined,
  setRect: (r: DOMRect | null) => void,
  onNotFound?: () => void,
): () => void {
  if (!selector) {
    setRect(null);
    return () => {};
  }
  let cancelled = false;
  let tid: ReturnType<typeof setTimeout>;
  let attempts = 0;

  const tryOnce = () => {
    if (cancelled) return;
    const el = findVisible(selector);
    if (el) {
      el.scrollIntoView({
        behavior: "instant",
        block: "center",
        inline: "center",
      });
      tid = setTimeout(() => {
        if (cancelled) return;
        const el2 = findVisible(selector);
        if (el2) {
          setRect(el2.getBoundingClientRect());
        } else if (attempts++ < 12) {
          tid = setTimeout(tryOnce, 80);
        } else {
          onNotFound?.();
        }
      }, 50);
    } else if (attempts++ < 12) {
      tid = setTimeout(tryOnce, 80);
    } else {
      onNotFound?.();
    }
  };

  tid = setTimeout(tryOnce, 80);
  return () => {
    cancelled = true;
    clearTimeout(tid);
  };
}

function addListener(
  target: Window,
  event: string,
  handler: EventListenerOrEventListenerObject,
): () => void {
  target.addEventListener(event, handler);
  return () => target.removeEventListener(event, handler);
}

/** Attaches a click-advance handler to ALL elements matching `selector`.
 *  This covers both the desktop sidebar button and the mobile bottom-nav button
 *  that share the same data-tour attribute. */
function attachClickAdvance(
  selector: string,
  setStep: React.Dispatch<React.SetStateAction<number>>,
): () => void {
  const elements = document.querySelectorAll(selector);
  if (!elements.length) return () => {};
  const handler = () =>
    setTimeout(() => setStep((i) => Math.min(i + 1, STEPS.length - 1)), 80);
  elements.forEach((el) => el.addEventListener("click", handler));
  return () =>
    elements.forEach((el) => el.removeEventListener("click", handler));
}

function makeKeyHandler(
  isFirst: boolean,
  isLast: boolean,
  onClose: () => void,
  setStep: React.Dispatch<React.SetStateAction<number>>,
): EventListener {
  return ((e: KeyboardEvent) => {
    if (e.key === "Escape") {
      onClose();
      return;
    }
    if (e.key === "ArrowRight" && !isLast) setStep((i) => i + 1);
    if (e.key === "ArrowLeft" && !isFirst) setStep((i) => i - 1);
  }) as EventListener;
}

// ─── Spotlight (used in reveal mode) ─────────────────────────────────────────

interface SpotGeometry {
  top: number;
  left: number;
  width: number;
  height: number;
}
interface TourSpotlightProps {
  spot: SpotGeometry | null;
}

const TourSpotlight: React.FC<TourSpotlightProps> = ({ spot }) => {
  if (!spot) return null;
  return (
    <div
      style={{
        position: "fixed",
        top: spot.top,
        left: spot.left,
        width: spot.width,
        height: spot.height,
        borderRadius: 12,
        boxShadow: "0 0 0 9999px rgba(0,0,0,0.78)",
        border: "2px solid var(--color-primary)",
        zIndex: 250,
        pointerEvents: "none",
        transition:
          "top .28s ease,left .28s ease,width .28s ease,height .28s ease",
        animation: "tour-pulse-strong 1.1s ease-in-out infinite",
      }}
    >
      <div
        style={{
          position: "absolute",
          bottom: -34,
          left: "50%",
          transform: "translateX(-50%)",
          whiteSpace: "nowrap",
        }}
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary text-on-primary text-[10px] font-mono font-bold tracking-wide shadow-lg"
      >
        <MousePointerClick size={10} /> Click to interact
      </div>
    </div>
  );
};

// ─── Reveal-mode overlay (backdrop + controls) ────────────────────────────────

interface RevealOverlayProps {
  spot: SpotGeometry | null;
  step: TourStep;
  stepIndex: number;
  isFirst: boolean;
  isLast: boolean;
  onPrev: () => void;
  onNext: () => void;
  onShowList: () => void;
  onClose: () => void;
}

const RevealOverlay: React.FC<RevealOverlayProps> = ({
  spot,
  step,
  stepIndex,
  isFirst,
  isLast,
  onPrev,
  onNext,
  onShowList,
  onClose,
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [arrowPath, setArrowPath] = useState<string | null>(null);
  const [cardPosition, setCardPosition] = useState<{
    left: number;
    top: number;
  } | null>(null);
  const positionedStepRef = useRef<number | null>(null);
  const keepCardLeftRef = useRef(false);

  const positionCard = useCallback(() => {
    const card = cardRef.current;
    if (!spot || !card) return;

    const cardRect = card.getBoundingClientRect();
    const margin = 16;
    const maxLeft = Math.max(
      margin,
      window.innerWidth - cardRect.width - margin,
    );
    const maxTop = Math.max(
      margin,
      window.innerHeight - cardRect.height - margin,
    );
    const clampLeft = (left: number) =>
      Math.min(maxLeft, Math.max(margin, left));
    const clampTop = (top: number) => Math.min(maxTop, Math.max(margin, top));
    const defaultPosition = { left: maxLeft, top: margin };
    const leftPosition = { left: margin, top: margin };
    const candidates = keepCardLeftRef.current
      ? [
          leftPosition,
          { left: margin, top: clampTop(spot.top + spot.height + margin) },
          { left: margin, top: maxTop },
        ]
      : [
          defaultPosition,
          leftPosition,
          { left: maxLeft, top: clampTop(spot.top + spot.height + margin) },
          { left: margin, top: clampTop(spot.top + spot.height + margin) },
          { left: maxLeft, top: maxTop },
          { left: margin, top: maxTop },
        ];
    const overlapArea = ({ left, top }: { left: number; top: number }) =>
      Math.max(
        0,
        Math.min(left + cardRect.width, spot.left + spot.width) -
          Math.max(left, spot.left),
      ) *
      Math.max(
        0,
        Math.min(top + cardRect.height, spot.top + spot.height) -
          Math.max(top, spot.top),
      );
    const preferredPosition = keepCardLeftRef.current
      ? leftPosition
      : defaultPosition;
    if (overlapArea(preferredPosition) === 0) {
      setCardPosition(preferredPosition);
      return;
    }

    const bestPosition = candidates.reduce((best, candidate) => {
      const candidateOverlap = overlapArea(candidate);
      const bestOverlap = overlapArea(best);
      const candidateScore =
        candidateOverlap * 1000 + (candidate.top > margin ? 100 : 0);
      const bestScore = bestOverlap * 1000 + (best.top > margin ? 100 : 0);
      return candidateScore < bestScore ? candidate : best;
    });

    if (bestPosition.left === margin) keepCardLeftRef.current = true;
    setCardPosition(bestPosition);
  }, [spot]);

  useEffect(() => {
    if (!spot || positionedStepRef.current === stepIndex) return;
    const frame = requestAnimationFrame(() => {
      if (positionedStepRef.current === stepIndex) return;
      positionedStepRef.current = stepIndex;
      positionCard();
    });
    return () => cancelAnimationFrame(frame);
  }, [positionCard, spot, stepIndex]);

  const computeArrow = useCallback(() => {
    if (!spot || !cardRef.current) {
      setArrowPath(null);
      return;
    }
    const r = cardRef.current.getBoundingClientRect();
    const sx = spot.left + spot.width / 2;
    const sy = spot.top + spot.height / 2;
    const cx = Math.min(r.right, Math.max(r.left, sx));
    const cy = Math.min(r.bottom, Math.max(r.top, sy));
    const cpx = (cx + sx) / 2;
    const cpy = (cy + sy) / 2 - 35;
    setArrowPath(`M ${cx} ${cy} Q ${cpx} ${cpy} ${sx} ${sy}`);
  }, [spot]);

  useEffect(() => {
    if (!spot) {
      setArrowPath(null);
      return;
    }
    const id = setTimeout(computeArrow, 60);
    return () => clearTimeout(id);
  }, [spot, stepIndex, computeArrow]);

  return (
    <>
      {/* When the element hasn't been located yet, block interaction with a
          plain dark backdrop so the page isn't freely tappable during search */}
      {!spot && (
        <div
          aria-hidden="true"
          className="fixed inset-0 bg-black/65 backdrop-blur-[2px] z-[200]"
          style={{ pointerEvents: "all" }}
        />
      )}

      <TourSpotlight spot={spot} />

      {/* Dashed curved arrow from card → spotlight */}
      {arrowPath && (
        <svg
          aria-hidden="true"
          style={{
            position: "fixed",
            inset: 0,
            width: "100%",
            height: "100%",
            pointerEvents: "none",
            zIndex: 255,
          }}
        >
          <defs>
            <marker
              id="tour-arrow"
              markerWidth="7"
              markerHeight="7"
              refX="3.5"
              refY="3.5"
              orient="auto"
            >
              <circle
                cx="3.5"
                cy="3.5"
                r="2.5"
                fill="var(--color-primary)"
                opacity="0.75"
              />
            </marker>
          </defs>
          <path
            d={arrowPath}
            stroke="var(--color-primary)"
            strokeWidth="1.5"
            strokeDasharray="5 4"
            fill="none"
            opacity={0.6}
            markerEnd="url(#tour-arrow)"
          />
        </svg>
      )}

      {/* Mini floating card — draggable so users can move it to see the element */}
      <motion.div
        ref={cardRef}
        drag
        dragMomentum={false}
        dragElastic={0}
        onDrag={computeArrow}
        style={{
          position: "fixed",
          top: cardPosition?.top ?? 24,
          left: cardPosition?.left,
          right: cardPosition ? undefined : 24,
          width: "min(276px, calc(100vw - 32px))",
          minHeight: 220,
          maxHeight: "calc(100vh - 32px)",
          zIndex: 260,
          touchAction: "none",
        }}
        className="bg-surface border border-outline-variant/40 rounded-2xl shadow-[0_8px_40px_rgba(0,0,0,0.55)] overflow-y-auto flex flex-col cursor-grab active:cursor-grabbing"
      >
        {/* Drag handle bar */}
        <div className="flex justify-center pt-2.5 pb-0 shrink-0">
          <div className="w-8 h-[3px] rounded-full bg-outline-variant/40" />
        </div>

        {/* Card header */}
        <div className="px-4 pt-3 pb-2 flex items-start gap-3">
          <div className="w-8 h-8 rounded-xl bg-primary/12 border border-primary/20 flex items-center justify-center text-primary shrink-0">
            {getStepIcon(step.id, 16)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-mono text-[9px] text-on-surface-variant/50 uppercase tracking-wider mb-0.5">
              Step {stepIndex + 1} of {STEPS.length}
            </p>
            <p className="font-mono text-[12px] font-bold text-on-surface leading-snug">
              {step.title}
            </p>
          </div>
          {/* × close button — harder to accidentally hit than a bottom button */}
          <button
            onClick={onClose}
            title="Exit tour (Esc)"
            className="shrink-0 w-6 h-6 flex items-center justify-center rounded-lg text-on-surface-variant/40 hover:text-on-surface hover:bg-surface-container-high transition-colors"
          >
            <X size={12} />
          </button>
        </div>

        {/* Description */}
        <div className="px-4 pb-2 flex-1">
          <p className="font-mono text-[11px] text-on-surface-variant leading-relaxed">
            {step.description}
          </p>
        </div>

        {/* Hint — only shown once the spotlight is visible */}
        {spot && (
          <div className="px-4 pb-3 flex items-center gap-1.5">
            <MousePointerClick size={10} className="text-primary/60 shrink-0" />
            <span className="font-mono text-[10px] text-on-surface-variant/50">
              Interact with the highlighted element
            </span>
          </div>
        )}

        {/* Footer */}
        <div className="px-3 py-2.5 border-t border-outline-variant/20 flex items-center gap-1.5">
          {!isFirst && (
            <button
              onClick={onPrev}
              title="Previous step"
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg font-mono text-[11px] border border-outline-variant/30 text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors"
            >
              <ArrowLeft size={10} />
            </button>
          )}
          <button
            onClick={onShowList}
            title="Show guide list"
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg font-mono text-[11px] border border-outline-variant/30 text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors"
          >
            <List size={10} />
          </button>
          <button
            onClick={onNext}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg font-mono text-[11px] font-semibold bg-primary text-on-primary hover:brightness-110 transition-all"
          >
            {isLast ? (
              <>
                <CheckCircle2 size={11} /> Done
              </>
            ) : (
              <>
                Next <ArrowRight size={10} />
              </>
            )}
          </button>
        </div>
      </motion.div>
    </>
  );
};

// ─── Step Sidebar (left panel) ────────────────────────────────────────────────

interface TourSidebarProps {
  stepIndex: number;
  onGoToStep: (i: number) => void;
  onRestart: () => void;
}

const TourSidebar: React.FC<TourSidebarProps> = ({
  stepIndex,
  onGoToStep,
  onRestart,
}) => {
  const activeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    activeRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [stepIndex]);

  return (
    <div className="flex flex-col h-full w-full">
      {/* Panel header */}
      <div className="px-5 py-4 border-b border-outline-variant/20 shrink-0">
        <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-on-surface-variant/50 mb-0.5">
          App Tour
        </p>
        <p className="font-mono text-xs font-bold text-on-surface">
          {stepIndex + 1} / {STEPS.length} steps
        </p>
        {/* Progress bar */}
        <div className="mt-2.5 h-[3px] rounded-full bg-outline-variant/30 overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-300"
            style={{ width: `${((stepIndex + 1) / STEPS.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Step list */}
      <div className="overflow-y-auto flex-1 py-2">
        {STEPS.map((s, i) => (
          <React.Fragment key={s.id}>
            {SECTION_STARTS[i] && (
              <p className="px-4 pt-3 pb-1 font-mono text-[9px] uppercase tracking-[0.2em] text-on-surface-variant/40">
                {SECTION_STARTS[i]}
              </p>
            )}
            <button
              ref={i === stepIndex ? activeRef : undefined}
              onClick={() => onGoToStep(i)}
              className={`w-full text-left px-4 py-[6px] flex items-center gap-2.5 transition-colors ${getSidebarItemClass(i, stepIndex)}`}
            >
              {/* Status icon */}
              <span className="shrink-0 w-4 h-4 flex items-center justify-center">
                {i < stepIndex && (
                  <Check size={11} className="text-primary/70" />
                )}
                {i === stepIndex && (
                  <ChevronRight size={11} className="text-primary" />
                )}
                {i > stepIndex && s.awaitAction && (
                  <MousePointerClick
                    size={9}
                    className="text-on-surface-variant/35"
                  />
                )}
              </span>
              <span
                className={`font-mono text-[11px] leading-snug truncate ${i === stepIndex ? "font-semibold" : ""}`}
              >
                {s.title}
              </span>
            </button>
          </React.Fragment>
        ))}
        <div className="h-2" />
      </div>

      {/* Restart button */}
      <div className="px-4 py-3 border-t border-outline-variant/20 shrink-0">
        <button
          onClick={onRestart}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg font-mono text-[11px] text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high border border-outline-variant/30 transition-colors"
        >
          <RefreshCw size={12} />
          Restart guide
        </button>
      </div>
    </div>
  );
};

// ─── Right Panel Content ──────────────────────────────────────────────────────

interface TourContentProps {
  step: TourStep;
  stepIndex: number;
  isFirst: boolean;
  isLast: boolean;
  onClose: () => void;
  onNext: () => void;
  onPrev: () => void;
  onShowMe: () => void;
  onGoToStep: (i: number) => void;
  onRestart: () => void;
}

const TourContent: React.FC<TourContentProps> = ({
  step,
  stepIndex,
  isFirst,
  isLast,
  onClose,
  onNext,
  onPrev,
  onShowMe,
  onGoToStep,
  onRestart,
}) => {
  // Mobile-only toggle: show the full step list instead of the content area
  const [showList, setShowList] = useState(false);
  useEffect(() => {
    setShowList(false);
  }, [stepIndex]);

  const handleGoToStep = (i: number) => {
    onGoToStep(i);
    setShowList(false);
  };

  return (
    <div className="flex flex-col flex-1 min-w-0 h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-5 sm:px-7 py-4 border-b border-outline-variant/15 shrink-0">
        {showList ? (
          <button
            onClick={() => setShowList(false)}
            className="flex items-center gap-1.5 font-mono text-[11px] text-on-surface-variant hover:text-on-surface transition-colors"
          >
            <ArrowLeft size={12} /> Back
          </button>
        ) : (
          <span className="font-mono text-[11px] text-on-surface-variant">
            Step {stepIndex + 1} of {STEPS.length}
          </span>
        )}
        <div className="flex items-center gap-1">
          {/* Step list toggle — mobile only (desktop has the left sidebar) */}
          {!showList && (
            <button
              onClick={() => setShowList(true)}
              title="Show all steps"
              className="sm:hidden w-7 h-7 rounded flex items-center justify-center text-on-surface-variant/60 hover:text-on-surface hover:bg-surface-container-high transition-colors"
            >
              <List size={14} />
            </button>
          )}
          <button
            onClick={onClose}
            title="Close tour (Esc)"
            className="w-7 h-7 rounded flex items-center justify-center text-on-surface-variant/60 hover:text-on-surface hover:bg-surface-container-high transition-colors"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Step list (mobile only, toggled via List button) */}
      {showList ? (
        <div className="flex-1 overflow-hidden">
          <TourSidebar
            stepIndex={stepIndex}
            onGoToStep={handleGoToStep}
            onRestart={onRestart}
          />
        </div>
      ) : (
        <>
          {/* Scrollable step content */}
          <div className="overflow-y-auto flex-1">
            <AnimatePresence mode="wait">
              <motion.div
                key={step.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="px-7 py-6 flex flex-col gap-5"
              >
                {/* Icon */}
                <div className="flex justify-center">
                  <div className="w-[72px] h-[72px] rounded-2xl bg-primary/12 border border-primary/20 flex items-center justify-center text-primary shadow-sm">
                    {getStepIcon(step.id)}
                  </div>
                </div>

                {/* Title + description */}
                <div className="text-center">
                  <h2 className="font-mono font-bold text-[17px] text-on-surface mb-2 leading-snug">
                    {step.title}
                  </h2>
                  <p className="font-mono text-[12.5px] text-on-surface-variant leading-relaxed">
                    {step.description}
                  </p>
                </div>

                {/* Keyboard shortcut hint */}
                {step.action && (
                  <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-primary/8 border border-primary/18">
                    <Keyboard size={14} className="text-primary shrink-0" />
                    <span className="font-mono text-[11px] text-on-surface">
                      {step.action}
                    </span>
                  </div>
                )}

                {/* Show me — re-enter reveal mode when user came back to the modal */}
                {step.targetSelector && (
                  <button
                    onClick={onShowMe}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-mono text-sm font-bold bg-primary text-on-primary hover:brightness-110 active:scale-95 transition-all shadow-md"
                  >
                    <MousePointerClick size={16} /> Show me
                  </button>
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Footer navigation */}
          <div className="px-5 sm:px-7 py-4 border-t border-outline-variant/15 shrink-0 flex items-center gap-3">
            {!isFirst ? (
              <button
                onClick={onPrev}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg font-mono text-xs text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high border border-outline-variant/35 transition-colors"
              >
                <ArrowLeft size={12} /> Back
              </button>
            ) : (
              <span />
            )}

            <span className="flex-1 text-center font-mono text-[10px] text-on-surface-variant/40 hidden sm:block">
              Navigate with ← → keys
            </span>

            <TourNextButton
              isLast={isLast}
              stepIndex={stepIndex}
              onClick={onNext}
            />
          </div>
        </>
      )}
    </div>
  );
};

const TourNextButton: React.FC<{
  isLast: boolean;
  stepIndex: number;
  onClick: () => void;
}> = ({ isLast, stepIndex, onClick }) => {
  const nextTitle = !isLast ? STEPS[stepIndex + 1]?.title : undefined;
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 px-4 py-2 rounded-lg font-mono text-xs font-semibold bg-primary text-on-primary hover:brightness-110 active:scale-95 transition-all shadow-sm max-w-[220px] truncate"
    >
      {isLast ? (
        <>
          <CheckCircle2 size={13} /> Done
        </>
      ) : (
        <>
          <span className="truncate">Next: {nextTitle}</span>{" "}
          <ArrowRight size={12} className="shrink-0" />
        </>
      )}
    </button>
  );
};

// ─── Custom Hook ──────────────────────────────────────────────────────────────

function useTourLogic(
  onClose: () => void,
  onTabChange: (tab: ActiveTab) => void,
  initialStep: number,
  onStepChange: (step: number) => void,
  isPaused: boolean,
) {
  const [stepIndex, setStepIndex] = useState(() =>
    initialStep >= 0 && initialStep < STEPS.length ? initialStep : 0,
  );
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  // true when resolveWithRetry exhausted all attempts without finding a visible element
  const [elementNotFound, setElementNotFound] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const step = STEPS[stepIndex];
  const isFirst = stepIndex === 0;
  const isLast = stepIndex === STEPS.length - 1;

  useEffect(() => {
    onStepChange(stepIndex);
  }, [stepIndex]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (step.tab) onTabChange(step.tab);
    setTargetRect(null);
    setElementNotFound(false);
    return resolveWithRetry(step.targetSelector, setTargetRect, () =>
      setElementNotFound(true),
    );
  }, [stepIndex]); // eslint-disable-line react-hooks/exhaustive-deps

  // Re-measure on scroll/resize so spotlight tracks visible element even when
  // user scrolls (rAF-throttled to avoid layout thrashing).
  useEffect(() => {
    if (!step.targetSelector) return;
    let rafId: number;
    const track = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        const el = findVisible(step.targetSelector!);
        if (el) setTargetRect(el.getBoundingClientRect());
      });
    };
    window.addEventListener("scroll", track, true);
    window.addEventListener("resize", track);
    return () => {
      window.removeEventListener("scroll", track, true);
      window.removeEventListener("resize", track);
      cancelAnimationFrame(rafId);
    };
  }, [step.targetSelector]);

  useEffect(() => {
    if (isPaused || !step.awaitAction || !step.targetSelector) return;
    return attachClickAdvance(step.targetSelector, setStepIndex);
  }, [stepIndex, step.awaitAction, step.targetSelector, isPaused]);

  useEffect(() => {
    if (isPaused) return;
    return addListener(
      window,
      "keydown",
      makeKeyHandler(isFirst, isLast, onClose, setStepIndex),
    );
  }, [isFirst, isLast, onClose, step.awaitAction, isPaused]);

  const handleNext = useCallback(() => {
    if (isLast) {
      onClose();
      return;
    }
    setTargetRect(null);
    setStepIndex((i) => Math.min(i + 1, STEPS.length - 1));
  }, [isLast, onClose]);

  const handlePrev = useCallback(() => {
    if (isFirst) return;
    setTargetRect(null);
    setStepIndex((i) => Math.max(i - 1, 0));
  }, [isFirst]);

  return {
    step,
    stepIndex,
    isFirst,
    isLast,
    cardRef,
    targetRect,
    elementNotFound,
    handleNext,
    handlePrev,
    setStepIndex,
  };
}

// ─── Keyframes ────────────────────────────────────────────────────────────────

const KEYFRAMES = `
  @keyframes tour-pulse-strong {
    0%,100% { box-shadow:0 0 0 9999px rgba(0,0,0,.78),0 0 0 3px var(--color-primary); }
    50%      { box-shadow:0 0 0 9999px rgba(0,0,0,.78),0 0 0 9px color-mix(in srgb,var(--color-primary) 35%,transparent); }
  }
`;

// ─── Component ────────────────────────────────────────────────────────────────

interface TourOverlayProps {
  onClose: () => void;
  onTabChange: (tab: ActiveTab) => void;
  initialStep: number;
  onStepChange: (step: number) => void;
}

export const TourOverlay: React.FC<TourOverlayProps> = ({
  onClose,
  onTabChange,
  initialStep,
  onStepChange,
}) => {
  const [isDashboardCustomizePaused, setIsDashboardCustomizePaused] =
    useState(false);
  const [taskSetupStage, setTaskSetupStage] = useState<
    "guide" | "tasks" | null
  >(null);
  const isPaused = isDashboardCustomizePaused || taskSetupStage !== null;
  const {
    step,
    stepIndex,
    isFirst,
    isLast,
    cardRef,
    targetRect,
    elementNotFound,
    handleNext,
    handlePrev,
    setStepIndex,
  } = useTourLogic(onClose, onTabChange, initialStep, onStepChange, isPaused);

  useEffect(() => {
    const start = () => setTaskSetupStage("guide");
    const ready = () => setTaskSetupStage("tasks");
    const cancel = () => setTaskSetupStage(null);
    window.addEventListener("mousi9ti-task-setup-start", start);
    window.addEventListener("mousi9ti-task-setup-ready", ready);
    window.addEventListener("mousi9ti-task-setup-cancel", cancel);
    return () => {
      window.removeEventListener("mousi9ti-task-setup-start", start);
      window.removeEventListener("mousi9ti-task-setup-ready", ready);
      window.removeEventListener("mousi9ti-task-setup-cancel", cancel);
    };
  }, []);

  useEffect(() => {
    const pause = () => {
      if (step.id === "dashboard-customize") {
        setIsDashboardCustomizePaused(true);
      }
    };
    const resume = () => setIsDashboardCustomizePaused(false);
    window.addEventListener("mousi9ti-dashboard-customize-start", pause);
    window.addEventListener("mousi9ti-dashboard-customize-end", resume);
    return () => {
      window.removeEventListener("mousi9ti-dashboard-customize-start", pause);
      window.removeEventListener("mousi9ti-dashboard-customize-end", resume);
    };
  }, [step.id]);

  // userOpenedModal: true when the user explicitly clicked "Back to guide"
  // from reveal mode. Resets to false whenever the step changes.
  const [userOpenedModal, setUserOpenedModal] = useState(false);
  useEffect(() => {
    setUserOpenedModal(false);
  }, [stepIndex]);

  // Reveal mode: step has a target AND the element was found visible in the DOM.
  // elementNotFound flips true after ~960ms of failed retries (e.g. desktop
  // sidebar elements on mobile), falling back to the full centered modal.
  const revealMode =
    !!step.targetSelector && !userOpenedModal && !elementNotFound;

  // Focus trap for the full modal (non-reveal mode)
  useEffect(() => {
    if (isPaused || revealMode || !cardRef.current) return;
    const container = cardRef.current;
    const focusableSelector =
      'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
    const getFocusable = () =>
      Array.from(container.querySelectorAll<HTMLElement>(focusableSelector));
    getFocusable()[0]?.focus();
    const handler = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const all = getFocusable();
      const first = all[0];
      const last = all[all.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last?.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [revealMode, stepIndex, isPaused]); // eslint-disable-line react-hooks/exhaustive-deps

  if (taskSetupStage) {
    return taskSetupStage === "tasks" ? (
      <div
        role="status"
        className="fixed bottom-20 lg:bottom-4 left-1/2 z-[260] -translate-x-1/2 flex w-max max-w-[calc(100%-2rem)] items-center gap-3 rounded-full border border-outline-variant/40 bg-surface px-4 py-2 font-mono text-xs text-on-surface shadow-lg"
      >
        <span className="min-w-0">
          Add or edit your tasks, then click <strong>Resume tour</strong> to
          continue.
        </span>
        <button
          type="button"
          onClick={() => {
            setTaskSetupStage(null);
            handleNext();
          }}
          className="inline-flex shrink-0 items-center gap-1 font-semibold text-primary hover:underline"
        >
          Resume tour <ArrowRight size={14} />
        </button>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close tour"
          title="Close tour"
          className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-on-surface-variant transition-colors hover:bg-surface-container-high hover:text-on-surface"
        >
          <X size={14} />
        </button>
      </div>
    ) : null;
  }

  if (isDashboardCustomizePaused) {
    return (
      <div className="fixed bottom-4 left-1/2 z-[260] -translate-x-1/2 rounded-full border border-outline-variant/40 bg-surface px-4 py-2 font-mono text-xs text-on-surface shadow-lg">
        Customize your dashboard, then click <strong>Done</strong> to continue
        the tour.
      </div>
    );
  }

  const spot = targetRect
    ? {
        top: targetRect.top - SP_PAD,
        left: targetRect.left - SP_PAD,
        width: targetRect.width + SP_PAD * 2,
        height: targetRect.height + SP_PAD * 2,
      }
    : null;

  const handleRestart = () => {
    setStepIndex(0);
    setUserOpenedModal(false);
  };

  if (revealMode) {
    return (
      <>
        <RevealOverlay
          spot={spot}
          step={step}
          stepIndex={stepIndex}
          isFirst={isFirst}
          isLast={isLast}
          onPrev={handlePrev}
          onNext={handleNext}
          onShowList={() => setUserOpenedModal(true)}
          onClose={onClose}
        />
        <style>{KEYFRAMES}</style>
      </>
    );
  }

  return (
    <>
      {/* Dark backdrop */}
      <div
        aria-hidden="true"
        className="fixed inset-0 bg-black/65 backdrop-blur-[2px] z-[200]"
        style={{ pointerEvents: "all" }}
      />

      {/* Centered modal — full-screen on mobile, constrained card on desktop */}
      <div
        className="fixed inset-0 z-[210] flex items-end sm:items-center justify-center sm:p-4"
        style={{ pointerEvents: "none" }}
      >
        <motion.div
          ref={cardRef}
          role="dialog"
          aria-modal="true"
          aria-label="App tour"
          initial={{ opacity: 0, scale: 0.96, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 8 }}
          transition={{ type: "spring", stiffness: 300, damping: 28 }}
          style={{ pointerEvents: "all", maxWidth: 680, width: "100%" }}
          className="bg-surface border-0 sm:border border-outline-variant/40 rounded-t-3xl sm:rounded-3xl shadow-[0_32px_96px_rgba(0,0,0,0.7)] overflow-hidden flex h-[85svh] sm:h-[min(540px,calc(100vh-2rem))]"
        >
          {/* Left sidebar — step list (desktop only) */}
          <div
            style={{ width: 220, minWidth: 220 }}
            className="border-r border-outline-variant/20 bg-surface-container/50 hidden sm:flex h-full overflow-hidden"
          >
            <TourSidebar
              stepIndex={stepIndex}
              onGoToStep={setStepIndex}
              onRestart={handleRestart}
            />
          </div>

          {/* Right content panel */}
          <TourContent
            step={step}
            stepIndex={stepIndex}
            isFirst={isFirst}
            isLast={isLast}
            onClose={onClose}
            onNext={handleNext}
            onPrev={handlePrev}
            onShowMe={() => setUserOpenedModal(false)}
            onGoToStep={setStepIndex}
            onRestart={handleRestart}
          />
        </motion.div>
      </div>

      <style>{KEYFRAMES}</style>
    </>
  );
};
