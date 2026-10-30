import assert from "node:assert/strict";
import { it } from "node:test";
import { audioEngine } from "./audio";

function fixture(failFirstDownload = false) {
  const Engine = audioEngine.constructor as new () => typeof audioEngine;
  const engine = new Engine();
  const starts: { note: string; time: number; duration: number; velocity: number }[] = [];
  const sources: string[] = [];
  let oscillators = 0;
  let moduleLoads = 0;
  let finishLoading!: () => void;
  const ready = new Promise<void>(resolve => { finishLoading = resolve; });
  const parameter = () => ({ setValueAtTime() {}, exponentialRampToValueAtTime() {}, linearRampToValueAtTime() {} });
  const context = {
    currentTime: 10,
    destination: {},
    createGain: () => ({ gain: parameter(), connect() {}, disconnect() {} }),
    createBiquadFilter: () => ({ frequency: parameter(), Q: parameter(), connect() {} }),
    createOscillator: () => {
      oscillators++;
      return { frequency: parameter(), connect() {}, disconnect() {}, start() {}, stop() {} };
    },
  };
  Reflect.set(engine, "ctx", context);
  Reflect.set(engine, "getContext", () => context);
  Reflect.set(engine, "resolveSoundfontModules", async () => {
    moduleLoads++;
    return {
      Soundfont: (_context: unknown, options: { instrument: string }) => {
        sources.push(options.instrument);
        return {
          ready: failFirstDownload && sources.length === 1 ? Promise.reject(new Error("Download failed")) : ready,
          start: (options: typeof starts[number]) => starts.push(options),
        };
      },
    };
  });
  const pending = () => [...(Reflect.get(engine, "defaultSoundfontLoadPromises") as Map<string, Promise<void>>).values()];
  return { engine, context, sources, starts, finishLoading, pending, moduleLoads: () => moduleLoads, oscillators: () => oscillators };
}

const instruments = [
  { name: "guitar", method: "playGuitarPluck", source: "acoustic_guitar_nylon", octave: 3 },
  { name: "piano", method: "playPianoNote", source: "acoustic_grand_piano", octave: 4 },
  { name: "bass", method: "playBassPluck", source: "electric_bass_finger", octave: 1 },
] as const;

for (const instrument of instruments) {
  it(`queues the cold first ${instrument.name} note and immediately reuses cached samples`, async () => {
    const state = fixture();
    assert.equal(state.moduleLoads(), 0);
    assert.equal(state.engine.isSoundfontLoading, false);
    assert.deepEqual(state.sources, []);
    assert.equal(state.oscillators(), 0);
    state.engine[instrument.method]("E", instrument.octave, 1.8, 0.5);
    assert.equal(state.moduleLoads(), 1);
    assert.equal(state.pending().length, 1);
    assert.equal(state.engine.isSoundfontLoading, true);
    assert.deepEqual(state.starts, []);
    assert.equal(state.oscillators(), 0);
    await Promise.resolve();
    assert.deepEqual(state.sources, [instrument.source]);
    assert.deepEqual(state.starts, []);
    state.context.currentTime = 20;
    state.finishLoading();
    await Promise.all(state.pending());
    await Promise.resolve();
    assert.deepEqual(state.starts, [{ note: `E${instrument.octave}`, time: 20.52, duration: 1.8, velocity: 76 }]);
    assert.equal(state.engine.isSoundfontLoading, false);
    assert.equal(state.pending().length, 0);
    state.context.currentTime = 30;
    state.engine[instrument.method]("A", instrument.octave, 1, 0.25);
    assert.deepEqual(state.starts[1], { note: `A${instrument.octave}`, time: 30.27, duration: 1, velocity: 76 });
    assert.equal(state.moduleLoads(), 1);
    assert.deepEqual(state.sources, [instrument.source]);
    assert.equal(state.oscillators(), 0);
  });

  it(`deduplicates cold ${instrument.name} arpeggio loading and preserves its stagger after loading`, async () => {
    const state = fixture();
    const notes = ["C", "E", "G"];
    const offsets = [0, 0.15, 0.3];
    assert.equal(state.moduleLoads(), 0);
    assert.equal(state.oscillators(), 0);
    notes.forEach((note, index) => {
      state.engine[instrument.method](note, instrument.octave, 1.8, offsets[index]);
    });
    assert.equal(state.moduleLoads(), 1);
    assert.equal(state.pending().length, 1);
    assert.equal(state.engine.isSoundfontLoading, true);
    assert.deepEqual(state.starts, []);
    assert.equal(state.oscillators(), 0);
    await Promise.resolve();
    assert.deepEqual(state.sources, [instrument.source]);
    assert.deepEqual(state.starts, []);
    state.context.currentTime = 25;
    state.finishLoading();
    await Promise.all(state.pending());
    await Promise.resolve();
    assert.deepEqual(state.starts, notes.map((note, index) => ({
      note: `${note}${instrument.octave}`,
      time: 25 + offsets[index] + 0.02,
      duration: 1.8,
      velocity: 76,
    })));
    assert.equal(state.engine.isSoundfontLoading, false);
    assert.equal(state.pending().length, 0);
    assert.equal(state.moduleLoads(), 1);
    assert.equal(state.oscillators(), 0);
  });

  it(`suppresses a queued ${instrument.name} note when muted while loading`, async () => {
    const state = fixture();
    state.engine[instrument.method]("E", instrument.octave);
    state.engine.setMuted(true);
    state.finishLoading();
    await Promise.all(state.pending());
    await Promise.resolve();
    assert.deepEqual(state.starts, []);
    assert.equal(state.oscillators(), 0);
    assert.equal(state.engine.isSoundfontLoading, false);
    state.engine.setMuted(false);
    state.engine[instrument.method]("A", instrument.octave, 1);
    assert.deepEqual(state.starts, [{ note: `A${instrument.octave}`, time: 10.02, duration: 1, velocity: 76 }]);
    assert.equal(state.moduleLoads(), 1);
  });
}

