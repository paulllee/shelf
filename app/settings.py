import tomllib
from dataclasses import dataclass
from pathlib import Path
from typing import Literal

ViewName = Literal["media", "workouts", "habits", "tasks"]

ALL_VIEWS: tuple[ViewName, ...] = ("media", "workouts", "habits", "tasks")

VIEW_DIRECTORY_KEYS: dict[ViewName, tuple[str, ...]] = {
    "media": ("media_dir",),
    "workouts": ("workout_dir", "template_dir"),
    "habits": ("habits_dir", "activities_dir", "presets_dir"),
    "tasks": ("tasks_dir",),
}


@dataclass(frozen=True)
class Settings:
    enabled_views: tuple[ViewName, ...]
    directories: dict[str, Path]


def load_settings(config_path: Path) -> Settings:
    with config_path.open("rb") as config_file:
        config = tomllib.load(config_file)

    views = config.get("views", {})
    if not isinstance(views, dict):
        raise ValueError("views must be a TOML table")

    unknown_views = set(views) - set(ALL_VIEWS)
    if unknown_views:
        names = ", ".join(sorted(unknown_views))
        raise ValueError(f"unknown views: {names}")

    enabled: list[ViewName] = []
    for view in ALL_VIEWS:
        value = views.get(view, True)
        if not isinstance(value, bool):
            raise ValueError(f"views.{view} must be a boolean")
        if value:
            enabled.append(view)

    if not enabled:
        raise ValueError("at least one view must be enabled")

    directory_keys = {
        key for view in enabled for key in VIEW_DIRECTORY_KEYS[view]
    }
    directories: dict[str, Path] = {}
    for key in directory_keys:
        value = config.get(key)
        if not isinstance(value, str) or not value:
            raise ValueError(f"{key} must be a non-empty path string")
        directories[key] = Path(value)

    return Settings(tuple(enabled), directories)
