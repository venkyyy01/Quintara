/**
 * Original sound design (§62): a small synthesised audio engine built on the
 * Web Audio API — no external assets, restrained default volume, and separate
 * master / music / effects buses.
 *
 * The engine is deliberately layered:
 *   master → compressor → destination
 *   ├── effects bus → convolution reverb send
 *   └── music bus  → convolution reverb send + tempo-synced echo
 *
 * Music is a generated, evolving chord bed with pads, bass, plucked arps and
 * airy texture. It changes scene with the game (menu / table / climax) and
 * fades rather than cutting. Effects are layered transients, bodies and tails,
 * so card selects feel wooden, placements feel physical and sequences ring.
 */

export interface SoundSettings {
  master: number; // 0..1
  effects: number; // 0..1
  music: number; // 0..1
  haptics: boolean;
}

export type MusicScene = "menu" | "game" | "climax";
export type HapticKind =
  | "selection"
  | "light"
  | "medium"
  | "warning"
  | "success"
  | "victory";

const DEFAULTS: SoundSettings = {
  master: 0.6,
  effects: 0.8,
  music: 0.25,
  haptics: true,
};

interface AudioGraph {
  ctx: AudioContext;
  master: GainNode;
  effects: GainNode;
  music: GainNode;
}

let settings: SoundSettings = { ...DEFAULTS };
let context: AudioContext | null = null;
let graph: AudioGraph | null = null;
let noiseBuffer: AudioBuffer | null = null;
let musicEngine: MusicEngine | null = null;
let musicScene: MusicScene = "menu";

function ctx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!context) {
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!Ctor) return null;
    context = new Ctor();
  }
  if (context.state === "suspended") void context.resume();
  return context;
}

/** Build the persistent bus graph once. */
function ensureGraph(): AudioGraph | null {
  const audio = ctx();
  if (!audio) return null;
  if (graph) return graph;

  const master = audio.createGain();
  master.gain.value = settings.master;

  const compressor = audio.createDynamicsCompressor();
  compressor.threshold.value = -20;
  compressor.knee.value = 24;
  compressor.ratio.value = 4;
  compressor.attack.value = 0.004;
  compressor.release.value = 0.25;

  master.connect(compressor).connect(audio.destination);

  const effects = audio.createGain();
  effects.gain.value = settings.effects;
  effects.connect(master);

  const music = audio.createGain();
  music.gain.value = settings.music;
  music.connect(master);

  // Convolution reverb gives every cue a believable room tail.
  const reverb = audio.createConvolver();
  reverb.buffer = createReverbImpulse(audio, 2.6, 2.3);
  const reverbWet = audio.createGain();
  reverbWet.gain.value = 0.34;
  reverb.connect(reverbWet).connect(master);

  const reverbSend = audio.createGain();
  reverbSend.gain.value = 1;
  reverbSend.connect(reverb);

  const effectsSend = audio.createGain();
  effectsSend.gain.value = 0.18;
  effects.connect(effectsSend).connect(reverbSend);

  const musicSend = audio.createGain();
  musicSend.gain.value = 0.3;
  music.connect(musicSend).connect(reverbSend);

  graph = { ctx: audio, master, effects, music };
  return graph;
}

function createReverbImpulse(
  audio: AudioContext,
  seconds: number,
  decay: number,
): AudioBuffer {
  const rate = audio.sampleRate;
  const length = Math.max(1, Math.floor(rate * seconds));
  const impulse = audio.createBuffer(2, length, rate);
  for (let channel = 0; channel < impulse.numberOfChannels; channel += 1) {
    const data = impulse.getChannelData(channel);
    for (let index = 0; index < length; index += 1) {
      const envelope = Math.pow(1 - index / length, decay);
      data[index] = (Math.random() * 2 - 1) * envelope;
    }
  }
  return impulse;
}

function getNoiseBuffer(audio: AudioContext): AudioBuffer {
  if (noiseBuffer) return noiseBuffer;
  const length = Math.floor(audio.sampleRate * 2);
  const buffer = audio.createBuffer(1, length, audio.sampleRate);
  const data = buffer.getChannelData(0);
  for (let index = 0; index < length; index += 1) {
    data[index] = Math.random() * 2 - 1;
  }
  noiseBuffer = buffer;
  return buffer;
}

function audible(): boolean {
  return settings.master > 0 && settings.effects > 0;
}

