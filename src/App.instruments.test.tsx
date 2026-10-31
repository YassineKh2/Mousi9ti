import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { it } from "node:test";
import { build } from "esbuild";

const root = fileURLToPath(new URL("../", import.meta.url));
const appPath = path.join(root, "src/App.tsx");
const chrome = [
  process.env.CHROME_BIN,
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
].find((candidate) => candidate && existsSync(candidate));

const audioFixture = `
  const listeners = new Set();
  export const audioEngine = window.__audio = {
    running: false,
    isRunning() { return this.running; },
    onMetronomeStateChange(listener) { listeners.add(listener); return () => listeners.delete(listener); },
    onSoundfontLoadingChange(listener) { listener([]); return () => {}; },
    startMetronome() { this.running = true; for (const listener of listeners) listener(true); },
    stopMetronome() { this.running = false; for (const listener of listeners) listener(false); },
    getMetronomeState() { return { bpm: 120, timeSignature: 4, subdivision: 1, soundType: 'click' }; },
    setVolume() {}, playTimerCompletionSound() {},
  };
`;

const browserTests = String.raw`
  import React, { act } from 'react';
  import { createRoot } from 'react-dom/client';
  import { App } from './src/App';
  import { timerEngine } from './src/lib/timerEngine';
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  window.__probes = {};
  let now = 1800000000000;
  Date.now = () => now;
  const intervals = new Map();
  let intervalId = 0;
  window.setInterval = callback => { intervals.set(++intervalId, callback); return intervalId; };
  window.clearInterval = id => intervals.delete(id);
  const tick = () => { for (const callback of [...intervals.values()]) callback(); };
  const results = [];
  const check = (condition, message) => { if (!condition) throw new Error(message); };
  const equal = (actual, expected, message) => check(
    JSON.stringify(actual) === JSON.stringify(expected),
    message + ': expected ' + JSON.stringify(expected) + ', got ' + JSON.stringify(actual),
  );
  const read = (key) => JSON.parse(localStorage.getItem(key) || '[]');
  const probe = (name = 'DashboardPage') => {
    check(window.__probes[name], 'Missing mounted probe ' + name);
    return window.__probes[name];
  };
  const change = async (callback) => { await act(async () => callback()); };
  let mounted;
  async function mount(settings = { defaultInstrument: 'piano' }, saved = {}) {
    if (mounted) await change(() => mounted.unmount());
    timerEngine.cancel();
    localStorage.clear();
    localStorage.setItem('Mousi9ti_settings_v1', JSON.stringify(settings));
    localStorage.setItem('Mousi9ti_tour_done', 'true');
    localStorage.setItem('mous9iti_tasks', JSON.stringify([
      { id: 'piano-task', text: 'Piano scales', instrument: 'piano', completed: false },
      { id: 'guitar-task', text: 'Guitar scales', instrument: 'guitar', completed: false },
    ]));
    for (const [key, value] of Object.entries(saved)) localStorage.setItem(key, value);
    history.replaceState({}, '', '/');
    window.__probes = {};
    mounted = createRoot(document.getElementById('root'));
    await change(() => mounted.render(<App />));
  }
  const switchTo = async (instrument, name = 'DashboardPage') => {
    await change(() => probe('SettingsModal').props.onUpdateSettings({ defaultInstrument: instrument }));
  };
  async function scenario(name, run, todo) {
    try { await run(); results.push({ name, todo }); }
    catch (error) { results.push({ name, todo, error: error.stack || String(error) }); }
  }
  await scenario('Default Instrument changes synchronize Tasks and Practice without moving existing records', async () => {
    await mount();
    equal(probe().activeInstrument, 'piano', 'Saved piano default');
    equal(probe('Navigation').activeInstrument, 'piano', 'Navigation shares provider');
    equal(probe().props.practiceTasks.map(task => task.id), ['piano-task'], 'Piano task scope');
    await switchTo('guitar');
    equal(probe().activeInstrument, 'guitar', 'Dashboard switch');
    equal(probe('Navigation').activeInstrument, 'guitar', 'Synchronous shared consumer');
    equal(probe().props.practiceTasks.map(task => task.id), ['guitar-task'], 'Guitar task scope');
    equal(read('Mousi9ti_settings_v1').defaultInstrument, 'guitar', 'Settings is the only selection control');
    equal(read('mous9iti_tasks').map(task => [task.id, task.instrument]), [['piano-task', 'piano'], ['guitar-task', 'guitar']], 'Changing default preserves task ownership');
    await change(() => probe('Navigation').props.onSelectTab('routine'));
    equal(probe('RoutinePage').activeInstrument, 'guitar', 'Route preserves provider state');
    await switchTo('piano', 'RoutinePage');
    equal(probe('Navigation').activeInstrument, 'piano', 'Routine switch syncs navigation');
    await change(() => probe('Navigation').props.onSelectTab('dashboard'));
    equal(probe().activeInstrument, 'piano', 'Return route sees shared state');
    await switchTo('violin');
    equal(probe().activeInstrument, 'guitar', 'Invalid runtime selection fallback');
    await mount();
    equal(probe().activeInstrument, 'piano', 'Remount uses saved default, not last switch');
  });
  await scenario('Bass selection and sessions preserve attribution when switching back to guitar', async () => {
    await mount({ defaultInstrument: 'bass' }, {
      mous9iti_tasks: JSON.stringify([
        { id: 'bass-task', text: 'Bass scales', instrument: 'bass', completed: false },
        { id: 'guitar-task', text: 'Guitar scales', instrument: 'guitar', completed: false },
      ]),
    });
    equal(probe().activeInstrument, 'bass', 'Bass default restored');
    equal(probe().props.practiceTasks.map(task => task.id), ['bass-task'], 'Bass task scope');
    await change(() => probe().props.onResumeSession());
    equal(localStorage.getItem('Mousi9ti_session_instrument'), 'bass', 'Bass session captured');
    now += 60000;
    await switchTo('guitar');
    equal(probe().props.isSessionActive, false, 'Bass session paused on switch');
    await change(() => probe().props.onEndSession());
    await change(() => probe('SessionReviewModal').props.onSave({ 'bass-task': 60 }));
    equal(read('Mousi9ti_sessions_v1')[0].instrument, 'bass', 'Bass ownership retained');
    equal(read('Mousi9ti_task_time_attributions_v1')[0].instrument, 'bass', 'Bass task allocation retained');
  });
  await scenario('App falls back to guitar for an invalid saved default', async () => {
    await mount({ defaultInstrument: 'violin' });
    equal(probe().activeInstrument, 'guitar', 'Invalid saved default');
    equal(probe('Navigation').activeInstrument, 'guitar', 'Shared fallback');
  });
  await scenario('Switching pauses a session, blocks cross-instrument resume, and saves only the captured instrument', async () => {
    await mount();
    await change(() => probe().props.onResumeSession());
    equal(localStorage.getItem('Mousi9ti_session_instrument'), 'piano', 'Session capture');
    now += 65000;
    await switchTo('guitar');
    equal(probe().props.isSessionActive, false, 'Switch pauses session');
    equal(probe().props.activeSessionDuration, 65, 'Elapsed duration preserved');
    equal(probe().props.timer.status, 'idle', 'Switch resets timer');
    const alerts = [];
    window.alert = message => alerts.push(message);
    await change(() => equal(probe().props.onResumeSession(), false, 'Cross-instrument resume rejected'));
    equal(alerts.length, 1, 'Resume explains conflict');
    await change(() => probe().props.onEndSession());
    const review = probe('SessionReviewModal').props;
    equal(review.globalDurationSeconds, 65, 'Review duration');
    equal(review.tasks.map(task => task.id), ['piano-task'], 'Review remains piano-scoped');
    equal(read('Mousi9ti_sessions_v1'), [], 'Nothing saved before confirmation');
    await change(() => review.onSave({ 'piano-task': 40, 'guitar-task': 25 }));
    const sessions = read('Mousi9ti_sessions_v1');
    equal(sessions.length, 1, 'Exactly one session');
    equal(sessions[0].instrument, 'piano', 'Fixed session attribution despite guitar selection');
    equal(sessions[0].durationSeconds, 65, 'Saved duration');
    const attributions = read('Mousi9ti_task_time_attributions_v1');
    equal(attributions.map(item => [item.taskId, item.instrument, item.durationSeconds]), [['piano-task', 'piano', 40]], 'Foreign task allocation rejected');
    equal(localStorage.getItem('Mousi9ti_session_instrument'), null, 'Capture cleared after save');
    await change(() => probe().props.onResumeSession());
    equal(localStorage.getItem('Mousi9ti_session_instrument'), 'guitar', 'Next session captures new selection');
  });
  for (const running of [true, false]) {
    await scenario('Restored ' + (running ? 'running' : 'paused') + ' piano session retains attribution under a guitar default', async () => {
      await mount({ defaultInstrument: 'guitar' }, {
        Mousi9ti_session_instrument: 'piano',
        Mousi9ti_session_is_active: String(running),
        Mousi9ti_session_accumulated: '45',
        ...(running ? { Mousi9ti_session_start_time: String(now - 15000) } : {}),
      });
      equal(probe().props.isSessionActive, false, 'Mismatched restored session is paused');
      await change(() => probe().props.onEndSession());
      const review = probe('SessionReviewModal').props;
      equal(review.globalDurationSeconds, running ? 60 : 45, 'Restored elapsed duration');
      await change(() => review.onSave({}));
      equal(read('Mousi9ti_sessions_v1').map(session => session.instrument), ['piano'], 'Restored capture wins over default');
    });
  }
  await scenario('A restored task segment is flushed once when switching instruments', async () => {
    await mount({ defaultInstrument: 'piano' }, {
      Mousi9ti_session_instrument: 'piano',
      Mousi9ti_session_is_active: 'true',
      Mousi9ti_session_start_time: String(now - 30000),
      Mousi9ti_active_task_id: 'piano-task',
      Mousi9ti_task_session_id: 'restored-task-session',
      Mousi9ti_task_active_segment: JSON.stringify({ taskId: 'piano-task', sessionId: 'restored-task-session', instrument: 'piano', startedAt: now - 30000 }),
    });
    await switchTo('guitar');
    const attributions = read('Mousi9ti_task_time_attributions_v1');
    equal(attributions.map(item => [item.instrument, item.durationSeconds]), [['piano', 30]], 'One piano segment');
    equal(read('mous9iti_tasks').find(task => task.id === 'piano-task').attributedDurationSeconds, 30, 'Task total increments once');
    await change(() => probe().props.onEndSession());
    equal(read('Mousi9ti_task_time_attributions_v1'), attributions, 'End must not reflush the segment');
  });
  await scenario('Metronome stop on switch records the original instrument exactly once', async () => {
    await mount();
    await change(() => window.__audio.startMetronome());
    now += 31000;
    await switchTo('guitar');
    await change(() => window.__audio.stopMetronome());
    const activities = read('Mousi9ti_practice_activities_v1').filter(item => item.source === 'metronome');
    equal(activities.map(item => [item.instrument, item.durationSeconds]), [['piano', 31]], 'One captured piano activity');
  });
  await scenario('Real timer completion records its start instrument exactly once across ticks and later switches', async () => {
    await mount();
    await change(() => probe().props.timer.start(60));
    now += 60000;
    await change(tick);
    await change(tick);
    await switchTo('guitar');
    await change(tick);
    const activities = read('Mousi9ti_practice_activities_v1').filter(item => item.source === 'timer');
    equal(activities.map(item => item.instrument), ['piano'], 'Timer captured instrument');
  });
  await scenario('Switching cancels a real running timer without a late or misattributed completion', async () => {
    await mount();
    await change(() => probe().props.timer.start(60));
    now += 30000;
    await switchTo('guitar');
    equal(timerEngine.getStatus(), 'idle', 'Engine reset on switch');
    now += 60000;
    await change(tick);
    equal(read('Mousi9ti_practice_activities_v1').filter(item => item.source === 'timer'), [], 'Cancelled timer must not record a completion');
  });
  await scenario('An empty session clears its capture so the next instrument can start', async () => {
    await mount();
    await change(() => probe().props.onResumeSession());
    await change(() => probe().props.onEndSession());
    equal(localStorage.getItem('Mousi9ti_session_instrument'), null, 'Empty capture removed');
    equal(read('Mousi9ti_sessions_v1'), [], 'Empty session is not logged');
    await switchTo('guitar');
    await change(() => equal(probe().props.onResumeSession(), true, 'Other instrument can start'));
    equal(localStorage.getItem('Mousi9ti_session_instrument'), 'guitar', 'Fresh guitar capture');
  });
  await scenario('Repeated review-save delivery must count practice minutes once', async () => {
    await mount();
    await change(() => probe().props.onResumeSession());
    now += 60000;
    await change(() => probe().props.onEndSession());
    const save = probe('SessionReviewModal').props.onSave;
    await change(() => { save({ 'piano-task': 60 }); save({ 'piano-task': 60 }); });
    equal(read('Mousi9ti_sessions_v1').length, 1, 'Session id is deduplicated');
    equal(read('Mousi9ti_task_time_attributions_v1').length, 1, 'Review allocations are idempotent');
    equal(read('Mousi9ti_streak_v1').history.reduce((sum, day) => sum + day.durationMin, 0), 1, 'Practice minutes counted once');
  });
  if (mounted) await change(() => mounted.unmount());
  timerEngine.cancel();
  document.getElementById('result').textContent = JSON.stringify(results);
`;

