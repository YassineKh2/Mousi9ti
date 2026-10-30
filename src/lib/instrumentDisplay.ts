import type { AppSettings, PracticeInstrument } from "../types";
import type { InstrumentDisplay } from "./frettedInstrument";

export const INSTRUMENT_ORDER: PracticeInstrument[] = ["guitar", "bass", "piano"];

export function getEnabledInstruments(settings: Pick<AppSettings, "enabledInstruments">): PracticeInstrument[] {
  const enabled = INSTRUMENT_ORDER.filter(instrument => settings.enabledInstruments?.includes(instrument));
  return enabled.length ? enabled : ["guitar", "piano"];
}

export function normalizeInstrumentDisplay(view: InstrumentDisplay, enabled: PracticeInstrument[]): InstrumentDisplay {
  if (view === "both") return enabled.length > 1 ? "both" : enabled[0];
  return enabled.includes(view) ? view : enabled[0];
}

export function getDisplayedInstruments(view: InstrumentDisplay, enabled: PracticeInstrument[]): PracticeInstrument[] {
  const normalized = normalizeInstrumentDisplay(view, enabled);
  return normalized === "both" ? enabled : [normalized];
}

export function getCombinedInstrumentLabel(enabled: PracticeInstrument[]): string {
  return enabled.length === 3 ? "All" : "Both";
}