"""
Video Generator Service - Create visualizer videos from audio files.
"""
import numpy as np
from pathlib import Path
from typing import List, Optional, Callable
import subprocess as sp

from app.models.schemas import VideoOptions, VisualizerType, BackgroundType, GradientDirection


def generate_video(
    audio_paths: List[str],
    output_path: str,
    options: VideoOptions,
    progress_callback: Optional[Callable[[float, str], None]] = None,
) -> str:
    """
    Generate a video with visualizer from audio files.

    Args:
        audio_paths: List of paths to audio files
        output_path: Path for the output video file
        options: VideoOptions with all video settings
        progress_callback: Optional callback for progress updates

    Returns:
        Path to the generated video file
    """
    try:
        from moviepy.editor import AudioFileClip, VideoClip, concatenate_audioclips
        from PIL import Image
    except ImportError as e:
        raise RuntimeError(f"Required library not installed: {e}")

    if progress_callback:
        progress_callback(5, "Loading audio...")

    # Load and optionally concatenate audio files
    if len(audio_paths) == 1:
        audio = AudioFileClip(audio_paths[0])
    else:
        clips = [AudioFileClip(p) for p in audio_paths]
        audio = concatenate_audioclips(clips)

    duration = audio.duration
    fps = options.fps
    width, height = options.resolution

    if progress_callback:
        progress_callback(10, "Preparing visualizer...")

    # Pre-generate background
    background = create_background(options, width, height)

    # Create frame generator
    def make_frame(t):
        nonlocal audio

        # Get audio data for this frame (simplified - real implementation would use FFT)
        # For now, create a simple time-based animation
        progress = t / duration

        # Create frame
        frame = background.copy()

        # Add visualizer
        if options.visualizer_type != VisualizerType.NONE:
            # Generate fake frequency data based on time
            freq_data = generate_fake_frequency_data(t, options.bar_count)
            frame = add_visualizer(frame, freq_data, options)

        # Add overlays
        if options.grain_intensity > 0:
            frame = add_grain(frame, options.grain_intensity)

        if options.vignette_strength > 0:
            frame = add_vignette(frame, options.vignette_strength)

        return frame

    if progress_callback:
        progress_callback(20, "Generating frames...")

    # Create video
    video = VideoClip(make_frame, duration=duration)
    video = video.set_audio(audio)

    if progress_callback:
        progress_callback(50, "Encoding video...")

    # Write video
    video.write_videofile(
        output_path,
        fps=fps,
        codec='libx264',
        audio_codec='aac',
        temp_audiofile='temp-audio.m4a',
        remove_temp=True,
        logger=None,  # Suppress moviepy output
    )

    if progress_callback:
        progress_callback(100, "Complete!")

    return output_path


def create_background(options: VideoOptions, width: int, height: int) -> np.ndarray:
    """Create the background image based on options."""
    if options.background_type == BackgroundType.SOLID:
        color = hex_to_rgb(options.background_color)
        return np.full((height, width, 3), color, dtype=np.uint8)

    elif options.background_type == BackgroundType.GRADIENT:
        return create_gradient(
            width, height,
            hex_to_rgb(options.background_color),
            hex_to_rgb(options.background_gradient_end),
            options.gradient_direction,
        )

    elif options.background_type == BackgroundType.IMAGE and options.background_image:
        from PIL import Image
        img = Image.open(options.background_image).convert('RGB')
        img = img.resize((width, height))
        return np.array(img)

    # Default to solid black
    return np.zeros((height, width, 3), dtype=np.uint8)


def create_gradient(
    width: int,
    height: int,
    color1: tuple,
    color2: tuple,
    direction: GradientDirection
) -> np.ndarray:
    """Create a gradient background."""
    if direction == GradientDirection.VERTICAL:
        gradient = np.linspace(0, 1, height).reshape(-1, 1)
        gradient = np.tile(gradient, (1, width))
    elif direction == GradientDirection.HORIZONTAL:
        gradient = np.linspace(0, 1, width).reshape(1, -1)
        gradient = np.tile(gradient, (height, 1))
    else:  # Radial
        y, x = np.ogrid[:height, :width]
        center_y, center_x = height // 2, width // 2
        dist = np.sqrt((x - center_x) ** 2 + (y - center_y) ** 2)
        gradient = dist / np.max(dist)

    # Apply gradient to colors
    result = np.zeros((height, width, 3), dtype=np.uint8)
    for i in range(3):
        result[:, :, i] = (color1[i] * (1 - gradient) + color2[i] * gradient).astype(np.uint8)

    return result