function audibleMusic(): boolean {
  return settings.master > 0 && settings.music > 0;
}

export function configureSound(next: Partial<SoundSettings>): void {
  settings = { ...settings, ...next };
  if (!graph || !context) return;
  const now = context.currentTime;
  graph.master.gain.setTargetAtTime(settings.master, now, 0.05);
  graph.effects.gain.setTargetAtTime(settings.effects, now, 0.05);
  graph.music.gain.setTargetAtTime(settings.music, now, 0.08);
}

export function getSoundSettings(): SoundSettings {
  return settings;
}

/* ==========================================================================
   SFX primitives
   ========================================================================== */

interface ToneOptions {
  frequency: number;
  type?: OscillatorType;
  start?: number;
  duration?: number;
  gain?: number;
  slideTo?: number;
  attack?: number;
  detune?: number;
  pan?: number;
  filter?: {
    type: BiquadFilterType;
    frequency: number;
    q?: number;
    sweepTo?: number;
  };
}

interface NoiseOptions {
  start?: number;
  duration?: number;
  gain?: number;
  filterType?: BiquadFilterType;
  frequency?: number;
  q?: number;
  sweepTo?: number;
  pan?: number;
}

function connectOutput(
  audio: AudioContext,
  node: AudioNode,
  pan: number,
  destination: AudioNode,
): void {
  if (Math.abs(pan) < 0.01) {
    node.connect(destination);
    return;
  }
  const panner = audio.createStereoPanner();
  panner.pan.value = Math.max(-1, Math.min(1, pan));
  node.connect(panner).connect(destination);
}

function tone(options: ToneOptions): void {
  const audio = ensureGraph();
  if (!audio || !audible()) return;

  const {
    frequency,
    type = "sine",
    duration = 0.2,
    gain = 0.1,
    slideTo,
    attack = 0.005,
    detune = 0,
    pan = 0,
    filter,
  } = options;
  const start = options.start ?? audio.ctx.currentTime;
  const peak = Math.max(0.0001, gain);

  const oscillator = audio.ctx.createOscillator();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(Math.max(20, frequency), start);
  if (slideTo !== undefined) {
    oscillator.frequency.exponentialRampToValueAtTime(
      Math.max(20, slideTo),
      start + duration,
    );
  }
  oscillator.detune.value = detune;

  const envelope = audio.ctx.createGain();
  envelope.gain.setValueAtTime(0.0001, start);
  envelope.gain.exponentialRampToValueAtTime(
    peak,
    start + Math.max(0.001, attack),
  );
  envelope.gain.exponentialRampToValueAtTime(0.0001, start + duration);

  let tail: AudioNode = oscillator;
  if (filter) {
    const biquad = audio.ctx.createBiquadFilter();
    biquad.type = filter.type;
    biquad.frequency.setValueAtTime(
      Math.max(20, filter.frequency),
      start,
    );
    if (filter.sweepTo !== undefined) {
      biquad.frequency.exponentialRampToValueAtTime(
        Math.max(20, filter.sweepTo),
        start + duration,
      );
    }
    biquad.Q.value = filter.q ?? 0.7;
    oscillator.connect(biquad);
    tail = biquad;
  }

  tail.connect(envelope);
  connectOutput(audio.ctx, envelope, pan, audio.effects);
  oscillator.start(start);
  oscillator.stop(start + duration + 0.05);
}

function noise(options: NoiseOptions = {}): void {
  const audio = ensureGraph();
  if (!audio || !audible()) return;

  const {
    duration = 0.2,
    gain = 0.05,
    filterType = "bandpass",
    frequency = 1200,
    q = 0.8,
    sweepTo,
    pan = 0,
  } = options;
  const start = options.start ?? audio.ctx.currentTime;
  const peak = Math.max(0.0001, gain);

  const source = audio.ctx.createBufferSource();
  source.buffer = getNoiseBuffer(audio.ctx);
  source.loop = true;

  const filter = audio.ctx.createBiquadFilter();
  filter.type = filterType;
  filter.frequency.setValueAtTime(Math.max(20, frequency), start);
  if (sweepTo !== undefined) {
    filter.frequency.exponentialRampToValueAtTime(
      Math.max(20, sweepTo),
      start + duration,
    );
  }
  filter.Q.value = q;

  const envelope = audio.ctx.createGain();
  envelope.gain.setValueAtTime(0.0001, start);
  envelope.gain.exponentialRampToValueAtTime(peak, start + 0.008);
  envelope.gain.exponentialRampToValueAtTime(0.0001, start + duration);

  source.connect(filter).connect(envelope);
  connectOutput(audio.ctx, envelope, pan, audio.effects);
  source.start(start);
  source.stop(start + duration + 0.05);
}

