import React, { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  X, ArrowRight, ArrowLeft, CheckCircle2, Keyboard, MousePointerClick,
  ChevronRight, Check, RefreshCw, List, Plus, Piano,
  BookOpen, LayoutDashboard, Timer, Clock, Guitar, Play, Flame,
  Music, Music2, Layers, Settings2, Compass, BarChart3, Search, Trophy,
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
  { id: "welcome",              title: "Welcome to Mousi9ti",      description: "Your practice studio for guitar and piano. This tour walks through every section — about 3 minutes." },
  { id: "sidebar",              title: "Navigation",                description: "All 6 sections live in the sidebar. Click any item or press 1–6 on your keyboard to switch instantly.", targetSelector: "[data-tour='sidebar-nav']", tab: "dashboard" },
  { id: "metronome",            title: "Metronome",                 description: "Set BPM, time signature, subdivision, and click sound. It keeps running globally even when you switch pages.", targetSelector: "[data-dashboard-widget='metronome']", tab: "dashboard", action: "Press Space to start / stop" },
  { id: "timer",                title: "Practice Timer",            description: "Countdown timer with one-tap presets. Link it to the metronome so it auto-stops when time's up.", targetSelector: "[data-dashboard-widget='timer']", tab: "dashboard" },
  { id: "drill",                title: "Random Note Drill",         description: "A random note appears — find it on the fretboard. Builds note recognition and position memory over time.", targetSelector: "[data-dashboard-widget='random-drill']", tab: "dashboard", action: "Press N for the next note" },
  { id: "session",              title: "Practice Session",          description: "Start a session to log your time. Ending it saves the session and counts toward your daily streak.", targetSelector: "[data-dashboard-widget='session']", tab: "dashboard" },
  { id: "instruments-widget",   title: "Fretboard & Tuning",        description: "Switch between Guitar, Piano, or Both views. Change the tuning directly on the fretboard — every note updates instantly.", targetSelector: "[data-dashboard-widget='instruments']", tab: "dashboard" },
  { id: "chord-widget",         title: "Chord Display",             description: "The chord selector widget shows the current chord diagram and piano voicing side by side. Tap any diagram to hear it.", targetSelector: "[data-dashboard-widget='chord-selector']", tab: "dashboard" },
  { id: "streak",               title: "Practice Streak",           description: "Your daily streak with a 2-day grace period — one missed day won't reset the counter.", targetSelector: "[data-tour='sidebar-streak']", tab: "dashboard" },
  { id: "dashboard-customize",  title: "Customize Dashboard",       description: "Click Customize to rearrange or hide any widget by dragging. Hit Reset to restore the default layout. Make the dashboard yours.", targetSelector: "[data-tour='dashboard-customize']", tab: "dashboard" },
  { id: "go-scales",            title: "Open Scales",               description: "Click SCALES in the sidebar to explore the scale library.", targetSelector: "[data-tour='nav-item-scales']", tab: "dashboard", awaitAction: true },
  { id: "scales-panel",         title: "Scale Explorer",            description: "Pick any root note and scale type. Toggle note names, degrees, or intervals — then play the scale with the arrow buttons.", targetSelector: "[data-tour='scales-panel']", tab: "scales" },
  { id: "scales-fretboard",     title: "Fretboard & Tuning",        description: "The fretboard updates live as you change scale or root. Adjust tuning and fret count here. Switch to Piano view or show both instruments at once.", targetSelector: "[data-tour='scales-fretboard']", tab: "scales" },
  { id: "go-chords",            title: "Open Chords",               description: "Click CHORDS in the sidebar to browse chord voicings.", targetSelector: "[data-tour='nav-item-chords']", tab: "scales", awaitAction: true },
  { id: "chords-filters",       title: "Chord Library",             description: "Pick a root note and chord type. The diagram, piano view, and sheet notation update instantly. Tap Play to hear any voicing.", targetSelector: "[data-tour='chords-filters']", tab: "chords" },
  { id: "chords-voicing",       title: "Guitar & Piano Voicings",   description: "Browse all guitar fingering positions for the chord. Click any diagram to hear it played. The piano voicing is shown below.", targetSelector: "[data-tour='chords-voicing']", tab: "chords" },
  { id: "go-builder",           title: "Open Builder",              description: "Click BUILDER in the sidebar to open the chord progression builder.", targetSelector: "[data-tour='nav-item-builder']", tab: "chords", awaitAction: true },
  { id: "builder-controls",     title: "Playback Controls",         description: "Choose your instrument, set tempo, and add reverb. Hit Play to loop your full chord progression with real instrument audio.", targetSelector: "[data-tour='builder-controls']", tab: "builder" },
  { id: "builder-queue",        title: "Chord Queue",               description: "Your chord progression lives here. Set each chord's duration and strumming pattern. Load a preset or save your own.", targetSelector: "[data-tour='builder-queue']", tab: "builder" },
  { id: "builder-add",          title: "Add Chords to Queue",       description: "Search for any chord, pick a voicing, then hit Add to Queue. Build progressions like I–V–vi–IV in seconds.", targetSelector: "[data-tour='builder-add']", tab: "builder" },
  { id: "go-tools",             title: "Open Tools",                description: "Click TOOLS in the sidebar for the Circle of Fifths, tuner, and ear trainer.", targetSelector: "[data-tour='nav-item-tools']", tab: "builder", awaitAction: true },
  { id: "tools-tabs",           title: "Theory Tools",              description: "Switch between Circle of Fifths, Ear Trainer, Tuner, Metronome, Timer, and Custom Chord Builder using these tabs.", targetSelector: "[data-tour='tools-tabs']", tab: "tools" },
  { id: "circle-fifths",        title: "Circle of Fifths",          description: "Click any key to see its related chords. The interactive wheel shows key relationships, chord qualities, and relative minors at a glance.", targetSelector: "[data-tour='circle-of-fifths']", tab: "tools" },
  { id: "go-stats",             title: "Open Stats",                description: "Click STATS to view your session history, BPM progression, and streak calendar.", targetSelector: "[data-tour='nav-item-stats']", tab: "tools", awaitAction: true },
  { id: "stats-metrics",        title: "Practice Analytics",        description: "Total time logged, current streak, longest streak, and peak BPM. Charts below show your daily minutes and BPM progression over time.", targetSelector: "[data-tour='stats-metrics']", tab: "stats" },
  { id: "search",               title: "Global Search",             description: "Search any scale, chord, or exercise from anywhere in the app. Try \"C minor\" or \"maj7\" to jump straight to it.", targetSelector: "[data-tour='search-bar']", tab: "stats" },
  { id: "done",                 title: "You're all set!",           description: "Everything is ready. Restart this tour anytime via Settings → Restart Tour.", tab: "dashboard" },
];

