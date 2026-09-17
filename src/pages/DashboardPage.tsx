import React, { useState, useMemo, useEffect, useRef } from "react";
import {
  NoteDisplayMode,
  NoteName,
  ScaleDefinition,
  StreakData,
  Tuning,
  AppSettings,
  DashboardWidgetId,
  DashboardWidgetLayout,
  DashboardLayoutData,
  DashboardRow,
} from "../types";
import { Metronome } from "../components/Metronome";
import { RandomDrill } from "../components/RandomDrill";
import { SessionWidget } from "../components/SessionWidget";
import { TimerWidget } from "../components/TimerWidget";
import { PracticeTasksWidget } from "../components/PracticeTasksWidget";
import { ChordSelectorWidget } from "../components/ChordSelectorWidget";
import { Fretboard } from "../components/Fretboard";
import { PianoKeyboard } from "../components/PianoKeyboard";
import {
  SCALES_DATABASE,
  ALL_ROOT_NOTES,
  GUITAR_TUNINGS,
} from "../data/musicTheory";
import {
  Guitar,
  Piano,
  Layers,
  Sparkles,
  ChevronDown,
  X,
  Search,
  Check,
  GripVertical,
  RotateCcw,
  Settings2,
  Trash2,
} from "lucide-react";
import { useTimer } from "../lib/useTimer";
import { getSavedDashboardLayout, saveDashboardLayout } from "../lib/storage";

const DEFAULT_WIDGET_LAYOUT: DashboardWidgetLayout[] = [
  { id: "metronome", title: "Metronome" },
  { id: "timer", title: "Practice Timer" },
  { id: "random-drill", title: "Random Note Drill" },
  { id: "session", title: "Practice Streak" },
  { id: "practice-tasks", title: "Daily Practice Goals" },
  { id: "instruments", title: "Instruments" },
  { id: "chord-selector", title: "Chord Selector" },
];

type DashboardDropTarget = {
  id: DashboardWidgetId;
  position: "before" | "after";
  axis: "horizontal" | "vertical";
};

interface DashboardWidgetProps {
  widget: DashboardWidgetLayout;
  editMode: boolean;
  isDragging: boolean;
  insertionPosition: "before" | "after" | null;
  insertionAxis: "horizontal" | "vertical" | null;
  onPointerStart: (id: DashboardWidgetId) => void;
  onKeyboardMove: (id: DashboardWidgetId, direction: -1 | 1) => void;
  onRemove: (id: DashboardWidgetId) => void;
  children: React.ReactNode;
}

