import { Soundfont, Soundfont2 } from "smplr";
import { SoundFont2 } from "soundfont2";

// Web Audio API Sound Engine for Metronome, Guitar & Piano Synthesis

type MetronomeSubdivision = "quarter" | "eighth" | "sixteenth" | "triplet";
type MetronomeSound = "click" | "woodblock" | "tick" | "beep";
type BeatCallback = (
  beat: number,
  isAccent: boolean,
  isSubdivision: boolean,
  isSilentBar: boolean,
) => void;

class AudioEngine {
  private ctx: AudioContext | null = null;
  private isMuted = false;
  private masterGain: GainNode | null = null;
  private metronomeGain: GainNode | null = null;
  private dryGain: GainNode | null = null;
  private wetGain: GainNode | null = null;
  private convolver: ConvolverNode | null = null;
  private highpassFilter: BiquadFilterNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;

  // Reverb Parameters
  private reverbWet = 0.3;
  private reverbDecaySec = 2.2;
  private reverbEnabled = true;

  // Soundfont & Instrument instances
  private currentInstrument = "acoustic_guitar_nylon";
  private guitarInstrument: any = null;
  private pianoInstrument: any = null;
  private builderInstrumentInstance: any = null;
  private defaultSoundfontsRequested = false;
  public isSoundfontLoading = false;

  // Metronome Scheduling State
  private isMetronomePlaying = false;
  private metronomeTimerId: number | null = null;
  private nextNoteTime = 0;
  private currentSubdivisionIndex = 0;
  private currentBeat = 0;
  private bpm = 120;
  private beatsPerBar = 4;
  private beatUnit = 4;
  private subdivision: MetronomeSubdivision = "quarter";
  private soundType: MetronomeSound = "click";
  private volume = 0.8;
  private onBeatCallback: BeatCallback | null = null;
  private metronomeStateListeners: Set<(isPlaying: boolean) => void> =
    new Set();
  private metronomeBarCycleEnabled = false;
  private metronomeBarCycleShouldSound = true;
  private metronomeBarCycleStarted = false;

  constructor() {
    // AudioContext will be lazily initialized upon first user gesture
  }

  private notifyMetronomeStateListeners() {
    const isPlaying = this.isMetronomePlaying;
    this.metronomeStateListeners.forEach((listener) => listener(isPlaying));
  }

  public onMetronomeStateChange(
    listener: (isPlaying: boolean) => void,
  ): () => void {
    this.metronomeStateListeners.add(listener);
    return () => {
      this.metronomeStateListeners.delete(listener);
    };
  }

  public setMetronomeBeatCallback(onBeat: BeatCallback | null) {
    this.onBeatCallback = onBeat;
  }

  public getMetronomeState() {
    return {
      isPlaying: this.isMetronomePlaying,
      bpm: this.bpm,
      timeSignature: `${this.beatsPerBar}/${this.beatUnit}`,
      subdivision: this.subdivision,
      soundType: this.soundType,
      currentBeat: this.currentBeat,
      isMuted: this.isMuted,
    };
  }

  private createImpulseResponse(
    durationSec: number = 2.2,
    decayRate: number = 2.5,
  ): AudioBuffer | null {
    if (!this.ctx) return null;
    const sampleRate = this.ctx.sampleRate;
    const length = Math.max(1, Math.floor(sampleRate * durationSec));
    const impulse = this.ctx.createBuffer(2, length, sampleRate);
    const left = impulse.getChannelData(0);
    const right = impulse.getChannelData(1);

    for (let i = 0; i < length; i++) {
      const t = i / length;
      const envelope = Math.pow(1 - t, decayRate);
      left[i] = (Math.random() * 2 - 1) * envelope;
      right[i] = (Math.random() * 2 - 1) * envelope;
    }
    return impulse;
  }

  private getContext(): AudioContext {
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      this.ctx = new AudioCtx();

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);

