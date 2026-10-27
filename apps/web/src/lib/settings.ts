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
    set(patch as Partial<SettingsStore>);
    const {
      masterVolume,
      effectsVolume,
      musicVolume,
      haptics,
      showLegalMoves,
      reducedMotion,
      animationSpeed,
    } = get();
    persist({
      masterVolume,
      effectsVolume,
      musicVolume,
      haptics,
      showLegalMoves,
      reducedMotion,
      animationSpeed,
    });
  },
  hydrate: () => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<UserSettings>;
        set({ ...DEFAULTS, ...parsed });
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