const DashboardWidget: React.FC<DashboardWidgetProps> = ({
  widget,
  editMode,
  isDragging,
  insertionPosition,
  insertionAxis,
  onPointerStart,
  onKeyboardMove,
  onRemove,
  children,
}) => (
  <section
    draggable={false}
    data-dashboard-widget={widget.id}
    className={`relative flex min-w-0 flex-1 flex-col transition-[transform,opacity] duration-200 ease-out ${editMode ? "rounded-xl" : ""} ${isDragging ? "scale-[1.02] opacity-60 shadow-2xl" : ""}`}
  >
    {insertionPosition === "before" && insertionAxis === "vertical" && (
      <span className="pointer-events-none absolute -top-3 left-1 right-1 z-10 h-1.5 rounded-full bg-primary shadow-[0_0_8px_var(--color-primary)]" />
    )}
    {insertionPosition === "after" && insertionAxis === "vertical" && (
      <span className="pointer-events-none absolute -bottom-3 left-1 right-1 z-10 h-1.5 rounded-full bg-primary shadow-[0_0_8px_var(--color-primary)]" />
    )}
    {insertionPosition === "before" && insertionAxis === "horizontal" && (
      <span className="pointer-events-none absolute -left-3 top-1 bottom-1 z-10 w-1.5 rounded-full bg-primary shadow-[0_0_8px_var(--color-primary)]" />
    )}
    {insertionPosition === "after" && insertionAxis === "horizontal" && (
      <span className="pointer-events-none absolute -right-3 top-1 bottom-1 z-10 w-1.5 rounded-full bg-primary shadow-[0_0_8px_var(--color-primary)]" />
    )}
    {editMode && (
      <div className="pointer-events-none absolute inset-0 z-10 rounded-xl border-2 border-dashed border-primary/50 bg-primary/5" />
    )}
    {editMode && (
      <div
        className="relative z-20 flex cursor-grab items-center gap-2 rounded-t-xl border border-b-0 border-primary/30 bg-surface-container-high px-3 py-2 active:cursor-grabbing"
        onPointerDown={(event) => {
          event.preventDefault();
          onPointerStart(widget.id);
        }}
      >
        <button
          type="button"
          draggable={false}
          onPointerDown={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onPointerStart(widget.id);
          }}
          onKeyDown={(event) => {
            if (event.key === "ArrowUp") {
              event.preventDefault();
              onKeyboardMove(widget.id, -1);
            } else if (event.key === "ArrowDown") {
              event.preventDefault();
              onKeyboardMove(widget.id, 1);
            } else if (event.key === "Delete" || event.key === "Backspace") {
              event.preventDefault();
              onRemove(widget.id);
            }
          }}
          className="shrink-0 touch-none rounded p-1 text-primary focus:outline-none focus:ring-2 focus:ring-primary/60"
          title="Drag to reorder, use arrow keys, or press Delete to remove"
          aria-label={`Reorder ${widget.title}`}
        >
          <GripVertical size={16} />
        </button>
        <span className="min-w-0 flex-1 truncate font-mono text-xs font-bold text-on-surface">
          {widget.title}
        </span>
        <button
          type="button"
          onPointerDown={(event) => event.stopPropagation()}
          onClick={() => onRemove(widget.id)}
          className="rounded p-1 text-on-surface-variant transition-all hover:bg-error/20 hover:text-error hover:shadow-[0_0_8px_var(--color-error)] focus:outline-none focus:ring-1 focus:ring-error"
          title={`Remove ${widget.title}`}
          aria-label={`Remove ${widget.title}`}
        >
          <Trash2 size={14} />
        </button>
      </div>
    )}
    <div className="flex min-h-0 flex-1 flex-col *:h-full">{children}</div>
  </section>
);