it(
  "App instrument regressions with real React hooks and browser storage",
  {
    skip: chrome
      ? false
      : "Chrome not found; set CHROME_BIN to enable browser integration tests",
    timeout: 60000,
  },
  async (context) => {
    const bundled = await build({
      stdin: { contents: browserTests, resolveDir: root, loader: "tsx" },
      bundle: true,
      write: false,
      format: "esm",
      define: { "process.env.NODE_ENV": '"development"' },
      plugins: [
        {
          name: "app-boundary-fixtures",
          setup(plugin) {
            plugin.onResolve(
              { filter: /^\.\/(components|pages)\// },
              (args) => {
                if (args.importer === appPath)
                  return { path: args.path, namespace: "probe" };
              },
            );
            plugin.onResolve({ filter: /^\.\/lib\/audio$/ }, (args) => {
              if (args.importer === appPath)
                return { path: args.path, namespace: "fixture" };
            });
            plugin.onResolve({ filter: /^canvas-confetti$/ }, () => ({
              path: "confetti",
              namespace: "fixture",
            }));
            plugin.onLoad({ filter: /.*/, namespace: "fixture" }, (args) => ({
              contents: args.path.endsWith("audio")
                ? audioFixture
                : "export default () => {};",
              resolveDir: root,
              loader: "tsx",
            }));
            plugin.onLoad({ filter: /.*/, namespace: "probe" }, (args) => {
              const name = path.basename(args.path);
              return {
                contents:
                  name === "PracticeTasksWidget"
                    ? "export const getSavedPracticeTasks = () => JSON.parse(localStorage.getItem('mous9iti_tasks') || '[]');"
                    : `import React, { useEffect } from 'react';
                 import { usePracticeInstrument } from './src/contexts/PracticeInstrumentContext';
                 export function ${name}(props) {
                   const instrument = usePracticeInstrument();
                   useEffect(() => { window.__probes.${name} = { props, ...instrument }; });
                   return <output data-probe="${name}">{instrument.activeInstrument}</output>;
                 }`,
                resolveDir: root,
                loader: "tsx",
              };
            });
          },
        },
      ],
    });
    const script = bundled.outputFiles[0].text;
    const server = createServer((request, response) => {
      if (request.url === "/test.js") {
        response.setHeader("Content-Type", "text/javascript");
        response.end(script);
      } else {
        response.setHeader("Content-Type", "text/html");
        response.end(
          '<!doctype html><div id="root"></div><pre id="result">pending</pre><script type="module" src="/test.js"></script>',
        );
      }
    });
    const profile = await mkdtemp(path.join(tmpdir(), "mous9iti-instruments-"));
    try {
      await new Promise<void>((resolve) =>
        server.listen(0, "127.0.0.1", resolve),
      );
      const address = server.address();
      assert.ok(address && typeof address !== "string");
      const output = await new Promise<string>((resolve, reject) => {
        const child = spawn(chrome!, [
          "--headless",
          "--no-sandbox",
          "--disable-gpu",
          "--disable-background-networking",
          "--no-first-run",
          `--user-data-dir=${profile}`,
          "--dump-dom",
          "--virtual-time-budget=10000",
          `http://127.0.0.1:${address.port}/`,
        ]);
        let stdout = "";
        let stderr = "";
        const timeout = setTimeout(() => {
          child.kill("SIGKILL");
          reject(new Error("Chrome timed out\n" + stderr));
        }, 45000);
        child.stdout.on("data", (chunk) => {
          stdout += chunk;
        });
        child.stderr.on("data", (chunk) => {
          stderr += chunk;
        });
        child.on("error", (error) => {
          clearTimeout(timeout);
          reject(error);
        });
        child.on("close", (code) => {
          clearTimeout(timeout);
          if (code !== 0) reject(new Error(`Chrome exited ${code}\n${stderr}`));
          else resolve(stdout);
        });
      });
      const payload = output.match(/<pre id="result">([\s\S]*?)<\/pre>/)?.[1];
      assert.ok(
        payload && payload !== "pending",
        `Browser tests did not finish:\n${output.slice(-6000)}`,
      );
      const results: { name: string; error?: string; todo?: string }[] =
        JSON.parse(
          payload
            .replaceAll("&lt;", "<")
            .replaceAll("&gt;", ">")
            .replaceAll("&amp;", "&"),
        );
      assert.equal(results.length, 12, "All browser scenarios must execute");
      for (const result of results) {
        await context.test(result.name, { todo: result.todo }, () =>
          assert.equal(result.error, undefined, result.error),
        );
      }
    } finally {
      await new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      );
      await rm(profile, { recursive: true, force: true, maxRetries: 3 });
    }
  },
);
