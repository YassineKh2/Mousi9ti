import React, { createContext, useContext, useState } from "react";
import type { PracticeInstrument } from "../types";
import { getSavedSettings } from "../lib/storage";
import { migrateInstrumentData, normalizeInstrument } from "../lib/instruments";

const PracticeInstrumentContext = createContext<{
  activeInstrument: PracticeInstrument;
  setActiveInstrument: (instrument: PracticeInstrument) => void;
}>({ activeInstrument: "guitar", setActiveInstrument: () => {} });

export function PracticeInstrumentProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [activeInstrument, setInstrument] = useState<PracticeInstrument>(() => {
    if (typeof localStorage === "undefined") return "guitar";
    migrateInstrumentData();
    return normalizeInstrument(getSavedSettings().defaultInstrument);
  });

  return (
    <PracticeInstrumentContext.Provider
      value={{
        activeInstrument,
        setActiveInstrument: (instrument) =>
          setInstrument(normalizeInstrument(instrument)),
      }}
    >
      {children}
    </PracticeInstrumentContext.Provider>
  );
}

export const usePracticeInstrument = () =>
  useContext(PracticeInstrumentContext);
