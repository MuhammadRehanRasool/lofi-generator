"""
Video Router - Generate visualizer videos from audio files.
"""
from fastapi import APIRouter, HTTPException, WebSocket, WebSocketDisconnect
from typing import Dict
import asyncio
import uuid
import base64
from io import BytesIO

from app.config import settings
from app.models.schemas import VideoGenerateRequest, VideoOptions, JobProgress

router = APIRouter()

# Store for video generation job progress
video_jobs: Dict[str, JobProgress] = {}


@router.post("/generate")
async def generate_video(request: VideoGenerateRequest):
    """
    Start video generation from audio files.
    Returns a job ID for tracking progress via WebSocket.
    """
    # Validate audio files exist
    for audio_file in request.audio_files:
        file_path = settings.OUTPUT_DIR / audio_file
        if not file_path.exists():
            raise HTTPException(
                status_code=404,
                detail=f"Audio file not found: {audio_file}"
            )

    job_id = str(uuid.uuid4())

    # Initialize job progress
    video_jobs[job_id] = JobProgress(
        job_id=job_id,
        status="starting",
        progress=0,
        current_file=None,
        error=None,
    )

    # Start video generation in background
    asyncio.create_task(run_video_generation(job_id, request))

    return {"jobId": job_id}


async def run_video_generation(job_id: str, request: VideoGenerateRequest):
    """Background task for video generation."""
    try:
        from app.services.video_generator import generate_video

        video_jobs[job_id].status = "analyzing"
        video_jobs[job_id].progress = 5

        # Combine audio files if multiple
        audio_paths = [settings.OUTPUT_DIR / f for f in request.audio_files]

        # Generate output name
        output_name = request.output_name
        if not output_name:
            from datetime import datetime
            timestamp = datetime.now().strftime("%Y%m%d-%H%M%S")
            output_name = f"lofi-video-{timestamp}"

        output_path = settings.OUTPUT_DIR / f"{output_name}.mp4"

        def progress_callback(progress: float, status: str):
            video_jobs[job_id].progress = progress
            video_jobs[job_id].status = status

        # Generate the video
        result_path = generate_video(
            audio_paths=[str(p) for p in audio_paths],
            output_path=str(output_path),
            options=request.options,
            progress_callback=progress_callback,
        )

        video_jobs[job_id].status = "complete"
        video_jobs[job_id].progress = 100
        video_jobs[job_id].current_file = result_path

    except Exception as e:
        video_jobs[job_id].status = "error"
        video_jobs[job_id].error = str(e)


@router.websocket("/progress/{job_id}")
async def websocket_video_progress(websocket: WebSocket, job_id: str):
    """WebSocket endpoint for real-time video generation progress."""
    await websocket.accept()

    try:
        while True:
            if job_id not in video_jobs:
                await websocket.send_json({"error": "Job not found"})
                break

            job = video_jobs[job_id]
            await websocket.send_json(job.model_dump())

            if job.status in ("complete", "error"):
                break

            await asyncio.sleep(0.5)

    except WebSocketDisconnect:
        pass
    finally:
        # Cleanup old job after a delay
        await asyncio.sleep(300)  # Keep for 5 minutes
        if job_id in video_jobs:
            del video_jobs[job_id]


@router.post("/preview")
async def generate_preview(options: VideoOptions):
    """
    Generate a single preview frame with the given video options.
    Returns a base64-encoded PNG image.
    """
    try:
        from app.services.video_generator import create_preview_frame

        # Generate preview frame
        frame = create_preview_frame(options)

        # Convert to base64 PNG
        from PIL import Image
        img = Image.fromarray(frame)
        buffer = BytesIO()
        img.save(buffer, format="PNG")
        buffer.seek(0)
        image_base64 = base64.b64encode(buffer.getvalue()).decode()

        return {"imageBase64": image_base64}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Preview generation failed: {str(e)}")
