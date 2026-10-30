import assert from "node:assert/strict";
import { it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ScalesPage } from "./ScalesPage";
import { SettingsContext } from "../contexts/SettingsContext";
import type { AppSettings, PracticeInstrument } from "../types";
import type { ScaleInstrumentView } from "../lib/scaleRoutes";
import { existsSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

function render(enabledInstruments?: PracticeInstrument[], instrumentView: ScaleInstrumentView = "both") {
  const settings = { defaultInstrument: "guitar", defaultTuning: "Drop D", fretCount: 12, enabledInstruments } as AppSettings;
  return renderToStaticMarkup(
    <SettingsContext.Provider value={settings}>
      <ScalesPage settings={settings} initialScaleTarget={{ root: "A", scaleId: "pentatonic_minor", instrumentView }} />
    </SettingsContext.Provider>,
  );
}

it("defaults combined scales to guitar and piano without a bass toggle", () => {
  const html = render();
  assert.match(html, /aria-label="Guitar and Piano view"/);
  assert.match(html, />Both</);
  assert.doesNotMatch(html, /aria-label="Bass view"|data-instrument="bass"/);
  assert.match(html, /Piano Visible Range/);
});

it("renders separate guitar and bass tunings with piano in All view", () => {
  const html = render(["guitar", "bass", "piano"]);
  assert.match(html, />All</);
  assert.equal((html.match(/data-instrument="bass"/g) ?? []).length, 1);
  assert.equal((html.match(/data-string-index=/g) ?? []).length, 10);
  assert.match(html, /data-open-pitch="D2"/);
  assert.match(html, /data-open-pitch="E1"/);
  assert.match(html, /Piano Visible Range/);
});

it("combined membership and controls follow each enabled pair", () => {
  for (const pair of [["guitar", "bass"], ["bass", "piano"], ["guitar", "piano"]] as PracticeInstrument[][]) {
    const html = render(pair);
    assert.match(html, />Both</);
    assert.equal(html.includes("Piano Visible Range"), pair.includes("piano"));
    assert.equal(html.includes('data-instrument="bass"'), pair.includes("bass"));
    assert.equal((html.match(/data-string-index=/g) ?? []).length, (pair.includes("guitar") ? 6 : 0) + (pair.includes("bass") ? 4 : 0));
  }
});

it("normalizes disabled route views and combined view for a single instrument", () => {
  for (const view of ["guitar", "both"] as const) {
    const html = render(["bass"], view);
    assert.match(html, /aria-label="Bass view" aria-pressed="true"/);
    assert.doesNotMatch(html, /aria-label="Guitar view"|aria-label="Piano view"|>Both<|>All</);
    assert.match(html, /CAGED Box Patterns/);
    assert.equal((html.match(/data-string-index=/g) ?? []).length, 4);
  }
});

const chrome = [process.env.CHROME_BIN, "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", "/usr/bin/google-chrome", "/usr/bin/chromium"]
  .find(candidate => candidate && existsSync(candidate));

it("keeps combined patterns, bass playback/highlights, and settings normalization with real hooks", {
  skip: chrome ? false : "Chrome not found; set CHROME_BIN for browser coverage",
  timeout: 60000,
}, async () => {
  const root = fileURLToPath(new URL("../../", import.meta.url));
  const bundled = await build({
    stdin: { resolveDir: root, loader: "tsx", contents: `
      import React, { act } from 'react';
      import { createRoot } from 'react-dom/client';
      import { ScalesPage } from './src/pages/ScalesPage';
      import { getBassScalePlayback } from './src/lib/scaleRoutes';
      import { SCALES_DATABASE } from './src/data/musicTheory';
      globalThis.IS_REACT_ACT_ENVIRONMENT = true;
      const check = (condition, message) => { if (!condition) throw new Error(message); };
      const timers = new Map();
      let nextTimer = 0;
      window.setTimeout = (callback, delay) => { timers.set(++nextTimer, { callback, delay }); return nextTimer; };
      window.clearTimeout = id => timers.delete(id);
      window.calls = [];
      window.probes = {};
      const routes = [];
      const mounted = createRoot(document.getElementById('root'));
      const scale = SCALES_DATABASE.find(scale => scale.id === 'pentatonic_minor');
      const box = Object.keys(scale.cagedBoxes)[0];
      let target = { root: 'A', scaleId: scale.id, instrumentView: 'both' };
      let settings = { defaultInstrument: 'guitar', fretCount: 12, enabledInstruments: ['guitar', 'bass', 'piano'] };
      const render = () => act(async () => mounted.render(<ScalesPage settings={settings} initialScaleTarget={target} onScaleRouteChange={(...args) => routes.push(args)} />));
      const click = selector => act(async () => { const button = document.querySelector(selector); check(button, 'Missing button ' + selector); button.click(); });
      const play = async () => {
        window.calls = [];
        await click('button[title="Play Ascending"]');
        await act(async () => { for (const [id, timer] of [...timers]) if (timer.delay === 0) { timers.delete(id); timer.callback(); } });
      };
      try {
        await render();
        await click('button[aria-label="' + box + '"]');
        check(routes.at(-1)[3] === 'both', 'Pattern must preserve combined route');
        check(window.probes.bass.activeCagedBox === box, 'Bass receives numbered pattern');
        check(window.probes.guitar.activeCagedBox === box, 'Guitar receives numbered pattern');
        await play();
        check(window.calls.map(call => call[0]).sort().join() === 'bass,guitar,piano', 'All enabled instruments play');
        const bassPitch = getBassScalePlayback('A', scale, 12, null, 'ascending', box)[0];
        const bassCall = window.calls.find(call => call[0] === 'bass');
        check(bassCall[2] === bassPitch.octave, 'Bass playback uses actual low register');
        check(window.probes.bass.activePlayingString === bassPitch.stringIdx && window.probes.bass.activePlayingFret === bassPitch.fretNum, 'Bass owns its string/fret highlight');
        check(window.probes.piano.activePlayingOctave === 4, 'Piano retains independent focus');
        settings = { ...settings, enabledInstruments: ['bass', 'piano'] };
        await render();
        check(timers.size === 0, 'Membership change cancels scheduled playback');
        await click('button[aria-label="Bass view"]');
        await click('button[aria-label="' + box + '"]');
        check(routes.at(-1)[3] === 'bass' && routes.at(-1)[2] === box, 'Bass numbered routes preserved');
        settings = { ...settings, enabledInstruments: ['piano'] };
        await render();
        check(document.querySelector('button[aria-label="Piano view"]').getAttribute('aria-pressed') === 'true', 'Disabled selection normalizes');
        check(routes.at(-1)[3] === 'piano', 'Normalized selection updates route');
        check(!document.querySelector('button[aria-label="Bass view"]'), 'Disabled toggle hidden');
        target = { ...target, instrumentView: 'bass' };
        await render();
        check(routes.at(-1)[3] === 'piano', 'Disabled incoming route normalizes');
        settings = { ...settings, enabledInstruments: ['bass', 'piano'] };
        target = { ...target, instrumentView: 'both', boxKey: null, bassPosition: 5 };
        await render();
        check(window.probes.bass.fretRange.start === 5 && window.probes.bass.highlightedFrets.length > 0, 'Combined legacy bass position highlights remain');
        await play();
        check(window.calls.map(call => call[0]).sort().join() === 'bass,piano', 'Disabled guitar never plays');
        await act(async () => mounted.unmount());
        check(timers.size === 0, 'Unmount cancels playback');
        document.getElementById('result').textContent = 'passed';
      } catch (error) { document.getElementById('result').textContent = error.stack || String(error); }
    ` },
    bundle: true, write: false, format: "esm",
    define: { "process.env.NODE_ENV": '"development"' },
    plugins: [{ name: "scale-boundaries", setup(plugin) {
      plugin.onResolve({ filter: /^(\.\.\/components\/(Fretboard|PianoKeyboard)|\.\.\/lib\/audio)$/ }, args => ({ path: args.path, namespace: "fixture" }));
      plugin.onLoad({ filter: /.*/, namespace: "fixture" }, args => ({
        loader: "tsx", resolveDir: root,
        contents: args.path.endsWith("audio")
          ? `export const audioEngine = { playBassPluck: (...args) => window.calls.push(['bass', ...args]), playGuitarPluck: (...args) => window.calls.push(['guitar', ...args]), playPianoNote: (...args) => window.calls.push(['piano', ...args]) };`
          : `import React from 'react'; export function ${path.basename(args.path)}(props) { window.probes[props.instrument || 'piano'] = props; return <div />; }`,
      }));
    } }],
  });
  const server = createServer((request, response) => {
    response.setHeader("Content-Type", request.url === "/test.js" ? "text/javascript" : "text/html");
    response.end(request.url === "/test.js" ? bundled.outputFiles[0].text : '<div id="root"></div><pre id="result">pending</pre><script type="module" src="/test.js"></script>');
  });
  const profile = await mkdtemp(path.join(tmpdir(), "mous9iti-scales-"));
  try {
    await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
    const address = server.address();
    assert.ok(address && typeof address !== "string");
    const output = await new Promise<string>((resolve, reject) => {
      const child = spawn(chrome!, ["--headless", "--no-sandbox", "--disable-gpu", "--no-first-run", `--user-data-dir=${profile}`, "--dump-dom", "--virtual-time-budget=10000", `http://127.0.0.1:${address.port}/`]);
      let stdout = "";
      let stderr = "";
      const timeout = setTimeout(() => { child.kill("SIGKILL"); reject(new Error("Chrome timed out: " + stderr)); }, 45000);
      child.stdout.on("data", chunk => { stdout += chunk; });
      child.stderr.on("data", chunk => { stderr += chunk; });
      child.on("error", error => { clearTimeout(timeout); reject(error); });
      child.on("close", code => { clearTimeout(timeout); code === 0 ? resolve(stdout) : reject(new Error(stderr)); });
    });
    assert.equal(output.match(/<pre id="result">([\s\S]*?)<\/pre>/)?.[1], "passed", output.slice(-6000));
  } finally {
    await new Promise<void>(resolve => server.close(() => resolve()));
    await rm(profile, { recursive: true, force: true, maxRetries: 3 });
  }
});