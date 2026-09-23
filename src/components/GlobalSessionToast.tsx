import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Play, Pause, Save, Clock } from "lucide-react";

interface GlobalSessionToastProps {
  activeSessionDuration: number;
  isSessionActive: boolean;
  onToggleSession: () => void;
  onPauseSession?: () => void;
  onResumeSession?: () => void;
  onEndSession: () => void;
}

export const GlobalSessionToast: React.FC<GlobalSessionToastProps> = ({
  activeSessionDuration,
  isSessionActive,
  onToggleSession,
  onPauseSession,
  onResumeSession,
  onEndSession,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [position, setPosition] = useState<{ x: number; y: number } | null>(
    null,
  );
  const widgetRef = useRef<HTMLDivElement>(null);
  const dragState = useRef({
    active: false,
    moved: false,
    startX: 0,
    startY: 0,
    originX: 0,
    originY: 0,
    width: 0,
    height: 0,
  });

  // Format seconds to HH:MM:SS
  const formatTime = (seconds: number): string => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs > 0 ? hrs.toString() + ":" : ""}${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const getBottomInset = () => (window.innerWidth < 640 ? 80 : 16);

  useEffect(() => {
    const handlePointerMove = (event: PointerEvent) => {
      if (!dragState.current.active) return;

      const deltaX = event.clientX - dragState.current.startX;
      const deltaY = event.clientY - dragState.current.startY;
      if (Math.abs(deltaX) > 4 || Math.abs(deltaY) > 4) {
        dragState.current.moved = true;
      }

      if (!dragState.current.moved) return;

      setPosition({
        x: Math.max(
          16,
          Math.min(
            window.innerWidth - dragState.current.width - 16,
            dragState.current.originX + deltaX,
          ),
        ),
        y: Math.max(
          16,
          Math.min(
            window.innerHeight - dragState.current.height - getBottomInset(),
            dragState.current.originY + deltaY,
          ),
        ),
      });
    };

    const handlePointerUp = () => {
      dragState.current.active = false;
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [isExpanded]);

  useLayoutEffect(() => {
    const widget = widgetRef.current;
    if (!widget) return;

    const rect = widget.getBoundingClientRect();
    setPosition((currentPosition) => {
      const nextPosition = {
        x: Math.max(
          16,
          Math.min(window.innerWidth - rect.width - 16, rect.left),
        ),
        y: Math.max(
          16,
          Math.min(
            window.innerHeight - rect.height - getBottomInset(),
            rect.top,
          ),
        ),
      };

      if (
        currentPosition?.x === nextPosition.x &&
        currentPosition.y === nextPosition.y
      ) {
        return currentPosition;
      }
      return nextPosition;
    });
  }, [isExpanded]);

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    dragState.current = {
      active: true,
      moved: false,
      startX: event.clientX,
      startY: event.clientY,
      originX: rect.left,
      originY: rect.top,
      width: rect.width,
      height: rect.height,
    };
  };

  const handleTimerClick = () => {
    if (!dragState.current.moved) {
      setIsExpanded((expanded) => !expanded);
    }
    dragState.current.moved = false;
  };

  const positionStyle = position
    ? {
        left: `${position.x}px`,
        top: `${position.y}px`,
        right: "auto",
        bottom: "auto",
      }
    : undefined;

  if (activeSessionDuration === 0 && !isSessionActive) {
    return null;
  }

  return (
    <div
      ref={widgetRef}
      className="fixed bottom-20 right-4 sm:bottom-6 sm:right-6 z-50 animate-in fade-in slide-in-from-bottom-4 duration-300"
      style={positionStyle}
      onPointerDown={handlePointerDown}
    >
      <div className="bg-surface-container-high border border-outline-variant/50 rounded-full shadow-2xl p-1.5 flex items-center gap-3 backdrop-blur-md">
        {/* Timer Display */}
        <button
          type="button"
          onClick={handleTimerClick}
          aria-label={
            isExpanded ? "Collapse session controls" : "Expand session controls"
          }
          aria-expanded={isExpanded}
          className="flex items-center gap-2 pl-3 pr-2 py-1.5 cursor-grab touch-none"
        >
          <Clock
            size={16}
            className={
              isSessionActive
                ? "text-primary animate-pulse"
                : "text-on-surface-variant"
            }
          />
          <span className="font-mono text-sm font-bold tracking-wider text-on-surface w-16 text-center">
            {formatTime(activeSessionDuration)}
          </span>
        </button>

        {/* Action Buttons */}
        <div
          className={`${isExpanded ? "flex" : "hidden"} sm:flex items-center gap-1.5 pr-1.5`}
        >
          <button
            type="button"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={
              isSessionActive
                ? onPauseSession || onToggleSession
                : onResumeSession || onToggleSession
            }
            className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
              isSessionActive
                ? "bg-surface-container hover:bg-surface-container-highest text-on-surface"
                : "bg-primary text-on-primary hover:bg-primary/90 shadow-lg shadow-primary/20"
            }`}
            title={isSessionActive ? "Pause Session" : "Resume Session"}
          >
            {isSessionActive ? (
              <Pause size={16} fill="currentColor" />
            ) : (
              <Play size={16} fill="currentColor" className="ml-0.5" />
            )}
          </button>

          <button
            type="button"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={onEndSession}
            className="w-9 h-9 rounded-full flex items-center justify-center bg-surface-container hover:bg-primary hover:text-on-primary text-on-surface transition-all"
            title="Log & Finish"
          >
            <Save size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};
