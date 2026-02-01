import asyncio
import logging
import sys
import tomllib
from contextlib import asynccontextmanager
from datetime import date, time
from pathlib import Path
from typing import Any

import frontmatter
from fastapi import FastAPI, HTTPException, Request
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates

from app.models import (
    Exercise,
    ExerciseGroup,
    Media,
    MediaCountry,
    MediaStatus,
    MediaType,
    Workout,
    WorkoutSet,
    WorkoutTemplate,
)
from app.routes import media as media_routes
from app.routes import workout as workout_routes

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
        logger.debug("Refreshing media items")
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
                        WorkoutSet(reps=s.get("reps", 0), weight=s.get("weight"))
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
        logger.debug("Refreshing workout items")
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
                        WorkoutSet(reps=s.get("reps", 0), weight=s.get("weight"))
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

    # start polling tasks for manual file edits
    logger.info("Starting background polling tasks")
    poll_media_task = asyncio.create_task(poll_media_items(app, interval_in_seconds=5))
    poll_workout_task = asyncio.create_task(
        poll_workout_items(app, interval_in_seconds=5)
    )

    yield

    logger.info("Shutting down background tasks")
    poll_media_task.cancel()
    poll_workout_task.cancel()


app: FastAPI = FastAPI(lifespan=lifespan)

app.mount(
    "/static",
    StaticFiles(directory=Path(__file__).parent.parent / "static"),
    name="static",
)
templates: Jinja2Templates = Jinja2Templates(directory="./templates")

app.include_router(media_routes.router)
app.include_router(workout_routes.router)


@app.get("/")
async def index_page(request: Request):
    return templates.TemplateResponse(
        request=request,
        name="index.html",
    )
