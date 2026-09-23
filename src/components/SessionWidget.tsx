import React, { useState, useEffect } from "react";
import { Flame, Clock, CheckCircle2, Play, Pause } from "lucide-react";
import { StreakData } from "../types";

interface SessionWidgetProps {
  streak: StreakData;
  activeSessionDuration: number; // in seconds
  isSessionActive: boolean;
  onToggleSession: () => void;
  onPauseSession?: () => void;
  onResumeSession?: () => void;
  onEndSession: () => void;
  currentScaleName?: string;
  activeTaskTitle?: string;
  highestBpmSession?: number;
}

export const SessionWidget: React.FC<SessionWidgetProps> = ({
  streak,
  activeSessionDuration,
  isSessionActive,
  onToggleSession,
  onPauseSession,
  onResumeSession,
  onEndSession,
  currentScaleName = "C Major Scale",
  activeTaskTitle,
  highestBpmSession = 120,
}) => {
  // Format seconds to HH:MM:SS
  const formatTime = (seconds: number): string => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Current week Monday–Sunday
  const last7Dates = Array.from({ length: 7 }).map((_, i) => {
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0=Sun, 1=Mon, ...
    const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(today);
    monday.setDate(today.getDate() + diffToMonday);
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });

  return (
    <div className="bg-surface-container border border-outline-variant/30 rounded-lg p-4 md:p-5 flex flex-col justify-between relative shadow-xl">
      {/* Top Header */}
      <div className="flex items-center justify-between pb-3 border-b border-outline-variant/10">
        <div className="flex items-center gap-2">
          <Clock size={14} className="text-primary" />
          <span className="font-mono text-xs font-semibold tracking-[0.2em] text-on-surface uppercase">
            Practice Tracker
          </span>
        </div>

        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-primary/10 border border-primary/20 text-primary font-mono text-[10px]">
          <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span>
          <span>{isSessionActive ? "RECORDING" : "IDLE"}</span>
        </div>
      </div>

      {/* Stopwatch Time */}
      <div className="flex flex-col items-center justify-center my-2">
        <span className="font-mono text-4xl sm:text-5xl font-bold tracking-tight text-on-surface select-none">
          {formatTime(activeSessionDuration)}
        </span>
        <span className="text-[10px] font-mono text-on-surface-variant tracking-wider mt-1 text-center line-clamp-2">
          FOCUS:{" "}
          <span className="text-primary">
            {activeTaskTitle || currentScaleName}
          </span>{" "}
          (Peak {highestBpmSession} BPM)
        </span>
      </div>

      {/* Streak Mini Heatmap */}
      <div className="space-y-1.5 my-1">
        <div className="flex items-center justify-between text-[10px] font-mono text-on-surface-variant">
          <span>7-DAY CONSISTENCY</span>
          <div className="flex items-center gap-1 text-primary font-bold">
            <Flame size={12} />
            <span>{streak.currentStreak} DAYS</span>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1.5">
          {last7Dates.map((dateObj, idx) => {
            const dateStr = dateObj.toISOString().split("T")[0];
            const histItem = streak.history?.find((h) => h.date === dateStr);
            const isDone = histItem ? histItem.practiced : false;
            const dayLetter = dateObj.toLocaleDateString("en-US", {
              weekday: "narrow",
            });

            return (
              <div key={idx} className="flex flex-col items-center gap-1">
                <div
                  className={`w-full h-5 rounded-sm flex items-center justify-center transition-all ${
                    isDone
                      ? "bg-primary/20 border border-primary/40 text-primary"
                      : "bg-surface-container-high border border-outline-variant/10 text-on-surface-variant"
                  }`}
                >
                  {isDone && <CheckCircle2 size={10} />}
                </div>
                <span className="text-[9px] font-mono text-on-surface-variant">
                  {dayLetter}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Session Controls */}
      <div className="flex flex-wrap items-center justify-between pt-2 border-t border-outline-variant/10 mt-1 gap-2">
        <button
          onClick={
            isSessionActive
              ? onPauseSession || onToggleSession
              : onResumeSession || onToggleSession
          }
          className={`flex min-h-10 items-center gap-1.5 px-3 py-1.5 rounded text-xs font-mono tracking-wider border transition-all md:min-h-0 ${
            isSessionActive
              ? "bg-surface-container-high text-on-surface border-outline-variant/30 hover:bg-surface-container-highest"
              : "bg-primary text-on-primary border-primary hover:border-primary-container hover:bg-primary-container shadow-sm shadow-primary/20"
          }`}
        >
          {isSessionActive ? <Pause size={12} /> : <Play size={12} />}
          <span className="font-bold">
            {isSessionActive
              ? "PAUSE"
              : activeSessionDuration > 0
                ? "RESUME SESSION"
                : "START SESSION"}
          </span>
        </button>

        {activeSessionDuration > 0 && (
          <button
            onClick={onEndSession}
            className="min-h-10 text-[10px] font-mono text-on-surface-variant hover:text-on-surface border border-outline-variant/30 hover:border-outline-variant px-2.5 py-1.5 rounded transition-all md:min-h-0"
          >
            LOG & FINISH
          </button>
        )}
      </div>
    </div>
  );
};
