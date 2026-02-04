import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Play,
  Pause,
  Download,
  Trash2,
  RefreshCw,
  Film,
} from 'lucide-react';
import { Button, Card, Checkbox } from '../../components/ui';
import { useOutputStore } from '../../store/outputStore';
import { outputApi } from '../../services/api';
import { formatDuration, formatFileSize, formatRelativeTime, cn } from '../../lib/utils';
import type { OutputFile } from '../../types';

export default function OutputManager() {
  const navigate = useNavigate();
  const {
    files,
    selectedFiles,
    isLoading,
    error,
    fetchFiles,
    toggleSelection,
    selectAll,
    deselectAll,
    deleteFile,
    deleteSelected,
  } = useOutputStore();

  const [playingFile, setPlayingFile] = useState<string | null>(null);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  useEffect(() => {
    return () => {
      // Cleanup audio on unmount
      if (audioElement) {
        audioElement.pause();
        audioElement.src = '';
      }
    };
  }, [audioElement]);

  const handlePlay = (file: OutputFile) => {
    if (playingFile === file.filename) {
      // Pause
      audioElement?.pause();
      setPlayingFile(null);
    } else {
      // Play
      if (audioElement) {
        audioElement.pause();
      }
      const audio = new Audio(outputApi.getStreamUrl(file.filename));
      audio.play();
      audio.onended = () => setPlayingFile(null);
      setAudioElement(audio);
      setPlayingFile(file.filename);
    }
  };

  const handleDownload = (filename: string) => {
    window.open(outputApi.getDownloadUrl(filename), '_blank');
  };

  const handleDelete = async (filename: string) => {
    if (confirm(`Delete ${filename}?`)) {
      await deleteFile(filename);
    }
  };

  const handleDeleteSelected = async () => {
    if (confirm(`Delete ${selectedFiles.length} files?`)) {
      await deleteSelected();
    }
  };

  const handleFinalize = () => {
    navigate('/finalize', { state: { selectedFiles } });
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-text">Output Manager</h1>
          <p className="text-textMuted mt-1">Manage your generated lofi tracks ({files.length} files)</p>
        </div>
        <div className="flex gap-3">
          {selectedFiles.length > 0 && (
            <Button variant="danger" onClick={handleDeleteSelected}>
              <Trash2 size={18} />
              Delete ({selectedFiles.length})
            </Button>
          )}
          <Button variant="secondary" onClick={() => fetchFiles()}>
            <RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} />
            Refresh
          </Button>
        </div>
      </div>

      {error && (
        <Card className="border-red-500/20 bg-red-500/5">
          <p className="text-red-500">{error}</p>
        </Card>
      )}

      <Card>
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="animate-spin text-primary" size={32} />
          </div>
        ) : files.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-textMuted">No output files yet</p>
            <p className="text-sm text-textMuted mt-2">
              Generate tracks from the Random Generator or YouTube Converter
            </p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="flex items-center gap-4 pb-4 border-b border-border">
              <div className="w-10">
                <Checkbox
                  checked={selectedFiles.length === files.length && files.length > 0}
                  onChange={() =>
                    selectedFiles.length === files.length ? deselectAll() : selectAll()
                  }
                />
              </div>
              <div className="flex-1 text-sm font-medium text-textMuted">Filename</div>
              <div className="w-24 text-sm font-medium text-textMuted">Source</div>
              <div className="w-20 text-sm font-medium text-textMuted">Duration</div>
              <div className="w-24 text-sm font-medium text-textMuted">Created</div>
              <div className="w-28"></div>
            </div>

            {/* File List */}
            <div className="divide-y divide-border">
              {files.map((file) => (
                <div
                  key={file.filename}
                  className={cn(
                    'flex items-center gap-4 py-3 hover:bg-surfaceHover/50 transition-colors',
                    selectedFiles.includes(file.filename) && 'bg-primary/5'
                  )}
                >
                  <div className="w-10">
                    <Checkbox
                      checked={selectedFiles.includes(file.filename)}
                      onChange={() => toggleSelection(file.filename)}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{file.filename}</p>
                    <p className="text-xs text-textMuted">{formatFileSize(file.size)}</p>
                  </div>
                  <div className="w-24">
                    <span
                      className={cn(
                        'text-xs px-2 py-1 rounded-full',
                        file.source === 'random'
                          ? 'bg-primary/20 text-primary'
                          : 'bg-red-500/20 text-red-400'
                      )}
                    >
                      {file.source}
                    </span>
                  </div>
                  <div className="w-20 text-sm text-textMuted">
                    {formatDuration(file.duration)}
                  </div>
                  <div className="w-24 text-sm text-textMuted">
                    {formatRelativeTime(file.created_at)}
                  </div>
                  <div className="w-28 flex gap-1">
                    <button
                      onClick={() => handlePlay(file)}
                      className="p-2 hover:bg-surfaceHover rounded-lg transition-colors"
                    >
                      {playingFile === file.filename ? (
                        <Pause size={16} />
                      ) : (
                        <Play size={16} />
                      )}
                    </button>
                    <button
                      onClick={() => handleDownload(file.filename)}
                      className="p-2 hover:bg-surfaceHover rounded-lg transition-colors"
                    >
                      <Download size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(file.filename)}
                      className="p-2 hover:bg-red-500/20 text-textMuted hover:text-red-500 rounded-lg transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </Card>

      {/* Finalize Button */}
      {selectedFiles.length > 0 && (
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Ready to finalize?</p>
              <p className="text-sm text-textMuted">
                Create a video with visualizer from {selectedFiles.length} track(s)
              </p>
            </div>
            <Button onClick={handleFinalize}>
              <Film size={16} />
              Finalize Selected ({selectedFiles.length})
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
