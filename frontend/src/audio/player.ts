import * as Tone from 'tone';
import { getInstrumentFilters, getInstrument, Instrument } from './instruments';
import { SAMPLEGROUPS } from './samples';
import { Track } from './track';

export type PlayerStateCallback = (state: {
  isPlaying: boolean;
  isLoading: boolean;
  currentTime: number;
  duration: number;
}) => void;

/**
 * A class that plays a Track by synthesizing events in Tone.js.
 */
class Player {
  /** Current track being played */
  private currentTrack: Track | null = null;

  /** Whether the player is currently playing */
  private _isPlaying: boolean = false;

  /** Whether the player is currently loading */
  private _isLoading: boolean = false;

  /** Volume level 0-1 */
  private _volume: number = 0.8;

  /** Map of sample group to players */
  private samplePlayers: Map<string, Tone.Player[]> = new Map();

  /** Map of instrument to samplers */
  private instruments: Map<Instrument, Tone.Sampler | Tone.PolySynth> = new Map();

  /** Master gain */
  private gain: Tone.Gain | null = null;

  /** Recorder for saving MP3 */
  private recorder: Tone.Recorder | null = null;

  /** State change callback */
  private onStateChange: PlayerStateCallback | null = null;

  /** Update interval ID */
  private updateIntervalId: number | null = null;

  get isPlaying(): boolean {
    return this._isPlaying;
  }

  get isLoading(): boolean {
    return this._isLoading;
  }

  get volume(): number {
    return this._volume;
  }

  set volume(value: number) {
    this._volume = Math.max(0, Math.min(1, value));
    if (this.gain) {
      this.gain.gain.value = this._isPlaying ? this._volume : 0;
    }
  }

  /** Set callback for state changes */
  setStateCallback(callback: PlayerStateCallback | null) {
    this.onStateChange = callback;
  }

  /** Notify state change */
  private notifyStateChange() {
    if (this.onStateChange) {
      this.onStateChange({
        isPlaying: this._isPlaying,
        isLoading: this._isLoading,
        currentTime: Tone.Transport.seconds,
        duration: this.currentTrack?.length ?? 0
      });
    }
  }

  /** Plays a specific track */
  async playTrack(track: Track) {
    // Stop any current playback
    this.stop();

    this.currentTrack = track;
    this._isLoading = true;
    this.notifyStateChange();

    try {
      // Initialize Tone.js
      await Tone.start();

      this.gain = new Tone.Gain(this._volume);
      this.gain.toDestination();

      Tone.Transport.bpm.value = track.bpm;

      this.samplePlayers = new Map();
      this.instruments = new Map();

      // Load samples
      const sampleLoadPromises: Promise<void>[] = [];
      for (const [sampleGroupName, sampleIndex] of track.samples) {
        const sampleGroup = SAMPLEGROUPS.get(sampleGroupName);
        if (!sampleGroup) continue;

        const player = new Tone.Player({
          url: sampleGroup.getSampleUrl(sampleIndex),
          volume: sampleGroup.volume,
          loop: true,
          fadeIn: '8n',
          fadeOut: '8n'
        });

        // Chain through filters and to gain
        const filters = sampleGroup.getFilters();
        if (filters.length > 0) {
          player.chain(...filters, this.gain!);
        } else {
          player.connect(this.gain!);
        }
        player.sync();

        if (!this.samplePlayers.has(sampleGroupName)) {
          this.samplePlayers.set(sampleGroupName, Array(sampleGroup.size));
        }
        this.samplePlayers.get(sampleGroupName)![sampleIndex] = player;
      }

      // Load instruments
      const instrumentVolumes = new Map<Tone.Sampler | Tone.PolySynth, number>();
      for (const instrument of track.instruments) {
        const toneInstrument = getInstrument(instrument);
        const filters = getInstrumentFilters(instrument);

        if (filters.length > 0) {
          toneInstrument.chain(...filters, this.gain!);
        } else {
          toneInstrument.connect(this.gain!);
        }
        toneInstrument.sync();

        this.instruments.set(instrument, toneInstrument);
        instrumentVolumes.set(toneInstrument, toneInstrument.volume.value);
      }

      // Set up swing
      Tone.Transport.swing = track.swing ? 2 / 3 : 0;

      // Wait until all samples are loaded
      await Tone.loaded();

      // Schedule sample loops
      for (const sampleLoop of track.sampleLoops) {
        const players = this.samplePlayers.get(sampleLoop.sampleGroupName);
        if (!players) continue;
        const samplePlayer = players[sampleLoop.sampleIndex];
        if (!samplePlayer) continue;
        samplePlayer.start(sampleLoop.startTime);
        samplePlayer.stop(sampleLoop.stopTime);
      }

      // Schedule instrument notes
      for (const noteTiming of track.instrumentNotes) {
        const instrumentSampler = this.instruments.get(noteTiming.instrument);
        if (!instrumentSampler) continue;

        if (noteTiming.duration) {
          instrumentSampler.triggerAttackRelease(
            noteTiming.pitch,
            noteTiming.duration,
            noteTiming.time,
            noteTiming.velocity !== undefined ? noteTiming.velocity : 1
          );
        } else {
          instrumentSampler.triggerAttack(
            noteTiming.pitch,
            noteTiming.time,
            noteTiming.velocity !== undefined ? noteTiming.velocity : 1
          );
        }
      }

      const fadeOutBegin = track.length - track.fadeOutDuration;

      // Start update interval
      this.updateIntervalId = window.setInterval(() => {
        const seconds = Tone.Transport.seconds;
        this.notifyStateChange();

        // Check if track ended
        if (track.length - seconds < 0) {
          this.stop();
          return;
        }

        // Schedule fade out in the last seconds
        const volumeOffset = seconds < fadeOutBegin ? 0 : (seconds - fadeOutBegin) * 4;
        for (const [sampler, volume] of instrumentVolumes) {
          sampler.volume.value = volume - volumeOffset;
        }
      }, 100);

      this._isLoading = false;
      this._isPlaying = true;
      Tone.Transport.start();
      this.notifyStateChange();
    } catch (error) {
      console.error('Error loading track:', error);
      this._isLoading = false;
      this.notifyStateChange();
      throw error;
    }
  }

