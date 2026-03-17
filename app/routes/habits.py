from datetime import date as date_cls
from pathlib import Path

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field
from slugify import slugify

from app.models import (
    Activity,
    ActivityModel,
    Habit,
    HabitModel,
    HabitShiftModel,
    Preset,
    PresetModel,
)
from app.writer import write_activity, write_habit, write_preset
from app.sse import manager


class ShiftRequestModel(BaseModel):
    """Pydantic model for habit shift request input."""

    from_date: str = Field(alias="from")
    to_date: str | None = Field(default=None, alias="to")
    model_config = {"populate_by_name": True}


router = APIRouter()


def get_habits_dir(request: Request) -> Path:
    """Return the habits directory path from app state."""
    return request.app.state.habits_dir


def get_activities_dir(request: Request) -> Path:
    """Return the activities directory path from app state."""
    return request.app.state.activities_dir


def get_presets_dir(request: Request) -> Path:
    """Return the presets directory path from app state."""
    return request.app.state.presets_dir


def try_get_habit_md(request: Request, habit_id: str) -> Path:
    """Return the markdown file path for a habit, raising 404 if missing."""
    md_path = get_habits_dir(request) / f"{habit_id}.md"
    if not md_path.exists():
        raise HTTPException(status_code=404, detail=f"{habit_id}.md not found")
    return md_path


def try_get_activity_md(request: Request, activity_id: str) -> Path:
    """Return the markdown file path for an activity, raising 404 if missing."""
    md_path = get_activities_dir(request) / f"{activity_id}.md"
    if not md_path.exists():
        raise HTTPException(status_code=404, detail=f"{activity_id}.md not found")
    return md_path


def try_get_preset_md(request: Request, preset_id: str) -> Path:
    """Return the markdown file path for a preset, raising 404 if missing."""
    md_path = get_presets_dir(request) / f"{preset_id}.md"
    if not md_path.exists():
        raise HTTPException(status_code=404, detail=f"{preset_id}.md not found")
    return md_path


def parse_habit_to_dict(habit: Habit) -> dict:
    """Convert a Habit dataclass to a JSON-serializable dict."""
    return {
        "id": habit.id,
        "name": habit.name,
        "days": habit.days,
        "color": habit.color,
        "completions": habit.completions,
        "shifts": [{"from": s.from_date, "to": s.to_date} for s in habit.shifts],
    }


def parse_activity_to_dict(activity: Activity) -> dict:
    """Convert an Activity dataclass to a JSON-serializable dict."""
    return {
        "id": activity.id,
        "name": activity.name,
        "date": activity.date.isoformat(),
    }


# habit routes


@router.get("/habits")
async def get_habits(request: Request) -> list[dict]:
    """Return all habits sorted by name."""
    habits: list[Habit] = sorted(request.app.state.habit_items, key=lambda h: h.name)
    return [parse_habit_to_dict(h) for h in habits]


@router.get("/habit/{habit_id}")
async def get_habit(request: Request, habit_id: str) -> dict:
    """Return a single habit by ID."""
    habit: Habit = request.app.state.parse_md_to_habit(
        try_get_habit_md(request, habit_id)
    )
    return parse_habit_to_dict(habit)


@router.post("/habit")
async def create_habit(request: Request, habit: HabitModel) -> dict:
    """Create a new habit."""
    md_path: Path = get_habits_dir(request) / f"{habit.id}.md"
    if md_path.exists():
        raise HTTPException(status_code=409, detail="habit already exists")

    write_habit(habit, md_path)
    request.app.state.habit_items = request.app.state.parse_all_habits()
    await manager.broadcast({"type": "invalidate", "keys": ["habits"]})

    parsed: Habit = request.app.state.parse_md_to_habit(md_path)
    return parse_habit_to_dict(parsed)