function randomPan(amount = 0.18): number {
  return (Math.random() * 2 - 1) * amount;
}

/* ==========================================================================
   Composed effects
   ========================================================================== */

export const sounds = {
  /** Soft wooden tick + glassy ping when a card is picked up. */
  select(): void {
    const audio = ensureGraph();
    if (!audio || !audible()) return;
    const start = audio.ctx.currentTime;
    const pitch = 1 + (Math.random() - 0.5) * 0.07;
    noise({
      start,
      duration: 0.05,
      gain: 0.022,
      filterType: "highpass",
      frequency: 2200,
      q: 0.5,
    });
    tone({
      frequency: 760 * pitch,
      type: "triangle",
      start,
      duration: 0.1,
      gain: 0.05,
      slideTo: 1160 * pitch,
      attack: 0.003,
      pan: randomPan(0.08),
    });
    tone({
      frequency: 1520 * pitch,
      type: "sine",
      start: start + 0.005,
      duration: 0.07,
      gain: 0.016,
      slideTo: 1740 * pitch,
      attack: 0.002,
      pan: randomPan(0.12),
    });
  },

  /** Physical marker drop: low body, mid knock and a bright transient. */
  place(): void {
    const audio = ensureGraph();
    if (!audio || !audible()) return;
    const start = audio.ctx.currentTime;
    const pitch = 1 + (Math.random() - 0.5) * 0.05;
    tone({
      frequency: 168 * pitch,
      type: "sine",
      start,
      duration: 0.28,
      gain: 0.26,
      slideTo: 68,
      attack: 0.004,
    });
    tone({
      frequency: 82,
      type: "sine",
      start: start + 0.005,
      duration: 0.34,
      gain: 0.16,
      slideTo: 52,
      attack: 0.006,
    });
    noise({
      start,
      duration: 0.11,
      gain: 0.055,
      filterType: "bandpass",
      frequency: 520,
      q: 1.1,
      sweepTo: 180,
    });
    tone({
      frequency: 1240 * pitch,
      type: "triangle",
      start,
      duration: 0.045,
      gain: 0.032,
      slideTo: 900,
      attack: 0.001,
      pan: randomPan(0.1),
    });
  },

  /** One-eyed Jack: a descending, filtered "peel" as a marker is lifted. */
  remove(): void {
    const audio = ensureGraph();
    if (!audio || !audible()) return;
    const start = audio.ctx.currentTime;
    tone({
      frequency: 430,
      type: "sawtooth",
      start,
      duration: 0.26,
      gain: 0.075,
      slideTo: 118,
      attack: 0.006,
      filter: {
        type: "lowpass",
        frequency: 1700,
        q: 0.8,
        sweepTo: 460,
      },
    });
    noise({
      start,
      duration: 0.24,
      gain: 0.04,
      filterType: "bandpass",
      frequency: 1100,
      q: 0.7,
      sweepTo: 260,
    });
  },

  /** Paper swish when a replacement card is drawn. */
  draw(): void {
    const audio = ensureGraph();
    if (!audio || !audible()) return;
    const start = audio.ctx.currentTime;
    noise({
      start,
      duration: 0.19,
      gain: 0.042,
      filterType: "bandpass",
      frequency: 1500,
      q: 0.75,
      sweepTo: 3300,
      pan: randomPan(0.14),
    });
    tone({
      frequency: 640,
      type: "triangle",
      start: start + 0.02,
      duration: 0.06,
      gain: 0.022,
      slideTo: 880,
      attack: 0.003,
    });
  },

  /** A five-line completion: rising bells over a warm low swell. */
  sequence(): void {
    const audio = ensureGraph();
    if (!audio || !audible()) return;
    const start = audio.ctx.currentTime;
    const notes = [659.25, 783.99, 1046.5, 1318.51];
    notes.forEach((frequency, index) => {
      const at = start + index * 0.09;
      tone({
        frequency,
        type: "sine",
        start: at,
        duration: 0.95,
        gain: 0.075,
        attack: 0.006,
        pan: (index - 1.5) * 0.16,
      });
      tone({
        frequency: frequency * 2,
        type: "triangle",
        start: at,
        duration: 0.5,
        gain: 0.016,
        attack: 0.003,
        pan: (index - 1.5) * 0.22,
      });
    });
    tone({
      frequency: 164.81,
      type: "sine",
      start,
      duration: 1.5,
      gain: 0.07,
      attack: 0.02,
    });
    noise({
      start,
      duration: 0.85,
      gain: 0.024,
      filterType: "highpass",
      frequency: 3200,
      q: 0.4,
    });
  },

  /** Two-note hand-off chime. */
  turn(): void {
    const audio = ensureGraph();
    if (!audio || !audible()) return;
    const start = audio.ctx.currentTime;
    [523.25, 659.25].forEach((frequency, index) => {
      tone({
        frequency,
        type: "triangle",
        start: start + index * 0.12,
        duration: 0.36,
        gain: 0.045,
        attack: 0.01,
        pan: index === 0 ? -0.12 : 0.12,
      });
    });
  },

  /** Full fanfare: bell melody, brass-like pad and shimmering tail. */
  victory(): void {
    const audio = ensureGraph();
    if (!audio || !audible()) return;
    const start = audio.ctx.currentTime;
    const melody = [523.25, 659.25, 783.99, 1046.5, 1318.51];
    melody.forEach((frequency, index) => {
      const at = start + index * (index < 2 ? 0.12 : 0.1);
      tone({
        frequency,
        type: "triangle",
        start: at,
        duration: 1.3,
        gain: 0.07,
        attack: 0.008,
        pan: (index - 2) * 0.1,
      });
      tone({
        frequency: frequency * 2,
        type: "sine",
        start: at,
        duration: 0.7,
        gain: 0.018,
        attack: 0.004,
      });
    });
    [130.81, 196, 261.63, 329.63].forEach((frequency) => {
      tone({
        frequency,
        type: "sawtooth",
        start,
        duration: 2.6,
        gain: 0.022,
        attack: 0.15,
        filter: { type: "lowpass", frequency: 1300, q: 0.6 },
      });
    });
    noise({
      start,
      duration: 1.6,
      gain: 0.022,
      filterType: "highpass",
      frequency: 2800,
      q: 0.4,
    });
  },

  /** Quiet, non-punishing invalid-action cue. */
  error(): void {
    const audio = ensureGraph();
    if (!audio || !audible()) return;
    const start = audio.ctx.currentTime;
    tone({
      frequency: 150,
      type: "square",
      start,
      duration: 0.18,
      gain: 0.035,
      slideTo: 100,
      attack: 0.004,
      filter: { type: "lowpass", frequency: 720, q: 0.8 },
    });
    tone({
      frequency: 104,
      type: "sawtooth",
      start: start + 0.02,
      duration: 0.2,
      gain: 0.025,
      slideTo: 82,
      attack: 0.004,
      filter: { type: "lowpass", frequency: 500, q: 0.7 },
    });
  },

  /** Dead-card exchange: a quick riffle of paper. */
  exchange(): void {
    const audio = ensureGraph();
    if (!audio || !audible()) return;
    const start = audio.ctx.currentTime;
    for (let index = 0; index < 3; index += 1) {
      noise({
        start: start + index * 0.06,
        duration: 0.08,
        gain: 0.028,
        filterType: "bandpass",
        frequency: 1800 + index * 500,
        q: 0.9,
        pan: (index - 1) * 0.22,
      });
    }
    tone({
      frequency: 520,
      type: "triangle",
      start: start + 0.18,
      duration: 0.1,
      gain: 0.025,
      slideTo: 760,
      attack: 0.003,
    });
  },

  /** Two-eyed Jack: a small magical shimmer. */
  jack(): void {
    const audio = ensureGraph();
    if (!audio || !audible()) return;
    const start = audio.ctx.currentTime;
    [880, 1174.66, 1567.98, 2093].forEach((frequency, index) => {
      tone({
        frequency,
        type: "sine",
        start: start + index * 0.045,
        duration: 0.5,
        gain: 0.032,
        attack: 0.003,
        pan: (index - 1.5) * 0.18,
      });
    });
    noise({
      start,
      duration: 0.5,
      gain: 0.022,
      filterType: "highpass",
      frequency: 4200,
      q: 0.5,
    });
  },

  /** Turn-timer warning. */
  lowTime(): void {
    const audio = ensureGraph();
    if (!audio || !audible()) return;
    const start = audio.ctx.currentTime;
    tone({
      frequency: 880,
      type: "sine",
      start,
      duration: 0.09,
      gain: 0.04,
      attack: 0.002,
    });
    tone({
      frequency: 660,
      type: "sine",
      start: start + 0.16,
      duration: 0.11,
      gain: 0.032,
      attack: 0.002,
    });
  },

  /** Light UI confirmation. */
  ui(): void {
    const audio = ensureGraph();
    if (!audio || !audible()) return;
    tone({
      frequency: 980,
      type: "sine",
      start: audio.ctx.currentTime,
      duration: 0.05,
      gain: 0.02,
      slideTo: 1240,
      attack: 0.002,
    });
  },
};

