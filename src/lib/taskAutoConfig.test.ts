import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  clampBpm,
  clampDurationMinutes,
  decideAutoConfigAction,
  formatConfigurationSummary,
  hasRecognizedConfiguration,
  parseTaskConfiguration,
} from "./taskAutoConfig";

describe("parseTaskConfiguration", () => {
  it("parses a full natural-language task (scale, bpm, duration)", () => {
    const config = parseTaskConfiguration(
      "Practice C major scale at 100 BPM for 10 minutes",
    );
    assert.equal(config.scale?.root, "C");
    assert.equal(config.scale?.scaleId, "major");
    assert.equal(config.bpm, 100);
    assert.equal(config.durationMinutes, 10);
  });

  it("parses a partial task with only bpm, leaving duration/scale unset", () => {
    const config = parseTaskConfiguration("Play arpeggios at 80 bpm");
    assert.equal(config.bpm, 80);
    assert.equal(config.durationMinutes, undefined);
    assert.equal(config.scale, undefined);
  });

  it("parses duration-only tasks", () => {
    const config = parseTaskConfiguration("Practice for 15 minutes");
    assert.equal(config.durationMinutes, 15);
    assert.equal(config.bpm, undefined);
    assert.equal(config.scale, undefined);
  });

  it("does not guess on ambiguous tasks with no root note", () => {
    const config = parseTaskConfiguration("Review scales");
    assert.equal(hasRecognizedConfiguration(config), false);
  });

  it("prefers structured @mentions over free text", () => {
    const config = parseTaskConfiguration(
      "Work on @technique(Alternate Picking) at @bpm(120)",
    );
    assert.equal(config.bpm, 120);
  });

  it("parses @scale, @metronome and @timer mentions", () => {
    const config = parseTaskConfiguration(
      "Play along with @metronome(90,4/4) for @timer(20) using @scale(A minor pentatonic)",
    );
    assert.equal(config.bpm, 90);
    assert.equal(config.durationMinutes, 20);
    assert.equal(config.scale?.root, "A");
    assert.equal(config.scale?.scaleId, "pentatonic_minor");
  });

  it("clamps an out-of-range bpm mention to the supported range", () => {
    const config = parseTaskConfiguration("Warm up at @bpm(500)");
    assert.equal(config.bpm, 300);
    const configLow = parseTaskConfiguration("Warm up at @bpm(1)");
    assert.equal(configLow.bpm, 20);
  });

  it("parses a chord from free text when explicitly labeled as a chord", () => {
    const config = parseTaskConfiguration("Practice the G major chord shapes");
    assert.equal(config.chord?.root, "G");
    assert.equal(config.chord?.type, "major");
  });

  it("does not confuse a bare root+quality phrase for a chord (defaults to scale)", () => {
    const config = parseTaskConfiguration("Practice C major for warmups");
    assert.equal(config.chord, undefined);
    assert.equal(config.scale?.root, "C");
  });

  it("parses @chord mentions", () => {
    const config = parseTaskConfiguration("Work on @chord(D minor)");
    assert.equal(config.chord?.root, "D");
    assert.equal(config.chord?.type, "minor");
  });

  it("parses a tuning from free text", () => {
    const config = parseTaskConfiguration("Practice riffs in Drop D tuning");
    assert.equal(config.tuning, "Drop D");
  });

  it("parses @tuning mentions", () => {
    const config = parseTaskConfiguration("Warm up with @tuning(DADGAD)");
    assert.equal(config.tuning, "DADGAD");
  });

  it("marks the metronome to auto-start when explicitly mentioned with a tempo", () => {
    const config = parseTaskConfiguration(
      "Play along with the metronome at 100 bpm",
    );
    assert.equal(config.startMetronome, true);
    assert.equal(config.bpm, 100);
  });

  it("does not auto-start the metronome when only a bare tempo is given", () => {
    const config = parseTaskConfiguration("Play arpeggios at 80 bpm");
    assert.equal(config.startMetronome, undefined);
  });

  it("auto-starts the metronome from an @metronome mention", () => {
    const config = parseTaskConfiguration("Play along with @metronome(90,4/4)");
    assert.equal(config.startMetronome, true);
  });

  it("recognizes free-text bpm within the supported metronome range", () => {
    const config = parseTaskConfiguration("Play scales at 999 bpm");
    // Free text bpm capture is limited to 2-3 digits, so 999 is still parsed and clamped.
    assert.equal(config.bpm, 300);
  });
});

