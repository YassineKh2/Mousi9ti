import React from "react";
import { useSettingsContext } from "../contexts/SettingsContext";
import { OriginalFretboard, FretboardProps } from "./fretboard/OriginalFretboard";
import { DynamicFretboard } from "./fretboard/DynamicFretboard";

export const Fretboard: React.FC<FretboardProps> = (props) => {
  const settings = useSettingsContext();

  const isOriginal = settings.fretboardTheme === "original";
  const hasModifiers = 
    settings.fretboardNoteSize !== "medium" || 
    settings.fretboardColorMode !== "default" || 
    settings.fretboardMinimalDetails;

  // STRICT REQUIREMENT: If "original" theme is selected and no modifiers are active,
  // we must render the completely untouched OriginalFretboard component to guarantee zero regression.
  if (isOriginal && !hasModifiers) {
    return <OriginalFretboard {...props} />;
  }

  // Otherwise, route to the new flexible dynamic engine
  return <DynamicFretboard {...props} />;
};
