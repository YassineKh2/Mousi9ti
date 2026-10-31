import { AudioLines, ArrowRight, X } from "lucide-react";
import { useEffect, useRef } from "react";
import { APP_VERSION } from "../lib/version";

interface MajorReleaseAnnouncementProps {
  onClose: () => void;
  onOpenReleaseNotes: () => void;
}

export const MajorReleaseAnnouncement = ({
  onClose,
  onOpenReleaseNotes,
}: MajorReleaseAnnouncementProps) => {
  const dialogRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const previousFocus = document.activeElement;
    const dialog = dialogRef.current;
    const closeButton =
      dialog?.querySelector<HTMLButtonElement>(
        '[aria-label="Close release announcement"]',
      ) ?? null;
    closeButton?.focus();
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key !== "Tab" || !dialog) return;

      const focusable = Array.from(
        dialog.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      );
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", handleEscape);
    return () => {
      window.removeEventListener("keydown", handleEscape);
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) {
        previousFocus.focus();
      }
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="major-release-title"
        ref={dialogRef}
        className="w-full max-w-lg rounded-xl border border-outline-variant/40 bg-surface p-6 shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <AudioLines aria-hidden="true" size={22} />
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close release announcement"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-on-surface-variant transition-colors hover:bg-surface-container-high hover:text-on-surface focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2"
          >
            <X aria-hidden="true" size={18} />
          </button>
        </div>
        <p className="mt-5 text-sm font-medium text-primary">
          Mousi9ti version {APP_VERSION}
        </p>
        <h2
          id="major-release-title"
          className="mt-2 text-2xl font-bold text-on-surface"
        >
          A major update is here
        </h2>
        <p className="mt-2 text-sm leading-6 text-on-surface-variant">
          See the latest features, improvements, and fixes in your practice
          studio.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={onOpenReleaseNotes}
            className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-on-primary transition-colors hover:bg-primary/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2"
          >
            See what’s new
            <ArrowRight aria-hidden="true" size={16} />
          </button>
          <button
            type="button"
            onClick={onClose}
            className="min-h-11 rounded-lg border border-outline-variant/40 px-4 py-2 text-sm font-medium text-on-surface transition-colors hover:bg-surface-container-high focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2"
          >
            Later
          </button>
        </div>
      </section>
    </div>
  );
};
