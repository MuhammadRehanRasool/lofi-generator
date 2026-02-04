// Lofi Options Types
export interface EffectSpec {
  id: string;
  volume: number;
}

export interface LofiOptions {
  slow_factor: number;
  room_size: number;
  damping: number;
  wet_level: number;
  dry_level: number;
  stereo_delay: number;
  effects: EffectSpec[];
}

export interface Effect {
  id: string;
  name: string;
  file: string;
  category: string;
}

// Video Options Types
export type VisualizerType = 'bass_bars' | 'waveform' | 'circular' | 'none';
export type BackgroundType = 'solid' | 'gradient' | 'image';
export type GradientDirection = 'vertical' | 'horizontal' | 'radial';

export interface VideoOptions {
  visualizer_type: VisualizerType;
  visualizer_color: string;
  visualizer_color_secondary: string;
  bar_count: number;
  bar_width: number;
  bar_radius: number;
  smoothing: number;
  background_type: BackgroundType;
  background_color: string;
  background_gradient_end: string;
  gradient_direction: GradientDirection;
  background_image?: string;
  grain_intensity: number;
  vignette_strength: number;
  resolution: [number, number];
  fps: number;
}

// YouTube Types
export interface VideoInfo {
  id: string;
  title: string;
  duration: number;
  thumbnail: string;
  channel: string;
}

export interface PlaylistInfo {
  id: string;
  title: string;
  videos: VideoInfo[];
}

// Output Types
export interface OutputFile {
  filename: string;
  source: 'random' | 'youtube';
  duration: number;
  created_at: string;
  size: number;
}

// Job Progress
export interface JobProgress {
  job_id: string;
  status: string;
  progress: number;
  current_file?: string;
  error?: string;
}

// Random Generator Types
export interface OutputParams {
  title?: string;
  /** Key as a number 1-12 (C, C#, D, D#, E, F, F#, G, G#, A, A#, B) */
  key: number;
  /**
   * Musical mode 1-7:
   * 1: Ionian (Major), 2: Dorian, 3: Phrygian, 4: Lydian,
   * 5: Mixolydian, 6: Aeolian (Minor), 7: Locrian
   */
  mode: number;
  bpm: number;
  energy: number;
  valence: number;
  chords: number[];
  melodies: number[][];
  source?: string; // "mock" if from fallback
}

// Track for player
export interface Track {
  id: string;
  name: string;
  outputParams?: OutputParams;
  audioUrl?: string;
  duration?: number;
}
