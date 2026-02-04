# Unified Lofi Generator - Detailed Implementation Plan

## Design Philosophy
- **Modern & Minimalist UI**: Clean lines, ample whitespace, subtle animations
- **Dark theme** with accent colors
- **Every option has sensible defaults** for fast workflow
- **Progressive disclosure**: Advanced options hidden behind expandable sections

---

## Phase 1: Project Structure Setup

### 1.1 Create Frontend (React + Vite + TypeScript)

**Location**: `frontend/`

```bash
# Commands to run
npm create vite@latest frontend -- --template react-ts
cd frontend
npm install react-router-dom zustand @tanstack/react-query tone @tonaljs/tonal
npm install tailwindcss postcss autoprefixer lucide-react
npm install clsx tailwind-merge class-variance-authority
npx tailwindcss init -p
```

**Create files**:

| File | Purpose |
|------|---------|
| `frontend/src/App.tsx` | Main app with router |
| `frontend/src/main.tsx` | Entry point |
| `frontend/src/index.css` | Tailwind imports + global styles |
| `frontend/tailwind.config.js` | Dark theme, custom colors |
| `frontend/src/lib/utils.ts` | cn() helper for classnames |

**Tailwind Config** (`tailwind.config.js`):
```js
{
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: '#0a0a0b',
        surface: '#141416',
        surfaceHover: '#1c1c1f',
        border: '#27272a',
        primary: '#8b5cf6',    // Purple accent
        primaryHover: '#7c3aed',
        text: '#fafafa',
        textMuted: '#a1a1aa',
      }
    }
  }
}
```

### 1.2 Create Backend (FastAPI)

**Location**: `backend/`

**Create files**:

| File | Purpose |
|------|---------|
| `backend/app/__init__.py` | Package init |
| `backend/app/main.py` | FastAPI app entry, CORS, routes |
| `backend/app/config.py` | Settings (paths, defaults) |
| `backend/requirements.txt` | Dependencies |

**requirements.txt**:
```
fastapi==0.109.0
uvicorn[standard]==0.27.0
python-multipart==0.0.6
yt-dlp==2024.1.0
pedalboard==0.8.0
librosa==0.10.1
soundfile==0.12.1
moviepy==1.0.3
numpy==1.26.3
pydantic==2.5.3
httpx==0.26.0
websockets==12.0
pillow==10.2.0
```

### 1.3 Move Existing Assets

| From | To |
|------|-----|
| `effects/*.wav` | `backend/effects/` |
| `client/assets/samples/` | `frontend/public/assets/samples/` |
| `client/assets/icons/` | `frontend/public/assets/icons/` |

---

## Phase 2: Backend Core Services

### 2.1 Config & Constants

**File**: `backend/app/config.py`

```python
from pathlib import Path

class Settings:
    BASE_DIR = Path(__file__).parent.parent
    EFFECTS_DIR = BASE_DIR / "effects"
    OUTPUT_DIR = BASE_DIR / "output"
    TEMP_DIR = BASE_DIR / "temp"

    # ML Server
    ML_SERVER_URL = "https://lofiserver.jacobzhang.de"

    # Default Lofi Settings
    DEFAULTS = {
        "slow_factor": 0.08,
        "room_size": 0.75,
        "damping": 0.5,
        "wet_level": 0.08,
        "dry_level": 0.2,
        "stereo_delay": 2.0,
    }

    # Available Effects (24 total)
    EFFECTS = [
        {"id": "rain", "name": "Rain", "file": "rain.wav", "category": "weather"},
        {"id": "soft-rain", "name": "Soft Rain", "file": "soft-rain.wav", "category": "weather"},
        # ... all 24 effects with categories
    ]
```

### 2.2 Lofi Maker Service

**File**: `backend/app/services/lofi_maker.py`

Migrate from existing `lofi_maker.py` with these functions:
- `process_audio(input_path, output_path, options: LofiOptions) -> str`
- `apply_reverb(audio, sr, room_size, damping, wet, dry)`
- `apply_slow(audio, sr, slow_factor) -> (audio, new_sr)`
- `mix_effects(audio, sr, effects: list[EffectSpec])`
- `apply_stereo_delay(audio, sr, delay_seconds)`

