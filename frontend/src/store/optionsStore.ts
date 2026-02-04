import { create } from 'zustand';
import type { LofiOptions, VideoOptions, EffectSpec } from '../types';

const DEFAULT_LOFI_OPTIONS: LofiOptions = {
  slow_factor: 0.08,
  room_size: 0.75,
  damping: 0.5,
  wet_level: 0.08,
  dry_level: 0.2,
  stereo_delay: 2.0,
  effects: [],
};

const DEFAULT_VIDEO_OPTIONS: VideoOptions = {
  visualizer_type: 'bass_bars',
  visualizer_color: '#8b5cf6',
  visualizer_color_secondary: '#ec4899',
  bar_count: 64,
  bar_width: 0.6,
  bar_radius: 4,
  smoothing: 0.8,
  background_type: 'gradient',
  background_color: '#0a0a0b',
  background_gradient_end: '#1a1a2e',
  gradient_direction: 'vertical',
  grain_intensity: 0.1,
  vignette_strength: 0.3,
  resolution: [1920, 1080],
  fps: 30,
};

// Preset definitions
export const LOFI_PRESETS = {
  default: { ...DEFAULT_LOFI_OPTIONS, name: 'Default' },
  heavyReverb: {
    ...DEFAULT_LOFI_OPTIONS,
    room_size: 0.9,
    wet_level: 0.15,
    name: 'Heavy Reverb',
  },
  subtle: {
    ...DEFAULT_LOFI_OPTIONS,
    room_size: 0.5,
    wet_level: 0.05,
    name: 'Subtle',
  },
  slowed: {
    ...DEFAULT_LOFI_OPTIONS,
    slow_factor: 0.15,
    name: 'Slowed',
  },
};

export const VIDEO_PRESETS = {
  midnightPurple: {
    ...DEFAULT_VIDEO_OPTIONS,
    name: 'Midnight Purple',
  },
  sunsetVibes: {
    ...DEFAULT_VIDEO_OPTIONS,
    visualizer_color: '#f97316',
    visualizer_color_secondary: '#ec4899',
    background_color: '#1a0a0a',
    background_gradient_end: '#2a1a1e',
    name: 'Sunset Vibes',
  },
  oceanDeep: {
    ...DEFAULT_VIDEO_OPTIONS,
    visualizer_color: '#0ea5e9',
    visualizer_color_secondary: '#14b8a6',
    background_color: '#0a0a1a',
    background_gradient_end: '#0a1a2a',
    name: 'Ocean Deep',
  },
  forestNight: {
    ...DEFAULT_VIDEO_OPTIONS,
    visualizer_color: '#22c55e',
    visualizer_color_secondary: '#10b981',
    background_color: '#0a1a0a',
    background_gradient_end: '#1a2a1a',
    name: 'Forest Night',
  },
  vaporwave: {
    ...DEFAULT_VIDEO_OPTIONS,
    visualizer_color: '#ec4899',
    visualizer_color_secondary: '#06b6d4',
    background_color: '#1a0a1a',
    background_gradient_end: '#0a1a2a',
    name: 'Vaporwave',
  },
  minimalDark: {
    ...DEFAULT_VIDEO_OPTIONS,
    background_type: 'solid' as const,
    background_color: '#000000',
    name: 'Minimal Dark',
  },
};

interface OptionsState {
  lofiOptions: LofiOptions;
  videoOptions: VideoOptions;
  currentLofiPreset: string;
  currentVideoPreset: string;

  // Lofi Actions
  setLofiOption: <K extends keyof LofiOptions>(key: K, value: LofiOptions[K]) => void;
  setLofiOptions: (options: Partial<LofiOptions>) => void;
  addEffect: (effect: EffectSpec) => void;
  removeEffect: (effectId: string) => void;
  updateEffectVolume: (effectId: string, volume: number) => void;
  loadLofiPreset: (presetKey: keyof typeof LOFI_PRESETS) => void;
  resetLofiToDefaults: () => void;

  // Video Actions
  setVideoOption: <K extends keyof VideoOptions>(key: K, value: VideoOptions[K]) => void;
  setVideoOptions: (options: Partial<VideoOptions>) => void;
  loadVideoPreset: (presetKey: keyof typeof VIDEO_PRESETS) => void;
  resetVideoToDefaults: () => void;
}

export const useOptionsStore = create<OptionsState>((set) => ({
  lofiOptions: { ...DEFAULT_LOFI_OPTIONS },
  videoOptions: { ...DEFAULT_VIDEO_OPTIONS },
  currentLofiPreset: 'default',
  currentVideoPreset: 'midnightPurple',

  setLofiOption: (key, value) =>
    set((state) => ({
      lofiOptions: { ...state.lofiOptions, [key]: value },
      currentLofiPreset: 'custom',
    })),

  setLofiOptions: (options) =>
    set((state) => ({
      lofiOptions: { ...state.lofiOptions, ...options },
      currentLofiPreset: 'custom',
    })),

  addEffect: (effect) =>
    set((state) => ({
      lofiOptions: {
        ...state.lofiOptions,
        effects: [...state.lofiOptions.effects, effect],
      },
      currentLofiPreset: 'custom',
    })),

  removeEffect: (effectId) =>
    set((state) => ({
      lofiOptions: {
        ...state.lofiOptions,
        effects: state.lofiOptions.effects.filter((e) => e.id !== effectId),
      },
      currentLofiPreset: 'custom',
    })),

  updateEffectVolume: (effectId, volume) =>
    set((state) => ({
      lofiOptions: {
        ...state.lofiOptions,
        effects: state.lofiOptions.effects.map((e) =>
          e.id === effectId ? { ...e, volume } : e
        ),
      },
    })),

  loadLofiPreset: (presetKey) =>
    set({
      lofiOptions: { ...LOFI_PRESETS[presetKey] },
      currentLofiPreset: presetKey,
    }),

  resetLofiToDefaults: () =>
    set({
      lofiOptions: { ...DEFAULT_LOFI_OPTIONS },
      currentLofiPreset: 'default',
    }),

  setVideoOption: (key, value) =>
    set((state) => ({
      videoOptions: { ...state.videoOptions, [key]: value },
      currentVideoPreset: 'custom',
    })),

  setVideoOptions: (options) =>
    set((state) => ({
      videoOptions: { ...state.videoOptions, ...options },
      currentVideoPreset: 'custom',
    })),

  loadVideoPreset: (presetKey) =>
    set({
      videoOptions: { ...VIDEO_PRESETS[presetKey] },
      currentVideoPreset: presetKey,
    }),

  resetVideoToDefaults: () =>
    set({
      videoOptions: { ...DEFAULT_VIDEO_OPTIONS },
      currentVideoPreset: 'midnightPurple',
    }),
}));