describe("clampBpm / clampDurationMinutes", () => {
  it("clamps bpm to [20, 300]", () => {
    assert.equal(clampBpm(10), 20);
    assert.equal(clampBpm(500), 300);
    assert.equal(clampBpm(140), 140);
  });

  it("clamps duration minutes to [1, 180]", () => {
    assert.equal(clampDurationMinutes(0), 1);
    assert.equal(clampDurationMinutes(500), 180);
    assert.equal(clampDurationMinutes(25), 25);
  });
});

describe("formatConfigurationSummary", () => {
  it("formats all recognized fields", () => {
    const config = parseTaskConfiguration(
      "Practice C major scale at 100 BPM for 10 minutes",
    );
    const summary = formatConfigurationSummary(config);
    assert.deepEqual(summary, [
      "Scale: C Major",
      "Tempo: 100 BPM",
      "Duration: 10 min",
    ]);
  });

  it("formats an empty summary when nothing recognized", () => {
    const config = parseTaskConfiguration("Review scales");
    assert.deepEqual(formatConfigurationSummary(config), []);
  });
});

describe("decideAutoConfigAction", () => {
  it("does not apply when the preference is disabled", () => {
    const decision = decideAutoConfigAction({
      enabled: false,
      activeTaskId: "task-1",
      lastConfiguredTaskId: null,
    });
    assert.equal(decision.shouldApply, false);
  });

  it("applies once when a task becomes active for the first time", () => {
    const decision = decideAutoConfigAction({
      enabled: true,
      activeTaskId: "task-1",
      lastConfiguredTaskId: null,
    });
    assert.equal(decision.shouldApply, true);
    assert.equal(decision.nextLastConfiguredTaskId, "task-1");
  });

  it("does not re-apply on repeated renders/refreshes while the same task stays active", () => {
    const decision = decideAutoConfigAction({
      enabled: true,
      activeTaskId: "task-1",
      lastConfiguredTaskId: "task-1",
    });
    assert.equal(decision.shouldApply, false);
    assert.equal(decision.nextLastConfiguredTaskId, "task-1");
  });

  it("applies again when switching to a different active task", () => {
    const decision = decideAutoConfigAction({
      enabled: true,
      activeTaskId: "task-2",
      lastConfiguredTaskId: "task-1",
    });
    assert.equal(decision.shouldApply, true);
    assert.equal(decision.nextLastConfiguredTaskId, "task-2");
  });

  it("clears the tracker when the task is deactivated", () => {
    const decision = decideAutoConfigAction({
      enabled: true,
      activeTaskId: null,
      lastConfiguredTaskId: "task-1",
    });
    assert.equal(decision.shouldApply, false);
    assert.equal(decision.nextLastConfiguredTaskId, null);
  });

  it("re-applies when the same task is reactivated after being deactivated", () => {
    const deactivated = decideAutoConfigAction({
      enabled: true,
      activeTaskId: null,
      lastConfiguredTaskId: "task-1",
    });
    const reactivated = decideAutoConfigAction({
      enabled: true,
      activeTaskId: "task-1",
      lastConfiguredTaskId: deactivated.nextLastConfiguredTaskId,
    });
    assert.equal(reactivated.shouldApply, true);
    assert.equal(reactivated.nextLastConfiguredTaskId, "task-1");
  });
});
