import { create } from 'zustand';
import type { Track } from '../types';

interface PlayerState {
  currentTrack: Track | null;
  playlist: Track[];
  isPlaying: boolean;
  volume: number;
  currentTime: number;
  duration: number;
  repeatMode: 'none' | 'all' | 'one';

  // Actions
  setCurrentTrack: (track: Track | null) => void;
  setPlaylist: (tracks: Track[]) => void;
  addToPlaylist: (track: Track) => void;
  removeFromPlaylist: (trackId: string) => void;
  play: () => void;
  pause: () => void;
  togglePlay: () => void;
  next: () => void;
  previous: () => void;
  setVolume: (volume: number) => void;
  setCurrentTime: (time: number) => void;
  setDuration: (duration: number) => void;
  setRepeatMode: (mode: 'none' | 'all' | 'one') => void;
}

export const usePlayerStore = create<PlayerState>((set, get) => ({
  currentTrack: null,
  playlist: [],
  isPlaying: false,
  volume: 0.8,
  currentTime: 0,
  duration: 0,
  repeatMode: 'none',

  setCurrentTrack: (track) => set({ currentTrack: track }),

  setPlaylist: (tracks) => set({ playlist: tracks }),

  addToPlaylist: (track) => set((state) => ({
    playlist: [...state.playlist, track],
  })),

  removeFromPlaylist: (trackId) => set((state) => ({
    playlist: state.playlist.filter((t) => t.id !== trackId),
  })),

  play: () => set({ isPlaying: true }),

  pause: () => set({ isPlaying: false }),

  togglePlay: () => set((state) => ({ isPlaying: !state.isPlaying })),

  next: () => {
    const { playlist, currentTrack, repeatMode } = get();
    if (!currentTrack || playlist.length === 0) return;

    const currentIndex = playlist.findIndex((t) => t.id === currentTrack.id);
    let nextIndex = currentIndex + 1;

    if (nextIndex >= playlist.length) {
      if (repeatMode === 'all') {
        nextIndex = 0;
      } else {
        set({ isPlaying: false });
        return;
      }
    }

    set({ currentTrack: playlist[nextIndex], currentTime: 0 });
  },

  previous: () => {
    const { playlist, currentTrack, currentTime } = get();
    if (!currentTrack || playlist.length === 0) return;

    // If more than 3 seconds in, restart current track
    if (currentTime > 3) {
      set({ currentTime: 0 });
      return;
    }

    const currentIndex = playlist.findIndex((t) => t.id === currentTrack.id);
    const prevIndex = currentIndex > 0 ? currentIndex - 1 : playlist.length - 1;

    set({ currentTrack: playlist[prevIndex], currentTime: 0 });
  },

  setVolume: (volume) => set({ volume: Math.max(0, Math.min(1, volume)) }),

  setCurrentTime: (time) => set({ currentTime: time }),

  setDuration: (duration) => set({ duration }),

  setRepeatMode: (mode) => set({ repeatMode: mode }),
}));
