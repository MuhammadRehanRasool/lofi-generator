"""
Random Generator Router - Proxy to ML server and render random lofi tracks.
"""
from fastapi import APIRouter, HTTPException
from datetime import datetime
import httpx
import json
import random
import math

from app.config import settings
from app.models.schemas import RenderRequest

router = APIRouter()

# Musical keys (1-12) and modes (1-7) for mock generation
KEYS = list(range(1, 13))  # 1-12
MODES = list(range(1, 8))  # 1-7: Ionian, Dorian, Phrygian, Lydian, Mixolydian, Aeolian, Locrian


def generate_mock_output_params(latent_values: list[float] | None = None):
    """
    Generate mock output parameters based on latent values.
    This is used as a fallback when the ML server is unavailable.
    """
    if latent_values is None:
        latent_values = [random.gauss(0, 1) for _ in range(100)]

    # Use latent values to deterministically generate parameters
    bpm_factor = sum(latent_values[:25]) / 25 if len(latent_values) >= 25 else 0
    bpm = int(70 + (bpm_factor + 2) * 10)
    bpm = max(60, min(100, bpm))

    key_index = int(abs(sum(latent_values[25:50]) * 1000)) % 12 + 1
    mode_index = int(abs(sum(latent_values[50:75]) * 1000)) % 7 + 1

    energy = (math.tanh(sum(latent_values[75:88]) / 13) + 1) / 2 if len(latent_values) >= 88 else 0.5
    valence = (math.tanh(sum(latent_values[88:100]) / 12) + 1) / 2 if len(latent_values) >= 100 else 0.5

    # Generate mock chords and melodies
    chords = [random.randint(0, 7) for _ in range(8)]
    melodies = [[random.randint(0, 12) for _ in range(16)] for _ in range(4)]

    return {
        "title": "",
        "key": key_index,
        "mode": mode_index,
        "bpm": bpm,
        "energy": round(energy, 3),
        "valence": round(valence, 3),
        "chords": chords,
        "melodies": melodies,
        "source": "mock"
    }


@router.get("/generate")
async def generate():
    """
    Generate random output parameters from ML server.
    """
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.get(f"{settings.ML_SERVER_URL}/generate")
            response.raise_for_status()
            # Server returns double-JSON: a JSON string containing JSON
            json_string = response.json()
            return json.loads(json_string)
    except Exception as e:
        print(f"ML server unavailable, using mock generation: {e}")
        return generate_mock_output_params()


@router.get("/decode")
async def decode(input: str):
    """
    Decode latent parameters to output parameters.
    Input should be a JSON array string of 100 float values, e.g. [1.5, -0.3, ...]
    """
    # Parse input - it should be a JSON array
    try:
        # Try parsing as JSON array first
        if input.startswith('['):
            latent_values = json.loads(input)
        else:
            # Fallback: try comma-separated
            latent_values = [float(x.strip()) for x in input.split(",")]
    except (ValueError, json.JSONDecodeError) as e:
        raise HTTPException(status_code=400, detail=f"Invalid input format: {e}")

    if len(latent_values) != 100:
        raise HTTPException(status_code=400, detail=f"Expected 100 values, got {len(latent_values)}")

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            # Send as JSON array (matching old client behavior)
            response = await client.get(
                f"{settings.ML_SERVER_URL}/decode",
                params={"input": json.dumps(latent_values)}
            )
            response.raise_for_status()
            # Server returns double-JSON: a JSON string containing JSON
            json_string = response.json()
            return json.loads(json_string)
    except Exception as e:
        print(f"ML server unavailable, using mock decode: {e}")
        return generate_mock_output_params(latent_values)


@router.post("/render")
async def render(request: RenderRequest):
    """
    Render output parameters to MP3 file.
    """
    try:
        filename = request.filename
        if not filename:
            timestamp = datetime.now().strftime("%Y%m%d-%H%M%S")
            filename = f"lofi-random-{timestamp}"

        if not filename.endswith(".mp3"):
            filename = f"{filename}.mp3"

        output_path = settings.OUTPUT_DIR / filename

        return {
            "filename": filename,
            "path": str(output_path),
            "message": "Render initiated - audio generation happens on frontend"
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Render error: {str(e)}")
