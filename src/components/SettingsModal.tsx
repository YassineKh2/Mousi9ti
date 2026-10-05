import React, { useEffect, useRef, useState } from "react";
import {
  X,
  Volume2,
  Moon,
  Sun,
  Download,
  Trash2,
  Sliders,
  Guitar,
  Piano,
  RotateCcw,
  ListTodo,
  Database,
  Upload,
  FileUp,
  Github,
  Plus,
} from "lucide-react";
import { AppSettings, TaskCompletionBehavior } from "../types";
import { GUITAR_TUNINGS } from "../data/musicTheory";
import { APP_VERSION } from "../lib/version";
import {
  CUSTOM_TASK_TAGS_CHANGED_EVENT,
  CUSTOM_TAG_CATEGORIES,
  getSavedCustomTagEntries,
  rememberCustomTags,
  removeSavedCustomTag,
  setSavedCustomTagCategory,
  CustomTagCategory,
} from "../lib/customTaskTags";
import {
  AppBackup,
  BACKUP_CATEGORIES,
  BACKUP_CATEGORY_DESCRIPTIONS,
  BACKUP_CATEGORY_LABELS,
  BackupCategory,
  readAppBackupFile,
} from "../lib/appBackup";
import { ToggleSwitch } from "./ToggleSwitch";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onUpdateSettings: (newSettings: Partial<AppSettings>) => void;
  onExportData: () => void;
  onImportFullData: (backup: AppBackup) => void;
  onImportSelectedData: (
    backup: AppBackup,
    categories: BackupCategory[],
  ) => void;
  onClearData: () => void;
  onClearStatsData: () => void;
  onClearSavedChords: () => void;
  onRestartTour: () => void;
  completionBehavior: TaskCompletionBehavior;
  onUpdateCompletionBehavior: (behavior: TaskCompletionBehavior) => void;
  autoAdvanceTimedTasks: boolean;
  onToggleAutoAdvanceTimedTasks: (enabled: boolean) => void;
  autoAdvanceDelaySeconds: number;
  onChangeAutoAdvanceDelaySeconds: (seconds: number) => void;
  autoConfigureDashboardFromTask: boolean;
  onToggleAutoConfigureDashboardFromTask: (enabled: boolean) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  onExportData,
  onImportFullData,
  onImportSelectedData,
  onClearData,
  onClearStatsData,
  onClearSavedChords,
  onRestartTour,
  completionBehavior,
  onUpdateCompletionBehavior,
  autoAdvanceTimedTasks,
  onToggleAutoAdvanceTimedTasks,
  autoAdvanceDelaySeconds,
  onChangeAutoAdvanceDelaySeconds,
  autoConfigureDashboardFromTask,
  onToggleAutoConfigureDashboardFromTask,
}) => {
  const [activeTab, setActiveTab] = useState("general");
  const [customTags, setCustomTags] = useState(getSavedCustomTagEntries);
  const [newCustomTag, setNewCustomTag] = useState("");
  const [newCustomTagCategory, setNewCustomTagCategory] =
    useState<CustomTagCategory>("general");
  const [showSelectiveImport, setShowSelectiveImport] = useState(false);
  const [selectedImportCategories, setSelectedImportCategories] = useState<
    BackupCategory[]
  >([]);
  const [importError, setImportError] = useState("");
  const [notificationError, setNotificationError] = useState("");
  const importFileRef = useRef<HTMLInputElement>(null);
  const importModeRef = useRef<"full" | "selected" | null>(null);

  useEffect(() => {
    const refreshTags = () => setCustomTags(getSavedCustomTagEntries());
    window.addEventListener(CUSTOM_TASK_TAGS_CHANGED_EVENT, refreshTags);
    return () =>
      window.removeEventListener(CUSTOM_TASK_TAGS_CHANGED_EVENT, refreshTags);
  }, []);

  const createCustomTag = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const name = newCustomTag.trim();
    if (!name) return;
    rememberCustomTags(`@custom(${name})`);
    setCustomTags(setSavedCustomTagCategory(name, newCustomTagCategory));
    setNewCustomTag("");
  };

  const chooseImportFile = (mode: "full" | "selected") => {
    setImportError("");
    importModeRef.current = mode;
    importFileRef.current?.click();
  };

  const toggleTimerNotifications = async () => {
    if (settings.timerNotificationsEnabled) {
      onUpdateSettings({ timerNotificationsEnabled: false });
      setNotificationError("");
      return;
    }

    if (!("Notification" in window)) {
      setNotificationError("Desktop notifications are not supported here.");
      return;
    }

    const permission =
      Notification.permission === "default"
        ? await Notification.requestPermission()
        : Notification.permission;

    if (permission === "granted") {
      onUpdateSettings({ timerNotificationsEnabled: true });
      setNotificationError("");
    } else {
      setNotificationError(
        permission === "denied"
          ? "Notifications are blocked in your browser settings."
          : "Notification permission was not granted.",
      );
    }
  };

  const handleImportFile = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    const mode = importModeRef.current;
    event.target.value = "";
    if (!file || !mode) return;

    try {
      const backup = await readAppBackupFile(file);
      const exportedAt = new Date(backup.exportedAt);
      const dateLabel = Number.isNaN(exportedAt.getTime())
        ? backup.exportedAt
        : exportedAt.toLocaleString();

      if (mode === "full") {
        const confirmed = window.confirm(
          `Restore the FULL Mousi9ti backup exported ${dateLabel}? This replaces all current app data in this browser with the backup, including stats, chords, practice data, tasks, progressions, settings, and preferences. Current data will be permanently overwritten. Continue?`,
        );
        if (confirmed) onImportFullData(backup);
        return;
      }

      if (selectedImportCategories.length === 0) {
        setImportError("Select at least one data category to import.");
        return;
      }

      const categoryNames = selectedImportCategories
        .map((category) => BACKUP_CATEGORY_LABELS[category])
        .join(", ");
      const confirmed = window.confirm(
        `Import ${categoryNames} from the backup exported ${dateLabel}? The selected categories will replace their current data. Other categories will remain unchanged. Continue?`,
      );
      if (confirmed) onImportSelectedData(backup, selectedImportCategories);
    } catch (error) {
      setImportError(
        error instanceof Error ? error.message : "Could not read this backup.",
      );
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="flex h-[85vh] max-h-[calc(100dvh-2rem)] min-h-0 w-full max-w-3xl flex-col overflow-hidden rounded-xl border border-outline-variant/30 bg-surface shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant/30">
          <div className="flex items-center gap-2.5">
            <Sliders size={18} className="text-primary" />
            <h2 className="font-mono text-sm font-bold tracking-wider text-on-surface uppercase">
              Studio Configuration
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-on-surface/5 flex items-center justify-center text-on-surface-variant hover:text-on-surface transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div
          role="tablist"
          aria-label="Settings categories"
          className="grid grid-cols-1 border-b border-outline-variant/30 bg-surface-container/40 px-3 sm:grid-cols-4 sm:px-6"
        >
          {[
            { id: "general", label: "General", Icon: Sliders },
            { id: "tasks", label: "Tasks", Icon: ListTodo },
            {
              id: "instrument",
              label: "Instrument",
              compactLabel: "Gear",
              Icon: Guitar,
            },
            { id: "data", label: "Data", Icon: Database },
          ].map(({ id, label, compactLabel, Icon }) => (
            <button
              key={id}
              id={`settings-tab-${id}`}
              type="button"
              role="tab"
              aria-selected={activeTab === id}
              aria-controls="settings-tab-panel"
              onClick={() => {
                if (id === "tasks") setCustomTags(getSavedCustomTagEntries());
                setActiveTab(id);
              }}
              className={`flex min-h-10 items-center justify-start gap-2 border-b-2 px-3 text-[11px] font-mono transition-colors sm:min-h-12 sm:justify-center sm:gap-2 sm:px-2 sm:text-xs ${
                activeTab === id
                  ? "border-primary text-primary"
                  : "border-transparent text-on-surface-variant hover:text-on-surface"
              }`}
            >
              <Icon size={15} className="hidden sm:block" />
              <span className="sm:hidden">{compactLabel || label}</span>
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </div>

        {/* Modal Body */}
        <div
          id="settings-tab-panel"
          role="tabpanel"
          aria-labelledby={`settings-tab-${activeTab}`}
          className="min-h-0 flex-1 space-y-6 overflow-y-auto p-5 sm:p-6"
        >
          <span
            className={
              activeTab === "general"
                ? "font-mono text-xs font-semibold text-on-surface-variant block uppercase tracking-wider"
                : "hidden"
            }
          >
            General
          </span>

          {/* Master Volume */}
          <div className={activeTab === "general" ? "space-y-2" : "hidden"}>
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-on-surface-variant font-bold flex items-center gap-2">
                <Volume2 size={14} className="text-primary" />
                Master Synthesis Volume
              </span>
              <span className="text-primary font-bold">
                {Math.round(settings.soundVolume * 100)}%
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={settings.soundVolume}
              onChange={(e) =>
                onUpdateSettings({ soundVolume: parseFloat(e.target.value) })
              }
              className="w-full h-1.5 bg-surface-container-highest rounded-lg appearance-none cursor-pointer accent-primary"
            />
          </div>

          <span
            className={
              activeTab === "tasks"
                ? "font-mono text-xs font-semibold text-on-surface-variant block uppercase tracking-wider"
                : "hidden"
            }
          >
            Tasks
          </span>

          {/* Daily Task Completion */}
          <div
            className={activeTab === "tasks" ? "flex flex-col gap-3" : "hidden"}
          >
            <div>
              <span className="font-mono text-xs font-semibold text-on-surface block">
                Daily Task Completion
              </span>
              <span className="text-[11px] text-on-surface-variant">
                Choose what happens to the Practice Tracker after the last task.
              </span>
            </div>
            <select
              value={completionBehavior}
              onChange={(event) =>
                onUpdateCompletionBehavior(
                  event.target.value as TaskCompletionBehavior,
                )
              }
              className="w-full rounded-lg border border-outline-variant/30 bg-surface-container px-3 py-2 font-mono text-xs text-on-surface outline-none transition-colors focus:border-primary"
              aria-label="Daily task completion behavior"
            >
              <option value="stop">Stop Practice Tracker automatically</option>
              <option value="continue">Keep Practice Tracker running</option>
              <option value="ask">Ask me every time</option>
            </select>
          </div>

          <div
            className={
              activeTab === "tasks"
                ? "space-y-3 border-t border-outline-variant/20 pt-4"
                : "hidden"
            }
          >
            <div className="flex items-center justify-between gap-4">
              <div>
                <span className="font-mono text-xs font-semibold text-on-surface block">
                  Auto-advance Timed Tasks
                </span>
                <span className="text-[11px] text-on-surface-variant">
                  Start the next task automatically when its timer ends.
                </span>
              </div>
              <ToggleSwitch
                checked={autoAdvanceTimedTasks}
                label="Auto-advance Timed Tasks"
                onChange={onToggleAutoAdvanceTimedTasks}
              />
            </div>
            <label className="flex items-center justify-between gap-3">
              <span className="font-mono text-xs text-on-surface-variant">
                Wait before next task
              </span>
              <select
                value={autoAdvanceDelaySeconds}
                onChange={(event) =>
                  onChangeAutoAdvanceDelaySeconds(Number(event.target.value))
                }
                aria-label="Delay before advancing to the next task"
                className="rounded-md border border-outline-variant/40 bg-surface-container-high px-3 py-2 font-mono text-xs text-on-surface outline-none focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary/40"
              >
                <option value={0}>Immediately</option>
                <option value={3}>3 seconds</option>
                <option value={5}>5 seconds</option>
                <option value={10}>10 seconds</option>
                <option value={15}>15 seconds</option>
                <option value={30}>30 seconds</option>
              </select>
            </label>
          </div>

          {/* Automatic Task Setup */}
          <div
            className={
              activeTab === "tasks"
                ? "flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-outline-variant/20 pt-4"
                : "hidden"
            }
          >
            <div>
              <span className="font-mono text-xs font-semibold text-on-surface block">
                Automatic Task Setup
              </span>
              <span className="text-[11px] text-on-surface-variant">
                Automatically configure the dashboard from the active task
                (scale, tempo, duration).
              </span>
            </div>
            <div className="flex items-center self-start sm:self-auto gap-1 bg-surface-container p-1 rounded-lg border border-outline-variant/30 shrink-0">
              <button
                onClick={() => onToggleAutoConfigureDashboardFromTask(false)}
                className={`px-3 py-1.5 rounded text-xs font-mono transition-all ${
                  !autoConfigureDashboardFromTask
                    ? "bg-primary text-on-primary font-bold"
                    : "text-on-surface-variant hover:text-on-surface"
                }`}
              >
                Disabled
              </button>
              <button
                onClick={() => onToggleAutoConfigureDashboardFromTask(true)}
                className={`px-3 py-1.5 rounded text-xs font-mono transition-all ${
                  autoConfigureDashboardFromTask
                    ? "bg-primary text-on-primary font-bold"
                    : "text-on-surface-variant hover:text-on-surface"
                }`}
              >
                Enabled
              </button>
            </div>
          </div>

          <section
            aria-labelledby="task-tag-colors-heading"
            className={
              activeTab === "tasks"
                ? "flex flex-col gap-3 border-t border-outline-variant/20 pt-4 sm:flex-row sm:items-center sm:justify-between"
                : "hidden"
            }
          >
            <div>
              <h3
                id="task-tag-colors-heading"
                className="font-mono text-xs font-semibold text-on-surface"
              >
                Daily Task Tag Colors
              </h3>
              <p className="mt-1 text-[11px] text-on-surface-variant">
                Show every task tag in the simple gray style or in full color.
              </p>
            </div>
            <div className="flex items-center self-start sm:self-auto gap-1 bg-surface-container p-1 rounded-lg border border-outline-variant/30 shrink-0">
              <button
                type="button"
                aria-pressed={!settings.taskTagsColored}
                onClick={() => onUpdateSettings({ taskTagsColored: false })}
                className={`px-3 py-1.5 rounded text-xs font-mono transition-all ${
                  !settings.taskTagsColored
                    ? "bg-primary text-on-primary font-bold"
                    : "text-on-surface-variant hover:text-on-surface"
                }`}
              >
                Gray
              </button>
              <button
                type="button"
                aria-pressed={settings.taskTagsColored}
                onClick={() => onUpdateSettings({ taskTagsColored: true })}
                className={`px-3 py-1.5 rounded text-xs font-mono transition-all ${
                  settings.taskTagsColored
                    ? "bg-primary text-on-primary font-bold"
                    : "text-on-surface-variant hover:text-on-surface"
                }`}
              >
                Colored
              </button>
            </div>
          </section>

          <details
            aria-labelledby="custom-task-tags-heading"
            open
            className={
              activeTab === "tasks"
                ? "space-y-4 border-t border-outline-variant/20 pt-4"
                : "hidden"
            }
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
              <span className="font-mono text-sm font-semibold text-on-surface">
                <span id="custom-task-tags-heading">Custom Tags</span>
                <span className="ml-2 font-normal text-on-surface-variant">
                  ({customTags.length})
                </span>
              </span>
              <span className="text-xs text-on-surface-variant">Manage</span>
            </summary>
            <p className="text-xs text-on-surface-variant">
              Create tags for your practice tasks, organize them, or remove them
              from suggestions.
            </p>
            <form
              onSubmit={createCustomTag}
              className="rounded-lg border border-outline-variant/30 bg-surface-container-low p-3 font-mono"
            >
              <label
                htmlFor="new-custom-task-tag"
                className="mb-2 block text-xs font-semibold text-on-surface"
              >
                New tag
              </label>
              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  id="new-custom-task-tag"
                  value={newCustomTag}
                  onChange={(event) => setNewCustomTag(event.target.value)}
                  placeholder="e.g. Sight reading"
                  maxLength={48}
                  className="min-w-0 flex-1 rounded-md border border-outline-variant/40 bg-surface-container-lowest px-3 py-2 text-sm text-on-surface outline-none placeholder:text-on-surface-variant/70 focus:border-primary focus:ring-1 focus:ring-primary/40"
                />
                <button
                  type="submit"
                  disabled={!newCustomTag.trim()}
                  className="flex items-center justify-center gap-1.5 rounded-md bg-primary px-3 py-2 text-xs font-semibold text-on-primary transition-colors hover:bg-primary-container disabled:cursor-not-allowed disabled:opacity-45"
                >
                  <Plus size={14} />
                  Add tag
                </button>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                <span className="mr-1 text-[10px] font-semibold uppercase text-on-surface-variant">
                  Category
                </span>
                {CUSTOM_TAG_CATEGORIES.map((category) => (
                  <button
                    key={category}
                    type="button"
                    aria-pressed={newCustomTagCategory === category}
                    onClick={() => setNewCustomTagCategory(category)}
                    className={`rounded-md border px-2.5 py-1 text-xs capitalize transition-colors ${
                      newCustomTagCategory === category
                        ? "border-primary/50 bg-primary/15 font-semibold text-primary"
                        : "border-outline-variant/30 text-on-surface-variant hover:border-outline-variant hover:text-on-surface"
                    }`}
                  >
                    {category}
                  </button>
                ))}
              </div>
            </form>
            {customTags.length > 0 ? (
              <ul
                className="space-y-2 font-mono"
                aria-label="Saved custom tags"
              >
                {customTags.map((tag) => (
                  <li
                    key={tag.name}
                    className="flex flex-col gap-3 rounded-lg border border-outline-variant/25 bg-surface-container-low px-3 py-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <span className="min-w-0 wrap-break-word font-medium text-on-surface">
                      {tag.name}
                    </span>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {CUSTOM_TAG_CATEGORIES.map((category) => (
                        <button
                          key={category}
                          type="button"
                          aria-label={`${category} category for ${tag.name}`}
                          aria-pressed={tag.category === category}
                          onClick={() =>
                            setCustomTags(
                              setSavedCustomTagCategory(tag.name, category),
                            )
                          }
                          className={`rounded-md border px-2 py-1 text-[10px] capitalize transition-colors ${
                            tag.category === category
                              ? "border-primary/50 bg-primary/15 font-semibold text-primary"
                              : "border-outline-variant/25 text-on-surface-variant hover:border-outline-variant hover:text-on-surface"
                          }`}
                        >
                          {category}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => {
                          removeSavedCustomTag(tag.name);
                          setCustomTags(getSavedCustomTagEntries());
                        }}
                        aria-label={`Remove ${tag.name} from saved task tags`}
                        title={`Remove ${tag.name}`}
                        className="ml-1 flex h-8 w-8 items-center justify-center rounded-md text-on-surface-variant transition-colors hover:bg-error/15 hover:text-error"
                      >
                        <X size={15} />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="rounded border border-dashed border-outline-variant/40 px-3 py-4 text-center font-mono text-[11px] text-on-surface-variant">
                No custom tags saved yet.
              </p>
            )}
          </details>

          {/* Theme Toggle */}
          <div
            className={
              activeTab === "general"
                ? "flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-outline-variant/20"
                : "hidden"
            }
          >
            <div>
              <span className="font-mono text-xs font-semibold text-on-surface block">
                App Theme
              </span>
              <span className="text-[11px] text-on-surface-variant">
                Switch between dark and light mode
              </span>
            </div>

            <div className="flex items-center self-start sm:self-auto gap-1 bg-surface-container p-1 rounded-lg border border-outline-variant/30 shrink-0">
              <button
                onClick={() => onUpdateSettings({ theme: "dark" })}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-mono transition-all ${
                  settings.theme === "dark"
                    ? "bg-primary text-on-primary font-bold"
                    : "text-on-surface-variant hover:text-on-surface"
                }`}
              >
                <Moon size={13} />
                <span>Dark</span>
              </button>
              <button
                onClick={() => onUpdateSettings({ theme: "light" })}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-mono transition-all ${
                  settings.theme === "light"
                    ? "bg-primary text-on-primary font-bold"
                    : "text-on-surface-variant hover:text-on-surface"
                }`}
              >
                <Sun size={13} />
                <span>Light</span>
              </button>
            </div>
          </div>

          <div
            className={
              activeTab === "general"
                ? "flex flex-col gap-3 border-t border-outline-variant/20 pt-4 sm:flex-row sm:items-center sm:justify-between"
                : "hidden"
            }
          >
            <div>
              <span className="font-mono text-xs font-semibold text-on-surface block">
                Restart Tour
              </span>
              <span className="text-[11px] text-on-surface-variant">
                Start the introductory walkthrough again.
              </span>
            </div>
            <button
              onClick={() => {
                onClose();
                onRestartTour();
              }}
              className="flex shrink-0 items-center gap-1.5 rounded border border-outline-variant/30 bg-surface-container px-3.5 py-2 font-mono text-xs text-on-surface transition-colors hover:bg-surface-container-high"
            >
              <RotateCcw size={14} />
              Restart Tour
            </button>
          </div>

          <span
            className={
              activeTab === "instrument"
                ? "font-mono text-xs font-semibold text-on-surface-variant block uppercase tracking-wider"
                : "hidden"
            }
          >
            Instrument
          </span>

          {/* Default Instrument */}
          <div
            className={
              activeTab === "instrument"
                ? "flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                : "hidden"
            }
          >
            <div>
              <span className="font-mono text-xs font-semibold text-on-surface block">
                Default Instrument
              </span>
              <span className="text-[11px] text-on-surface-variant">
                Used as the starting instrument across the app
              </span>
            </div>

            <div className="flex items-center self-start sm:self-auto gap-1 bg-surface-container p-1 rounded-lg border border-outline-variant/30 shrink-0">
              <button
                onClick={() =>
                  onUpdateSettings({ defaultInstrument: "guitar" })
                }
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-mono transition-all ${
                  settings.defaultInstrument === "guitar"
                    ? "bg-primary text-on-primary font-bold"
                    : "text-on-surface-variant hover:text-on-surface"
                }`}
              >
                <Guitar size={13} />
                <span>Guitar</span>
              </button>
              <button
                onClick={() => onUpdateSettings({ defaultInstrument: "piano" })}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-mono transition-all ${
                  settings.defaultInstrument === "piano"
                    ? "bg-primary text-on-primary font-bold"
                    : "text-on-surface-variant hover:text-on-surface"
                }`}
              >
                <Piano size={13} />
                <span>Piano</span>
              </button>
            </div>
          </div>

          {/* Instrument Size */}
          <div
            className={
              activeTab === "instrument"
                ? "space-y-2 pt-2 border-t border-outline-variant/20"
                : "hidden"
            }
          >
            <label className="font-mono text-xs font-semibold text-on-surface block">
              Instrument Size (Notes/Keys)
            </label>
            {(() => {
              const sizes = ["small", "medium", "large", "xlarge"] as const;
              const labels = ["Small", "Medium", "Large", "X-Large"];
              const currentIndex = sizes.indexOf(
                settings.fretboardNoteSize || "medium",
              );

              return (
                <div className="px-1">
                  <input
                    type="range"
                    min="0"
                    max="3"
                    step="1"
                    value={currentIndex >= 0 ? currentIndex : 1}
                    onChange={(e) => {
                      const newIndex = parseInt(e.target.value, 10);
                      onUpdateSettings({
                        fretboardNoteSize: sizes[newIndex],
                      });
                    }}
                    className="w-full h-1.5 bg-surface-container-highest rounded-lg appearance-none cursor-pointer accent-primary"
                  />
                  <div className="flex justify-between mt-2 text-[10px] font-mono text-on-surface-variant px-1">
                    {labels.map((label, idx) => (
                      <span
                        key={label}
                        className={
                          currentIndex === idx ? "text-primary font-bold" : ""
                        }
                      >
                        {label}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Default Guitar Tuning */}
          <div
            className={
              activeTab === "instrument"
                ? "space-y-1.5 pt-2 border-t border-outline-variant/20"
                : "hidden"
            }
          >
            <label className="font-mono text-xs font-semibold text-on-surface block">
              Default Guitar Tuning
            </label>
            <select
              value={settings.defaultTuning}
              onChange={(e) =>
                onUpdateSettings({ defaultTuning: e.target.value })
              }
              className="w-full bg-surface-container border border-outline-variant/30 rounded-lg px-3 py-2 text-xs font-mono text-on-surface focus:outline-none focus:border-primary"
            >
              {GUITAR_TUNINGS.map((t) => (
                <option key={t.name} value={t.name}>
                  {t.name} ({t.strings.join(" ")})
                </option>
              ))}
            </select>
          </div>

          {/* Fret Count */}
          <div
            className={
              activeTab === "instrument"
                ? "space-y-1.5 pt-2 border-t border-outline-variant/20"
                : "hidden"
            }
          >
            <label className="font-mono text-xs font-semibold text-on-surface block">
              Fretboard Length
            </label>
            <div className="grid grid-cols-5 gap-2">
              {[12, 15, 21, 22, 24].map((cnt) => (
                <button
                  key={cnt}
                  onClick={() => onUpdateSettings({ fretCount: cnt })}
                  className={`py-2 rounded font-mono text-xs border transition-all ${
                    settings.fretCount === cnt
                      ? "bg-primary text-on-primary border-primary font-bold"
                      : "bg-surface-container border-outline-variant/30 text-on-surface-variant hover:text-on-surface"
                  }`}
                >
                  {cnt} Frets
                </button>
              ))}
            </div>
          </div>

          {/* Metronome Sound */}
          <div
            className={
              activeTab === "general"
                ? "space-y-1.5 pt-2 border-t border-outline-variant/20"
                : "hidden"
            }
          >
            <label className="font-mono text-xs font-semibold text-on-surface block">
              Default Metronome Timbre
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {(["click", "woodblock", "tick", "beep"] as const).map(
                (sound) => (
                  <button
                    key={sound}
                    onClick={() => onUpdateSettings({ metronomeSound: sound })}
                    className={`py-2 px-1 rounded font-mono text-[11px] uppercase border transition-all ${
                      settings.metronomeSound === sound
                        ? "bg-primary text-on-primary border-primary font-bold"
                        : "bg-surface-container border-outline-variant/30 text-on-surface-variant hover:text-on-surface"
                    }`}
                  >
                    {sound}
                  </button>
                ),
              )}
            </div>
          </div>

          <section
            className={
              activeTab === "general"
                ? "flex flex-col gap-4 border-t border-outline-variant/20 pt-4"
                : "hidden"
            }
            aria-label="Timer behavior"
          >
            <div className="flex items-center justify-between gap-4">
              <div>
                <span className="font-mono text-xs font-semibold text-on-surface block">
                  Stop Metronome When Timer Ends
                </span>
                <span className="text-[11px] text-on-surface-variant">
                  Stop playback automatically when a timed practice finishes.
                </span>
              </div>
              <ToggleSwitch
                checked={settings.stopMetronomeOnTimerEnd}
                label="Stop metronome when timer ends"
                onChange={(checked) =>
                  onUpdateSettings({ stopMetronomeOnTimerEnd: checked })
                }
              />
            </div>

            <div className="flex items-center justify-between gap-4 border-t border-outline-variant/20 pt-4">
              <div>
                <span className="font-mono text-xs font-semibold text-on-surface block">
                  Desktop Timer Notifications
                </span>
                <span className="text-[11px] text-on-surface-variant">
                  Show a notification when a timer finishes. Browser permission
                  is required.
                </span>
                {notificationError && (
                  <span
                    className="mt-1 block text-[11px] text-error"
                    role="status"
                  >
                    {notificationError}
                  </span>
                )}
              </div>
              <ToggleSwitch
                checked={settings.timerNotificationsEnabled}
                label="Enable desktop timer notifications"
                onChange={() => void toggleTimerNotifications()}
              />
            </div>
          </section>

          {/* Fretboard Theme */}
          <div
            className={
              activeTab === "instrument"
                ? "space-y-1.5 pt-4 border-t border-outline-variant/20"
                : "hidden"
            }
          >
            <span className="font-mono text-xs font-semibold text-on-surface-variant block uppercase tracking-wider">
              Fretboard Design
            </span>
            <label className="font-mono text-xs font-semibold text-on-surface block mt-2">
              Visual Theme
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {(
                [
                  {
                    id: "original",
                    label: "Original",
                    bgClass: "bg-surface-container-highest/60",
                    borderClass: "border-outline-variant/40",
                    stringClass: "bg-outline-variant",
                  },
                  {
                    id: "ebony",
                    label: "Ebony",
                    bgClass:
                      "bg-[#252525] bg-gradient-to-b from-[#2a2a2a] to-[#202020]",
                    borderClass: "border-[#404040]",
                    stringClass: "bg-outline-variant",
                  },
                  {
                    id: "maple",
                    label: "Maple",
                    bgClass:
                      "bg-[#e8d5b5] bg-gradient-to-b from-[#ebd9bb] to-[#dfcbad]",
                    borderClass: "border-black/20",
                    stringClass: "bg-black/60",
                  },
                  {
                    id: "rosewood",
                    label: "Rosewood",
                    bgClass:
                      "bg-[#4a2618] bg-gradient-to-b from-[#4f291a] to-[#402114]",
                    borderClass: "border-[#d1b09b]/30",
                    stringClass: "bg-[#d1b09b]/60",
                  },
                  {
                    id: "high-contrast",
                    label: "High Contrast",
                    bgClass: "bg-black",
                    borderClass: "border-white",
                    stringClass: "bg-white",
                  },
                ] as const
              ).map((themeOption) => (
                <button
                  key={themeOption.id}
                  onClick={() =>
                    onUpdateSettings({ fretboardTheme: themeOption.id })
                  }
                  className={`flex flex-col items-center gap-2 p-2 rounded-lg border transition-all ${
                    settings.fretboardTheme === themeOption.id
                      ? "bg-primary/5 border-primary shadow-sm ring-1 ring-primary"
                      : "bg-surface border-outline-variant/30 hover:border-primary/50"
                  }`}
                >
                  <div
                    className={`w-full h-10 rounded border ${themeOption.bgClass} ${themeOption.borderClass} relative overflow-hidden flex flex-col justify-evenly shadow-inner`}
                  >
                    {/* Tiny decorative inlays */}
                    <div className="absolute inset-0 flex items-center justify-center opacity-50">
                      <div
                        className={`w-1.5 h-1.5 rounded-full ${themeOption.id === "high-contrast" ? "bg-white" : "bg-current"} ${themeOption.id === "maple" ? "text-black/30" : "text-white/30"}`}
                      ></div>
                    </div>
                    {/* Strings */}
                    <div
                      className={`w-full h-px ${themeOption.stringClass} opacity-80`}
                    ></div>
                    <div
                      className={`w-full h-px ${themeOption.stringClass} opacity-80`}
                    ></div>
                    <div
                      className={`w-full h-px ${themeOption.stringClass} opacity-80`}
                    ></div>
                    <div
                      className={`w-full h-px ${themeOption.stringClass} opacity-80`}
                    ></div>
                  </div>
                </button>
              ))}
            </div>

            {/* Color Vision Mode */}
            <div className="mt-4 space-y-1.5">
              <label className="font-mono text-xs font-semibold text-on-surface block">
                Color Vision Mode
              </label>
              <span className="text-[10px] text-on-surface-variant mb-2 block">
                Enhance visual accessibility using shapes and contrast
              </span>
              <div className="grid grid-cols-3 gap-2">
                {(
                  [
                    { id: "default", label: "Default" },
                    { id: "colorblind", label: "Colorblind-Safe" },
                    { id: "monochrome", label: "Monochrome" },
                  ] as const
                ).map((modeOption) => (
                  <button
                    key={modeOption.id}
                    onClick={() =>
                      onUpdateSettings({ fretboardColorMode: modeOption.id })
                    }
                    className={`py-2 px-1 rounded font-mono text-[11px] border transition-all ${
                      settings.fretboardColorMode === modeOption.id
                        ? "bg-primary text-on-primary border-primary font-bold shadow-sm"
                        : "bg-surface-container border-outline-variant/30 text-on-surface-variant hover:text-on-surface hover:border-primary/50"
                    }`}
                  >
                    {modeOption.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Marker Shape */}
            <div className="mt-4 space-y-1.5">
              <label className="font-mono text-xs font-semibold text-on-surface block">
                Note Marker Shape
              </label>
              <span className="text-[10px] text-on-surface-variant mb-2 block">
                Shape is kept uniform across all sizes
              </span>
              <div className="grid grid-cols-2 gap-2">
                {(
                  [
                    { id: "round", label: "Rounded" },
                    { id: "square", label: "Square" },
                  ] as const
                ).map((shapeOption) => (
                  <button
                    key={shapeOption.id}
                    onClick={() =>
                      onUpdateSettings({ fretboardMarkerShape: shapeOption.id })
                    }
                    className={`flex items-center justify-center gap-2 py-2 px-1 rounded font-mono text-[11px] border transition-all ${
                      (settings.fretboardMarkerShape || "round") ===
                      shapeOption.id
                        ? "bg-primary text-on-primary border-primary font-bold shadow-sm"
                        : "bg-surface-container border-outline-variant/30 text-on-surface-variant hover:text-on-surface hover:border-primary/50"
                    }`}
                  >
                    <span
                      className={`w-3 h-3 shrink-0 ${shapeOption.id === "square" ? "rounded-[3px]" : "rounded-full"} ${
                        (settings.fretboardMarkerShape || "round") ===
                        shapeOption.id
                          ? "bg-on-primary"
                          : "bg-on-surface-variant"
                      }`}
                    />
                    {shapeOption.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between gap-4">
              <div>
                <span className="font-mono text-xs font-semibold text-on-surface block">
                  Color Every Guitar Note
                </span>
                <span className="text-[10px] text-on-surface-variant">
                  Give each of the 12 pitches its own color on the fretboard
                </span>
              </div>
              <ToggleSwitch
                checked={settings.fretboardNotesColored}
                label="Color every guitar note"
                onChange={(checked) =>
                  onUpdateSettings({ fretboardNotesColored: checked })
                }
              />
            </div>

            <div className="mt-4 flex flex-col gap-3">
              <div className="flex items-center justify-between group">
                <div>
                  <span className="font-mono text-xs font-semibold text-on-surface block group-hover:text-primary transition-colors">
                    Minimal Details
                  </span>
                  <span className="text-[10px] text-on-surface-variant">
                    Hide fret inlays, clean background, thinner lines
                  </span>
                </div>
                <ToggleSwitch
                  checked={settings.fretboardMinimalDetails}
                  label="Minimal Details"
                  onChange={(checked) =>
                    onUpdateSettings({ fretboardMinimalDetails: checked })
                  }
                />
              </div>
            </div>
          </div>
          {/* Backup and Import */}
          <div className={activeTab === "data" ? "space-y-3" : "hidden"}>
            <span className="font-mono text-xs font-semibold text-on-surface-variant uppercase tracking-wider block">
              Backup & Restore
            </span>

            <section className="flex flex-col gap-3  border-outline-variant/20 pt-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="font-mono text-xs font-semibold text-on-surface">
                  Export Full Backup
                </h3>
                <p className="mt-1 text-[11px] text-on-surface-variant">
                  Downloads a JSON file containing every saved data category.
                </p>
              </div>
              <button
                onClick={onExportData}
                className="flex shrink-0 items-center justify-center gap-1.5 rounded border border-outline-variant/30 bg-surface-container px-3.5 py-2 font-mono text-xs text-on-surface transition-colors hover:bg-surface-container-high"
              >
                <Download size={14} />
                Export Backup
              </button>
            </section>

            <section className="flex flex-col gap-3 border-t border-outline-variant/20 pt-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="font-mono text-xs font-semibold text-on-surface">
                  Import Full Backup
                </h3>
                <p className="mt-1 text-[11px] text-on-surface-variant">
                  Replaces all current app data with the chosen backup.
                </p>
              </div>
              <button
                onClick={() => chooseImportFile("full")}
                className="flex shrink-0 items-center justify-center gap-1.5 rounded border border-outline-variant/30 bg-surface-container px-3.5 py-2 font-mono text-xs text-on-surface transition-colors hover:bg-surface-container-high"
              >
                <Upload size={14} />
                Import Backup
              </button>
            </section>

            <section className="flex flex-col gap-3 border-t border-outline-variant/20 pt-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="font-mono text-xs font-semibold text-on-surface">
                  Import Selected Parts
                </h3>
                <p className="mt-1 text-[11px] text-on-surface-variant">
                  Choose categories to replace while keeping other data intact.
                </p>
              </div>
              <button
                onClick={() => {
                  setShowSelectiveImport((visible) => !visible);
                  setImportError("");
                }}
                aria-expanded={showSelectiveImport}
                className="flex shrink-0 items-center justify-center gap-1.5 rounded border border-outline-variant/30 bg-surface-container px-3.5 py-2 font-mono text-xs text-on-surface transition-colors hover:bg-surface-container-high"
              >
                <FileUp size={14} />
                {showSelectiveImport ? "Hide Categories" : "Choose Categories"}
              </button>
            </section>

            <input
              ref={importFileRef}
              type="file"
              accept=".json,application/json"
              className="hidden"
              onChange={handleImportFile}
              aria-label="Choose a Mousi9ti backup file"
            />

            {showSelectiveImport && (
              <div className="space-y-3 rounded-lg border border-outline-variant/30 bg-surface-container/50 p-3 sm:p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h3 className="font-mono text-xs font-semibold text-on-surface">
                      Choose data to import
                    </h3>
                    <p className="mt-1 text-[11px] text-on-surface-variant">
                      Selected categories replace their current data. Everything
                      else stays unchanged.
                    </p>
                  </div>
                  <div className="flex items-center gap-3 font-mono text-[10px]">
                    <span className="text-on-surface-variant">
                      {selectedImportCategories.length} of{" "}
                      {BACKUP_CATEGORIES.length} selected
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedImportCategories([...BACKUP_CATEGORIES])
                      }
                      className="text-primary transition-colors hover:text-on-surface"
                    >
                      Select all
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedImportCategories([])}
                      className="text-on-surface-variant transition-colors hover:text-on-surface"
                    >
                      Clear
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {BACKUP_CATEGORIES.map((category) => (
                    <label
                      key={category}
                      className={`flex cursor-pointer items-start gap-3 rounded border p-3 transition-colors ${
                        selectedImportCategories.includes(category)
                          ? "border-primary/50 bg-primary/10"
                          : "border-outline-variant/30 bg-surface hover:border-outline-variant/60"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedImportCategories.includes(category)}
                        aria-describedby={`backup-category-${category}`}
                        onChange={(event) =>
                          setSelectedImportCategories((selected) =>
                            event.target.checked
                              ? [...selected, category]
                              : selected.filter((item) => item !== category),
                          )
                        }
                        className="mt-0.5 h-4 w-4 shrink-0 accent-primary"
                      />
                      <span className="min-w-0">
                        <span className="block font-mono text-xs font-semibold text-on-surface">
                          {BACKUP_CATEGORY_LABELS[category]}
                        </span>
                        <span
                          id={`backup-category-${category}`}
                          className="mt-1 block text-[10px] leading-relaxed text-on-surface-variant"
                        >
                          {BACKUP_CATEGORY_DESCRIPTIONS[category]}
                        </span>
                      </span>
                    </label>
                  ))}
                </div>
                <div className="flex flex-col gap-2 border-t border-outline-variant/20 pt-3 sm:flex-row sm:items-center sm:justify-between">
                  <span className="text-[10px] text-on-surface-variant">
                    You will review the replacement scope before import.
                  </span>
                  <button
                    type="button"
                    onClick={() => chooseImportFile("selected")}
                    disabled={selectedImportCategories.length === 0}
                    className="flex items-center justify-center gap-1.5 rounded border border-primary/40 bg-primary/10 px-3.5 py-2 font-mono text-xs text-primary transition-colors hover:bg-primary/20 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <FileUp size={14} />
                    Choose Backup File
                  </button>
                </div>
              </div>
            )}

            {importError && (
              <p role="alert" className="text-xs text-error">
                {importError}
              </p>
            )}
          </div>

          <section
            aria-labelledby="delete-stats-heading"
            className={
              activeTab === "data"
                ? "flex flex-col gap-3 border-t border-outline-variant/20 pt-4 sm:flex-row sm:items-center sm:justify-between"
                : "hidden"
            }
          >
            <div>
              <h3
                id="delete-stats-heading"
                className="font-mono text-xs font-semibold text-on-surface"
              >
                Delete Stats Data
              </h3>
              <p className="mt-1 text-[11px] text-on-surface-variant">
                Removes session and activity history, streaks, and saved task
                time totals. Tasks and saved chords stay. An active session
                continues and can create new stats.
              </p>
            </div>
            <button
              onClick={() => {
                if (
                  window.confirm(
                    "Delete saved statistics permanently? This removes session history, streak history, task and practice activity logs, and saved task time records. Your tasks, settings, and saved chords stay. Any active session continues and may create new statistics. EVERYTHING IS PERMANENT for the data being deleted. Continue?",
                  )
                ) {
                  onClearStatsData();
                }
              }}
              className="flex shrink-0 items-center justify-center gap-1.5 rounded border border-error/40 bg-error/10 px-3.5 py-2 font-mono text-xs text-error transition-colors hover:bg-error/20"
            >
              <Trash2 size={14} />
              Delete Stats
            </button>
          </section>

          <section
            aria-labelledby="delete-saved-chords-heading"
            className={
              activeTab === "data"
                ? "flex flex-col gap-3 border-t border-outline-variant/20 pt-4 sm:flex-row sm:items-center sm:justify-between"
                : "hidden"
            }
          >
            <div>
              <h3
                id="delete-saved-chords-heading"
                className="font-mono text-xs font-semibold text-on-surface"
              >
                Delete Saved Chords
              </h3>
              <p className="mt-1 text-[11px] text-on-surface-variant">
                Removes custom guitar and piano chords, saved chord selections,
                and saved builder progressions. Tasks and stats stay.
              </p>
            </div>
            <button
              onClick={() => {
                if (
                  window.confirm(
                    "Delete all saved chord data permanently? This removes custom guitar and piano chords, saved chord selections, and saved builder progressions. Your tasks, statistics, and settings stay. EVERYTHING IS PERMANENT and cannot be recovered. Continue?",
                  )
                ) {
                  onClearSavedChords();
                }
              }}
              className="flex shrink-0 items-center justify-center gap-1.5 rounded border border-error/40 bg-error/10 px-3.5 py-2 font-mono text-xs text-error transition-colors hover:bg-error/20"
            >
              <Trash2 size={14} />
              Delete Saved Chords
            </button>
          </section>

          <section
            aria-labelledby="delete-all-data-heading"
            className={
              activeTab === "data"
                ? "flex flex-col gap-3 border-t border-outline-variant/20 pt-4 sm:flex-row sm:items-center sm:justify-between"
                : "hidden"
            }
          >
            <div>
              <h3
                id="delete-all-data-heading"
                className="font-mono text-xs font-semibold text-on-surface"
              >
                Delete All Data
              </h3>
              <p className="mt-1 text-[11px] text-on-surface-variant">
                Permanently removes tasks, settings, statistics, and all saved
                chord data from this browser.
              </p>
            </div>
            <button
              onClick={() => {
                if (
                  window.confirm(
                    "Delete ALL Mousi9ti data from this browser? This permanently removes all app data, including practice tasks, settings, preferences, statistics, custom chords, saved chord selections, and saved progressions. EVERYTHING IS PERMANENT and cannot be recovered. Continue?",
                  )
                ) {
                  onClearData();
                }
              }}
              className="flex shrink-0 items-center justify-center gap-1.5 rounded border border-error/40 bg-error/10 px-3.5 py-2 font-mono text-xs text-error transition-colors hover:bg-error/20"
            >
              <Trash2 size={14} />
              Delete All Data
            </button>
          </section>
        </div>
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-outline-variant/30 px-5 py-3 sm:px-6">
          <span className="font-mono text-[10px] tracking-widest text-on-surface-variant/50 uppercase">
            Mousi9ti
          </span>
          <a
            href="https://github.com/YassineKh2/Mous9iti"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 font-mono text-[10px] text-on-surface-variant transition-colors hover:text-primary"
          >
            <Github size={13} />
            GitHub Repository
          </a>
          <span className="font-mono text-[10px] tracking-widest text-on-surface-variant/50">
            v{APP_VERSION}
          </span>
        </div>
      </div>
    </div>
  );
};
