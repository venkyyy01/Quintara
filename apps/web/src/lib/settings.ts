/**
 * User settings (§62–§65): persisted locally, applied at startup.
 */

"use client";

import { create } from "zustand";
import {
  configureSound,
  getSoundSettings,
  startMusic,
  stopMusic,
} from "./sound";

export interface UserSettings {
  masterVolume: number;
  effectsVolume: number;
  musicVolume: number;
  haptics: boolean;
  showLegalMoves: boolean;
  reducedMotion: boolean | null; // null = follow system
  animationSpeed: 1 | 1.5 | 2;
}

const STORAGE_KEY = "quintara-settings-v1";

const DEFAULTS: UserSettings = {
  masterVolume: 0.6,
  effectsVolume: 0.8,
  musicVolume: 0.25,
  haptics: true,
  showLegalMoves: true,
  reducedMotion: null,
  animationSpeed: 1,
};

function volume(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.min(1, Math.max(0, value))
    : fallback;
}

/** Persisted JSON is untrusted: coerce every field to a valid setting. */
export function sanitiseSettings(value: unknown): UserSettings {
  const record =
    typeof value === "object" && value !== null
      ? (value as Record<string, unknown>)
      : {};
  const animationSpeed =
    record.animationSpeed === 1 ||
    record.animationSpeed === 1.5 ||
    record.animationSpeed === 2
      ? record.animationSpeed
      : DEFAULTS.animationSpeed;
  return {
    masterVolume: volume(record.masterVolume, DEFAULTS.masterVolume),
    effectsVolume: volume(record.effectsVolume, DEFAULTS.effectsVolume),
    musicVolume: volume(record.musicVolume, DEFAULTS.musicVolume),
    haptics:
      typeof record.haptics === "boolean" ? record.haptics : DEFAULTS.haptics,
    showLegalMoves:
      typeof record.showLegalMoves === "boolean"
        ? record.showLegalMoves
        : DEFAULTS.showLegalMoves,
    reducedMotion:
      record.reducedMotion === true
        ? true
        : record.reducedMotion === false
          ? false
          : null,
    animationSpeed,
  };
}

interface SettingsStore extends UserSettings {
  update: (patch: Partial<UserSettings>) => void;
  hydrate: () => void;
}

function persist(state: UserSettings): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Storage may be unavailable (private mode); settings stay in memory.
  }
  configureSound({
    master: state.masterVolume,
    effects: state.effectsVolume,
    music: state.musicVolume,
    haptics: state.haptics,
  });
  if (state.musicVolume > 0 && state.masterVolume > 0) {
    startMusic();
  } else {
    stopMusic();
  }
}

export const useSettings = create<SettingsStore>((set, get) => ({
  ...DEFAULTS,
  update: (patch) => {
    const merged = sanitiseSettings({ ...get(), ...patch });
    set(merged);
    persist(merged);
  },
  hydrate: () => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        set(sanitiseSettings(JSON.parse(raw)));
      }
    } catch {
      // Fall back to defaults.
    }
    const {
      masterVolume,
      effectsVolume,
      musicVolume,
      haptics,
    } = get();
    configureSound({
      master: masterVolume,
      effects: effectsVolume,
      music: musicVolume,
      haptics,
    });
  },
}));

export function soundSnapshot() {
  return getSoundSettings();
}