interface DashboardPageProps {
  metronomeBpm: number;
  onBpmChange: (bpm: number) => void;
  streak: StreakData;
  activeSessionDuration: number;
  isSessionActive: boolean;
  onToggleSession: () => void;
  onEndSession: () => void;
  onLogBpm: (bpm: number) => void;
  settings: AppSettings;
  onUpdateSettings: (settings: Partial<AppSettings>) => void;
  timer: ReturnType<typeof useTimer>;
  metronomeIsPlaying?: boolean;
  onMetronomePlayingChange?: (playing: boolean) => void;
  metronomeBarCycleMode?: boolean;
  onBarCycleModeChange?: (enabled: boolean) => void;
  onOpenRoutine: () => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  metronomeBpm,
  onBpmChange,
  streak,
  activeSessionDuration,
  isSessionActive,
  onToggleSession,
  onEndSession,
  onLogBpm,
  settings,
  onUpdateSettings,
  timer,
  metronomeIsPlaying,
  onMetronomePlayingChange,
  metronomeBarCycleMode,
  onBarCycleModeChange,
  onOpenRoutine,
}) => {
  // Get tuning from settings
  const defaultTuning = useMemo(() => {
    return (
      GUITAR_TUNINGS.find((t) => t.name === settings.defaultTuning) ??
      GUITAR_TUNINGS[0]
    );
  }, [settings.defaultTuning]);

  // Instrument view toggle derived from layout

  // Scale overlay state
  const [selectedRoot, setSelectedRoot] = useState<NoteName>("A");
  const [isRootMenuOpen, setIsRootMenuOpen] = useState<boolean>(false);
  const rootMenuRef = useRef<HTMLDivElement>(null);
  const [isScaleMenuOpen, setIsScaleMenuOpen] = useState<boolean>(false);
  const [scaleSearchQuery, setScaleSearchQuery] = useState<string>("");
  const [scaleMenuCategory, setScaleMenuCategory] = useState<string>("All");
  const scaleMenuRef = useRef<HTMLDivElement>(null);
  const [selectedScale, setSelectedScale] = useState<ScaleDefinition | null>(
    SCALES_DATABASE.find((scale) => scale.id === "natural_minor") ??
      SCALES_DATABASE[1] ??
      null,
  );
  const [displayMode, setDisplayMode] = useState<NoteDisplayMode>("name");
  const [currentTuning, setCurrentTuning] = useState<Tuning>(defaultTuning);
  const [fretCount, setFretCount] = useState<number>(settings.fretCount);
  const [layout, setLayout] = useState<DashboardLayoutData>(() =>
    getSavedDashboardLayout(),
  );
  const [isDashboardEditMode, setIsDashboardEditMode] = useState(false);
  const [draggedWidgetId, setDraggedWidgetId] =
    useState<DashboardWidgetId | null>(null);
  const [dropTarget, setDropTarget] = useState<DashboardDropTarget | null>(
    null,
  );

  // Active Random Note state
  const [activeRandomNote, setActiveRandomNote] = useState<string>("F#");
  const [showTargetNote, setShowTargetNote] = useState<boolean>(false);

  const scaleCategories = [
    "Major & Minor",
    "Pentatonic & Blues",
    "Modes",
    "Symmetrical & Exotic",
  ] as const;

  const filteredScales = SCALES_DATABASE.filter((scale) => {
    const query = scaleSearchQuery.toLowerCase();
    const matchesCategory =
      scaleMenuCategory === "All" || scale.category === scaleMenuCategory;
    const matchesSearch =
      scale.name.toLowerCase().includes(query) ||
      scale.category.toLowerCase().includes(query) ||
      scale.formula.toLowerCase().includes(query);
    return matchesCategory && matchesSearch;
  });

  // Sync fretCount from settings when it changes
  useEffect(() => {
    setFretCount(settings.fretCount);
  }, [settings.fretCount]);

  // Sync tuning from settings when it changes
  useEffect(() => {
    const newTuning =
      GUITAR_TUNINGS.find((t) => t.name === settings.defaultTuning) ??
      GUITAR_TUNINGS[0];
    setCurrentTuning(newTuning);
  }, [settings.defaultTuning]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        rootMenuRef.current &&
        !rootMenuRef.current.contains(event.target as Node)
      ) {
        setIsRootMenuOpen(false);
      }
      if (
        scaleMenuRef.current &&
        !scaleMenuRef.current.contains(event.target as Node)
      ) {
        setIsScaleMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    saveDashboardLayout(layout);
  }, [layout]);

  const hideWidget = (id: DashboardWidgetId) => {
    setLayout((current) => {
      let targetWidget: DashboardWidgetLayout | null = null;
      const newRows = current.rows
        .map((row) => {
          const filtered = row.widgets.filter((w) => {
            if (w.id === id) {
              targetWidget = w;
              return false;
            }
            return true;
          });
          return { ...row, widgets: filtered };
        })
        .filter((row) => row.widgets.length > 0);

      if (!targetWidget) return current;

      return {
        ...current,
        rows: newRows,
        hiddenWidgets: [...current.hiddenWidgets, targetWidget],
      };
    });
  };

  const showWidget = (id: DashboardWidgetId) => {
    setLayout((current) => {
      const widgetIndex = current.hiddenWidgets.findIndex((w) => w.id === id);
      if (widgetIndex === -1) return current;

      const widget = current.hiddenWidgets[widgetIndex];
      const newHidden = [...current.hiddenWidgets];
      newHidden.splice(widgetIndex, 1);

      const newRow: DashboardRow = {
        id: `row-${Math.random().toString(36).substring(2, 9)}`,
        widgets: [widget],
      };

      return {
        ...current,
        rows: [...current.rows, newRow],
        hiddenWidgets: newHidden,
      };
    });
  };

  const moveWidget = () => {
    if (!draggedWidgetId || !dropTarget || draggedWidgetId === dropTarget.id) {
      return;
    }

    setLayout((current) => {
      let draggedWidget: DashboardWidgetLayout | null = null;
      let sourceRowIndex = -1;
      let targetRowIndex = -1;

      current.rows.forEach((row, rIndex) => {
        const wIndex = row.widgets.findIndex((w) => w.id === draggedWidgetId);
        if (wIndex !== -1) {
          draggedWidget = row.widgets[wIndex];
          sourceRowIndex = rIndex;
        }
      });

      if (!draggedWidget) return current;

      current.rows.forEach((row, rIndex) => {
        const wIndex = row.widgets.findIndex((w) => w.id === dropTarget.id);
        if (wIndex !== -1) {
          targetRowIndex = rIndex;
        }
      });

      if (targetRowIndex === -1) return current;

      const newRows = current.rows.map((row) => ({
        ...row,
        widgets: [...row.widgets],
      }));

      const sourceRow = newRows[sourceRowIndex];
      const draggedIndexInSource = sourceRow.widgets.findIndex(
        (w) => w.id === draggedWidgetId,
      );
      sourceRow.widgets.splice(draggedIndexInSource, 1);

      const targetRow = newRows[targetRowIndex];
      const targetWidgetIndex = targetRow.widgets.findIndex(
        (w) => w.id === dropTarget.id,
      );

      if (dropTarget.axis === "horizontal") {
        const insertIndex =
          targetWidgetIndex + (dropTarget.position === "after" ? 1 : 0);
        targetRow.widgets.splice(insertIndex, 0, draggedWidget);
      } else {
        const newRow: DashboardRow = {
          id: `row-${Math.random().toString(36).substring(2, 9)}`,
          widgets: [draggedWidget],
        };
        const insertRowIndex =
          targetRowIndex + (dropTarget.position === "after" ? 1 : 0);
        newRows.splice(insertRowIndex, 0, newRow);
      }

      const finalRows = newRows.filter((row) => row.widgets.length > 0);

      return { ...current, rows: finalRows };
    });

    setDraggedWidgetId(null);
    setDropTarget(null);
  };

  const moveWidgetWithKeyboard = (id: DashboardWidgetId, direction: -1 | 1) => {
    // Basic array reorder could be implemented here, simplified for now
  };

  useEffect(() => {
    if (!draggedWidgetId) return;

    const handlePointerMove = (event: PointerEvent) => {
      event.preventDefault();
      const element = document.elementFromPoint(event.clientX, event.clientY);
      const target = element?.closest<HTMLElement>("[data-dashboard-widget]");
      const targetId = target?.dataset.dashboardWidget as
        | DashboardWidgetId
        | undefined;
      if (!target || !targetId || targetId === draggedWidgetId) return;
      const bounds = target.getBoundingClientRect();
      const distances = {
        left: Math.abs(event.clientX - bounds.left),
        right: Math.abs(bounds.right - event.clientX),
        top: Math.abs(event.clientY - bounds.top),
        bottom: Math.abs(bounds.bottom - event.clientY),
      };
      const closestEdge = Object.entries(distances).sort(
        ([, firstDistance], [, secondDistance]) =>
          firstDistance - secondDistance,
      )[0][0] as keyof typeof distances;
      const axis =
        closestEdge === "left" || closestEdge === "right"
          ? "horizontal"
          : "vertical";
      const position =
        closestEdge === "left" || closestEdge === "top" ? "before" : "after";
      setDropTarget({
        id: targetId,
        position,
        axis,
      });
    };

    const handlePointerUp = () => {
      moveWidget();
      setDraggedWidgetId(null);
      setDropTarget(null);
    };

    document.addEventListener("pointermove", handlePointerMove);
    document.addEventListener("pointerup", handlePointerUp);
    return () => {
      document.removeEventListener("pointermove", handlePointerMove);
      document.removeEventListener("pointerup", handlePointerUp);
    };
  }, [draggedWidgetId, dropTarget, moveWidget]);

  const handlePointerStart = (id: DashboardWidgetId) => {
    setDraggedWidgetId(id);
    setDropTarget(null);
  };

  const [instrumentView, setInstrumentView] = useState<
    "guitar" | "piano" | "both"
  >(settings.defaultInstrument);

  useEffect(() => {
    setInstrumentView(settings.defaultInstrument);
  }, [settings.defaultInstrument]);

  const resetWidgetLayout = () => {
    setLayout({
      rows: [
        { id: "row-1", widgets: DEFAULT_WIDGET_LAYOUT.slice(0, 4) },
        { id: "row-2", widgets: [DEFAULT_WIDGET_LAYOUT[4]] },
        { id: "row-3", widgets: [DEFAULT_WIDGET_LAYOUT[5]] },
        { id: "row-4", widgets: [DEFAULT_WIDGET_LAYOUT[6]] },
      ],
      hiddenWidgets: [],
    });
  };

  const renderWidget = (
    widget: DashboardWidgetLayout,
    rowWidgetCount = 1,
  ): React.ReactNode => {
    switch (widget.id) {
      case "metronome":
        return (
          <Metronome
            bpm={metronomeBpm}
            onBpmChange={onBpmChange}
            onLogBpmToSession={onLogBpm}
            settings={settings}
            showTempoPresets={false}
            isPlaying={metronomeIsPlaying}
            onIsPlayingChange={onMetronomePlayingChange}
            barCycleMode={metronomeBarCycleMode}
            onBarCycleModeChange={onBarCycleModeChange}
          />
        );
      case "timer":
        return (
          <TimerWidget
            timer={timer}
            settings={settings}
            onUpdateSettings={onUpdateSettings}
            desktopValuePlacement={
              rowWidgetCount >= 4
                ? "above-4"
                : rowWidgetCount === 3
                  ? "above"
                  : "below"
            }
          />
        );
      case "random-drill":
        return (
          <RandomDrill
            currentNote={activeRandomNote}
            onNextNote={setActiveRandomNote}
            metronomeBpm={metronomeBpm}
            instrumentView={instrumentView}
            showHighlight={showTargetNote}
            onToggleHighlight={() => setShowTargetNote(!showTargetNote)}
          />
        );
      case "session":
        return (
          <SessionWidget
            streak={streak}
            activeSessionDuration={activeSessionDuration}
            isSessionActive={isSessionActive}
            onToggleSession={onToggleSession}
            onEndSession={onEndSession}
            currentScaleName={`${selectedRoot} ${selectedScale?.name || "Chromatic"}`}
            highestBpmSession={metronomeBpm}
          />
        );
      case "practice-tasks":
        return <PracticeTasksWidget onOpenRoutine={onOpenRoutine} />;
      case "instruments":
        return (
          <div className="flex flex-col gap-4">
            {(instrumentView === "guitar" || instrumentView === "both") && (
              <Fretboard
                tuning={currentTuning}
                onTuningChange={setCurrentTuning}
                fretCount={fretCount}
                onFretCountChange={setFretCount}
                selectedRoot={selectedRoot}
                selectedScale={selectedScale}
                activeRandomNote={showTargetNote ? activeRandomNote : null}
                displayMode={displayMode}
                onDisplayModeChange={setDisplayMode}
              />
            )}
            {(instrumentView === "piano" || instrumentView === "both") && (
              <PianoKeyboard
                octaves={3}
                startOctave={3}
                selectedRoot={selectedRoot}
                selectedScale={selectedScale}
                activeRandomNote={showTargetNote ? activeRandomNote : null}
                displayMode={displayMode}
              />
            )}
          </div>
        );
      case "chord-selector":
        return (
          <ChordSelectorWidget
            defaultInstrument={settings.defaultInstrument}
            instrumentView={instrumentView}
          />
        );
    }
  };

  const widgetProps = (widget: DashboardWidgetLayout) => ({
    widget,
    editMode: isDashboardEditMode,
    isDragging: draggedWidgetId === widget.id,
    insertionPosition:
      dropTarget?.id === widget.id &&
      draggedWidgetId !== widget.id &&
      "position" in dropTarget
        ? dropTarget.position
        : null,
    insertionAxis:
      dropTarget?.id === widget.id &&
      draggedWidgetId !== widget.id &&
      "axis" in dropTarget
        ? dropTarget.axis
        : null,
    onPointerStart: handlePointerStart,
    onKeyboardMove: moveWidgetWithKeyboard,
    onRemove: (id: DashboardWidgetId) => {
      hideWidget(id);
    },
  });

  const hiddenWidgets = layout.hiddenWidgets;

  const handleInstrumentToggle = (view: "guitar" | "piano" | "both") => {
    setInstrumentView(view);
  };

  return (
    <div className="space-y-6 pb-12">
      <div data-tour="dashboard-customize" className="flex flex-wrap items-center justify-between gap-3">
        <div>
          {isDashboardEditMode && (
            <p className="mt-1 text-xs text-on-surface-variant">
              Drag widgets to rearrange them or hide them.
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {isDashboardEditMode && hiddenWidgets.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {hiddenWidgets.map((widget) => (
                <button
                  key={widget.id}
                  type="button"
                  onClick={() => showWidget(widget.id)}
                  className="flex items-center gap-1 rounded border border-outline-variant/40 px-2 py-1.5 text-xs font-mono text-on-surface-variant hover:border-primary hover:text-primary"
                  title={`Restore ${widget.title}`}
                >
                  <Settings2 size={13} /> {widget.title}
                </button>
              ))}
            </div>
          )}
          {isDashboardEditMode && (
            <button
              type="button"
              onClick={resetWidgetLayout}
              className="flex items-center gap-1 rounded border border-outline-variant/40 px-2.5 py-2 text-xs font-mono text-on-surface-variant hover:border-primary hover:text-primary"
              title="Reset dashboard layout"
            >
              <RotateCcw size={14} /> Reset
            </button>
          )}
          <button
            type="button"
            onClick={() => setIsDashboardEditMode((current) => !current)}
            className={`flex items-center gap-1.5 rounded px-3 py-2 text-xs font-mono font-bold transition-colors ${isDashboardEditMode ? "bg-primary text-on-primary" : "border border-outline-variant/40 text-on-surface hover:border-primary hover:text-primary"}`}
          >
            <Settings2 size={15} /> {isDashboardEditMode ? "Done" : "Customize"}
          </button>
        </div>
      </div>

      {/* Global Toolbar for Instruments & Overlays */}
      <div className="flex flex-col gap-3 rounded-lg border border-outline-variant/30 bg-surface-container px-3 py-3 shadow-md md:flex-row md:flex-wrap md:items-center md:justify-between md:gap-4 md:px-5">
        <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-2 md:flex md:flex-wrap md:items-center md:gap-3">
          <div className="col-span-2 flex items-center gap-2 md:col-span-1">
            <Sparkles size={16} className="text-primary" />
            <span className="font-mono text-xs font-bold text-on-surface uppercase tracking-wider">
              Scale Overlay
            </span>
          </div>

          <div className="relative col-span-1 h-10 md:h-9" ref={rootMenuRef}>
            <button
              type="button"
              onClick={() => {
                setIsRootMenuOpen((prev) => !prev);
                setIsScaleMenuOpen(false);
              }}
              className="group flex h-full w-full items-center justify-center gap-1 rounded-lg bg-primary px-3 font-mono text-sm font-bold leading-none text-on-primary shadow-md transition-transform hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-primary/60 cursor-pointer md:w-auto md:px-2.5 md:py-1"
            >
              <span>{selectedRoot}</span>
              <ChevronDown
                size={11}
                className="opacity-70 group-hover:opacity-100"
              />
            </button>

            {isRootMenuOpen && (
              <div className="absolute left-0 top-full z-50 mt-2 w-60 max-w-[calc(100vw-2rem)] rounded-xl border border-outline-variant/40 bg-surface p-3 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-outline-variant/20">
                  <span className="text-[11px] font-mono font-bold text-on-surface uppercase tracking-wider">
                    Select Note
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsRootMenuOpen(false)}
                    className="text-on-surface-variant hover:text-on-surface p-1 rounded"
                  >
                    <X size={14} />
                  </button>
                </div>
                <div className="grid grid-cols-4 gap-1.5">
                  {ALL_ROOT_NOTES.map((note) => (
                    <button
                      key={note}
                      type="button"
                      onClick={() => {
                        setSelectedRoot(note);
                        setIsRootMenuOpen(false);
                      }}
                      className={`flex h-9 items-center justify-center rounded font-mono text-xs font-bold transition-all ${selectedRoot === note ? "bg-primary text-on-primary shadow-sm scale-105" : "bg-surface-container hover:bg-surface-container-high text-on-surface border border-outline-variant/30 hover:border-primary/50"}`}
                    >
                      {note}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div
            className="relative col-span-1 h-10 min-w-0 md:col-span-1 md:h-9"
            ref={scaleMenuRef}
          >
            <button
              type="button"
              onClick={() => {
                setIsScaleMenuOpen((prev) => !prev);
                setIsRootMenuOpen(false);
              }}
              className="group flex h-full w-full min-w-0 items-center justify-between gap-2 rounded-lg border border-outline-variant/30 bg-surface-container-low px-3 py-1 text-left text-xs font-mono leading-none text-on-surface transition-colors hover:bg-surface-container-high focus:outline-none focus:ring-1 focus:ring-primary/40 cursor-pointer md:w-auto md:max-w-55"
            >
              <span className="truncate">
                {selectedScale?.name || "None (Show All Notes)"}
              </span>
              <ChevronDown
                size={15}
                className="shrink-0 text-on-surface-variant group-hover:text-primary"
              />
            </button>

            {isScaleMenuOpen && (
              <div className="absolute left-1/2 top-full z-50 mt-2 w-[calc(100vw-1rem)] max-w-[320px] -translate-x-1/2 rounded-xl border border-outline-variant/40 bg-surface p-3 shadow-2xl animate-in fade-in zoom-in-95 duration-150 md:left-0 md:w-105 md:max-w-none md:translate-x-0">
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-outline-variant/20">
                  <span className="text-[11px] font-mono font-bold text-on-surface uppercase tracking-wider">
                    Select Scale or Mode
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsScaleMenuOpen(false)}
                    className="text-on-surface-variant hover:text-on-surface p-1 rounded"
                  >
                    <X size={14} />
                  </button>
                </div>

                <div className="relative mb-2.5">
                  <Search
                    size={14}
                    className="absolute left-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant"
                  />
                  <input
                    type="text"
                    placeholder="Search scale name..."
                    value={scaleSearchQuery}
                    onChange={(e) => setScaleSearchQuery(e.target.value)}
                    className="w-full rounded-lg border border-outline-variant/40 bg-surface-container-low py-1.5 pl-8 pr-7 text-xs font-mono text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary"
                    autoFocus
                  />
                  {scaleSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setScaleSearchQuery("")}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-on-surface-variant hover:text-on-surface"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>

                <div className="no-scrollbar mb-2 flex items-center gap-1 overflow-x-auto border-b border-outline-variant/10 pb-2">
                  {["All", ...scaleCategories].map((category) => (
                    <button
                      key={category}
                      type="button"
                      onClick={() => setScaleMenuCategory(category)}
                      className={`whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-mono transition-all ${scaleMenuCategory === category ? "bg-primary text-on-primary font-bold" : "border border-outline-variant/20 bg-surface-container text-on-surface-variant hover:text-on-surface"}`}
                    >
                      {category}
                    </button>
                  ))}
                </div>

                <div className="max-h-60 space-y-1 overflow-y-auto pr-1">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedScale(null);
                      setIsScaleMenuOpen(false);
                    }}
                    className={`flex w-full items-center justify-between rounded-lg p-2 text-left transition-all ${selectedScale === null ? "border border-primary/40 bg-primary/15 text-primary font-bold" : "text-on-surface hover:bg-surface-container-high"}`}
                  >
                    <span className="font-mono text-xs font-semibold">
                      None (Show All Notes)
                    </span>
                    {selectedScale === null && (
                      <Check size={15} className="shrink-0 text-primary" />
                    )}
                  </button>
                  {filteredScales.map((scale) => (
                    <button
                      key={scale.id}
                      type="button"
                      onClick={() => {
                        setSelectedScale(scale);
                        setIsScaleMenuOpen(false);
                      }}
                      className={`flex w-full items-center justify-between rounded-lg p-2 text-left transition-all ${selectedScale?.id === scale.id ? "border border-primary/40 bg-primary/15 text-primary font-bold" : "text-on-surface hover:bg-surface-container-high"}`}
                    >
                      <span className="flex min-w-0 flex-col pr-2">
                        <span className="truncate font-mono text-xs font-semibold">
                          {scale.name}
                        </span>
                        <span className="truncate text-[10px] font-mono text-on-surface-variant opacity-75">
                          {scale.formula} • {scale.category}
                        </span>
                      </span>
                      {selectedScale?.id === scale.id && (
                        <Check size={15} className="shrink-0 text-primary" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-2 md:flex-row md:items-center">
          <div className="flex h-12 w-full min-w-0 items-stretch gap-1.5 overflow-x-auto rounded border border-outline-variant/30 bg-surface-container-low p-1 md:h-9">
            {(["name", "degree", "interval"] as NoteDisplayMode[]).map(
              (mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setDisplayMode(mode)}
                  className={`flex min-w-max flex-1 items-center justify-center rounded px-2.5 py-1 text-[10px] font-mono uppercase tracking-wider transition-colors ${
                    displayMode === mode
                      ? "bg-primary text-on-primary font-semibold shadow-sm"
                      : "text-on-surface-variant hover:bg-outline-variant/10 hover:text-on-surface"
                  }`}
                >
                  {mode === "name"
                    ? "Note Name"
                    : mode === "degree"
                      ? "Degrees (1 3 5)"
                      : "Intervals (R M3)"}
                </button>
              ),
            )}
          </div>

          <div className="grid h-12 grid-cols-3 items-center gap-1 rounded border border-outline-variant/30 bg-surface-container-low p-1 md:h-9 md:flex">
            <button
              onClick={() => handleInstrumentToggle("guitar")}
              className={`flex h-full items-center justify-center gap-1.5 rounded px-2 py-1 text-xs font-mono transition-all md:px-3 ${instrumentView === "guitar" ? "bg-primary text-on-primary font-bold shadow" : "text-on-surface-variant hover:text-on-surface"}`}
            >
              <Guitar size={14} />
              <span>Guitar</span>
            </button>
            <button
              onClick={() => handleInstrumentToggle("piano")}
              className={`flex h-full items-center justify-center gap-1.5 rounded px-2 py-1 text-xs font-mono transition-all md:px-3 ${instrumentView === "piano" ? "bg-primary text-on-primary font-bold shadow" : "text-on-surface-variant hover:text-on-surface"}`}
            >
              <Piano size={14} />
              <span>Piano</span>
            </button>
            <button
              onClick={() => handleInstrumentToggle("both")}
              className={`flex h-full items-center justify-center gap-1.5 rounded px-2 py-1 text-xs font-mono transition-all md:px-3 ${instrumentView === "both" ? "bg-primary text-on-primary font-bold shadow" : "text-on-surface-variant hover:text-on-surface"}`}
            >
              <Layers size={14} />
              <span>Both</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2D Layout Rows */}
      <div className="flex flex-col gap-3 md:gap-5">
        {layout.rows.map((row) => (
          <div
            key={row.id}
            className="flex flex-col md:flex-row items-stretch gap-3 md:gap-5 w-full"
          >
            {row.widgets.map((widget) => (
              <DashboardWidget key={widget.id} {...widgetProps(widget)}>
                {renderWidget(widget, row.widgets.length)}
              </DashboardWidget>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};
