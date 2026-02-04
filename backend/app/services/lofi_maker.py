"""
Lofi Maker Service - Audio processing engine for creating lofi effects.
Migrated from the original lofi_maker.py
"""
import os
import subprocess as sp
from math import trunc
from pathlib import Path
from typing import List, Tuple, Optional

import numpy as np
import soundfile as sf
from pedalboard import Pedalboard, Reverb

from app.config import settings
from app.models.schemas import LofiOptions, EffectSpec


def remove_extension(filename: str) -> str:
    """Remove the file extension from a filename."""
    return os.path.splitext(filename)[0]


def load_and_prep(effect_path: str, target_len: int, tmp_path: str, vol: float = 1.0) -> np.ndarray:
    """Load an effect file, convert to WAV/stereo, loop/trim to target_len, and apply volume."""
    # Convert to WAV if needed
    if not effect_path.lower().endswith(".wav"):
        sp.call(f'ffmpeg -y -i "{effect_path}" "{tmp_path}"', shell=True,
                stdout=sp.DEVNULL, stderr=sp.DEVNULL)
        effect_path = tmp_path

    data, _ = sf.read(effect_path)

    # Convert mono to stereo
    if data.ndim == 1:
        data = np.stack([data, data], axis=1)

    # Loop or trim to match target length
    repeats = int(np.ceil(target_len / len(data)))
    data = np.tile(data, (repeats, 1))[:target_len]

    return data * vol


def process_audio(
    input_path: str,
    output_path: str,
    options: LofiOptions,
    progress_callback: Optional[callable] = None,
) -> str:
    """
    Process an audio file with lofi effects.

    Args:
        input_path: Path to the input audio file
        output_path: Path for the output file (without extension, .mp3 will be added)
        options: LofiOptions with all processing parameters
        progress_callback: Optional callback function for progress updates

    Returns:
        Path to the generated MP3 file
    """
    output_dir = Path(output_path).parent
    output_dir.mkdir(parents=True, exist_ok=True)

    output_name = Path(output_path).stem

    # Convert effect specs to (path, volume) tuples
    fx_specs = []
    for effect_spec in options.effects:
        effect_info = settings.get_effect_by_id(effect_spec.id)
        if effect_info:
            effect_path = settings.EFFECTS_DIR / effect_info["file"]
            if effect_path.exists():
                fx_specs.append((str(effect_path), effect_spec.volume))

    return slowedreverb_with_fx(
        audio_path=input_path,
        output_name=f"{output_name}.wav",
        output_path=str(output_dir),
        room_size=options.room_size,
        damping=options.damping,
        wet_level=options.wet_level,
        dry_level=options.dry_level,
        delay=options.stereo_delay,
        slowfactor=options.slow_factor,
        fx_specs=fx_specs,
        progress_callback=progress_callback,
    )


def slowedreverb_with_fx(
    audio_path: str,
    output_name: str,
    output_path: str = "output/",
    room_size: float = 0.75,
    damping: float = 0.5,
    wet_level: float = 0.08,
    dry_level: float = 0.2,
    delay: float = 2.0,
    slowfactor: float = 0.08,
    fx_specs: Optional[List[Tuple[str, float]]] = None,
    progress_callback: Optional[callable] = None,
) -> str:
    """
    Apply slowed reverb and optional FX to an audio file, then save the result.

    Args:
        audio_path: Path to the input audio file
        output_name: Name for the output file
        output_path: Directory for output files
        room_size: Reverb room size (0.0-1.0)
        damping: Reverb damping (0.0-1.0)
        wet_level: Reverb wet level (0.0-1.0)
        dry_level: Reverb dry level (0.0-1.0)
        delay: Stereo delay in milliseconds
        slowfactor: How much to slow down (0.0-0.5)
        fx_specs: List of (effect_path, volume) tuples
        progress_callback: Optional callback for progress updates

    Returns:
        Path to the generated MP3 file
    """
    os.makedirs(output_path, exist_ok=True)
    TMP_IN = os.path.join(output_path, "tmp_in.wav")
    TMP_FX = os.path.join(output_path, "tmp_fx.wav")

    if progress_callback:
        progress_callback(10, "Loading audio...")

    # Convert input to WAV if needed
    if not audio_path.lower().endswith(".wav"):
        sp.call(f'ffmpeg -y -i "{audio_path}" "{TMP_IN}"', shell=True,
                stdout=sp.DEVNULL, stderr=sp.DEVNULL)
        audio_path = TMP_IN

    audio, sr = sf.read(audio_path)

    # Handle mono audio
    if audio.ndim == 1:
        audio = np.stack([audio, audio], axis=1)

    sr_out = sr - trunc(sr * slowfactor)
    length = len(audio)

    if progress_callback:
        progress_callback(30, "Mixing effects...")

    # Mix original audio with all FX
    mix = audio.copy()
    for fx_path, fx_vol in fx_specs or []:
        mix += load_and_prep(fx_path, length, TMP_FX, fx_vol)

    if progress_callback:
        progress_callback(50, "Applying reverb...")

    # Apply reverb
    board = Pedalboard([Reverb(room_size, damping, wet_level, dry_level)])
    effected = board(mix, sr_out)

    if progress_callback:
        progress_callback(70, "Applying stereo delay...")

    # Delay left channel for stereo effect
    left, right = effected[:, 0], effected[:, 1]
    shift = int(delay * sr_out / 1000)
    if shift > 0 and shift < len(left):
        left_shifted = np.concatenate((np.zeros(shift), left[:-shift]))
    else:
        left_shifted = left
    out = np.stack([left_shifted, right], axis=1)

    if progress_callback:
        progress_callback(80, "Saving output...")

    # Write output WAV
    out_file = os.path.join(output_path, output_name)
    sf.write(out_file, out, sr_out)

    if progress_callback:
        progress_callback(90, "Encoding to MP3...")

    # Re-encode to MP3
    out_file_mp3 = os.path.join(output_path, remove_extension(output_name) + ".mp3")
    cmd = f'ffmpeg -y -i "{out_file}" -codec:a libmp3lame -b:a 320k "{out_file_mp3}"'
    sp.call(cmd, shell=True, stdout=sp.DEVNULL, stderr=sp.DEVNULL)

    # Clean up temporary files
    for tmp in (TMP_IN, TMP_FX, out_file):
        try:
            os.remove(tmp)
        except Exception:
            pass

    if progress_callback:
        progress_callback(100, "Complete!")

    return out_file_mp3


def apply_reverb(
    audio: np.ndarray,
    sr: int,
    room_size: float,
    damping: float,
    wet: float,
    dry: float
) -> np.ndarray:
    """Apply reverb to audio data."""
    board = Pedalboard([Reverb(room_size, damping, wet, dry)])
    return board(audio, sr)


def apply_slow(audio: np.ndarray, sr: int, slow_factor: float) -> Tuple[np.ndarray, int]:
    """Apply slow effect by reducing sample rate."""
    new_sr = sr - trunc(sr * slow_factor)
    return audio, new_sr


def apply_stereo_delay(audio: np.ndarray, sr: int, delay_seconds: float) -> np.ndarray:
    """Apply stereo delay effect."""
    if audio.ndim == 1:
        audio = np.stack([audio, audio], axis=1)

    left, right = audio[:, 0], audio[:, 1]
    shift = int(delay_seconds * sr / 1000)

    if shift > 0 and shift < len(left):
        left_shifted = np.concatenate((np.zeros(shift), left[:-shift]))
    else:
        left_shifted = left

    return np.stack([left_shifted, right], axis=1)