// ─── Constants ────────────────────────────────────────────────────────────────

const SP_PAD = 10;

const SECTION_STARTS: Record<number, string> = {
  0: "Intro", 1: "Dashboard", 10: "Scales", 13: "Chords",
  16: "Builder", 20: "Tools", 23: "Stats", 26: "Finish",
};

// ─── Step Icons ───────────────────────────────────────────────────────────────

function getSidebarItemClass(i: number, stepIndex: number): string {
  if (i === stepIndex) return "bg-primary/12 text-on-surface";
  if (i < stepIndex) return "text-on-surface-variant/50 hover:bg-surface-container-high hover:text-on-surface";
  return "text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface";
}

function getStepIcon(id: string, size = 34): React.ReactNode {
  const S = size;
  const map: Record<string, React.ReactNode> = {
    welcome:            <BookOpen size={S} />,
    sidebar:            <LayoutDashboard size={S} />,
    metronome:          <Timer size={S} />,
    timer:              <Clock size={S} />,
    drill:              <Guitar size={S} />,
    session:            <Play size={S} />,
    streak:             <Flame size={S} />,
    "dashboard-customize": <Settings2 size={S} />,
    "go-scales":           <Music size={S} />,
    "scales-panel":        <Music2 size={S} />,
    "scales-fretboard":    <Guitar size={S} />,
    "go-chords":           <Layers size={S} />,
    "chords-filters":      <Layers size={S} />,
    "chords-voicing":      <Layers size={S} />,
    "go-builder":          <Settings2 size={S} />,
    "builder-controls":    <Settings2 size={S} />,
    "builder-queue":       <Settings2 size={S} />,
    "builder-add":         <Plus size={S} />,
    "go-tools":            <Compass size={S} />,
    "tools-tabs":          <Compass size={S} />,
    "circle-fifths":       <Compass size={S} />,
    "go-stats":            <BarChart3 size={S} />,
    "stats-metrics":       <BarChart3 size={S} />,
    "instruments-widget":  <Guitar size={S} />,
    "chord-widget":        <Piano size={S} />,
    search:                <Search size={S} />,
    done:                  <Trophy size={S} />,
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
  if (!selector) { setRect(null); return () => {}; }
  let cancelled = false;
  let tid: ReturnType<typeof setTimeout>;
  let attempts = 0;

  const tryOnce = () => {
    if (cancelled) return;
    const el = findVisible(selector);
    if (el) {
      el.scrollIntoView({ behavior: "instant", block: "nearest" });
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
  return () => { cancelled = true; clearTimeout(tid); };
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
  elements.forEach(el => el.addEventListener("click", handler));
  return () => elements.forEach(el => el.removeEventListener("click", handler));
}

function makeKeyHandler(
  isFirst: boolean,
  isLast: boolean,
  onClose: () => void,
  setStep: React.Dispatch<React.SetStateAction<number>>,
): EventListener {
  return ((e: KeyboardEvent) => {
    if (e.key === "Escape") { onClose(); return; }
    if (e.key === "ArrowRight" && !isLast) setStep((i) => i + 1);
    if (e.key === "ArrowLeft" && !isFirst) setStep((i) => i - 1);
  }) as EventListener;
}

// ─── Spotlight (used in reveal mode) ─────────────────────────────────────────

interface SpotGeometry { top: number; left: number; width: number; height: number; }
interface TourSpotlightProps { spot: SpotGeometry | null; }

const TourSpotlight: React.FC<TourSpotlightProps> = ({ spot }) => {
  if (!spot) return null;
  return (
    <div
      style={{
        position: "fixed", top: spot.top, left: spot.left,
        width: spot.width, height: spot.height, borderRadius: 12,
        boxShadow: "0 0 0 9999px rgba(0,0,0,0.78)",
        border: "2px solid var(--color-primary)",
        zIndex: 250, pointerEvents: "none",
        transition: "top .28s ease,left .28s ease,width .28s ease,height .28s ease",
        animation: "tour-pulse-strong 1.1s ease-in-out infinite",
      }}
    >
      <div
        style={{ position: "absolute", bottom: -34, left: "50%", transform: "translateX(-50%)", whiteSpace: "nowrap" }}
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary text-on-primary text-[10px] font-mono font-bold tracking-wide shadow-lg"
      >
        <MousePointerClick size={10} /> Click to continue
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

const RevealOverlay: React.FC<RevealOverlayProps> = ({ spot, step, stepIndex, isFirst, isLast, onPrev, onNext, onShowList, onClose }) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [arrowPath, setArrowPath] = useState<string | null>(null);

  const computeArrow = useCallback(() => {
    if (!spot || !cardRef.current) { setArrowPath(null); return; }
    const r = cardRef.current.getBoundingClientRect();
    const cx = r.left;
    const cy = r.top + r.height / 2;
    const sx = spot.left + spot.width / 2;
    const sy = spot.top + spot.height / 2;
    const cpx = (cx + sx) / 2;
    const cpy = Math.min(cy, sy) - 70;
    setArrowPath(`M ${cx} ${cy} Q ${cpx} ${cpy} ${sx} ${sy}`);
  }, [spot]);

  useEffect(() => {
    if (!spot) { setArrowPath(null); return; }
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
          style={{ position: "fixed", inset: 0, width: "100%", height: "100%", pointerEvents: "none", zIndex: 255 }}
        >
          <defs>
            <marker id="tour-arrow" markerWidth="7" markerHeight="7" refX="3.5" refY="3.5" orient="auto">
              <circle cx="3.5" cy="3.5" r="2.5" fill="var(--color-primary)" opacity="0.75" />
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
        style={{ position: "fixed", top: 24, right: 24, width: 276, minHeight: 220, zIndex: 260, touchAction: "none" }}
        className="bg-surface border border-outline-variant/40 rounded-2xl shadow-[0_8px_40px_rgba(0,0,0,0.55)] overflow-hidden flex flex-col cursor-grab active:cursor-grabbing"
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
            <p className="font-mono text-[12px] font-bold text-on-surface leading-snug">{step.title}</p>
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
          <p className="font-mono text-[11px] text-on-surface-variant leading-relaxed">{step.description}</p>
        </div>

        {/* Hint — only shown once the spotlight is visible */}
        {spot && (
          <div className="px-4 pb-3 flex items-center gap-1.5">
            <MousePointerClick size={10} className="text-primary/60 shrink-0" />
            <span className="font-mono text-[10px] text-on-surface-variant/50">Interact with the highlighted element</span>
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
            {isLast ? <><CheckCircle2 size={11} /> Done</> : <>Next <ArrowRight size={10} /></>}
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

const TourSidebar: React.FC<TourSidebarProps> = ({ stepIndex, onGoToStep, onRestart }) => {
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
                {i < stepIndex && <Check size={11} className="text-primary/70" />}
                {i === stepIndex && <ChevronRight size={11} className="text-primary" />}
                {i > stepIndex && s.awaitAction && <MousePointerClick size={9} className="text-on-surface-variant/35" />}
              </span>
              <span className={`font-mono text-[11px] leading-snug truncate ${i === stepIndex ? "font-semibold" : ""}`}>
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
  step, stepIndex, isFirst, isLast, onClose, onNext, onPrev, onShowMe, onGoToStep, onRestart,
}) => {
  // Mobile-only toggle: show the full step list instead of the content area
  const [showList, setShowList] = useState(false);
  useEffect(() => { setShowList(false); }, [stepIndex]);

  const handleGoToStep = (i: number) => { onGoToStep(i); setShowList(false); };

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
          <TourSidebar stepIndex={stepIndex} onGoToStep={handleGoToStep} onRestart={onRestart} />
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
                    <span className="font-mono text-[11px] text-on-surface">{step.action}</span>
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
            ) : <span />}

            <span className="flex-1 text-center font-mono text-[10px] text-on-surface-variant/40 hidden sm:block">
              Navigate with ← → keys
            </span>

            <TourNextButton isLast={isLast} stepIndex={stepIndex} onClick={onNext} />
          </div>
        </>
      )}
    </div>
  );
};

const TourNextButton: React.FC<{ isLast: boolean; stepIndex: number; onClick: () => void }> = ({ isLast, stepIndex, onClick }) => {
  const nextTitle = !isLast ? STEPS[stepIndex + 1]?.title : undefined;
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 px-4 py-2 rounded-lg font-mono text-xs font-semibold bg-primary text-on-primary hover:brightness-110 active:scale-95 transition-all shadow-sm max-w-[220px] truncate"
    >
      {isLast
        ? <><CheckCircle2 size={13} /> Done</>
        : <><span className="truncate">Next: {nextTitle}</span> <ArrowRight size={12} className="shrink-0" /></>
      }
    </button>
  );
};

// ─── Custom Hook ──────────────────────────────────────────────────────────────

function useTourLogic(
  onClose: () => void,
  onTabChange: (tab: ActiveTab) => void,
  initialStep: number,
  onStepChange: (step: number) => void,
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
    return resolveWithRetry(
      step.targetSelector,
      setTargetRect,
      () => setElementNotFound(true),
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
    if (!step.awaitAction || !step.targetSelector) return;
    return attachClickAdvance(step.targetSelector, setStepIndex);
  }, [stepIndex, step.awaitAction, step.targetSelector]);

  useEffect(
    () => addListener(window, "keydown", makeKeyHandler(isFirst, isLast, onClose, setStepIndex)),
    [isFirst, isLast, onClose, step.awaitAction],
  );

  const handleNext = useCallback(() => {
    if (isLast) { onClose(); return; }
    setTargetRect(null);
    setStepIndex(i => Math.min(i + 1, STEPS.length - 1));
  }, [isLast, onClose]);

  const handlePrev = useCallback(() => {
    if (isFirst) return;
    setTargetRect(null);
    setStepIndex(i => Math.max(i - 1, 0));
  }, [isFirst]);

  return { step, stepIndex, isFirst, isLast, cardRef, targetRect, elementNotFound, handleNext, handlePrev, setStepIndex };
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

export const TourOverlay: React.FC<TourOverlayProps> = ({ onClose, onTabChange, initialStep, onStepChange }) => {
  const { step, stepIndex, isFirst, isLast, cardRef, targetRect, elementNotFound, handleNext, handlePrev, setStepIndex } =
    useTourLogic(onClose, onTabChange, initialStep, onStepChange);

  // userOpenedModal: true when the user explicitly clicked "Back to guide"
  // from reveal mode. Resets to false whenever the step changes.
  const [userOpenedModal, setUserOpenedModal] = useState(false);
  useEffect(() => { setUserOpenedModal(false); }, [stepIndex]);

  // Reveal mode: step has a target AND the element was found visible in the DOM.
  // elementNotFound flips true after ~960ms of failed retries (e.g. desktop
  // sidebar elements on mobile), falling back to the full centered modal.
  const revealMode = !!step.targetSelector && !userOpenedModal && !elementNotFound;

  // Focus trap for the full modal (non-reveal mode)
  useEffect(() => {
    if (revealMode || !cardRef.current) return;
    const container = cardRef.current;
    const focusableSelector = 'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
    const getFocusable = () => Array.from(container.querySelectorAll<HTMLElement>(focusableSelector));
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
  }, [revealMode, stepIndex]); // eslint-disable-line react-hooks/exhaustive-deps

  const spot = targetRect
    ? { top: targetRect.top - SP_PAD, left: targetRect.left - SP_PAD, width: targetRect.width + SP_PAD * 2, height: targetRect.height + SP_PAD * 2 }
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
          <div style={{ width: 220, minWidth: 220 }} className="border-r border-outline-variant/20 bg-surface-container/50 hidden sm:flex h-full overflow-hidden">
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
