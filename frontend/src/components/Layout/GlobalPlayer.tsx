import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Repeat, Repeat1, Disc3 } from 'lucide-react';
import { usePlayerStore } from '../../store/playerStore';
import { useSidebarStore } from '../../store/sidebarStore';
import { cn, formatDuration } from '../../lib/utils';

const SIDEBAR_WIDTH = 280;
const SIDEBAR_COLLAPSED_WIDTH = 76;

export default function GlobalPlayer() {
  const {
    currentTrack,
    isPlaying,
    volume,
    currentTime,
    duration,
    repeatMode,
    togglePlay,
    next,
    previous,
    setVolume,
    setCurrentTime,
    setRepeatMode,
  } = usePlayerStore();

  const { isCollapsed } = useSidebarStore();

  if (!currentTrack) {
    return null;
  }

  const sidebarWidth = isCollapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_WIDTH;

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setVolume(parseFloat(e.target.value));
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCurrentTime(parseFloat(e.target.value));
  };

  const toggleMute = () => {
    setVolume(volume === 0 ? 0.8 : 0);
  };

  const cycleRepeatMode = () => {
    const modes: Array<'none' | 'all' | 'one'> = ['none', 'all', 'one'];
    const currentIndex = modes.indexOf(repeatMode);
    setRepeatMode(modes[(currentIndex + 1) % modes.length]);
  };

  return (
    <div
      className="fixed bottom-0 right-0 h-22 bg-surface border-t border-border flex items-center px-8 gap-8 z-30 transition-all duration-300"
      style={{ left: sidebarWidth }}
    >
      {/* Track Info */}
      <div className="flex items-center gap-4 min-w-[220px]">
        <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary to-pink-500 flex items-center justify-center flex-shrink-0 shadow-lg shadow-primary/20">
          <Disc3 className={cn('text-white', isPlaying && 'animate-spin')} size={26} />
        </div>
        <div className="overflow-hidden">
          <p className="font-semibold truncate text-text text-[15px]">{currentTrack.name}</p>
          <p className="text-sm text-textMuted truncate mt-0.5">
            {currentTrack.outputParams?.bpm || '--'} BPM
          </p>
        </div>
      </div>

      {/* Main Controls */}
      <div className="flex-1 flex flex-col items-center gap-2.5">
        <div className="flex items-center gap-4">
          <button
            onClick={previous}
            className="p-2.5 rounded-xl text-textMuted hover:text-text hover:bg-surfaceHover transition-all"
          >
            <SkipBack size={20} />
          </button>
          <button
            onClick={togglePlay}
            className="w-12 h-12 rounded-full bg-primary hover:bg-primaryHover flex items-center justify-center transition-all hover:scale-105 shadow-lg shadow-primary/30"
          >
            {isPlaying ? (
              <Pause size={22} className="text-white" />
            ) : (
              <Play size={22} className="text-white ml-0.5" />
            )}
          </button>
          <button
            onClick={next}
            className="p-2.5 rounded-xl text-textMuted hover:text-text hover:bg-surfaceHover transition-all"
          >
            <SkipForward size={20} />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="w-full max-w-xl flex items-center gap-3">
          <span className="text-xs text-textMuted w-12 text-right font-mono">
            {formatDuration(currentTime)}
          </span>
          <input
            type="range"
            min={0}
            max={duration || 100}
            value={currentTime}
            onChange={handleSeek}
            className="flex-1"
          />
          <span className="text-xs text-textMuted w-12 font-mono">
            {formatDuration(duration)}
          </span>
        </div>
      </div>

      {/* Volume & Repeat */}
      <div className="flex items-center gap-3 min-w-[200px] justify-end">
        <button
          onClick={cycleRepeatMode}
          className={cn(
            'p-2.5 rounded-xl transition-all',
            repeatMode !== 'none'
              ? 'text-primary bg-primary/10'
              : 'text-textMuted hover:text-text hover:bg-surfaceHover'
          )}
        >
          {repeatMode === 'one' ? <Repeat1 size={18} /> : <Repeat size={18} />}
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={toggleMute}
            className="p-2.5 rounded-xl text-textMuted hover:text-text hover:bg-surfaceHover transition-all"
          >
            {volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}
          </button>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={volume}
            onChange={handleVolumeChange}
            className="w-28"
          />
        </div>
      </div>
    </div>
  );
}
