import asyncio
import logging
import sys
import tomllib
from contextlib import asynccontextmanager
from datetime import date, time
from pathlib import Path
from typing import Any

import frontmatter
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from app.models import (
    Activity,
    Exercise,
    ExerciseGroup,
    Habit,
    Media,
    MediaCountry,
    MediaStatus,
    MediaType,
    Preset,
    Workout,
    WorkoutSet,
    WorkoutTemplate,
)
from app.routes import media as media_routes
from app.routes import workout as workout_routes
from app.routes import habits as habits_routes

logger: logging.Logger = logging.getLogger("uvicorn.error")


def get_dir_from_config(config_path: str, key: str) -> Path:
    try:
        with open(config_path, "rb") as f:
            config: dict[str, Any] = tomllib.load(f)

        dir_path: Any | None = config.get(key)

        if dir_path:
            logger.info("Loaded config %s=%s", key, dir_path)
            return Path(dir_path)
        else:
            logger.error("%s not found in config.toml", key)
            sys.exit(1)

    except FileNotFoundError:
        logger.error("Config file %s not found", config_path)
        sys.exit(1)
    except tomllib.TOMLDecodeError:
        logger.error("Config file %s is not valid toml", config_path)
        sys.exit(1)


def validate_dir(dir_path: Path) -> None:
    if not dir_path.exists():
        logger.error("Directory %s does not exist", dir_path)
        sys.exit(1)


# media parsing


def parse_md_to_media(md_path: Path) -> Media:
    try:
        with md_path.open("r", encoding="utf-8") as f:
            post: frontmatter.Post = frontmatter.load(f)
        return Media(
            name=str(post.get("name", "n/a")),
            country=MediaCountry.get(post.get("country", "undefined")),
            type=MediaType.get(post.get("type", "undefined")),
            status=MediaStatus.get(post.get("status", "queued")),
            rating=str(post.get("rating", "n/a")),
            review=post.content,
        )
    except Exception:
        logger.exception("Failed to parse %s", md_path)
        raise HTTPException(status_code=404, detail=f"failed to parse {md_path}")


def parse_all_media(media_dir: Path) -> list[Media]:
    return [parse_md_to_media(p) for p in media_dir.iterdir() if p.is_file()]


async def poll_media_items(app: FastAPI, interval_in_seconds: int) -> None:
    while True:
        logger.info("Refreshing media items")
        app.state.media_items = parse_all_media(app.state.media_dir)
        await asyncio.sleep(interval_in_seconds)


# workout parsing


def parse_md_to_workout(md_path: Path) -> Workout:
    try:
        with md_path.open("r", encoding="utf-8") as f:
            post: frontmatter.Post = frontmatter.load(f)

        date_val: Any = post.get("date")
        if isinstance(date_val, str):
            date_val = date.fromisoformat(date_val)

        time_val: Any = post.get("time")
        if isinstance(time_val, str):
            time_val = time.fromisoformat(time_val)

        groups_data: Any = post.get("groups", [])
        groups: list[ExerciseGroup] = []
        for g in groups_data:
            exercises = []
            for e in g.get("exercises", []):
                sets = []
                for s in e.get("sets", []):
                    sets.append(
                        WorkoutSet(reps=s.get("reps"), weight=s.get("weight"))
                    )
                exercises.append(Exercise(name=e.get("name", ""), sets=sets))
            groups.append(
                ExerciseGroup(
                    name=g.get("name", ""),
                    rest_seconds=g.get("rest_seconds", 0),
                    exercises=exercises,
                )
            )

        return Workout(
            date=date_val,
            time=time_val,
            groups=groups,
            content=post.content,
        )
    except Exception:
        logger.exception("Failed to parse %s", md_path)
        raise HTTPException(status_code=404, detail=f"failed to parse {md_path}")


def parse_all_workouts(workout_dir: Path) -> list[Workout]:
    if not workout_dir.exists():
        return []
    return [
        parse_md_to_workout(p)
        for p in workout_dir.iterdir()
        if p.is_file() and p.suffix == ".md"
    ]


async def poll_workout_items(app: FastAPI, interval_in_seconds: int) -> None:
    while True:
        logger.info("Refreshing workout items")
        app.state.workout_items = parse_all_workouts(app.state.workout_dir)
        await asyncio.sleep(interval_in_seconds)


# template parsing


