import { useState } from 'react';
import { Youtube, Search, Download, CheckCircle } from 'lucide-react';
import { Button, Card, Input, Checkbox, Progress } from '../../components/ui';
import LofiOptionsPanel from '../../components/LofiOptions/LofiOptionsPanel';
import { youtubeApi } from '../../services/api';
import { useOptionsStore } from '../../store/optionsStore';
import { formatDuration } from '../../lib/utils';
import type { VideoInfo, PlaylistInfo, JobProgress } from '../../types';

export default function YouTubeConverter() {
  const [url, setUrl] = useState('');
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<'video' | 'playlist' | null>(null);
  const [videoInfo, setVideoInfo] = useState<VideoInfo | null>(null);
  const [playlistInfo, setPlaylistInfo] = useState<PlaylistInfo | null>(null);
  const [selectedVideos, setSelectedVideos] = useState<Set<string>>(new Set());
  const [isConverting, setIsConverting] = useState(false);
  const [jobProgress, setJobProgress] = useState<JobProgress | null>(null);

  const { lofiOptions } = useOptionsStore();

  const fetchInfo = async () => {
    if (!url.trim()) {
      setError('Please enter a YouTube URL');
      return;
    }

    setIsFetching(true);
    setError(null);
    setVideoInfo(null);
    setPlaylistInfo(null);

    try {
      const response = await youtubeApi.fetchInfo(url);

      if (response.type === 'playlist') {
        setMediaType('playlist');
        setPlaylistInfo(response.data as PlaylistInfo);
        // Select all videos by default
        setSelectedVideos(new Set((response.data as PlaylistInfo).videos.map((v) => v.id)));
      } else {
        setMediaType('video');
        setVideoInfo(response.data as VideoInfo);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch video info');
    } finally {
      setIsFetching(false);
    }
  };

  const toggleVideoSelection = (videoId: string) => {
    const newSelected = new Set(selectedVideos);
    if (newSelected.has(videoId)) {
      newSelected.delete(videoId);
    } else {
      newSelected.add(videoId);
    }
    setSelectedVideos(newSelected);
  };

  const selectAll = () => {
    if (playlistInfo) {
      setSelectedVideos(new Set(playlistInfo.videos.map((v) => v.id)));
    }
  };

  const selectNone = () => {
    setSelectedVideos(new Set());
  };

  const startConversion = async () => {
    setIsConverting(true);
    setJobProgress(null);

    try {
      const videoIds = mediaType === 'playlist' ? Array.from(selectedVideos) : undefined;
      const response = await youtubeApi.convert(url, videoIds, lofiOptions);

      // Subscribe to progress updates
      const ws = youtubeApi.subscribeProgress(response.jobId, (data) => {
        setJobProgress(data as JobProgress);

        if ((data as JobProgress).status === 'complete' || (data as JobProgress).status === 'error') {
          setIsConverting(false);
          ws.close();
        }
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Conversion failed');
      setIsConverting(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-text">YouTube Converter</h1>
          <p className="text-textMuted mt-1">Convert YouTube videos to lofi versions</p>
        </div>
      </div>

      {/* URL Input */}
      <Card>
        <div className="flex gap-4">
          <div className="flex-1">
            <Input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Paste YouTube video or playlist URL"
              icon={<Youtube size={20} />}
              error={error || undefined}
            />
          </div>
          <Button onClick={fetchInfo} loading={isFetching}>
            <Search size={16} />
            Fetch Info
          </Button>
        </div>
      </Card>

      {(videoInfo || playlistInfo) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Video/Playlist Display */}
          <Card title={mediaType === 'playlist' ? playlistInfo?.title : 'Video'}>
            {mediaType === 'video' && videoInfo && (
              <div className="space-y-4">
                <div className="aspect-video bg-surfaceHover rounded-lg overflow-hidden">
                  <img
                    src={videoInfo.thumbnail}
                    alt={videoInfo.title}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div>
                  <h3 className="font-medium">{videoInfo.title}</h3>
                  <p className="text-sm text-textMuted">{videoInfo.channel}</p>
                  <p className="text-sm text-textMuted">
                    {formatDuration(videoInfo.duration)}
                  </p>
                </div>
              </div>
            )}

            {mediaType === 'playlist' && playlistInfo && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-textMuted">
                    {selectedVideos.size} of {playlistInfo.videos.length} selected
                  </span>
                  <div className="flex gap-2">
                    <Button size="sm" variant="ghost" onClick={selectAll}>
                      Select All
                    </Button>
                    <Button size="sm" variant="ghost" onClick={selectNone}>
                      None
                    </Button>
                  </div>
                </div>

                <div className="max-h-[400px] overflow-y-auto space-y-2">
                  {playlistInfo.videos.map((video) => (
                    <div
                      key={video.id}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-surfaceHover transition-colors"
                    >
                      <Checkbox
                        checked={selectedVideos.has(video.id)}
                        onChange={() => toggleVideoSelection(video.id)}
                      />
                      <img
                        src={video.thumbnail}
                        alt={video.title}
                        className="w-20 h-12 object-cover rounded"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate text-sm">{video.title}</p>
                        <p className="text-xs text-textMuted">
                          {formatDuration(video.duration)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>

          {/* Options Panel */}
          <LofiOptionsPanel showPresets />
        </div>
      )}

      {/* Conversion Progress */}
      {isConverting && jobProgress && (
        <Card title="Converting...">
          <Progress
            value={jobProgress.progress}
            status={jobProgress.current_file || jobProgress.status}
          />
          {jobProgress.error && (
            <p className="mt-2 text-red-500 text-sm">{jobProgress.error}</p>
          )}
        </Card>
      )}

      {/* Conversion Complete */}
      {jobProgress?.status === 'complete' && (
        <Card>
          <div className="flex items-center gap-4">
            <CheckCircle className="text-green-500" size={24} />
            <div>
              <p className="font-medium">Conversion Complete!</p>
              <p className="text-sm text-textMuted">
                Your lofi tracks are ready in the Output Manager
              </p>
            </div>
            <Button variant="secondary" className="ml-auto">
              View Output
            </Button>
          </div>
        </Card>
      )}

      {/* Convert Button */}
      {(videoInfo || (playlistInfo && selectedVideos.size > 0)) && !isConverting && (
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-textMuted">
                {mediaType === 'video'
                  ? 'Ready to convert'
                  : `${selectedVideos.size} video(s) selected`}
              </p>
            </div>
            <Button onClick={startConversion}>
              <Download size={16} />
              Convert{mediaType === 'playlist' ? ` Selected (${selectedVideos.size})` : ''}
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