def generate_fake_frequency_data(t: float, num_bars: int) -> np.ndarray:
    """Generate fake frequency data for visualization."""
    # Create multiple sine waves at different frequencies for variety
    base = np.linspace(0, np.pi, num_bars)
    data = np.sin(base + t * 2) * 0.3 + 0.5
    data += np.sin(base * 2 + t * 3) * 0.2
    data += np.sin(base * 0.5 + t * 1.5) * 0.15

    # Add some randomness
    data += np.random.uniform(-0.05, 0.05, num_bars)

    # Normalize to 0-1 range
    data = np.clip(data, 0, 1)

    return data


def add_visualizer(frame: np.ndarray, freq_data: np.ndarray, options: VideoOptions) -> np.ndarray:
    """Add visualizer to frame."""
    height, width = frame.shape[:2]
    result = frame.copy()

    num_bars = len(freq_data)
    bar_width_px = int(width / num_bars * options.bar_width)
    bar_spacing = width / num_bars
    max_bar_height = height * 0.4

    color1 = hex_to_rgb(options.visualizer_color)
    color2 = hex_to_rgb(options.visualizer_color_secondary)

    if options.visualizer_type == VisualizerType.BASS_BARS:
        for i, val in enumerate(freq_data):
            x = int(i * bar_spacing + (bar_spacing - bar_width_px) / 2)
            bar_height = int(val * max_bar_height)
            y = height - bar_height - 50  # 50px from bottom

            # Interpolate color
            t = i / num_bars
            color = tuple(int(c1 * (1 - t) + c2 * t) for c1, c2 in zip(color1, color2))

            # Draw bar with simple rectangle
            result[y:height - 50, x:x + bar_width_px] = color

    elif options.visualizer_type == VisualizerType.WAVEFORM:
        points_y = (freq_data * max_bar_height + height // 2 - max_bar_height // 2).astype(int)
        for i in range(len(points_y) - 1):
            x1 = int(i * width / num_bars)
            x2 = int((i + 1) * width / num_bars)
            y1, y2 = points_y[i], points_y[i + 1]

            # Draw line (simplified)
            for x in range(x1, x2):
                y = int(y1 + (y2 - y1) * (x - x1) / max(1, x2 - x1))
                for dy in range(-2, 3):
                    if 0 <= y + dy < height:
                        result[y + dy, x] = color1

    elif options.visualizer_type == VisualizerType.CIRCULAR:
        center_x, center_y = width // 2, height // 2
        base_radius = min(width, height) // 4

        for i, val in enumerate(freq_data):
            angle = 2 * np.pi * i / num_bars
            radius = base_radius + int(val * base_radius)

            x = int(center_x + np.cos(angle) * radius)
            y = int(center_y + np.sin(angle) * radius)

            # Draw small circle at point
            for dy in range(-3, 4):
                for dx in range(-3, 4):
                    if 0 <= y + dy < height and 0 <= x + dx < width:
                        if dx * dx + dy * dy <= 9:
                            result[y + dy, x + dx] = color1

    return result


def add_grain(frame: np.ndarray, intensity: float) -> np.ndarray:
    """Add film grain effect."""
    noise = np.random.normal(0, intensity * 25, frame.shape).astype(np.int16)
    result = np.clip(frame.astype(np.int16) + noise, 0, 255).astype(np.uint8)
    return result


def add_vignette(frame: np.ndarray, strength: float) -> np.ndarray:
    """Add vignette effect."""
    height, width = frame.shape[:2]
    y, x = np.ogrid[:height, :width]
    center_y, center_x = height // 2, width // 2

    # Calculate distance from center (normalized)
    dist = np.sqrt((x - center_x) ** 2 + (y - center_y) ** 2)
    max_dist = np.sqrt(center_x ** 2 + center_y ** 2)
    dist = dist / max_dist

    # Create vignette mask
    vignette = 1 - (dist ** 2) * strength
    vignette = np.clip(vignette, 0, 1)

    # Apply to frame
    result = (frame * vignette[:, :, np.newaxis]).astype(np.uint8)
    return result


def create_preview_frame(options: VideoOptions) -> np.ndarray:
    """Create a single preview frame with the given options."""
    width, height = options.resolution

    # Create background
    frame = create_background(options, width, height)

    # Add sample visualizer data
    freq_data = generate_fake_frequency_data(0.5, options.bar_count)
    frame = add_visualizer(frame, freq_data, options)

    # Add overlays
    if options.grain_intensity > 0:
        frame = add_grain(frame, options.grain_intensity)

    if options.vignette_strength > 0:
        frame = add_vignette(frame, options.vignette_strength)

    return frame


def hex_to_rgb(hex_color: str) -> tuple:
    """Convert hex color to RGB tuple."""
    hex_color = hex_color.lstrip('#')
    return tuple(int(hex_color[i:i + 2], 16) for i in (0, 2, 4))