/* ==========================================================================
   Adaptive ambient music
   ========================================================================== */

interface Chord {
  readonly notes: readonly number[];
  readonly bass: number;
  readonly duration: number;
}

interface SceneSettings {
  readonly arpCount: number;
  readonly sparkleChance: number;
  readonly padGain: number;
  readonly brightness: number;
  readonly pulse: boolean;
}

const PROGRESSIONS: Record<MusicScene, readonly Chord[]> = {
  // Warm, open and curious — the lobby / home mood.
  menu: [
    { notes: [220, 261.63, 329.63, 392, 493.88], bass: 110, duration: 9 },
    { notes: [174.61, 220, 261.63, 329.63, 392], bass: 87.31, duration: 9 },
    { notes: [130.81, 196, 261.63, 329.63, 392], bass: 65.41, duration: 9 },
    { notes: [196, 246.94, 293.66, 392, 440], bass: 98, duration: 9 },
  ],
  // Lower, more focused, with a subtle pulse — the table mood.
  game: [
    { notes: [146.83, 174.61, 220, 261.63, 349.23], bass: 73.42, duration: 7.5 },
    { notes: [116.54, 146.83, 174.61, 233.08, 293.66], bass: 58.27, duration: 7.5 },
    { notes: [130.81, 174.61, 220, 261.63, 329.63], bass: 65.41, duration: 7.5 },
    { notes: [110, 164.81, 220, 261.63, 329.63], bass: 55, duration: 7.5 },
  ],
  // Brighter and more urgent — the final turns and victory.
  climax: [
    { notes: [130.81, 164.81, 196, 261.63, 329.63], bass: 65.41, duration: 6 },
    { notes: [146.83, 174.61, 220, 293.66, 349.23], bass: 73.42, duration: 6 },
    { notes: [116.54, 146.83, 196, 233.08, 293.66], bass: 58.27, duration: 6 },
    { notes: [98, 146.83, 196, 246.94, 293.66], bass: 49, duration: 6 },
  ],
};