def parse_md_to_template(md_path: Path) -> WorkoutTemplate:
    try:
        with md_path.open("r", encoding="utf-8") as f:
            post: frontmatter.Post = frontmatter.load(f)

        groups_data: Any = post.get("groups", [])
        groups: list[ExerciseGroup] = []
        for g in groups_data:
            exercises = []
            for e in g.get("exercises", []):
                sets = []
                for s in e.get("sets", []):
                    sets.append(
                        WorkoutSet(reps=s.get("reps"), weight=s.get("weight"))
                    )
                exercises.append(Exercise(name=e.get("name", ""), sets=sets))
            groups.append(
                ExerciseGroup(
                    name=g.get("name", ""),
                    rest_seconds=g.get("rest_seconds", 0),
                    exercises=exercises,
                )
            )

        return WorkoutTemplate(
            name=str(post.get("name", "")),
            groups=groups,
        )
    except Exception:
        logger.exception("Failed to parse %s", md_path)
        raise HTTPException(status_code=404, detail=f"failed to parse {md_path}")


def parse_all_templates(template_dir: Path) -> list[WorkoutTemplate]:
    if not template_dir.exists():
        return []
    return [
        parse_md_to_template(p)
        for p in template_dir.iterdir()
        if p.is_file() and p.suffix == ".md"
    ]


# habit parsing


def parse_md_to_habit(md_path: Path) -> Habit:
    try:
        with md_path.open("r", encoding="utf-8") as f:
            post: frontmatter.Post = frontmatter.load(f)
        days_data: Any = post.get("days", [])
        completions_data: Any = post.get("completions", [])
        return Habit(
            name=str(post.get("name", "")),
            days=list(days_data),
            color=str(post.get("color", "#605dff")),
            completions=list(completions_data),
        )
    except Exception:
        logger.exception("Failed to parse %s", md_path)
        raise HTTPException(status_code=404, detail=f"failed to parse {md_path}")


def parse_all_habits(habits_dir: Path) -> list[Habit]:
    if not habits_dir.exists():
        return []
    return [
        parse_md_to_habit(p)
        for p in habits_dir.iterdir()
        if p.is_file() and p.suffix == ".md"
    ]


async def poll_habit_items(app: FastAPI, interval_in_seconds: int) -> None:
    while True:
        logger.info("Refreshing habit items")
        app.state.habit_items = parse_all_habits(app.state.habits_dir)
        await asyncio.sleep(interval_in_seconds)


# activity parsing


def parse_md_to_activity(md_path: Path) -> Activity:
    try:
        with md_path.open("r", encoding="utf-8") as f:
            post: frontmatter.Post = frontmatter.load(f)

        date_val: Any = post.get("date")
        if isinstance(date_val, str):
            date_val = date.fromisoformat(date_val)

        return Activity(
            name=str(post.get("name", "")),
            date=date_val,
        )
    except Exception:
        logger.exception("Failed to parse %s", md_path)
        raise HTTPException(status_code=404, detail=f"failed to parse {md_path}")


def parse_all_activities(activities_dir: Path) -> list[Activity]:
    if not activities_dir.exists():
        return []
    return [
        parse_md_to_activity(p)
        for p in activities_dir.iterdir()
        if p.is_file() and p.suffix == ".md"
    ]


async def poll_activity_items(app: FastAPI, interval_in_seconds: int) -> None:
    while True:
        logger.info("Refreshing activity items")
        app.state.activity_items = parse_all_activities(app.state.activities_dir)
        await asyncio.sleep(interval_in_seconds)


# preset parsing


def parse_md_to_preset(md_path: Path) -> Preset:
    try:
        with md_path.open("r", encoding="utf-8") as f:
            post: frontmatter.Post = frontmatter.load(f)
        return Preset(name=str(post.get("name", "")))
    except Exception:
        logger.exception("Failed to parse %s", md_path)
        raise HTTPException(status_code=404, detail=f"failed to parse {md_path}")


def parse_all_presets(presets_dir: Path) -> list[Preset]:
    if not presets_dir.exists():
        return []
    return [
        parse_md_to_preset(p)
        for p in presets_dir.iterdir()
        if p.is_file() and p.suffix == ".md"
    ]


