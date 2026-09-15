# Mousi9ti

<p align="center">
   <img src="public/Mousi9tiWhite.svg" alt="Mousi9ti logo" width="320">
</p>

Mousi9ti is an interactive guitar and piano practice studio for learning music theory, exploring chords and scales, and tracking practice sessions.

It brings common practice tools into one browser-based workspace:

- Guitar fretboard and piano keyboard views
- Chord and scale libraries with note, interval, and degree information
- Chord builder with guitar voicings and piano voicings
- Metronome with configurable tempo, sounds, subdivisions, and time signatures
- Practice timer and session tracking
- Random note drills and music theory exercises
- Practice streaks, session history, and progress statistics
- Search, dashboard layout customization, themes, tunings, and instrument settings
- Audio playback through Web Audio and SoundFont instruments

## Technologies

- React 19
- TypeScript 5.8
- Vite 6
- Tailwind CSS 4 with the Vite plugin
- Lucide React for icons
- Motion for UI animation
- Recharts for statistics visualizations
- Web Audio API with `smplr` and `soundfont2` for metronome and instrument sounds
- Browser `localStorage` for settings, dashboard layout, sessions, streaks, and selections

## Requirements

- Node.js 18 or newer
- npm
- A modern browser with Web Audio API support

## Getting Started

1. Clone the repository and open the project directory.
2. Install dependencies:

   ```bash
   npm install
   ```

3. Start the development server:

   ```bash
   npm run dev
   ```

4. Open the URL printed by Vite. The configured development port is `3000`, so the default address is:

   ```text
   http://localhost:3000
   ```

The project runs as a client-side web application. Practice data is stored in the browser that you use, so changing browsers or clearing site data will not carry sessions and settings over automatically.

## Available Scripts

| Command           | Description                                        |
| ----------------- | -------------------------------------------------- |
| `npm run dev`     | Start the Vite development server on port 3000     |
| `npm run build`   | Create a production build in `dist/`               |
| `npm run preview` | Preview the production build locally               |
| `npm run lint`    | Run the TypeScript compiler without emitting files |
| `npm run clean`   | Remove generated build output and `server.js`      |

## Project Structure

```text
src/
  components/   Reusable UI, instrument views, timers, and practice widgets
  data/         Chords, scales, exercises, and song preset data
  lib/          Audio, storage, timer, and validation utilities
  pages/        Dashboard, chords, scales, builder, exercises, tools, and stats views
  App.tsx       Application state, navigation, sessions, and global behavior
  types.ts      Shared TypeScript domain types
```

## Production Build

Build the application with:

```bash
npm run build
```

To serve the generated build locally:

```bash
npm run preview
```

## Notes

- The browser may require a user interaction before audio can start.
- The app requests notification permission only when needed for timer completion notifications.
- The `metadata.json` file describes the app for its host environment; the primary runtime is the Vite frontend.
