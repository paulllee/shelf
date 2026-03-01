from datetime import date as date_cls
from pathlib import Path

from fastapi import APIRouter, HTTPException, Request
from slugify import slugify

from app.models import Activity, ActivityModel, Habit, HabitModel, Preset, PresetModel
from app.writer import write_activity, write_habit, write_preset

router = APIRouter()


def get_habits_dir(request: Request) -> Path:
    return request.app.state.habits_dir


def get_activities_dir(request: Request) -> Path:
    return request.app.state.activities_dir


def get_presets_dir(request: Request) -> Path:
    return request.app.state.presets_dir


def try_get_habit_md(request: Request, habit_id: str) -> Path:
    md_path = get_habits_dir(request) / f"{habit_id}.md"
    if not md_path.exists():
        raise HTTPException(status_code=404, detail=f"{habit_id}.md not found")
    return md_path


def try_get_activity_md(request: Request, activity_id: str) -> Path:
    md_path = get_activities_dir(request) / f"{activity_id}.md"
    if not md_path.exists():
        raise HTTPException(status_code=404, detail=f"{activity_id}.md not found")
    return md_path


def try_get_preset_md(request: Request, preset_id: str) -> Path:
    md_path = get_presets_dir(request) / f"{preset_id}.md"
    if not md_path.exists():
        raise HTTPException(status_code=404, detail=f"{preset_id}.md not found")
    return md_path


def parse_habit_to_dict(habit: Habit) -> dict:
    return {
        "id": habit.id,
        "name": habit.name,
        "days": habit.days,
        "color": habit.color,
        "completions": habit.completions,
    }


def parse_activity_to_dict(activity: Activity) -> dict:
    return {
        "id": activity.id,
        "name": activity.name,
        "date": activity.date.isoformat(),
    }


# habit routes


@router.get("/habits")
async def get_habits(request: Request) -> list[dict]:
    habits: list[Habit] = sorted(
        request.app.state.habit_items, key=lambda h: h.name
    )
    return [parse_habit_to_dict(h) for h in habits]


@router.get("/habit/{habit_id}")
async def get_habit(request: Request, habit_id: str) -> dict:
    habit: Habit = request.app.state.parse_md_to_habit(
        try_get_habit_md(request, habit_id)
    )
    return parse_habit_to_dict(habit)


@router.post("/habit")
async def create_habit(request: Request, habit: HabitModel) -> dict:
    md_path: Path = get_habits_dir(request) / f"{habit.id}.md"
    if md_path.exists():
        raise HTTPException(status_code=409, detail="habit already exists")

    write_habit(habit, md_path)
    request.app.state.habit_items = request.app.state.parse_all_habits()

    parsed: Habit = request.app.state.parse_md_to_habit(md_path)
    return parse_habit_to_dict(parsed)


@router.put("/habit/{habit_id}")
async def update_habit(request: Request, habit_id: str, habit: HabitModel) -> dict:
    old_md_path: Path = try_get_habit_md(request, habit_id)
    new_md_path: Path = get_habits_dir(request) / f"{habit.id}.md"

    if habit_id != habit.id:
        old_md_path.unlink()

    write_habit(habit, new_md_path)
    request.app.state.habit_items = request.app.state.parse_all_habits()

    parsed: Habit = request.app.state.parse_md_to_habit(new_md_path)
    return parse_habit_to_dict(parsed)


@router.delete("/habit/{habit_id}")
async def delete_habit(request: Request, habit_id: str) -> dict[str, bool]:
    try_get_habit_md(request, habit_id).unlink()
    request.app.state.habit_items = request.app.state.parse_all_habits()
    return {"ok": True}