**LofiOptions Schema** (`backend/app/models/schemas.py`):
```python
class LofiOptions(BaseModel):
    slow_factor: float = 0.08          # 0.0-0.5
    room_size: float = 0.75            # 0.0-1.0
    damping: float = 0.5               # 0.0-1.0
    wet_level: float = 0.08            # 0.0-1.0
    dry_level: float = 0.2             # 0.0-1.0
    stereo_delay: float = 2.0          # 0-5 seconds
    effects: list[EffectSpec] = []     # [{id, volume}]

class EffectSpec(BaseModel):
    id: str
    volume: float = 0.3                # 0.0-1.0
```

### 2.3 YouTube Downloader Service

**File**: `backend/app/services/youtube_downloader.py`

Functions:
- `fetch_info(url: str) -> VideoInfo | PlaylistInfo`
- `download_audio(url: str, output_dir: Path) -> str`
- `download_playlist(url: str, output_dir: Path, video_ids: list[str]) -> list[str]`

**VideoInfo Schema**:
```python
class VideoInfo(BaseModel):
    id: str
    title: str
    duration: int              # seconds
    thumbnail: str             # URL
    channel: str

class PlaylistInfo(BaseModel):
    id: str
    title: str
    videos: list[VideoInfo]
```

### 2.4 Video Generator Service

**File**: `backend/app/services/video_generator.py`

Functions:
- `generate_video(audio_path, output_path, options: VideoOptions) -> str`
- `create_visualizer_frame(freq_data, options) -> np.ndarray`
- `create_background(options) -> np.ndarray`
- `apply_overlays(frame, options) -> np.ndarray`

**VideoOptions Schema**:
```python
class VideoOptions(BaseModel):
    # Visualizer
    visualizer_type: str = "bass_bars"  # bass_bars | waveform | circular | none
    visualizer_color: str = "#8b5cf6"   # Primary color
    visualizer_color_secondary: str = "#ec4899"  # Secondary/gradient
    bar_count: int = 64                 # For bass_bars
    bar_width: float = 0.6              # 0.1-1.0 (relative)
    bar_radius: int = 4                 # Corner radius
    smoothing: float = 0.8              # Animation smoothing

    # Background
    background_type: str = "gradient"   # solid | gradient | image
    background_color: str = "#0a0a0b"
    background_gradient_end: str = "#1a1a2e"
    gradient_direction: str = "vertical" # vertical | horizontal | radial
    background_image: str | None = None  # Path if type=image

    # Overlays
    grain_intensity: float = 0.1        # 0.0-1.0
    vignette_strength: float = 0.3      # 0.0-1.0

    # Output
    resolution: tuple = (1920, 1080)
    fps: int = 30
```

### 2.5 API Routers

**File**: `backend/app/routers/random.py`
```python
GET  /api/random/generate        # Proxy to ML server
GET  /api/random/decode          # Proxy to ML server
POST /api/random/render          # Render params to MP3
     Body: { outputParams: OutputParams, filename?: string }
     Response: { filename: string, path: string }
```

**File**: `backend/app/routers/youtube.py`
```python
POST /api/youtube/info           # Fetch video/playlist info
     Body: { url: string }
     Response: VideoInfo | PlaylistInfo

POST /api/youtube/convert        # Start conversion
     Body: { url: string, videoIds?: string[], options: LofiOptions }
     Response: { jobId: string }

WS   /api/youtube/progress/{job_id}  # Progress updates
     Messages: { status, progress, currentFile, error? }
```

**File**: `backend/app/routers/output.py`
```python
GET    /api/output/list          # List all output files
       Response: { files: OutputFile[] }

GET    /api/output/stream/{filename}  # Stream audio for preview
DELETE /api/output/{filename}    # Delete file
```

**File**: `backend/app/routers/video.py`
```python
POST /api/video/generate         # Start video generation
     Body: { audioFiles: string[], options: VideoOptions, outputName?: string }
     Response: { jobId: string }

WS   /api/video/progress/{job_id}  # Progress updates

POST /api/video/preview          # Generate single preview frame
     Body: { options: VideoOptions }
     Response: { imageBase64: string }
```

---

## Phase 3: Frontend Core Components

### 3.1 Layout & Navigation

