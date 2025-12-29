import asyncio
from contextlib import asynccontextmanager
import logging
from dataclasses import dataclass
from enum import IntEnum
from pathlib import Path

import frontmatter
from fastapi import FastAPI, HTTPException, Request
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates

logger: logging.Logger = logging.getLogger("uvicorn.error")


class MediaCountry(IntEnum):
    UNDEFINED = 0
    KOREA = 1
    JAPAN = 2
    AMERICA = 3

    @staticmethod
    def get(name: str | object) -> "MediaCountry":
        return MediaCountry[str(name).upper()]

    @staticmethod
    def get_defined_names() -> list[str]:
        return [m.name for m in MediaCountry]


class MediaType(IntEnum):
    UNDEFINED = 0
    VARIETY = 1
    DRAMA = 2
    MOVIE = 3
    SERIES = 4

    @staticmethod
    def get(name: str | object) -> "MediaType":
        return MediaType[str(name).upper()]

    @staticmethod
    def get_defined_names() -> list[str]:
        return [m.name for m in MediaType]


class MediaStatus(IntEnum):
    QUEUED = 0
    WATCHING = 1
    WATCHED = 2

    @staticmethod
    def get(name: str | object) -> "MediaStatus":
        return MediaStatus[str(name).upper()]

    @staticmethod
    def get_defined_names() -> list[str]:
        return [m.name for m in MediaStatus]


@dataclass
class Media:
    name: str
    country: MediaCountry
    type: MediaType
    status: MediaStatus
    rating: str
    review: str

    @property
    def country_str(self) -> str:
        return self.country.name.lower()

    @property
    def type_str(self) -> str:
        return self.type.name.lower()

    @property
    def status_str(self) -> str:
        return self.status.name.lower()


def parse_media(path: Path) -> Media:
    try:
        with path.open("r", encoding="utf-8") as f:
            post: frontmatter.Post = frontmatter.load(f)
        return Media(
            name=str(post["name"]),
            country=MediaCountry.get(post["country"]),
            type=MediaType.get(post["type"]),
            status=MediaStatus.get(post["status"]),
            rating=str(post["rating"]),
            review=post.content,
        )
    except:
        logger.exception("failed to parse %s", path)
        raise HTTPException(status_code=404, detail=f"failed to parse {path}")


def parse_all_media() -> list[Media]:
    return [
        parse_media(p)
        for p in media_dir.iterdir()
        if p.is_file()
        #
    ]


async def poll_media_items(app: FastAPI, interval_in_seconds: int):
    while True:
        logger.info("poll_media_items: refreshing media_items state")
        app.state.media_items = parse_all_media()
        await asyncio.sleep(interval_in_seconds)


@asynccontextmanager
async def lifespan(app: FastAPI):
    poll_media_items_task = asyncio.create_task(poll_media_items(app, 5))
    yield
    poll_media_items_task.cancel()


app: FastAPI = FastAPI(lifespan=lifespan)

# TODO: make these configurable
app.mount("/static", StaticFiles(directory="./static"), name="static")
templates: Jinja2Templates = Jinja2Templates(directory="./templates")
media_dir: Path = Path("./contents/media")


@app.get("/")
async def index_page(request: Request):
    return templates.TemplateResponse(
        request=request,
        name="index.html",
    )


@app.get("/media-items")
async def get_media_items(request: Request):
    return templates.TemplateResponse(
        request=request,
        name="media_items.html",
        context={"media_items": request.app.state.media_items},
    )