@router.post("/habit/{habit_id}/toggle/{date}")
async def toggle_habit_completion(
    request: Request, habit_id: str, date: str
) -> dict:
    try:
        date_cls.fromisoformat(date)
    except ValueError:
        raise HTTPException(status_code=400, detail="invalid date format, use YYYY-MM-DD")

    md_path: Path = try_get_habit_md(request, habit_id)
    habit: Habit = request.app.state.parse_md_to_habit(md_path)

    completions = list(habit.completions)
    if date in completions:
        completions.remove(date)
    else:
        completions.append(date)

    habit_model = HabitModel(
        name=habit.name,
        days=habit.days,
        color=habit.color,
        completions=completions,
    )
    write_habit(habit_model, md_path)
    request.app.state.habit_items = request.app.state.parse_all_habits()

    parsed: Habit = request.app.state.parse_md_to_habit(md_path)
    return parse_habit_to_dict(parsed)


# activity routes


@router.get("/activities")
async def get_activities(request: Request, date: str | None = None) -> list[dict]:
    items: list[Activity] = sorted(
        request.app.state.activity_items, key=lambda a: a.date
    )
    if date:
        items = [a for a in items if a.date.isoformat() == date]
    return [parse_activity_to_dict(a) for a in items]


@router.post("/activity")
async def create_activity(request: Request, activity: ActivityModel) -> dict:
    date_str = activity.date.isoformat()
    slug = slugify(activity.name).lower()

    existing = [
        a
        for a in request.app.state.activity_items
        if a.date.isoformat() == date_str and slugify(a.name).lower() == slug
    ]
    if existing:
        raise HTTPException(
            status_code=409, detail="activity already exists for this date"
        )

    md_path: Path = get_activities_dir(request) / f"{activity.id}.md"
    write_activity(activity, md_path)
    request.app.state.activity_items = request.app.state.parse_all_activities()

    parsed: Activity = request.app.state.parse_md_to_activity(md_path)
    return parse_activity_to_dict(parsed)


@router.delete("/activity/{activity_id}")
async def delete_activity(request: Request, activity_id: str) -> dict[str, bool]:
    try_get_activity_md(request, activity_id).unlink()
    request.app.state.activity_items = request.app.state.parse_all_activities()
    return {"ok": True}


@router.get("/habit-presets")
async def get_habit_presets(request: Request) -> list[str]:
    activity_names = {a.name for a in request.app.state.activity_items}
    preset_names = {p.name for p in request.app.state.preset_items}
    return sorted(activity_names | preset_names)


# explicit preset routes


@router.get("/presets")
async def get_presets(request: Request) -> list[dict]:
    presets: list[Preset] = sorted(
        request.app.state.preset_items, key=lambda p: p.name
    )
    return [{"id": p.id, "name": p.name} for p in presets]


@router.post("/preset")
async def create_preset(request: Request, preset: PresetModel) -> dict:
    md_path: Path = get_presets_dir(request) / f"{preset.id}.md"
    if md_path.exists():
        raise HTTPException(status_code=409, detail="preset already exists")

    write_preset(preset, md_path)
    request.app.state.preset_items = request.app.state.parse_all_presets()

    parsed: Preset = request.app.state.parse_md_to_preset(md_path)
    return {"id": parsed.id, "name": parsed.name}


@router.put("/preset/{preset_id}")
async def update_preset(
    request: Request, preset_id: str, preset: PresetModel
) -> dict:
    old_md_path: Path = try_get_preset_md(request, preset_id)
    new_md_path: Path = get_presets_dir(request) / f"{preset.id}.md"

    if preset_id != preset.id:
        old_md_path.unlink()

    write_preset(preset, new_md_path)
    request.app.state.preset_items = request.app.state.parse_all_presets()

    parsed: Preset = request.app.state.parse_md_to_preset(new_md_path)
    return {"id": parsed.id, "name": parsed.name}


@router.delete("/preset/{preset_id}")
async def delete_preset(request: Request, preset_id: str) -> dict[str, bool]:
    try_get_preset_md(request, preset_id).unlink()
    request.app.state.preset_items = request.app.state.parse_all_presets()
    return {"ok": True}
