import os
import tempfile
import threading
import tkinter as tk
from tkinter import BooleanVar, DoubleVar, IntVar, messagebox
from tkinter import ttk
import yt_dlp
import subprocess
import wave
import pyaudio
from effects.config import FX_LISTS

# from lofi_maker import slowedreverb
from lofi_maker import slowedreverb_with_fx


# DOWNLOAD PLAYLIST (as .wav)
def download_playlist(playlist_url: str, out_dir: str) -> list[str]:
    """Download all audio from a YouTube playlist/album in WAV format."""
    ydl_opts = {
        "format": "bestaudio/best",
        "outtmpl": os.path.join(out_dir, "%(playlist_index)03d_%(title)s.%(ext)s"),
        "ignoreerrors": True,
        "quiet": True,
        "no_warnings": True,
        "postprocessors": [
            {
                "key": "FFmpegExtractAudio",
                "preferredcodec": "wav",
                "preferredquality": "0",
            }
        ],
    }
    paths = []
    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        info = ydl.extract_info(playlist_url, download=True)
        for entry in info.get("entries", []):
            # prepare_filename now yields .wav
            try:
                fn = os.path.splitext(ydl.prepare_filename(entry))[0] + ".wav"
                if os.path.exists(fn):
                    paths.append(fn)
            except Exception as e:
                continue
    return sorted(paths)


# Remove the file extension from a filename
def remove_extension(filename: str) -> str:
    """Remove the file extension from a filename."""
    return os.path.splitext(filename)[0]


