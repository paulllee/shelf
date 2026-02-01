import calendar
import re
from datetime import date, datetime, time
from pathlib import Path
from typing import Any

from fastapi import APIRouter, HTTPException, Request
from fastapi.templating import Jinja2Templates
from starlette.datastructures import FormData

from app.models import (
    ExerciseGroupModel,
    ExerciseModel,
    Workout,
    WorkoutModel,
    WorkoutSetModel,
    WorkoutTemplate,
    WorkoutTemplateModel,
)
from app.writer import write_template, write_workout

router = APIRouter()
templates = Jinja2Templates(directory="./templates")

# regex patterns for parsing form field names
GROUP_FIELD = re.compile(r"^groups\[(\d+)\]\[(\w+)\]$")
EXERCISE_FIELD = re.compile(r"^groups\[(\d+)\]\[exercises\]\[(\d+)\]\[(\w+)\]$")
SET_FIELD = re.compile(
    r"^groups\[(\d+)\]\[exercises\]\[(\d+)\]\[sets\]\[(\d+)\]\[(\w+)\]$"
)


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


def parse_template_to_model(template: WorkoutTemplate) -> WorkoutTemplateModel:
    groups = [
        ExerciseGroupModel(
            name=g.name,
            rest_seconds=g.rest_seconds,
            exercises=[
                ExerciseModel(
                    name=e.name,
                    sets=[
                        WorkoutSetModel(reps=s.reps, weight=s.weight) for s in e.sets
                    ],
                )
                for e in g.exercises
            ],
        )
        for g in template.groups
    ]
    return WorkoutTemplateModel(name=template.name, groups=groups)


def parse_workout_to_model(workout: Workout) -> WorkoutModel:
    groups = [
        ExerciseGroupModel(
            name=g.name,
            rest_seconds=g.rest_seconds,
            exercises=[
                ExerciseModel(
                    name=e.name,
                    sets=[
                        WorkoutSetModel(reps=s.reps, weight=s.weight) for s in e.sets
                    ],
                )
                for e in g.exercises
            ],
        )
        for g in workout.groups
    ]
    return WorkoutModel(
        date=workout.date, time=workout.time, groups=groups, content=workout.content
    )


def parse_groups_from_form(
    form_data: FormData | dict[str, Any],
) -> list[ExerciseGroupModel]:
    """Parse exercise groups from form data with nested field names."""
    form_dict = {k: str(v).strip() for k, v in form_data.items()}

    # Build nested structure: {group_idx: {field: value, exercises: {ex_idx: {...}}}}
    groups_raw: dict[int, dict[str, Any]] = {}

    for key, value in form_dict.items():
        if match := GROUP_FIELD.match(key):
            group_idx, field = int(match[1]), match[2]
            groups_raw.setdefault(group_idx, {"exercises": {}})[field] = value

        elif match := EXERCISE_FIELD.match(key):
            group_idx, ex_idx, field = int(match[1]), int(match[2]), match[3]
            groups_raw.setdefault(group_idx, {"exercises": {}})
            groups_raw[group_idx]["exercises"].setdefault(ex_idx, {"sets": {}})[
                field
            ] = value

        elif match := SET_FIELD.match(key):
            group_idx, ex_idx, set_idx, field = (
                int(match[1]),
                int(match[2]),
                int(match[3]),
                match[4],
            )
            groups_raw.setdefault(group_idx, {"exercises": {}})
            groups_raw[group_idx]["exercises"].setdefault(ex_idx, {"sets": {}})
            groups_raw[group_idx]["exercises"][ex_idx]["sets"].setdefault(set_idx, {})[
                field
            ] = value

    # Convert to model structure, filtering out empty entries
    groups: list[ExerciseGroupModel] = []

    for group_idx in sorted(groups_raw):
        g = groups_raw[group_idx]
        group_name = g.get("name", "")
        if not group_name:
            continue

        exercises: list[ExerciseModel] = []
        for ex_idx in sorted(g.get("exercises", {})):
            e = g["exercises"][ex_idx]
            exercise_name = e.get("name", "")
            if not exercise_name:
                continue

            sets: list[WorkoutSetModel] = []
            for set_idx in sorted(e.get("sets", {})):
                s = e["sets"][set_idx]
                reps_str = s.get("reps", "")
                if not reps_str:
                    continue
                weight_str = s.get("weight", "")
                sets.append(
                    WorkoutSetModel(
                        reps=int(reps_str),
                        weight=float(weight_str) if weight_str else None,
                    )
                )

            if sets:
                exercises.append(ExerciseModel(name=exercise_name, sets=sets))

        if exercises:
            rest_str = g.get("rest_seconds", "60")
            groups.append(
                ExerciseGroupModel(
                    name=group_name,
                    rest_seconds=int(rest_str) if rest_str else 60,
                    exercises=exercises,
                )
            )

    return groups


