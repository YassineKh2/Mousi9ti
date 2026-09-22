import React, { useState, useEffect, useCallback, useRef } from "react";
import confetti from "canvas-confetti";
import { AppSettings, Exercise, NoteName, Session, StreakData } from "./types";
import {
  getSavedSettings,
  getSavedSessions,
  getSavedStreak,
  getTodayDateString,
  recordPracticeActivity,
  saveSession,
  saveSettings,
} from "./lib/storage";
import { audioEngine } from "./lib/audio";
import { useTimer } from "./lib/useTimer";
import {
  Navigation,
  ActiveTab,
  GlobalSearchResult,
} from "./components/Navigation";
import { SettingsModal } from "./components/SettingsModal";
import { DashboardPage } from "./pages/DashboardPage";
import { ScalesPage } from "./pages/ScalesPage";
import { ChordsPage } from "./pages/ChordsPage";
import { BuilderPage } from "./pages/BuilderPage";
import { ExercisesPage } from "./pages/ExercisesPage";
import { ToolsPage } from "./pages/ToolsPage";
import { StatsPage } from "./pages/StatsPage";
import { RoutinePage } from "./pages/RoutinePage";
import { ALL_ROOT_NOTES, SCALES_DATABASE } from "./data/musicTheory";
import { CHORD_TYPES_CATALOG, getCustomChords } from "./data/chordsData";
import { GlobalSessionToast } from "./components/GlobalSessionToast";
import { SettingsContext } from "./contexts/SettingsContext";
import { TourOverlay } from "./components/TourOverlay";

