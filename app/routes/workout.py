import calendar
from datetime import date
from pathlib import Path

from fastapi import APIRouter, HTTPException, Request

from app.models import (
    Workout,
    WorkoutModel,
    WorkoutTemplate,
    WorkoutTemplateModel,
)
from app.writer import write_template, write_workout

router = APIRouter()


def get_workout_dir(request: Request) -> Path:
    return request.app.state.workout_dir


def get_template_dir(request: Request) -> Path:
    return request.app.state.template_dir


def try_get_workout_md(request: Request, workout_id: str) -> Path:
    md_path = get_workout_dir(request) / f"{workout_id}.md"
    if not md_path.exists():
        raise HTTPException(status_code=404, detail=f"{workout_id}.md not found")
    return md_path


def try_get_template_md(request: Request, template_id: str) -> Path:
    md_path = get_template_dir(request) / f"{template_id}.md"
    if not md_path.exists():
        raise HTTPException(status_code=404, detail=f"{template_id}.md not found")
    return md_path


def parse_template_to_dict(template: WorkoutTemplate) -> dict:
    return {
        "id": template.id,
        "name": template.name,
        "groups": [
            {
                "name": g.name,
                "rest_seconds": g.rest_seconds,
                "exercises": [
                    {
                        "name": e.name,
                        "sets": [{"reps": s.reps, "weight": s.weight} for s in e.sets],
                    }
                    for e in g.exercises
                ],
            }
            for g in template.groups
        ],
    }


def parse_workout_to_dict(workout: Workout) -> dict:
    return {
        "id": workout.id,
        "date": workout.date.isoformat(),
        "time": workout.time.strftime("%H:%M:%S"),
        "content": workout.content,
        "groups": [
            {
                "name": g.name,
                "rest_seconds": g.rest_seconds,
                "exercises": [
                    {
                        "name": e.name,
                        "sets": [{"reps": s.reps, "weight": s.weight} for s in e.sets],
                    }
                    for e in g.exercises
                ],
            }
            for g in workout.groups
        ],
    }


# workout api routes


@router.get("/workouts")
async def get_workouts(request: Request) -> list[dict]:
    workouts: list[Workout] = sorted(
        request.app.state.workout_items, key=lambda w: (w.date, w.time), reverse=True
    )
    return [parse_workout_to_dict(w) for w in workouts]


@router.get("/workout/{workout_id}")
async def get_workout(request: Request, workout_id: str) -> dict:
    workout: Workout = request.app.state.parse_md_to_workout(
        try_get_workout_md(request, workout_id)
    )
    return parse_workout_to_dict(workout)


@router.post("/workout")
async def create_workout(request: Request, workout: WorkoutModel) -> dict:
    md_path: Path = get_workout_dir(request) / f"{workout.id}.md"
    if md_path.exists():
        raise HTTPException(status_code=409, detail="workout already exists")

    write_workout(workout, md_path)
    request.app.state.workout_items = request.app.state.parse_all_workouts()

    parsed: Workout = request.app.state.parse_md_to_workout(md_path)
    return parse_workout_to_dict(parsed)


@router.put("/workout/{workout_id}")
async def update_workout(
    request: Request, workout_id: str, workout: WorkoutModel
) -> dict:
    old_md_path: Path = try_get_workout_md(request, workout_id)
    new_md_path: Path = get_workout_dir(request) / f"{workout.id}.md"

    if workout_id != workout.id:
        old_md_path.unlink()

    write_workout(workout, new_md_path)
    request.app.state.workout_items = request.app.state.parse_all_workouts()

    parsed: Workout = request.app.state.parse_md_to_workout(new_md_path)
    return parse_workout_to_dict(parsed)


@router.delete("/workout/{workout_id}")
async def delete_workout(request: Request, workout_id: str) -> dict[str, bool]:
    try_get_workout_md(request, workout_id).unlink()
    request.app.state.workout_items = request.app.state.parse_all_workouts()
    return {"ok": True}


@router.get("/workout-calendar")
async def get_workout_calendar(
    request: Request, year: int | None = None, month: int | None = None
) -> dict:
    today: date = date.today()
    year = year or today.year
    month = month or today.month

    workout_dates: set[str] = {
        w.date.isoformat()
        for w in request.app.state.workout_items
        if w.date.year == year and w.date.month == month
    }

    first_weekday: int = (calendar.monthrange(year, month)[0] + 1) % 7  # sunday-start
    days_in_month: int = calendar.monthrange(year, month)[1]

    prev_year, prev_month = (year - 1, 12) if month == 1 else (year, month - 1)
    next_year, next_month = (year + 1, 1) if month == 12 else (year, month + 1)

    return {
        "year": year,
        "month": month,
        "month_name": calendar.month_abbr[month].lower(),
        "first_weekday": first_weekday,
        "days_in_month": days_in_month,
        "workout_dates": sorted(workout_dates),
        "today": today.isoformat(),
        "prev_year": prev_year,
        "prev_month": prev_month,
        "next_year": next_year,
        "next_month": next_month,
    }


# template routes


@router.get("/templates")
async def get_templates(request: Request) -> list[dict]:
    return [parse_template_to_dict(t) for t in request.app.state.template_items]


@router.post("/template")
async def create_template(request: Request, template: WorkoutTemplateModel) -> dict:
    if not template.groups:
        raise HTTPException(
            status_code=400,
            detail="fill in group name, exercise name, and at least one set with reps",
        )

    md_path: Path = get_template_dir(request) / f"{template.id}.md"
    write_template(template, md_path)
    request.app.state.template_items = request.app.state.parse_all_templates()

    parsed: WorkoutTemplate = request.app.state.parse_md_to_template(md_path)
    return parse_template_to_dict(parsed)


@router.delete("/template/{template_id}")
async def delete_template(request: Request, template_id: str) -> dict[str, bool]:
    try_get_template_md(request, template_id).unlink()
    request.app.state.template_items = request.app.state.parse_all_templates()
    return {"ok": True}