@router.put("/habit/{habit_id}")
async def update_habit(request: Request, habit_id: str, habit: HabitModel) -> dict:
    """Update an existing habit, handling renames."""
    old_md_path: Path = try_get_habit_md(request, habit_id)
    new_md_path: Path = get_habits_dir(request) / f"{habit.id}.md"

    if habit_id != habit.id:
        old_md_path.unlink()

    write_habit(habit, new_md_path)
    request.app.state.habit_items = request.app.state.parse_all_habits()
    await manager.broadcast({"type": "invalidate", "keys": ["habits"]})

    parsed: Habit = request.app.state.parse_md_to_habit(new_md_path)
    return parse_habit_to_dict(parsed)


@router.delete("/habit/{habit_id}")
async def delete_habit(request: Request, habit_id: str) -> dict[str, bool]:
    """Delete a habit by ID."""
    try_get_habit_md(request, habit_id).unlink()
    request.app.state.habit_items = request.app.state.parse_all_habits()
    await manager.broadcast({"type": "invalidate", "keys": ["habits"]})
    return {"ok": True}


@router.post("/habit/{habit_id}/toggle/{date}")
async def toggle_habit_completion(request: Request, habit_id: str, date: str) -> dict:
    """Toggle a habit's completion status for a given date."""
    try:
        date_cls.fromisoformat(date)
    except ValueError:
        raise HTTPException(
            status_code=400, detail="invalid date format, use YYYY-MM-DD"
        )

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
        shifts=[
            HabitShiftModel(from_date=s.from_date, to_date=s.to_date)
            for s in habit.shifts
        ],
    )
    write_habit(habit_model, md_path)
    request.app.state.habit_items = request.app.state.parse_all_habits()
    await manager.broadcast({"type": "invalidate", "keys": ["habits"]})

    parsed: Habit = request.app.state.parse_md_to_habit(md_path)
    return parse_habit_to_dict(parsed)


@router.post("/habit/{habit_id}/shift")
async def shift_habit(
    request: Request, habit_id: str, shift: ShiftRequestModel
) -> dict:
    """Add or replace a date shift for a habit occurrence."""
    try:
        date_cls.fromisoformat(shift.from_date)
        if shift.to_date:
            date_cls.fromisoformat(shift.to_date)
    except ValueError:
        raise HTTPException(
            status_code=400, detail="invalid date format, use YYYY-MM-DD"
        )

    md_path: Path = try_get_habit_md(request, habit_id)
    habit: Habit = request.app.state.parse_md_to_habit(md_path)

    # Replace any existing shift with same from_date, then append the new one
    updated_shifts = [
        HabitShiftModel(from_date=s.from_date, to_date=s.to_date)
        for s in habit.shifts
        if s.from_date != shift.from_date
    ]
    updated_shifts.append(
        HabitShiftModel(from_date=shift.from_date, to_date=shift.to_date)
    )

    habit_model = HabitModel(
        name=habit.name,
        days=habit.days,
        color=habit.color,
        completions=habit.completions,
        shifts=updated_shifts,
    )
    write_habit(habit_model, md_path)
    request.app.state.habit_items = request.app.state.parse_all_habits()
    await manager.broadcast({"type": "invalidate", "keys": ["habits"]})

    parsed: Habit = request.app.state.parse_md_to_habit(md_path)
    return parse_habit_to_dict(parsed)


@router.delete("/habit/{habit_id}/shift/{from_date}")
async def cancel_habit_shift(request: Request, habit_id: str, from_date: str) -> dict:
    """Remove a date shift from a habit."""
    try:
        date_cls.fromisoformat(from_date)
    except ValueError:
        raise HTTPException(
            status_code=400, detail="invalid date format, use YYYY-MM-DD"
        )

    md_path: Path = try_get_habit_md(request, habit_id)
    habit: Habit = request.app.state.parse_md_to_habit(md_path)

    remaining_shifts = [
        HabitShiftModel(from_date=s.from_date, to_date=s.to_date)
        for s in habit.shifts
        if s.from_date != from_date
    ]

    habit_model = HabitModel(
        name=habit.name,
        days=habit.days,
        color=habit.color,
        completions=habit.completions,
        shifts=remaining_shifts,
    )
    write_habit(habit_model, md_path)
    request.app.state.habit_items = request.app.state.parse_all_habits()
    await manager.broadcast({"type": "invalidate", "keys": ["habits"]})

    parsed: Habit = request.app.state.parse_md_to_habit(md_path)
    return parse_habit_to_dict(parsed)