const SCENE_SETTINGS: Record<MusicScene, SceneSettings> = {
  menu: { arpCount: 2, sparkleChance: 0.35, padGain: 0.02, brightness: 1, pulse: false },
  game: { arpCount: 3, sparkleChance: 0.5, padGain: 0.024, brightness: 1.15, pulse: true },
  climax: { arpCount: 4, sparkleChance: 0.7, padGain: 0.028, brightness: 1.35, pulse: true },
};

class MusicEngine {
  private readonly output: GainNode;
  private readonly delaySend: GainNode;
  private timer: number | null = null;
  private nextAt: number;
  private step = 0;
  private scene: MusicScene;
  private stopped = false;

  constructor(
    private readonly audio: AudioContext,
    destination: AudioNode,
    scene: MusicScene,
  ) {
    this.scene = scene;
    this.output = audio.createGain();
    this.output.gain.value = 0;
    this.output.connect(destination);

    // Tempo-synced echo for the plucked arpeggios.
    const delay = audio.createDelay(1.5);
    delay.delayTime.value = 0.42;
    const feedback = audio.createGain();
    feedback.gain.value = 0.26;
    const damp = audio.createBiquadFilter();
    damp.type = "lowpass";
    damp.frequency.value = 2300;
    delay.connect(damp).connect(feedback).connect(delay);
    delay.connect(this.output);

    this.delaySend = audio.createGain();
    this.delaySend.gain.value = 0.16;
    this.delaySend.connect(delay);

    this.nextAt = audio.currentTime + 0.25;
  }

