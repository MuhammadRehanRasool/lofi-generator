import { useEffect, useState, useRef, useCallback } from 'react';
import { Play, Pause, Square, Volume2 } from 'lucide-react';
import { Card, Slider } from '../ui';
import { useOptionsStore, LOFI_PRESETS } from '../../store/optionsStore';
import { effectsApi } from '../../services/api';
import { cn } from '../../lib/utils';
import type { Effect } from '../../types';

// Fallback effects with actual sample paths
const FALLBACK_EFFECTS: Effect[] = [
  { id: 'rain', name: 'Rain', file: '/samples/loops/rain/rain_1.mp3', category: 'nature' },
  { id: 'vinyl', name: 'Vinyl Crackle', file: '/samples/loops/vinyl/vinyl_1.mp3', category: 'ambient' },
];

interface LofiOptionsPanelProps {
  showPresets?: boolean;
  compact?: boolean;
}

// Audio preview state for each effect
interface AudioState {
  isPlaying: boolean;
  audio: HTMLAudioElement | null;
}

export default function LofiOptionsPanel({
  showPresets = true,
  compact: _compact = false,
}: LofiOptionsPanelProps) {
  void _compact;
  const {
    lofiOptions,
    currentLofiPreset,
    setLofiOption,
    addEffect,
    removeEffect,
    updateEffectVolume,
    loadLofiPreset,
  } = useOptionsStore();

  const [effectsByCategory, setEffectsByCategory] = useState<Record<string, Effect[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [audioStates, setAudioStates] = useState<Record<string, AudioState>>({});
  const audioRefs = useRef<Record<string, HTMLAudioElement>>({});

  useEffect(() => {
    setIsLoading(true);
    effectsApi.list()
      .then((response) => {
        if (response.effects && response.effects.length > 0) {
          const grouped = response.effects.reduce((acc, effect) => {
            if (!acc[effect.category]) {
              acc[effect.category] = [];
            }
            acc[effect.category].push(effect);
            return acc;
          }, {} as Record<string, Effect[]>);
          setEffectsByCategory(grouped);
        } else {
          loadFallbackEffects();
        }
      })
      .catch(() => {
        loadFallbackEffects();
      })
      .finally(() => setIsLoading(false));

    // Cleanup audio on unmount
    return () => {
      Object.values(audioRefs.current).forEach(audio => {
        audio.pause();
        audio.src = '';
      });
    };
  }, []);

  const loadFallbackEffects = () => {
    const grouped = FALLBACK_EFFECTS.reduce((acc, effect) => {
      if (!acc[effect.category]) {
        acc[effect.category] = [];
      }
      acc[effect.category].push(effect);
      return acc;
    }, {} as Record<string, Effect[]>);
    setEffectsByCategory(grouped);
  };

  const isEffectEnabled = (effectId: string) =>
    lofiOptions.effects.some((e) => e.id === effectId);

  const getEffectVolume = (effectId: string) =>
    lofiOptions.effects.find((e) => e.id === effectId)?.volume ?? 0.3;

  const toggleEffect = (effectId: string) => {
    if (isEffectEnabled(effectId)) {
      removeEffect(effectId);
      // Stop audio when disabling effect
      stopAudio(effectId);
    } else {
      addEffect({ id: effectId, volume: 0.3 });
    }
  };

  const getAudioPath = (effect: Effect): string => {
    // If it's already a full path, use it
    if (effect.file.startsWith('/')) {
      return effect.file;
    }
    // Otherwise construct the path based on effect id
    if (effect.id === 'rain') {
      return '/samples/loops/rain/rain_1.mp3';
    }
    if (effect.id === 'vinyl') {
      return '/samples/loops/vinyl/vinyl_1.mp3';
    }
    // Default: assume it's in a folder named after the effect
    return `/samples/loops/${effect.id}/${effect.file}`;
  };

  const playAudio = useCallback((effect: Effect) => {
    const effectId = effect.id;

    // Stop any currently playing audio for this effect
    if (audioRefs.current[effectId]) {
      audioRefs.current[effectId].pause();
    }

    // Create new audio element
    const audio = new Audio(getAudioPath(effect));
    audio.loop = true;
    audio.volume = getEffectVolume(effectId);

    audio.play().catch(err => {
      console.error('Failed to play audio:', err);
    });

    audioRefs.current[effectId] = audio;
    setAudioStates(prev => ({
      ...prev,
      [effectId]: { isPlaying: true, audio }
    }));

    // Handle audio ending (though it's looped)
    audio.onended = () => {
      setAudioStates(prev => ({
        ...prev,
        [effectId]: { ...prev[effectId], isPlaying: false }
      }));
    };
  }, [lofiOptions.effects]);

  const pauseAudio = useCallback((effectId: string) => {
    const audio = audioRefs.current[effectId];
    if (audio) {
      audio.pause();
      setAudioStates(prev => ({
        ...prev,
        [effectId]: { ...prev[effectId], isPlaying: false }
      }));
    }
  }, []);

  const stopAudio = useCallback((effectId: string) => {
    const audio = audioRefs.current[effectId];
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
      setAudioStates(prev => ({
        ...prev,
        [effectId]: { isPlaying: false, audio: null }
      }));
    }
  }, []);

  const handleVolumeChange = useCallback((effectId: string, volume: number) => {
    updateEffectVolume(effectId, volume);

    // Update audio volume in real-time
    const audio = audioRefs.current[effectId];
    if (audio) {
      audio.volume = volume;
    }
  }, [updateEffectVolume]);

  const isPlaying = (effectId: string) => audioStates[effectId]?.isPlaying ?? false;

  const hasEffects = Object.keys(effectsByCategory).length > 0;

  return (
    <div className="space-y-5">
      {/* Presets */}
      {showPresets && (
        <Card title="Effect Presets">
          <p className="text-sm text-muted-foreground mb-4">Quick presets for common lofi styles</p>
          <div className="flex flex-wrap gap-2">
            {Object.entries(LOFI_PRESETS).map(([key, preset]) => (
              <button
                key={key}
                onClick={() => loadLofiPreset(key as keyof typeof LOFI_PRESETS)}
                className={cn(
                  'px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-150',
                  currentLofiPreset === key
                    ? 'bg-primary text-primary-foreground shadow-md shadow-primary/25'
                    : 'bg-secondary text-muted-foreground hover:text-foreground hover:bg-secondary/80'
                )}
              >
                {preset.name}
              </button>
            ))}
            {currentLofiPreset === 'custom' && (
              <span className="px-4 py-2.5 rounded-lg text-sm font-medium bg-primary/20 text-primary border border-primary/30">
                Custom
              </span>
            )}
          </div>
        </Card>
      )}

      {/* Basic Controls */}
      <Card title="Basic Controls">
        <div className="space-y-5">
          <Slider
            label="Slow Factor"
            min={0}
            max={0.5}
            step={0.01}
            value={lofiOptions.slow_factor}
            onChange={(v) => setLofiOption('slow_factor', v)}
          />
          <Slider
            label="Reverb Amount"
            min={0}
            max={1}
            step={0.01}
            value={lofiOptions.room_size}
            onChange={(v) => setLofiOption('room_size', v)}
          />
        </div>
      </Card>

      {/* Sound Effects */}
      <Card title="Sound Effects" collapsible defaultOpen={true}>
        {isLoading ? (
          <div className="py-8 text-center text-muted-foreground">
            <p className="text-sm">Loading effects...</p>
          </div>
        ) : !hasEffects ? (
          <div className="py-8 text-center text-muted-foreground">
            <p className="text-sm">No effects available</p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(effectsByCategory).map(([category, effects]) => (
              <div key={category}>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                  {category}
                </h4>
                <div className="space-y-4">
                  {effects.map((effect) => {
                    const enabled = isEffectEnabled(effect.id);
                    const playing = isPlaying(effect.id);
                    const volume = getEffectVolume(effect.id);

                    return (
                      <div
                        key={effect.id}
                        className={cn(
                          'rounded-lg border p-4 transition-all',
                          enabled
                            ? 'border-primary/30 bg-primary/5'
                            : 'border-border bg-secondary/30'
                        )}
                      >
                        {/* Effect Header */}
                        <div className="flex items-center justify-between gap-3">
                          <button
                            onClick={() => toggleEffect(effect.id)}
                            className={cn(
                              'flex items-center gap-3 flex-1 text-left',
                              enabled ? 'text-foreground' : 'text-muted-foreground'
                            )}
                          >
                            <div
                              className={cn(
                                'w-5 h-5 rounded border-2 flex items-center justify-center transition-all',
                                enabled
                                  ? 'bg-primary border-primary'
                                  : 'border-muted-foreground/50'
                              )}
                            >
                              {enabled && (
                                <svg className="w-3 h-3 text-primary-foreground" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                              )}
                            </div>
                            <span className="font-medium text-sm">{effect.name}</span>
                          </button>

                          {/* Playback Controls */}
                          <div className="flex items-center gap-1">
                            {playing ? (
                              <button
                                onClick={() => pauseAudio(effect.id)}
                                className="p-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                                title="Pause"
                              >
                                <Pause size={16} />
                              </button>
                            ) : (
                              <button
                                onClick={() => playAudio(effect)}
                                className="p-2 rounded-lg bg-secondary hover:bg-secondary/80 text-foreground transition-colors"
                                title="Play preview"
                              >
                                <Play size={16} />
                              </button>
                            )}
                            <button
                              onClick={() => stopAudio(effect.id)}
                              className="p-2 rounded-lg bg-secondary hover:bg-secondary/80 text-muted-foreground hover:text-foreground transition-colors"
                              title="Stop"
                            >
                              <Square size={16} />
                            </button>
                          </div>
                        </div>

                        {/* Volume Control - Always visible when enabled */}
                        {enabled && (
                          <div className="mt-4 flex items-center gap-3">
                            <Volume2 size={16} className="text-muted-foreground flex-shrink-0" />
                            <div className="flex-1">
                              <Slider
                                min={0}
                                max={1}
                                step={0.01}
                                value={volume}
                                onChange={(v) => handleVolumeChange(effect.id, v)}
                                showValue
                                formatValue={(v) => `${Math.round(v * 100)}%`}
                              />
                            </div>
                          </div>
                        )}

                        {/* Playing indicator */}
                        {playing && (
                          <div className="mt-3 flex items-center gap-2 text-xs text-primary">
                            <span className="relative flex h-2 w-2">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                            </span>
                            Playing preview...
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Advanced Reverb */}
      <Card title="Advanced Reverb" collapsible defaultOpen={false}>
        <div className="space-y-5">
          <Slider
            label="Room Size"
            min={0}
            max={1}
            value={lofiOptions.room_size}
            onChange={(v) => setLofiOption('room_size', v)}
          />
          <Slider
            label="Damping"
            min={0}
            max={1}
            value={lofiOptions.damping}
            onChange={(v) => setLofiOption('damping', v)}
          />
          <Slider
            label="Wet Level"
            min={0}
            max={1}
            value={lofiOptions.wet_level}
            onChange={(v) => setLofiOption('wet_level', v)}
          />
          <Slider
            label="Dry Level"
            min={0}
            max={1}
            value={lofiOptions.dry_level}
            onChange={(v) => setLofiOption('dry_level', v)}
          />
          <Slider
            label="Stereo Delay (s)"
            min={0}
            max={5}
            step={0.1}
            value={lofiOptions.stereo_delay}
            onChange={(v) => setLofiOption('stereo_delay', v)}
            formatValue={(v) => `${v.toFixed(1)}s`}
          />
        </div>
      </Card>
    </div>
  );
}