async def poll_preset_items(app: FastAPI, interval_in_seconds: int) -> None:
    while True:
        logger.info("Refreshing preset items")
        app.state.preset_items = parse_all_presets(app.state.presets_dir)
        await asyncio.sleep(interval_in_seconds)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # load directories from config
    app.state.media_dir = get_dir_from_config("./config.toml", "media_dir")
    validate_dir(app.state.media_dir)

    app.state.workout_dir = get_dir_from_config("./config.toml", "workout_dir")
    validate_dir(app.state.workout_dir)

    app.state.template_dir = get_dir_from_config("./config.toml", "template_dir")
    validate_dir(app.state.template_dir)

    # store parsing functions in app.state
    app.state.parse_md_to_media = parse_md_to_media
    app.state.parse_all_media = lambda: parse_all_media(app.state.media_dir)
    app.state.parse_md_to_workout = parse_md_to_workout
    app.state.parse_all_workouts = lambda: parse_all_workouts(app.state.workout_dir)
    app.state.parse_md_to_template = parse_md_to_template
    app.state.parse_all_templates = lambda: parse_all_templates(app.state.template_dir)

    # initial load of templates
    app.state.template_items = parse_all_templates(app.state.template_dir)

    app.state.habits_dir = get_dir_from_config("./config.toml", "habits_dir")
    validate_dir(app.state.habits_dir)
    app.state.activities_dir = get_dir_from_config("./config.toml", "activities_dir")
    validate_dir(app.state.activities_dir)
    app.state.presets_dir = get_dir_from_config("./config.toml", "presets_dir")
    validate_dir(app.state.presets_dir)

    app.state.parse_md_to_habit = parse_md_to_habit
    app.state.parse_all_habits = lambda: parse_all_habits(app.state.habits_dir)
    app.state.parse_md_to_activity = parse_md_to_activity
    app.state.parse_all_activities = lambda: parse_all_activities(app.state.activities_dir)
    app.state.parse_md_to_preset = parse_md_to_preset
    app.state.parse_all_presets = lambda: parse_all_presets(app.state.presets_dir)

    # initial load of habits, activities and presets
    app.state.habit_items = parse_all_habits(app.state.habits_dir)
    app.state.activity_items = parse_all_activities(app.state.activities_dir)
    app.state.preset_items = parse_all_presets(app.state.presets_dir)

    # start polling tasks for manual file edits
    logger.info("Starting background polling tasks")
    poll_media_task = asyncio.create_task(poll_media_items(app, interval_in_seconds=5))
    poll_workout_task = asyncio.create_task(
        poll_workout_items(app, interval_in_seconds=5)
    )
    poll_habit_task = asyncio.create_task(poll_habit_items(app, interval_in_seconds=5))
    poll_activity_task = asyncio.create_task(
        poll_activity_items(app, interval_in_seconds=5)
    )
    poll_preset_task = asyncio.create_task(poll_preset_items(app, interval_in_seconds=5))

    yield

    logger.info("Shutting down background tasks")
    poll_media_task.cancel()
    poll_workout_task.cancel()
    poll_habit_task.cancel()
    poll_activity_task.cancel()
    poll_preset_task.cancel()


app: FastAPI = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount(
    "/static",
    StaticFiles(directory=Path(__file__).parent.parent / "static"),
    name="static",
)

app.include_router(media_routes.router, prefix="/api")
app.include_router(workout_routes.router, prefix="/api")
app.include_router(habits_routes.router, prefix="/api")


@app.get("/api/meta/enums")
async def get_enums() -> dict[str, list[str]]:
    return {
        "countries": [m.name.lower() for m in MediaCountry if m.name != "UNDEFINED"],
        "types": [m.name.lower() for m in MediaType if m.name != "UNDEFINED"],
        "statuses": [m.name.lower() for m in MediaStatus],
    }


# SPA catch-all: serve index.html for non-API, non-static routes
spa_dir: Path = Path(__file__).parent.parent / "static" / "spa"


@app.get("/{full_path:path}")
async def serve_spa(full_path: str) -> FileResponse:
    # try to serve the exact file first (for assets like .js, .css)
    file_path: Path = spa_dir / full_path
    if full_path and file_path.is_file():
        return FileResponse(file_path)
    # otherwise serve index.html for client-side routing
    index_path: Path = spa_dir / "index.html"
    if index_path.is_file():
        return FileResponse(index_path)
    raise HTTPException(
        status_code=404, detail="SPA not built. Run: make build-frontend"
    )