# activity routes


@router.get("/activities")
async def get_activities(request: Request, date: str | None = None) -> list[dict]:
    """Return all activities, optionally filtered by date."""
    items: list[Activity] = sorted(
        request.app.state.activity_items, key=lambda a: a.date
    )
    if date:
        items = [a for a in items if a.date.isoformat() == date]
    return [parse_activity_to_dict(a) for a in items]


@router.post("/activity")
async def create_activity(request: Request, activity: ActivityModel) -> dict:
    """Create a new activity, raising 409 if one already exists for the same date/name."""
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
    await manager.broadcast({"type": "invalidate", "keys": ["activities", "habits"]})

    parsed: Activity = request.app.state.parse_md_to_activity(md_path)
    return parse_activity_to_dict(parsed)


@router.delete("/activity/{activity_id}")
async def delete_activity(request: Request, activity_id: str) -> dict[str, bool]:
    """Delete an activity by ID."""
    try_get_activity_md(request, activity_id).unlink()
    request.app.state.activity_items = request.app.state.parse_all_activities()
    await manager.broadcast({"type": "invalidate", "keys": ["activities", "habits"]})
    return {"ok": True}


@router.get("/habit-presets")
async def get_habit_presets(request: Request) -> list[str]:
    """Return merged list of activity names and explicit preset names."""
    activity_names = {a.name for a in request.app.state.activity_items}
    preset_names = {p.name for p in request.app.state.preset_items}
    return sorted(activity_names | preset_names)


# explicit preset routes


@router.get("/presets")
async def get_presets(request: Request) -> list[dict]:
    """Return all explicit presets sorted by name."""
    presets: list[Preset] = sorted(request.app.state.preset_items, key=lambda p: p.name)
    return [{"id": p.id, "name": p.name} for p in presets]


@router.post("/preset")
async def create_preset(request: Request, preset: PresetModel) -> dict:
    """Create a new activity preset."""
    md_path: Path = get_presets_dir(request) / f"{preset.id}.md"
    if md_path.exists():
        raise HTTPException(status_code=409, detail="preset already exists")

    write_preset(preset, md_path)
    request.app.state.preset_items = request.app.state.parse_all_presets()
    await manager.broadcast({"type": "invalidate", "keys": ["presets"]})

    parsed: Preset = request.app.state.parse_md_to_preset(md_path)
    return {"id": parsed.id, "name": parsed.name}


@router.put("/preset/{preset_id}")
async def update_preset(request: Request, preset_id: str, preset: PresetModel) -> dict:
    """Update an existing preset, handling renames."""
    old_md_path: Path = try_get_preset_md(request, preset_id)
    new_md_path: Path = get_presets_dir(request) / f"{preset.id}.md"

    if preset_id != preset.id:
        old_md_path.unlink()

    write_preset(preset, new_md_path)
    request.app.state.preset_items = request.app.state.parse_all_presets()
    await manager.broadcast({"type": "invalidate", "keys": ["presets"]})

    parsed: Preset = request.app.state.parse_md_to_preset(new_md_path)
    return {"id": parsed.id, "name": parsed.name}


@router.delete("/preset/{preset_id}")
async def delete_preset(request: Request, preset_id: str) -> dict[str, bool]:
    """Delete a preset by ID."""
    try_get_preset_md(request, preset_id).unlink()
    request.app.state.preset_items = request.app.state.parse_all_presets()
    await manager.broadcast({"type": "invalidate", "keys": ["presets"]})
    return {"ok": True}
