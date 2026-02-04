"""
YouTube Router - Download and convert YouTube videos to lofi.
"""
from fastapi import APIRouter, HTTPException, WebSocket, WebSocketDisconnect
from typing import Dict
import asyncio
import uuid
from datetime import datetime

from app.config import settings
from app.models.schemas import VideoInfo, PlaylistInfo, YouTubeConvertRequest, JobProgress
from app.services.youtube_downloader import fetch_info, download_audio
from app.services.lofi_maker import process_audio

router = APIRouter()

# Store for job progress
jobs: Dict[str, JobProgress] = {}


@router.post("/info")
async def get_info(data: dict):
    """
    Fetch information about a YouTube video or playlist.
    """
    url = data.get("url")
    if not url:
        raise HTTPException(status_code=400, detail="URL is required")

    try:
        info = fetch_info(url)
        if isinstance(info, PlaylistInfo):
            return {"type": "playlist", "data": info.model_dump()}
        else:
            return {"type": "video", "data": info.model_dump()}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to fetch info: {str(e)}")


@router.post("/convert")
async def convert(request: YouTubeConvertRequest):
    """
    Start converting YouTube video(s) to lofi.
    Returns a job ID for tracking progress via WebSocket.
    """
    job_id = str(uuid.uuid4())

    # Initialize job progress
    jobs[job_id] = JobProgress(
        job_id=job_id,
        status="starting",
        progress=0,
        current_file=None,
        error=None,
    )

    # Start conversion in background
    asyncio.create_task(run_conversion(job_id, request))

    return {"jobId": job_id}


async def run_conversion(job_id: str, request: YouTubeConvertRequest):
    """Background task for running the conversion."""
    try:
        # Update status
        jobs[job_id].status = "downloading"
        jobs[job_id].progress = 10

        # Fetch video info first
        info = fetch_info(request.url)

        if isinstance(info, PlaylistInfo):
            videos = info.videos
            if request.video_ids:
                videos = [v for v in videos if v.id in request.video_ids]
        else:
            videos = [info]

        total = len(videos)

        for i, video in enumerate(videos):
            try:
                jobs[job_id].current_file = video.title
                jobs[job_id].progress = 10 + (i / total) * 40  # 10-50% for downloading

                # Download audio
                video_url = f"https://www.youtube.com/watch?v={video.id}"
                temp_path = settings.TEMP_DIR / f"{video.id}.mp3"

                download_audio(video_url, settings.TEMP_DIR, filename=video.id)

                # Update progress for processing
                jobs[job_id].status = "processing"
                jobs[job_id].progress = 50 + (i / total) * 40  # 50-90% for processing

                # Apply lofi effects
                timestamp = datetime.now().strftime("%Y%m%d-%H%M%S")
                output_name = f"lofi-{video.id[:8]}-{timestamp}"

                def progress_cb(progress, status):
                    jobs[job_id].progress = 50 + (i / total) * 40 + (progress / 100) * (40 / total)
                    jobs[job_id].status = status

                process_audio(
                    input_path=str(temp_path),
                    output_path=str(settings.OUTPUT_DIR / output_name),
                    options=request.options,
                    progress_callback=progress_cb,
                )

                # Cleanup temp file
                try:
                    temp_path.unlink()
                except:
                    pass

            except Exception as e:
                print(f"Error processing {video.title}: {e}")
                continue

        jobs[job_id].status = "complete"
        jobs[job_id].progress = 100
        jobs[job_id].current_file = None

    except Exception as e:
        jobs[job_id].status = "error"
        jobs[job_id].error = str(e)


@router.websocket("/progress/{job_id}")
async def websocket_progress(websocket: WebSocket, job_id: str):
    """WebSocket endpoint for real-time progress updates."""
    await websocket.accept()

    try:
        while True:
            if job_id not in jobs:
                await websocket.send_json({"error": "Job not found"})
                break

            job = jobs[job_id]
            await websocket.send_json(job.model_dump())

            if job.status in ("complete", "error"):
                break

            await asyncio.sleep(0.5)  # Update every 500ms

    except WebSocketDisconnect:
        pass
    finally:
        # Cleanup old job after a delay
        await asyncio.sleep(60)
        if job_id in jobs:
            del jobs[job_id]
