from pathlib import Path

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates
from slugify import slugify

from app.models import Media, MediaCountry, MediaModel, MediaStatus, MediaType
from app.writer import write_media_item

router = APIRouter()
templates = Jinja2Templates(directory="./templates")


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


def parse_media_to_media_model(media: Media) -> MediaModel:
    return MediaModel(
        name=media.name,
        country=media.country_str,
        type=media.type_str,
        status=media.status_str,
        rating=media.rating,
        review=media.review,
    )


@router.get("/media-items")
async def get_media_items(request: Request, status: str = "queued"):
    items: list[Media] = [
        i for i in request.app.state.media_items if i.status == MediaStatus.get(status)
    ]
    return templates.TemplateResponse(
        request=request,
        name="partials/media_list.html",
        context={"media_items": items, "current_status": status},
    )


def parse_form_to_media_model(form: dict) -> MediaModel:
    return MediaModel(
        name=str(form.get("name", "")).strip(),
        country=str(form.get("country", "")).strip(),
        type=str(form.get("type", "")).strip(),
        status=str(form.get("status", "queued")).strip(),
        rating=str(form.get("rating", "")).strip() or None,
        review=str(form.get("review", "")).strip() or None,
    )


@router.post("/media")
async def create_media_item(request: Request):
    form_data = await request.form()
    form_dict = dict(form_data)
    media_item = parse_form_to_media_model(form_dict)

    if is_duplicate_name(request, media_item.name):
        return HTMLResponse(
            content='<div class="text-error">a media item with this name already exists</div>',
            status_code=422,
            headers={"HX-Retarget": "#name-error", "HX-Reswap": "innerHTML"},
        )

    media_dir: Path = get_media_dir(request)
    md_path: Path = media_dir / f"{media_item.id}.md"
    write_media_item(media_item, md_path)

    request.app.state.media_items = request.app.state.parse_all_media()

    # use viewing_status to stay on current tab, fallback to item's status for new items
    viewing_status: str = str(form_dict.get("viewing_status", "")).strip()
    status: str = viewing_status or media_item.status or "queued"
    items: list[Media] = [
        i for i in request.app.state.media_items if i.status == MediaStatus.get(status)
    ]
    return templates.TemplateResponse(
        request=request,
        name="partials/media_list.html",
        context={"media_items": items, "current_status": status},
    )


@router.put("/media/{id}")
async def update_media_item(request: Request, id: str):
    form_data = await request.form()
    form_dict = dict(form_data)
    media_item = parse_form_to_media_model(form_dict)

    if is_duplicate_name(request, media_item.name, exclude_id=id):
        return HTMLResponse(
            content='<div class="text-error">a media item with this name already exists</div>',
            status_code=422,
            headers={"HX-Retarget": "#name-error", "HX-Reswap": "innerHTML"},
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

    # use viewing_status to stay on current tab
    viewing_status: str = str(form_dict.get("viewing_status", "")).strip()
    status: str = viewing_status or media_item.status or "queued"
    items: list[Media] = [
        i for i in request.app.state.media_items if i.status == MediaStatus.get(status)
    ]
    return templates.TemplateResponse(
        request=request,
        name="partials/media_list.html",
        context={"media_items": items, "current_status": status},
    )


@router.get("/api/media/{id}", response_model=MediaModel)
async def get_media_item(request: Request, id: str):
    media: Media = request.app.state.parse_md_to_media(try_get_media_md(request, id))
    return parse_media_to_media_model(media)


@router.get("/media/new")
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


@router.get("/media/{id}")
async def view_media_item(request: Request, id: str):
    media = request.app.state.parse_md_to_media(try_get_media_md(request, id))
    return templates.TemplateResponse(
        request=request,
        name="media_view.html",
        context={"item": media},
    )


@router.get("/media/{id}/edit")
async def edit_media_item_form(request: Request, id: str):
    media: Media = request.app.state.parse_md_to_media(try_get_media_md(request, id))
    model: MediaModel = parse_media_to_media_model(media)
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


@router.get("/modal/media/new")
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


@router.get("/modal/media/{id}/edit")
async def edit_media_modal(request: Request, id: str, viewing_status: str = "queued"):
    media: Media = request.app.state.parse_md_to_media(try_get_media_md(request, id))
    model: MediaModel = parse_media_to_media_model(media)
    return templates.TemplateResponse(
        request=request,
        name="partials/modal_form.html",
        context={
            "item": model,
            "viewing_status": viewing_status,
            "countries": MediaCountry.get_defined_names(),
            "types": MediaType.get_defined_names(),
            "statuses": MediaStatus.get_defined_names(),
        },
    )


@router.get("/api/check-name")
async def check_name(request: Request, name: str, exclude: str | None = None):
    if is_duplicate_name(request, name, exclude_id=exclude):
        return HTMLResponse(
            content='<span class="text-error text-sm">this name already exists</span>'
        )
    return HTMLResponse(content="")
