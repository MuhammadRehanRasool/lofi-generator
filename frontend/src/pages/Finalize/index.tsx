import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  Download,
  ExternalLink,
  Check,
} from 'lucide-react';
import { Button, Card, Slider, Select, ColorPicker, Progress, Tabs } from '../../components/ui';
import { useOptionsStore, VIDEO_PRESETS } from '../../store/optionsStore';
import { videoApi, outputApi } from '../../services/api';
import { formatDuration, cn } from '../../lib/utils';
import type { OutputFile, JobProgress } from '../../types';

const STEPS = [
  { id: 'select', label: 'Select Files' },
  { id: 'style', label: 'Video Style' },
  { id: 'generate', label: 'Generate' },
  { id: 'publish', label: 'Publish' },
];

export default function Finalize() {
  const location = useLocation();
  const _navigate = useNavigate(); // Reserved for future navigation
  void _navigate;
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedFiles, setSelectedFiles] = useState<string[]>(
    (location.state as { selectedFiles?: string[] })?.selectedFiles || []
  );
  const [files, setFiles] = useState<OutputFile[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [jobProgress, setJobProgress] = useState<JobProgress | null>(null);
  const [generatedVideoPath, setGeneratedVideoPath] = useState<string | null>(null);
  void generatedVideoPath; // Used to store path for download
  const [copied, setCopied] = useState(false);

  const {
    videoOptions,
    currentVideoPreset,
    setVideoOption,
    loadVideoPreset,
  } = useOptionsStore();

  useEffect(() => {
    outputApi.list().then((response) => {
      setFiles(response.files);
    });
  }, []);

  const totalDuration = files
    .filter((f) => selectedFiles.includes(f.filename))
    .reduce((sum, f) => sum + f.duration, 0);

  const nextStep = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const startGeneration = async () => {
    setIsGenerating(true);
    setJobProgress(null);

    try {
      const response = await videoApi.generate(
        selectedFiles,
        videoOptions,
        `lofi-video-${Date.now()}`
      );

      const ws = videoApi.subscribeProgress(response.jobId, (data) => {
        const progress = data as JobProgress;
        setJobProgress(progress);

        if (progress.status === 'complete') {
          setGeneratedVideoPath(progress.current_file || null);
          setIsGenerating(false);
          nextStep();
          ws.close();
        } else if (progress.status === 'error') {
          setIsGenerating(false);
          ws.close();
        }
      });
    } catch (error) {
      console.error('Generation failed:', error);
      setIsGenerating(false);
    }
  };

  const generateGeminiPrompt = () => {
    const effectsList = selectedFiles.join(', ');
    return `I created a lofi music video for YouTube. Please help me with:

Music Details:
- Duration: ${formatDuration(totalDuration)}
- Tracks: ${effectsList}
- Style: Chill lofi beats
- Visualizer: ${videoOptions.visualizer_type} with ${videoOptions.visualizer_color}

Please generate:
1. YouTube Title (catchy, include "lofi", under 60 characters)
2. Description (include mood keywords, timestamps if multiple tracks)
3. Thumbnail Concept (describe the aesthetic, colors, and imagery)
4. Tags (10-15 relevant tags for discoverability)

Keep the vibe cozy and aesthetic!`;
  };

  const copyPromptAndOpenGemini = () => {
    navigator.clipboard.writeText(generateGeminiPrompt());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    window.open('https://gemini.google.com/', '_blank');
  };

  const renderStepContent = () => {
    switch (STEPS[currentStep].id) {
      case 'select':
        return (
          <div className="space-y-4">
            <p className="text-textMuted">
              Select and order the audio files for your video
            </p>
            <div className="space-y-2">
              {files.map((file) => (
                <div
                  key={file.filename}
                  onClick={() => {
                    if (selectedFiles.includes(file.filename)) {
                      setSelectedFiles(selectedFiles.filter((f) => f !== file.filename));
                    } else {
                      setSelectedFiles([...selectedFiles, file.filename]);
                    }
                  }}
                  className={cn(
                    'flex items-center gap-4 p-4 rounded-lg border cursor-pointer transition-all',
                    selectedFiles.includes(file.filename)
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  )}
                >
                  <div className="flex-1">
                    <p className="font-medium">{file.filename}</p>
                    <p className="text-sm text-textMuted">
                      {formatDuration(file.duration)}
                    </p>
                  </div>
                  {selectedFiles.includes(file.filename) && (
                    <Check className="text-primary" size={20} />
                  )}
                </div>
              ))}
            </div>
            {selectedFiles.length > 0 && (
              <p className="text-sm text-textMuted">
                Total duration: {formatDuration(totalDuration)}
              </p>
            )}
          </div>
        );

      case 'style':
        return (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Preview */}
            <Card title="Preview">
              <div className="aspect-video bg-gradient-to-b from-background to-surface rounded-lg flex items-end justify-center pb-8">
                <div className="flex gap-1">
                  {Array(32).fill(0).map((_, i) => (
                    <div
                      key={i}
                      className="w-2 rounded-t"
                      style={{
                        height: `${Math.random() * 100 + 20}px`,
                        backgroundColor: videoOptions.visualizer_color,
                      }}
                    />
                  ))}
                </div>
              </div>
            </Card>

            {/* Style Controls */}
            <div className="space-y-4">
              {/* Preset Themes */}
              <Card title="Preset Themes">
                <div className="flex flex-wrap gap-2">
                  {Object.entries(VIDEO_PRESETS).map(([key, preset]) => (
                    <button
                      key={key}
                      onClick={() => loadVideoPreset(key as keyof typeof VIDEO_PRESETS)}
                      className={cn(
                        'px-3 py-1.5 rounded-lg text-sm font-medium transition-all',
                        currentVideoPreset === key
                          ? 'bg-primary text-white'
                          : 'bg-surfaceHover text-textMuted hover:text-text'
                      )}
                    >
                      {preset.name}
                    </button>
                  ))}
                </div>
              </Card>

              {/* Visualizer */}
              <Card title="Visualizer" collapsible>
                <div className="space-y-4">
                  <Select
                    options={[
                      { value: 'bass_bars', label: 'Bass Bars' },
                      { value: 'waveform', label: 'Waveform' },
                      { value: 'circular', label: 'Circular' },
                      { value: 'none', label: 'None' },
                    ]}
                    value={videoOptions.visualizer_type}
                    onChange={(v) => setVideoOption('visualizer_type', v as 'bass_bars')}
                  />
                  <div>
                    <label className="text-sm text-textMuted block mb-2">Primary Color</label>
                    <ColorPicker
                      value={videoOptions.visualizer_color}
                      onChange={(v) => setVideoOption('visualizer_color', v)}
                    />
                  </div>
                  <div>
                    <label className="text-sm text-textMuted block mb-2">Secondary Color</label>
                    <ColorPicker
                      value={videoOptions.visualizer_color_secondary}
                      onChange={(v) => setVideoOption('visualizer_color_secondary', v)}
                    />
                  </div>
                  <Slider
                    label="Bar Count"
                    min={16}
                    max={128}
                    step={1}
                    value={videoOptions.bar_count}
                    onChange={(v) => setVideoOption('bar_count', v)}
                    formatValue={(v) => v.toString()}
                  />
                </div>
              </Card>

              {/* Background */}
              <Card title="Background" collapsible defaultOpen={false}>
                <div className="space-y-4">
                  <Tabs
                    tabs={[
                      { id: 'gradient', label: 'Gradient' },
                      { id: 'solid', label: 'Solid' },
                      { id: 'image', label: 'Image' },
                    ]}
                    activeTab={videoOptions.background_type}
                    onChange={(v) => setVideoOption('background_type', v as 'gradient')}
                  />
                  <ColorPicker
                    value={videoOptions.background_color}
                    onChange={(v) => setVideoOption('background_color', v)}
                  />
                  {videoOptions.background_type === 'gradient' && (
                    <ColorPicker
                      value={videoOptions.background_gradient_end}
                      onChange={(v) => setVideoOption('background_gradient_end', v)}
                    />
                  )}
                </div>
              </Card>

              {/* Overlays */}
              <Card title="Overlays" collapsible defaultOpen={false}>
                <div className="space-y-4">
                  <Slider
                    label="Film Grain"
                    min={0}
                    max={1}
                    value={videoOptions.grain_intensity}
                    onChange={(v) => setVideoOption('grain_intensity', v)}
                  />
                  <Slider
                    label="Vignette"
                    min={0}
                    max={1}
                    value={videoOptions.vignette_strength}
                    onChange={(v) => setVideoOption('vignette_strength', v)}
                  />
                </div>
              </Card>
            </div>
          </div>
        );

      case 'generate':
        return (
          <div className="space-y-6">
            <Card title="Summary">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-textMuted">Files:</span>{' '}
                  <span>{selectedFiles.length}</span>
                </div>
                <div>
                  <span className="text-textMuted">Duration:</span>{' '}
                  <span>{formatDuration(totalDuration)}</span>
                </div>
                <div>
                  <span className="text-textMuted">Resolution:</span>{' '}
                  <span>{videoOptions.resolution.join('x')}</span>
                </div>
                <div>
                  <span className="text-textMuted">FPS:</span>{' '}
                  <span>{videoOptions.fps}</span>
                </div>
              </div>
            </Card>

            {isGenerating && jobProgress ? (
              <Card title="Generating Video">
                <Progress
                  value={jobProgress.progress}
                  status={jobProgress.status}
                />
                {jobProgress.error && (
                  <p className="mt-2 text-red-500">{jobProgress.error}</p>
                )}
              </Card>
            ) : (
              <div className="text-center py-8">
                <Button onClick={startGeneration} size="lg">
                  Generate Video
                </Button>
              </div>
            )}
          </div>
        );

      case 'publish':
        return (
          <div className="space-y-6">
            <Card title="Video Ready!">
              <div className="aspect-video bg-surface rounded-lg flex items-center justify-center">
                <p className="text-textMuted">Video preview will appear here</p>
              </div>
            </Card>

            <div className="flex gap-4">
              <Button variant="secondary">
                <Download size={16} />
                Download Video
              </Button>
              <Button onClick={copyPromptAndOpenGemini}>
                <ExternalLink size={16} />
                {copied ? 'Copied!' : 'Open Gemini'}
              </Button>
            </div>

            <Card title="Publishing Checklist">
              <div className="space-y-3">
                {[
                  'Downloaded video',
                  'Got title from Gemini',
                  'Got description from Gemini',
                  'Created thumbnail',
                  'Ready to upload to YouTube',
                ].map((item, i) => (
                  <label key={i} className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" className="w-4 h-4" />
                    <span>{item}</span>
                  </label>
                ))}
              </div>
            </Card>
          </div>
        );
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-text">Finalize Video</h1>
          <p className="text-textMuted mt-1">
            Step {currentStep + 1} of {STEPS.length}
          </p>
        </div>
      </div>

      {/* Step Indicator */}
      <div className="flex items-center bg-surface border border-border rounded-xl p-2">
        {STEPS.map((step, index) => (
          <div key={step.id} className="flex items-center flex-1">
            <button
              onClick={() => setCurrentStep(index)}
              disabled={index > currentStep && selectedFiles.length === 0}
              className={cn(
                'flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all w-full',
                index === currentStep
                  ? 'bg-primary text-white'
                  : index < currentStep
                  ? 'text-primary hover:bg-primary/10'
                  : 'text-textMuted'
              )}
            >
              <span
                className={cn(
                  'w-7 h-7 rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0',
                  index === currentStep
                    ? 'bg-white/20'
                    : index < currentStep
                    ? 'bg-primary/20 text-primary'
                    : 'bg-surfaceHover'
                )}
              >
                {index < currentStep ? <Check size={14} /> : index + 1}
              </span>
              <span className="font-medium hidden sm:inline">{step.label}</span>
            </button>
            {index < STEPS.length - 1 && (
              <div className={cn(
                'w-12 h-0.5 mx-1 flex-shrink-0',
                index < currentStep ? 'bg-primary' : 'bg-border'
              )} />
            )}
          </div>
        ))}
      </div>

      {/* Step Content */}
      <Card>{renderStepContent()}</Card>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button
          variant="secondary"
          onClick={prevStep}
          disabled={currentStep === 0}
        >
          <ArrowLeft size={16} />
          Back
        </Button>
        {currentStep < STEPS.length - 1 && STEPS[currentStep].id !== 'generate' && (
          <Button
            onClick={nextStep}
            disabled={currentStep === 0 && selectedFiles.length === 0}
          >
            Next Step
            <ArrowRight size={16} />
          </Button>
        )}
      </div>
    </div>
  );
}
