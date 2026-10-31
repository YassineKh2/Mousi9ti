import React from "react";
import { LoaderCircle } from "lucide-react";

interface SoundfontLoadingToastProps {
  instruments: string[];
}

export const SoundfontLoadingToast: React.FC<SoundfontLoadingToastProps> = ({
  instruments,
}) => {
  if (instruments.length === 0) return null;
  const instrumentNames = instruments
    .map((instrument) => instrument.charAt(0).toUpperCase() + instrument.slice(1))
    .join(", ");

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-4 left-1/2 z-[60] flex -translate-x-1/2 items-center gap-2 rounded-full border border-outline-variant/50 bg-surface-container-high px-4 py-2 font-mono text-sm text-on-surface shadow-xl backdrop-blur-md animate-in fade-in slide-in-from-bottom-2 duration-200"
    >
      <LoaderCircle size={16} className="shrink-0 animate-spin text-primary" />
      <span>Loading sound engine for {instrumentNames}...</span>
    </div>
  );
};
