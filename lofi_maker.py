import subprocess as sp
import soundfile as sf
from pedalboard import Pedalboard, Reverb
from math import trunc
import numpy as np
import os


def slowedreverb(
    audio,
    output,
    output_path="output/",
    room_size=0.75,
    damping=0.5,
    wet_level=0.08,
    dry_level=0.2,
    delay=2,
    slowfactor=0.08,
):

    if not os.path.exists(output_path):
        os.makedirs(output_path)

    TMP_FILE = os.path.join(output_path, "tmp.wav")
    OUTPUT_FILE = os.path.join(output_path, output)

    filename = audio
    if ".wav" not in audio:
        print("Audio needs to be .wav! Converting...")
        sp.call(f'ffmpeg -i "{audio}" {TMP_FILE}', shell=True)
        audio = TMP_FILE

    audio, sample_rate = sf.read(audio)
    sample_rate -= trunc(sample_rate * slowfactor)

    # Add reverb
    board = Pedalboard(
        [
            Reverb(
                room_size=room_size,
                damping=damping,
                wet_level=wet_level,
                dry_level=dry_level,
            )
        ]
    )

    # Add surround sound effects
    effected = board(audio, sample_rate)
    channel1 = effected[:, 0]
    channel2 = effected[:, 1]
    shift_len = int(delay * 1000)
    shifted_channel1 = np.concatenate((np.zeros(shift_len), channel1[:-shift_len]))
    combined_signal = np.hstack(
        (shifted_channel1.reshape(-1, 1), channel2.reshape(-1, 1))
    )

    # write outfile
    sf.write(OUTPUT_FILE, combined_signal, sample_rate)
    print(f"Converted {filename}")

    try:
        if os.path.exists(TMP_FILE):
            os.remove(TMP_FILE)
    except Exception as e:
        print(f"Error removing temporary file: {e}")
