import {
  ArrowRight,
  ArrowUp,
  Plus,
  Sparkles,
  Wrench,
  X,
} from "lucide-react";
import { useEffect, useRef } from "react";
import {
  ReleaseChange,
  ReleaseChangeCategory,
  ReleaseNotes,
} from "../data/releaseNotes";

interface ReleaseNotesModalProps {
  release: ReleaseNotes;
  onClose: () => void;
  onOpenReleaseNotes: () => void;
}

const categoryLabels: Record<ReleaseChangeCategory, string> = {
  new: "New",
  improved: "Improved",
  fixed: "Fixed",
};

const categoryIcons = {
  new: Plus,
  improved: ArrowUp,
  fixed: Wrench,
};

export const ReleaseNotesModal = ({
  release,
  onClose,
  onOpenReleaseNotes,
}: ReleaseNotesModalProps) => {
  const dialogRef = useRef<HTMLElement>(null);
  const featuredChanges = release.changes.filter((change) => change.featured);
  const highlights =
    featuredChanges.length > 0
      ? featuredChanges
      : [
          release.changes.find((change) => change.category === "new") ??
            release.changes[0],
        ].filter((change): change is ReleaseChange => Boolean(change));
  const otherChanges = release.changes.filter(
    (change) => !highlights.includes(change),
  );

  useEffect(() => {
    const previousFocus = document.activeElement;
    const dialog = dialogRef.current;
    const closeButton =
      dialog?.querySelector<HTMLButtonElement>(
        '[aria-label="Close release notes"]',
      ) ?? null;
    closeButton?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
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
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) {
        previousFocus.focus();
      }
    };
  }, [onClose]);

  const renderChange = (change: ReleaseChange, isFeatured: boolean) => {
    const CategoryIcon = categoryIcons[change.category];
    return (
      <li
        key={change.id}
        className={
          isFeatured
            ? "flex items-start gap-3 rounded-xl border border-primary/25 bg-primary/5 p-4"
            : "flex items-start gap-3 rounded-lg bg-surface-container-low p-3"
        }
      >
        <span
          aria-hidden="true"
          className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
            isFeatured
              ? "bg-primary/10 text-primary"
              : "bg-surface-container-high text-on-surface-variant"
          }`}
        >
          <CategoryIcon size={16} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold text-on-surface">
              {change.title}
            </h3>
            <span className="rounded-full bg-surface-container-high px-2 py-0.5 text-[11px] font-medium text-on-surface-variant">
              {categoryLabels[change.category]}
            </span>
          </div>
          <p className="mt-1 text-sm leading-5 text-on-surface-variant">
            {change.description}
          </p>
        </div>
      </li>
    );
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="release-notes-title"
        ref={dialogRef}
        className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-outline-variant/40 bg-surface font-mono shadow-2xl"
      >
        <header className="flex items-start gap-4 border-b border-outline-variant/30 p-5 sm:p-6">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Sparkles aria-hidden="true" size={21} />
          </div>
          <div className="min-w-0 flex-1 pt-0.5">
            <p className="text-xs font-semibold uppercase tracking-wider text-primary">
              Mousi9ti · v{release.version}
            </p>
            <h2
              id="release-notes-title"
              className="mt-1 text-xl font-bold text-on-surface sm:text-2xl"
            >
              What’s new in your practice
            </h2>
            <p className="mt-1 text-sm leading-5 text-on-surface-variant">
              A quick look at the latest features, improvements, and fixes.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close release notes"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-on-surface-variant transition-colors hover:bg-surface-container-high hover:text-on-surface focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2"
          >
            <X aria-hidden="true" size={18} />
          </button>
        </header>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-5 sm:p-6">
          {highlights.length > 0 && (
            <section aria-labelledby="release-highlights-heading">
              <h3
                id="release-highlights-heading"
                className="mb-3 text-xs font-bold uppercase tracking-wider text-on-surface-variant"
              >
                Highlights
              </h3>
              <ul className="grid gap-3 md:grid-cols-2">
                {highlights.map((change) => renderChange(change, true))}
              </ul>
            </section>
          )}

          {otherChanges.length > 0 && (
            <section aria-labelledby="release-more-heading">
              <h3
                id="release-more-heading"
                className="mb-3 text-xs font-bold uppercase tracking-wider text-on-surface-variant"
              >
                More in this update
              </h3>
              <ul className="grid gap-2 md:grid-cols-2">
                {otherChanges.map((change) => renderChange(change, false))}
              </ul>
            </section>
          )}
        </div>

        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-outline-variant/30 p-5 sm:p-6">
          <button
            type="button"
            onClick={onClose}
            className="min-h-11 rounded-lg px-3 py-2 text-sm font-medium text-on-surface-variant transition-colors hover:bg-surface-container-high hover:text-on-surface focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2"
          >
            Maybe later
          </button>
          <a
            href="/patch-notes/"
            onClick={(event) => {
              if (
                event.button !== 0 ||
                event.metaKey ||
                event.ctrlKey ||
                event.shiftKey ||
                event.altKey
              ) {
                return;
              }
              event.preventDefault();
              onOpenReleaseNotes();
            }}
            className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-on-primary transition-colors hover:bg-primary/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2"
          >
            All patch notes
            <ArrowRight aria-hidden="true" size={16} />
          </a>
        </footer>
      </section>
    </div>
  );
};
