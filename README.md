# Mousi9ti

<p align="center">
   <img src="public/Mousi9tiWhite.svg" alt="Mousi9ti logo" width="320">
</p>

Mousi9ti is a browser-based music practice studio for guitar and piano players. It combines theory exploration, daily practice planning, timing tools, and progress tracking into one workspace for structured, repeatable practice.

## Updated Feature Set

### Practice dashboard and workflow
- Customizable dashboard with drag-and-drop widget layout
- Quick access to metronome, timer, session tracker, random note drill, daily tasks, instrument views, and chord selector
- Practice task system with date-based scheduling and completion rules
- Global search for tabs, scales, chords, and exercises from the app shell
- Task text mentions such as `@bpm`, `@key`, `@tuning`, `@technique`, `@exercise`, `@scale`, `@chord`, `@timer`, and `@metronome`
- Auto-configuration helpers that interpret task text and suggest dashboard/tool setups
- Task tags and custom tag support for personalized routines
- Daily practice streak tracking and grace-day logic

### Music theory and instrument learning
- Guitar fretboard explorer with tuning, fret count, note display modes, and fretboard styling options
- Piano keyboard visualization for scales and chords
- Scale library with root selection, scale categories, degree/interval naming, and playback directions
- Chord library with root selection, chord type search, inversions, and piano/guitar voicing previews
- Exercise library with technique, theory, rhythm, and speed-building drills
- Custom chord creation and saved chord shapes
- Circle of fifths and interval ear training utilities
- Guitar tuning presets and default instrument configuration

### Practice tools
- Precision metronome with tempo control, time signatures, click styles, and bar-cycle mode
- Practice timer with configurable presets and completions
- Random note drill with interval-based prompts and auto-advance options
- Session logging with BPM tracking and focus notes
- Saved song progressions and chord queue builder with strumming/fingerpicking patterns
- Progression playback, reverb, instrument settings, and saved progression library

### Analytics and retention
- Session review and task attribution tracking
- Detailed stats dashboard with weekly/monthly/all-time practice breakdowns
- Practice activity charts for task, timer, metronome, custom, and session sources
- Streak, task completion, and cumulative practice insights

### Data management and configuration
- Export and import full backups or selective backup categories
- Local browser storage for sessions, tasks, settings, saved selections, and layout state
- Theme switching, master audio volume, and app-wide preferences
- Task defaults for duration, completion behavior, and dashboard auto-setup
- Notification permission handling for timer completion alerts
- Full onboarding flow and guided tour for first-time users

## Technologies

- React 19
- TypeScript 5.8
- Vite 6
- Tailwind CSS 4
- Lucide React
- Motion for UI animation
- Recharts for charts and analytics
- Web Audio API with `smplr` and `soundfont2` for tones and practice tools
- Browser `localStorage` for user data, settings, sessions, and layout persistence

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

4. Open the URL printed by Vite. The project is configured for port `3000`, so the default local URL is:

   ```text
   http://localhost:3000
   ```

The app runs as a client-side web application. Practice data is stored in the browser you use, so switching browsers or clearing site data will not carry sessions, tasks, or settings over automatically.

## Available Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the Vite development server on port 3000 |
| `npm run build` | Create the production build in `dist/` |
| `npm run preview` | Preview the production build locally |
| `npm run lint` | Run the TypeScript compiler without emitting files |
| `npm run clean` | Remove generated build output |
| `npm run chords:export` | Export the chord library data |
| `npm run chords:import` | Import chord data |
| `npm run version:patch` | Bump the app version (patch) |
| `npm run version:minor` | Bump the app version (minor) |
| `npm run version:major` | Bump the app version (major) |

## Project Structure

```text
src/
  components/   Reusable UI, instrument views, timers, widgets, and modals
  data/         Chord, scale, exercise, tuning, and song preset data
  lib/          Audio engine, storage, task logic, analytics, and backup utilities
  pages/        Dashboard, chords, scales, builder, exercises, tools, stats, and routine views
  App.tsx       Global app state, navigation, session tracking, and orchestration
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

- The browser may require a user interaction before audio playback starts.
- The app requests notification permission only when needed for timer completion alerts.
- `metadata.json` describes the app for the host environment, while the primary runtime is the Vite frontend.
