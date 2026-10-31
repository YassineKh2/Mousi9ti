import { useState } from "react";
import {
  ArrowUp,
  ArrowUpRight,
  Music2,
  Plus,
  Sparkles,
  Wrench,
} from "lucide-react";
import { RELEASES, ReleaseChangeCategory } from "../data/releaseNotes";
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
  const visibleReleases = RELEASES.map((release) => ({
    ...release,
    changes: release.changes.filter(
      (change) => filter === "all" || change.category === filter,
    ),
  })).filter((release) => release.changes.length > 0);

  return (
    <div className="patch-notes-page">
      <header className="patch-notes-header">
        <h1>Patch notes</h1>
        <p>See what’s new and improved in every Mousi9ti release.</p>
      </header>

      <section aria-label="Browse release notes">
        <div className="patch-notes-changes__heading">
          <h2>All releases</h2>
          <div
            aria-label="Filter release notes by category"
            className="patch-notes-filters"
            role="group"
          >
            {(["all", "new", "improved", "fixed"] as const).map((category) => (
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
            ))}
          </div>
        </div>

        <div className="patch-notes-timeline">
          {visibleReleases.map((release) => (
            <section
              aria-label={`Mousi9ti ${release.version} release`}
              className="patch-notes-release"
              id={
                release.version === RELEASES[0]?.version
                  ? "release-notes"
                  : undefined
              }
              key={release.version}
            >
              <svg
                aria-hidden="true"
                className="patch-notes-release__clef"
                viewBox="0 0 95.116 153.12"
                fill="none"
              >
                <defs>
                  <clipPath id={`clef-clip-${release.version}`}>
                    <rect x="0" y="0" width="95.116" height="126" />
                  </clipPath>
                </defs>
                <path
                  clipPath={`url(#clef-clip-${release.version})`}
                  transform="rotate(9 47.558 62)"
                  d="m51.688 5.25c-5.427-0.1409-11.774 12.818-11.563 24.375 0.049 3.52 1.16 10.659 2.781 19.625-10.223 10.581-22.094 21.44-22.094 35.688-0.163 13.057 7.817 29.692 26.75 29.532 2.906-0.02 5.521-0.38 7.844-1 1.731 9.49 2.882 16.98 2.875 20.44 0.061 13.64-17.86 14.99-18.719 7.15 3.777-0.13 6.782-3.13 6.782-6.84 0-3.79-3.138-6.88-7.032-6.88-2.141 0-4.049 0.94-5.343 2.41-0.03 0.03-0.065 0.06-0.094 0.09-0.292 0.31-0.538 0.68-0.781 1.1-0.798 1.35-1.316 3.29-1.344 6.06 0 11.42 28.875 18.77 28.875-3.75 0.045-3.03-1.258-10.72-3.156-20.41 20.603-7.45 15.427-38.04-3.531-38.184-1.47 0.015-2.887 0.186-4.25 0.532-1.08-5.197-2.122-10.241-3.032-14.876 7.199-7.071 13.485-16.224 13.344-33.093 0.022-12.114-4.014-21.828-8.312-21.969zm1.281 11.719c2.456-0.237 4.406 2.043 4.406 7.062 0.199 8.62-5.84 16.148-13.031 23.719-0.688-4.147-1.139-7.507-1.188-9.5 0.204-13.466 5.719-20.886 9.813-21.281zm-7.719 44.687c0.877 4.515 1.824 9.272 2.781 14.063-12.548 4.464-18.57 21.954-0.781 29.781-10.843-9.231-5.506-20.158 2.312-22.062 1.966 9.816 3.886 19.502 5.438 27.872-2.107 0.74-4.566 1.17-7.438 1.19-7.181 0-21.531-4.57-21.531-21.875 0-14.494 10.047-20.384 19.219-28.969zm6.094 21.469c0.313-0.019 0.652-0.011 0.968 0 13.063 0 17.99 20.745 4.688 27.375-1.655-8.32-3.662-17.86-5.656-27.375z"
                  fill="currentColor"
                />
              </svg>
              <div className="patch-notes-release__meta">
                <h2 className="patch-notes-release__version">
                  v{release.version}
                </h2>
                <p className="patch-notes-release__date">
                  {release.version === RELEASES[0]?.version
                    ? "Latest release"
                    : "Release"}
                </p>
              </div>

              <div className="patch-notes-release__content">
                <ul className="patch-notes-changes">
                  {release.changes.map((change) => {
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
                        <div className="patch-notes-change__copy">
                          <span className="patch-notes-change__title">
                            {change.title}
                          </span>
                          <p className="patch-notes-change__description">
                            {change.description}
                          </p>
                        </div>
                        <span className="patch-notes-change__type">
                          {categoryLabels[change.category]}
                        </span>
                        <a
                          aria-label={`Explore ${change.title}`}
                          className="patch-notes-change__link"
                          href={change.href}
                        >
                          <ArrowUpRight aria-hidden="true" size={17} />
                        </a>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </section>
          ))}
        </div>

        {visibleReleases.length === 0 && (
          <p className="patch-notes-empty">
            No{" "}
            {filter === "all"
              ? "updates"
              : `${categoryLabels[filter].toLowerCase()} updates`}{" "}
            yet.
          </p>
        )}
      </section>

      <a className="patch-notes-return" href="/">
        Return to your practice
      </a>

      <footer className="patch-notes-launch">
        <div className="patch-notes-launch__art" aria-hidden="true">
          <span className="patch-notes-launch__orbit patch-notes-launch__orbit--one" />
          <span className="patch-notes-launch__orbit patch-notes-launch__orbit--two" />
          <span className="patch-notes-launch__spark patch-notes-launch__spark--one">
            <Sparkles size={20} strokeWidth={1.5} />
          </span>
          <span className="patch-notes-launch__spark patch-notes-launch__spark--two">
            <Music2 size={18} strokeWidth={1.75} />
          </span>
          <div className="patch-notes-launch__record">
            <span className="patch-notes-launch__grooves" />
            <img
              className="patch-notes-launch__logo-light"
              src="/Mousi9tiSmall.svg"
              alt=""
              width="56"
              height="56"
            />
            <img
              className="patch-notes-launch__logo-dark"
              src="/Mousi9tiWhiteSmall.svg"
              alt=""
              width="56"
              height="56"
            />
          </div>
        </div>
        <div className="patch-notes-launch__copy">
          <p className="patch-notes-launch__eyebrow">THE FIRST NOTE · V1.0.0</p>
          <h2>Every practice starts somewhere.</h2>
          <p>
            Mousi9ti began as a simple website designed to eliminate the time
            spent managing practice tools and switching between tabs.{" "}
            <br className="mb-2" />
            It allowing users to focus on what truly matters like practicing
            without wasting an eternity searching for the right tool.
          </p>
        </div>
      </footer>
    </div>
  );
};