# API routes


@router.get("/api/workouts")
async def get_workouts_api(request: Request) -> list[WorkoutModel]:
    workouts: list[Workout] = sorted(
        request.app.state.workout_items, key=lambda w: (w.date, w.time), reverse=True
    )
    return [parse_workout_to_model(w) for w in workouts]


@router.get("/api/workout/{workout_id}")
async def get_workout_api(request: Request, workout_id: str) -> WorkoutModel:
    workout = request.app.state.parse_md_to_workout(
        try_get_workout_md(request, workout_id)
    )
    return parse_workout_to_model(workout)


@router.delete("/workout/{workout_id}")
async def delete_workout(request: Request, workout_id: str):
    try_get_workout_md(request, workout_id).unlink()
    request.app.state.workout_items = request.app.state.parse_all_workouts()
    workouts: list[Workout] = sorted(
        request.app.state.workout_items, key=lambda w: (w.date, w.time), reverse=True
    )
    return templates.TemplateResponse(
        request=request,
        name="partials/workout_list.html",
        context={"workouts": workouts},
    )


# Template-returning routes for HTMX


@router.get("/workout-items")
async def get_workout_items(request: Request):
    workouts: list[Workout] = sorted(
        request.app.state.workout_items, key=lambda w: (w.date, w.time), reverse=True
    )
    return templates.TemplateResponse(
        request=request,
        name="partials/workout_list.html",
        context={"workouts": workouts},
    )


@router.get("/workout-calendar")
async def get_workout_calendar(
    request: Request, year: int | None = None, month: int | None = None
):
    today = date.today()
    year = year or today.year
    month = month or today.month

    workout_dates = {
        w.date.isoformat()
        for w in request.app.state.workout_items
        if w.date.year == year and w.date.month == month
    }

    first_weekday = (calendar.monthrange(year, month)[0] + 1) % 7  # Sunday-start
    days_in_month = calendar.monthrange(year, month)[1]

    prev_year, prev_month = (year - 1, 12) if month == 1 else (year, month - 1)
    next_year, next_month = (year + 1, 1) if month == 12 else (year, month + 1)

    return templates.TemplateResponse(
        request=request,
        name="partials/workout_calendar.html",
        context={
            "year": year,
            "month": month,
            "month_name": calendar.month_name[month].lower(),
            "first_weekday": first_weekday,
            "days_in_month": days_in_month,
            "workout_dates": workout_dates,
            "today": today.isoformat(),
            "prev_year": prev_year,
            "prev_month": prev_month,
            "next_year": next_year,
            "next_month": next_month,
        },
    )


@router.get("/modal/workout/new")
async def new_workout_modal(request: Request):
    return templates.TemplateResponse(
        request=request,
        name="partials/workout_modal_form.html",
        context={
            "today": date.today().isoformat(),
            "now_time": datetime.now().strftime("%H:%M"),
            "templates": request.app.state.template_items,
        },
    )


@router.get("/modal/workout/{workout_id}")
async def view_workout_modal(request: Request, workout_id: str):
    workout = request.app.state.parse_md_to_workout(
        try_get_workout_md(request, workout_id)
    )
    return templates.TemplateResponse(
        request=request,
        name="partials/workout_modal_view.html",
        context={"workout": workout},
    )


