/**
 * Original sound design (§62): synthesised WebAudio cues — no external
 * assets, restrained default volume. Master / music / effects are separately
 * controllable. Haptics respect user settings and platform support (§63).
 */

export interface SoundSettings {
  master: number; // 0..1
  effects: number; // 0..1
  music: number; // 0..1
  haptics: boolean;
}

const DEFAULTS: SoundSettings = {
  master: 0.6,
  effects: 0.8,
  music: 0.25,
  haptics: true,
};

let settings: SoundSettings = { ...DEFAULTS };
let context: AudioContext | null = null;
let musicNodes: { gain: GainNode; stop: () => void } | null = null;

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

export function configureSound(next: Partial<SoundSettings>): void {
  settings = { ...settings, ...next };
  if (musicNodes) {
    musicNodes.gain.gain.value = settings.master * settings.music * 0.12;
  }
}

export function getSoundSettings(): SoundSettings {
  return settings;
}

function tone(
  frequency: number,
  durationMs: number,
  type: OscillatorType = "sine",
  volume = 1,
  slideTo?: number,
): void {
  const audio = ctx();
  if (!audio || settings.master <= 0 || settings.effects <= 0) return;

  const now = audio.currentTime;
  const oscillator = audio.createOscillator();
  const gain = audio.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, now);
  if (slideTo) {
    oscillator.frequency.exponentialRampToValueAtTime(slideTo, now + durationMs / 1000);
  }
  const peak = settings.master * settings.effects * 0.16 * volume;
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(peak, now + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + durationMs / 1000);
  oscillator.connect(gain).connect(audio.destination);
  oscillator.start(now);
  oscillator.stop(now + durationMs / 1000 + 0.05);
}

export const sounds = {
  select(): void {
    tone(660, 90, "triangle", 0.7);
  },
  place(): void {
    tone(420, 180, "sine", 1, 240);
  },
  remove(): void {
    tone(330, 220, "sawtooth", 0.5, 180);
  },
  draw(): void {
    tone(720, 80, "triangle", 0.5);
  },
  sequence(): void {
    tone(523, 140, "triangle", 0.9);
    window.setTimeout(() => tone(659, 140, "triangle", 0.9), 90);
    window.setTimeout(() => tone(784, 240, "triangle", 0.9), 180);
  },
  turn(): void {
    tone(494, 120, "sine", 0.6);
  },
  victory(): void {
    const notes = [523, 659, 784, 1046];
    notes.forEach((note, index) => {
      window.setTimeout(() => tone(note, 320, "triangle", 1), index * 140);
    });
  },
  error(): void {
    tone(220, 180, "square", 0.35);
  },
};

/** Subtle ambient pad (§62 "Music" setting) generated with oscillators. */
export function startMusic(): void {
  const audio = ctx();
  if (!audio || musicNodes) return;

  const gain = audio.createGain();
  gain.gain.value = settings.master * settings.music * 0.12;
  gain.connect(audio.destination);

  const oscillators: OscillatorNode[] = [];
  for (const frequency of [110, 164.81, 220]) {
    const oscillator = audio.createOscillator();
    oscillator.type = "sine";
    oscillator.frequency.value = frequency;
    const lfo = audio.createOscillator();
    const lfoGain = audio.createGain();
    lfo.frequency.value = 0.08;
    lfoGain.gain.value = 1.5;
    lfo.connect(lfoGain).connect(oscillator.frequency);
    oscillator.connect(gain);
    oscillator.start();
    lfo.start();
    oscillators.push(oscillator, lfo);
  }

  musicNodes = {
    gain,
    stop: () => {
      for (const oscillator of oscillators) oscillator.stop();
    },
  };
}

export function stopMusic(): void {
  if (musicNodes) {
    musicNodes.stop();
    musicNodes = null;
  }
}

/** Light haptic feedback where supported and enabled (§63). */
export function haptic(kind: "light" | "medium" | "warning"): void {
  if (!settings.haptics || typeof navigator === "undefined") return;
  if (!("vibrate" in navigator)) return;
  const pattern = kind === "light" ? 12 : kind === "medium" ? [18, 40, 24] : [30, 40, 30];
  try {
    navigator.vibrate(pattern);
  } catch {
    // Ignore platforms that reject vibration.
  }
}
