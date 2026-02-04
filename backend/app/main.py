from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pathlib import Path

from app.config import settings
from app.routers import random, youtube, output, video

# Create required directories
settings.OUTPUT_DIR.mkdir(exist_ok=True)
settings.TEMP_DIR.mkdir(exist_ok=True)

app = FastAPI(
    title="Lofi Generator API",
    description="Backend API for the Unified Lofi Generator",
    version="1.0.0",
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files for effects and output
if settings.EFFECTS_DIR.exists():
    app.mount("/effects", StaticFiles(directory=settings.EFFECTS_DIR), name="effects")
if settings.OUTPUT_DIR.exists():
    app.mount("/output", StaticFiles(directory=settings.OUTPUT_DIR), name="output")

# Include routers
app.include_router(random.router, prefix="/api/random", tags=["random"])
app.include_router(youtube.router, prefix="/api/youtube", tags=["youtube"])
app.include_router(output.router, prefix="/api/output", tags=["output"])
app.include_router(video.router, prefix="/api/video", tags=["video"])


@app.get("/")
async def root():
    return {"message": "Lofi Generator API", "version": "1.0.0"}


@app.get("/api/health")
async def health():
    return {"status": "healthy"}


@app.get("/api/effects")
async def list_effects():
    """List all available sound effects."""
    return {"effects": settings.EFFECTS}