  start(): void {
    const now = this.audio.currentTime;
    this.output.gain.setValueAtTime(0, now);
    this.output.gain.linearRampToValueAtTime(1, now + 3);
    this.timer = window.setInterval(this.tick, 250);
    this.tick();
  }

  setScene(scene: MusicScene): void {
    this.scene = scene;
  }

  stop(): void {
    if (this.stopped) return;
    this.stopped = true;
    if (this.timer !== null) {
      window.clearInterval(this.timer);
      this.timer = null;
    }
    const now = this.audio.currentTime;
    this.output.gain.cancelScheduledValues(now);
    this.output.gain.setTargetAtTime(0, now, 0.22);
    window.setTimeout(() => this.output.disconnect(), 1600);
  }

  private readonly tick = (): void => {
    if (this.stopped) return;
    const horizon = this.audio.currentTime + 1.2;
    let guard = 0;
    while (this.nextAt < horizon && guard < 8) {
      const chord = this.chordFor(this.step);
      this.scheduleChord(chord, this.step, this.nextAt);
      this.nextAt += chord.duration;
      this.step += 1;
      guard += 1;
    }
  };

  private chordFor(step: number): Chord {
    const progression = PROGRESSIONS[this.scene];
    return progression[step % progression.length] ?? progression[0]!;
  }

  private scheduleChord(chord: Chord, step: number, at: number): void {
    const scene = SCENE_SETTINGS[this.scene];
    const duration = chord.duration;

    chord.notes.forEach((note, index) => {
      this.pad(note, at, duration, index, scene);
    });
    this.bass(chord.bass, at, duration);
    this.texture(at, duration, scene);

    for (let index = 0; index < scene.arpCount; index += 1) {
      const note =
        chord.notes[(step + index * 2) % chord.notes.length] ?? chord.bass;
      const offset = (index / scene.arpCount) * duration + 0.4;
      this.pluck(note * 2, at + offset, scene);
    }

    if (Math.random() < scene.sparkleChance) {
      const note = chord.notes[(step + 3) % chord.notes.length] ?? chord.bass;
      this.sparkle(note * 4, at + duration * 0.55);
    }

    if (scene.pulse) {
      this.pulse(chord.bass * 2, at);
    }
  }

  private pad(
    frequency: number,
    at: number,
    duration: number,
    index: number,
    scene: SceneSettings,
  ): void {
    const audio = this.audio;
    const envelope = audio.createGain();
    const filter = audio.createBiquadFilter();
    filter.type = "lowpass";
    filter.Q.value = 0.55;
    const base = 420 + index * 70;
    filter.frequency.setValueAtTime(base * scene.brightness, at);
    filter.frequency.linearRampToValueAtTime(
      (base + 340) * scene.brightness,
      at + duration * 0.45,
    );
    filter.frequency.linearRampToValueAtTime(
      (base + 120) * scene.brightness,
      at + duration,
    );

    const peak = scene.padGain * (index === 0 ? 1.3 : 1);
    envelope.gain.setValueAtTime(0.0001, at);
    envelope.gain.linearRampToValueAtTime(peak, at + 2.1);
    envelope.gain.setValueAtTime(peak, at + Math.max(2.2, duration - 2.2));
    envelope.gain.exponentialRampToValueAtTime(0.0001, at + duration);

    const fundamental = audio.createOscillator();
    fundamental.type = "triangle";
    fundamental.frequency.value = frequency;
    fundamental.detune.value = -5 + index;

    const octave = audio.createOscillator();
    octave.type = "sine";
    octave.frequency.value = frequency * 2;
    octave.detune.value = 4 - index;

    fundamental.connect(filter);
    octave.connect(filter);
    filter.connect(envelope).connect(this.output);

    fundamental.start(at);
    octave.start(at);
    fundamental.stop(at + duration + 0.1);
    octave.stop(at + duration + 0.1);
  }

  private bass(frequency: number, at: number, duration: number): void {
    const audio = this.audio;
    const oscillator = audio.createOscillator();
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(frequency, at);

    const filter = audio.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 220;
    filter.Q.value = 0.5;

    const envelope = audio.createGain();
    envelope.gain.setValueAtTime(0.0001, at);
    envelope.gain.linearRampToValueAtTime(0.085, at + 0.12);
    envelope.gain.exponentialRampToValueAtTime(0.0001, at + duration * 0.9);

    oscillator.connect(filter).connect(envelope).connect(this.output);
    oscillator.start(at);
    oscillator.stop(at + duration);
  }

