from pathlib import Path
from typing import List, Dict, Any

class Settings:
    BASE_DIR = Path(__file__).parent.parent
    EFFECTS_DIR = BASE_DIR / "effects"
    OUTPUT_DIR = BASE_DIR / "output"
    TEMP_DIR = BASE_DIR / "temp"

    # ML Server
    ML_SERVER_URL = "https://lofiserver.jacobzhang.de"

    # Default Lofi Settings
    DEFAULTS = {
        "slow_factor": 0.08,
        "room_size": 0.75,
        "damping": 0.5,
        "wet_level": 0.08,
        "dry_level": 0.2,
        "stereo_delay": 2.0,
    }

    # Available Effects (24 total) - file names match actual files in effects/
    EFFECTS: List[Dict[str, Any]] = [
        # Weather
        {"id": "rain", "name": "Rain", "file": "rain.wav", "category": "weather"},
        {"id": "soft-rain", "name": "Soft Rain", "file": "soft-rain.wav", "category": "weather"},
        {"id": "heavy-rain", "name": "Heavy Rain", "file": "heavy-rain.wav", "category": "weather"},
        {"id": "thunder", "name": "Thunder", "file": "thunder.wav", "category": "weather"},
        {"id": "distant-thunder", "name": "Distant Thunder", "file": "distant-thunder.wav", "category": "weather"},

        # Nature
        {"id": "ocean", "name": "Ocean Waves", "file": "ocean-waves.wav", "category": "nature"},
        {"id": "beach", "name": "Beach Waves", "file": "beach-waves.wav", "category": "nature"},
        {"id": "waterfall", "name": "Waterfall", "file": "waterfall.wav", "category": "nature"},
        {"id": "forest-night", "name": "Forest Night", "file": "forest-night.wav", "category": "nature"},
        {"id": "birds", "name": "Birds", "file": "birds.wav", "category": "nature"},
        {"id": "wind", "name": "Wind", "file": "small-wind.wav", "category": "nature"},

        # Ambient
        {"id": "cafe", "name": "Cafe", "file": "cafe-ambience.wav", "category": "ambient"},
        {"id": "fire", "name": "Fire", "file": "fire.wav", "category": "ambient"},
        {"id": "fire-light", "name": "Fire Light", "file": "fire-light.wav", "category": "ambient"},
        {"id": "humming", "name": "Humming", "file": "humming.wav", "category": "ambient"},

        # Vintage
        {"id": "vinyl-crackle", "name": "Vinyl Crackle", "file": "vinyl-crackle.wav", "category": "vintage"},
        {"id": "tape-hiss", "name": "Tape Hiss", "file": "tape-hiss.wav", "category": "vintage"},

        # Urban
        {"id": "traffic", "name": "Traffic", "file": "traffic.wav", "category": "urban"},
        {"id": "engine-hum", "name": "Engine Hum", "file": "low-engine-hum.wav", "category": "urban"},
        {"id": "white-noise", "name": "White Noise", "file": "white-noise.wav", "category": "urban"},

        # Keyboard
        {"id": "keyboard-mech", "name": "Mechanical Keyboard", "file": "mechanical-keyboard-typing.wav", "category": "keyboard"},
        {"id": "keyboard-computer", "name": "Computer Keyboard", "file": "computer-keyboard.wav", "category": "keyboard"},
        {"id": "keyboard-iphone", "name": "iPhone Keyboard", "file": "iphone-keyboard-typing.wav", "category": "keyboard"},

        # Other
        {"id": "howling", "name": "Howling Wind", "file": "howl-in-the-night.wav", "category": "other"},
    ]

    @classmethod
    def get_effect_by_id(cls, effect_id: str) -> Dict[str, Any] | None:
        for effect in cls.EFFECTS:
            if effect["id"] == effect_id:
                return effect
        return None

    @classmethod
    def get_effects_by_category(cls, category: str) -> List[Dict[str, Any]]:
        return [e for e in cls.EFFECTS if e["category"] == category]


settings = Settings()