**File**: `frontend/src/components/Layout/Layout.tsx`
- Sidebar navigation (icons + labels)
- Main content area
- Global audio player bar at bottom

**File**: `frontend/src/components/Layout/Sidebar.tsx`
- Navigation items:
  - Random Generator
  - YouTube Converter
  - Output Manager
  - Finalize

**File**: `frontend/src/components/Layout/GlobalPlayer.tsx`
- Mini player bar (bottom of screen)
- Current track info
- Play/pause, progress, volume
- Appears when any audio is playing

### 3.2 Shared UI Components

**Directory**: `frontend/src/components/ui/`

| Component | Props | Default |
|-----------|-------|---------|
| `Button.tsx` | variant, size, loading | variant="primary" |
| `Slider.tsx` | min, max, step, value, label, showValue | step=0.01 |
| `Input.tsx` | type, placeholder, icon | - |
| `Card.tsx` | title, collapsible, defaultOpen | defaultOpen=true |
| `Toggle.tsx` | checked, label | - |
| `Select.tsx` | options, value, placeholder | - |
| `ColorPicker.tsx` | value, presets | presets=[purple, pink, blue, green] |
| `Progress.tsx` | value, status, label | - |
| `Checkbox.tsx` | checked, label | - |
| `Tabs.tsx` | tabs, activeTab | - |

**Design specs for all components**:
- Border radius: 8px (buttons), 12px (cards)
- Transitions: 150ms ease
- Focus ring: 2px primary color with offset
- Hover states: subtle background change

### 3.3 Lofi Options Panel (Reusable)

**File**: `frontend/src/components/LofiOptions/LofiOptionsPanel.tsx`

Used by both Random Generator and YouTube Converter.

```tsx
interface LofiOptionsPanelProps {
  options: LofiOptions;
  onChange: (options: LofiOptions) => void;
  showPresets?: boolean;    // Default: true
  compact?: boolean;        // Default: false
}
```

**Sections**:

1. **Presets** (Quick select):
   - "Default" - all defaults
   - "Heavy Reverb" - room_size=0.9, wet=0.15
   - "Subtle" - room_size=0.5, wet=0.05
   - "Slowed" - slow_factor=0.15
   - "Custom" - user modified

2. **Basic Controls** (Always visible):
   | Control | Type | Range | Default |
   |---------|------|-------|---------|
   | Slow Factor | Slider | 0-0.5 | 0.08 |
   | Reverb Amount | Slider | 0-1 | 0.75 |

3. **Advanced Reverb** (Collapsible, closed by default):
   | Control | Type | Range | Default |
   |---------|------|-------|---------|
   | Room Size | Slider | 0-1 | 0.75 |
   | Damping | Slider | 0-1 | 0.5 |
   | Wet Level | Slider | 0-1 | 0.08 |
   | Dry Level | Slider | 0-1 | 0.2 |
   | Stereo Delay | Slider | 0-5s | 2.0 |

4. **Effects** (Collapsible, closed by default):
   - Categorized grid:
     - Weather: Rain, Soft Rain, Heavy Rain, Thunder, Distant Thunder
     - Nature: Ocean, Beach, Waterfall, Forest Night, Birds
     - Ambient: Cafe, Fire, Fire Light, Humming
     - Vintage: Vinyl Crackle, Tape Hiss
     - Urban: Traffic, Engine Hum, White Noise
     - Keyboard: Mechanical, Computer, iPhone
     - Wind: Small Wind
   - Each effect: Toggle + Volume slider (appears when enabled)

---

## Phase 4: Random Generator Page

**File**: `frontend/src/pages/RandomGenerator/index.tsx`

### Layout (3 columns on desktop):
```
+-------------------------------------------------------------+
|  +-----------+  +---------------------+  +-------------+    |
|  |           |  |                     |  |             |    |
|  |   Player  |  |   Latent Sliders    |  |   Options   |    |
|  |   Panel   |  |   (100 sliders)     |  |   Panel     |    |
|  |           |  |                     |  |             |    |
|  | Visualizer|  |   [Randomize]       |  |  [Presets]  |    |
|  | Controls  |  |   [Generate]        |  |  [Basic]    |    |
|  | Playlist  |  |                     |  |  [Advanced] |    |
|  |           |  |                     |  |  [Effects]  |    |
|  +-----------+  +---------------------+  +-------------+    |
|  +----------------------------------------------------------+
|  |  [Play]  [Save as MP3]  [Add to Output]                  |
|  +----------------------------------------------------------+
+-------------------------------------------------------------+
```

