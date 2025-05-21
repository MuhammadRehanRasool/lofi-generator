import os
import tempfile
import threading
import tkinter as tk
from tkinter import BooleanVar, DoubleVar, IntVar, messagebox
import yt_dlp
from lofi_maker import slowedreverb


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
            fn = os.path.splitext(ydl.prepare_filename(entry))[0] + ".wav"
            if os.path.exists(fn):
                paths.append(fn)
    return sorted(paths)


# Remove the file extension from a filename
def remove_extension(filename: str) -> str:
    """Remove the file extension from a filename."""
    return os.path.splitext(filename)[0]


# GUI & Controller
# class LofiApp(tk.Tk):
#     def __init__(self):
#         super().__init__()
#         self.title("Lofi Playlist Maker")
#         self.geometry("400x150")
#         tk.Label(self, text="YouTube Playlist/Album URL:").pack(pady=5)
#         self.url_entry = tk.Entry(self, width=50)
#         self.url_entry.pack()
#         self.go_btn = tk.Button(self, text="Run", command=self.run_process)
#         self.go_btn.pack(pady=10)
#         self.progress = tk.Label(self, text="")
#         self.progress.pack()

#     def run_process(self):
#         url = self.url_entry.get().strip()
#         if not url:
#             messagebox.showwarning(
#                 "Missing URL", "Please paste a playlist or album URL."
#             )
#             return
#         self.go_btn.config(state="disabled")
#         threading.Thread(target=self._worker, args=(url,), daemon=True).start()

#     def _worker(self, url):
#         self.progress.config(text="Downloading...")
#         tmpdir = tempfile.mkdtemp()
#         files = download_playlist(url, tmpdir)
#         self.progress.config(text="Converting to LoFi...")
#         params = {
#             "room_size": 0.75,
#             "damping": 0.5,
#             "wet_level": 0.08,
#             "dry_level": 0.2,
#             "delay": 2,
#             "slowfactor": 0.08,
#         }
#         for one in files:
#             slowedreverb(
#                 "downloads/" + one,
#                 f"LoFi {remove_extension(one)}.wav",
#                 "output",
#                 **params,
#             )
#         self.progress.config(text="Done!")
#         self.go_btn.config(state="normal")
#         os.startfile(out_file)  # Open "output" folder


class LofiApp(tk.Tk):
    def __init__(self):
        super().__init__()
        self.title("Lofi Playlist Maker")
        self.geometry("450x400")

        # Tag and credit
        credit_frame = tk.Frame(self)
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

        # URL entry
        tk.Label(self, text="YouTube Playlist/Album URL:").pack(pady=5)
        self.url_entry = tk.Entry(self, width=60)
        self.url_entry.pack()

        # Run button
        self.go_btn = tk.Button(self, text="Run", command=self.run_process)
        self.go_btn.pack(pady=10)

        # Progress label
        self.progress = tk.Label(self, text="")
        self.progress.pack()

        # Advanced Options toggle
        self.adv_btn = tk.Button(
            self, text="Advanced Options ▼", command=self.toggle_advanced
        )
        self.adv_btn.pack(pady=5)

        # Advanced options frame (hidden by default)
        self.advanced_frame = tk.Frame(self)
        # Slowing & pitch (if used elsewhere)
        tk.Label(self.advanced_frame, text="Slow factor (0.0–0.5):").grid(
            row=0, column=0, sticky="e"
        )
        self.slow_var = DoubleVar(value=0.08)
        tk.Entry(self.advanced_frame, textvariable=self.slow_var, width=8).grid(
            row=0, column=1
        )
        # Reverb room size
        tk.Label(self.advanced_frame, text="Reverb room size (0.0–1.0):").grid(
            row=1, column=0, sticky="e"
        )
        self.room_var = DoubleVar(value=0.75)
        tk.Entry(self.advanced_frame, textvariable=self.room_var, width=8).grid(
            row=1, column=1
        )
        # Reverb damping
        tk.Label(self.advanced_frame, text="Reverb damping (0.0–1.0):").grid(
            row=2, column=0, sticky="e"
        )
        self.damp_var = DoubleVar(value=0.5)
        tk.Entry(self.advanced_frame, textvariable=self.damp_var, width=8).grid(
            row=2, column=1
        )
        # Wet level
        tk.Label(self.advanced_frame, text="Wet level (0.0–1.0):").grid(
            row=3, column=0, sticky="e"
        )
        self.wet_var = DoubleVar(value=0.08)
        tk.Entry(self.advanced_frame, textvariable=self.wet_var, width=8).grid(
            row=3, column=1
        )
        # Dry level
        tk.Label(self.advanced_frame, text="Dry level (0.0–1.0):").grid(
            row=4, column=0, sticky="e"
        )
        self.dry_var = DoubleVar(value=0.2)
        tk.Entry(self.advanced_frame, textvariable=self.dry_var, width=8).grid(
            row=4, column=1
        )
        # Delay
        tk.Label(self.advanced_frame, text="Reverb delay (s):").grid(
            row=5, column=0, sticky="e"
        )
        self.delay_var = DoubleVar(value=2.0)
        tk.Entry(self.advanced_frame, textvariable=self.delay_var, width=8).grid(
            row=5, column=1
        )

        # Show/hide advanced by default hidden
        self.advanced_frame.pack_forget()

    def toggle_advanced(self):
        if self.advanced_frame.winfo_ismapped():
            self.advanced_frame.pack_forget()
            self.adv_btn.config(text="Advanced Options ▼")
        else:
            self.advanced_frame.pack(pady=5)
            self.adv_btn.config(text="Advanced Options ▲")

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
        # Step 1: Download
        self.progress.config(text="[Task# 1/3] Downloading playlist…")
        tmpdir = tempfile.mkdtemp()
        files = download_playlist(url, tmpdir)

        # Prepare output folder
        out_folder = os.path.join(os.getcwd(), "output")
        os.makedirs(out_folder, exist_ok=True)

        # Step 2: Convert each track
        total = len(files)
        for idx, filepath in enumerate(files, start=1):
            name = os.path.basename(filepath)
            self.progress.config(text=f"[Task# 2/3] Converting to LoFi: {idx}/{total}")

            params = {
                "room_size": self.room_var.get(),
                "damping": self.damp_var.get(),
                "wet_level": self.wet_var.get(),
                "dry_level": self.dry_var.get(),
                "delay": self.delay_var.get(),
                "slowfactor": self.slow_var.get(),
            }
            slowedreverb(
                filepath,
                f"LoFi {remove_extension(name)}.wav",
                out_folder,
                **params,
            )

        # Step 3: Done
        self.progress.config(text="[Task# 3/3] All tracks done! Opening output folder…")
        self.go_btn.config(state="normal")
        os.startfile(out_folder)


if __name__ == "__main__":
    app = LofiApp()
    app.mainloop()


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
