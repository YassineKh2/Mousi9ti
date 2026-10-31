import { useState } from "react";
import {
  ArrowUpRight,
  Plus,
  Wrench,
  ArrowUp,
} from "lucide-react";
import { RELEASE_CHANGES, ReleaseChangeCategory } from "../data/releaseNotes";
import { APP_VERSION } from "../lib/version";
import "./patch-notes/PatchNotesPage.css";

type ChangeFilter = "all" | ReleaseChangeCategory;

const categoryLabels: Record<ReleaseChangeCategory, string> = {
  new: "New",
  improved: "Improved",
  fixed: "Fixed",
};

const categoryMarks = {
  new: Plus,
  improved: ArrowUp,
  fixed: Wrench,
};

export const PatchNotesPage = () => {
  const [filter, setFilter] = useState<ChangeFilter>("all");
  const featuredChange = RELEASE_CHANGES.find((change) => change.featured);
  const visibleChanges = RELEASE_CHANGES.filter(
    (change) =>
      change.id !== featuredChange?.id &&
      (filter === "all" || change.category === filter),
  );
  return (
    <div className="patch-notes-page">
      <header className="patch-notes-header">
        <h1>What’s new</h1>
        <p>New features, improvements, and fixes for your practice.</p>
      </header>

      <section
        aria-label="Latest Mousi9ti release"
        className="patch-notes-release"
        id="release-notes"
      >
        <div className="patch-notes-release__meta">
          <p className="patch-notes-release__version">v{APP_VERSION}</p>
          <p className="patch-notes-release__date">Latest release</p>
        </div>

        <div className="patch-notes-release__content">
          {featuredChange && (
            <article className="patch-notes-feature">
              <span className="patch-notes-feature__mark" aria-hidden="true">
                <Plus size={32} strokeWidth={1.75} />
              </span>
              <div className="patch-notes-feature__copy">
                <span className="patch-notes-feature__type">New feature</span>
                <h2>{featuredChange.title}</h2>
                {featuredChange.description && (
                  <p>{featuredChange.description}</p>
                )}
              </div>
              <a className="patch-notes-feature__link" href={featuredChange.href}>
                <span>Try it</span>
                <ArrowUpRight aria-hidden="true" size={17} />
              </a>
            </article>
          )}

          <section aria-label="Browse release notes">
            <div className="patch-notes-changes__heading">
              <h2>Also in this release</h2>
              <div
                aria-label="Filter release notes by category"
                className="patch-notes-filters"
                role="group"
              >
                {(["all", "new", "improved", "fixed"] as const).map(
                  (category) => (
                    <button
                      key={category}
                      type="button"
                      aria-pressed={filter === category}
                      disabled={filter === category}
                      onClick={() => setFilter(category)}
                      className={
                        filter === category
                          ? "patch-notes-filter patch-notes-filter--active"
                          : "patch-notes-filter"
                      }
                    >
                      {category === "all" ? "All updates" : categoryLabels[category]}
                    </button>
                  ),
                )}
              </div>
            </div>

            {visibleChanges.length > 0 ? (
              <ul className="patch-notes-changes">
                {visibleChanges.map((change) => {
                  const ChangeMark = categoryMarks[change.category];
                  return (
                    <li
                      key={change.id}
                      className={`patch-notes-change patch-notes-change--${change.category}`}
                    >
                      <span
                        aria-hidden="true"
                        className={`patch-notes-change__mark patch-notes-change__mark--${change.category}`}
                      >
                        <ChangeMark size={17} strokeWidth={2} />
                      </span>
                      <span className="patch-notes-change__title">
                        {change.title}
                      </span>
                      <span className="patch-notes-change__type">
                        {categoryLabels[change.category]}
                      </span>
                      <a className="patch-notes-change__link" href={change.href}>
                        <span className="sr-only">
                          {change.title}
                        </span>
                        <ArrowUpRight aria-hidden="true" size={17} />
                      </a>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="patch-notes-empty">
                {filter === "all"
                  ? "No other updates in this release."
                  : `No ${categoryLabels[filter].toLowerCase()} updates in this release.`}
              </p>
            )}
          </section>

          <a className="patch-notes-return" href="/">
            Return to your practice
          </a>
        </div>
      </section>
    </div>
  );
};
