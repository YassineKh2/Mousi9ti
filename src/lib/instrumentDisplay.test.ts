import assert from "node:assert/strict";
import { it } from "node:test";
import { getCombinedInstrumentLabel, getDisplayedInstruments, getEnabledInstruments, INSTRUMENT_ORDER, normalizeInstrumentDisplay } from "./instrumentDisplay";

it("defaults missing and invalid selections to guitar and piano", () => {
  assert.deepEqual(getEnabledInstruments({}), ["guitar", "piano"]);
  assert.deepEqual(getEnabledInstruments({ enabledInstruments: [] }), ["guitar", "piano"]);
});

it("renders every enabled instrument for each nonempty combination", () => {
  for (let mask = 1; mask < 8; mask++) {
    const enabled = INSTRUMENT_ORDER.filter((instrument, index) => mask & (1 << index));
    assert.deepEqual(getEnabledInstruments({ enabledInstruments: enabled }), enabled);
    assert.deepEqual(getDisplayedInstruments("both", enabled), enabled);
    assert.equal(getCombinedInstrumentLabel(enabled), enabled.length === 3 ? "All" : "Both");
    for (const instrument of INSTRUMENT_ORDER) {
      assert.equal(normalizeInstrumentDisplay(instrument, enabled), enabled.includes(instrument) ? instrument : enabled[0]);
    }
  }
});