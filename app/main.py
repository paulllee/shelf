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
            logger.info("successfully loaded %s=%s", key, dir_path)
            return Path(dir_path)
        else:
            logger.error("%s var not found in config.toml", key)
            sys.exit(1)

    except FileNotFoundError:
        logger.error("%s config was not found", config_path)
        sys.exit(1)
    except tomllib.TOMLDecodeError:
        logger.error("%s config is not a valid toml file", config_path)
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
        logger.exception("failed to parse %s", md_path)
        raise HTTPException(status_code=404, detail=f"failed to parse {md_path}")


def parse_all_media(media_dir: Path) -> list[Media]:
    return [parse_md_to_media(p) for p in media_dir.iterdir() if p.is_file()]


async def poll_media_items(app: FastAPI, interval_in_seconds: int):
    while True:
        logger.info("poll_media_items: refreshing media_items state")
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
        logger.exception("failed to parse %s", md_path)
        raise HTTPException(status_code=404, detail=f"failed to parse {md_path}")


def parse_all_workouts(workout_dir: Path) -> list[Workout]:
    if not workout_dir.exists():
        return []
    return [
        parse_md_to_workout(p)
        for p in workout_dir.iterdir()
        if p.is_file() and p.suffix == ".md"
    ]


async def poll_workout_items(app: FastAPI, interval_in_seconds: int):
    while True:
        logger.info("poll_workout_items: refreshing workout_items state")
        app.state.workout_items = parse_all_workouts(app.state.workout_dir)
        await asyncio.sleep(interval_in_seconds)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # store dirs in app.state for routes to access
    app.state.media_dir = get_dir_from_config("./config.toml", "media_dir")
    app.state.workout_dir = get_dir_from_config("./config.toml", "workout_dir")

    # store parsing functions in app.state for routes to access
    app.state.parse_md_to_media = parse_md_to_media
    app.state.parse_all_media = lambda: parse_all_media(app.state.media_dir)
    app.state.parse_md_to_workout = parse_md_to_workout
    app.state.parse_all_workouts = lambda: parse_all_workouts(app.state.workout_dir)

    # poll items if markdown files are manually edited
    poll_media_items_task = asyncio.create_task(
        poll_media_items(app, interval_in_seconds=5)
    )
    poll_workout_items_task = asyncio.create_task(
        poll_workout_items(app, interval_in_seconds=5)
    )
    yield
    poll_media_items_task.cancel()
    poll_workout_items_task.cancel()


app: FastAPI = FastAPI(lifespan=lifespan)

app.mount("/static", StaticFiles(directory="./static"), name="static")
templates: Jinja2Templates = Jinja2Templates(directory="./templates")

app.include_router(media_routes.router)
app.include_router(workout_routes.router)


@app.get("/")
async def index_page(request: Request):
    return templates.TemplateResponse(
        request=request,
        name="index.html",
    )
