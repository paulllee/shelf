from pathlib import Path

from fastapi import APIRouter, HTTPException, Request
from slugify import slugify

from app.models import Media, MediaModel, MediaStatus
from app.writer import write_media_item

router = APIRouter()


def get_media_dir(request: Request) -> Path:
    return request.app.state.media_dir


def try_get_media_md(request: Request, id: str) -> Path:
    media_dir: Path = get_media_dir(request)
    md_name: str = f"{id}.md"
    md_path: Path = media_dir / md_name
    if not md_path.exists():
        raise HTTPException(status_code=404, detail=f"{md_name} not found")
    return md_path


def is_duplicate_name(
    request: Request, name: str, exclude_id: str | None = None
) -> bool:
    new_id: str = slugify(name).lower()
    for item in request.app.state.media_items:
        if item.id == new_id and item.id != exclude_id:
            return True
    return False


def parse_media_to_dict(media: Media) -> dict:
    return {
        "id": media.id,
        "name": media.name,
        "country": media.country_str,
        "type": media.type_str,
        "status": media.status_str,
        "rating": media.rating,
        "review": media.review,
    }


@router.get("/media")
async def get_media_items(request: Request, status: str = "queued") -> list[dict]:
    items: list[Media] = [
        i for i in request.app.state.media_items if i.status == MediaStatus.get(status)
    ]
    return [parse_media_to_dict(i) for i in items]


@router.get("/media/check-name")
async def check_name(
    request: Request, name: str, exclude: str | None = None
) -> dict[str, bool]:
    return {"duplicate": is_duplicate_name(request, name, exclude_id=exclude)}


@router.get("/media/{id}")
async def get_media_item(request: Request, id: str) -> dict:
    media: Media = request.app.state.parse_md_to_media(try_get_media_md(request, id))
    return parse_media_to_dict(media)


@router.post("/media")
async def create_media_item(request: Request, media_item: MediaModel) -> dict:
    if is_duplicate_name(request, media_item.name):
        raise HTTPException(
            status_code=422, detail="a media item with this name already exists"
        )

    media_dir: Path = get_media_dir(request)
    md_path: Path = media_dir / f"{media_item.id}.md"
    write_media_item(media_item, md_path)

    request.app.state.media_items = request.app.state.parse_all_media()

    media: Media = request.app.state.parse_md_to_media(md_path)
    return parse_media_to_dict(media)


@router.put("/media/{id}")
async def update_media_item(request: Request, id: str, media_item: MediaModel) -> dict:
    if is_duplicate_name(request, media_item.name, exclude_id=id):
        raise HTTPException(
            status_code=422, detail="a media item with this name already exists"
        )

    media_dir: Path = get_media_dir(request)
    old_md_path: Path = try_get_media_md(request, id)
    new_id: str = media_item.id

    if id != new_id:
        old_md_path.unlink()
        new_md_path: Path = media_dir / f"{new_id}.md"
        write_media_item(media_item, new_md_path)
    else:
        write_media_item(media_item, old_md_path)

    request.app.state.media_items = request.app.state.parse_all_media()

    result_path: Path = media_dir / f"{new_id}.md"
    media: Media = request.app.state.parse_md_to_media(result_path)
    return parse_media_to_dict(media)


@router.delete("/media/{id}")
async def delete_media_item(request: Request, id: str) -> dict[str, bool]:
    try_get_media_md(request, id).unlink()
    request.app.state.media_items = request.app.state.parse_all_media()
    return {"ok": True}
