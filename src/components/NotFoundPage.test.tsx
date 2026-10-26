import assert from "node:assert/strict";
import { it } from "node:test";
import { readFileSync } from "node:fs";

it("provides a single page heading and working recovery destinations", () => {
  const source = readFileSync(
    new URL("./NotFoundPage.tsx", import.meta.url),
    "utf8",
  );
  assert.match(source, /<h1>Lost the rhythm\?<\/h1>/);
  assert.match(source, /href="\/"/);
  for (const route of ["/chords/", "/scales/", "/metronome/"]) {
    assert.ok(source.includes(`href: "${route}"`));
  }
  assert.match(source, /aria-label="Practice tools"/);
});