      // Dedicated metronome bus bypasses reverb so click timing stays dry/clean.
      this.metronomeGain = this.ctx.createGain();
      this.metronomeGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);

      this.dryGain = this.ctx.createGain();
      this.dryGain.gain.setValueAtTime(1.0, this.ctx.currentTime);

      this.wetGain = this.ctx.createGain();
      this.wetGain.gain.setValueAtTime(
        this.reverbEnabled ? this.reverbWet : 0,
        this.ctx.currentTime,
      );

      this.convolver = this.ctx.createConvolver();
      const impulseBuffer = this.createImpulseResponse(
        this.reverbDecaySec,
        2.5,
      );
      if (impulseBuffer) {
        this.convolver.buffer = impulseBuffer;
      }

      this.highpassFilter = this.ctx.createBiquadFilter();
      this.highpassFilter.type = "highpass";
      this.highpassFilter.frequency.setValueAtTime(65, this.ctx.currentTime);
      this.highpassFilter.Q.setValueAtTime(0.707, this.ctx.currentTime);

      this.compressor = this.ctx.createDynamicsCompressor();
      this.compressor.threshold.setValueAtTime(-12, this.ctx.currentTime);
      this.compressor.knee.setValueAtTime(8, this.ctx.currentTime);
      this.compressor.ratio.setValueAtTime(3, this.ctx.currentTime);
      this.compressor.attack.setValueAtTime(0.005, this.ctx.currentTime);
      this.compressor.release.setValueAtTime(0.15, this.ctx.currentTime);

      this.masterGain.connect(this.dryGain);
      this.dryGain.connect(this.highpassFilter);

      this.masterGain.connect(this.convolver);
      this.convolver.connect(this.wetGain);
      this.wetGain.connect(this.highpassFilter);

      this.metronomeGain.connect(this.highpassFilter);

      this.highpassFilter.connect(this.compressor);
      this.compressor.connect(this.ctx.destination);

      // Auto-load default guitar & piano soundfonts on first context init
      if (!this.defaultSoundfontsRequested) {
        this.defaultSoundfontsRequested = true;
        this.loadSoundfonts();
      }
    }

    if (this.ctx.state === "suspended") {
      this.ctx.resume();
    }

    return this.ctx;
  }

  public setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);
    }
    if (this.metronomeGain && this.ctx) {
      this.metronomeGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);
    }
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
  }

  public setMetronomeBarCycle(enabled: boolean) {
    if (!enabled) {
      this.metronomeBarCycleEnabled = false;
      this.metronomeBarCycleShouldSound = true;
      this.metronomeBarCycleStarted = false;
      this.setMuted(false);
      return;
    }

    if (this.metronomeBarCycleEnabled) {
      return;
    }

    this.metronomeBarCycleEnabled = true;
    this.metronomeBarCycleShouldSound = true;
    this.metronomeBarCycleStarted = false;
    this.setMuted(false);
  }

  // Reverb Controls
  public setReverbWet(amount: number) {
    this.reverbWet = Math.max(0, Math.min(1, amount));
    if (this.wetGain && this.ctx) {
      this.wetGain.gain.setValueAtTime(
        this.reverbEnabled ? this.reverbWet : 0,
        this.ctx.currentTime,
      );
    }
  }

  public setReverbEnabled(enabled: boolean) {
    this.reverbEnabled = enabled;
    if (this.wetGain && this.ctx) {
      this.wetGain.gain.setValueAtTime(
        this.reverbEnabled ? this.reverbWet : 0,
        this.ctx.currentTime,
      );
    }
  }

  public setReverbDecay(seconds: number) {
    this.reverbDecaySec = Math.max(0.4, Math.min(6.0, seconds));
    if (this.convolver && this.ctx) {
      const impulseBuffer = this.createImpulseResponse(
        this.reverbDecaySec,
        2.5,
      );
      if (impulseBuffer) {
        this.convolver.buffer = impulseBuffer;
      }
    }
  }

  public getReverbState() {
    return {
      enabled: this.reverbEnabled,
      wet: this.reverbWet,
      decay: this.reverbDecaySec,
    };
  }

  public stopAllNotes() {
    try {
      if (
        this.guitarInstrument &&
        typeof this.guitarInstrument.stop === "function"
      ) {
        this.guitarInstrument.stop();
      }
      if (
        this.pianoInstrument &&
        typeof this.pianoInstrument.stop === "function"
      ) {
        this.pianoInstrument.stop();
      }
      if (
        this.builderInstrumentInstance &&
        typeof this.builderInstrumentInstance.stop === "function"
      ) {
        this.builderInstrumentInstance.stop();
      }
    } catch {
      // Ignore stop errors if not supported
    }
  }

  public setSelectedInstrument(instrument: string) {
    this.currentInstrument = instrument;
  }

  public getSelectedInstrument(): string {
    return this.currentInstrument;
  }

  // Load High-Quality Soundfonts (Local or Remote)
  public async loadSoundfonts(
    guitarSource: string = "acoustic_guitar_nylon",
    pianoSource: string = "acoustic_grand_piano",
  ) {
    if (!this.ctx) this.getContext();
    if (!this.ctx) return;

    this.isSoundfontLoading = true;
    try {
      const destination = this.compressor || this.ctx.destination;

      // Always load the defaults if not already loaded (dry destination)
      if (!this.guitarInstrument) {
        this.guitarInstrument = Soundfont(this.ctx as any, {
          instrument: guitarSource,
          destination,
        });
        await this.guitarInstrument.ready;
      }
      if (!this.pianoInstrument) {
        this.pianoInstrument = Soundfont(this.ctx as any, {
          instrument: pianoSource,
          destination,
        });
        await this.pianoInstrument.ready;
      }
    } catch (err) {
      console.error("Failed to load default soundfonts:", err);
    } finally {
      this.isSoundfontLoading = false;
    }
  }

  public async loadBuilderSoundfont(source: string | File) {
    if (!this.ctx) this.getContext();
    if (!this.ctx) return;

    this.isSoundfontLoading = true;
    const isUploadedFile = typeof source !== "string";
    const sourceUrl = isUploadedFile ? URL.createObjectURL(source) : source;
    try {
      // Builder instrument uses masterGain (gets reverb)
      const destination =
        this.masterGain || this.compressor || this.ctx.destination;

      if (isUploadedFile || source.toLowerCase().endsWith(".sf2")) {
        this.builderInstrumentInstance = Soundfont2(this.ctx as any, {
          url: sourceUrl,
          createSoundfont: (data: ArrayBuffer) =>
            new SoundFont2(new Uint8Array(data)),
          destination,
        });
        await this.builderInstrumentInstance.ready;
        if (
          this.builderInstrumentInstance.instrumentNames &&
          this.builderInstrumentInstance.instrumentNames.length > 0
        ) {
          this.builderInstrumentInstance.loadInstrument(
            this.builderInstrumentInstance.instrumentNames[0],
          );
        }
      } else {
        this.builderInstrumentInstance = Soundfont(this.ctx as any, {
          instrument: source,
          destination,
        });
        await this.builderInstrumentInstance.ready;
      }
    } catch (err) {
      console.error("Failed to load builder soundfont:", err);
    } finally {
      if (isUploadedFile) URL.revokeObjectURL(sourceUrl);
      this.isSoundfontLoading = false;
    }
  }

  // Convert Note Name + Octave to Frequency (Hz)
  public noteToFrequency(note: string, octave: number = 4): number {
    const noteMap: { [key: string]: number } = {
      C: 0,
      "C#": 1,
      Db: 1,
      D: 2,
      "D#": 3,
      Eb: 3,
      E: 4,
      F: 5,
      "F#": 6,
      Gb: 6,
      G: 7,
      "G#": 8,
      Ab: 8,
      A: 9,
      "A#": 10,
      Bb: 10,
      B: 11,
    };

    const semitone = noteMap[note] ?? 0;
    const midiNumber = (octave + 1) * 12 + semitone;
    return 440 * Math.pow(2, (midiNumber - 69) / 12);
  }

  // Play a realistic synthesized acoustic guitar pluck
  public playGuitarPluck(
    note: string,
    octave: number = 3,
    duration: number = 1.8,
    timeOffset: number = 0,
    useBuilderInst: boolean = false,
  ) {
    if (this.isMuted) return;
    const ctx = this.getContext();
    const startTime = ctx.currentTime + timeOffset + 0.02;

    const instToUse = useBuilderInst
      ? this.builderInstrumentInstance
      : this.guitarInstrument;

    if (instToUse) {
      instToUse.start({
        note: note + octave,
        time: startTime,
        duration: Math.max(0.3, duration),
        velocity: Math.floor(this.volume * 95),
      });
      return;
    }

    const freq = this.noteToFrequency(note, octave);

    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const osc3 = ctx.createOscillator();

    const gain1 = ctx.createGain();
    const gain2 = ctx.createGain();
    const gain3 = ctx.createGain();

    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(Math.min(freq * 5, 5500), startTime);
    filter.frequency.exponentialRampToValueAtTime(
      Math.max(freq * 1.1, 160),
      startTime + duration,
    );
    filter.Q.setValueAtTime(0.707, startTime);

    osc1.type = "triangle";
    osc1.frequency.setValueAtTime(freq, startTime);

    osc2.type = "sawtooth";
    osc2.frequency.setValueAtTime(freq * 2, startTime);

    osc3.type = "sine";
    osc3.frequency.setValueAtTime(freq * 3, startTime);

    const masterPluckGain = ctx.createGain();
    masterPluckGain.gain.setValueAtTime(0, ctx.currentTime);
    masterPluckGain.gain.setValueAtTime(0.0001, startTime);
    masterPluckGain.gain.linearRampToValueAtTime(0.28, startTime + 0.005);
    masterPluckGain.gain.exponentialRampToValueAtTime(0.1, startTime + 0.12);
    masterPluckGain.gain.exponentialRampToValueAtTime(
      0.0001,
      startTime + duration * 0.96,
    );
    masterPluckGain.gain.linearRampToValueAtTime(0, startTime + duration);

    gain1.gain.setValueAtTime(0.7, startTime);
    gain2.gain.setValueAtTime(0.25, startTime);
    gain3.gain.setValueAtTime(0.1, startTime);

    osc1.connect(gain1);
    osc2.connect(gain2);
    osc3.connect(gain3);

    gain1.connect(filter);
    gain2.connect(filter);
    gain3.connect(filter);

    filter.connect(masterPluckGain);
    if (useBuilderInst && this.masterGain) {
      masterPluckGain.connect(this.masterGain);
    } else if (!useBuilderInst && this.compressor) {
      masterPluckGain.connect(this.compressor);
    } else {
      masterPluckGain.connect(ctx.destination);
    }

    osc1.start(startTime);
    osc2.start(startTime);
    osc3.start(startTime);

    osc1.stop(startTime + duration);
    osc2.stop(startTime + duration);
    osc3.stop(startTime + duration);
  }

  // Play a realistic synthesized acoustic piano tone
  public playPianoNote(
    note: string,
    octave: number = 4,
    duration: number = 2.0,
    timeOffset: number = 0,
    useBuilderInst: boolean = false,
  ) {
    if (this.isMuted) return;
    const ctx = this.getContext();
    const startTime = ctx.currentTime + timeOffset + 0.02;

    const instToUse = useBuilderInst
      ? this.builderInstrumentInstance
      : this.pianoInstrument;

    if (instToUse) {
      instToUse.start({
        note: note + octave,
        time: startTime,
        duration: Math.max(0.3, duration),
        velocity: Math.floor(this.volume * 95),
      });
      return;
    }

    const freq = this.noteToFrequency(note, octave);

    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const osc3 = ctx.createOscillator();

    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(Math.min(freq * 6, 7000), startTime);
    filter.frequency.exponentialRampToValueAtTime(
      Math.max(freq * 1.5, 250),
      startTime + duration,
    );
    filter.Q.setValueAtTime(0.707, startTime);

    const gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(0, ctx.currentTime);
    gainNode.gain.setValueAtTime(0.0001, startTime);
    gainNode.gain.linearRampToValueAtTime(0.3, startTime + 0.004);
    gainNode.gain.exponentialRampToValueAtTime(0.15, startTime + 0.18);
    gainNode.gain.exponentialRampToValueAtTime(
      0.0001,
      startTime + duration * 0.96,
    );
    gainNode.gain.linearRampToValueAtTime(0, startTime + duration);

    osc1.type = "sine";
    osc1.frequency.setValueAtTime(freq, startTime);

    osc2.type = "sine";
    osc2.frequency.setValueAtTime(freq * 2.001, startTime);

    osc3.type = "triangle";
    osc3.frequency.setValueAtTime(freq * 3, startTime);

    const mix1 = ctx.createGain();
    const mix2 = ctx.createGain();
    const mix3 = ctx.createGain();

    mix1.gain.value = 0.8;
    mix2.gain.value = 0.3;
    mix3.gain.value = 0.1;

    osc1.connect(mix1);
    osc2.connect(mix2);
    osc3.connect(mix3);

    mix1.connect(filter);
    mix2.connect(filter);
    mix3.connect(filter);

    filter.connect(gainNode);
    if (useBuilderInst && this.masterGain) {
      gainNode.connect(this.masterGain);
    } else if (!useBuilderInst && this.compressor) {
      gainNode.connect(this.compressor);
    } else {
      gainNode.connect(ctx.destination);
    }

    osc1.start(startTime);
    osc2.start(startTime);
    osc3.start(startTime);

    osc1.stop(startTime + duration);
    osc2.stop(startTime + duration);
    osc3.stop(startTime + duration);
  }

  // Play a crystal-clear, bright bell alert chime repeated 3 times
  public playTimerCompletionSound(
    repeatCount: number = 3,
    intervalSec: number = 0.65,
  ) {
    if (this.isMuted) return;
    const ctx = this.getContext();
    if (ctx.state === "suspended") {
      ctx.resume();
    }

    const now = ctx.currentTime + 0.015;

    for (let r = 0; r < repeatCount; r++) {
      const startTime = now + r * intervalSec;

      // Primary clear bell chime tone: C6 (1046.5 Hz)
      const oscPrimary = ctx.createOscillator();
      oscPrimary.type = "sine";
      oscPrimary.frequency.setValueAtTime(1046.5, startTime);

      // Secondary overtone for brightness and clarity: C7 (2093.0 Hz)
      const oscOctave = ctx.createOscillator();
      oscOctave.type = "sine";
      oscOctave.frequency.setValueAtTime(2093.0, startTime);

      // Subtle fifth harmonic for acoustic bell shimmer: G7 (3135.96 Hz)
      const oscFifth = ctx.createOscillator();
      oscFifth.type = "sine";
      oscFifth.frequency.setValueAtTime(3135.96, startTime);

      // Transient attack pulse to ensure crisp initial strike definition
      const oscTransient = ctx.createOscillator();
      oscTransient.type = "triangle";
      oscTransient.frequency.setValueAtTime(2093.0, startTime);
      oscTransient.frequency.exponentialRampToValueAtTime(
        1046.5,
        startTime + 0.025,
      );

      // Amplitude envelopes
      const gainPrimary = ctx.createGain();
      gainPrimary.gain.setValueAtTime(0, startTime);
      gainPrimary.gain.linearRampToValueAtTime(0.75, startTime + 0.003);
      gainPrimary.gain.exponentialRampToValueAtTime(0.3, startTime + 0.15);
      gainPrimary.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.55);

      const gainOctave = ctx.createGain();
      gainOctave.gain.setValueAtTime(0, startTime);
      gainOctave.gain.linearRampToValueAtTime(0.35, startTime + 0.003);
      gainOctave.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.4);

      const gainFifth = ctx.createGain();
      gainFifth.gain.setValueAtTime(0, startTime);
      gainFifth.gain.linearRampToValueAtTime(0.18, startTime + 0.003);
      gainFifth.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.25);

      const gainTransient = ctx.createGain();
      gainTransient.gain.setValueAtTime(0, startTime);
      gainTransient.gain.linearRampToValueAtTime(0.35, startTime + 0.002);
      gainTransient.gain.exponentialRampToValueAtTime(
        0.0001,
        startTime + 0.025,
      );

      oscPrimary.connect(gainPrimary);
      oscOctave.connect(gainOctave);
      oscFifth.connect(gainFifth);
      oscTransient.connect(gainTransient);

      const dest = this.masterGain || ctx.destination;
      gainPrimary.connect(dest);
      gainOctave.connect(dest);
      gainFifth.connect(dest);
      gainTransient.connect(dest);

      oscPrimary.start(startTime);
      oscPrimary.stop(startTime + 0.56);

      oscOctave.start(startTime);
      oscOctave.stop(startTime + 0.41);

      oscFifth.start(startTime);
      oscFifth.stop(startTime + 0.26);

      oscTransient.start(startTime);
      oscTransient.stop(startTime + 0.03);
    }
  }

  // Play a rich synthesized analog poly synth note
  public playSynthNote(
    note: string,
    octave: number = 3,
    duration: number = 2.0,
    timeOffset: number = 0,
    synthType: "poly" | "pad" | "lead" = "poly",
    useBuilderInst: boolean = false,
  ) {
    if (this.isMuted) return;
    const ctx = this.getContext();
    const startTime = ctx.currentTime + timeOffset + 0.02;
    const freq = this.noteToFrequency(note, octave);

    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const oscSub = ctx.createOscillator();

    const gainNode = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";

    if (synthType === "pad") {
      osc1.type = "sawtooth";
      osc1.frequency.setValueAtTime(freq, startTime);
      osc1.detune.setValueAtTime(-10, startTime);

      osc2.type = "sawtooth";
      osc2.frequency.setValueAtTime(freq, startTime);
      osc2.detune.setValueAtTime(10, startTime);

      oscSub.type = "sine";
      oscSub.frequency.setValueAtTime(freq / 2, startTime);

      filter.Q.setValueAtTime(1.8, startTime);
      filter.frequency.setValueAtTime(Math.min(freq * 1.2, 350), startTime);
      filter.frequency.exponentialRampToValueAtTime(
        Math.min(freq * 4.5, 3800),
        startTime + 0.35,
      );
      filter.frequency.exponentialRampToValueAtTime(
        Math.max(freq * 1.5, 280),
        startTime + duration,
      );

      gainNode.gain.setValueAtTime(0, ctx.currentTime);
      gainNode.gain.setValueAtTime(0.0001, startTime);
      gainNode.gain.linearRampToValueAtTime(0.22, startTime + 0.08);
      gainNode.gain.exponentialRampToValueAtTime(0.18, startTime + 0.4);
      gainNode.gain.exponentialRampToValueAtTime(
        0.0001,
        startTime + duration * 0.96,
      );
      gainNode.gain.linearRampToValueAtTime(0, startTime + duration);
    } else if (synthType === "lead") {
      osc1.type = "square";
      osc1.frequency.setValueAtTime(freq, startTime);
      osc1.detune.setValueAtTime(-5, startTime);

      osc2.type = "sawtooth";
      osc2.frequency.setValueAtTime(freq * 1.002, startTime);
      osc2.detune.setValueAtTime(5, startTime);

      oscSub.type = "triangle";
      oscSub.frequency.setValueAtTime(freq, startTime);

      filter.Q.setValueAtTime(3.5, startTime);
      filter.frequency.setValueAtTime(Math.min(freq * 2.5, 900), startTime);
      filter.frequency.exponentialRampToValueAtTime(
        Math.min(freq * 8, 8000),
        startTime + 0.03,
      );
      filter.frequency.exponentialRampToValueAtTime(
        Math.max(freq * 2.0, 450),
        startTime + duration * 0.7,
      );

      gainNode.gain.setValueAtTime(0, ctx.currentTime);
      gainNode.gain.setValueAtTime(0.0001, startTime);
      gainNode.gain.linearRampToValueAtTime(0.26, startTime + 0.008);
      gainNode.gain.exponentialRampToValueAtTime(0.16, startTime + 0.15);
      gainNode.gain.exponentialRampToValueAtTime(
        0.0001,
        startTime + duration * 0.96,
      );
      gainNode.gain.linearRampToValueAtTime(0, startTime + duration);
    } else {
      osc1.type = "sawtooth";
      osc1.frequency.setValueAtTime(freq, startTime);
      osc1.detune.setValueAtTime(-7, startTime);

      osc2.type = "sawtooth";
      osc2.frequency.setValueAtTime(freq, startTime);
      osc2.detune.setValueAtTime(7, startTime);

      oscSub.type = "triangle";
      oscSub.frequency.setValueAtTime(freq / 2, startTime);

      filter.Q.setValueAtTime(2.2, startTime);
      filter.frequency.setValueAtTime(Math.min(freq * 1.5, 450), startTime);
      filter.frequency.exponentialRampToValueAtTime(
        Math.min(freq * 6, 5500),
        startTime + 0.05,
      );
      filter.frequency.exponentialRampToValueAtTime(
        Math.max(freq * 1.8, 320),
        startTime + duration,
      );

      gainNode.gain.setValueAtTime(0, ctx.currentTime);
      gainNode.gain.setValueAtTime(0.0001, startTime);
      gainNode.gain.linearRampToValueAtTime(0.25, startTime + 0.012);
      gainNode.gain.exponentialRampToValueAtTime(0.18, startTime + 0.22);
      gainNode.gain.exponentialRampToValueAtTime(
        0.0001,
        startTime + duration * 0.96,
      );
      gainNode.gain.linearRampToValueAtTime(0, startTime + duration);
    }

    const mix1 = ctx.createGain();
    const mix2 = ctx.createGain();
    const mixSub = ctx.createGain();

    mix1.gain.value = 0.45;
    mix2.gain.value = 0.45;
    mixSub.gain.value = 0.25;

    osc1.connect(mix1);
    osc2.connect(mix2);
    oscSub.connect(mixSub);

    mix1.connect(filter);
    mix2.connect(filter);
    mixSub.connect(filter);

    filter.connect(gainNode);
    if (useBuilderInst && this.masterGain) {
      gainNode.connect(this.masterGain);
    } else if (!useBuilderInst && this.compressor) {
      gainNode.connect(this.compressor);
    } else {
      gainNode.connect(ctx.destination);
    }

    osc1.start(startTime);
    osc2.start(startTime);
    oscSub.start(startTime);

    osc1.stop(startTime + duration);
    osc2.stop(startTime + duration);
    oscSub.stop(startTime + duration);
  }

  // Play a single note using any active or specified instrument
  public playSingleInstrumentNote(
    note: string,
    octave: number = 3,
    duration: number = 1.8,
    timeOffset: number = 0,
    instrument?: string,
    useBuilder: boolean = false,
  ) {
    const targetInstrument =
      instrument || this.currentInstrument || "acoustic_guitar_nylon";
    const isPiano =
      targetInstrument.includes("piano") ||
      targetInstrument.includes("grand") ||
      targetInstrument === "piano";
    const isSynthPad = targetInstrument === "synth_pad";
    const isSynthLead = targetInstrument === "synth_lead";
    const isSynth =
      isSynthPad ||
      isSynthLead ||
      targetInstrument.includes("synth") ||
      targetInstrument === "synthesizer";

    if (isSynth) {
      const synthType = isSynthPad ? "pad" : isSynthLead ? "lead" : "poly";
      this.playSynthNote(
        note,
        octave,
        duration,
        timeOffset,
        synthType,
        useBuilder,
      );
    } else if (isPiano) {
      this.playPianoNote(note, octave, duration, timeOffset, useBuilder);
    } else {
      this.playGuitarPluck(note, octave, duration, timeOffset, useBuilder);
    }
  }

  // Play chord arpeggio / strum supporting all instrument types
  public playChordArpeggio(
    notes: { note: string; octave: number }[],
    instrument?: string,
    staggerSec: number = 0.06,
    globalOffsetSec: number = 0,
    noteDurationSec: number = 1.8,
    useBuilder: boolean = false,
  ) {
    const targetInstrument =
      instrument || this.currentInstrument || "acoustic_guitar_nylon";
    const isPiano =
      targetInstrument.includes("piano") ||
      targetInstrument.includes("grand") ||
      targetInstrument === "piano";
    const isSynthPad = targetInstrument === "synth_pad";
    const isSynthLead = targetInstrument === "synth_lead";
    const isSynth =
      isSynthPad ||
      isSynthLead ||
      targetInstrument.includes("synth") ||
      targetInstrument === "synthesizer";

    notes.forEach((n, idx) => {
      const offset = globalOffsetSec + idx * staggerSec;
      if (isSynth) {
        const synthType = isSynthPad ? "pad" : isSynthLead ? "lead" : "poly";
        this.playSynthNote(
          n.note,
          n.octave,
          noteDurationSec,
          offset,
          synthType,
          useBuilder,
        );
      } else if (isPiano) {
        this.playPianoNote(
          n.note,
          n.octave,
          noteDurationSec,
          offset,
          useBuilder,
        );
      } else {
        this.playGuitarPluck(
          n.note,
          n.octave,
          noteDurationSec,
          offset,
          useBuilder,
        );
      }
    });
  }

  // Metronome Click / Woodblock / Tick Synthesis
  private scheduleMetronomeTick(
    time: number,
    isAccent: boolean,
    isSubdivision: boolean,
  ) {
    if (this.isMuted) return;
    const ctx = this.getContext();

    if (this.soundType === "woodblock") {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      filter.type = "bandpass";
      filter.frequency.setValueAtTime(
        isAccent ? 1200 : isSubdivision ? 700 : 900,
        time,
      );
      filter.Q.setValueAtTime(8, time);

      osc.type = "sine";
      osc.frequency.setValueAtTime(
        isAccent ? 960 : isSubdivision ? 600 : 780,
        time,
      );

      const amp = isAccent ? 0.9 : isSubdivision ? 0.35 : 0.65;
      gain.gain.setValueAtTime(0, time);
      gain.gain.linearRampToValueAtTime(amp, time + 0.001);
      gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.045);

      osc.connect(filter);
      filter.connect(gain);
      if (this.metronomeGain) gain.connect(this.metronomeGain);
      else if (this.masterGain) gain.connect(this.masterGain);
      else gain.connect(ctx.destination);

      osc.start(time);
      osc.stop(time + 0.05);
    } else if (this.soundType === "tick") {
      const bufferSize = ctx.sampleRate * 0.02;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }

      const whiteNoise = ctx.createBufferSource();
      whiteNoise.buffer = buffer;

      const filter = ctx.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.setValueAtTime(
        isAccent ? 3500 : isSubdivision ? 1800 : 2600,
        time,
      );
      filter.Q.setValueAtTime(12, time);

      const gain = ctx.createGain();
      const amp = isAccent ? 0.8 : isSubdivision ? 0.3 : 0.55;
      gain.gain.setValueAtTime(amp, time);
      gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.015);

      whiteNoise.connect(filter);
      filter.connect(gain);
      if (this.metronomeGain) gain.connect(this.metronomeGain);
      else if (this.masterGain) gain.connect(this.masterGain);
      else gain.connect(ctx.destination);

      whiteNoise.start(time);
      whiteNoise.stop(time + 0.02);
    } else if (this.soundType === "beep") {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(
        isAccent ? 1760 : isSubdivision ? 880 : 1320,
        time,
      );

      const amp = isAccent ? 0.7 : isSubdivision ? 0.25 : 0.5;
      gain.gain.setValueAtTime(0, time);
      gain.gain.linearRampToValueAtTime(amp, time + 0.002);
      gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.06);

      osc.connect(gain);
      if (this.metronomeGain) gain.connect(this.metronomeGain);
      else if (this.masterGain) gain.connect(this.masterGain);
      else gain.connect(ctx.destination);

      osc.start(time);
      osc.stop(time + 0.07);
    } else {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "triangle";
      osc.frequency.setValueAtTime(
        isAccent ? 2400 : isSubdivision ? 1000 : 1600,
        time,
      );
      osc.frequency.exponentialRampToValueAtTime(
        isAccent ? 300 : 200,
        time + 0.012,
      );

      const amp = isAccent ? 0.95 : isSubdivision ? 0.35 : 0.7;
      gain.gain.setValueAtTime(amp, time);
      gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.02);

      osc.connect(gain);
      if (this.metronomeGain) gain.connect(this.metronomeGain);
      else if (this.masterGain) gain.connect(this.masterGain);
      else gain.connect(ctx.destination);

      osc.start(time);
      osc.stop(time + 0.025);
    }
  }

  private getSubdivisionsPerBeat(): number {
    switch (this.subdivision) {
      case "eighth":
        return 2;
      case "sixteenth":
        return 4;
      case "triplet":
        return 3;
      case "quarter":
      default:
        return 1;
    }
  }

  private advanceSubdivision() {
    const subsPerBeat = this.getSubdivisionsPerBeat();
    const secondsPerBeat = (60.0 / this.bpm) * (4 / this.beatUnit);
    const secondsPerSub = secondsPerBeat / subsPerBeat;

    this.nextNoteTime += secondsPerSub;
    this.currentSubdivisionIndex++;

    if (this.currentSubdivisionIndex >= subsPerBeat) {
      this.currentSubdivisionIndex = 0;
      this.currentBeat = (this.currentBeat + 1) % this.beatsPerBar;
    }
  }

  private scheduler() {
    if (!this.isMetronomePlaying) return;
    const ctx = this.getContext();
    const lookaheadSec = 0.1;
    const scheduleIntervalMs = 25;

    while (this.nextNoteTime < ctx.currentTime + lookaheadSec) {
      const isBeatStart = this.currentSubdivisionIndex === 0;
      const isAccent = isBeatStart && this.currentBeat === 0;
      const isSub = !isBeatStart;

      if (
        this.metronomeBarCycleEnabled &&
        isBeatStart &&
        this.currentBeat === 0
      ) {
        if (this.metronomeBarCycleStarted) {
          this.metronomeBarCycleShouldSound =
            !this.metronomeBarCycleShouldSound;
        } else {
          this.metronomeBarCycleStarted = true;
        }
        this.setMuted(!this.metronomeBarCycleShouldSound);
      }
      const isSilentBar =
        this.metronomeBarCycleEnabled &&
        !this.metronomeBarCycleShouldSound;

      this.scheduleMetronomeTick(this.nextNoteTime, isAccent, isSub);

      if (this.onBeatCallback) {
        const beatNum = this.currentBeat;
        const callback = this.onBeatCallback;
        const timeDiff = Math.max(
          0,
          (this.nextNoteTime - ctx.currentTime) * 1000,
        );
        window.setTimeout(() => {
          if (this.isMetronomePlaying && this.onBeatCallback === callback) {
            callback(beatNum, isAccent, isSub, isSilentBar);
          }
        }, timeDiff);
      }

      this.advanceSubdivision();
    }

    this.metronomeTimerId = window.setTimeout(
      () => this.scheduler(),
      scheduleIntervalMs,
    );
  }

  // Metronome Public Controls
  public startMetronome(
    bpm: number,
    timeSignature: string,
    subdivision: MetronomeSubdivision,
    sound: MetronomeSound,
    onBeat?: BeatCallback,
    initialDelaySeconds = 0,
  ) {
    const ctx = this.getContext();
    this.bpm = bpm;
    this.subdivision = subdivision;
    this.soundType = sound;
    if (onBeat) {
      this.onBeatCallback = onBeat;
    }

    const parts = timeSignature.split("/");
    this.beatsPerBar = parseInt(parts[0], 10) || 4;
    this.beatUnit = parseInt(parts[1], 10) || 4;

    this.isMetronomePlaying = true;
    this.currentBeat = 0;
    this.currentSubdivisionIndex = 0;
    this.metronomeBarCycleShouldSound = true;
    this.metronomeBarCycleStarted = false;
    this.setMuted(false);
    this.nextNoteTime =
      ctx.currentTime + Math.max(0.05, initialDelaySeconds);
    this.notifyMetronomeStateListeners();

    this.scheduler();
  }

  public updateMetronomeParams(
    bpm: number,
    timeSignature: string,
    subdivision: MetronomeSubdivision,
    sound: MetronomeSound,
  ) {
    this.bpm = bpm;
    this.subdivision = subdivision;
    this.soundType = sound;
    const parts = timeSignature.split("/");
    this.beatsPerBar = parseInt(parts[0], 10) || 4;
    this.beatUnit = parseInt(parts[1], 10) || 4;
    this.currentBeat %= this.beatsPerBar;
  }

  public resetMetronomePosition() {
    const ctx = this.getContext();
    this.currentBeat = 0;
    this.currentSubdivisionIndex = 0;
    this.metronomeBarCycleShouldSound = true;
    this.metronomeBarCycleStarted = false;
    this.setMuted(false);
    this.nextNoteTime = ctx.currentTime + 0.05;
  }

  public stopMetronome() {
    this.isMetronomePlaying = false;
    if (this.metronomeTimerId !== null) {
      clearTimeout(this.metronomeTimerId);
      this.metronomeTimerId = null;
    }
    this.metronomeBarCycleStarted = false;
    this.metronomeBarCycleShouldSound = true;
    this.setMuted(false);
    this.notifyMetronomeStateListeners();
  }

  public isRunning(): boolean {
    return this.isMetronomePlaying;
  }
}

export const audioEngine = new AudioEngine();
