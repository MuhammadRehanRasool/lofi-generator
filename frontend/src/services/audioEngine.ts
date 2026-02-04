/**
 * Audio Engine Service - Tone.js integration for lofi music playback
 * This service handles real-time audio synthesis and playback
 */
import * as Tone from 'tone';
import type { OutputParams, Track } from '../types';

let isInitialized = false;
let currentTrackData: Track | null = null;

// Instruments and effects
let reverb: Tone.Reverb | null = null;
let volume: Tone.Volume | null = null;
let analyser: Tone.Analyser | null = null;

// Samplers for instruments
const samplers: Record<string, Tone.Sampler> = {};

/**
 * Initialize the audio context and effects chain
 */
export async function initializeAudio(): Promise<void> {
  if (isInitialized) return;

  await Tone.start();

  // Create effects
  reverb = new Tone.Reverb({
    decay: 4,
    wet: 0.3,
  }).toDestination();

  volume = new Tone.Volume(-6).connect(reverb);

  // Create analyser for visualizations
  analyser = new Tone.Analyser('fft', 64);
  volume.connect(analyser);

  isInitialized = true;
  console.log('Audio engine initialized');
}

/**
 * Load a track and prepare it for playback
 */
export async function loadTrack(track: Track): Promise<void> {
  if (!isInitialized) {
    await initializeAudio();
  }

  // Stop current playback
  stop();

  currentTrackData = track;

  // If track has audio URL, use it directly
  if (track.audioUrl) {
    // Create a player for the audio file
    const player = new Tone.Player(track.audioUrl).connect(volume!);
    await player.load(track.audioUrl);
  }

  // If track has output params, we'll synthesize
  if (track.outputParams) {
    await setupSynthesis(track.outputParams);
  }
}

/**
 * Set up synthesis based on output parameters
 */
async function setupSynthesis(params: OutputParams): Promise<void> {
  // This would set up the actual Tone.js instruments based on the params
  // For now, this is a placeholder for the full implementation

  Tone.getTransport().bpm.value = params.bpm;

  // Additional setup would include:
  // - Loading drum samples
  // - Setting up chord synths
  // - Setting up bass synth
  // - Setting up melody synth
}

/**
 * Start playback
 */
export function play(): void {
  if (!isInitialized) return;
  Tone.getTransport().start();
}

/**
 * Pause playback
 */
export function pause(): void {
  if (!isInitialized) return;
  Tone.getTransport().pause();
}

/**
 * Stop playback
 */
export function stop(): void {
  if (!isInitialized) return;
  Tone.getTransport().stop();
  Tone.getTransport().position = 0;
}

/**
 * Seek to a specific time
 */
export function seek(time: number): void {
  if (!isInitialized) return;
  Tone.getTransport().seconds = time;
}

/**
 * Set the playback volume
 */
export function setVolume(level: number): void {
  if (volume) {
    // Convert 0-1 to decibels (-60 to 0)
    const db = level === 0 ? -Infinity : 20 * Math.log10(level);
    volume.volume.value = Math.max(-60, Math.min(0, db));
  }
}

/**
 * Get the current playback time
 */
export function getCurrentTime(): number {
  return Tone.getTransport().seconds;
}

/**
 * Get analyser data for visualizations
 */
export function getAnalyserData(): Float32Array {
  if (!analyser) return new Float32Array(64);
  return analyser.getValue() as Float32Array;
}

/**
 * Get normalized frequency data for visualizer (0-1 range)
 */
export function getFrequencyData(): number[] {
  const data = getAnalyserData();
  const normalized: number[] = [];

  for (let i = 0; i < data.length; i++) {
    // Convert from dB (-100 to 0) to 0-1 range
    const value = (data[i] + 100) / 100;
    normalized.push(Math.max(0, Math.min(1, value)));
  }

  return normalized;
}

/**
 * Set reverb parameters
 */
export function setReverb(wetLevel: number, _decay: number): void {
  void _decay; // Note: decay can only be set at creation time in Tone.js
  if (reverb) {
    reverb.wet.value = wetLevel;
  }
}

/**
 * Check if audio is currently playing
 */
export function isPlaying(): boolean {
  return Tone.getTransport().state === 'started';
}

/**
 * Get the transport state
 */
export function getTransportState(): string {
  return Tone.getTransport().state;
}

/**
 * Get the currently loaded track
 */
export function getCurrentTrack(): Track | null {
  return currentTrackData;
}

/**
 * Dispose of all audio resources
 */
export function dispose(): void {
  stop();

  Object.values(samplers).forEach((sampler) => sampler.dispose());

  if (reverb) {
    reverb.dispose();
    reverb = null;
  }

  if (volume) {
    volume.dispose();
    volume = null;
  }

  if (analyser) {
    analyser.dispose();
    analyser = null;
  }

  isInitialized = false;
  currentTrackData = null;
}
