import asyncio
import json
import logging
import tomllib
from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Any

import frontmatter
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles

from app.models import Media, MediaCountry, MediaStatus, MediaType
from app.routes import media as media_routes
from app.sse import manager

logger: logging.Logger = logging.getLogger("uvicorn.error")
POLL_INTERVAL_SECONDS = 5


def get_media_dir(config_path: Path) -> Path:
    with config_path.open("rb") as config_file:
        config = tomllib.load(config_file)

    media_dir = config.get("media_dir")
    if not isinstance(media_dir, str) or not media_dir:
        raise ValueError("media_dir must be a non-empty path string")
    return Path(media_dir)


def validate_dir(dir_path: Path) -> None:
    dir_path.mkdir(parents=True, exist_ok=True)


def parse_md_to_media(md_path: Path) -> Media:
    try:
        with md_path.open("r", encoding="utf-8") as file:
            post: frontmatter.Post = frontmatter.load(file)
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
    return [parse_md_to_media(path) for path in media_dir.iterdir() if path.is_file()]


def refresh_media_items(app: FastAPI) -> None:
    app.state.media_items = parse_all_media(app.state.media_dir)


async def poll_media_items(app: FastAPI, interval_in_seconds: int) -> None:
    while True:
        try:
            logger.info("Refreshing media items")
            refresh_media_items(app)
        except Exception:
            logger.exception("Error during media poll")
        await asyncio.sleep(interval_in_seconds)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    app.state.media_dir = get_media_dir(Path("./config.toml"))
    validate_dir(app.state.media_dir)
    app.state.parse_md_to_media = parse_md_to_media
    app.state.parse_all_media = lambda: parse_all_media(app.state.media_dir)
    refresh_media_items(app)

    logger.info("Starting media polling task")
    poll_task = asyncio.create_task(
        poll_media_items(app, interval_in_seconds=POLL_INTERVAL_SECONDS)
    )

    yield

    logger.info("Shutting down media polling task")
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


@app.get("/api/meta/enums")
async def get_enums() -> dict[str, list[str]]:
    """Return available enum values for media countries, types, and statuses."""
    return {
        "countries": [
            item.name.lower() for item in MediaCountry if item.name != "UNDEFINED"
        ],
        "types": [item.name.lower() for item in MediaType if item.name != "UNDEFINED"],
        "statuses": [item.name.lower() for item in MediaStatus],
    }


@app.get("/events")
async def sse_endpoint(request: Request) -> StreamingResponse:
    """Stream cache invalidation events to the browser."""

    async def stream() -> AsyncGenerator[str, None]:
        queue = await manager.subscribe()
        try:
            while True:
                if await request.is_disconnected():
                    break
                try:
                    message: dict[str, Any] = await asyncio.wait_for(
                        queue.get(), timeout=15.0
                    )
                    yield f"data: {json.dumps(message)}\n\n"
                except asyncio.TimeoutError:
                    yield ": keepalive\n\n"
        finally:
            manager.unsubscribe(queue)

    return StreamingResponse(
        stream(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


spa_dir: Path = Path(__file__).parent.parent / "static" / "spa"


@app.get("/{full_path:path}")
async def serve_spa(full_path: str) -> FileResponse:
    """Serve the SPA entry point or one of its built assets."""
    file_path: Path = spa_dir / full_path
    if full_path and file_path.is_file():
        return FileResponse(file_path)
    index_path: Path = spa_dir / "index.html"
    if index_path.is_file():
        return FileResponse(index_path)
    raise HTTPException(status_code=404, detail="SPA not built. Run: pixi run build")
