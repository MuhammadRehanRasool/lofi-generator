import { useState, useEffect, useRef } from 'react';
import { Shuffle, Play, Pause, Save, Plus, Music, Zap, Heart, RotateCcw, Loader2 } from 'lucide-react';
import { Button, Card, Slider } from '../../components/ui';
import LofiOptionsPanel from '../../components/LofiOptions/LofiOptionsPanel';
import { randomApi } from '../../services/api';
import { usePlayerStore } from '../../store/playerStore';
import { cn, generateId } from '../../lib/utils';
import type { OutputParams } from '../../types';
import { Producer, player, Track as AudioTrack } from '../../audio';

// Key names (1-12 maps to C, C#, D, etc.)
const KEY_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

// Mode names (1-7)
const MODE_NAMES = ['Ionian', 'Dorian', 'Phrygian', 'Lydian', 'Mixolydian', 'Aeolian', 'Locrian'];

function getKeyName(key: number): string {
  return KEY_NAMES[(key - 1) % 12] || 'C';
}

function getModeName(mode: number): string {
  return MODE_NAMES[(mode - 1) % 7] || 'Ionian';
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export default function RandomGenerator() {
  const [latentValues, setLatentValues] = useState<number[]>(Array(100).fill(0));
  const [outputParams, setOutputParams] = useState<OutputParams | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [audioTrack, setAudioTrack] = useState<AudioTrack | null>(null);
  const [playerTime, setPlayerTime] = useState(0);
  const [playerDuration, setPlayerDuration] = useState(0);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);

  const producerRef = useRef<Producer | null>(null);

  const { addToPlaylist } = usePlayerStore();

  // Initialize producer
  useEffect(() => {
    producerRef.current = new Producer();
  }, []);

  // Set up player state callback
  useEffect(() => {
    player.setStateCallback((state) => {
      setIsAudioPlaying(state.isPlaying);
      setIsLoadingAudio(state.isLoading);
      setPlayerTime(state.currentTime);
      setPlayerDuration(state.duration);
    });

    return () => {
      player.setStateCallback(null);
      player.stop();
    };
  }, []);

  const randomize = () => {
    const newValues = Array(100).fill(0).map(() => {
      const u1 = Math.random();
      const u2 = Math.random();
      const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
      return Math.max(-4, Math.min(4, z));
    });
    setLatentValues(newValues);
  };

  const reset = () => {
    setLatentValues(Array(100).fill(0));
  };

  const generate = async () => {
    setIsGenerating(true);
    try {
      const params = await randomApi.decode(latentValues);
      setOutputParams(params);

      // Produce the audio track
      if (producerRef.current) {
        const track = producerRef.current.produce(params);
        setAudioTrack(track);
      }
    } catch (error) {
      console.error('Generation failed:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePlayPause = async () => {
    if (!audioTrack) return;

    if (isAudioPlaying) {
      player.pause();
    } else {
      setIsLoadingAudio(true);
      try {
        await player.playTrack(audioTrack);
      } catch (error) {
        console.error('Playback failed:', error);
      }
      setIsLoadingAudio(false);
    }
  };

  const handleSave = async () => {
    if (!audioTrack || !outputParams) return;

    setIsSaving(true);
    try {
      // Start recording
      await player.playTrack(audioTrack);
      await player.startRecording();

      // Wait for track to finish (simplified approach - wait for duration)
      const duration = audioTrack.length * 1000 + 2000; // Add 2 sec buffer
      await new Promise(resolve => setTimeout(resolve, duration));

      // Download the recording
      const filename = `lofi-${outputParams.bpm}bpm-${Date.now()}`;
      await player.downloadRecording(filename);
    } catch (error) {
      console.error('Save failed:', error);
    } finally {
      player.stop();
      setIsSaving(false);
    }
  };

  const handleAddToOutput = () => {
    if (outputParams && audioTrack) {
      const track = {
        id: generateId(),
        name: audioTrack.title || `Lofi Track - ${outputParams.bpm} BPM`,
        outputParams,
        duration: audioTrack.length,
      };
      addToPlaylist(track);
    }
  };

  // Calculate aggregate values for display (simplified representation)
  const aggregateValues = {
    mood: latentValues.slice(0, 25).reduce((a, b) => a + b, 0) / 25,
    energy: latentValues.slice(25, 50).reduce((a, b) => a + b, 0) / 25,
    complexity: latentValues.slice(50, 75).reduce((a, b) => a + b, 0) / 25,
    atmosphere: latentValues.slice(75, 100).reduce((a, b) => a + b, 0) / 25,
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold text-text">Random Generator</h1>
          <p className="text-textMuted mt-2">Generate unique lofi tracks with AI</p>
        </div>
        <div className="flex gap-3">
          <Button onClick={randomize} variant="secondary">
            <Shuffle size={18} />
            Randomize
          </Button>
          <Button onClick={generate} loading={isGenerating}>
            <Zap size={18} />
            Generate
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column - Preview & Controls */}
        <div className="lg:col-span-4 space-y-6">
          {/* Vinyl Preview Card */}
          <Card title="Preview">
            <div className="flex flex-col items-center py-6">
              {/* Vinyl Record */}
              <div
                className={cn(
                  'w-40 h-40 rounded-full bg-gradient-to-br from-zinc-800 to-zinc-900 relative',
                  'flex items-center justify-center shadow-2xl',
                  isAudioPlaying && 'vinyl-spinning'
                )}
              >
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary to-pink-500 flex items-center justify-center">
                  <div className="w-6 h-6 rounded-full bg-surface" />
                </div>
                <div className="absolute inset-3 rounded-full border border-zinc-700/30" />
                <div className="absolute inset-6 rounded-full border border-zinc-700/30" />
                <div className="absolute inset-9 rounded-full border border-zinc-700/30" />
              </div>

              {/* Track Info */}
              {outputParams ? (
                <div className="mt-6 text-center space-y-3 w-full">
                  <div className="flex items-center justify-center gap-2">
                    <Music size={18} className="text-primary" />
                    <span className="text-xl font-bold text-text">{outputParams.bpm} BPM</span>
                  </div>
                  <p className="text-textMuted">
                    {getKeyName(outputParams.key)} {getModeName(outputParams.mode)}
                  </p>

                  {/* Energy & Valence Bars */}
                  <div className="space-y-2 pt-2">
                    <div className="flex items-center gap-2">
                      <Zap size={14} className="text-yellow-500" />
                      <span className="text-xs text-textMuted w-14">Energy</span>
                      <div className="flex-1 h-2 bg-border rounded-full overflow-hidden">
                        <div
                          className="h-full bg-yellow-500 rounded-full transition-all"
                          style={{ width: `${outputParams.energy * 100}%` }}
                        />
                      </div>
                      <span className="text-xs text-textMuted w-8">{Math.round(outputParams.energy * 100)}%</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Heart size={14} className="text-pink-500" />
                      <span className="text-xs text-textMuted w-14">Valence</span>
                      <div className="flex-1 h-2 bg-border rounded-full overflow-hidden">
                        <div
                          className="h-full bg-pink-500 rounded-full transition-all"
                          style={{ width: `${outputParams.valence * 100}%` }}
                        />
                      </div>
                      <span className="text-xs text-textMuted w-8">{Math.round(outputParams.valence * 100)}%</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mt-6 text-center text-textMuted">
                  <p className="text-sm">Click "Generate" to create a track</p>
                </div>
              )}
            </div>
          </Card>

          {/* Quick Actions */}
          <Card title="Actions">
            <div className="space-y-4">
              <Button
                onClick={handlePlayPause}
                disabled={!audioTrack || isLoadingAudio}
                className="w-full"
                size="lg"
              >
                {isLoadingAudio ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : isAudioPlaying ? (
                  <Pause size={18} />
                ) : (
                  <Play size={18} />
                )}
                {isLoadingAudio ? 'Loading...' : isAudioPlaying ? 'Pause' : 'Play Preview'}
              </Button>
              {/* Progress Bar */}
              {audioTrack && (isAudioPlaying || playerTime > 0) && (
                <div className="space-y-1">
                  <div className="h-1.5 bg-border rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all duration-100"
                      style={{ width: `${playerDuration > 0 ? (playerTime / playerDuration) * 100 : 0}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-textMuted font-mono">
                    <span>{formatTime(playerTime)}</span>
                    <span>{formatTime(playerDuration)}</span>
                  </div>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <Button onClick={handleSave} variant="secondary" disabled={!audioTrack || isSaving}>
                  {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  {isSaving ? 'Recording...' : 'Save MP3'}
                </Button>
                <Button onClick={handleAddToOutput} variant="secondary" disabled={!audioTrack}>
                  <Plus size={16} />
                  Add to Output
                </Button>
              </div>
            </div>
          </Card>
        </div>

        {/* Middle Column - Generation Controls */}
        <div className="lg:col-span-4 space-y-6">
          <Card title="Generation Controls">
            <div className="space-y-6">
              {/* Simplified Controls */}
              <div className="space-y-5">
                <p className="text-sm text-textMuted leading-relaxed">
                  Adjust these controls to influence the generated track's characteristics.
                </p>

                <Slider
                  label="Mood"
                  min={-4}
                  max={4}
                  step={0.1}
                  value={aggregateValues.mood}
                  onChange={(v) => {
                    const newValues = [...latentValues];
                    for (let i = 0; i < 25; i++) {
                      newValues[i] = v + (Math.random() - 0.5) * 0.5;
                    }
                    setLatentValues(newValues);
                  }}
                  formatValue={(v) => v > 0 ? `+${v.toFixed(1)}` : v.toFixed(1)}
                />

                <Slider
                  label="Energy"
                  min={-4}
                  max={4}
                  step={0.1}
                  value={aggregateValues.energy}
                  onChange={(v) => {
                    const newValues = [...latentValues];
                    for (let i = 25; i < 50; i++) {
                      newValues[i] = v + (Math.random() - 0.5) * 0.5;
                    }
                    setLatentValues(newValues);
                  }}
                  formatValue={(v) => v > 0 ? `+${v.toFixed(1)}` : v.toFixed(1)}
                />

                <Slider
                  label="Complexity"
                  min={-4}
                  max={4}
                  step={0.1}
                  value={aggregateValues.complexity}
                  onChange={(v) => {
                    const newValues = [...latentValues];
                    for (let i = 50; i < 75; i++) {
                      newValues[i] = v + (Math.random() - 0.5) * 0.5;
                    }
                    setLatentValues(newValues);
                  }}
                  formatValue={(v) => v > 0 ? `+${v.toFixed(1)}` : v.toFixed(1)}
                />

                <Slider
                  label="Atmosphere"
                  min={-4}
                  max={4}
                  step={0.1}
                  value={aggregateValues.atmosphere}
                  onChange={(v) => {
                    const newValues = [...latentValues];
                    for (let i = 75; i < 100; i++) {
                      newValues[i] = v + (Math.random() - 0.5) * 0.5;
                    }
                    setLatentValues(newValues);
                  }}
                  formatValue={(v) => v > 0 ? `+${v.toFixed(1)}` : v.toFixed(1)}
                />
              </div>

              <div className="flex gap-3 pt-2">
                <Button onClick={randomize} variant="secondary" className="flex-1">
                  <Shuffle size={16} />
                  Randomize All
                </Button>
                <Button onClick={reset} variant="ghost">
                  <RotateCcw size={16} />
                  Reset
                </Button>
              </div>
            </div>
          </Card>

          {/* Advanced Sliders (Collapsible) */}
          <Card
            title="Advanced Latent Space"
            collapsible
            defaultOpen={false}
            headerRight={
              <span className="text-xs text-textMuted bg-surfaceHover px-2.5 py-1 rounded-lg">100 params</span>
            }
          >
            <div className="space-y-3">
              <p className="text-sm text-textMuted">
                Fine-tune individual latent parameters for precise control.
              </p>
              <div className="h-[300px] overflow-y-auto pr-3 space-y-1.5">
                {latentValues.map((value, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <span className="w-8 text-xs text-textMuted font-mono">
                      {index.toString().padStart(2, '0')}
                    </span>
                    <input
                      type="range"
                      min={-4}
                      max={4}
                      step={0.01}
                      value={value}
                      onChange={(e) => {
                        const newValues = [...latentValues];
                        newValues[index] = parseFloat(e.target.value);
                        setLatentValues(newValues);
                      }}
                      className="flex-1 h-1.5"
                    />
                    <span className="w-12 text-xs text-textMuted font-mono text-right">
                      {value.toFixed(1)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </div>

        {/* Right Column - Lofi Options */}
        <div className="lg:col-span-4">
          <LofiOptionsPanel showPresets />
        </div>
      </div>
    </div>
  );
}
