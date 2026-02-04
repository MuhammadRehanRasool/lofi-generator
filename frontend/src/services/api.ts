import type {
  LofiOptions,
  VideoOptions,
  VideoInfo,
  PlaylistInfo,
  OutputFile,
  OutputParams,
} from '../types';

const API_BASE = 'http://localhost:8000/api';

async function fetchJSON<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
    throw new Error(error.detail || `HTTP ${response.status}`);
  }

  return response.json();
}

// Random Generator API
export const randomApi = {
  generate: (): Promise<OutputParams> =>
    fetchJSON(`${API_BASE}/random/generate`),

  decode: (input: number[]): Promise<OutputParams> =>
    // Send as JSON array (matching old client behavior)
    fetchJSON(`${API_BASE}/random/decode?input=${encodeURIComponent(JSON.stringify(input))}`),

  render: (outputParams: OutputParams, filename?: string): Promise<{ path: string; filename: string }> =>
    fetchJSON(`${API_BASE}/random/render`, {
      method: 'POST',
      body: JSON.stringify({ output_params: outputParams, filename }),
    }),
};

// YouTube API
export const youtubeApi = {
  fetchInfo: async (url: string): Promise<{ type: 'video' | 'playlist'; data: VideoInfo | PlaylistInfo }> =>
    fetchJSON(`${API_BASE}/youtube/info`, {
      method: 'POST',
      body: JSON.stringify({ url }),
    }),

  convert: (url: string, videoIds: string[] | undefined, options: LofiOptions): Promise<{ jobId: string }> =>
    fetchJSON(`${API_BASE}/youtube/convert`, {
      method: 'POST',
      body: JSON.stringify({ url, video_ids: videoIds, options }),
    }),

  subscribeProgress: (jobId: string, onMessage: (data: unknown) => void): WebSocket => {
    const ws = new WebSocket(`ws://localhost:8000/api/youtube/progress/${jobId}`);
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      onMessage(data);
    };
    return ws;
  },
};

// Output API
export const outputApi = {
  list: (): Promise<{ files: OutputFile[] }> =>
    fetchJSON(`${API_BASE}/output/list`),

  delete: (filename: string): Promise<void> =>
    fetchJSON(`${API_BASE}/output/${filename}`, { method: 'DELETE' }),

  getStreamUrl: (filename: string): string =>
    `${API_BASE}/output/stream/${filename}`,

  getDownloadUrl: (filename: string): string =>
    `${API_BASE}/output/download/${filename}`,
};

// Video API
export const videoApi = {
  generate: (audioFiles: string[], options: VideoOptions, outputName?: string): Promise<{ jobId: string }> =>
    fetchJSON(`${API_BASE}/video/generate`, {
      method: 'POST',
      body: JSON.stringify({ audio_files: audioFiles, options, output_name: outputName }),
    }),

  subscribeProgress: (jobId: string, onMessage: (data: unknown) => void): WebSocket => {
    const ws = new WebSocket(`ws://localhost:8000/api/video/progress/${jobId}`);
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      onMessage(data);
    };
    return ws;
  },

  preview: (options: VideoOptions): Promise<{ imageBase64: string }> =>
    fetchJSON(`${API_BASE}/video/preview`, {
      method: 'POST',
      body: JSON.stringify(options),
    }),
};

// Effects API
export const effectsApi = {
  list: (): Promise<{ effects: Array<{ id: string; name: string; file: string; category: string }> }> =>
    fetchJSON(`${API_BASE}/effects`),
};