### 4.1 Player Panel

**File**: `frontend/src/pages/RandomGenerator/PlayerPanel.tsx`

- Vinyl record animation (spinning when playing)
- Spectrum visualizer (22 bars)
- Current track info (BPM, Key, Mode)
- Playback controls: Previous, Play/Pause, Next
- Volume slider with mute
- Repeat mode toggle
- Playlist with drag-drop reorder

### 4.2 Latent Sliders Panel

**File**: `frontend/src/pages/RandomGenerator/LatentSliders.tsx`

- 100 sliders in scrollable grid (10x10)
- Each slider: -4 to +4, step 0.01, default 0
- Compact mode: just sliders, no labels
- Actions:
  - **Randomize**: Fill with random normal distribution values
  - **Reset**: Set all to 0
  - **Generate**: Call ML server -> get OutputParams -> produce track

### 4.3 Options Panel

**File**: `frontend/src/pages/RandomGenerator/OptionsPanel.tsx`

- Musical Controls (read-only, from OutputParams):
  - Key display (C, C#, D, etc.)
  - Mode display (Ionian, Dorian, etc.)
  - BPM display
  - Energy meter
  - Valence meter

- Effects Controls (editable):
  - Rain toggle + volume (default: off)
  - Vinyl crackle toggle + volume (default: on, 0.3)

### 4.4 Action Bar

**File**: `frontend/src/pages/RandomGenerator/ActionBar.tsx`

| Button | Action | Default |
|--------|--------|---------|
| Play/Pause | Toggle Tone.js playback | - |
| Save as MP3 | POST /api/random/render -> download | filename: `lofi-{timestamp}.mp3` |
| Add to Output | Save + add to output manager | - |

---

## Phase 5: YouTube Converter Page

**File**: `frontend/src/pages/YouTubeConverter/index.tsx`

### Layout:
```
+-------------------------------------------------------------+
|  +----------------------------------------------------------+
|  |  [URL Input________________________] [Fetch Info]        |
|  +----------------------------------------------------------+
|                                                              |
|  +-------------------------+  +-----------------------------+
|  |                         |  |                             |
|  |   Video/Playlist Info   |  |     Lofi Options Panel      |
|  |                         |  |                             |
|  |   [x] Song 1    3:45    |  |     [Presets]               |
|  |   [x] Song 2    4:12    |  |     [Basic Controls]        |
|  |   [ ] Song 3    3:21    |  |     [Advanced] v            |
|  |   ...                   |  |     [Effects] v             |
|  |                         |  |                             |
|  |   [Select All] [None]   |  |                             |
|  +-------------------------+  +-----------------------------+
|                                                              |
|  +----------------------------------------------------------+
|  |  [Convert Selected]                    Progress: 2/5     |
|  +----------------------------------------------------------+
+-------------------------------------------------------------+
```

### 5.1 URL Input Section

**File**: `frontend/src/pages/YouTubeConverter/UrlInput.tsx`

- Input field with YouTube icon
- Placeholder: "Paste YouTube video or playlist URL"
- Fetch Info button (loading state while fetching)
- Validation: Show error for invalid URLs

### 5.2 Video/Playlist Display

**File**: `frontend/src/pages/YouTubeConverter/MediaDisplay.tsx`

**Single Video Mode**:
- Thumbnail (large)
- Title
- Channel name
- Duration
- Direct "Convert" button

**Playlist Mode**:
- Playlist title + video count
- Scrollable list with:
  - Checkbox
  - Thumbnail (small)
  - Title
  - Duration
- Select All / Deselect All buttons
- Selected count display

### 5.3 Options Panel

Reuse `<LofiOptionsPanel />` with all options.

### 5.4 Conversion Progress

**File**: `frontend/src/pages/YouTubeConverter/ConversionProgress.tsx`

- Overall progress bar
- Current file being processed
- Status messages:
  - "Downloading: Song Name..."
  - "Applying effects: Song Name..."
  - "Saving: Song Name..."
- Cancel button
- On complete: Show success + link to Output Manager

---

## Phase 6: Output Manager Page

**File**: `frontend/src/pages/OutputManager/index.tsx`

### Layout:
```
+-------------------------------------------------------------+
|  Output Manager                    [Delete Selected] [Refresh]
+-------------------------------------------------------------+
|  +----------------------------------------------------------+
|  | [x] | lofi-cafe-vibes.mp3    | YouTube | 4:32 | Today    |
|  | [ ] | lofi-random-001.mp3    | Random  | 3:15 | Today    |
|  | [x] | lofi-rain-study.mp3    | YouTube | 5:01 | Yest.    |
|  |     |                        |         |      |          |
|  +----------------------------------------------------------+
|                                                              |
|  +----------------------------------------------------------+
|  |  > Now Playing: lofi-cafe-vibes.mp3        ====o== 2:15  |
|  +----------------------------------------------------------+
|                                                              |
|  [Finalize Selected (2)]                                     |
+-------------------------------------------------------------+
```

### 6.1 File Table

**File**: `frontend/src/pages/OutputManager/FileTable.tsx`

Columns:
| Column | Width | Sortable |
|--------|-------|----------|
| Checkbox | 40px | No |
| Filename | flex | Yes |
| Source | 100px | Yes |
| Duration | 80px | Yes |
| Created | 100px | Yes |
| Actions | 120px | No |

Actions per row:
- Play (toggles to Pause when playing)
- Download
- Delete (with confirmation)

### 6.2 Preview Player

**File**: `frontend/src/pages/OutputManager/PreviewPlayer.tsx`

- Waveform visualization
- Play/Pause
- Seek bar
- Time display (current / total)
- Volume

### 6.3 Batch Actions

- Select All / Deselect All
- Delete Selected (confirmation modal)
- **Finalize Selected** -> Navigate to Finalize page with selected files

---

## Phase 7: Finalize Page

**File**: `frontend/src/pages/Finalize/index.tsx`

### Layout (Step-by-step wizard):
```
+-------------------------------------------------------------+
|  Finalize Video                          Step 2 of 4        |
+-------------------------------------------------------------+
|  o Select Files  * Video Style  o Generate  o Publish       |
+-------------------------------------------------------------+
|                                                              |
|  +-----------------------+  +-------------------------------+
|  |                       |  |                               |
|  |   Live Preview        |  |   Style Controls              |
|  |   (Canvas)            |  |                               |
|  |                       |  |   Visualizer Type v           |
|  |   +---------------+   |  |   [Bass Bars] [Wave] [Circ]   |
|  |   | |||||||||||||| |   |  |                               |
|  |   | |||||||||||||| |   |  |   Colors                      |
|  |   +---------------+   |  |   Primary: [____] #8b5cf6     |
|  |                       |  |   Secondary: [____] #ec4899   |
|  |                       |  |                               |
|  +-----------------------+  |   Background v                |
|                             |   [Gradient] [Solid] [Image]  |
|                             |                               |
|                             |   Overlays v                  |
|                             |   Grain: ===o=== 0.1          |
|                             |   Vignette: ===o=== 0.3       |
|                             +-------------------------------+
|                                                              |
|  [< Back]                                    [Next Step >]   |
+-------------------------------------------------------------+
```

### 7.1 Step 1: Select Files

**File**: `frontend/src/pages/Finalize/StepSelectFiles.tsx`

- List of files passed from Output Manager (or select new)
- Reorder with drag-drop
- Option to merge into single video or create separate videos
- Total duration display
- Output filename input (default: `lofi-video-{timestamp}`)

### 7.2 Step 2: Video Style

**File**: `frontend/src/pages/Finalize/StepVideoStyle.tsx`

**Live Preview Canvas** (updates in real-time):
- Shows current frame based on settings
- Animated visualizer preview
- 16:9 aspect ratio preview

**Visualizer Section**:
| Control | Type | Options/Range | Default |
|---------|------|---------------|---------|
| Type | Button group | Bass Bars, Waveform, Circular, None | Bass Bars |
| Primary Color | Color picker | Any | #8b5cf6 (purple) |
| Secondary Color | Color picker | Any | #ec4899 (pink) |
| Bar Count | Slider | 16-128 | 64 |
| Bar Width | Slider | 0.1-1.0 | 0.6 |
| Corner Radius | Slider | 0-20 | 4 |
| Smoothing | Slider | 0-1 | 0.8 |
| Position | Select | Bottom, Center, Top | Bottom |

**Background Section**:
| Control | Type | Options/Range | Default |
|---------|------|---------------|---------|
| Type | Button group | Gradient, Solid, Image | Gradient |
| Color 1 | Color picker | Any | #0a0a0b |
| Color 2 | Color picker | Any | #1a1a2e |
| Direction | Select | Vertical, Horizontal, Radial | Vertical |
| Image Upload | File input | JPG/PNG | - |

**Preset Themes** (Quick select):
- Midnight Purple (default)
- Sunset Vibes (orange/pink gradient)
- Ocean Deep (blue/teal)
- Forest Night (green/dark)
- Vaporwave (pink/cyan)
- Minimal Dark (solid black)

**Overlays Section**:
| Control | Type | Range | Default |
|---------|------|-------|---------|
| Film Grain | Slider | 0-1 | 0.1 |
| Vignette | Slider | 0-1 | 0.3 |
| Blur Edges | Slider | 0-1 | 0 |

### 7.3 Step 3: Generate

**File**: `frontend/src/pages/Finalize/StepGenerate.tsx`

- Summary of settings
- Estimated output size
- **Generate Video** button
- Progress:
  - "Analyzing audio..." (0-10%)
  - "Generating frames..." (10-90%)
  - "Encoding video..." (90-99%)
  - "Complete!" (100%)
- Cancel button
- On complete: Video preview player + Download button

### 7.4 Step 4: Publish Prep

**File**: `frontend/src/pages/Finalize/StepPublish.tsx`

- Video preview (embedded player)
- Download Video button
- **Open Gemini** button:
  - Opens `https://gemini.google.com/` in new tab
  - Auto-copies prompt to clipboard
  - Shows toast: "Prompt copied! Paste in Gemini"

**Generated Prompt**:
```
I created a lofi music video for YouTube. Please help me with:

Music Details:
- Duration: {duration}
- Tracks: {track names}
- Style: {based on effects used - e.g., "rainy cafe vibes", "chill study beats"}
- Visualizer: {type} with {colors}

Please generate:
1. YouTube Title (catchy, include "lofi", under 60 characters)
2. Description (include mood keywords, timestamps if multiple tracks)
3. Thumbnail Concept (describe the aesthetic, colors, and imagery)
4. Tags (10-15 relevant tags for discoverability)

Keep the vibe cozy and aesthetic!
```

- Checklist before publishing:
  - [ ] Downloaded video
  - [ ] Got title from Gemini
  - [ ] Got description from Gemini
  - [ ] Created thumbnail
  - [ ] Ready to upload to YouTube

---

## Phase 8: State Management & Services

### 8.1 Zustand Stores

**File**: `frontend/src/store/playerStore.ts`
```typescript
interface PlayerState {
  currentTrack: Track | null;
  playlist: Track[];
  isPlaying: boolean;
  volume: number;           // Default: 0.8
  repeatMode: 'none' | 'all' | 'one';
  // Actions
  play, pause, next, previous, setVolume, etc.
}
```

**File**: `frontend/src/store/optionsStore.ts`
```typescript
interface OptionsState {
  lofiOptions: LofiOptions;     // With all defaults
  videoOptions: VideoOptions;   // With all defaults
  // Actions
  setLofiOption, setVideoOption, resetToDefaults, loadPreset
}
```

**File**: `frontend/src/store/outputStore.ts`
```typescript
interface OutputState {
  files: OutputFile[];
  selectedFiles: string[];
  // Actions
  refresh, select, deselect, delete
}
```

### 8.2 API Service

**File**: `frontend/src/services/api.ts`

All API calls with proper typing:
```typescript
// Random Generator
api.random.generate(): Promise<OutputParams>
api.random.decode(input: number[]): Promise<OutputParams>
api.random.render(params: OutputParams, filename?: string): Promise<{path: string}>

// YouTube
api.youtube.fetchInfo(url: string): Promise<VideoInfo | PlaylistInfo>
api.youtube.convert(url: string, videoIds: string[], options: LofiOptions): Promise<{jobId: string}>
api.youtube.subscribeProgress(jobId: string, onMessage: (msg) => void): WebSocket

// Output
api.output.list(): Promise<OutputFile[]>
api.output.delete(filename: string): Promise<void>
api.output.getStreamUrl(filename: string): string

// Video
api.video.generate(files: string[], options: VideoOptions): Promise<{jobId: string}>
api.video.subscribeProgress(jobId: string, onMessage: (msg) => void): WebSocket
api.video.preview(options: VideoOptions): Promise<{imageBase64: string}>
```

### 8.3 Audio Engine (Tone.js)

**File**: `frontend/src/services/audioEngine.ts`

Migrate from existing client:
- `initializeAudio()` - Setup Tone.js context
- `loadTrack(track: Track)` - Load all samples/instruments
- `play()`, `pause()`, `seek(time)`, `stop()`
- `startRecording()`, `stopRecording()` - For MP3 export
- `getAnalyserData()` - For visualizer

---

## Phase 9: Polish & UX

### 9.1 Loading States

Every async action shows:
- Button: spinner + "Loading..." text
- Page: skeleton loaders
- Progress: Percentage + status message

### 9.2 Error Handling

- Toast notifications for errors
- Retry buttons where appropriate
- Graceful fallbacks

### 9.3 Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| Space | Play/Pause |
| Left/Right | Seek 5s |
| Up/Down | Volume |
| M | Mute |
| R | Randomize (on Random page) |
| G | Generate (on Random page) |

### 9.4 Responsive Design

- Desktop: Full 3-column layout
- Tablet: 2-column, collapsible panels
- Mobile: Single column, bottom sheet for options

---

## Verification Checklist

### Random Generator
- [ ] Sliders respond and persist
- [ ] Randomize fills with normal distribution
- [ ] Generate calls ML server and produces audio
- [ ] Tone.js playback works
- [ ] Save as MP3 downloads correct file
- [ ] Options affect playback (rain/vinyl)

### YouTube Converter
- [ ] Single video URL fetches info
- [ ] Playlist URL shows all videos
- [ ] Selection works (all/none/individual)
- [ ] Conversion shows progress
- [ ] Output files appear in manager
- [ ] All lofi options apply correctly

### Output Manager
- [ ] Lists all files from both sources
- [ ] Preview plays correctly
- [ ] Download works
- [ ] Delete removes file
- [ ] Multi-select works
- [ ] Navigate to Finalize with selection

### Finalize
- [ ] Step navigation works
- [ ] Live preview updates in real-time
- [ ] All visualizer types render
- [ ] Color pickers work
- [ ] Video generates with correct settings
- [ ] Audio is synced in output
- [ ] Gemini opens with correct prompt

---

## File Summary

### Backend (~20 files)
```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py
│   ├── config.py
│   ├── routers/
│   │   ├── __init__.py
│   │   ├── random.py
│   │   ├── youtube.py
│   │   ├── output.py
│   │   └── video.py
│   ├── services/
│   │   ├── __init__.py
│   │   ├── lofi_maker.py
│   │   ├── youtube_downloader.py
│   │   └── video_generator.py
│   ├── models/
│   │   ├── __init__.py
│   │   └── schemas.py
│   └── utils/
│       ├── __init__.py
│       └── file_manager.py
├── effects/
├── output/
├── temp/
└── requirements.txt
```

### Frontend (~40 files)
```
frontend/
├── src/
│   ├── components/
│   │   ├── Layout/ (3 files)
│   │   ├── ui/ (10 files)
│   │   └── LofiOptions/ (3 files)
│   ├── pages/
│   │   ├── RandomGenerator/ (4 files)
│   │   ├── YouTubeConverter/ (4 files)
│   │   ├── OutputManager/ (3 files)
│   │   └── Finalize/ (5 files)
│   ├── services/ (3 files)
│   ├── store/ (3 files)
│   ├── hooks/ (2 files)
│   ├── types/ (1 file)
│   ├── lib/ (1 file)
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── public/assets/
├── package.json
├── tailwind.config.js
├── tsconfig.json
└── vite.config.ts
```

**Total: ~60 files**