class LofiApp(tk.Tk):
    # Pre-fill with several effects
    FX_LIST = FX_LISTS

    def __init__(self):
        super().__init__()
        self.title("Lofi Playlist Maker")
        self.geometry("500x450")

        # playback control
        self.audio_thread = None
        self.stop_playback = threading.Event()

        # Notebook with two tabs
        self.notebook = ttk.Notebook(self)
        self.main_tab = tk.Frame(self)
        self.fx_tab = tk.Frame(self)
        self.notebook.add(self.main_tab, text="Main")
        self.notebook.add(self.fx_tab, text="Sound Effects")
        self.notebook.pack(expand=True, fill="both", padx=10, pady=10)

        # --- Main Tab Widgets ---
        credit_frame = tk.Frame(self.main_tab)
        credit_frame.pack(anchor="ne", pady=(2, 0), padx=5)
        tk.Label(credit_frame, text="Dev: ", font=("Arial", 9)).pack(side="left")
        credit_link = tk.Label(
            credit_frame,
            text="Rehan Sathio",
            font=("Arial", 9, "underline"),
            fg="blue",
            cursor="hand2",
        )
        credit_link.pack(side="left")
        credit_link.bind(
            "<Button-1>", lambda e: os.system("start https://rehansathio.dev")
        )

        tk.Label(self.main_tab, text="YouTube Playlist/Album URL:").pack(pady=5)
        self.url_entry = tk.Entry(self.main_tab, width=60)
        self.url_entry.pack()

        self.go_btn = tk.Button(self.main_tab, text="Run", command=self.run_process)
        self.go_btn.pack(pady=10)

        self.progress = tk.Label(self.main_tab, text="")
        self.progress.pack()

        self.adv_btn = tk.Button(
            self.main_tab, text="Advanced Options ▼", command=self.toggle_advanced
        )
        self.adv_btn.pack(pady=5)

        self.advanced_frame = tk.Frame(self.main_tab)
        tk.Label(self.advanced_frame, text="Slow factor (0.0–0.5):").grid(
            row=0, column=0, sticky="e"
        )
        self.slow_var = DoubleVar(value=0.08)
        tk.Entry(self.advanced_frame, textvariable=self.slow_var, width=8).grid(
            row=0, column=1
        )

        tk.Label(self.advanced_frame, text="Reverb room size (0.0–1.0):").grid(
            row=1, column=0, sticky="e"
        )
        self.room_var = DoubleVar(value=0.75)
        tk.Entry(self.advanced_frame, textvariable=self.room_var, width=8).grid(
            row=1, column=1
        )

        tk.Label(self.advanced_frame, text="Reverb damping (0.0–1.0):").grid(
            row=2, column=0, sticky="e"
        )
        self.damp_var = DoubleVar(value=0.5)
        tk.Entry(self.advanced_frame, textvariable=self.damp_var, width=8).grid(
            row=2, column=1
        )

        tk.Label(self.advanced_frame, text="Wet level (0.0–1.0):").grid(
            row=3, column=0, sticky="e"
        )
        self.wet_var = DoubleVar(value=0.08)
        tk.Entry(self.advanced_frame, textvariable=self.wet_var, width=8).grid(
            row=3, column=1
        )

        tk.Label(self.advanced_frame, text="Dry level (0.0–1.0):").grid(
            row=4, column=0, sticky="e"
        )
        self.dry_var = DoubleVar(value=0.2)
        tk.Entry(self.advanced_frame, textvariable=self.dry_var, width=8).grid(
            row=4, column=1
        )

        tk.Label(self.advanced_frame, text="Reverb delay (s):").grid(
            row=5, column=0, sticky="e"
        )
        self.delay_var = DoubleVar(value=2.0)
        tk.Entry(self.advanced_frame, textvariable=self.delay_var, width=8).grid(
            row=5, column=1
        )
        self.advanced_frame.pack_forget()
        # --- FX Tab Widgets ---
        fx_canvas = tk.Canvas(self.fx_tab)
        fx_scrollbar = ttk.Scrollbar(
            self.fx_tab, orient="vertical", command=fx_canvas.yview
        )
        fx_scrollable_frame = tk.Frame(fx_canvas)

        fx_scrollable_frame.bind(
            "<Configure>",
            lambda e: fx_canvas.configure(scrollregion=fx_canvas.bbox("all")),
        )

        fx_canvas.create_window((0, 0), window=fx_scrollable_frame, anchor="nw")
        fx_canvas.configure(yscrollcommand=fx_scrollbar.set)

        fx_canvas.pack(side="left", fill="both", expand=True)
        fx_scrollbar.pack(side="right", fill="y")

        self.fx_vars = []
        for idx, fx in enumerate(self.FX_LIST):
            tk.Label(fx_scrollable_frame, text=fx["name"]).grid(
                row=idx, column=0, sticky="w", padx=10, pady=5
            )
            vol_var = DoubleVar(value=0.5)
            self.fx_vars.append(vol_var)
            entry = tk.Entry(
                fx_scrollable_frame, textvariable=vol_var, width=6, justify="center"
            )
            entry.grid(row=idx, column=1, padx=10)
            vol_var.set(0.0)
            play_btn = tk.Button(
                fx_scrollable_frame,
                text="▶",
                command=lambda p=fx["path"], v=vol_var: self.play_effect(p, v),
            )
            play_btn.grid(row=idx, column=2, padx=5)
            stop_btn = tk.Button(
                fx_scrollable_frame, text="■", command=self.stop_effect
            )
            stop_btn.grid(row=idx, column=3, padx=5)

    def toggle_advanced(self):
        if self.advanced_frame.winfo_ismapped():
            self.advanced_frame.pack_forget()
            self.adv_btn.config(text="Advanced Options ▼")
        else:
            self.advanced_frame.pack(pady=5)
            self.adv_btn.config(text="Advanced Options ▲")

    def play_effect(self, path, volume_var):
        # stop existing
        self.stop_effect()
        # prepare file
        play_path = path
        if not path.lower().endswith(".wav"):
            tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".wav")
            tmp.close()
            subprocess.run(
                ["ffmpeg", "-y", "-i", path, tmp.name],
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
            )
            play_path = tmp.name
        # start playback thread
        self.stop_playback.clear()
        self.audio_thread = threading.Thread(
            target=self._audio_stream, args=(play_path, volume_var.get()), daemon=True
        )
        self.audio_thread.start()
        # remember tmp
        self.current_tmp = play_path if play_path != path else None

    def _audio_stream(self, filepath, volume):
        try:
            wf = wave.open(filepath, "rb")
            pa = pyaudio.PyAudio()
            stream = pa.open(
                format=pa.get_format_from_width(wf.getsampwidth()),
                channels=wf.getnchannels(),
                rate=wf.getframerate(),
                output=True,
            )
            stream.start_stream()
            chunk = 1024
            data = wf.readframes(chunk)
            while data and not self.stop_playback.is_set():
                # optionally adjust volume manually here
                stream.write(data)
                data = wf.readframes(chunk)
            stream.stop_stream()
            stream.close()
            pa.terminate()
            wf.close()
        except Exception as e:
            messagebox.showerror("Playback Error", str(e))

    def stop_effect(self):
        # signal stop
        self.stop_playback.set()
        # cleanup temp file
        if hasattr(self, "current_tmp") and self.current_tmp:
            try:
                os.remove(self.current_tmp)
            except:
                pass
            self.current_tmp = None

    def run_process(self):
        url = self.url_entry.get().strip()
        if not url:
            messagebox.showwarning(
                "Missing URL", "Please paste a playlist or album URL."
            )
            return
        self.go_btn.config(state="disabled")
        threading.Thread(target=self._worker, args=(url,), daemon=True).start()

    def _worker(self, url):
        self.progress.config(text="[Task# 1/3] Downloading playlist…")
        tmpdir = tempfile.mkdtemp()
        files = download_playlist(url, tmpdir)

        out_folder = os.path.join(os.getcwd(), "output")
        os.makedirs(out_folder, exist_ok=True)
        fx_specs = [
            (fx["path"], var.get())
            for fx, var in zip(self.FX_LIST, self.fx_vars)
            if var.get() > 0
        ]

        for idx, filepath in enumerate(files, start=1):
            name = os.path.basename(filepath)
            self.progress.config(
                text=f"[Task# 2/3] Converting to LoFi: {idx}/{len(files)}"
            )
            params = {
                "room_size": self.room_var.get(),
                "damping": self.damp_var.get(),
                "wet_level": self.wet_var.get(),
                "dry_level": self.dry_var.get(),
                "delay": self.delay_var.get(),
                "slowfactor": self.slow_var.get(),
                "fx_specs": fx_specs,
            }
            slowedreverb_with_fx(
                filepath, f"LoFi {remove_extension(name)}.wav", out_folder, **params
            )

        self.progress.config(text="[Task# 3/3] All tracks done! Opening output folder…")
        self.go_btn.config(state="normal")
        os.startfile(out_folder)


