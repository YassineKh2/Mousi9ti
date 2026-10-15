import assert from "node:assert/strict";
import { it } from "node:test";
import {
  applyMentionSuggestion,
  getDurationSuggestions,
  getMentionContext,
  getMentionSuggestions,
  parseDurationMinutes,
} from "./taskMentions";

for (const tool of ["timer", "time"]) {
  for (const duration of ["20s", "1m 20s", "1.5m", "20"]) {
    it(`preserves ${duration} when accepting an @${tool} suggestion`, () => {
      const text = `Practice @${tool}(${duration}`;
      const context = getMentionContext(text, text.length);
      assert.ok(context);
      const suggestions = getMentionSuggestions(context);
      assert.equal(suggestions[0]?.value, duration);
      const result = applyMentionSuggestion(text, text.length, context, suggestions[0].value);
      assert.ok(result.newText.includes(`@${tool}(${duration})`));
      assert.equal(parseDurationMinutes(suggestions[0].value), parseDurationMinutes(duration));
    });
  }
}

it("offers seconds instead of stripping their unit", () => {
  assert.deepEqual(getDurationSuggestions("20s"), [
    { label: "20s", value: "20s", subLabel: "Duration" },
  ]);
  assert.deepEqual(getDurationSuggestions("181m"), []);
  assert.ok(getDurationSuggestions("").length > 0);
});

it("suggests timer first and tuning last when typing @t", () => {
  const suggestions = getMentionSuggestions(getMentionContext("@t", 2));
  assert.deepEqual(
    suggestions.map((suggestion) => suggestion.value),
    ["timer", "time", "technique", "tuning"],
  );
});