import assert from "node:assert/strict";
import { it } from "node:test";
import { existsSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { build } from "esbuild";
import type { AppSettings, PracticeInstrument } from "../types";

Object.assign(globalThis, { __APP_VERSION__: "test" });
const { SettingsModal } = await import("./SettingsModal");

const noop = () => {};
const modalProps = {
  isOpen: true,
  onClose: noop,
  onOpenUpdates: noop,
  onUpdateSettings: noop,
  onExportData: noop,
  onImportFullData: noop,
  onImportSelectedData: noop,
  onClearData: noop,
  onClearStatsData: noop,
  onClearSavedChords: noop,
  onRestartTour: noop,
  completionBehavior: "ask" as const,
  onUpdateCompletionBehavior: noop,
  autoAdvanceTimedTasks: false,
  onToggleAutoAdvanceTimedTasks: noop,
  autoAdvanceDelaySeconds: 5,
  onChangeAutoAdvanceDelaySeconds: noop,
  autoConfigureDashboardFromTask: false,
  onToggleAutoConfigureDashboardFromTask: noop,
};
const baseSettings: AppSettings = {
  theme: "dark", taskInstrumentFilter: "both", taskDefaultDuration: "forever",
  taskDefaultCustomDuration: 4, taskDefaultCustomUnit: "months", accentColor: "#3b82f6",
  defaultInstrument: "guitar", defaultTuning: "E Standard", fretCount: 15,
  soundVolume: 1, metronomeSound: "click", fretboardTheme: "original",
  fretboardNoteSize: "medium", fretboardColorMode: "default", fretboardNotesColored: false,
  fretboardMarkerShape: "round", fretboardMinimalDetails: false, taskTagsColored: false,
  autoSaveSession: true, timerPresets: [3, 5, 10, 30], stopMetronomeOnTimerEnd: false,
  timerNotificationsEnabled: true,
};
const instruments: PracticeInstrument[] = ["guitar", "bass", "piano"];
const combinations: PracticeInstrument[][] = [
  ["guitar"], ["bass"], ["piano"], ["guitar", "bass"],
  ["guitar", "piano"], ["bass", "piano"], ["guitar", "bass", "piano"],
];

function render(enabledInstruments?: PracticeInstrument[]) {
  return renderToStaticMarkup(<SettingsModal {...modalProps} settings={{ ...baseSettings, enabledInstruments }} />);
}

function assertMarkup(html: string, enabled: PracticeInstrument[]) {
  const fieldset = html.match(/<fieldset\b[^>]*>[\s\S]*?<\/fieldset>/)?.[0];
  assert.ok(fieldset, "Available Instruments fieldset exists");
  assert.match(fieldset, /Available Instruments/);
  const labels = [...fieldset.matchAll(/<label\b[^>]*>([\s\S]*?)<\/label>/g)];
  assert.equal(labels.length, 3);
  for (const [index, instrument] of instruments.entries()) {
    const markup = labels[index][1];
    assert.match(markup, new RegExp(`>${instrument}</span>`));
    const input = markup.match(/<input\b[^>]*>/)?.[0];
    assert.ok(input);
    assert.equal(/\bchecked=""/.test(input), enabled.includes(instrument), `${instrument} checked`);
    assert.equal(/\bdisabled=""/.test(input), enabled.length === 1 && enabled.includes(instrument), `${instrument} disabled`);
    const title = instrument[0].toUpperCase() + instrument.slice(1);
    assert.equal(new RegExp(`<button\\b[^>]*>(?:(?!</button>)[\\s\\S])*<span>${title}</span></button>`).test(html), enabled.includes(instrument), `${instrument} default button`);
  }
}

it("defaults missing available instruments to Guitar and Piano, with Bass unchecked", () => {
  assertMarkup(render(), ["guitar", "piano"]);
});

it("filters default buttons and disables only the last checked instrument for every combination", () => {
  for (const enabled of combinations) assertMarkup(render(enabled), enabled);
});

const chrome = [process.env.CHROME_BIN, "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", "/usr/bin/google-chrome", "/usr/bin/chromium"]
  .find(candidate => candidate && existsSync(candidate));

it("updates instrument combinations, preserves or adjusts the default, and restores saved settings with real hooks", {
  skip: chrome ? false : "Chrome not found; set CHROME_BIN for browser coverage",
  timeout: 60000,
}, async () => {
  const root = fileURLToPath(new URL("../../", import.meta.url));
  const bundled = await build({
    stdin: { resolveDir: root, loader: "tsx", contents: `
      import React, { act } from 'react';
      import { createRoot } from 'react-dom/client';
      import { SettingsModal } from './src/components/SettingsModal';
      import { getSavedSettings, saveSettings } from './src/lib/storage';
      globalThis.IS_REACT_ACT_ENVIRONMENT = true;
      const check = (condition, message) => { if (!condition) throw new Error(message); };
      const equal = (actual, expected, message) => check(JSON.stringify(actual) === JSON.stringify(expected), message + ': ' + JSON.stringify(actual));
      const noop = () => {};
      const props = {
        isOpen: true, onClose: noop, onOpenUpdates: noop, onExportData: noop, onImportFullData: noop,
        onImportSelectedData: noop, onClearData: noop, onClearStatsData: noop,
        onClearSavedChords: noop, onRestartTour: noop, completionBehavior: 'ask',
        onUpdateCompletionBehavior: noop, autoAdvanceTimedTasks: false,
        onToggleAutoAdvanceTimedTasks: noop, autoAdvanceDelaySeconds: 5,
        onChangeAutoAdvanceDelaySeconds: noop, autoConfigureDashboardFromTask: false,
        onToggleAutoConfigureDashboardFromTask: noop,
      };
      const instruments = ${JSON.stringify(instruments)};
      const combinations = ${JSON.stringify(combinations)};
      localStorage.clear();
      let settings = { ...getSavedSettings() };
      delete settings.enabledInstruments;
      let mounted = createRoot(document.getElementById('root'));
      const updates = [];
      const update = patch => {
        updates.push(patch);
        settings = { ...settings, ...patch };
        saveSettings(settings);
        mounted.render(<SettingsModal {...props} settings={settings} onUpdateSettings={update} />);
      };
      const render = () => act(async () => mounted.render(<SettingsModal {...props} settings={settings} onUpdateSettings={update} />));
      const fieldset = () => [...document.querySelectorAll('fieldset')].find(element => element.querySelector('legend')?.textContent === 'Available Instruments');
      const checkbox = instrument => [...fieldset().querySelectorAll('label')].find(label => label.textContent.trim() === instrument)?.querySelector('input');
      const defaultButton = instrument => [...fieldset().nextElementSibling.querySelectorAll('button')].find(button => button.textContent.trim().toLowerCase() === instrument);
      const click = element => act(async () => { check(element, 'Missing control'); element.click(); });
      const assertControls = enabled => {
        for (const instrument of instruments) {
          const input = checkbox(instrument);
          check(input, 'Missing checkbox: ' + instrument);
          check(input.checked === enabled.includes(instrument), 'Checked state: ' + instrument);
          check(input.disabled === (enabled.length === 1 && enabled.includes(instrument)), 'Last checked guard: ' + instrument);
          check(Boolean(defaultButton(instrument)) === enabled.includes(instrument), 'Filtered default button: ' + instrument);
        }
      };
      const toggle = async (instrument, expectedPatch) => {
        const before = updates.length;
        await click(checkbox(instrument));
        check(updates.length === before + 1, 'Exactly one settings update per toggle');
        equal(updates.at(-1), expectedPatch, 'Exact toggle payload');
        equal(settings.enabledInstruments, expectedPatch.enabledInstruments, 'Parent merges membership');
        assertControls(expectedPatch.enabledInstruments);
        equal(getSavedSettings().enabledInstruments, expectedPatch.enabledInstruments, 'Saved membership');
        check(getSavedSettings().defaultInstrument === settings.defaultInstrument, 'Saved default');
      };
      try {
        await render();
        await click(document.getElementById('settings-tab-instrument'));
        assertControls(['guitar', 'piano']);
        check(updates.length === 0, 'Initial render must not write settings');
        await toggle('bass', { enabledInstruments: ['guitar', 'bass', 'piano'] });
        await click(defaultButton('bass'));
        equal(updates.at(-1), { defaultInstrument: 'bass' }, 'Exact default button payload');
        check(defaultButton('bass').getAttribute('aria-pressed') === 'true', 'Bass selection rerenders');
        await toggle('guitar', { enabledInstruments: ['bass', 'piano'] });
        check(settings.defaultInstrument === 'bass', 'Removing a nondefault preserves default');
        await toggle('bass', { enabledInstruments: ['piano'], defaultInstrument: 'piano' });
        const beforeDisabledClick = updates.length;
        await click(checkbox('piano'));
        check(updates.length === beforeDisabledClick, 'Disabled last checkbox cannot emit an empty selection');
        assertControls(['piano']);
        await toggle('bass', { enabledInstruments: ['bass', 'piano'] });
        await toggle('piano', { enabledInstruments: ['bass'], defaultInstrument: 'bass' });
        await toggle('guitar', { enabledInstruments: ['guitar', 'bass'] });
        await toggle('bass', { enabledInstruments: ['guitar'], defaultInstrument: 'guitar' });
        await toggle('piano', { enabledInstruments: ['guitar', 'piano'] });
        await click(defaultButton('piano'));
        equal(updates.at(-1), { defaultInstrument: 'piano' }, 'Piano default payload');
        await click(defaultButton('guitar'));
        equal(updates.at(-1), { defaultInstrument: 'guitar' }, 'Guitar default payload');
        await toggle('bass', { enabledInstruments: ['guitar', 'bass', 'piano'] });
        await toggle('guitar', { enabledInstruments: ['bass', 'piano'], defaultInstrument: 'bass' });
        const saved = getSavedSettings();
        await act(async () => mounted.unmount());
        mounted = createRoot(document.getElementById('root'));
        settings = getSavedSettings();
        equal(settings, saved, 'Fresh storage read restores saved settings');
        await render();
        await click(document.getElementById('settings-tab-instrument'));
        assertControls(['bass', 'piano']);
        check(defaultButton('bass').getAttribute('aria-pressed') === 'true', 'Saved default survives remount');
        const beforeRerenders = updates.length;
        for (const enabled of combinations) {
          settings = { ...settings, enabledInstruments: enabled, defaultInstrument: enabled[0] };
          await render();
          assertControls(enabled);
        }
        check(updates.length === beforeRerenders, 'Receiving new props must not emit updates');
        await act(async () => mounted.unmount());
        document.getElementById('result').textContent = 'passed';
      } catch (error) { document.getElementById('result').textContent = error.stack || String(error); }
    ` },
    bundle: true, write: false, format: "esm",
    define: { "process.env.NODE_ENV": '"development"', __APP_VERSION__: '"test"' },
  });
  const server = createServer((request, response) => {
    response.setHeader("Content-Type", request.url === "/test.js" ? "text/javascript" : "text/html");
    response.end(request.url === "/test.js" ? bundled.outputFiles[0].text : '<div id="root"></div><pre id="result">pending</pre><script type="module" src="/test.js"></script>');
  });
  const profile = await mkdtemp(path.join(tmpdir(), "mous9iti-settings-instruments-"));
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