  private texture(at: number, duration: number, scene: SceneSettings): void {
    const audio = this.audio;
    const source = audio.createBufferSource();
    source.buffer = getNoiseBuffer(audio);
    source.loop = true;

    const filter = audio.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(620, at);
    filter.frequency.linearRampToValueAtTime(
      1450 * scene.brightness,
      at + duration * 0.6,
    );
    filter.Q.value = 0.35;

    const envelope = audio.createGain();
    envelope.gain.setValueAtTime(0.0001, at);
    envelope.gain.linearRampToValueAtTime(0.0065, at + duration * 0.35);
    envelope.gain.exponentialRampToValueAtTime(0.0001, at + duration);

    source.connect(filter).connect(envelope).connect(this.output);
    source.start(at);
    source.stop(at + duration + 0.05);
  }

  private pluck(frequency: number, at: number, scene: SceneSettings): void {
    const audio = this.audio;
    const oscillator = audio.createOscillator();
    oscillator.type = "triangle";
    oscillator.frequency.value = frequency;

    const filter = audio.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(2600 * scene.brightness, at);
    filter.frequency.exponentialRampToValueAtTime(700, at + 0.5);
    filter.Q.value = 0.8;

    const envelope = audio.createGain();
    envelope.gain.setValueAtTime(0.0001, at);
    envelope.gain.exponentialRampToValueAtTime(0.038, at + 0.006);
    envelope.gain.exponentialRampToValueAtTime(0.0001, at + 0.65);

    const panner = audio.createStereoPanner();
    panner.pan.value = (Math.random() * 2 - 1) * 0.42;

    oscillator.connect(filter).connect(envelope).connect(panner);
    panner.connect(this.output);
    panner.connect(this.delaySend);
    oscillator.start(at);
    oscillator.stop(at + 0.7);
  }

  private sparkle(frequency: number, at: number): void {
    const audio = this.audio;
    const oscillator = audio.createOscillator();
    oscillator.type = "sine";
    oscillator.frequency.value = frequency;
    const envelope = audio.createGain();
    envelope.gain.setValueAtTime(0.0001, at);
    envelope.gain.linearRampToValueAtTime(0.012, at + 0.4);
    envelope.gain.exponentialRampToValueAtTime(0.0001, at + 2.2);
    oscillator.connect(envelope).connect(this.output);
    oscillator.start(at);
    oscillator.stop(at + 2.3);
  }

  private pulse(frequency: number, at: number): void {
    const audio = this.audio;
    const oscillator = audio.createOscillator();
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(frequency, at);
    oscillator.frequency.exponentialRampToValueAtTime(frequency * 0.6, at + 0.2);
    const envelope = audio.createGain();
    envelope.gain.setValueAtTime(0.0001, at);
    envelope.gain.exponentialRampToValueAtTime(0.03, at + 0.01);
    envelope.gain.exponentialRampToValueAtTime(0.0001, at + 0.24);
    oscillator.connect(envelope).connect(this.output);
    oscillator.start(at);
    oscillator.stop(at + 0.26);
  }
}

export function setMusicScene(scene: MusicScene): void {
  musicScene = scene;
  musicEngine?.setScene(scene);
}

export function startMusic(): void {
  if (!audibleMusic()) return;
  const audio = ensureGraph();
  if (!audio) return;
  if (musicEngine) return;
  musicEngine = new MusicEngine(audio.ctx, audio.music, musicScene);
  musicEngine.start();
}

export function stopMusic(): void {
  if (musicEngine) {
    musicEngine.stop();
    musicEngine = null;
  }
}

/* ==========================================================================
   Haptics (§63)
   ========================================================================== */

const HAPTIC_PATTERNS: Record<HapticKind, number | number[]> = {
  selection: 7,
  light: 10,
  medium: [14, 26, 18],
  warning: [22, 34, 22, 34, 26],
  success: [12, 26, 14, 26, 30],
  victory: [18, 34, 18, 34, 24, 34, 40],
};

/** Light haptic feedback where supported and enabled (§63). */
export function haptic(kind: HapticKind): void {
  if (!settings.haptics || typeof navigator === "undefined") return;
  if (!("vibrate" in navigator)) return;
  try {
    navigator.vibrate(HAPTIC_PATTERNS[kind]);
  } catch {
    // Ignore platforms that reject vibration.
  }
}
