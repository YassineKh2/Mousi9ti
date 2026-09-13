import { readFileSync } from "node:fs";
import { importChordLibrary } from "../src/data/chordsData";

const filePath = process.argv[2];

if (!filePath) {
  console.error("Usage: npm run chords:import -- path/to/chords.json");
  process.exit(1);
}

const raw = readFileSync(filePath, "utf-8");
const parsed = JSON.parse(raw);

if (!Array.isArray(parsed)) {
  throw new Error(
    "Chord import file must contain an array of chord definitions.",
  );
}

importChordLibrary(parsed);
console.log(`Imported ${parsed.length} chord definitions.`);
