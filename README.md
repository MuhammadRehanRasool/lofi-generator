# Lofi Generator

Make lofi tracks two ways: generate random lofi beats in the browser, or turn an
existing song (e.g. from YouTube) into a slowed, reverbed lofi version with
ambient effects (rain, vinyl crackle, cafe, keyboard typing, ...).

The repo holds two versions:

- **v2 (current)**: `backend/` (FastAPI) + `frontend/` (React + Vite), one web app.
- **v1 (legacy)**: `client/` (random lofi web UI) and `project.py` / `lofi_maker.py`
  (song-to-lofi desktop script). Kept for reference; v2 replaces it.

## v2: web app

### Features

- **Random Generator**: random lofi tracks played in the browser with Tone.js,
  using the sample library in `frontend/public/samples`. Track seeds come from the
  public lofi ML server (`https://lofiserver.jacobzhang.de`, set in `backend/app/config.py`).
- **YouTube Converter**: download audio with yt-dlp and convert it to lofi
  (slow down, reverb, stereo delay, mix in effects from `backend/effects/`).
- **Finalize**: pick and order output tracks and render them into one music video
  with an audio visualizer (moviepy), with progress over a WebSocket.
- **Output Manager**: list, stream, download and delete generated files
  (stored in `backend/output/`).

### Requirements

- Python 3.10+
- Node.js 18+
- `ffmpeg` on your PATH (used for audio conversion and MP3 export)

### Setup

From the repo root:

```bash
python -m venv .venv
.venv\Scripts\activate          # Windows (macOS/Linux: source .venv/bin/activate)
pip install -r backend/requirements.txt

cd frontend
npm install
```

### Run

Windows: run `start.bat` (or `start.ps1`). It opens two windows:

- Backend: http://localhost:8000 (API docs at http://localhost:8000/docs)
- Frontend: http://localhost:5173

Manually:

```bash
# terminal 1
cd backend
uvicorn app.main:app --reload --port 8000

# terminal 2
cd frontend
npm run dev
```

### API overview

| Route | Purpose |
|-------|---------|
| `GET /api/effects` | List available ambient effects |
| `GET /api/random/generate`, `GET /api/random/decode`, `POST /api/random/render` | Random track generation and rendering |
| `POST /api/youtube/info`, `POST /api/youtube/convert` | YouTube lookup and song-to-lofi conversion |
| `POST /api/video/generate`, `POST /api/video/preview` | Video rendering |
| `GET /api/output/list`, `/stream/{f}`, `/download/{f}`, `DELETE /api/output/{f}` | Manage generated files |

## v1: legacy tools

- **Random lofi web UI**: `run_random_lofi_ui.bat` (installs and runs `client/` with webpack dev server).
- **Song to lofi**: `setup_song_to_lofi.bat` once (creates `env/` and installs
  `requirements.txt`), then `run_song_to_lofi.bat` to run `project.py`.
  Output goes to `output/`.

## Notes

- Generated audio/video (`output/`, `backend/output/`, `backend/temp/`) is not committed.
- `PLAN.md` is the design plan used to build v2.
