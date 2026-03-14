import asyncio
import logging
import sys
import tomllib
from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager
from datetime import date, datetime, time
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
    HabitShift,
    Media,
    MediaCountry,
    MediaStatus,
    MediaType,
    Preset,
    Task,
    Workout,
    WorkoutSet,
    WorkoutTemplate,
)
from app.routes import habits as habits_routes
from app.routes import media as media_routes
from app.routes import tasks as tasks_routes
from app.routes import workout as workout_routes

logger: logging.Logger = logging.getLogger("uvicorn.error")


def get_dir_from_config(config_path: str, key: str) -> Path:
    """Read a directory path from a TOML config file by key."""
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
    """Ensure a directory exists, creating it and parents if needed."""
    dir_path.mkdir(parents=True, exist_ok=True)


# media parsing


def parse_md_to_media(md_path: Path) -> Media:
    """Parse a markdown file into a Media dataclass."""
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
    """Parse all markdown files in the media directory into Media objects."""
    return [parse_md_to_media(p) for p in media_dir.iterdir() if p.is_file()]


async def poll_all_items(app: FastAPI, interval_in_seconds: int) -> None:
    """Periodically refresh all in-memory item caches from disk."""
    while True:
        try:
            logger.info("Refreshing all items")
            app.state.media_items = parse_all_media(app.state.media_dir)
            app.state.workout_items = parse_all_workouts(app.state.workout_dir)
            app.state.template_items = parse_all_templates(app.state.template_dir)
            app.state.habit_items = parse_all_habits(app.state.habits_dir)
            app.state.activity_items = parse_all_activities(app.state.activities_dir)
            app.state.preset_items = parse_all_presets(app.state.presets_dir)
            app.state.task_items = parse_all_tasks(app.state.tasks_dir)
        except Exception:
            logger.exception("Error during poll")
        await asyncio.sleep(interval_in_seconds)


# workout parsing


def parse_md_to_workout(md_path: Path) -> Workout:
    """Parse a markdown file into a Workout dataclass."""
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
                    sets.append(WorkoutSet(reps=s.get("reps"), weight=s.get("weight")))
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
    """Parse all markdown files in the workout directory into Workout objects."""
    if not workout_dir.exists():
        return []
    return [
        parse_md_to_workout(p)
        for p in workout_dir.iterdir()
        if p.is_file() and p.suffix == ".md"
    ]


# template parsing


def parse_md_to_template(md_path: Path) -> WorkoutTemplate:
    """Parse a markdown file into a WorkoutTemplate dataclass."""
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
                    sets.append(WorkoutSet(reps=s.get("reps"), weight=s.get("weight")))
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
    """Parse all markdown files in the template directory."""
    if not template_dir.exists():
        return []
    return [
        parse_md_to_template(p)
        for p in template_dir.iterdir()
        if p.is_file() and p.suffix == ".md"
    ]


# habit parsing


def parse_md_to_habit(md_path: Path) -> Habit:
    """Parse a markdown file into a Habit dataclass."""
    try:
        with md_path.open("r", encoding="utf-8") as f:
            post: frontmatter.Post = frontmatter.load(f)
        days_data: Any = post.get("days", [])
        completions_data: Any = post.get("completions", [])
        shifts_data: Any = post.get("shifts", []) or []
        shifts = [
            HabitShift(
                from_date=str(s["from"]),
                to_date=str(s["to"]) if s.get("to") else None,
            )
            for s in shifts_data
            if isinstance(s, dict) and "from" in s
        ]
        return Habit(
            name=str(post.get("name", "")),
            days=list(days_data),
            color=str(post.get("color", "#605dff")),
            completions=list(completions_data),
            shifts=shifts,
        )
    except Exception:
        logger.exception("Failed to parse %s", md_path)
        raise HTTPException(status_code=404, detail=f"failed to parse {md_path}")


def parse_all_habits(habits_dir: Path) -> list[Habit]:
    """Parse all markdown files in the habits directory."""
    if not habits_dir.exists():
        return []
    return [
        parse_md_to_habit(p)
        for p in habits_dir.iterdir()
        if p.is_file() and p.suffix == ".md"
    ]


# activity parsing


def parse_md_to_activity(md_path: Path) -> Activity:
    """Parse a markdown file into an Activity dataclass."""
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
    """Parse all markdown files in the activities directory."""
    if not activities_dir.exists():
        return []
    return [
        parse_md_to_activity(p)
        for p in activities_dir.iterdir()
        if p.is_file() and p.suffix == ".md"
    ]


# preset parsing


