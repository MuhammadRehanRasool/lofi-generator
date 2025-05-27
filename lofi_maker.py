import os
import subprocess as sp
from math import trunc
import numpy as np
import soundfile as sf
from pedalboard import Pedalboard, Reverb


# Remove the file extension from a filename
def remove_extension(filename: str) -> str:
    """Remove the file extension from a filename."""
    return os.path.splitext(filename)[0]


def load_and_prep(effect_path, target_len, tmp_path, vol=1.0):
    """Load an effect file, convert to WAV/stereo, loop/trim to target_len, and apply volume."""
    # Convert to WAV if needed
    if not effect_path.lower().endswith(".wav"):
        sp.call(f'ffmpeg -y -i "{effect_path}" "{tmp_path}"', shell=True)
        effect_path = tmp_path
    data, _ = sf.read(effect_path)
    # Convert mono to stereo
    if data.ndim == 1:
        data = np.stack([data, data], axis=1)
    # Loop or trim to match target length
    repeats = int(np.ceil(target_len / len(data)))
    data = np.tile(data, (repeats, 1))[:target_len]
    return data * vol


def slowedreverb_with_fx(
    audio_path,
    output_name,
    output_path="output/",
    room_size=0.75,
    damping=0.5,
    wet_level=0.08,
    dry_level=0.2,
    delay=2,
    slowfactor=0.08,
    fx_specs=None,  # List of (effect_path, volume)
):
    """Apply slowed reverb and optional FX to an audio file, then save the result."""
    os.makedirs(output_path, exist_ok=True)
    TMP_IN = os.path.join(output_path, "tmp_in.wav")
    TMP_FX = os.path.join(output_path, "tmp_fx.wav")

    # Convert input to WAV if needed
    if not audio_path.lower().endswith(".wav"):
        sp.call(f'ffmpeg -y -i "{audio_path}" "{TMP_IN}"', shell=True)
        audio_path = TMP_IN

    audio, sr = sf.read(audio_path)
    sr_out = sr - trunc(sr * slowfactor)
    length = len(audio)

    # Mix original audio with all FX
    mix = audio.copy()
    for fx_path, fx_vol in fx_specs or []:
        mix += load_and_prep(fx_path, length, TMP_FX, fx_vol)

    # Apply reverb
    board = Pedalboard([Reverb(room_size, damping, wet_level, dry_level)])
    effected = board(mix, sr_out)

    # Delay left channel for stereo effect
    left, right = effected[:, 0], effected[:, 1]
    shift = int(delay * sr_out / 1000)
    left_shifted = np.concatenate((np.zeros(shift), left[:-shift]))
    out = np.stack([left_shifted, right], axis=1)

    # Write output and clean up
    out_file = os.path.join(output_path, output_name)
    sf.write(out_file, out, sr_out)

    # Re-encode to compressed format
    out_file_mp3 = os.path.join(output_path, remove_extension(output_name) + ".mp3")
    cmd = (
        f'ffmpeg -y -i "{out_file}" ' f"-codec:a libmp3lame -b:a 320k " f'"{out_file_mp3}"'
    )
    sp.call(cmd, shell=True)

    for tmp in (TMP_IN, TMP_FX, out_file):
        try:
            os.remove(tmp)
        except Exception:
            pass

    print(f"Generated → {out_file}")
