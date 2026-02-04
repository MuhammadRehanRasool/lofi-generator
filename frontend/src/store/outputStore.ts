import { create } from 'zustand';
import type { OutputFile } from '../types';
import { outputApi } from '../services/api';

interface OutputState {
  files: OutputFile[];
  selectedFiles: string[];
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchFiles: () => Promise<void>;
  selectFile: (filename: string) => void;
  deselectFile: (filename: string) => void;
  selectAll: () => void;
  deselectAll: () => void;
  toggleSelection: (filename: string) => void;
  deleteFile: (filename: string) => Promise<void>;
  deleteSelected: () => Promise<void>;
  setError: (error: string | null) => void;
}

export const useOutputStore = create<OutputState>((set, get) => ({
  files: [],
  selectedFiles: [],
  isLoading: false,
  error: null,

  fetchFiles: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await outputApi.list();
      set({ files: response.files, isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to fetch files',
        isLoading: false,
      });
    }
  },

  selectFile: (filename) =>
    set((state) => ({
      selectedFiles: state.selectedFiles.includes(filename)
        ? state.selectedFiles
        : [...state.selectedFiles, filename],
    })),

  deselectFile: (filename) =>
    set((state) => ({
      selectedFiles: state.selectedFiles.filter((f) => f !== filename),
    })),

  selectAll: () =>
    set((state) => ({
      selectedFiles: state.files.map((f) => f.filename),
    })),

  deselectAll: () => set({ selectedFiles: [] }),

  toggleSelection: (filename) =>
    set((state) => ({
      selectedFiles: state.selectedFiles.includes(filename)
        ? state.selectedFiles.filter((f) => f !== filename)
        : [...state.selectedFiles, filename],
    })),

  deleteFile: async (filename) => {
    try {
      await outputApi.delete(filename);
      set((state) => ({
        files: state.files.filter((f) => f.filename !== filename),
        selectedFiles: state.selectedFiles.filter((f) => f !== filename),
      }));
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to delete file',
      });
    }
  },

  deleteSelected: async () => {
    const { selectedFiles, deleteFile } = get();
    for (const filename of selectedFiles) {
      await deleteFile(filename);
    }
  },

  setError: (error) => set({ error }),
}));
