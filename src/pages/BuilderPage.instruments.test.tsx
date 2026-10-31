import assert from "node:assert/strict";
import { it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { existsSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";
import { BuilderPage } from "./BuilderPage";
import { SettingsContext } from "../contexts/SettingsContext";
import type { AppSettings, PracticeInstrument } from "../types";

function render(enabledInstruments?: PracticeInstrument[], defaultInstrument: PracticeInstrument = "guitar") {
  const settings = { defaultInstrument, enabledInstruments } as AppSettings;
  return renderToStaticMarkup(<SettingsContext.Provider value={settings}><BuilderPage settings={settings} /></SettingsContext.Provider>);
}

it("defaults Builder to the configured instrument without a voicing selector", () => {
  const html = render();
  assert.match(html, /data-voicing-instrument="guitar"/);
  assert.doesNotMatch(html, /Voicing instrument view|aria-label=".* view"/);
  assert.doesNotMatch(html, /optgroup label="Bass"/);
});

it("filters playback options and defaults voicings for every enabled subset", () => {
  const subsets: PracticeInstrument[][] = [["guitar"], ["bass"], ["piano"], ["guitar", "bass"], ["bass", "piano"], ["guitar", "piano"], ["guitar", "bass", "piano"]];
  for (const enabled of subsets) {
    const html = render(enabled);
    for (const [instrument, label, group] of [["guitar", "Guitar", "Guitars"], ["bass", "Bass", "Bass"], ["piano", "Piano", "Pianos &amp; Keys"]]) {
      assert.equal(html.includes(`optgroup label="${group}"`), enabled.includes(instrument as PracticeInstrument));
    }
    const expectedVoicingInstrument = enabled.includes("guitar") ? "guitar" : enabled[0];
    assert.match(html, new RegExp(`data-voicing-instrument="${expectedVoicingInstrument}"`));
    assert.equal((html.match(/data-voicing-instrument=/g) || []).length, 1);
    assert.doesNotMatch(html, /Voicing instrument view|aria-label=".* view"/);
    assert.match(html, /optgroup label="Synthesizers"/);
    assert.match(html, /option value="custom"/);
  }
  const bass = render(["bass"], "bass");
  assert.match(bass, /Four-string bass/);
  assert.doesNotMatch(bass, /String [56]/);
  assert.match(render(["piano"]), /option value="acoustic_grand_piano" selected=""/);
});

const chrome = [process.env.CHROME_BIN, "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", "/usr/bin/google-chrome", "/usr/bin/chromium"]
  .find(candidate => candidate && existsSync(candidate));

it("selects voicing families from playback while preserving mixed queue attribution", {
  skip: chrome ? false : "Chrome not found; set CHROME_BIN for browser coverage",
  timeout: 60000,
}, async () => {
  const root = fileURLToPath(new URL("../../", import.meta.url));
  const bundled = await build({
    stdin: { resolveDir: root, loader: "tsx", contents: `
      import React, { act } from 'react';
      import { createRoot } from 'react-dom/client';
      import { BuilderPage } from './src/pages/BuilderPage';
      import { SettingsContext } from './src/contexts/SettingsContext';
      import { getChordDefinition, saveCustomChord } from './src/data/chordsData';
      import { getBassVoicings, getVoicingPitches } from './src/lib/bassChords';
      globalThis.IS_REACT_ACT_ENVIRONMENT = true;
      const check = (condition, message) => { if (!condition) throw new Error(message); };
      window.calls = [];
      window.prompt = () => 'Mixed queue';
      const timers = new Map();
      let nextTimer = 0;
      window.setTimeout = (callback, delay) => { timers.set(++nextTimer, { callback, delay }); return nextTimer; };
      window.clearTimeout = id => timers.delete(id);
      const mounted = createRoot(document.getElementById('root'));
      let settings = { defaultInstrument: 'guitar', enabledInstruments: ['guitar', 'bass', 'piano'] };
      const render = () => act(async () => mounted.render(<SettingsContext.Provider value={settings}><BuilderPage settings={settings} /></SettingsContext.Provider>));
      const click = selector => act(async () => { const button = document.querySelector(selector); check(button, 'Missing ' + selector); button.click(); });
      const selectAudio = value => act(async () => {
        const select = document.querySelector('select[aria-label="Playback instrument"]');
        select.value = value;
        select.dispatchEvent(new Event('change', { bubbles: true }));
      });
      const audio = () => document.querySelector('select[aria-label="Playback instrument"]').value;
      const sections = () => [...document.querySelectorAll('[data-voicing-instrument]')].map(section => section.dataset.voicingInstrument).join();
      const save = async () => {
        const button = [...document.querySelectorAll('button')].find(button => button.textContent.trim() === 'Save');
        check(button, 'Save button missing');
        await act(async () => button.click());
        return JSON.parse(localStorage.getItem('Mousi9ti_saved_progressions'))[0].queue;
      };
      const add = async (instrument, index) => {
        const cards = document.querySelector('[data-voicing-instrument="' + instrument + '"]').querySelectorAll('[class~="group/voicing"]');
        const card = index === -1 ? cards[cards.length - 1] : cards[index];
        check(card, 'Missing card for ' + instrument);
        await act(async () => [...card.querySelectorAll('button')].find(button => button.textContent.includes('ADD VOICING')).click());
      };
      try {
        const guitar = getChordDefinition('C', 'major').voicings[0];
        const bass = getBassVoicings(getChordDefinition('C', 'major'))[0];
        for (const instrument of ['guitar', 'bass', 'piano']) saveCustomChord({
          id: 'custom-' + instrument, root: 'C', chordType: 'major', instrument,
          voicing: { ...(instrument === 'bass' ? bass : guitar), name: 'Custom ' + instrument },
          ...(instrument === 'piano' ? { pianoVoicing: { id: 'custom-keys', name: 'Custom piano', notes: [{ note: 'C', octave: 5, degree: '1' }] } } : {}),
        });
        await render();
        check(sections() === 'guitar', 'Default playback instrument selects guitar voicings');
        check(audio() === 'acoustic_guitar_nylon', 'Display must not change audio');
        for (const [instrument, playback] of [['guitar', 'acoustic_guitar_nylon'], ['bass', 'bass'], ['piano', 'acoustic_grand_piano']]) {
          await selectAudio(playback);
          check(sections() === instrument, 'Playback instrument selects matching voicings');
          const section = document.querySelector('[data-voicing-instrument="' + instrument + '"]');
          check(section.querySelector('[data-diagram="' + instrument + '"]'), 'Correct diagram family');
          check(section.querySelectorAll('[data-custom="true"]').length === 1, 'Custom chord stays in its own section');
          await add(instrument, instrument === 'piano' ? 8 : 1);
          await add(instrument, -1);
        }
        const before = await save();
        check(before.map(item => item.voicingInstrument).join() === 'guitar,guitar,bass,bass,piano,piano', 'Queue attributes source sections');
        check(before.filter(item => item.customChordId).map(item => item.customChordId).join() === 'custom-guitar,custom-bass,custom-piano', 'Custom IDs preserved');
        const queueLabels = () => [...document.querySelectorAll('[title="Click to edit chord"] span')].map(span => span.textContent).join();
        const originalLabels = queueLabels();
        for (const playback of ['bass', 'acoustic_grand_piano', 'acoustic_guitar_nylon']) {
          await selectAudio(playback);
          window.calls = [];
          await click('[title="Preview chord in selected instrument"]');
          const firstVoicingNotes = window.calls.find(call => call[0] === 'playChordArpeggio')[1];
          window.calls = [];
          await click('[title="Play Loop"]');
          for (let index = 1; index < before.length; index++) {
            const timer = [...timers.entries()].find(([, timer]) => timer.delay === 2000);
            check(timer, 'Queue playback schedules next chord');
            await act(async () => { timers.delete(timer[0]); timer[1].callback(); });
          }
          const played = window.calls.filter(call => call[0] === 'playChordArpeggio');
          check(played.length === 6 && played.every(call => call[2] === playback), 'Queue follows independent playback sound');
          const foreignIndex = playback === 'acoustic_grand_piano' ? 0 : 4;
          check(JSON.stringify(played[foreignIndex][1]) === JSON.stringify(firstVoicingNotes), 'Cross-family queue index resets to first voicing');
          if (playback === 'acoustic_grand_piano') check(played[5][1][0].octave === 5, 'Piano custom voicing retains register');
          await click('[title="Pause"]');
          check(queueLabels() === originalLabels, 'Queue labels follow source rather than playback');
        }
        await selectAudio('bass');
        check(sections() === 'bass', 'Bass playback selects bass voicings');
        window.calls = [];
        await click('[title="Preview Chord Sound"]');
        const preview = window.calls.find(call => call[0] === 'playChordArpeggio');
        check(preview[2] === 'bass' && JSON.stringify(preview[1]) === JSON.stringify(getVoicingPitches(bass)), 'Cross-family preview uses bass first voicing');
        await selectAudio('acoustic_grand_piano');
        check(sections() === 'piano', 'Single selection renders only piano');
        await selectAudio('synth_pad');
        settings = { ...settings, enabledInstruments: ['bass', 'piano'] };
        await render();
        check(sections() === 'bass', 'Unmapped playback sound uses the default enabled voicing family');
        check(audio() === 'synth_pad', 'Membership preserves independent synth sound');
        check(!document.querySelector('optgroup[label="Guitars"]'), 'Disabled guitar sounds hidden');
        settings = { ...settings, enabledInstruments: ['bass'] };
        await render();
        check(sections() === 'bass', 'Single enabled instrument remains the voicing family');
        check(!document.querySelector('optgroup[label="Pianos & Keys"]'), 'Disabled piano sounds hidden');
        check(JSON.stringify(await save()) === JSON.stringify(before), 'Settings and display must preserve mixed queue metadata');
        settings = { ...settings, enabledInstruments: ['bass', 'piano'] };
        await render();
        await selectAudio('acoustic_grand_piano');
        settings = { ...settings, enabledInstruments: ['bass'] };
        await render();
        check(audio() === 'bass', 'Disabled active playback normalizes');
        check(sections() === 'bass', 'Normalization keeps enabled display');
        for (const pair of [['guitar', 'bass'], ['guitar', 'piano'], ['bass', 'piano']]) {
          settings = { ...settings, enabledInstruments: pair };
          await render();
          await selectAudio(pair[1] === 'bass' ? 'bass' : pair[1] === 'piano' ? 'acoustic_grand_piano' : 'acoustic_guitar_nylon');
          check(sections() === pair[1], 'Playback instrument selects an enabled voicing family');
        }
        await act(async () => mounted.unmount());
        document.getElementById('result').textContent = 'passed';
      } catch (error) { document.getElementById('result').textContent = error.stack || String(error); }
    ` },
    bundle: true, write: false, format: "esm",
    define: { "process.env.NODE_ENV": '"development"' },
    plugins: [{ name: "builder-boundaries", setup(plugin) {
      plugin.onResolve({ filter: /^(\.\.\/components\/(ChordDiagram|KeyboardChordDiagram)|\.\.\/lib\/audio)$/ }, args => ({ path: args.path, namespace: "fixture" }));
      plugin.onLoad({ filter: /.*/, namespace: "fixture" }, args => ({
        loader: "tsx", resolveDir: root,
        contents: args.path.endsWith("audio")
          ? `export const audioEngine = new Proxy({}, { get: (_, method) => (...args) => { window.calls.push([method, ...args]); return 0; } });`
          : `import React from 'react'; export function ${path.basename(args.path)}(props) { return <div data-diagram={${args.path.endsWith("KeyboardChordDiagram") ? "'piano'" : "props.instrument"}} data-custom={props.voicing.name.startsWith('Custom')}>{props.voicing.name}</div>; }`,
      }));
    } }],
  });
  const server = createServer((request, response) => {
    response.setHeader("Content-Type", request.url === "/test.js" ? "text/javascript" : "text/html");
    response.end(request.url === "/test.js" ? bundled.outputFiles[0].text : '<div id="root"></div><pre id="result">pending</pre><script type="module" src="/test.js"></script>');
  });
  const profile = await mkdtemp(path.join(tmpdir(), "mous9iti-builder-"));
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
    assert.equal(output.match(/<pre id="result">([\s\S]*?)<\/pre>/)?.[1], "passed", output.slice(-4000));
  } finally {
    await new Promise<void>(resolve => server.close(() => resolve()));
    await rm(profile, { recursive: true, force: true, maxRetries: 3 });
  }
});