from pydantic import BaseModel, Field
from typing import List, Optional, Tuple
from enum import Enum


class EffectSpec(BaseModel):
    id: str
    volume: float = Field(default=0.3, ge=0.0, le=1.0)


class LofiOptions(BaseModel):
    slow_factor: float = Field(default=0.08, ge=0.0, le=0.5)
    room_size: float = Field(default=0.75, ge=0.0, le=1.0)
    damping: float = Field(default=0.5, ge=0.0, le=1.0)
    wet_level: float = Field(default=0.08, ge=0.0, le=1.0)
    dry_level: float = Field(default=0.2, ge=0.0, le=1.0)
    stereo_delay: float = Field(default=2.0, ge=0.0, le=5.0)
    effects: List[EffectSpec] = Field(default_factory=list)


class VideoInfo(BaseModel):
    id: str
    title: str
    duration: int  # seconds
    thumbnail: str  # URL
    channel: str


class PlaylistInfo(BaseModel):
    id: str
    title: str
    videos: List[VideoInfo]


class VisualizerType(str, Enum):
    BASS_BARS = "bass_bars"
    WAVEFORM = "waveform"
    CIRCULAR = "circular"
    NONE = "none"


class BackgroundType(str, Enum):
    SOLID = "solid"
    GRADIENT = "gradient"
    IMAGE = "image"


class GradientDirection(str, Enum):
    VERTICAL = "vertical"
    HORIZONTAL = "horizontal"
    RADIAL = "radial"


class VideoOptions(BaseModel):
    # Visualizer
    visualizer_type: VisualizerType = VisualizerType.BASS_BARS
    visualizer_color: str = "#8b5cf6"
    visualizer_color_secondary: str = "#ec4899"
    bar_count: int = Field(default=64, ge=16, le=128)
    bar_width: float = Field(default=0.6, ge=0.1, le=1.0)
    bar_radius: int = Field(default=4, ge=0, le=20)
    smoothing: float = Field(default=0.8, ge=0.0, le=1.0)

    # Background
    background_type: BackgroundType = BackgroundType.GRADIENT
    background_color: str = "#0a0a0b"
    background_gradient_end: str = "#1a1a2e"
    gradient_direction: GradientDirection = GradientDirection.VERTICAL
    background_image: Optional[str] = None

    # Overlays
    grain_intensity: float = Field(default=0.1, ge=0.0, le=1.0)
    vignette_strength: float = Field(default=0.3, ge=0.0, le=1.0)

    # Output
    resolution: Tuple[int, int] = (1920, 1080)
    fps: int = Field(default=30, ge=24, le=60)


class OutputFile(BaseModel):
    filename: str
    source: str  # "random" or "youtube"
    duration: float  # seconds
    created_at: str  # ISO timestamp
    size: int  # bytes


class JobProgress(BaseModel):
    job_id: str
    status: str
    progress: float  # 0-100
    current_file: Optional[str] = None
    error: Optional[str] = None


class RenderRequest(BaseModel):
    output_params: dict
    filename: Optional[str] = None


class YouTubeConvertRequest(BaseModel):
    url: str
    video_ids: Optional[List[str]] = None
    options: LofiOptions = Field(default_factory=LofiOptions)


class VideoGenerateRequest(BaseModel):
    audio_files: List[str]
    options: VideoOptions = Field(default_factory=VideoOptions)
    output_name: Optional[str] = None