  /** Resume playback */
  play() {
    if (this.currentTrack && !this._isPlaying) {
      this._isPlaying = true;
      if (this.gain) {
        this.gain.gain.value = this._volume;
      }
      Tone.Transport.start();
      this.notifyStateChange();
    }
  }

  /** Pause playback */
  pause() {
    if (this._isPlaying) {
      this._isPlaying = false;
      if (this.gain) {
        this.gain.gain.value = 0;
      }
      Tone.Transport.pause();
      this.notifyStateChange();
    }
  }

  /** Stop and cleanup */
  stop() {
    this._isPlaying = false;
    this._isLoading = false;

    if (this.updateIntervalId !== null) {
      clearInterval(this.updateIntervalId);
      this.updateIntervalId = null;
    }

    this.gain?.disconnect();
    this.gain = null;

    Tone.Transport.cancel();
    Tone.Transport.stop();

    this.instruments.forEach((s) => s.dispose());
    this.instruments.clear();

    this.samplePlayers.forEach((players) => players.forEach((p) => p?.dispose()));
    this.samplePlayers.clear();

    this.notifyStateChange();
  }

  /** Seek to a specific time */
  seek(seconds: number) {
    if (!this.currentTrack) return;

    this.instruments.forEach((s) => {
      if ('releaseAll' in s) {
        (s as Tone.PolySynth).releaseAll();
      }
    });

    Tone.Transport.seconds = Math.max(0, Math.min(seconds, this.currentTrack.length));
    this.notifyStateChange();
  }

  /** Get current time */
  getCurrentTime(): number {
    return Tone.Transport.seconds;
  }

  /** Get duration */
  getDuration(): number {
    return this.currentTrack?.length ?? 0;
  }

  /** Start recording */
  async startRecording() {
    if (!this.gain) return;

    this.recorder = new Tone.Recorder();
    this.gain.connect(this.recorder);
    this.recorder.start();
  }

  /** Stop recording and download */
  async stopRecording(): Promise<Blob | null> {
    if (!this.recorder) return null;

    const recording = await this.recorder.stop();
    this.recorder = null;

    return recording;
  }

  /** Download the recording */
  async downloadRecording(filename: string = 'lofi-track') {
    const blob = await this.stopRecording();
    if (!blob || blob.size === 0) return;

    const type = blob.type?.split(';')[0]?.split('/')[1] || 'webm';
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.download = `${filename}.${type}`;
    anchor.href = url;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  /** Render entire track to audio file */
  async renderToBlob(track: Track): Promise<Blob | null> {
    // Create offline context for rendering
    const duration = track.length + 2; // Add 2 seconds buffer

    // Stop any current playback
    this.stop();

    // We'll use the regular playback but with recording
    await this.playTrack(track);
    await this.startRecording();

    // Wait for track to finish
    return new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        if (Tone.Transport.seconds >= track.length - 1) {
          clearInterval(checkInterval);
          this.stopRecording().then((blob) => {
            this.stop();
            resolve(blob);
          });
        }
      }, 100);
    });
  }
}

// Singleton instance
const player = new Player();
export default player;
