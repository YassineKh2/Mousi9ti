import assert from "node:assert/strict";
import { it } from "node:test";
import { isMajorVersionAhead, RELEASE_CHANGES } from "./releaseNotes";

it("announces only a newer major version", () => {
  assert.equal(isMajorVersionAhead("2.0.0", "1"), true);
  assert.equal(isMajorVersionAhead("1.8.0", "1"), false);
  assert.equal(isMajorVersionAhead("1.0.0", "2"), false);
});

it("ignores malformed version values", () => {
  assert.equal(isMajorVersionAhead("next", "1"), false);
  assert.equal(isMajorVersionAhead("2.0.0", "v1"), false);
});

it("provides new features and fixes for the release feed", () => {
  assert.ok(RELEASE_CHANGES.some((change) => change.category === "new"));
  assert.ok(RELEASE_CHANGES.some((change) => change.category === "fixed"));
  assert.ok(RELEASE_CHANGES.some((change) => change.featured));
});
