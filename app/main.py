import asyncio
import logging
import sys
import tomllib
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Any

import frontmatter
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from slugify import slugify

from app.models import Media, MediaCountry, MediaModel, MediaStatus, MediaType
from app.writer import write_media_item

logger: logging.Logger = logging.getLogger("uvicorn.error")


def get_media_dir_from_config(config_path: str) -> Path:
    try:
        with open(config_path, "rb") as f:
            config: dict[str, Any] = tomllib.load(f)

        media_dir: Any | None = config.get("media_dir")

        if media_dir:
            logger.info("successfully loaded %s", media_dir)
            return Path(media_dir)
        else:
            logger.error("media_dir not found in config.toml")
            sys.exit(1)

    except FileNotFoundError:
        logger.error(f"%s config was not found", config_path)
        sys.exit(1)
    except tomllib.TOMLDecodeError:
        logger.error("%s config is not a valid toml file", config_path)
        sys.exit(1)


def try_get_md(id: str) -> Path:
    md_name: str = f"{id}.md"
    md_path: Path = media_dir / md_name
    if not md_path.exists():
        raise HTTPException(status_code=404, detail=f"{md_name} not found")
    return md_path


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


def parse_media_to_model(media: Media) -> MediaModel:
    try:
        return MediaModel(
            name=media.name,
            country=media.country_str,
            type=media.type_str,
            status=media.status_str,
            rating=media.rating,
            review=media.review,
        )
    except Exception:
        logger.exception("failed to parse media obj")
        raise HTTPException(status_code=404, detail="failed to parse media obj")


def parse_all_media() -> list[Media]:
    return [
        parse_md_to_media(p)
        for p in media_dir.iterdir()
        if p.is_file()
        #
    ]


def is_duplicate_name(name: str, exclude_id: str | None = None) -> bool:
    new_id = slugify(name).lower()
    for item in app.state.media_items:
        if item.id == new_id and item.id != exclude_id:
            return True
    return False


async def poll_media_items(app: FastAPI, interval_in_seconds: int):
    while True:
        logger.info("poll_media_items: refreshing media_items state")
        app.state.media_items = parse_all_media()
        await asyncio.sleep(interval_in_seconds)


@asynccontextmanager
async def lifespan(app: FastAPI):
    poll_media_items_task = asyncio.create_task(
        poll_media_items(app, interval_in_seconds=5)
    )
    yield
    poll_media_items_task.cancel()


app: FastAPI = FastAPI(lifespan=lifespan)

app.mount("/static", StaticFiles(directory="./static"), name="static")
templates: Jinja2Templates = Jinja2Templates(directory="./templates")
media_dir: Path = get_media_dir_from_config("./config.toml")


@app.get("/")
async def index_page(request: Request):
    return templates.TemplateResponse(
        request=request,
        name="index.html",
    )


@app.get("/media-items")
async def get_media_items(request: Request, status: str = "queued"):
    items = [
        i for i in request.app.state.media_items if i.status == MediaStatus.get(status)
    ]
    return templates.TemplateResponse(
        request=request,
        name="partials/media_list.html",
        context={"media_items": items},
    )


@app.post("/media")
async def create_media_item(request: Request, media_item: MediaModel):
    if is_duplicate_name(media_item.name):
        return HTMLResponse(
            content='<div class="text-error">A media item with this name already exists.</div>',
            status_code=422,
            headers={"HX-Retarget": "#name-error", "HX-Reswap": "innerHTML"},
        )

    md_path: Path = media_dir / f"{media_item.id}.md"
    write_media_item(media_item, md_path)

    request.app.state.media_items = parse_all_media()

    status = media_item.status or "queued"
    items = [
        i for i in request.app.state.media_items if i.status == MediaStatus.get(status)
    ]
    return templates.TemplateResponse(
        request=request,
        name="partials/media_list.html",
        context={"media_items": items},
    )


@app.put("/media/{id}")
async def update_media_item(
    request: Request,
    id: str,
    media_item: MediaModel,
):
    if is_duplicate_name(media_item.name, exclude_id=id):
        return HTMLResponse(
            content='<div class="text-error">A media item with this name already exists.</div>',
            status_code=422,
            headers={"HX-Retarget": "#name-error", "HX-Reswap": "innerHTML"},
        )

    old_md_path: Path = try_get_md(id)
    new_id = media_item.id

    if id != new_id:
        old_md_path.unlink()
        new_md_path = media_dir / f"{new_id}.md"
        write_media_item(media_item, new_md_path)
    else:
        write_media_item(media_item, old_md_path)

    request.app.state.media_items = parse_all_media()

    status = media_item.status or "queued"
    items = [
        i for i in request.app.state.media_items if i.status == MediaStatus.get(status)
    ]
    return templates.TemplateResponse(
        request=request,
        name="partials/media_list.html",
        context={"media_items": items},
    )


@app.get("/api/media/{id}", response_model=MediaModel)
async def get_media_item(id: str):
    media: Media = parse_md_to_media(try_get_md(id))
    return parse_media_to_model(media)


@app.get("/media/new")
async def new_media_item_form(request: Request):
    return templates.TemplateResponse(
        request=request,
        name="media_form.html",
        context={
            "countries": MediaCountry.get_defined_names(),
            "types": MediaType.get_defined_names(),
            "statuses": MediaStatus.get_defined_names(),
        },
    )


@app.get("/media/{id}")
async def view_media_item(request: Request, id: str):
    media: Media = parse_md_to_media(try_get_md(id))
    return templates.TemplateResponse(
        request=request,
        name="media_view.html",
        context={"item": media},
    )


@app.get("/media/{id}/edit")
async def edit_media_item_form(request: Request, id: str):
    media: Media = parse_md_to_media(try_get_md(id))
    model: MediaModel = parse_media_to_model(media)
    return templates.TemplateResponse(
        request=request,
        name="media_form.html",
        context={
            "item": model,
            "countries": MediaCountry.get_defined_names(),
            "types": MediaType.get_defined_names(),
            "statuses": MediaStatus.get_defined_names(),
        },
    )


@app.get("/modal/media/new")
async def new_media_modal(request: Request):
    return templates.TemplateResponse(
        request=request,
        name="partials/modal_form.html",
        context={
            "countries": MediaCountry.get_defined_names(),
            "types": MediaType.get_defined_names(),
            "statuses": MediaStatus.get_defined_names(),
        },
    )


@app.get("/modal/media/{id}/edit")
async def edit_media_modal(request: Request, id: str):
    media: Media = parse_md_to_media(try_get_md(id))
    model: MediaModel = parse_media_to_model(media)
    return templates.TemplateResponse(
        request=request,
        name="partials/modal_form.html",
        context={
            "item": model,
            "countries": MediaCountry.get_defined_names(),
            "types": MediaType.get_defined_names(),
            "statuses": MediaStatus.get_defined_names(),
        },
    )


@app.get("/api/check-name")
async def check_name(name: str, exclude: str | None = None):
    if is_duplicate_name(name, exclude_id=exclude):
        return HTMLResponse(
            content='<span class="text-error text-sm">This name already exists</span>'
        )
    return HTMLResponse(content="")