def parse_md_to_preset(md_path: Path) -> Preset:
    """Parse a markdown file into a Preset dataclass."""
    try:
        with md_path.open("r", encoding="utf-8") as f:
            post: frontmatter.Post = frontmatter.load(f)
        return Preset(name=str(post.get("name", "")))
    except Exception:
        logger.exception("Failed to parse %s", md_path)
        raise HTTPException(status_code=404, detail=f"failed to parse {md_path}")


def parse_all_presets(presets_dir: Path) -> list[Preset]:
    """Parse all markdown files in the presets directory."""
    if not presets_dir.exists():
        return []
    return [
        parse_md_to_preset(p)
        for p in presets_dir.iterdir()
        if p.is_file() and p.suffix == ".md"
    ]


# task parsing


def parse_md_to_task(md_path: Path) -> Task:
    """Parse a markdown file into a Task dataclass."""
    try:
        with md_path.open("r", encoding="utf-8") as f:
            post: frontmatter.Post = frontmatter.load(f)

        due_val: Any = post.get("due")
        if isinstance(due_val, str):
            due_val = date.fromisoformat(due_val)
        elif not isinstance(due_val, date):
            due_val = None

        created_at_val: Any = post.get("created_at", "")
        if isinstance(created_at_val, str):
            created_at_val = datetime.fromisoformat(created_at_val)

        parent_val: Any = post.get("parent")
        if parent_val is None or parent_val == "null":
            parent_val = None
        else:
            parent_val = str(parent_val)

        return Task(
            title=str(post.get("title", "")),
            status=str(post.get("status", "open")),
            due=due_val,
            parent=parent_val,
            notes=post.content,
            created_at=created_at_val,
        )
    except Exception:
        logger.exception("Failed to parse %s", md_path)
        raise HTTPException(status_code=404, detail=f"failed to parse {md_path}")


def parse_all_tasks(tasks_dir: Path) -> list[Task]:
    """Parse all markdown files in the tasks directory."""
    if not tasks_dir.exists():
        return []
    return [
        parse_md_to_task(p)
        for p in tasks_dir.iterdir()
        if p.is_file() and p.suffix == ".md"
    ]


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Initialize app state directories, caches, and background polling."""
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
    app.state.parse_all_activities = lambda: parse_all_activities(
        app.state.activities_dir
    )
    app.state.parse_md_to_preset = parse_md_to_preset
    app.state.parse_all_presets = lambda: parse_all_presets(app.state.presets_dir)

    # initial load of habits, activities and presets
    app.state.habit_items = parse_all_habits(app.state.habits_dir)
    app.state.activity_items = parse_all_activities(app.state.activities_dir)
    app.state.preset_items = parse_all_presets(app.state.presets_dir)

    # tasks
    app.state.tasks_dir = get_dir_from_config("./config.toml", "tasks_dir")
    validate_dir(app.state.tasks_dir)
    app.state.parse_md_to_task = parse_md_to_task
    app.state.parse_all_tasks = lambda: parse_all_tasks(app.state.tasks_dir)
    app.state.task_items = parse_all_tasks(app.state.tasks_dir)

    # Google GenAI client for AI chat (optional)
    import os

    gemini_key = os.environ.get("GEMINI_API_KEY")
    if gemini_key:
        from google import genai

        app.state.genai_client = genai.Client(api_key=gemini_key)
        app.state.gemini_model = os.environ.get(
            "GEMINI_MODEL", "gemini-3-flash-preview"
        )
        logger.info(
            "Google GenAI client initialized (model: %s)", app.state.gemini_model
        )
    else:
        app.state.genai_client = None
        app.state.gemini_model = None
        logger.warning("GEMINI_API_KEY not set — AI chat disabled")

    # start polling task for manual file edits
    logger.info("Starting background polling task")
    poll_task = asyncio.create_task(poll_all_items(app, interval_in_seconds=5))

    yield

    logger.info("Shutting down background task")
    poll_task.cancel()


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
app.include_router(tasks_routes.router, prefix="/api")


@app.get("/api/meta/enums")
async def get_enums() -> dict[str, list[str]]:
    """Return available enum values for media countries, types, and statuses."""
    return {
        "countries": [m.name.lower() for m in MediaCountry if m.name != "UNDEFINED"],
        "types": [m.name.lower() for m in MediaType if m.name != "UNDEFINED"],
        "statuses": [m.name.lower() for m in MediaStatus],
    }


# SPA catch-all: serve index.html for non-API, non-static routes
spa_dir: Path = Path(__file__).parent.parent / "static" / "spa"


@app.get("/{full_path:path}")
async def serve_spa(full_path: str) -> FileResponse:
    """Serve the SPA index.html or static assets for client-side routing."""
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
