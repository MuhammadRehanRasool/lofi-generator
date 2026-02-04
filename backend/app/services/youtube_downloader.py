"""
YouTube Downloader Service - Download audio from YouTube videos and playlists.
"""
import os
from pathlib import Path
from typing import List, Optional, Union
import yt_dlp

from app.config import settings
from app.models.schemas import VideoInfo, PlaylistInfo


def fetch_info(url: str) -> Union[VideoInfo, PlaylistInfo]:
    """
    Fetch information about a YouTube video or playlist.

    Args:
        url: YouTube video or playlist URL

    Returns:
        VideoInfo for single videos, PlaylistInfo for playlists
    """
    ydl_opts = {
        'quiet': True,
        'no_warnings': True,
        'extract_flat': True,  # Don't download, just extract info
    }

    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        info = ydl.extract_info(url, download=False)

        # Check if it's a playlist
        if info.get('_type') == 'playlist' or 'entries' in info:
            videos = []
            for entry in info.get('entries', []):
                if entry:
                    videos.append(VideoInfo(
                        id=entry.get('id', ''),
                        title=entry.get('title', 'Unknown'),
                        duration=entry.get('duration', 0) or 0,
                        thumbnail=entry.get('thumbnail', '') or '',
                        channel=entry.get('uploader', entry.get('channel', 'Unknown')) or 'Unknown',
                    ))

            return PlaylistInfo(
                id=info.get('id', ''),
                title=info.get('title', 'Unknown Playlist'),
                videos=videos,
            )
        else:
            # Single video
            return VideoInfo(
                id=info.get('id', ''),
                title=info.get('title', 'Unknown'),
                duration=info.get('duration', 0) or 0,
                thumbnail=info.get('thumbnail', '') or '',
                channel=info.get('uploader', info.get('channel', 'Unknown')) or 'Unknown',
            )


def download_audio(
    url: str,
    output_dir: Path,
    filename: Optional[str] = None,
    progress_callback: Optional[callable] = None,
) -> str:
    """
    Download audio from a YouTube video.

    Args:
        url: YouTube video URL
        output_dir: Directory to save the audio file
        filename: Optional custom filename (without extension)
        progress_callback: Optional callback for progress updates

    Returns:
        Path to the downloaded audio file
    """
    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    # Set up progress hook
    def progress_hook(d):
        if progress_callback and d['status'] == 'downloading':
            total = d.get('total_bytes') or d.get('total_bytes_estimate', 0)
            downloaded = d.get('downloaded_bytes', 0)
            if total > 0:
                progress = (downloaded / total) * 100
                progress_callback(progress, f"Downloading: {d.get('filename', 'audio')}")

    output_template = str(output_dir / (filename or '%(title)s')) + '.%(ext)s'

    ydl_opts = {
        'format': 'bestaudio/best',
        'outtmpl': output_template,
        'postprocessors': [{
            'key': 'FFmpegExtractAudio',
            'preferredcodec': 'mp3',
            'preferredquality': '320',
        }],
        'quiet': True,
        'no_warnings': True,
        'progress_hooks': [progress_hook] if progress_callback else [],
    }

    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        info = ydl.extract_info(url, download=True)

        # Get the output filename
        if filename:
            output_path = output_dir / f"{filename}.mp3"
        else:
            # yt-dlp saves with the video title
            title = info.get('title', 'audio')
            # Clean the title for filename
            safe_title = "".join(c for c in title if c.isalnum() or c in (' ', '-', '_')).rstrip()
            output_path = output_dir / f"{safe_title}.mp3"

        return str(output_path)


def download_playlist(
    url: str,
    output_dir: Path,
    video_ids: Optional[List[str]] = None,
    progress_callback: Optional[callable] = None,
) -> List[str]:
    """
    Download audio from multiple videos in a playlist.

    Args:
        url: YouTube playlist URL
        output_dir: Directory to save the audio files
        video_ids: Optional list of specific video IDs to download (if None, downloads all)
        progress_callback: Optional callback for progress updates

    Returns:
        List of paths to downloaded audio files
    """
    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    downloaded_files = []

    # First, get playlist info
    info = fetch_info(url)

    if not isinstance(info, PlaylistInfo):
        # Single video, not a playlist
        result = download_audio(url, output_dir, progress_callback=progress_callback)
        return [result]

    # Filter videos if video_ids specified
    videos_to_download = info.videos
    if video_ids:
        videos_to_download = [v for v in info.videos if v.id in video_ids]

    total_videos = len(videos_to_download)

    for i, video in enumerate(videos_to_download):
        if progress_callback:
            progress_callback(
                (i / total_videos) * 100,
                f"Downloading {i + 1}/{total_videos}: {video.title}"
            )

        try:
            video_url = f"https://www.youtube.com/watch?v={video.id}"
            output_path = download_audio(video_url, output_dir)
            downloaded_files.append(output_path)
        except Exception as e:
            print(f"Error downloading {video.title}: {e}")
            continue

    if progress_callback:
        progress_callback(100, "Download complete!")

    return downloaded_files


def sanitize_filename(title: str) -> str:
    """Convert a video title to a safe filename."""
    # Remove or replace invalid characters
    invalid_chars = '<>:"/\\|?*'
    for char in invalid_chars:
        title = title.replace(char, '')

    # Limit length
    if len(title) > 200:
        title = title[:200]

    return title.strip()