it("does not load a soundfont while muted", () => {
  const state = fixture();
  state.engine.setMuted(true);
  state.engine.playBassPluck("G", 2);
  assert.equal(state.moduleLoads(), 0);
  assert.equal(state.oscillators(), 0);
});

it("stays silent and retries after a failed bass download", async test => {
  const state = fixture(true);
  test.mock.method(console, "error", () => {});
  state.engine.playBassPluck("E", 1);
  await Promise.all(state.pending());
  await Promise.resolve();
  assert.deepEqual(state.starts, []);
  assert.equal(state.oscillators(), 0);
  assert.equal(state.engine.isSoundfontLoading, false);
  assert.equal(state.pending().length, 0);
  assert.equal(state.moduleLoads(), 1);
  state.engine.playBassPluck("A", 1);
  assert.deepEqual(state.starts, []);
  assert.equal(state.engine.isSoundfontLoading, true);
  state.finishLoading();
  await Promise.all(state.pending());
  await Promise.resolve();
  assert.deepEqual(state.starts, [{ note: "A1", time: 10.02, duration: 1.8, velocity: 76 }]);
  state.engine.playBassPluck("G", 2, 1);
  assert.deepEqual(state.sources, ["electric_bass_finger", "electric_bass_finger"]);
  assert.deepEqual(state.starts[1], { note: "G2", time: 10.02, duration: 1, velocity: 76 });
  assert.equal(state.moduleLoads(), 2);
  assert.equal(state.oscillators(), 0);
  assert.equal(state.engine.isSoundfontLoading, false);
});

it("uses the Builder soundfont for bass without fetching a second default instrument", async () => {
  const state = fixture();
  const loading = state.engine.loadBuilderSoundfont("electric_bass_finger");
  state.engine.playBassPluck("E", 1, 1, 0.25, true);
  assert.deepEqual(state.starts, []);
  assert.equal(state.moduleLoads(), 1);
  assert.equal(state.pending().length, 0);
  assert.equal(state.oscillators(), 0);
  await Promise.resolve();
  assert.deepEqual(state.sources, ["electric_bass_finger"]);
  assert.deepEqual(state.starts, []);
  state.context.currentTime = 20;
  state.finishLoading();
  await loading;
  await Promise.resolve();
  assert.deepEqual(state.starts, [{ note: "E1", time: 20.27, duration: 1, velocity: 76 }]);
  state.engine.playBassPluck("D", 2, 1, 0, true);
  await state.engine.loadBuilderSoundfont("electric_bass_finger");
  assert.deepEqual(state.sources, ["electric_bass_finger"]);
  assert.deepEqual(state.starts[1], { note: "D2", time: 20.02, duration: 1, velocity: 76 });
  assert.equal(state.engine.isSoundfontLoading, false);
  assert.equal(state.moduleLoads(), 1);
  assert.equal(state.oscillators(), 0);
});

it("keeps guitar and piano samples isolated from the default bass cache", async () => {
  const state = fixture();
  state.engine.playGuitarPluck("E", 3);
  state.engine.playPianoNote("C", 4);
  await Promise.resolve();
  assert.deepEqual(state.sources, ["acoustic_guitar_nylon", "acoustic_grand_piano"]);
  state.finishLoading();
  await Promise.all(state.pending());
  state.engine.playBassPluck("E", 1);
  await Promise.resolve();
  await Promise.all(state.pending());
  assert.deepEqual(state.sources, ["acoustic_guitar_nylon", "acoustic_grand_piano", "electric_bass_finger"]);
});