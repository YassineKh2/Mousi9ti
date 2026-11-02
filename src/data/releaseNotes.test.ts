import assert from "node:assert/strict";
import { it } from "node:test";
import {
  getMajorMinorVersion,
  isMajorOrMinorVersionAhead,
  RELEASES,
} from "./releaseNotes";
import { resolvePageRoute } from "../lib/pageRoutes";

it("announces newer major or minor versions, but not patch versions", () => {
  assert.equal(isMajorOrMinorVersionAhead("3.0.0", "2.9.9"), true);
  assert.equal(isMajorOrMinorVersionAhead("2.2.0", "2.1.9"), true);
  assert.equal(isMajorOrMinorVersionAhead("2.1.4", "2.1.3"), false);
  assert.equal(isMajorOrMinorVersionAhead("2.1.0", "2.2.0"), false);
});

it("normalizes the major and minor version for release tracking", () => {
  assert.equal(getMajorMinorVersion("v02.003.4"), "2.3");
  assert.equal(getMajorMinorVersion("next"), null);
});

it("ignores malformed version values when comparing releases", () => {
  assert.equal(isMajorOrMinorVersionAhead("next", "2.1.0"), false);
  assert.equal(isMajorOrMinorVersionAhead("2.2.0", "next"), false);
});

it("lists all five releases in descending version order", () => {
  assert.deepEqual(
    RELEASES.map((release) => release.version),
    ["1.3.1", "1.3.0", "1.2.0", "1.1.0", "1.0.0"],
  );
});

it("documents the headline changes in their requested releases", () => {
  const releaseTitles = Object.fromEntries(
    RELEASES.map((release) => [
      release.version,
      release.changes.map((change) => change.title),
    ]),
  );

  assert.ok(releaseTitles["1.3.0"].some((title) => title.includes("Bass")));
  assert.ok(
    releaseTitles["1.3.1"].some((title) => title.includes("Sync the timer")),
  );
  assert.ok(
    releaseTitles["1.3.1"].some((title) => title.includes("task video")),
  );
  assert.ok(releaseTitles["1.2.0"].some((title) => title.includes("light mode")));
  assert.ok(releaseTitles["1.1.0"].some((title) => title.includes("Shareable")));
  assert.ok(releaseTitles["1.0.0"].some((title) => title.includes("dashboard")));
  assert.ok(
    RELEASES.find((release) => release.version === "1.2.0")?.changes.some(
      (change) => change.category === "fixed",
    ),
  );
  assert.ok(
    RELEASES.find((release) => release.version === "1.1.0")?.changes.some(
      (change) => change.category === "fixed",
    ),
  );
  assert.ok(
    RELEASES.find((release) => release.version === "1.1.0")?.changes.some(
      (change) => change.id === "search-and-playback",
    ),
  );
  assert.ok(
    RELEASES.find((release) => release.version === "1.3.0")?.changes.some(
      (change) => change.id === "compact-chord-selector",
    ),
  );
  assert.ok(
    RELEASES.every((release) =>
      release.changes.every((change) => change.description.length > 0),
    ),
  );
});

it("preserves the requested highlights in release 1.3.0", () => {
  const release = RELEASES.find((item) => item.version === "1.3.0");
  const titles = release?.changes.map((change) => change.title) ?? [];

  assert.ok(titles.includes("A more refined light mode"));
  assert.ok(titles.includes("Shareable chord and scale pages"));
  assert.ok(!titles.includes("Consistent instrument experience"));
});

it("links each release note to a valid app page", () => {
  for (const release of RELEASES) {
    for (const change of release.changes) {
      assert.ok(resolvePageRoute(change.href), `${change.title} has a valid link`);
    }
  }
});
