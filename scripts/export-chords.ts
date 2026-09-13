import { exportChordLibrary } from "../src/data/chordsData";

const chords = exportChordLibrary();
console.log(JSON.stringify(chords, null, 2));