if __name__ == "__main__":
    app = LofiApp()
    app.mainloop()

# fx_list = [
#     # ("test/drum.mp3", 0.3),
#     ("test/rain.wav", 0.5),
# ]

# slowedreverb_with_fx(
#     "test/song.mp3",
#     f"LoFi_song.wav",
#     room_size=0.8,
#     damping=0.5,
#     wet_level=0.1,
#     dry_level=0.2,
#     delay_ms=20,
#     slowfactor=0.05,
#     fx_specs=fx_list,
# )


# test = download_playlist(
#     "https://music.youtube.com/playlist?list=OLAK5uy_n4a8CvxuwoI_R26GU55wXiaN6dmgexkH4",
#     "downloads",
# )
# print(test)

# files = [
#     "001_Hale Dil.wav",
#     "002_Aa Zara.wav",
#     "003_Aye Khuda.wav",
#     "004_Phir Mohabbat.wav",
#     "005_Tujhko Bhulaana.wav",
#     "006_Aa Zara (Reloaded).wav",
#     "007_Hale Dil (Acoustic).wav",
#     "008_Aye Khuda - Remix.wav",
# ]


# for one in files:
#     slowedreverb("downloads/" + one, f"LoFi {remove_extension(one)}.wav", "output")

# merged = merge_tracks(["downloads/" + one for one in files])

# final = apply_lofi_effects(merged)

# export_mp3(final, "lofi_output.mp3")