@router.get("/modal/workout/{workout_id}/edit")
async def edit_workout_modal(request: Request, workout_id: str):
    workout = request.app.state.parse_md_to_workout(
        try_get_workout_md(request, workout_id)
    )
    return templates.TemplateResponse(
        request=request,
        name="partials/workout_modal_form.html",
        context={
            "workout": workout,
            "today": date.today().isoformat(),
            "now_time": datetime.now().strftime("%H:%M"),
        },
    )


@router.get("/modal/workout/from-template/{template_id}")
async def new_workout_from_template(request: Request, template_id: str):
    template = request.app.state.parse_md_to_template(
        try_get_template_md(request, template_id)
    )
    return templates.TemplateResponse(
        request=request,
        name="partials/workout_modal_form.html",
        context={
            "today": date.today().isoformat(),
            "now_time": datetime.now().strftime("%H:%M"),
            "templates": request.app.state.template_items,
            "prefill_template": template,
        },
    )


@router.post("/workout")
async def create_workout(request: Request):
    form_data = await request.form()
    groups = parse_groups_from_form(form_data)

    workout = WorkoutModel(
        date=date.fromisoformat(str(form_data["date"])),
        time=time.fromisoformat(str(form_data["time"])),
        groups=groups,
        content=str(form_data.get("content", "")).strip(),
    )

    md_path = get_workout_dir(request) / f"{workout.id}.md"
    if md_path.exists():
        raise HTTPException(status_code=409, detail="workout already exists")

    write_workout(workout, md_path)
    request.app.state.workout_items = request.app.state.parse_all_workouts()

    workouts: list[Workout] = sorted(
        request.app.state.workout_items, key=lambda w: (w.date, w.time), reverse=True
    )
    return templates.TemplateResponse(
        request=request,
        name="partials/workout_list.html",
        context={"workouts": workouts},
    )


@router.put("/workout/{workout_id}")
async def update_workout(request: Request, workout_id: str):
    form_data = await request.form()
    groups = parse_groups_from_form(form_data)

    workout = WorkoutModel(
        date=date.fromisoformat(str(form_data["date"])),
        time=time.fromisoformat(str(form_data["time"])),
        groups=groups,
        content=str(form_data.get("content", "")).strip(),
    )

    old_md_path = try_get_workout_md(request, workout_id)
    new_md_path = get_workout_dir(request) / f"{workout.id}.md"

    if workout_id != workout.id:
        old_md_path.unlink()

    write_workout(workout, new_md_path)
    request.app.state.workout_items = request.app.state.parse_all_workouts()

    workouts: list[Workout] = sorted(
        request.app.state.workout_items, key=lambda w: (w.date, w.time), reverse=True
    )
    return templates.TemplateResponse(
        request=request,
        name="partials/workout_list.html",
        context={"workouts": workouts},
    )


# Template routes


@router.post("/template")
async def create_template(request: Request):
    form_data = await request.form()
    template_name = str(form_data.get("template_name", "")).strip()

    if not template_name:
        raise HTTPException(status_code=400, detail="template name is required")

    groups = parse_groups_from_form(form_data)
    if not groups:
        raise HTTPException(
            status_code=400,
            detail="fill in group name, exercise name, and at least one set with reps",
        )

    template_model = WorkoutTemplateModel(name=template_name, groups=groups)
    md_path = get_template_dir(request) / f"{template_model.id}.md"

    write_template(template_model, md_path)
    request.app.state.template_items = request.app.state.parse_all_templates()

    return templates.TemplateResponse(
        request=request,
        name="partials/workout_templates.html",
        context={"templates": request.app.state.template_items},
    )


@router.delete("/template/{template_id}")
async def delete_template(request: Request, template_id: str):
    try_get_template_md(request, template_id).unlink()
    request.app.state.template_items = request.app.state.parse_all_templates()

    return templates.TemplateResponse(
        request=request,
        name="partials/workout_templates.html",
        context={"templates": request.app.state.template_items},
    )
