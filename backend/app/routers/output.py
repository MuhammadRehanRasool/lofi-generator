"""
Output Router - Manage generated audio files.
"""
from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse, StreamingResponse
from pathlib import Path
from datetime import datetime
import os
import mimetypes

from app.config import settings
from app.models.schemas import OutputFile

router = APIRouter()


@router.get("/list")
async def list_files():
    """List all output files."""
    files = []

    if not settings.OUTPUT_DIR.exists():
        return {"files": []}

    for file_path in settings.OUTPUT_DIR.iterdir():
        if file_path.is_file() and file_path.suffix.lower() in ('.mp3', '.wav', '.flac'):
            try:
                stat = file_path.stat()

                # Determine source from filename
                source = "youtube" if "lofi-" in file_path.stem else "random"
                if "random" in file_path.stem.lower():
                    source = "random"

                # Get audio duration (simplified - actual implementation would use mutagen or similar)
                duration = 0.0
                try:
                    import soundfile as sf
                    info = sf.info(str(file_path))
                    duration = info.duration
                except:
                    # Estimate based on file size (rough approximation for 320kbps MP3)
                    duration = stat.st_size / (320 * 1024 / 8)

                files.append(OutputFile(
                    filename=file_path.name,
                    source=source,
                    duration=duration,
                    created_at=datetime.fromtimestamp(stat.st_ctime).isoformat(),
                    size=stat.st_size,
                ))
            except Exception as e:
                print(f"Error reading file {file_path}: {e}")
                continue

    # Sort by creation time, newest first
    files.sort(key=lambda f: f.created_at, reverse=True)

    return {"files": [f.model_dump() for f in files]}


@router.get("/stream/{filename}")
async def stream_file(filename: str):
    """Stream an audio file for preview playback."""
    file_path = settings.OUTPUT_DIR / filename

    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")

    # Security check - prevent directory traversal
    try:
        file_path = file_path.resolve()
        if not str(file_path).startswith(str(settings.OUTPUT_DIR.resolve())):
            raise HTTPException(status_code=403, detail="Access denied")
    except:
        raise HTTPException(status_code=403, detail="Invalid path")

    mime_type, _ = mimetypes.guess_type(str(file_path))
    if not mime_type:
        mime_type = "audio/mpeg"

    return FileResponse(
        file_path,
        media_type=mime_type,
        filename=filename,
    )


@router.get("/download/{filename}")
async def download_file(filename: str):
    """Download an audio file."""
    file_path = settings.OUTPUT_DIR / filename

    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")

    # Security check
    try:
        file_path = file_path.resolve()
        if not str(file_path).startswith(str(settings.OUTPUT_DIR.resolve())):
            raise HTTPException(status_code=403, detail="Access denied")
    except:
        raise HTTPException(status_code=403, detail="Invalid path")

    return FileResponse(
        file_path,
        media_type="application/octet-stream",
        filename=filename,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )


@router.delete("/{filename}")
async def delete_file(filename: str):
    """Delete an output file."""
    file_path = settings.OUTPUT_DIR / filename

    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")

    # Security check
    try:
        file_path = file_path.resolve()
        if not str(file_path).startswith(str(settings.OUTPUT_DIR.resolve())):
            raise HTTPException(status_code=403, detail="Access denied")
    except:
        raise HTTPException(status_code=403, detail="Invalid path")

    try:
        file_path.unlink()
        return {"message": "File deleted successfully", "filename": filename}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete file: {str(e)}")
