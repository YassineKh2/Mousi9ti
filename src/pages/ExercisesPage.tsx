import React, { useState } from "react";
import { Exercise } from "../types";
import { EXERCISES_DATABASE } from "../data/exercisesData";
import {
  Dumbbell,
  Play,
  CheckCircle,
  Target,
  Sparkles,
  Filter,
} from "lucide-react";

interface ExercisesPageProps {
  onStartExercisePractice: (exercise: Exercise) => void;
  initialExerciseId?: string | null;
  onInitialExerciseHandled?: () => void;
}

export const ExercisesPage: React.FC<ExercisesPageProps> = ({
  onStartExercisePractice,
  initialExerciseId,
  onInitialExerciseHandled,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>("All");
  const [activeExercise, setActiveExercise] = useState<Exercise>(
    EXERCISES_DATABASE[0],
  );

  const categories = ["All", "Technique", "Theory", "Rhythm", "Speed Building"];
  const difficulties = ["All", "Beginner", "Intermediate", "Advanced"];

  const filteredExercises = EXERCISES_DATABASE.filter((ex) => {
    const matchesCat =
      selectedCategory === "All" || ex.category === selectedCategory;
    const matchesDiff =
      selectedDifficulty === "All" || ex.difficulty === selectedDifficulty;
    return matchesCat && matchesDiff;
  });

  React.useEffect(() => {
    if (!initialExerciseId) return;
    const found = EXERCISES_DATABASE.find((ex) => ex.id === initialExerciseId);
    if (found) {
      setActiveExercise(found);
      setSelectedCategory("All");
      setSelectedDifficulty("All");
    }
    onInitialExerciseHandled?.();
  }, [initialExerciseId, onInitialExerciseHandled]);

  return (
    <div className="space-y-6 pb-12">
      {/* Header & Filter Bar */}
      <div className="bg-surface-container border border-outline-variant/30 rounded-lg p-6 flex flex-col gap-5 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-outline-variant/30">
          <div>
            <h2 className="font-mono text-base font-bold tracking-[0.2em] text-on-surface uppercase flex items-center gap-2">
              <Dumbbell size={18} className="text-primary" />
              Guitar Technique & Theory Drills
            </h2>
            <p className="text-xs text-on-surface-variant mt-1">
              Curated routines for finger independence, alternate picking,
              rhythm, and speed building
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Category Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-full text-xs font-mono whitespace-nowrap transition-all ${
                  selectedCategory === cat
                    ? "bg-primary text-on-primary font-bold shadow"
                    : "bg-surface-container-low text-on-surface-variant hover:text-on-surface border border-outline-variant/30"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Difficulty Filter */}
          <div className="flex items-center gap-1.5 bg-surface-container-low p-1 rounded-lg border border-outline-variant/30">
            {difficulties.map((diff) => (
              <button
                key={diff}
                onClick={() => setSelectedDifficulty(diff)}
                className={`px-2.5 py-1 text-[11px] font-mono rounded transition-all ${
                  selectedDifficulty === diff
                    ? "bg-primary text-on-primary font-bold"
                    : "text-on-surface-variant hover:text-on-surface"
                }`}
              >
                {diff}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Layout: List on Left, Active TAB on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Exercise List Cards */}
        <div className="lg:col-span-5 space-y-3">
          {filteredExercises.map((ex) => {
            const isSelected = activeExercise.id === ex.id;
            return (
              <div
                key={ex.id}
                onClick={() => setActiveExercise(ex)}
                className={`p-4 rounded-lg border transition-all cursor-pointer ${
                  isSelected
                    ? "bg-surface-container-low border-primary shadow-lg"
                    : "bg-surface-container border-outline-variant/30 hover:border-outline-variant"
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20 font-semibold">
                    {ex.category}
                  </span>
                  <span
                    className={`text-[10px] font-mono font-bold ${
                      ex.difficulty === "Beginner"
                        ? "text-tertiary"
                        : ex.difficulty === "Intermediate"
                          ? "text-secondary"
                          : "text-error"
                    }`}
                  >
                    {ex.difficulty}
                  </span>
                </div>

                <h3 className="font-mono text-sm font-bold text-on-surface group-hover:text-primary">
                  {ex.title}
                </h3>
                <p className="text-xs text-on-surface-variant mt-1 line-clamp-2">
                  {ex.description}
                </p>

                <div className="flex items-center justify-between pt-3 mt-3 border-t border-outline-variant/30 text-[10px] font-mono text-on-surface-variant">
                  <span>
                    Tempo:{" "}
                    <strong className="text-on-surface">
                      {ex.suggestedBpm} BPM
                    </strong>
                  </span>
                  <span className="text-primary flex items-center gap-1">
                    Click to view TAB & drill →
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Selected Exercise Interactive View & Tablature */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-surface-container border border-outline-variant/30 rounded-lg p-6 shadow-xl space-y-5">
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-outline-variant/30">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono text-primary font-bold uppercase tracking-wider">
                    {activeExercise.category} DRILL
                  </span>
                  <span className="text-on-surface-variant">•</span>
                  <span className="text-[10px] font-mono text-on-surface-variant">
                    Difficulty:{" "}
                    <strong className="text-on-surface">
                      {activeExercise.difficulty}
                    </strong>
                  </span>
                </div>
                <h2 className="font-mono text-lg font-bold text-on-surface mt-1">
                  {activeExercise.title}
                </h2>
              </div>

              <button
                onClick={() => onStartExercisePractice(activeExercise)}
                className="flex items-center gap-2 bg-primary hover:bg-primary-container text-on-primary font-mono text-xs font-bold px-4 py-2.5 rounded shadow-lg transition-all active:scale-95"
              >
                <Play size={14} fill="currentColor" />
                <span>PRACTICE AT {activeExercise.suggestedBpm} BPM</span>
              </button>
            </div>

            {/* Focus Goal Card */}
            <div className="bg-surface-container-low border border-outline-variant/30 rounded-lg p-4 flex items-start gap-3">
              <Target size={18} className="text-primary shrink-0 mt-0.5" />
              <div>
                <span className="font-mono text-xs font-bold text-on-surface uppercase tracking-wider block">
                  Focus & Performance Goals
                </span>
                <p className="text-xs text-on-surface-variant mt-1 leading-relaxed">
                  {activeExercise.focusGoal}
                </p>
              </div>
            </div>

            {/* Tablature Block */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs text-on-surface-variant uppercase tracking-wider font-semibold">
                  Standard Guitar Tablature
                </span>
                <span className="text-[10px] font-mono text-on-surface-variant">
                  e B G D A E strings
                </span>
              </div>

              <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-4 font-mono text-xs text-primary overflow-x-auto whitespace-pre leading-relaxed shadow-inner no-scrollbar">
                {activeExercise.tablature}
              </div>
            </div>

            {/* Practice Instructions */}
            <div className="bg-surface-container-low border border-outline-variant/30 rounded-lg p-4 space-y-2">
              <span className="font-mono text-xs font-bold text-on-surface uppercase tracking-wider">
                Execution Method:
              </span>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                {activeExercise.description} Start slow at 50% tempo until note
                articulation is 100% clean and relaxed before increasing BPM in
                +5 increments.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