export function App() {
  type PendingScaleTarget = { scaleId: string; root: NoteName };
  type PendingChordTarget = {
    chordType: string;
    root: NoteName;
    customChordId?: string;
  };

  // Onboarding tour
  const [isTourOpen, setIsTourOpen] = useState<boolean>(
    () => localStorage.getItem("Mousi9ti_tour_done") !== "true",
  );
  // Kept in App so it survives TourOverlay unmount/remount — no reload needed to resume
  const [tourStep, setTourStep] = useState<number>(() => {
    const n = Number.parseInt(
      localStorage.getItem("Mousi9ti_tour_step") ?? "0",
      10,
    );
    return Number.isFinite(n) && n >= 0 ? n : 0;
  });

  const handleCloseTour = () => {
    localStorage.setItem("Mousi9ti_tour_done", "true");
    setIsTourOpen(false);
  };

  const handleTourStepChange = (step: number) => {
    setTourStep(step);
    localStorage.setItem("Mousi9ti_tour_step", String(step));
  };

  // Navigation
  const [activeTab, setActiveTab] = useState<ActiveTab>("dashboard");
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(
    () => localStorage.getItem("Mousi9ti_sidebar_collapsed") === "true",
  );
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [pendingScaleSearch, setPendingScaleSearch] =
    useState<PendingScaleTarget | null>(null);
  const [pendingChordSearch, setPendingChordSearch] =
    useState<PendingChordTarget | null>(null);
  const [pendingExerciseSearch, setPendingExerciseSearch] = useState<
    string | null
  >(null);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [activeTab]);

  // Settings & Theme
  const [settings, setSettings] = useState<AppSettings>(() =>
    getSavedSettings(),
  );
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);

  // Practice & Sessions State
  const [sessions, setSessions] = useState<Session[]>(() => getSavedSessions());
  const [streak, setStreak] = useState<StreakData>(() => getSavedStreak());

  // Initialize timer state from local storage
  const [isSessionActive, setIsSessionActive] = useState<boolean>(() => {
    return localStorage.getItem("Mousi9ti_session_is_active") === "true";
  });
  const [activeSessionDuration, setActiveSessionDuration] = useState<number>(
    () => {
      const acc = parseInt(
        localStorage.getItem("Mousi9ti_session_accumulated") || "0",
        10,
      );
      const isActive =
        localStorage.getItem("Mousi9ti_session_is_active") === "true";
      const startStr = localStorage.getItem("Mousi9ti_session_start_time");

      if (isActive && startStr) {
        const elapsed = Math.floor(
          (Date.now() - parseInt(startStr, 10)) / 1000,
        );
        return acc + (elapsed > 0 ? elapsed : 0);
      }
      return acc;
    },
  );
  const [currentSessionBpms, setCurrentSessionBpms] = useState<number[]>([]);

  // Metronome State
  const [metronomeBpm, setMetronomeBpm] = useState<number>(120);
  const [metronomeIsPlaying, setMetronomeIsPlaying] = useState<boolean>(false);
  const [metronomeBarCycleMode, setMetronomeBarCycleMode] =
    useState<boolean>(false);

  // Practice Timer
  const timer = useTimer();
  const metronomeStartedAtRef = useRef<number | null>(null);

  useEffect(() => {
    timer.setOnComplete(() => {
      const durationSeconds = timer.duration;
      if (durationSeconds > 0) {
        recordPracticeActivity({
          source: "timer",
          sourceId: "global-timer",
          startTime: Date.now() - durationSeconds * 1000,
          endTime: Date.now(),
          durationSeconds,
          area: "Timer",
          tags: ["timer"],
          status: "completed",
        });
      }
      if ("vibrate" in navigator) {
        navigator.vibrate([200, 450, 200, 450, 200]);
      }

      if (settings.stopMetronomeOnTimerEnd && audioEngine.isRunning()) {
        audioEngine.stopMetronome();
      }

      audioEngine.playTimerCompletionSound(3, 0.65);

      if (
        "Notification" in window &&
        Notification.permission === "granted" &&
        document.hidden
      ) {
        new Notification("Practice Timer Finished!", {
          body: "Your practice session is complete.",
          icon: "/favicon.ico",
        });
      }
    });
  }, [settings.stopMetronomeOnTimerEnd, timer]);

  useEffect(() => {
    const unsubscribe = audioEngine.onMetronomeStateChange(
      (playing: boolean) => {
        setMetronomeIsPlaying(playing);
        if (playing) {
          metronomeStartedAtRef.current ||= Date.now();
        } else if (metronomeStartedAtRef.current) {
          const startTime = metronomeStartedAtRef.current;
          const durationSeconds = Math.floor((Date.now() - startTime) / 1000);
          if (durationSeconds >= 30 && !isSessionActive) {
            recordPracticeActivity({
              source: "metronome",
              sourceId: "global-metronome",
              startTime,
              endTime: Date.now(),
              durationSeconds,
              area: "Rhythm",
              tags: ["metronome", "bpm"],
              bpm: audioEngine.getMetronomeState().bpm,
              status: "completed",
            });
          }
          metronomeStartedAtRef.current = null;
        }
      },
    );

    setMetronomeIsPlaying(audioEngine.isRunning());
    return () => unsubscribe();
  }, [isSessionActive]);

  // Sync Master Volume & Theme to engine and HTML element
  useEffect(() => {
    audioEngine.setVolume(settings.soundVolume);
    if (settings.theme === "light") {
      document.documentElement.classList.add("light");
    } else {
      document.documentElement.classList.remove("light");
    }
  }, [settings]);

  // Prevent closing page if there is an active session
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      // If session is active or has unlogged time, warn the user
      if (isSessionActive || activeSessionDuration > 0) {
        e.preventDefault();
        e.returnValue =
          "You have an active practice session. Are you sure you want to leave without logging it?";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isSessionActive, activeSessionDuration]);

  // Live session timer interval
  useEffect(() => {
    let interval: number | null = null;

    if (isSessionActive) {
      interval = window.setInterval(() => {
        const acc = parseInt(
          localStorage.getItem("Mousi9ti_session_accumulated") || "0",
          10,
        );
        const startStr = localStorage.getItem("Mousi9ti_session_start_time");
        if (startStr) {
          const elapsed = Math.floor(
            (Date.now() - parseInt(startStr, 10)) / 1000,
          );
          setActiveSessionDuration(acc + (elapsed > 0 ? elapsed : 0));
        }
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isSessionActive]);

  // Toggle active practice session
  const handleToggleSession = () => {
    setIsSessionActive((prev) => {
      const nextState = !prev;
      if (nextState) {
        localStorage.setItem("Mousi9ti_session_is_active", "true");
        localStorage.setItem(
          "Mousi9ti_session_start_time",
          Date.now().toString(),
        );
      } else {
        localStorage.setItem("Mousi9ti_session_is_active", "false");
        localStorage.removeItem("Mousi9ti_session_start_time");
        localStorage.setItem(
          "Mousi9ti_session_accumulated",
          activeSessionDuration.toString(),
        );
      }
      return nextState;
    });
  };

  // End and Log Practice Session
  const handleEndSession = useCallback(() => {
    if (activeSessionDuration === 0) {
      // Nothing to log, just clean up
      localStorage.removeItem("Mousi9ti_session_is_active");
      localStorage.removeItem("Mousi9ti_session_start_time");
      localStorage.removeItem("Mousi9ti_session_accumulated");
      setIsSessionActive(false);
      setActiveSessionDuration(0);
      return;
    }

    const today = getTodayDateString();
    const highestBpm =
      currentSessionBpms.length > 0
        ? Math.max(...currentSessionBpms)
        : metronomeBpm;

    const newSession: Session = {
      id: `session-${Date.now()}`,
      date: today,
      startTime: Date.now() - activeSessionDuration * 1000,
      endTime: Date.now(),
      durationSeconds: activeSessionDuration,
      bpmsUsed:
        currentSessionBpms.length > 0 ? currentSessionBpms : [metronomeBpm],
      highestBpm,
      scalesPracticed: ["Fretboard Theory & Metronome"],
      exercisesOpened: [],
      focus: "Fretboard Theory & Metronome Technique",
      completed: true,
    };

    saveSession(newSession);
    setSessions(getSavedSessions());
    setStreak(getSavedStreak());

    // Celebrate streak completion with confetti!
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 },
    });

    localStorage.removeItem("Mousi9ti_session_is_active");
    localStorage.removeItem("Mousi9ti_session_start_time");
    localStorage.removeItem("Mousi9ti_session_accumulated");
    setIsSessionActive(false);
    setActiveSessionDuration(0);
    setCurrentSessionBpms([]);
  }, [activeSessionDuration, currentSessionBpms, metronomeBpm]);

  // Log BPM to session tracker
  const handleLogBpm = (bpm: number) => {
    setCurrentSessionBpms((prev) => [...prev, bpm]);
  };

  // Switch to exercise practice directly with suggested tempo
  const handleStartExercisePractice = (exercise: Exercise) => {
    setMetronomeBpm(exercise.suggestedBpm);
    setActiveTab("dashboard");
    if (!isSessionActive) {
      setIsSessionActive(true);
    }
  };

  // Update Settings
  const handleUpdateSettings = (newPartial: Partial<AppSettings>) => {
    const updated = { ...settings, ...newPartial };
    setSettings(updated);
    saveSettings(updated);
  };

  // Export JSON data
  const handleExportData = () => {
    const data = {
      sessions,
      streak,
      settings,
      exportDate: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Mousi9ti-practice-export-${getTodayDateString()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Clear data
  const handleClearData = () => {
    localStorage.clear();
    setSessions([]);
    setStreak({
      currentStreak: 0,
      longestStreak: 0,
      lastVisitDate: getTodayDateString(),
      graceDaysUsed: 0,
      history: [],
    });
    setIsSessionActive(false);
    setActiveSessionDuration(0);
    setCurrentSessionBpms([]);
    setIsSettingsOpen(false);
  };

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger when typing in inputs
      if (
        ["INPUT", "TEXTAREA", "SELECT"].includes(
          (e.target as HTMLElement).tagName,
        )
      ) {
        return;
      }

      if (e.code === "Space") {
        e.preventDefault();
        // Toggle metronome directly
        if (audioEngine.isRunning()) {
          audioEngine.stopMetronome();
        } else {
          const engineState = audioEngine.getMetronomeState();
          audioEngine.startMetronome(
            metronomeBpm,
            engineState.timeSignature,
            engineState.subdivision,
            engineState.soundType,
          );
        }
      } else if (e.key.toLowerCase() === "n") {
        e.preventDefault();
        window.dispatchEvent(new Event("random-drill-next-note"));
      } else if (e.key === "1") {
        setActiveTab("dashboard");
      } else if (e.key === "2") {
        setActiveTab("scales");
      } else if (e.key === "3") {
        setActiveTab("chords");
      } else if (e.key === "4") {
        setActiveTab("exercises");
      } else if (e.key === "5") {
        setActiveTab("tools");
      } else if (e.key === "6") {
        setActiveTab("stats");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [metronomeBpm]);

  const parseRootQuery = (raw: string) => {
    const compact = raw
      .toLowerCase()
      .replace(/[\u266d\u266f]/g, "")
      .replace(/[^a-z0-9#b\s]/g, " ")
      .replace(/\s+/g, "")
      .trim();

    if (!compact) return null;

    const candidateRoots = [...ALL_ROOT_NOTES]
      .map((note) => note.toLowerCase())
      .sort((a, b) => b.length - a.length);

    for (const candidate of candidateRoots) {
      if (!compact.startsWith(candidate)) continue;

      const root = ALL_ROOT_NOTES.find(
        (note) => note.toLowerCase() === candidate,
      );
      if (!root) continue;

      return {
        root,
        rest: compact.slice(candidate.length),
      };
    }

    return null;
  };

  const normalizeSearchQuality = (query: string) => {
    const compact = query.toLowerCase().replace(/\s+/g, "");
    if (!compact) return "";

    const aliasMap: Record<string, string> = {
      m: "minor",
      min: "minor",
      minor: "minor",
      major: "major",
      maj: "major",
      ionian: "major",
      aeolian: "minor",
      naturalminor: "minor",
      harmonicminor: "minor",
      melodicminor: "minor",
      pentatonicminor: "minor",
      minor7: "min7",
      m7: "min7",
      major7: "maj7",
      maj7: "maj7",
      dom: "7",
      dominant: "7",
      seven: "7",
      "7": "7",
    };

    return aliasMap[compact] ?? compact;
  };

  const searchResults = React.useMemo<GlobalSearchResult[]>(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];

    const parsed = parseRootQuery(q);
    const strippedScaleQuery = normalizeSearchQuality(
      (parsed?.rest ?? q).replace(/\bscales?\b/g, "").trim(),
    );
    const strippedChordQuery = normalizeSearchQuality(
      (parsed?.rest ?? q).replace(/\bchords?\b/g, "").trim(),
    );

    const tabCatalog: GlobalSearchResult[] = [
      {
        id: "tab-dashboard",
        label: "Dashboard",
        subtitle: "Metronome, drills, session",
        tab: "dashboard",
        kind: "tab",
      },
      {
        id: "tab-scales",
        label: "Scales",
        subtitle: "Scale explorer and playback",
        tab: "scales",
        kind: "tab",
      },
      {
        id: "tab-chords",
        label: "Chords",
        subtitle: "Chord explorer and notation",
        tab: "chords",
        kind: "tab",
      },
      {
        id: "tab-builder",
        label: "Builder",
        subtitle: "Progression and arrangement builder",
        tab: "builder",
        kind: "tab",
      },
      // Hidden until further improvement
      // {
      //   id: "tab-exercises",
      //   label: "Exercises",
      //   subtitle: "Technique and theory drills",
      //   tab: "exercises",
      //   kind: "tab",
      // },
      {
        id: "tab-tools",
        label: "Tools",
        subtitle: "Timer, metronome, circle, tuner, ear trainer",
        tab: "tools",
        kind: "tab",
      },
      {
        id: "tab-stats",
        label: "Stats",
        subtitle: "Practice analytics",
        tab: "stats",
        kind: "tab",
      },
    ];

    const tabResults: GlobalSearchResult[] = tabCatalog.filter((r) =>
      `${r.label} ${r.subtitle}`.toLowerCase().includes(q),
    );

    const scaleMatches = SCALES_DATABASE.filter((s) => {
      const haystack = `${s.name} ${s.id} ${s.formula}`.toLowerCase();
      if (parsed?.root) {
        return strippedScaleQuery.length === 0
          ? true
          : haystack.includes(strippedScaleQuery);
      }
      return haystack.includes(q);
    }).slice(0, 8);

    const scaleResults: GlobalSearchResult[] = scaleMatches.map((s) => ({
      id: `scale-${parsed?.root ?? "any"}-${s.id}`,
      label: `${parsed?.root ?? "C"} ${s.name}`,
      subtitle: `${s.category} • ${s.formula}`,
      tab: "scales",
      kind: "scale",
      payload: { scaleId: s.id, root: parsed?.root ?? "C" },
    }));

    const chordMatches = CHORD_TYPES_CATALOG.filter((c) => {
      const haystack = `${c.name} ${c.symbol} ${c.type}`.toLowerCase();
      if (parsed?.root) {
        return strippedChordQuery.length === 0
          ? true
          : haystack.includes(strippedChordQuery);
      }
      return haystack.includes(q);
    }).slice(0, 8);

    const chordResults: GlobalSearchResult[] = chordMatches.map((c) => ({
      id: `chord-${parsed?.root ?? "C"}-${c.type}`,
      label: `${parsed?.root ?? "C"}${c.symbol || ""}`,
      subtitle: `${c.name} • ${c.formula}`,
      tab: "chords",
      kind: "chord",
      payload: { chordType: c.type, root: parsed?.root ?? "C" },
    }));

    const customChordResults: GlobalSearchResult[] = getCustomChords()
      .filter((chord) => {
        const chordName = chord.pianoVoicing?.name || chord.voicing.name;
        const haystack =
          `${chord.root} ${chordName} ${chord.chordType}`.toLowerCase();
        return parsed?.root
          ? chord.root === parsed.root &&
              haystack.includes(strippedChordQuery || chord.root.toLowerCase())
          : haystack.includes(q);
      })
      .slice(0, 8)
      .map((chord) => {
        const chordName = chord.pianoVoicing?.name || chord.voicing.name;
        return {
          id: `custom-chord-${chord.id}`,
          label: `${chord.root} ${chordName}`,
          subtitle: chord.pianoVoicing
            ? "Saved piano chord"
            : "Saved guitar chord",
          tab: "chords",
          kind: "chord",
          payload: {
            chordType: chord.chordType,
            root: chord.root,
            customChordId: chord.id,
          },
        };
      });

    return [
      ...tabResults,
      ...scaleResults,
      ...customChordResults,
      ...chordResults,
    ].slice(0, 12);
  }, [searchQuery]);

  const handleSelectSearchResult = (result: GlobalSearchResult) => {
    setActiveTab(result.tab);

    if (
      result.kind === "scale" &&
      result.payload?.scaleId &&
      result.payload?.root
    ) {
      setPendingScaleSearch({
        scaleId: result.payload.scaleId,
        root: result.payload.root as NoteName,
      });
    }
    if (
      result.kind === "chord" &&
      result.payload?.chordType &&
      result.payload?.root
    ) {
      setPendingChordSearch({
        chordType: result.payload.chordType,
        root: result.payload.root as NoteName,
        customChordId: result.payload.customChordId,
      });
    }
    if (result.kind === "exercise" && result.payload?.exerciseId) {
      setPendingExerciseSearch(result.payload.exerciseId);
    }

    setSearchQuery("");
  };

  return (
    <SettingsContext.Provider value={settings}>
      <div className="min-h-screen bg-background text-on-background flex flex-col antialiased selection:bg-primary/30 selection:text-on-surface">
        {/* Navigation Layout */}
        <Navigation
          theme={settings.theme}
          activeTab={activeTab}
          onSelectTab={setActiveTab}
          isSidebarCollapsed={isSidebarCollapsed}
          onToggleSidebar={() => {
            setIsSidebarCollapsed((collapsed) => {
              const nextCollapsed = !collapsed;
              localStorage.setItem(
                "Mousi9ti_sidebar_collapsed",
                String(nextCollapsed),
              );
              return nextCollapsed;
            });
          }}
          onOpenSettings={() => setIsSettingsOpen(true)}
          streakDays={streak.currentStreak}
          graceActive={streak.graceDaysUsed > 0}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          searchResults={searchResults}
          onSelectSearchResult={handleSelectSearchResult}
        />

        {/* Main Content Area */}
        <main
          className={`flex-1 ${isSidebarCollapsed ? "lg:pl-20" : "lg:pl-72"} pt-4 pb-20 lg:pb-0 px-4 lg:px-8 max-w-[1600px] w-full mx-auto transition-[padding] duration-200`}
        >
          {activeTab === "dashboard" && (
            <DashboardPage
              metronomeBpm={metronomeBpm}
              onBpmChange={setMetronomeBpm}
              streak={streak}
              activeSessionDuration={activeSessionDuration}
              isSessionActive={isSessionActive}
              onToggleSession={handleToggleSession}
              onEndSession={handleEndSession}
              onLogBpm={handleLogBpm}
              settings={settings}
              onUpdateSettings={handleUpdateSettings}
              timer={timer}
              metronomeIsPlaying={metronomeIsPlaying}
              onMetronomePlayingChange={setMetronomeIsPlaying}
              metronomeBarCycleMode={metronomeBarCycleMode}
              onBarCycleModeChange={setMetronomeBarCycleMode}
              onOpenRoutine={() => setActiveTab("routine")}
            />
          )}

          {activeTab === "scales" && (
            <ScalesPage
              initialScaleTarget={pendingScaleSearch}
              onInitialScaleHandled={() => setPendingScaleSearch(null)}
              settings={settings}
            />
          )}

          {activeTab === "chords" && (
            <ChordsPage
              initialChordTarget={pendingChordSearch}
              onInitialChordHandled={() => setPendingChordSearch(null)}
              settings={settings}
            />
          )}

          {activeTab === "builder" && <BuilderPage settings={settings} />}

          {activeTab === "exercises" && (
            <ExercisesPage
              onStartExercisePractice={handleStartExercisePractice}
              initialExerciseId={pendingExerciseSearch}
              onInitialExerciseHandled={() => setPendingExerciseSearch(null)}
            />
          )}

          {activeTab === "routine" && (
            <RoutinePage
              timer={timer}
              streak={streak}
              activeSessionDuration={activeSessionDuration}
              isSessionActive={isSessionActive}
              onToggleSession={handleToggleSession}
              onEndSession={handleEndSession}
            />
          )}

          {activeTab === "tools" && (
            <ToolsPage
              metronomeBpm={metronomeBpm}
              onBpmChange={setMetronomeBpm}
              onLogBpm={handleLogBpm}
              settings={settings}
              onUpdateSettings={handleUpdateSettings}
              timer={timer}
              metronomeIsPlaying={metronomeIsPlaying}
              onMetronomePlayingChange={setMetronomeIsPlaying}
              metronomeBarCycleMode={metronomeBarCycleMode}
              onBarCycleModeChange={setMetronomeBarCycleMode}
            />
          )}

          {activeTab === "stats" && (
            <StatsPage sessions={sessions} streak={streak} />
          )}
        </main>

        {/* Settings Modal */}
        <SettingsModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          settings={settings}
          onUpdateSettings={handleUpdateSettings}
          onExportData={handleExportData}
          onClearData={handleClearData}
        />

        {/* Onboarding Tour */}
        {isTourOpen && (
          <TourOverlay
            onClose={handleCloseTour}
            onTabChange={setActiveTab}
            initialStep={tourStep}
            onStepChange={handleTourStepChange}
          />
        )}

        {/* Global Persistent Timer Toast */}
        {activeTab !== "dashboard" && activeTab !== "routine" && (
          <GlobalSessionToast
            activeSessionDuration={activeSessionDuration}
            isSessionActive={isSessionActive}
            onToggleSession={handleToggleSession}
            onEndSession={handleEndSession}
          />
        )}
      </div>
    </SettingsContext.Provider>
  );
}

export default App;
